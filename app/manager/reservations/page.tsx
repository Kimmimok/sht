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

      // 1. 현재 사용자 인증 및 권한 확인
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ 인증 오류:', userError);
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }

      // 2. 매니저 권한 확인
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!userData || !['manager', 'admin'].includes(userData.role)) {
        alert('매니저 권한이 필요합니다.');
        router.push('/');
        return;
      }

      // 3. 예약 데이터 조회 (사용자 정보와 견적 정보 포함)
      const { data, error } = await supabase
        .from('reservation')
        .select(`
          re_id,
          re_type,
          re_status,
          re_created_at,
          re_quote_id,
          users!inner(
            id,
            name,
            email,
            phone
          ),
          quote:re_quote_id(
            title,
            status
          )
        `)
        .order('re_created_at', { ascending: false });

      if (error) {
        console.error('❌ 예약 목록 조회 실패:', error);
        throw error;
      }

      console.log('✅ 예약 데이터 조회 성공:', data?.length || 0, '건');

      // 4. 사용자별로 예약 그룹화
      const grouped = groupReservationsByUser(data || []);

      setReservations(data || []);
      setGroupedReservations(grouped);
      setLastUpdate(new Date());
      setError(null);

    } catch (error) {
      console.error('❌ 예약 데이터 로딩 실패:', error);
      setError('예약 데이터를 불러오는 중 오류가 발생했습니다.');

      // 테스트 데이터 폴백
      const testData = createTestData();
      const grouped = groupReservationsByUser(testData);
      setReservations(testData);
      setGroupedReservations(grouped);
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

  const createTestData = (): ReservationData[] => {
    return [
      {
        re_id: 'test-1',
        re_type: 'cruise',
        re_status: 'pending',
        re_created_at: new Date().toISOString(),
        re_quote_id: 'quote-1',
        users: {
          id: 'user-1',
          name: '김고객',
          email: 'kim@example.com',
          phone: '010-1234-5678'
        },
        quote: {
          title: '부산 크루즈 여행',
          status: 'active'
        }
      },
      {
        re_id: 'test-2',
        re_type: 'airport',
        re_status: 'confirmed',
        re_created_at: new Date(Date.now() - 86400000).toISOString(),
        re_quote_id: 'quote-2',
        users: {
          id: 'user-1',
          name: '김고객',
          email: 'kim@example.com',
          phone: '010-1234-5678'
        },
        quote: {
          title: '부산 크루즈 여행',
          status: 'active'
        }
      },
      {
        re_id: 'test-3',
        re_type: 'hotel',
        re_status: 'pending',
        re_created_at: new Date(Date.now() - 172800000).toISOString(),
        re_quote_id: 'quote-3',
        users: {
          id: 'user-2',
          name: '이고객',
          email: 'lee@example.com',
          phone: '010-9876-5432'
        },
        quote: {
          title: '제주도 호텔 예약',
          status: 'active'
        }
      }
    ];
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
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              ⚠️ {error}
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

                // 필터에 맞는 예약만 필터링
                const filteredReservations = filter === 'all'
                  ? userGroup.reservations
                  : userGroup.reservations.filter(r => r.re_status === filter);

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
                      <div className="mt-4 pl-12 space-y-3">
                        {filteredReservations.map((reservation) => (
                          <div
                            key={reservation.re_id}
                            className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getTypeIcon(reservation.re_type)}
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium">
                                      {getTypeName(reservation.re_type)} 예약
                                    </span>
                                    <span className={`px-2 py-1 rounded text-xs ${getTypeColor(reservation.re_type)}`}>
                                      {getTypeName(reservation.re_type)}
                                    </span>
                                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(reservation.re_status)}`}>
                                      {getStatusText(reservation.re_status)}
                                    </span>
                                  </div>

                                  <div className="text-sm text-gray-600 space-y-1">
                                    <div>예약 ID: {reservation.re_id.slice(0, 8)}...</div>
                                    {reservation.quote && (
                                      <div>견적: {reservation.quote.title}</div>
                                    )}
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-4 h-4" />
                                      예약일: {new Date(reservation.re_created_at).toLocaleDateString('ko-KR')}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/manager/reservations/${reservation.re_id}/view`);
                                  }}
                                  className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                  title="상세보기"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/manager/reservations/${reservation.re_id}/edit`);
                                  }}
                                  className="p-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                                  title="수정"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
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
          <div className="grid md:grid-cols-3 gap-4">
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
                <span className="font-medium">일괄 처리</span>
              </div>
              <p className="text-sm text-gray-600">
                여러 예약을 한 번에 처리합니다.
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
          </div>
        </div>
      </div>
    </ManagerLayout>
  );
}
