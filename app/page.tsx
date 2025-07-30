'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  role: 'guest' | 'member' | 'manager' | 'admin';
  name?: string;
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      
      if (error || !authUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      // 사용자 테이블에서 권한 확인
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, email, role, name')
        .eq('id', authUser.id)
        .single();

      let userRole = 'guest'; // 기본값: 견적자 (users 테이블에 없는 경우)
      
      if (profile) {
        // users 테이블에 등록된 경우 (예약자)
        userRole = profile.role || 'member';
      }

      // 관리자 이메일 강제 설정 (임시)
      if (authUser.email === 'admin@example.com' || authUser.email?.includes('admin')) {
        userRole = 'admin';
      }

      const userProfile: UserProfile = {
        id: authUser.id,
        email: authUser.email,
        role: userRole as 'guest' | 'member' | 'manager' | 'admin',
        name: profile?.name || authUser.email?.split('@')[0] || '사용자'
      };

      setUser(userProfile);
      
      // 권한별 자동 리다이렉트
      if (userRole === 'admin') {
        console.log('🔧 관리자 계정 - 관리자 페이지로 리다이렉트');
        router.push('/admin/quotes');
        return;
      } else if (userRole === 'manager') {
        console.log('📊 매니저 계정 - 매니저 페이지로 리다이렉트');
        router.push('/manager/analytics');
        return;
      } else if (userRole === 'member') {
        console.log('👤 예약자(멤버) 계정 - 마이페이지로 리다이렉트');
        router.push('/mypage');
        return;
      } else {
        console.log('👁️ 견적자(게스트) 계정 - 견적 목록으로 리다이렉트');
        router.push('/mypage/quotes');
        return;
      }
      
    } catch (error) {
      console.error('인증 확인 중 오류:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    router.push('/login');
  };

  const handleSignup = () => {
    router.push('/signup');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              스테이하롱 크루즈 예약 시스템
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              견적 조회 및 예약 관리 서비스
            </p>
          </div>
          <div className="mt-8 space-y-6">
            <div className="flex flex-col space-y-4">
              <button
                onClick={handleLogin}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                로그인
              </button>
              <button
                onClick={handleSignup}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                회원가입
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 사용자가 로그인되어 있으면 권한에 따라 자동 리다이렉트됨
  // 이 부분은 실행되지 않지만 안전장치로 유지
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">환영합니다, {user.name}님!</h1>
        <p className="text-gray-600 mb-4">권한: {user.role}</p>
        <div className="space-x-4">
          {user.role === 'admin' && (
            <button
              onClick={() => router.push('/admin/quotes')}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              관리자 페이지
            </button>
          )}
          {user.role === 'manager' && (
            <button
              onClick={() => router.push('/manager/analytics')}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              매니저 페이지
            </button>
          )}
          {user.role === 'member' && (
            <button
              onClick={() => router.push('/mypage')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              마이페이지
            </button>
          )}
          {user.role === 'guest' && (
            <button
              onClick={() => router.push('/mypage/quotes')}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              견적 목록
            </button>
          )}
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
