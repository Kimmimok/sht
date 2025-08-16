'use client';
import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import ManagerSidebar from './ManagerSidebar';

interface ManagerLayoutProps {
  children: React.ReactNode;
  title?: string;
  activeTab?: string;
}

export default function ManagerLayout({ children, title, activeTab }: ManagerLayoutProps) {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkManager = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }

      setUser(data.user);

      // 매니저/관리자 권한 확인
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (!userData || !['manager', 'admin'].includes(userData.role)) {
        alert('매니저 권한이 필요합니다.');
        router.push('/');
        return;
      }

      setUserRole(userData.role);
      setIsLoading(false);
    };

    checkManager();
  }, [router]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('로그아웃 처리 중 경고:', e);
    } finally {
      router.push('/login');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚙️</div>
          <p>매니저 권한 확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex bg-gray-100 overflow-hidden">
      {/* 좌측 사이드바 */}
      <ManagerSidebar
        activeTab={activeTab}
        userEmail={user?.email}
        onLogout={handleLogout}
      />
      {/* 우측 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 상단 바 (선택적 타이틀) */}
        <div className="h-16 flex items-center px-4 border-b border-gray-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:backdrop-blur-sm sticky top-0 z-30">
          {title && <h1 className="text-lg font-semibold text-gray-800 truncate">{title}</h1>}
        </div>
        <main className="flex-1 overflow-y-auto px-4 py-6">
          {children}
          <div className="h-10" />
        </main>
      </div>
    </div>
  );
}
