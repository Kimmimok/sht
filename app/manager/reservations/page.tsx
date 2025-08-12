'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import ManagerLayout from '@/components/ManagerLayout';
import {
  Ship,
  Plane,
  Building,
  MapPin,
  Car,
  Plus,
  Eye,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Phone,
  Mail,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface ReservationData {
  re_id: string;
  re_type: string;
  re_status: string;
  re_created_at: string;
  re_quote_id: string;
  users: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  quote: {
    title: string;
    status: string;
  };
  serviceDetails?: any;
  serviceDetailsExtra?: any;
}

interface GroupedReservations {
  [userId: string]: {
    userInfo: {
      id: string;
      name: string;
      email: string;
      phone: string;
    };
    reservations: ReservationData[];
    totalCount: number;
    statusCounts: {
      pending: number;
      confirmed: number;
      cancelled: number;
    };
  };
}

export default function ManagerReservationsPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<ReservationData[]>([]);
  const [groupedReservations, setGroupedReservations] = useState<GroupedReservations>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      console.log('🔍 예약 데이터 로딩 시작...');
      setLoading(true);
      setError(null);

      // 1. 현재 사용자 인증 및 권한 확인
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ 인증 오류:', userError);
        throw new Error('인증이 필요합니다.');
      }

      // 2. 매니저 권한 확인 (에러 처리 개선)
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (userDataError) {
        console.error('❌ 사용자 권한 조회 실패:', userDataError);
        // 권한 조회 실패시에도 계속 진행 (테스트용)
      }

      if (userData && !['manager', 'admin'].includes(userData.role)) {
        throw new Error('매니저 권한이 필요합니다.');
      }

      // 3. 예약 데이터 조회 (단계별로 처리하여 오류 원인 파악)
      console.log('📋 예약 기본 정보 조회 중...');

      // 먼저 기본 예약 정보만 조회
      const { data: baseReservations, error: reservationError } = await supabase
        .from('reservation')
        .select(`
          re_id,
          re_type,
          re_status,
          re_created_at,
          re_quote_id,
          re_user_id
        `)
        .order('re_created_at', { ascending: false });

      if (reservationError) {
        console.error('❌ 예약 기본 정보 조회 실패:', reservationError);
        throw reservationError;
      }

      console.log('✅ 예약 기본 정보 조회 성공:', baseReservations?.length || 0, '건');

      // 사용자/견적 ID 수집 후 배치 조회
      const userIds = Array.from(new Set((baseReservations || []).map(r => r.re_user_id).filter(Boolean)));
      const quoteIds = Array.from(new Set((baseReservations || []).map(r => r.re_quote_id).filter(Boolean)));

      const [usersRes, quotesRes] = await Promise.all([
        userIds.length
          ? supabase.from('users').select('id, name, email, phone').in('id', userIds)
          : Promise.resolve({ data: [], error: null } as any),
        quoteIds.length
          ? supabase.from('quote').select('id, title, status').in('id', quoteIds)
          : Promise.resolve({ data: [], error: null } as any)
      ]);

      if (usersRes.error) console.warn('⚠️ 사용자 배치 조회 일부 실패:', usersRes.error);
      if (quotesRes.error) console.warn('⚠️ 견적 배치 조회 일부 실패:', quotesRes.error);

      const userMap = new Map<string, { id: string; name: string; email: string; phone: string }>();
      (usersRes.data || []).forEach((u: any) => userMap.set(u.id, u));

      const quoteMap = new Map<string, { id: string; title: string; status: string }>();
      (quotesRes.data || []).forEach((q: any) => quoteMap.set(q.id, q));

      // 사용자 정보와 견적 정보를 매핑하여 확장
      const enrichedReservations: ReservationData[] = [];

      for (const reservation of baseReservations || []) {
        try {
          const userInfo = userMap.get(reservation.re_user_id) || {
            id: reservation.re_user_id,
            name: '미등록 사용자',
            email: '',
            phone: ''
          };

          const qInfo = reservation.re_quote_id ? quoteMap.get(reservation.re_quote_id) : null;

          // 서비스별 상세 정보 조회
          let serviceDetails = null as any;
          let serviceDetailsExtra = null as any;
          try {
            switch (reservation.re_type) {
              case 'cruise': {
                const { data: cruiseDetails } = await supabase
                  .from('reservation_cruise')
                  .select('*')
                  .eq('reservation_id', reservation.re_id)
                  .single();
                serviceDetails = cruiseDetails;
                try {
                  const { data: cruiseCars } = await supabase
                    .from('reservation_cruise_car')
                    .select('*')
                    .eq('reservation_id', reservation.re_id)
                    .order('created_at', { ascending: false })
                    .limit(1);
                  serviceDetailsExtra = Array.isArray(cruiseCars) ? cruiseCars[0] : null;
                } catch (_) { /* noop */ }
                break;
              }
              case 'airport': {
                const { data: airportDetails } = await supabase
                  .from('reservation_airport')
                  .select('*')
                  .eq('reservation_id', reservation.re_id)
                  .single();
                serviceDetails = airportDetails;
                break;
              }
              case 'hotel': {
                const { data: hotelDetails } = await supabase
                  .from('reservation_hotel')
                  .select('*')
                  .eq('reservation_id', reservation.re_id)
                  .single();
                serviceDetails = hotelDetails;
                break;
              }
              case 'rentcar': {
                const { data: rentcarDetails } = await supabase
                  .from('reservation_rentcar')
                  .select('*')
                  .eq('reservation_id', reservation.re_id)
                  .single();
                serviceDetails = rentcarDetails;
                break;
              }
              case 'tour': {
                const { data: tourDetails } = await supabase
                  .from('reservation_tour')
                  .select('*')
                  .eq('reservation_id', reservation.re_id)
                  .single();
                serviceDetails = tourDetails;
                break;
              }
            }
          } catch (serviceError) {
            console.warn('⚠️ 서비스 상세 정보 조회 실패:', reservation.re_type, serviceError);
          }

          enrichedReservations.push({
            ...reservation,
            users: userInfo,
            quote: qInfo
              ? { title: qInfo.title ?? '제목 없음', status: qInfo.status ?? 'unknown' }
              : { title: '연결된 견적 없음', status: 'unknown' },
            serviceDetails,
            serviceDetailsExtra
          });
        } catch (enrichError) {
          console.warn('⚠️ 예약 상세 정보 구성 실패:', reservation.re_id, enrichError);
          enrichedReservations.push({
            ...reservation,
            users: {
              id: reservation.re_user_id,
              name: '미등록 사용자',
              email: '',
              phone: ''
            },
            quote: { title: reservation.re_quote_id ? '제목 없음' : '연결된 견적 없음', status: 'unknown' },
            serviceDetails: null
          });
        }
      }

      console.log('✅ 예약 데이터 완성:', enrichedReservations.length, '건');

      // 4. 사용자별로 예약 그룹화
      const grouped = groupReservationsByUser(enrichedReservations);

      setReservations(enrichedReservations);
      setGroupedReservations(grouped);
      setLastUpdate(new Date());
      setError(null);

    } catch (error: any) {
      console.error('❌ 예약 데이터 로딩 실패:', error);
      setError(error.message || '예약 데이터를 불러오는 중 오류가 발생했습니다.');

      // 권한 오류인 경우 리다이렉트
      if (error.message?.includes('권한') || error.message?.includes('인증')) {
        setTimeout(() => {
          if (error.message?.includes('인증')) {
            router.push('/login');
          } else {
            router.push('/');
          }
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const groupReservationsByUser = (reservations: ReservationData[]): GroupedReservations => {
    const grouped: GroupedReservations = {};

    reservations.forEach(reservation => {
      const userId = reservation.users.id;

      if (!grouped[userId]) {
        grouped[userId] = {
          userInfo: reservation.users,
          reservations: [],
          totalCount: 0,
          statusCounts: {
            pending: 0,
            confirmed: 0,
            cancelled: 0
          }
        };
      }

      grouped[userId].reservations.push(reservation);
      grouped[userId].totalCount++;

      // 상태별 카운트 증가
      const status = reservation.re_status as 'pending' | 'confirmed' | 'cancelled';
      if (grouped[userId].statusCounts[status] !== undefined) {
        grouped[userId].statusCounts[status]++;
      }
    });

    return grouped;
  };

  const toggleUserExpanded = (userId: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '대기중';
      case 'confirmed': return '확정';
      case 'cancelled': return '취소됨';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cruise': return <Ship className="w-4 h-4 text-blue-600" />;
      case 'airport': return <Plane className="w-4 h-4 text-green-600" />;
      case 'hotel': return <Building className="w-4 h-4 text-purple-600" />;
      case 'tour': return <MapPin className="w-4 h-4 text-orange-600" />;
      case 'rentcar': return <Car className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'cruise': return '크루즈';
      case 'airport': return '공항';
      case 'hotel': return '호텔';
      case 'tour': return '투어';
      case 'rentcar': return '렌터카';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'cruise': return 'bg-blue-100 text-blue-800';
      case 'airport': return 'bg-green-100 text-green-800';
      case 'hotel': return 'bg-purple-100 text-purple-800';
      case 'tour': return 'bg-orange-100 text-orange-800';
      case 'rentcar': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 모든 컬럼을 표 형태로 출력하는 공통 렌더러
  const renderDetailTable = (obj: any, type?: string) => {
    if (!obj) return null;
    const labelMap: Record<string, Record<string, string>> = {
      cruise: {
        reservation_id: '예약 ID',
        room_price_code: '객실 가격 코드',
        checkin: '체크인',
        guest_count: '탑승객 수',
        unit_price: '단가',
        boarding_assist: '승선 지원',
        room_total_price: '객실 총액',
        request_note: '요청사항',
        created_at: '생성일시'
      },
      airport: {
        reservation_id: '예약 ID',
        airport_price_code: '공항 가격 코드',
        ra_airport_location: '공항 위치',
        ra_flight_number: '항공편 번호',
        ra_datetime: '일시',
        ra_stopover_location: '경유지',
        ra_stopover_wait_minutes: '경유 대기(분)',
        ra_car_count: '차량 수',
        ra_passenger_count: '승객 수',
        ra_luggage_count: '수하물 수',
        request_note: '요청사항',
        ra_is_processed: '처리 여부',
        created_at: '생성일시'
      },
      hotel: {
        reservation_id: '예약 ID',
        hotel_price_code: '호텔 가격 코드',
        schedule: '스케줄',
        room_count: '객실 수',
        checkin_date: '체크인',
        breakfast_service: '조식 서비스',
        hotel_category: '호텔 카테고리',
        guest_count: '투숙객 수',
        total_price: '총액',
        request_note: '요청사항',
        created_at: '생성일시'
      },
      rentcar: {
        reservation_id: '예약 ID',
        rentcar_price_code: '렌터카 가격 코드',
        rentcar_count: '렌터카 수',
        unit_price: '단가',
        car_count: '차량 수',
        passenger_count: '승객 수',
        pickup_datetime: '픽업 일시',
        pickup_location: '픽업 장소',
        destination: '목적지',
        via_location: '경유지',
        via_waiting: '경유 대기',
        luggage_count: '수하물 수',
        total_price: '총액',
        request_note: '요청사항',
        created_at: '생성일시'
      },
      tour: {
        reservation_id: '예약 ID',
        tour_price_code: '투어 가격 코드',
        tour_capacity: '투어 정원',
        pickup_location: '픽업 장소',
        dropoff_location: '하차 장소',
        total_price: '총액',
        request_note: '요청사항',
        created_at: '생성일시'
      },
      cruise_car: {
        reservation_id: '예약 ID',
        car_price_code: '차량 가격 코드',
        car_count: '차량 수',
        passenger_count: '승객 수',
        pickup_datetime: '픽업 일시',
        pickup_location: '픽업 장소',
        dropoff_location: '하차 장소',
        car_total_price: '차량 총액',
        request_note: '요청사항',
        created_at: '생성일시',
        updated_at: '수정일시'
      }
    };

    const hiddenKeys = new Set(['id']);
    const entries = Object.entries(obj).filter(([k]) => {
      if (hiddenKeys.has(k)) return false;
      if (k.endsWith('_id')) return false;
      return true;
    });
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <tbody>
            {entries.map(([key, value]) => {
              let display: any = value;
              if (value && typeof value === 'string') {
                const isoLike = /\d{4}-\d{2}-\d{2}/.test(value);
                if (isoLike) {
                  const d = new Date(value);
                  if (!isNaN(d.getTime())) display = d.toLocaleString('ko-KR');
                }
              }
              if (typeof value === 'number') {
                display = Number(value).toLocaleString('ko-KR');
              }
              if (typeof value === 'object' && value !== null) {
                try { display = JSON.stringify(value); } catch { display = String(value); }
              }
              return (
                <tr key={key} className="border-b last:border-0">
                  <th className="w-1/3 text-left bg-gray-50 text-gray-700 px-3 py-2 font-medium align-top">
                    {(type && labelMap[type]?.[key]) || key}
                  </th>
                  <td className="px-3 py-2 text-gray-900 break-all">{display ?? 'null'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // 예약 기본 정보를 표 형태로 렌더링
  const renderBaseInfoTable = (reservation: ReservationData) => {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <tbody>
            <tr className="border-b">
              <th className="w-1/3 text-left bg-gray-50 text-gray-700 px-3 py-2 font-medium">예약일</th>
              <td className="px-3 py-2 text-gray-900">{new Date(reservation.re_created_at).toLocaleDateString('ko-KR')}</td>
            </tr>
            <tr className="border-b">
              <th className="w-1/3 text-left bg-gray-50 text-gray-700 px-3 py-2 font-medium">서비스 타입</th>
              <td className="px-3 py-2 text-gray-900">{getTypeName(reservation.re_type)}</td>
            </tr>
            <tr className="border-b">
              <th className="w-1/3 text-left bg-gray-50 text-gray-700 px-3 py-2 font-medium">예약 상태</th>
              <td className="px-3 py-2 text-gray-900">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(reservation.re_status)}`}>
                  {getStatusText(reservation.re_status)}
                </span>
              </td>
            </tr>
            {reservation.quote && (
              <tr>
                <th className="w-1/3 text-left bg-gray-50 text-gray-700 px-3 py-2 font-medium">연결된 견적</th>
                <td className="px-3 py-2 text-blue-600 font-medium">{reservation.quote.title}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  // 필터링된 사용자 목록
  const getFilteredUsers = () => {
    return Object.keys(groupedReservations).filter(userId => {
      const userGroup = groupedReservations[userId];
      if (filter === 'all') return true;
      return userGroup.reservations.some(reservation => reservation.re_status === filter);
    });
  };

  const filteredUsers = getFilteredUsers();
  const totalReservations = reservations.length;
  const statusCounts = {
    pending: reservations.filter(r => r.re_status === 'pending').length,
    confirmed: reservations.filter(r => r.re_status === 'confirmed').length,
    cancelled: reservations.filter(r => r.re_status === 'cancelled').length,
  };

  if (loading) {
    return (
      <ManagerLayout title="예약 관리" activeTab="reservations">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">예약 정보를 불러오는 중...</p>
          </div>
        </div>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout title="예약 관리" activeTab="reservations">
      <div className="space-y-6">

        {/* 헤더 및 통계 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="w-6 h-6 text-blue-600" />
                고객별 예약 관리
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                총 {Object.keys(groupedReservations).length}명의 고객, {totalReservations}건의 예약
              </p>
            </div>
            <div className="flex items-center gap-4">
              {lastUpdate && (
                <span className="text-sm text-gray-500">
                  마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR')}
                </span>
              )}
              <button
                onClick={() => {
                  setLoading(true);
                  loadReservations();
                }}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
              >
                {loading ? '새로고침 중...' : '🔄 새로고침'}
              </button>
            </div>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium">총 고객</span>
              </div>
              <div className="text-2xl font-bold text-gray-800">
                {Object.keys(groupedReservations).length}명
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium">대기중</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {statusCounts.pending}건
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium">확정</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {statusCounts.confirmed}건
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium">취소</span>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {statusCounts.cancelled}건
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="font-medium">데이터 로딩 오류</span>
              </div>
              <p className="text-sm">{error}</p>
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-xs">
                💡 데이터베이스 연결을 확인하고 다시 시도해주세요.
              </div>
            </div>
          )}
        </div>

        {/* 필터링 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-md font-semibold mb-4">예약 상태 필터</h4>
          <div className="flex gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              전체 ({totalReservations})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg transition-colors ${filter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              대기중 ({statusCounts.pending})
            </button>
            <button
              onClick={() => setFilter('confirmed')}
              className={`px-4 py-2 rounded-lg transition-colors ${filter === 'confirmed' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              확정 ({statusCounts.confirmed})
            </button>
            <button
              onClick={() => setFilter('cancelled')}
              className={`px-4 py-2 rounded-lg transition-colors ${filter === 'cancelled' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              취소 ({statusCounts.cancelled})
            </button>
          </div>
        </div>

        {/* 고객별 예약 목록 */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">고객별 예약 목록</h3>
            <p className="text-sm text-gray-600 mt-1">
              고객 정보를 클릭하면 해당 고객의 예약 내역을 확인할 수 있습니다.
            </p>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                {filter === 'all' ? '예약 고객이 없습니다' : `${getStatusText(filter)} 예약 고객이 없습니다`}
              </h3>
            </div>
          ) : (
            <div className="divide-y">
              {filteredUsers.map((userId) => {
                const userGroup = groupedReservations[userId];
                const isExpanded = expandedUsers.has(userId);

                // 필터에 맞는 예약만 필터링 후 타입 순서로 정렬
                const typeOrder = ['cruise', 'airport', 'hotel', 'tour', 'rentcar'];
                const filteredReservations = (filter === 'all'
                  ? userGroup.reservations
                  : userGroup.reservations.filter(r => r.re_status === filter))
                  .slice()
                  .sort((a, b) => {
                    const ta = typeOrder.indexOf(a.re_type);
                    const tb = typeOrder.indexOf(b.re_type);
                    if (ta !== tb) return ta - tb;
                    // 동일 타입 내에서는 최신순
                    return new Date(b.re_created_at).getTime() - new Date(a.re_created_at).getTime();
                  });

                if (filteredReservations.length === 0) return null;

                return (
                  <div key={userId} className="p-6">
                    {/* 고객 정보 헤더 */}
                    <div
                      className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -m-2 p-2 rounded-lg"
                      onClick={() => toggleUserExpanded(userId)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-500" />
                          )}
                          <User className="w-8 h-8 p-1.5 bg-blue-100 text-blue-600 rounded-full" />
                        </div>

                        <div>
                          <h4 className="font-semibold text-lg text-gray-800">
                            {userGroup.userInfo.name}
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              {userGroup.userInfo.email}
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="w-4 h-4" />
                              {userGroup.userInfo.phone}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* 예약 현황 요약 */}
                        <div className="flex gap-2">
                          {userGroup.statusCounts.pending > 0 && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                              대기 {userGroup.statusCounts.pending}
                            </span>
                          )}
                          {userGroup.statusCounts.confirmed > 0 && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              확정 {userGroup.statusCounts.confirmed}
                            </span>
                          )}
                          {userGroup.statusCounts.cancelled > 0 && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                              취소 {userGroup.statusCounts.cancelled}
                            </span>
                          )}
                        </div>

                        <div className="text-sm text-gray-500">
                          총 {filteredReservations.length}건
                        </div>
                      </div>
                    </div>

                    {/* 예약 상세 목록 (확장 시 표시) */}
                    {isExpanded && (
                      <div className="mt-4 space-y-6">
                        {/* 고객별 예약 기본 정보 - 그룹 하단에 1회 표시 */}
                        {(() => {
                          const allReservations = userGroup.reservations;
                          const counts = userGroup.statusCounts;
                          const times = allReservations
                            .map(r => new Date(r.re_created_at).getTime())
                            .filter(n => !isNaN(n));
                          const latest = times.length ? new Date(Math.max(...times)) : null;
                          const earliest = times.length ? new Date(Math.min(...times)) : null;
                          return (
                            <div className="bg-white rounded-lg border border-gray-200">
                              <div className="px-6 py-4 border-b bg-gray-50 rounded-t-lg">
                                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                  <Calendar className="w-5 h-5 text-blue-600" />
                                  예약 기본 정보
                                </h4>
                              </div>
                              <div className="p-4">
                                <div className="overflow-x-auto">
                                  <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                                    <tbody>
                                      <tr className="border-b">
                                        <th className="w-1/3 text-left bg-gray-50 text-gray-700 px-3 py-2 font-medium">총 예약 건수</th>
                                        <td className="px-3 py-2 text-gray-900">{userGroup.totalCount.toLocaleString('ko-KR')}건</td>
                                      </tr>
                                      <tr className="border-b">
                                        <th className="w-1/3 text-left bg-gray-50 text-gray-700 px-3 py-2 font-medium">상태별 건수</th>
                                        <td className="px-3 py-2 text-gray-900">
                                          <div className="flex gap-3">
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">대기 {counts.pending}</span>
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">확정 {counts.confirmed}</span>
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">취소 {counts.cancelled}</span>
                                          </div>
                                        </td>
                                      </tr>
                                      <tr className="border-b">
                                        <th className="w-1/3 text-left bg-gray-50 text-gray-700 px-3 py-2 font-medium">첫 예약일</th>
                                        <td className="px-3 py-2 text-gray-900">{earliest ? earliest.toLocaleDateString('ko-KR') : '-'}</td>
                                      </tr>
                                      <tr>
                                        <th className="w-1/3 text-left bg-gray-50 text-gray-700 px-3 py-2 font-medium">최신 예약일</th>
                                        <td className="px-3 py-2 text-gray-900">{latest ? latest.toLocaleDateString('ko-KR') : '-'}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                        {(() => {
                          // 견적 ID별로 그룹화하여 타이틀과 함께 표시
                          const groupedByQuote = filteredReservations.reduce((acc, r) => {
                            const qid = r.re_quote_id || 'no-quote';
                            (acc[qid] ||= []).push(r);
                            return acc;
                          }, {} as Record<string, ReservationData[]>);

                          // 정렬: 견적 그룹은 첫 예약 최신순
                          const quoteEntries = Object.entries(groupedByQuote).sort(([, a], [, b]) => {
                            const ta = Math.max(...a.map(x => new Date(x.re_created_at).getTime()));
                            const tb = Math.max(...b.map(x => new Date(x.re_created_at).getTime()));
                            return tb - ta;
                          });

                          return quoteEntries.map(([qid, list]) => {
                            // 그룹 헤더 정보
                            const title = list[0]?.quote?.title || (qid === 'no-quote' ? '연결된 견적 없음' : '제목 없음');
                            const shortId = qid !== 'no-quote' ? `${qid.slice(0, 8)}...` : '';

                            // 각 그룹 내 예약은 타입 순서 + 최신순
                            const typeOrder = ['cruise', 'airport', 'hotel', 'tour', 'rentcar'];
                            const sortedList = list.slice().sort((a, b) => {
                              const ta = typeOrder.indexOf(a.re_type);
                              const tb = typeOrder.indexOf(b.re_type);
                              if (ta !== tb) return ta - tb;
                              return new Date(b.re_created_at).getTime() - new Date(a.re_created_at).getTime();
                            });

                            return (
                              <div key={qid} className="bg-white rounded-lg border border-blue-200 overflow-hidden">
                                <div className="px-6 py-3 bg-blue-50 flex items-center justify-between border-b border-blue-200">
                                  <div className="flex items-center gap-3">
                                    <Calendar className="w-4 h-4 text-blue-600" />
                                    <span className="font-medium text-blue-800">견적: {title}</span>
                                    {shortId && <span className="text-xs text-blue-600">({shortId})</span>}
                                    {/* 타입별 개수 칩 */}
                                    <div className="flex items-center gap-1 ml-2">
                                      {['cruise', 'airport', 'hotel', 'tour', 'rentcar'].map(t => {
                                        const cnt = list.filter(x => x.re_type === t).length;
                                        if (!cnt) return null;
                                        const color = t === 'cruise' ? 'bg-blue-100 text-blue-700' :
                                          t === 'airport' ? 'bg-green-100 text-green-700' :
                                            t === 'hotel' ? 'bg-purple-100 text-purple-700' :
                                              t === 'tour' ? 'bg-orange-100 text-orange-700' :
                                                'bg-red-100 text-red-700';
                                        return (
                                          <span key={t} className={`px-2 py-0.5 rounded-full text-xs ${color}`}>{getTypeName(t)} {cnt}</span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  {qid !== 'no-quote' && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); router.push(`/manager/quotes/${qid}/view`); }}
                                      className="text-xs px-3 py-1 rounded border border-blue-300 text-blue-700 hover:bg-blue-100"
                                    >
                                      견적 보기
                                    </button>
                                  )}
                                </div>

                                <div className="p-4 space-y-3">
                                  {sortedList.map((reservation) => {
                                    // 하이라이트 정보 추출 (간단 표기)
                                    const sd: any = reservation.serviceDetails || {};
                                    let dateStr = '';
                                    let timeStr = '';
                                    let locStr = '';
                                    if (reservation.re_type === 'cruise') {
                                      if (sd.checkin) { dateStr = new Date(sd.checkin).toLocaleDateString('ko-KR'); }
                                      locStr = '하롱베이';
                                    } else if (reservation.re_type === 'airport') {
                                      if (sd.ra_datetime) {
                                        const d = new Date(sd.ra_datetime);
                                        dateStr = d.toLocaleDateString('ko-KR');
                                        timeStr = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
                                      }
                                      locStr = sd.ra_airport_location || '';
                                    } else if (reservation.re_type === 'hotel') {
                                      if (sd.checkin_date) { dateStr = new Date(sd.checkin_date).toLocaleDateString('ko-KR'); }
                                      locStr = sd.hotel_category || '';
                                    } else if (reservation.re_type === 'rentcar') {
                                      if (sd.pickup_datetime) {
                                        const d = new Date(sd.pickup_datetime);
                                        dateStr = d.toLocaleDateString('ko-KR');
                                        timeStr = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
                                      }
                                      if (sd.pickup_location && sd.destination) {
                                        locStr = `${sd.pickup_location} → ${sd.destination}`;
                                      } else {
                                        locStr = sd.pickup_location || sd.destination || '';
                                      }
                                    } else if (reservation.re_type === 'tour') {
                                      if (sd.tour_date) { dateStr = new Date(sd.tour_date).toLocaleDateString('ko-KR'); }
                                      locStr = sd.pickup_location || sd.dropoff_location || '';
                                    }

                                    return (
                                      <div key={reservation.re_id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                        <div className="flex items-center gap-3">
                                          {getTypeIcon(reservation.re_type)}
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <span className="font-medium text-gray-900">{getTypeName(reservation.re_type)}</span>
                                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(reservation.re_status)}`}>
                                                {getStatusText(reservation.re_status)}
                                              </span>
                                            </div>
                                            <div className="text-xs text-gray-600 flex gap-3 mt-0.5">
                                              {dateStr && <span>{dateStr}{timeStr ? ` ${timeStr}` : ''}</span>}
                                              {locStr && <span>위치: {locStr}</span>}
                                              <span className="text-gray-400">ID: {reservation.re_id.slice(0, 8)}...</span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={(e) => { e.stopPropagation(); router.push(`/manager/reservations/${reservation.re_id}/view`); }}
                                            className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 flex items-center gap-1"
                                          >
                                            <Eye className="w-3 h-3" /> 상세
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); router.push(`/manager/reservations/${reservation.re_id}/edit`); }}
                                            className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                                          >
                                            수정
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 빠른 액션 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Plus className="w-6 h-6 text-green-600" />
            빠른 액션
          </h3>
          <div className="grid md:grid-cols-4 gap-4">
            <button
              onClick={() => router.push('/manager/reservations/analytics')}
              className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg text-left transition-colors border border-blue-200"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-blue-500 text-white rounded">
                  <Calendar className="w-5 h-5" />
                </div>
                <span className="font-medium">예약 분석</span>
              </div>
              <p className="text-sm text-gray-600">
                예약 현황과 통계를 상세히 확인합니다.
              </p>
            </button>

            <button
              onClick={() => router.push('/manager/reservations/bulk')}
              className="bg-green-50 hover:bg-green-100 p-4 rounded-lg text-left transition-colors border border-green-200"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-green-500 text-white rounded">
                  <Edit className="w-5 h-5" />
                </div>
                <span className="font-medium">예약 처리</span>
              </div>
              <p className="text-sm text-gray-600">
                예약을 처리합니다.
              </p>
            </button>

            <button
              onClick={() => router.push('/manager/reservations/export')}
              className="bg-purple-50 hover:bg-purple-100 p-4 rounded-lg text-left transition-colors border border-purple-200"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-purple-500 text-white rounded">
                  <Calendar className="w-5 h-5" />
                </div>
                <span className="font-medium">데이터 내보내기</span>
              </div>
              <p className="text-sm text-gray-600">
                예약 데이터를 Excel로 내보냅니다.
              </p>
            </button>

            <button
              onClick={async () => {
                console.log('🔧 데이터베이스 연결 테스트 시작...');
                try {
                  const { data, error } = await supabase.from('reservation').select('count').limit(1);
                  if (error) throw error;
                  alert('✅ 데이터베이스 연결 성공!');
                  console.log('✅ DB 연결 성공:', data);
                } catch (error) {
                  console.error('❌ DB 연결 실패:', error);
                  alert('❌ 데이터베이스 연결 실패: ' + (error as any)?.message);
                }
              }}
              className="bg-gray-50 hover:bg-gray-100 p-4 rounded-lg text-left transition-colors border border-gray-200"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-gray-500 text-white rounded">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="font-medium">DB 연결 테스트</span>
              </div>
              <p className="text-sm text-gray-600">
                데이터베이스 연결 상태를 확인합니다.
              </p>
            </button>
          </div>
        </div>
      </div>
    </ManagerLayout>
  );
}
