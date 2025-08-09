'use client';

import React, { useState, useEffect } from 'react';
import ManagerLayout from '@/components/ManagerLayout';
import supabase from '@/lib/supabase';
import {
  Calendar,
  Clock,
  Ship,
  Plane,
  Building,
  MapPin,
  Car,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function ManagerSchedulePage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    loadSchedules();
  }, [selectedDate, viewMode, typeFilter]);

  const getRange = (base: Date, mode: 'day' | 'week' | 'month') => {
    const start = new Date(base);
    const end = new Date(base);
    if (mode === 'day') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (mode === 'week') {
      // 주간: 월요일 시작 기준
      const day = start.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day; // 일요일(0) -> -6, 월(1)->0 ...
      start.setDate(start.getDate() + diffToMonday);
      start.setHours(0, 0, 0, 0);
      end.setTime(start.getTime());
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      // 월간: 해당 월 1일 ~ 말일
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(start.getMonth() + 1, 0); // 다음 달 0일 = 말일
      end.setHours(23, 59, 59, 999);
    }
    return { start, end };
  };

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const { start, end } = getRange(selectedDate, viewMode);

      // 서비스별 날짜 컬럼 기준으로 기간 내 데이터 조회 (배치)
      const [cruiseRes, airportRes, hotelRes, rentcarRes, tourRes] = await Promise.all([
        // cruise: checkin (date)
        supabase
          .from('reservation_cruise')
          .select('*, reservation_id')
          .gte('checkin', start.toISOString().slice(0, 10))
          .lte('checkin', end.toISOString().slice(0, 10)),
        // airport: ra_datetime (timestamp)
        supabase
          .from('reservation_airport')
          .select('*, reservation_id')
          .gte('ra_datetime', start.toISOString())
          .lte('ra_datetime', end.toISOString()),
        // hotel: checkin_date (date)
        supabase
          .from('reservation_hotel')
          .select('*, reservation_id')
          .gte('checkin_date', start.toISOString().slice(0, 10))
          .lte('checkin_date', end.toISOString().slice(0, 10)),
        // rentcar: pickup_datetime (timestamp)
        supabase
          .from('reservation_rentcar')
          .select('*, reservation_id')
          .gte('pickup_datetime', start.toISOString())
          .lte('pickup_datetime', end.toISOString()),
        // tour: tour_date (date) - 없을 수 있음, maybeSingle 대신 범위 조회
        supabase
          .from('reservation_tour')
          .select('*, reservation_id')
          .gte('tour_date', start.toISOString().slice(0, 10))
          .lte('tour_date', end.toISOString().slice(0, 10))
      ]);

      const serviceRows: Array<{ table: string; rows: any[] }> = [
        { table: 'reservation_cruise', rows: cruiseRes.data || [] },
        { table: 'reservation_airport', rows: airportRes.data || [] },
        { table: 'reservation_hotel', rows: hotelRes.data || [] },
        { table: 'reservation_rentcar', rows: rentcarRes.data || [] },
        { table: 'reservation_tour', rows: tourRes.data || [] }
      ];

      // 해당되는 예약 ID들 조회
      const reservationIds = Array.from(
        new Set(
          serviceRows.flatMap(s => (s.rows || []).map((r: any) => r.reservation_id)).filter(Boolean)
        )
      );

      if (reservationIds.length === 0) {
        setSchedules([]);
        return;
      }

      // 예약 기본 정보와 사용자 정보 일괄 조회
      const { data: reservationsData, error: resErr } = await supabase
        .from('reservation')
        .select('re_id, re_type, re_status, re_user_id')
        .in('re_id', reservationIds);
      if (resErr) {
        console.error('예약 정보 조회 실패:', resErr);
        setSchedules([]);
        return;
      }
      const reservationById = new Map(reservationsData!.map(r => [r.re_id, r]));

      const userIds = Array.from(new Set(reservationsData!.map(r => r.re_user_id).filter(Boolean)));
      let usersById = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', userIds);
        usersById = new Map((usersData || []).map(u => [u.id, u]));
      }

      // 스케줄 객체로 변환
      const result: any[] = [];
      const toTimeStr = (d: Date) => d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

      for (const { table, rows } of serviceRows) {
        for (const row of rows) {
          const reservation = reservationById.get(row.reservation_id);
          if (!reservation) continue;
          let scheduleDate: Date | null = null;
          let scheduleTime = '';
          let location: string | null = null;
          let duration: string | null = null;
          let type = reservation.re_type;

          if (table === 'reservation_cruise') {
            // checkin은 date만 있을 가능성
            if (row.checkin) {
              scheduleDate = new Date(row.checkin + 'T09:00:00');
              scheduleTime = '09:00';
            }
            location = '하롱베이';
          } else if (table === 'reservation_airport') {
            if (row.ra_datetime) {
              const d = new Date(row.ra_datetime);
              if (!isNaN(d.getTime())) {
                scheduleDate = d;
                scheduleTime = toTimeStr(d);
              }
            }
            location = row.ra_airport_location || null;
          } else if (table === 'reservation_hotel') {
            if (row.checkin_date) {
              scheduleDate = new Date(row.checkin_date + 'T15:00:00');
              scheduleTime = '15:00';
            }
            // 예약 시 hotel_category에 호텔명 저장하는 패턴
            location = row.hotel_category || null;
            if (row.nights) duration = `${row.nights}박`;
          } else if (table === 'reservation_rentcar') {
            if (row.pickup_datetime) {
              const d = new Date(row.pickup_datetime);
              if (!isNaN(d.getTime())) {
                scheduleDate = d;
                scheduleTime = toTimeStr(d);
              }
            }
            if (row.pickup_location && row.destination) {
              location = `${row.pickup_location} → ${row.destination}`;
            } else {
              location = row.pickup_location || row.destination || null;
            }
          } else if (table === 'reservation_tour') {
            if (row.tour_date) {
              scheduleDate = new Date(row.tour_date + 'T09:00:00');
              scheduleTime = '09:00';
            }
            location = row.pickup_location || row.dropoff_location || null;
            if (row.tour_duration) duration = row.tour_duration;
          }

          if (!scheduleDate) continue; // 날짜가 없으면 제외

          result.push({
            re_id: reservation.re_id,
            re_type: type,
            re_status: reservation.re_status,
            users: usersById.get(reservation.re_user_id) || null,
            schedule_date: scheduleDate,
            schedule_time: scheduleTime,
            location,
            duration,
            service_table: table,
            service_row: row
          });
        }
      }

      // 타입 필터는 렌더에서 적용하되, 여기서는 날짜 범위 내 결과만 세팅
      // 최신순 정렬 (시간 기준)
      result.sort((a, b) => a.schedule_date.getTime() - b.schedule_date.getTime());
      setSchedules(result);
    } catch (error) {
      console.error('일정 데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cruise': return <Ship className="w-5 h-5 text-blue-600" />;
      case 'airport': return <Plane className="w-5 h-5 text-green-600" />;
      case 'hotel': return <Building className="w-5 h-5 text-purple-600" />;
      case 'tour': return <MapPin className="w-5 h-5 text-orange-600" />;
      case 'rentcar': return <Car className="w-5 h-5 text-red-600" />;
      default: return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'cruise': return '크루즈';
      case 'airport': return '공항';
      case 'hotel': return '호텔';
      case 'tour': return '투어';
      case 'rentcar': return '렌트카';
      default: return type;
    }
  };

  const filteredSchedules = schedules.filter(schedule => {
    if (typeFilter === 'all') return true;
    return schedule.re_type === typeFilter;
  });

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setSelectedDate(newDate);
  };

  if (loading) {
    return (
      <ManagerLayout title="예약 일정" activeTab="schedule">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">일정 정보를 불러오는 중...</p>
          </div>
        </div>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout title="예약 일정" activeTab="schedule">
      <div className="space-y-6">

        {/* 일정 컨트롤 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-semibold">
                {selectedDate.toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  ...(viewMode === 'day' && { day: 'numeric' })
                })}
              </h2>

              <button
                onClick={() => navigateDate('next')}
                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('day')}
                className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'day' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
              >
                일간
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'week' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
              >
                주간
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'month' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
              >
                월간
              </button>
            </div>
          </div>

          {/* 타입 필터 */}
          <div className="flex gap-2">
            <Filter className="w-5 h-5 text-gray-600 mt-2" />
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${typeFilter === 'all' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
              >
                전체
              </button>
              {['cruise', 'airport', 'hotel', 'tour', 'rentcar'].map(type => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${typeFilter === type ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                >
                  {getTypeName(type)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 일정 목록 */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-6 h-6 text-green-600" />
              예약 일정 ({filteredSchedules.length}건)
            </h3>
          </div>

          {filteredSchedules.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                {typeFilter === 'all' ? '예약된 일정이 없습니다' : `${getTypeName(typeFilter)} 일정이 없습니다`}
              </h3>
            </div>
          ) : (
            <div className="divide-y">
              {filteredSchedules.map((schedule) => (
                <div key={schedule.re_id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    {getTypeIcon(schedule.re_type)}
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">
                        {getTypeName(schedule.re_type)} - {schedule.users?.name || '고객명 없음'}
                      </h4>
                      <div className="flex gap-6 text-sm text-gray-600 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {schedule.schedule_date.toLocaleDateString('ko-KR')}
                        </span>
                        {schedule.schedule_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {schedule.schedule_time}
                          </span>
                        )}
                        {schedule.location && <span>위치: {schedule.location}</span>}
                        {schedule.duration && <span>기간: {schedule.duration}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm ${schedule.re_status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : schedule.re_status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                        {schedule.re_status === 'confirmed' ? '확정' :
                          schedule.re_status === 'pending' ? '대기' : '취소'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ManagerLayout>
  );
}
