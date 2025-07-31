'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import { AuthWrapper } from '@/components/AuthWrapper';

export default function CustomerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [reservations, setReservations] = useState([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadCustomerData();
  }, []);

  const loadCustomerData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // 예약 정보 조회
      const { data: reservationData } = await supabase
        .from('reservation')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (reservationData) {
        setReservations(reservationData);
      }

      // 프로필 정보 조회
      const { data: profileData } = await supabase
        .from('customer_profile')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
      }
    } catch (error) {
      console.error('데이터 로드 오류:', error);
    }
  };

  const getReservationStats = () => {
    const total = reservations.length;
    const confirmed = reservations.filter((r: any) => r.status === 'confirmed').length;
    const pending = reservations.filter((r: any) => r.status === 'pending').length;
    const completed = reservations.filter((r: any) => r.status === 'completed').length;
    
    return { total, confirmed, pending, completed };
  };

  const stats = getReservationStats();

  return (
    <AuthWrapper allowedRoles={['member', 'manager', 'admin']}>
      <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-green-100 via-emerald-100 to-teal-100">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🎫 예약자 대시보드
          </h1>
          <p className="text-lg text-gray-600">
            안녕하세요, {profile?.name || user?.email}님! 예약 관리를 시작하세요.
          </p>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">전체 예약</p>
                <p className="text-2xl font-bold text-blue-500">{stats.total}</p>
              </div>
              <div className="text-3xl text-blue-400">🎫</div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">대기 중</p>
                <p className="text-2xl font-bold text-orange-500">{stats.pending}</p>
              </div>
              <div className="text-3xl text-orange-400">⏳</div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">확정됨</p>
                <p className="text-2xl font-bold text-green-500">{stats.confirmed}</p>
              </div>
              <div className="text-3xl text-green-400">✅</div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">완료됨</p>
                <p className="text-2xl font-bold text-purple-500">{stats.completed}</p>
              </div>
              <div className="text-3xl text-purple-400">🏁</div>
            </div>
          </div>
        </div>

        {/* 빠른 액션 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
               onClick={() => router.push('/customer/reservations/new')}>
            <div className="text-center">
              <div className="text-4xl mb-4">➕</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">새 예약</h3>
              <p className="text-gray-600 text-sm">새로운 예약을 신청하세요</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
               onClick={() => router.push('/customer/reservations')}>
            <div className="text-center">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">예약 목록</h3>
              <p className="text-gray-600 text-sm">내 예약을 확인하세요</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
               onClick={() => router.push('/customer/profile')}>
            <div className="text-center">
              <div className="text-4xl mb-4">👤</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">개인정보</h3>
              <p className="text-gray-600 text-sm">개인정보를 관리하세요</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
               onClick={() => router.push('/customer/payment')}>
            <div className="text-center">
              <div className="text-4xl mb-4">💳</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">결제 관리</h3>
              <p className="text-gray-600 text-sm">결제 정보를 관리하세요</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
               onClick={() => router.push('/customer/schedule')}>
            <div className="text-center">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">여행 일정</h3>
              <p className="text-gray-600 text-sm">예정된 여행을 확인하세요</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
               onClick={() => router.push('/customer/support')}>
            <div className="text-center">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">고객 지원</h3>
              <p className="text-gray-600 text-sm">문의 및 지원을 받으세요</p>
            </div>
          </div>
        </div>

        {/* 최근 예약 */}
        {reservations.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">최근 예약</h2>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="space-y-4">
                {reservations.slice(0, 3).map((reservation: any) => (
                  <div key={reservation.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-gray-800">{reservation.title}</h4>
                      <p className="text-sm text-gray-600">
                        예약일: {new Date(reservation.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        reservation.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        reservation.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {reservation.status === 'confirmed' ? '확정' :
                         reservation.status === 'pending' ? '대기' : reservation.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </AuthWrapper>
  );
}
