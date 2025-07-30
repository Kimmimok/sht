'use client';
import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface ManagerLayoutProps {
  children: React.ReactNode;
  title: string;
  activeTab: string;
}

export default function ManagerLayout({ children, title, activeTab }: ManagerLayoutProps) {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkManager = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }

      setUser(user);

      // 매니저 권한 확인
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!userData?.role || (userData.role !== 'manager' && userData.role !== 'admin')) {
        alert('매니저 권한이 필요합니다.');
        router.push('/');
        return;
      }

      setUserRole(userData.role);
      setIsLoading(false);
    };

    checkManager();
  }, [router]);

  const managerTabs = [
    { id: 'analytics', label: '분석 관리', path: '/manager/analytics', icon: '📊' },
    { id: 'reservations', label: '예약 서비스', path: '/manager/reservations', icon: '🎫' },
    { id: 'payments', label: '결제 관리', path: '/manager/payments', icon: '💳' },
    { id: 'schedule', label: '예약 일정', path: '/manager/schedule', icon: '📅' },
    { id: 'privacy', label: '개인정보', path: '/manager/privacy', icon: '🔒' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p>권한 확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Manager Header */}
      <header className="bg-green-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-800 rounded-full flex items-center justify-center text-white text-xl font-bold">
                M
              </div>
              <div>
                <h1 className="text-xl font-bold">매니저 패널</h1>
                <p className="text-green-200 text-sm">스테이하롱 크루즈</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-green-200 text-sm">{user?.email} (매니저)</span>
              <Link
                href="/"
                className="px-3 py-2 rounded-md text-sm bg-green-700 hover:bg-green-800 transition-colors"
              >
                🏠 메인으로
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Manager Navigation */}
      <nav className="bg-white shadow border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {managerTabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.path}
                className={`flex items-center space-x-2 px-4 py-4 text-sm font-medium whitespace-nowrap border-b-2 ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        </div>
        {children}
      </main>
    </div>
  );
}