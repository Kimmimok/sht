'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import ManagerLayout from '@/components/ManagerLayout';

export default function ManagerAnalyticsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    loadStats();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('🚨 인증 오류:', userError);
        router.push('/login');
        return;
      }

      console.log('✅ 인증된 사용자:', user.email);

      // 매니저/관리자 권한 확인 (선택적)
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userData && !['manager', 'admin'].includes(userData.role)) {
        alert('매니저 권한이 필요합니다.');
        router.push('/');
        return;
      }

      console.log('✅ 권한 확인 완료:', userData?.role || 'guest');
    } catch (error) {
      console.error('🚨 권한 확인 중 오류:', error);
    }
  };

  const loadStats = async () => {
    try {
      console.log('📊 통계 데이터 조회 시작...');

      // 기본 통계 조회 (실제 존재하는 컬럼만 사용)
      const [quotesRes] = await Promise.all([
        supabase
          .from('quote')
          .select('id, status, total_price, created_at')
      ]);

      if (quotesRes.error) {
        console.error('🚨 견적 데이터 조회 오류:', quotesRes.error);
      }

      const quotes = quotesRes.data || [];
      console.log('✅ 조회된 견적 수:', quotes.length);

      // Reservation 테이블은 존재하지 않을 수 있으므로 시도만 하고 에러 무시
      let reservations: any[] = [];
      try {
        const reservationsRes = await supabase
          .from('reservation')
          .select('id, status, total_amount, created_at');

        if (!reservationsRes.error) {
          reservations = reservationsRes.data || [];
          console.log('✅ 조회된 예약 수:', reservations.length);
        }
      } catch (error) {
        console.warn('⚠️ Reservation 테이블 조회 실패 (테이블이 없을 수 있음)');
      }

      setStats({
        quotes: {
          total: quotes.length,
          approved: quotes.filter(q => q.status === 'approved').length,
          pending: quotes.filter(q => q.status === 'pending').length,
          draft: quotes.filter(q => q.status === 'draft').length,
          rejected: quotes.filter(q => q.status === 'rejected').length
        },
        reservations: {
          total: reservations.length,
          confirmed: reservations.filter(r => r.status === 'confirmed').length,
          pending: reservations.filter(r => r.status === 'pending').length
        }
      });

    } catch (error) {
      console.error('🚨 통계 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ManagerLayout title="분석 대시보드" activeTab="analytics">
        <div className="flex flex-col justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout title="분석 대시보드" activeTab="analytics">
      <div className="space-y-6">
        {/* 견적 통계 */}
        <div className="bg-white rounded border border-gray-200 p-6">
          <h3 className="text-base font-medium text-gray-800 mb-4">견적 현황</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-800">{stats?.quotes?.total || 0}</div>
              <div className="text-xs text-gray-600">전체 견적</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">{stats?.quotes?.approved || 0}</div>
              <div className="text-xs text-gray-600">승인됨</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-yellow-600">{stats?.quotes?.pending || 0}</div>
              <div className="text-xs text-gray-600">검토 대기</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-600">{stats?.quotes?.draft || 0}</div>
              <div className="text-xs text-gray-600">작성 중</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-red-600">{stats?.quotes?.rejected || 0}</div>
              <div className="text-xs text-gray-600">거부됨</div>
            </div>
          </div>
        </div>

        {/* 예약 통계 (선택적) */}
        {stats?.reservations && (
          <div className="bg-white rounded border border-gray-200 p-6">
            <h3 className="text-base font-medium text-gray-800 mb-4">예약 현황</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-gray-800">{stats.reservations.total || 0}</div>
                <div className="text-xs text-gray-600">전체 예약</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">{stats.reservations.confirmed || 0}</div>
                <div className="text-xs text-gray-600">확정됨</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-yellow-600">{stats.reservations.pending || 0}</div>
                <div className="text-xs text-gray-600">대기 중</div>
              </div>
            </div>
          </div>
        )}

        {/* 빠른 액세스 */}
        <div className="bg-white rounded border border-gray-200 p-6">
          <h3 className="text-base font-medium text-gray-800 mb-4">빠른 액세스</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => router.push('/manager/quotes?filter=pending')}
              className="bg-yellow-50 text-yellow-600 p-4 rounded border hover:bg-yellow-100 text-center"
            >
              <div className="text-lg mb-2">📋</div>
              <div className="text-sm">검토 대기 견적</div>
              <div className="text-xs text-yellow-500 mt-1">
                {stats?.quotes?.pending || 0}건
              </div>
            </button>
            <button
              onClick={() => router.push('/manager/quotes?filter=approved')}
              className="bg-green-50 text-green-600 p-4 rounded border hover:bg-green-100 text-center"
            >
              <div className="text-lg mb-2">✅</div>
              <div className="text-sm">승인된 견적</div>
              <div className="text-xs text-green-500 mt-1">
                {stats?.quotes?.approved || 0}건
              </div>
            </button>
            <button
              onClick={() => router.push('/manager/quotes')}
              className="bg-blue-50 text-blue-600 p-4 rounded border hover:bg-blue-100 text-center"
            >
              <div className="text-lg mb-2">📊</div>
              <div className="text-sm">전체 견적</div>
              <div className="text-xs text-blue-500 mt-1">
                {stats?.quotes?.total || 0}건
              </div>
            </button>
            <button
              onClick={() => router.push('/admin/base-prices')}
              className="bg-purple-50 text-purple-600 p-4 rounded border hover:bg-purple-100 text-center"
            >
              <div className="text-lg mb-2">💰</div>
              <div className="text-sm">가격 관리</div>
              <div className="text-xs text-purple-500 mt-1">
                베이스 가격
              </div>
            </button>
          </div>
        </div>

        {/* 새로고침 버튼 */}
        <div className="flex justify-center">
          <button
            onClick={loadStats}
            disabled={loading}
            className="bg-blue-50 text-blue-600 px-4 py-2 rounded border hover:bg-blue-100 disabled:opacity-50"
          >
            {loading ? '새로고침 중...' : '데이터 새로고침'}
          </button>
        </div>
      </div>
    </ManagerLayout>
  );
}
