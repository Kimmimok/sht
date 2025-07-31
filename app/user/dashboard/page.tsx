'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import { AuthWrapper } from '@/components/AuthWrapper';

export default function QuoteUserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    submitted: 0,
    approved: 0
  });

  useEffect(() => {
    loadUserAndStats();
  }, []);

  const loadUserAndStats = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // 견적 통계 조회
      const { data: quotes } = await supabase
        .from('quote')
        .select('status')
        .eq('user_id', user.id);

      if (quotes) {
        setStats({
          total: quotes.length,
          draft: quotes.filter((q: any) => q.status === 'draft').length,
          submitted: quotes.filter((q: any) => q.status === 'submitted').length,
          approved: quotes.filter((q: any) => q.status === 'approved').length
        });
      }
    } catch (error) {
      console.error('데이터 로드 오류:', error);
    }
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-blue-200 via-purple-200 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            📝 견적자 대시보드
          </h1>
          <p className="text-lg text-gray-600">
            안녕하세요, {user?.email}님! 견적 작성 및 관리를 시작하세요.
          </p>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">전체 견적</p>
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <div className="text-3xl text-blue-500">📋</div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">작성 중</p>
                <p className="text-2xl font-bold text-gray-600">{stats.draft}</p>
              </div>
              <div className="text-3xl text-gray-500">✏️</div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">제출됨</p>
                <p className="text-2xl font-bold text-orange-600">{stats.submitted}</p>
              </div>
              <div className="text-3xl text-orange-500">📤</div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">승인됨</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <div className="text-3xl text-green-500">✅</div>
            </div>
          </div>
        </div>

        {/* 빠른 액션 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
               onClick={() => router.push('/mypage/quotes/new')}>
            <div className="text-center">
              <div className="text-4xl mb-4">➕</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">새 견적 작성</h3>
              <p className="text-gray-600 text-sm">새로운 여행 견적을 작성하세요</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
               onClick={() => router.push('/mypage/quotes')}>
            <div className="text-center">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">내 견적 목록</h3>
              <p className="text-gray-600 text-sm">작성한 견적들을 확인하세요</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
               onClick={() => router.push('/mypage/quotes/processing')}>
            <div className="text-center">
              <div className="text-4xl mb-4">🔄</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">처리 중 견적</h3>
              <p className="text-gray-600 text-sm">검토 중인 견적을 확인하세요</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
               onClick={() => router.push('/mypage/quotes/confirmed')}>
            <div className="text-center">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">확정 견적</h3>
              <p className="text-gray-600 text-sm">승인된 견적을 확인하세요</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
               onClick={() => router.push('/user/profile')}>
            <div className="text-center">
              <div className="text-4xl mb-4">👤</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">프로필 관리</h3>
              <p className="text-gray-600 text-sm">개인정보를 관리하세요</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
               onClick={() => router.push('/user/help')}>
            <div className="text-center">
              <div className="text-4xl mb-4">❓</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">도움말</h3>
              <p className="text-gray-600 text-sm">사용법을 확인하세요</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </AuthWrapper>
  );
}
