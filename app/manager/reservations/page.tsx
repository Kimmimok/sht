'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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
  XCircle
} from 'lucide-react';

export default function ManagerReservationsPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      console.log('🔍 예약 데이터 로딩 시작...');
      
      // 1. 현재 사용자 인증 확인
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ 인증 오류:', userError);
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }

      console.log('✅ 인증된 사용자:', user.email);

      // 2. 사용자 권한 확인
      const { data: userData, error: roleError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (roleError) {
        console.error('❌ 사용자 정보 조회 오류:', roleError);
        console.log('🔧 RLS 정책을 우회하여 직접 조회 시도...');
      }

      console.log('👤 사용자 정보:', userData);

      // 3. 예약 테이블 존재 여부 확인 (간단한 테스트)
      console.log('🔍 예약 테이블 기본 조회 테스트...');
      const { count, error: countError } = await supabase
        .from('reservation')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('❌ 예약 테이블 접근 오류:', countError);
        console.log('상세 오류:', JSON.stringify(countError, null, 2));
      } else {
        console.log('📊 예약 테이블 총 레코드 수:', count);
      }

      // 4. RLS 정책 우회 시도 - 관리자/매니저만
      console.log('🔧 관리자 함수로 데이터 조회 시도...');
      
      // 관리자 함수 호출
      const { data: adminData, error: adminError } = await supabase
        .rpc('get_all_reservations_admin');

      if (!adminError && adminData) {
        console.log('✅ 관리자 함수로 조회 성공:', adminData?.length || 0, '건');
        console.log('📋 첫 번째 관리자 데이터:', adminData?.[0]);
        
        const formattedData = adminData.map((item: any) => ({
          re_id: item.re_id,
          re_type: item.re_type,
          re_status: item.re_status,
          re_created_at: item.re_created_at,
          users: {
            name: item.user_name,
            email: item.user_email,
            phone: item.user_phone
          },
          // 신청자 정보 추가
          applicant: {
            name: item.applicant_name,
            email: item.applicant_email,
            phone: item.applicant_phone,
            application_datetime: item.application_datetime
          },
          // 서비스 상세 정보 추가
          services: {
            cruise: item.cruise_checkin ? {
              checkin: item.cruise_checkin,
              guest_count: item.cruise_guest_count
            } : null,
            airport: item.airport_name ? {
              name: item.airport_name,
              direction: item.airport_direction,
              datetime: item.airport_datetime
            } : null,
            service_count: item.service_count || 0
          }
        }));
        
        console.log('🎯 포맷된 데이터:', formattedData);
        setReservations(formattedData);
        setLastUpdate(new Date());
        setError(null);
        setLoading(false);
        return;
      } else {
        console.log('❌ 관리자 함수 호출 실패:', adminError?.message);
      }

      // 5. 일반 예약 데이터 조회 (JOIN 수정)
      console.log('🔍 일반 예약 데이터 조회 시작...');
      const { data, error } = await supabase
        .from('reservation')
        .select(`
          re_id,
          re_type,
          re_status,
          re_created_at,
          re_user_id,
          users(
            id,
            name,
            email,
            phone
          )
        `)
        .order('re_created_at', { ascending: false });

      if (error) {
        console.error('❌ 예약 목록 조회 실패:', error);
        console.error('상세 오류:', JSON.stringify(error, null, 2));
        
        // 에러가 있으면 외래키 없이 직접 조회 시도
        console.log('🔧 외래키 없이 직접 조회 시도...');
        const { data: simpleData, error: simpleError } = await supabase
          .from('reservation')
          .select('re_id, re_type, re_status, re_created_at, re_user_id')
          .order('re_created_at', { ascending: false });

        if (simpleError) {
          console.error('❌ 단순 조회도 실패:', simpleError);
          setError('예약 데이터를 불러올 수 없어 테스트 데이터를 표시합니다.');
        } else {
          console.log('✅ 단순 조회 성공:', simpleData?.length || 0, '건');
          // 사용자 정보 없이 예약 데이터만 표시
          const formattedData = simpleData?.map((item: any) => ({
            ...item,
            users: { name: '정보없음', email: 'N/A', phone: 'N/A' }
          })) || [];
          setReservations(formattedData);
          setLastUpdate(new Date());
          setError('사용자 정보 조회 불가 - 예약 데이터만 표시됩니다.');
          return;
        }
        
        // 폴백: 테스트 데이터 생성
        console.log('🔧 테스트 데이터로 폴백...');
        setError('예약 데이터를 불러올 수 없어 테스트 데이터를 표시합니다.');
        const testData = [
          {
            re_id: 'test-1',
            re_type: 'cruise',
            re_status: 'pending',
            re_created_at: new Date().toISOString(),
            users: { name: '테스트 고객 1', email: 'test1@example.com', phone: '010-1234-5678' }
          },
          {
            re_id: 'test-2',
            re_type: 'airport',
            re_status: 'confirmed',
            re_created_at: new Date(Date.now() - 86400000).toISOString(),
            users: { name: '테스트 고객 2', email: 'test2@example.com', phone: '010-9876-5432' }
          }
        ];
        setReservations(testData);
        setLastUpdate(new Date());
        return;
      }

      console.log('✅ 예약 데이터 조회 성공:', data?.length || 0, '건');
      console.log('📋 첫 번째 예약 데이터:', data?.[0]);
      
      setReservations(data || []);
      setLastUpdate(new Date());
      setError(null);
    } catch (error) {
      console.error('❌ 예약 데이터 로딩 실패:', error);
      setError('예약 데이터 로딩 중 오류가 발생했습니다: ' + (error as Error).message);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'cancelled': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <Clock className="w-5 h-5 text-yellow-600" />;
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cruise': return <Ship className="w-6 h-6 text-blue-600" />;
      case 'airport': return <Plane className="w-6 h-6 text-green-600" />;
      case 'hotel': return <Building className="w-6 h-6 text-purple-600" />;
      case 'tour': return <MapPin className="w-6 h-6 text-orange-600" />;
      case 'rentcar': return <Car className="w-6 h-6 text-red-600" />;
      default: return <Clock className="w-6 h-6 text-gray-600" />;
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

  const filteredReservations = reservations.filter(reservation => {
    if (filter === 'all') return true;
    return reservation.re_status === filter;
  });

  const reservationTypes = [
    { type: 'cruise', name: '크루즈 예약', icon: Ship, color: 'bg-blue-500' },
    { type: 'airport', name: '공항 이용 예약', icon: Plane, color: 'bg-green-500' },
    { type: 'hotel', name: '호텔 예약', icon: Building, color: 'bg-purple-500' },
    { type: 'tour', name: '투어 예약', icon: MapPin, color: 'bg-orange-500' },
    { type: 'rentcar', name: '렌트카 예약', icon: Car, color: 'bg-red-500' }
  ];

  if (loading) {
    return (
      <ManagerLayout title="예약 서비스 관리" activeTab="reservations">
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
    <ManagerLayout title="예약 서비스 관리" activeTab="reservations">
      <div className="space-y-6">
        
        {/* 새 예약 신청 섹션 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Plus className="w-6 h-6 text-green-600" />
            새 예약 신청 (고객 대신)
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reservationTypes.map((item) => {
              const IconComponent = item.icon;
              return (
                <div
                  key={item.type}
                  className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors border"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-full ${item.color} text-white`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <h4 className="font-medium">{item.name}</h4>
                  </div>
                  <button 
                    onClick={() => {
                      // 매니저가 고객 대신 예약을 생성하는 경우
                      if (item.type === 'cruise') {
                        router.push('/reservation/comprehensive/new'); // 새로운 종합 예약 페이지
                      } else {
                        alert(`${item.name} 기능은 아직 개발 중입니다.`);
                      }
                    }}
                    className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 transition-colors text-sm"
                  >
                    신청하기
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 필터링 및 상태 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">예약 필터</h3>
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
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              ⚠️ 오류: {error}
            </div>
          )}
          
          <div className="flex gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              전체 ({reservations.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              대기중 ({reservations.filter(r => r.re_status === 'pending').length})
            </button>
            <button
              onClick={() => setFilter('confirmed')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'confirmed' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              확정 ({reservations.filter(r => r.re_status === 'confirmed').length})
            </button>
            <button
              onClick={() => setFilter('cancelled')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'cancelled' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              취소 ({reservations.filter(r => r.re_status === 'cancelled').length})
            </button>
          </div>
        </div>

        {/* 예약 목록 */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">예약 목록</h3>
          </div>
          
          {filteredReservations.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                {filter === 'all' ? '예약 내역이 없습니다' : `${getStatusText(filter)} 예약이 없습니다`}
              </h3>
            </div>
          ) : (
            <div className="divide-y">
              {filteredReservations.map((reservation) => (
                <div key={reservation.re_id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {getTypeIcon(reservation.re_type)}
                      <div>
                        <h4 className="font-semibold text-lg">
                          {getTypeName(reservation.re_type)} 예약
                        </h4>
                        <p className="text-sm text-gray-600">
                          예약 ID: {reservation.re_id.slice(0, 8)}...
                        </p>
                        <p className="text-sm text-gray-600">
                          고객: {reservation.users?.name || reservation.users?.email || '정보없음'}
                        </p>
                        {/* 신청자 정보 표시 */}
                        {reservation.applicant?.name && (
                          <p className="text-sm text-blue-600">
                            📝 신청자: {reservation.applicant.name} ({reservation.applicant.email})
                          </p>
                        )}
                        {reservation.applicant?.application_datetime && (
                          <p className="text-sm text-purple-600">
                            📅 신청일시: {new Date(reservation.applicant.application_datetime).toLocaleString('ko-KR')}
                          </p>
                        )}
                        {reservation.users?.phone && (
                          <p className="text-sm text-gray-600">
                            연락처: {reservation.users.phone}
                          </p>
                        )}
                        {/* 서비스 상세 정보 표시 */}
                        {reservation.services?.service_count > 0 && (
                          <p className="text-sm text-blue-600">
                            📋 연결된 서비스: {reservation.services.service_count}개
                          </p>
                        )}
                        {reservation.services?.cruise && (
                          <p className="text-sm text-green-600">
                            🚢 크루즈: {reservation.services.cruise.checkin} ({reservation.services.cruise.guest_count}명)
                          </p>
                        )}
                        {reservation.services?.airport && (
                          <p className="text-sm text-orange-600">
                            ✈️ 공항: {reservation.services.airport.name} ({reservation.services.airport.direction})
                          </p>
                        )}
                        <p className="text-sm text-gray-500">
                          신청일: {new Date(reservation.re_created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(reservation.re_status)}
                        <span className="font-medium">
                          {getStatusText(reservation.re_status)}
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/manager/reservations/${reservation.re_id}/view`)}
                          className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                          title="상세보기"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/manager/reservations/${reservation.re_id}/edit`)}
                          className="p-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                          title="수정"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
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
