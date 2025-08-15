'use client';
import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import ManagerHeader from './ManagerHeader';
import ManagerNav from './ManagerNav';

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
    <div className="min-h-screen bg-gray-100 overflow-x-hidden">
      <ManagerHeader user={user} />
      <ManagerNav activeTab={activeTab} />

      {/* Main Content */}
      <main className="w-full py-4 pt-6">
        <div className="px-2 md:px-4 lg:px-6">
          {title && (
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
