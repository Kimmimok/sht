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
  }, [selectedDate, typeFilter]);

  const loadSchedules = async () => {
    try {
      // 예약 일정 조회 (실제 구현 시 날짜 필터링 필요)
      const { data, error } = await supabase
        .from('reservation')
        .select(`
          re_id,
          re_type,
          re_status,
          re_created_at,
          users!reservation_re_user_id_fkey(name, email)
        `)
        .order('re_created_at', { ascending: true });

      if (error) {
        console.error('일정 조회 실패:', error);
        return;
      }

      // 일정 데이터로 변환 (시뮬레이션)
      const scheduleData = (data || []).map(reservation => ({
        ...reservation,
        schedule_date: new Date(reservation.re_created_at),
        schedule_time: '09:00',
        location: '하롱베이',
        duration: '3박 4일'
      }));

      setSchedules(scheduleData);
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
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'day' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                일간
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'week' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                주간
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'month' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
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
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  typeFilter === 'all' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                전체
              </button>
              {['cruise', 'airport', 'hotel', 'tour', 'rentcar'].map(type => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    typeFilter === type ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
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
                          {schedule.schedule_date.toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {schedule.schedule_time}
                        </span>
                        <span>위치: {schedule.location}</span>
                        <span>기간: {schedule.duration}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        schedule.re_status === 'confirmed' 
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
