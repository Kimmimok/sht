'use client';
import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import Link from 'next/link';
import SecurityProvider from './SecurityProvider';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  activeTab?: string;
}

export default function AdminLayout({ children, title, activeTab }: AdminLayoutProps) {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }

      setUser(data.user);

      // 관리자 권한 확인
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (userData?.role !== 'admin') {
        alert('관리자 권한이 필요합니다.');
        router.push('/');
        return;
      }

      setUserRole(userData.role);
      setIsLoading(false);
    };

    checkAdmin();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚙️</div>
          <p>관리자 권한 확인 중...</p>
        </div>
      </div>
    );
  }

  const adminTabs = [
    { id: 'dashboard', label: '대시보드', path: '/admin', icon: '📊' },
    { id: 'quotes', label: '견적 관리', path: '/admin/quotes', icon: '📋' },
    { id: 'reservations', label: '예약 관리', path: '/admin/reservations', icon: '🎫' },
    { id: 'users', label: '사용자 관리', path: '/admin/users', icon: '👥' },
    { id: 'base-prices', label: '베이스 가격 관리', path: '/admin/base-prices', icon: '💰' },
    { id: 'customer-send', label: '고객 발송 관리', path: '/customer/send-management', icon: '📧' },
    { id: 'sql-runner', label: 'SQL 실행', path: '/admin/sql-runner', icon: '⚡' },
    { id: 'database', label: 'DB 관리', path: '/admin/database', icon: '🔧' },
    { id: 'reports', label: '리포트', path: '/admin/reports', icon: '📈' },
    { id: 'settings', label: '설정', path: '/admin/settings', icon: '⚙️' },
  ];

  return (
    <SecurityProvider>
      <div className="min-h-screen bg-gray-100">
        {/* Admin Header */}
        <header className="sticky top-0 z-50 bg-red-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-red-800 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  A
                </div>
                <div>
                  <h1 className="text-xl font-bold">관리자 패널</h1>
                  <p className="text-red-200 text-sm">스테이하롱 크루즈</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-red-200 text-sm">{user?.email} (관리자)</span>
                <Link
                  href="/"
                  className="px-3 py-2 rounded-md text-sm bg-red-700 hover:bg-red-800 transition-colors"
                >
                  🏠 메인으로
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Admin Navigation */}
        <nav className="sticky top-16 z-40 bg-white shadow border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8 overflow-x-auto">
              {adminTabs.map((tab) => (
                <Link
                  key={tab.id}
                  href={tab.path}
                  className={`flex items-center space-x-2 px-4 py-4 text-sm font-medium whitespace-nowrap border-b-2 ${activeTab === tab.id
                    ? 'border-red-500 text-red-600'
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
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-6">
          {title && (
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            </div>
          )}
          {children}
        </main>
      </div>
    </SecurityProvider>
  );
}
