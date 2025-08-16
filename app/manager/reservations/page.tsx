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
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface ReservationData {
  re_id: string;
  re_type: string;
  re_status: string;
  re_created_at: string;
  re_quote_id: string;
  re_user_id: string;
  users: {
    id: string;
    name: string;
    email: string;
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

  // ✅ 단일 팝업 상태 관리
  const [showModal, setShowModal] = useState(false);
  const [modalView, setModalView] = useState<'user' | 'reservation'>('user'); // 현재 보기 모드
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedReservation, setSelectedReservation] = useState<any>(null);

  // ✅ 검색 기능
  const [searchName, setSearchName] = useState('');

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

      // ✅ 예약 데이터와 사용자 ID 확인
      console.log('🔍 예약 데이터 샘플:', baseReservations?.slice(0, 3));

      // 사용자/견적 ID 수집 후 배치 조회
      const userIds = Array.from(new Set((baseReservations || []).map((r: any) => r.re_user_id).filter(Boolean)));
      console.log('👥 추출된 사용자 ID들:', userIds.length, '개', userIds.slice(0, 3));

      const quoteIds = Array.from(new Set((baseReservations || []).map((r: any) => r.re_quote_id).filter(Boolean)));

      // 서비스 타입별로 예약 ID 수집 (배치 조회 준비)
      const cruiseIds = (baseReservations || []).filter((r: any) => r.re_type === 'cruise').map((r: any) => r.re_id);
      const airportIds = (baseReservations || []).filter((r: any) => r.re_type === 'airport').map((r: any) => r.re_id);
      const hotelIds = (baseReservations || []).filter((r: any) => r.re_type === 'hotel').map((r: any) => r.re_id);
      const rentcarIds = (baseReservations || []).filter((r: any) => r.re_type === 'rentcar').map((r: any) => r.re_id);
      const tourIds = (baseReservations || []).filter((r: any) => r.re_type === 'tour').map((r: any) => r.re_id);

      // ✅ 사용자 조회 개선 - 확실한 조회 보장
      let usersRes = { data: [], error: null };
      if (userIds.length > 0) {
        console.log('👥 사용자 정보 조회 시작...', userIds.length, '명');
        console.log('👥 조회할 사용자 ID 목록:', userIds);

        // ✅ 각 사용자 ID별로 개별 조회하여 정확성 확인
        const userDataPromises = userIds.map(async (userId) => {
          console.log('🔍 개별 사용자 조회:', userId);

          const { data: singleUser, error: singleError } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('id', userId)
            .maybeSingle();

          if (singleError) {
            console.error('❌ 사용자 개별 조회 실패:', userId, singleError);
            return null;
          }

          console.log('👤 개별 사용자 조회 결과:', userId, singleUser);
          return singleUser;
        });

        const individualUsers = await Promise.all(userDataPromises);
        const validUsers = individualUsers.filter(user => user !== null);

        console.log('✅ 개별 조회 완료:', validUsers.length, '명');
        console.log('👥 개별 조회 결과 샘플:', validUsers.slice(0, 3));

        // ✅ 배치 조회도 병행하여 결과 비교
        usersRes = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', userIds);

        console.log('👥 배치 조회 결과:', usersRes.data?.length || 0, '명');
        console.log('👥 배치 조회 샘플:', usersRes.data?.slice(0, 3));

        // ✅ 개별 조회 결과를 우선 사용
        if (validUsers.length > 0) {
          usersRes.data = validUsers;
          usersRes.error = null;
        }

        if (usersRes.error) {
          console.error('❌ 사용자 배치 조회 오류:', usersRes.error);
        }
      } else {
        console.log('⚠️ 조회할 사용자 ID가 없습니다.');
      }

      const [quotesRes, cruiseRes, cruiseCarRes, airportRes, hotelRes, rentcarRes, tourRes] = await Promise.all([
        // 예약.re_quote_id는 quote.id를 참조 (quote_id가 아닌 기본키 id)
        quoteIds.length
          ? supabase.from('quote').select('id, quote_id, title, status').in('id', quoteIds)
          : Promise.resolve({ data: [], error: null } as any),
        cruiseIds.length
          ? supabase.from('reservation_cruise').select('*').in('reservation_id', cruiseIds)
          : Promise.resolve({ data: [], error: null } as any),
        cruiseIds.length
          ? supabase.from('reservation_cruise_car').select('*').in('reservation_id', cruiseIds).order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null } as any),
        airportIds.length
          ? supabase.from('reservation_airport').select('*').in('reservation_id', airportIds)
          : Promise.resolve({ data: [], error: null } as any),
        hotelIds.length
          ? supabase.from('reservation_hotel').select('*').in('reservation_id', hotelIds)
          : Promise.resolve({ data: [], error: null } as any),
        rentcarIds.length
          ? supabase.from('reservation_rentcar').select('*').in('reservation_id', rentcarIds)
          : Promise.resolve({ data: [], error: null } as any),
        tourIds.length
          ? supabase.from('reservation_tour').select('*').in('reservation_id', tourIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      if (quotesRes.error) console.warn('⚠️ 견적 배치 조회 일부 실패:', quotesRes.error);

      // ✅ 사용자 맵 생성 개선 - 더 확실한 데이터 처리
      const userMap = new Map<string, { id: string; name: string; email: string }>();

      console.log('🗂️ 사용자 맵 생성 시작...', usersRes.data?.length || 0, '명');

      (usersRes.data || []).forEach((u: any) => {
        console.log('👤 사용자 맵 추가:', u.id, '이름:', u.name, '이메일:', u.email);

        // ✅ 실제 데이터가 있는지 확인하고 맵에 추가
        if (u && u.id) {
          userMap.set(u.id, {
            id: u.id,
            name: u.name || u.email?.split('@')[0] || `사용자_${u.id.substring(0, 8)}`,
            email: u.email || '이메일 없음'
          });
        }
      });

      console.log('🗂️ 최종 사용자 맵 크기:', userMap.size);
      console.log('🗂️ 사용자 맵 키 목록:', Array.from(userMap.keys()).slice(0, 10));

      // ✅ re_quote_id는 quote.id를 참조하도록 수정
      const quoteMap = new Map<string, { id: string; quote_id: string; title: string; status: string }>();
      (quotesRes.data || []).forEach((q: any) => {
        if (q.id) {
          console.log('📝 견적 맵 추가:', q.id, '제목:', q.title);
          quoteMap.set(q.id, q);
        }
      });

      // 서비스 상세 맵
      const cruiseMap = new Map<string, any>();
      (cruiseRes.data || []).forEach((row: any) => cruiseMap.set(row.reservation_id, row));

      const cruiseCarLatestMap = new Map<string, any>();
      if (Array.isArray(cruiseCarRes.data)) {
        for (const row of cruiseCarRes.data as any[]) {
          if (!cruiseCarLatestMap.has(row.reservation_id)) {
            cruiseCarLatestMap.set(row.reservation_id, row);
          }
        }
      }

      const airportMap = new Map<string, any>();
      (airportRes.data || []).forEach((row: any) => airportMap.set(row.reservation_id, row));
      const hotelMap = new Map<string, any>();
      (hotelRes.data || []).forEach((row: any) => hotelMap.set(row.reservation_id, row));
      const rentcarMap = new Map<string, any>();
      (rentcarRes.data || []).forEach((row: any) => rentcarMap.set(row.reservation_id, row));
      const tourMap = new Map<string, any>();
      (tourRes.data || []).forEach((row: any) => tourMap.set(row.reservation_id, row));

      // 사용자 정보와 견적 정보를 매핑하여 확장
      const enrichedReservations: ReservationData[] = [];

      for (const reservation of baseReservations || []) {
        try {
          console.log('🔄 예약 처리 중:', reservation.re_id, '사용자 ID:', reservation.re_user_id);

          // ✅ 사용자 정보 조회 및 상세 디버깅
          const userInfo = userMap.get(reservation.re_user_id);

          if (!userInfo) {
            console.log('❌ 사용자 정보 찾을 수 없음 for ID:', reservation.re_user_id);
            console.log('🗂️ 현재 맵에 있는 키들:', Array.from(userMap.keys()).slice(0, 10));

            // ✅ 실시간으로 해당 사용자 다시 조회
            console.log('🔍 실시간 사용자 재조회 시작:', reservation.re_user_id);

            const { data: realTimeUser, error: realTimeError } = await supabase
              .from('users')
              .select('id, name, email')
              .eq('id', reservation.re_user_id)
              .maybeSingle();

            if (realTimeError) {
              console.error('❌ 실시간 사용자 조회 실패:', reservation.re_user_id, realTimeError);
            } else if (realTimeUser) {
              console.log('✅ 실시간 사용자 조회 성공:', realTimeUser);
              // 맵에 추가
              userMap.set(realTimeUser.id, {
                id: realTimeUser.id,
                name: realTimeUser.name || realTimeUser.email?.split('@')[0] || `사용자_${realTimeUser.id.substring(0, 8)}`,
                email: realTimeUser.email || '이메일 없음'
              });
            } else {
              console.log('⚠️ 실시간 조회에서도 사용자를 찾을 수 없음:', reservation.re_user_id);
            }
          }

          // ✅ 최종 사용자 정보 결정 (실시간 조회 결과 반영)
          const finalUserInfo = userMap.get(reservation.re_user_id) || {
            id: reservation.re_user_id,
            name: `데이터 없음_${reservation.re_user_id.substring(0, 8)}`,
            email: '조회 실패'
          };

          console.log('👤 최종 사용자 정보:', finalUserInfo);

          // ✅ 견적 정보 조회 (re_quote_id는 quote.id를 참조)
          const qInfo = reservation.re_quote_id ? quoteMap.get(reservation.re_quote_id) : null;

          // 배치 조회 결과에서 매핑
          let serviceDetails: any = null;
          let serviceDetailsExtra: any = null;
          switch (reservation.re_type) {
            case 'cruise':
              serviceDetails = cruiseMap.get(reservation.re_id) || null;
              serviceDetailsExtra = cruiseCarLatestMap.get(reservation.re_id) || null;
              break;
            case 'airport':
              serviceDetails = airportMap.get(reservation.re_id) || null;
              break;
            case 'hotel':
              serviceDetails = hotelMap.get(reservation.re_id) || null;
              break;
            case 'rentcar':
              serviceDetails = rentcarMap.get(reservation.re_id) || null;
              break;
            case 'tour':
              serviceDetails = tourMap.get(reservation.re_id) || null;
              break;
          }

          enrichedReservations.push({
            ...(reservation as any),
            users: finalUserInfo,
            quote: qInfo
              ? { title: qInfo.title ?? '제목 없음', status: qInfo.status ?? 'unknown' }
              : { title: '연결된 견적 없음', status: 'unknown' },
            serviceDetails,
            serviceDetailsExtra,
          });
        } catch (enrichError) {
          console.warn('⚠️ 예약 상세 정보 구성 실패:', (reservation as any).re_id, enrichError);
          enrichedReservations.push({
            ...(reservation as any),
            users: {
              id: (reservation as any).re_user_id,
              name: `처리오류_${(reservation as any).re_user_id.substring(0, 8)}`,
              email: '오류로 인한 정보 없음'
            },
            quote: { title: reservation.re_quote_id ? '제목 없음' : '연결된 견적 없음', status: 'unknown' },
            serviceDetails: null
          } as any);
        }
      }

      console.log('✅ 예약 데이터 완성:', enrichedReservations.length, '건');
      console.log('👥 최종 사용자 정보 샘플:', enrichedReservations.slice(0, 3).map(r => ({
        reservation_id: r.re_id.substring(0, 8),
        user_id: r.users.id.substring(0, 8),
        name: r.users.name,
        email: r.users.email
      })));

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
      case 'sht': // sht → 스하차량
      case 'car_sht':
      case 'reservation_car_sht':
        return <Car className="w-4 h-4 text-blue-800" />;
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
      case 'sht': // sht → 스하차량
      case 'car_sht':
      case 'reservation_car_sht':
        return '스하차량';
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
      case 'sht': // sht → 스하차량
      case 'car_sht':
      case 'reservation_car_sht':
        return 'bg-blue-100 text-blue-900';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // ✅ 검색과 필터링이 적용된 사용자 목록
  const getFilteredUsers = () => {
    return Object.keys(groupedReservations)
      .filter(userId => {
        const userGroup = groupedReservations[userId];

        // ✅ 이름 검색 필터 적용
        const nameMatch = !searchName ||
          userGroup.userInfo.name.toLowerCase().includes(searchName.toLowerCase()) ||
          userGroup.userInfo.email.toLowerCase().includes(searchName.toLowerCase());

        if (!nameMatch) return false;

        // 상태 필터 적용
        if (filter === 'all') return true;
        return userGroup.reservations.some(reservation => reservation.re_status === filter);
      })
      // ✅ 이름 순으로 정렬
      .sort((userIdA, userIdB) => {
        const userA = groupedReservations[userIdA].userInfo.name;
        const userB = groupedReservations[userIdB].userInfo.name;
        return userA.localeCompare(userB, 'ko-KR');
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

  // ✅ 단일 팝업 관리 함수들
  const openUserModal = (userGroup: any) => {
    setSelectedUser(userGroup);
    setSelectedReservation(null);
    setModalView('user');
    setShowModal(true);
  };

  const openReservationModal = (reservation: any) => {
    setSelectedReservation(reservation);
    setModalView('reservation');
    // setShowModal은 이미 true 상태이므로 변경하지 않음
  };

  const goBackToUserView = () => {
    setSelectedReservation(null);
    setModalView('user');
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setSelectedReservation(null);
    setModalView('user');
  };

  // ✅ 검색 초기화 함수
  const clearSearch = () => {
    setSearchName('');
  };

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
                {searchName && ` (검색: ${filteredUsers.length}명)`}
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

        {/* ✅ 검색 및 필터링 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* 이름 검색 */}
            <div className="flex-1">
              <h4 className="text-md font-semibold mb-3">고객 검색</h4>
              <div className="relative">
                <input
                  type="text"
                  placeholder="고객 이름 또는 이메일로 검색..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                />
                {searchName && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
              {searchName && (
                <p className="text-sm text-gray-500 mt-1">
                  "{searchName}" 검색 결과: {filteredUsers.length}명
                </p>
              )}
            </div>

            {/* 상태 필터 */}
            <div className="md:w-auto">
              <h4 className="text-md font-semibold mb-3">예약 상태 필터</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${filter === 'all'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  전체 ({totalReservations})
                </button>
                <button
                  onClick={() => setFilter('pending')}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${filter === 'pending'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  대기중 ({statusCounts.pending})
                </button>
                <button
                  onClick={() => setFilter('confirmed')}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${filter === 'confirmed'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  확정 ({statusCounts.confirmed})
                </button>
                <button
                  onClick={() => setFilter('cancelled')}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${filter === 'cancelled'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  취소 ({statusCounts.cancelled})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 고객별 예약 목록 - 4열 그리드 */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">고객별 예약 목록</h3>
            <p className="text-sm text-gray-600 mt-1">
              고객 정보를 클릭하면 해당 고객의 예약 내역을 확인할 수 있습니다.
              {searchName && ` (이름순 정렬, "${searchName}" 검색 중)`}
            </p>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                {searchName
                  ? `"${searchName}"로 검색된 고객이 없습니다`
                  : filter === 'all'
                    ? '예약 고객이 없습니다'
                    : `${getStatusText(filter)} 예약 고객이 없습니다`}
              </h3>
              {searchName && (
                <button
                  onClick={clearSearch}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                >
                  검색 초기화
                </button>
              )}
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {filteredUsers.map((userId) => {
                  const userGroup = groupedReservations[userId];

                  // 필터에 맞는 예약만 필터링
                  const filteredReservations = (filter === 'all'
                    ? userGroup.reservations
                    : userGroup.reservations.filter(r => r.re_status === filter));

                  if (filteredReservations.length === 0) return null;

                  // 서비스 타입별 개수 계산
                  const serviceTypeCounts = filteredReservations.reduce((acc, reservation) => {
                    const type = reservation.re_type;
                    acc[type] = (acc[type] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);

                  return (
                    <div
                      key={userId}
                      className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => openUserModal(userGroup)}
                    >
                      {/* 고객 카드 헤더 */}
                      <div className="p-4 hover:bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3 mb-3">
                          <User className="w-8 h-8 p-1.5 bg-blue-100 text-blue-600 rounded-full flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-sm text-gray-800 truncate">
                              {userGroup.userInfo.name}
                            </h4>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        </div>

                        <div className="space-y-1 text-xs text-gray-600">
                          <div className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{userGroup.userInfo.email || '이메일 없음'}</span>
                          </div>
                        </div>

                        {/* 서비스 타입별 표시 */}
                        <div className="mt-3 space-y-1">
                          <div className="text-xs font-medium text-gray-700">예약 서비스:</div>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(serviceTypeCounts).map(([type, count]) => (
                              <div key={type} className="flex items-center gap-1">
                                {getTypeIcon(type)}
                                <span className={`px-2 py-0.5 rounded-full text-xs ${getTypeColor(type)}`}>
                                  {getTypeName(type)} {count}건
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 예약 상태 요약 */}
                        <div className="flex flex-wrap gap-1 mt-3">
                          {userGroup.statusCounts.pending > 0 && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                              대기 {userGroup.statusCounts.pending}
                            </span>
                          )}
                          {userGroup.statusCounts.confirmed > 0 && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                              확정 {userGroup.statusCounts.confirmed}
                            </span>
                          )}
                          {userGroup.statusCounts.cancelled > 0 && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">
                              취소 {userGroup.statusCounts.cancelled}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-gray-500 mt-2 text-center">
                          총 {filteredReservations.length}건 예약
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ✅ 단일 팝업 모달 - 사용자 목록 또는 예약 상세 */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">

              {/* ✅ 사용자 예약 목록 뷰 */}
              {modalView === 'user' && selectedUser && (
                <>
                  <div className="p-6 border-b">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <User className="w-8 h-8 p-1.5 bg-blue-100 text-blue-600 rounded-full" />
                        <div>
                          <h2 className="text-xl font-bold text-gray-800">
                            {selectedUser.userInfo.name}
                          </h2>
                          <p className="text-sm text-gray-600">
                            {selectedUser.userInfo.email}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={closeModal}
                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">예약 현황 요약</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-yellow-50 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-yellow-600">
                            {selectedUser.statusCounts.pending}
                          </div>
                          <div className="text-sm text-yellow-700">대기중</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {selectedUser.statusCounts.confirmed}
                          </div>
                          <div className="text-sm text-green-700">확정</div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {selectedUser.statusCounts.cancelled}
                          </div>
                          <div className="text-sm text-red-700">취소</div>
                        </div>
                      </div>
                    </div>

                    {/* 예약 상세 목록 */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800">예약 상세 목록</h3>
                      {selectedUser.reservations
                        .slice()
                        .sort((a: any, b: any) => new Date(b.re_created_at).getTime() - new Date(a.re_created_at).getTime())
                        .map((reservation: any) => {
                          // 서비스 상세 정보 추출
                          const sd: any = reservation.serviceDetails || {};
                          let dateStr = '';
                          let timeStr = '';
                          let locStr = '';
                          let details = '';

                          if (reservation.re_type === 'cruise') {
                            if (sd.checkin) {
                              dateStr = new Date(sd.checkin).toLocaleDateString('ko-KR');
                            }
                            locStr = '하롱베이';
                            details = `${sd.guest_count || 0}명 | ${sd.room_price_code || ''}`;
                          } else if (reservation.re_type === 'airport') {
                            if (sd.ra_datetime) {
                              const d = new Date(sd.ra_datetime);
                              dateStr = d.toLocaleDateString('ko-KR');
                              timeStr = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
                            }
                            locStr = sd.ra_airport_location || '';
                            details = sd.ra_flight_number || '';
                          } else if (reservation.re_type === 'hotel') {
                            if (sd.checkin_date) {
                              dateStr = new Date(sd.checkin_date).toLocaleDateString('ko-KR');
                            }
                            locStr = sd.hotel_category || '';
                            details = `${sd.nights || 0}박 | ${sd.guest_count || 0}명`;
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
                            details = `${sd.rental_days || 0}일`;
                          } else if (reservation.re_type === 'tour') {
                            if (sd.tour_date) {
                              dateStr = new Date(sd.tour_date).toLocaleDateString('ko-KR');
                            }
                            locStr = sd.pickup_location || sd.dropoff_location || '';
                            details = `${sd.participant_count || 0}명`;
                          }

                          return (
                            <div key={reservation.re_id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  {getTypeIcon(reservation.re_type)}
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-semibold text-gray-900">
                                        {getTypeName(reservation.re_type)}
                                      </span>
                                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(reservation.re_status)}`}>
                                        {getStatusText(reservation.re_status)}
                                      </span>
                                    </div>

                                    <div className="text-sm text-gray-600 space-y-1">
                                      {(dateStr || timeStr) && (
                                        <div>📅 {dateStr}{timeStr ? ` ${timeStr}` : ''}</div>
                                      )}
                                      {locStr && <div>📍 {locStr}</div>}
                                      {details && <div>ℹ️ {details}</div>}
                                      <div className="text-xs text-gray-400">
                                        예약일: {new Date(reservation.re_created_at).toLocaleDateString('ko-KR')} |
                                        ID: {reservation.re_id.slice(0, 8)}...
                                      </div>
                                    </div>

                                    {reservation.quote && (
                                      <div className="text-sm text-blue-600 mt-2">
                                        견적: {reservation.quote.title}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {/* ✅ 상세 버튼 - 같은 팝업에서 뷰 변경 */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openReservationModal(reservation);
                                    }}
                                    className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 flex items-center gap-1"
                                  >
                                    <Eye className="w-3 h-3" /> 상세
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      closeModal();
                                      router.push(`/manager/reservations/${reservation.re_id}/edit`);
                                    }}
                                    className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                                  >
                                    수정
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  <div className="p-6 border-t bg-gray-50">
                    <div className="flex justify-end">
                      <button
                        onClick={closeModal}
                        className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                      >
                        닫기
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* ✅ 예약 상세 뷰 */}
              {modalView === 'reservation' && selectedReservation && (
                <>
                  <div className="p-6 border-b bg-blue-50">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        {/* ✅ 뒤로 버튼 */}
                        <button
                          onClick={goBackToUserView}
                          className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                          title="목록으로 돌아가기"
                        >
                          <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        {getTypeIcon(selectedReservation.re_type)}
                        <div>
                          <h2 className="text-xl font-bold text-gray-800">
                            {getTypeName(selectedReservation.re_type)} 예약 상세
                          </h2>
                          <p className="text-sm text-gray-600">
                            예약 ID: {selectedReservation.re_id.slice(0, 8)}... | 고객: {selectedReservation.users.name}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={closeModal}
                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    {/* 예약 기본 정보 */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">기본 정보</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-sm text-gray-600 mb-1">예약 상태</div>
                          <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedReservation.re_status)}`}>
                            {getStatusIcon(selectedReservation.re_status)}
                            <span className="ml-1">{getStatusText(selectedReservation.re_status)}</span>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-sm text-gray-600 mb-1">예약 일시</div>
                          <div className="font-medium">
                            {new Date(selectedReservation.re_created_at).toLocaleString('ko-KR')}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-sm text-gray-600 mb-1">고객 정보</div>
                          <div className="font-medium">{selectedReservation.users.name}</div>
                          <div className="text-sm text-gray-500">{selectedReservation.users.email}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-sm text-gray-600 mb-1">견적 정보</div>
                          <div className="font-medium">{selectedReservation.quote.title}</div>
                        </div>
                      </div>
                    </div>

                    {/* 서비스별 상세 정보 */}
                    {selectedReservation.serviceDetails && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">서비스 상세</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="space-y-3">
                            {Object.entries(selectedReservation.serviceDetails).map(([key, value]) => (
                              <div key={key} className="flex justify-between py-2 border-b border-gray-200 last:border-0">
                                <span className="text-sm font-medium text-gray-600 capitalize">
                                  {key.replace(/_/g, ' ')}:
                                </span>
                                <span className="text-sm text-gray-800">
                                  {value ? String(value) : '정보 없음'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 추가 정보 */}
                    {selectedReservation.serviceDetailsExtra && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">추가 서비스</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="space-y-3">
                            {Object.entries(selectedReservation.serviceDetailsExtra).map(([key, value]) => (
                              <div key={key} className="flex justify-between py-2 border-b border-gray-200 last:border-0">
                                <span className="text-sm font-medium text-gray-600 capitalize">
                                  {key.replace(/_/g, ' ')}:
                                </span>
                                <span className="text-sm text-gray-800">
                                  {value ? String(value) : '정보 없음'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-6 border-t bg-gray-50">
                    <div className="flex justify-between">
                      <button
                        onClick={goBackToUserView}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        목록으로
                      </button>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            closeModal();
                            router.push(`/manager/reservations/${selectedReservation.re_id}/edit`);
                          }}
                          className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          수정하기
                        </button>
                        <button
                          onClick={closeModal}
                          className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                        >
                          닫기
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

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
