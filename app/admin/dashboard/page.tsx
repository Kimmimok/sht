'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AuthWrapper } from '@/components/AuthWrapper';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [systemStats, setSystemStats] = useState({
    users: { total: 0, admins: 0, managers: 0, members: 0, guests: 0 },
    system: { uptime: '99.9%', storage: '45%', performance: 'Good' },
    activity: { logins: 0, quotes: 0, reservations: 0, errors: 0 }
  });

  useEffect(() => {
    checkAdminAuth();
    loadSystemStats();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push('/login');
        return;
      }

      // 관리자 권한 확인
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        alert('관리자 권한이 필요합니다.');
        router.push('/');
        return;
      }

      setUser(user);
    } catch (error) {
      console.error('권한 확인 오류:', error);
      router.push('/login');
    }
  };

  const loadSystemStats = async () => {
    try {
      // 사용자 통계
      const { data: users } = await supabase
        .from('users')
        .select('role, created_at, last_sign_in_at');

      if (users) {
        const userStats = {
          total: users.length,
          admins: users.filter((u: any) => u.role === 'admin').length,
          managers: users.filter((u: any) => u.role === 'manager').length,
          members: users.filter((u: any) => u.role === 'member').length,
          guests: users.filter((u: any) => !u.role || u.role === 'guest').length
        };

        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        const activityStats = {
          logins: users.filter((u: any) => 
            u.last_sign_in_at && new Date(u.last_sign_in_at) >= todayStart
          ).length,
          quotes: 0, // 실제로는 quote 테이블에서 조회
          reservations: 0, // 실제로는 reservation 테이블에서 조회
          errors: 0 // 실제로는 error_log 테이블에서 조회
        };

        setSystemStats(prev => ({ 
          ...prev, 
          users: userStats, 
          activity: activityStats 
        }));
      }
    } catch (error) {
      console.error('시스템 통계 로드 오류:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500"></div>
          <p className="mt-4 text-gray-600">권한을 확인하는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthWrapper requiredRole="admin">
      <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-red-100 via-pink-100 to-purple-100">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            ⚙️ 관리자 대시보드
          </h1>
          <p className="text-lg text-gray-600">
            시스템 전체 관리 및 모니터링
          </p>
        </div>
      </div>

      {/* 시스템 상태 */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🖥️ 시스템 상태</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">시스템 가동률</p>
                  <p className="text-2xl font-bold text-green-500">{systemStats.system.uptime}</p>
                </div>
                <div className="text-3xl text-green-400">✅</div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">저장소 사용률</p>
                  <p className="text-2xl font-bold text-blue-500">{systemStats.system.storage}</p>
                </div>
                <div className="text-3xl text-blue-400">💾</div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">성능 상태</p>
                  <p className="text-2xl font-bold text-purple-500">{systemStats.system.performance}</p>
                </div>
                <div className="text-3xl text-purple-400">⚡</div>
              </div>
            </div>
          </div>
        </div>

        {/* 사용자 통계 */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">👥 사용자 통계</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">전체 사용자</p>
                  <p className="text-2xl font-bold text-blue-500">{systemStats.users.total}</p>
                </div>
                <div className="text-3xl text-blue-400">👥</div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">관리자</p>
                  <p className="text-2xl font-bold text-red-500">{systemStats.users.admins}</p>
                </div>
                <div className="text-3xl text-red-400">⚙️</div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">매니저</p>
                  <p className="text-2xl font-bold text-purple-500">{systemStats.users.managers}</p>
                </div>
                <div className="text-3xl text-purple-400">📊</div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">회원</p>
                  <p className="text-2xl font-bold text-green-500">{systemStats.users.members}</p>
                </div>
                <div className="text-3xl text-green-400">🎫</div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">게스트</p>
                  <p className="text-2xl font-bold text-gray-500">{systemStats.users.guests}</p>
                </div>
                <div className="text-3xl text-gray-500">👤</div>
              </div>
            </div>
          </div>
        </div>

        {/* 관리자 메뉴 */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🛠️ 시스템 관리</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
                 onClick={() => router.push('/admin/users')}>
              <div className="text-center">
                <div className="text-4xl mb-4">👥</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">사용자 관리</h3>
                <p className="text-gray-600 text-sm">권한 및 계정 관리</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
                 onClick={() => router.push('/admin/database')}>
              <div className="text-center">
                <div className="text-4xl mb-4">🗄️</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">데이터베이스</h3>
                <p className="text-gray-600 text-sm">DB 관리 및 백업</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
                 onClick={() => router.push('/admin/settings')}>
              <div className="text-center">
                <div className="text-4xl mb-4">⚙️</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">시스템 설정</h3>
                <p className="text-gray-600 text-sm">전역 설정 관리</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
                 onClick={() => router.push('/admin/logs')}>
              <div className="text-center">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">로그 관리</h3>
                <p className="text-gray-600 text-sm">시스템 로그 및 감사</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
                 onClick={() => router.push('/admin/monitoring')}>
              <div className="text-center">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">모니터링</h3>
                <p className="text-gray-600 text-sm">실시간 시스템 모니터링</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
                 onClick={() => router.push('/admin/security')}>
              <div className="text-center">
                <div className="text-4xl mb-4">🔒</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">보안 관리</h3>
                <p className="text-gray-600 text-sm">보안 정책 및 감시</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
                 onClick={() => router.push('/admin/backup')}>
              <div className="text-center">
                <div className="text-4xl mb-4">💾</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">백업/복원</h3>
                <p className="text-gray-600 text-sm">데이터 백업 및 복원</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
                 onClick={() => router.push('/admin/maintenance')}>
              <div className="text-center">
                <div className="text-4xl mb-4">🔧</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">유지보수</h3>
                <p className="text-gray-600 text-sm">시스템 유지보수 도구</p>
              </div>
            </div>
          </div>
        </div>

        {/* 오늘의 활동 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">📈 오늘의 활동</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl text-blue-500 mb-2">👤</div>
              <p className="text-gray-600 text-sm">로그인</p>
              <p className="text-xl font-bold text-blue-600">{systemStats.activity.logins}</p>
            </div>
            <div className="text-center">
              <div className="text-3xl text-green-500 mb-2">📋</div>
              <p className="text-gray-600 text-sm">새 견적</p>
              <p className="text-xl font-bold text-green-600">{systemStats.activity.quotes}</p>
            </div>
            <div className="text-center">
              <div className="text-3xl text-purple-500 mb-2">🎫</div>
              <p className="text-gray-600 text-sm">새 예약</p>
              <p className="text-xl font-bold text-purple-600">{systemStats.activity.reservations}</p>
            </div>
            <div className="text-center">
              <div className="text-3xl text-red-500 mb-2">⚠️</div>
              <p className="text-gray-600 text-sm">오류</p>
              <p className="text-xl font-bold text-red-600">{systemStats.activity.errors}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </AuthWrapper>
  );
}
