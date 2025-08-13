'use client';
import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import Link from 'next/link';

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

  const managerTabs = [
    { id: 'analytics', label: '분석 대시보드', path: '/manager/analytics', icon: '📊' },
    { id: 'quotes', label: '견적 관리', path: '/manager/quotes', icon: '📋' },
    { id: 'reservations', label: '예약 관리', path: '/manager/reservations', icon: '🎫' },
    { id: 'reservation-details', label: '예약상세', path: '/manager/reservation-details', icon: '📝' },
    { id: 'service-tables', label: '서비스별 조회', path: '/manager/service-tables', icon: '🔍' },
    { id: 'payments', label: '결제 관리', path: '/manager/payments', icon: '💳' },
    { id: 'confirmation', label: '예약확인서', path: '/manager/confirmation', icon: '📄' },
    { id: 'customer-send', label: '고객 발송 관리', path: '/customer/send-management', icon: '📧' },
    { id: 'schedule', label: '일정 관리', path: '/manager/schedule', icon: '📅' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 overflow-x-hidden">
      {/* Manager Header */}
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="w-full px-2">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-800 rounded-full flex items-center justify-center text-white text-xl font-bold">
                M
              </div>
              <div>
                <h1 className="text-xl font-bold">매니저 패널</h1>
                <p className="text-blue-200 text-sm">스테이하롱 크루즈</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-blue-200 text-sm">{user?.email} (매니저)</span>
              <Link
                href="/"
                className="px-3 py-2 rounded-md text-sm bg-blue-700 hover:bg-blue-800 transition-colors"
              >
                🏠 메인으로
              </Link>
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-md text-sm bg-blue-700 hover:bg-blue-800 transition-colors"
                title="로그아웃"
              >
                🔒 로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Manager Navigation */}
      <nav className="bg-white shadow border-b border-gray-200">
        <div className="w-full px-2">
          <div className="flex space-x-1 overflow-x-auto">
            {managerTabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.path}
                className={`flex items-center space-x-1 px-2 py-2 text-xs font-medium whitespace-nowrap border-b-2 ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <span className="text-sm">{tab.icon}</span>
                <span>{tab.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="w-full py-4">
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
