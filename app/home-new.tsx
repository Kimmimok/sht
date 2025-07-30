'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  role: 'guest' | 'customer' | 'manager' | 'admin' | null;
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

      // 사용자 테이블에서 권한 확인 (견적자는 테이블에 없으므로 기본 guest)
      const { data: profile } = await supabase
        .from('users')
        .select('id, email, role, name')
        .eq('id', authUser.id)
        .single();

      setUser({
        id: authUser.id,
        email: authUser.email || '',
        role: profile?.role || 'guest', // 테이블에 없으면 견적자(guest)
        name: profile?.name
      });
    } catch (error) {
      console.error('인증 확인 오류:', error);
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
    router.refresh();
  };

  // 권한별 메뉴 정의
  const getMenusByRole = (role: string | null) => {
    const baseMenus = [
      {
        title: '견적 서비스',
        description: '여행 견적을 작성하고 관리하세요',
        icon: '📋',
        color: 'from-blue-500 to-sky-500',
        items: [
          { name: '새 견적 작성', path: '/mypage/quotes/new', icon: '➕' },
          { name: '내 견적 목록', path: '/mypage/quotes', icon: '📋' },
          { name: '처리 중 견적', path: '/mypage/quotes/processing', icon: '🔄' },
          { name: '확정 견적', path: '/mypage/quotes/confirmed', icon: '✅' },
        ]
      }
    ];

    if (!role || role === 'guest') {
      return baseMenus;
    }

    const customerMenus = [
      ...baseMenus,
      {
        title: '예약 서비스',
        description: '예약을 신청하고 관리하세요',
        icon: '🎫',
        color: 'from-green-500 to-emerald-500',
        items: [
          { name: '새 예약 신청', path: '/customer/reservations/new', icon: '➕' },
          { name: '예약 목록', path: '/customer/reservations', icon: '🎫' },
          { name: '개인정보 관리', path: '/customer/profile', icon: '👤' },
          { name: '결제 관리', path: '/customer/payment', icon: '💳' },
          { name: '여행 일정', path: '/customer/schedule', icon: '📅' },
        ]
      }
    ];

    if (role === 'customer') {
      return customerMenus;
    }

    const managerMenus = [
      ...customerMenus,
      {
        title: '매니저 관리',
        description: '견적 및 예약을 관리하세요',
        icon: '📊',
        color: 'from-purple-500 to-indigo-500',
        items: [
          { name: '견적 관리', path: '/manager/quotes', icon: '📋' },
          { name: '예약 관리', path: '/manager/reservations', icon: '🎫' },
          { name: '고객 관리', path: '/manager/customers', icon: '👥' },
          { name: '통계 분석', path: '/manager/analytics', icon: '📊' },
          { name: '서비스 관리', path: '/manager/services', icon: '🛎️' },
          { name: '가격 관리', path: '/manager/pricing', icon: '💰' },
        ]
      }
    ];

    if (role === 'manager') {
      return managerMenus;
    }

    if (role === 'admin') {
      return [
        ...managerMenus,
        {
          title: '시스템 관리',
          description: '전체 시스템을 관리하세요',
          icon: '⚙️',
          color: 'from-red-500 to-pink-500',
          items: [
            { name: '사용자 관리', path: '/admin/users', icon: '👥' },
            { name: '권한 관리', path: '/admin/permissions', icon: '🔐' },
            { name: '시스템 설정', path: '/admin/settings', icon: '⚙️' },
            { name: '데이터베이스', path: '/admin/database', icon: '🗄️' },
            { name: '로그 관리', path: '/admin/logs', icon: '📋' },
            { name: '백업/복원', path: '/admin/backup', icon: '💾' },
          ]
        }
      ];
    }

    return baseMenus;
  };

  const getRoleName = (role: string | null) => {
    const roleNames: { [key: string]: string } = {
      'guest': '견적자',
      'customer': '예약자',
      'manager': '매니저',
      'admin': '관리자'
    };
    return roleNames[role || 'guest'] || '견적자';
  };

  const getDashboardPath = (role: string | null) => {
    switch (role) {
      case 'customer': return '/customer/dashboard';
      case 'manager': return '/manager/dashboard';
      case 'admin': return '/admin/dashboard';
      default: return '/user/dashboard';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  const menus = getMenusByRole(user?.role || null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-4">
              🚢 스테이하롱 크루즈
            </h1>
            <p className="text-xl opacity-90 mb-6">
              하롱베이에서 최고의 크루즈 여행을 경험하세요
            </p>
            
            {user ? (
              <div className="flex items-center justify-center space-x-4 flex-wrap">
                <div className="bg-white/20 backdrop-blur rounded-lg px-6 py-3">
                  <p className="text-sm opacity-80">안녕하세요!</p>
                  <p className="font-semibold">
                    {user.name || user.email} ({getRoleName(user.role)})
                  </p>
                </div>
                <button
                  onClick={() => router.push(getDashboardPath(user.role))}
                  className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  📊 대시보드
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <div className="flex justify-center space-x-4 flex-wrap">
                <button
                  onClick={handleLogin}
                  className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  로그인
                </button>
                <button
                  onClick={handleSignup}
                  className="bg-green-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors"
                >
                  회원가입
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 서비스 소개 */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            🌟 프리미엄 서비스
          </h2>
          <p className="text-lg text-gray-600">
            견적부터 예약까지, 완벽한 여행 경험을 제공합니다
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🚢</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">럭셔리 크루즈</h3>
            <p className="text-gray-600">
              하롱베이의 아름다운 경치를 감상하며 최고급 크루즈에서의 특별한 경험
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🏨</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">프리미엄 숙박</h3>
            <p className="text-gray-600">
              엄선된 최고급 호텔에서 편안한 휴식과 완벽한 서비스를 경험하세요
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">맞춤 투어</h3>
            <p className="text-gray-600">
              전문 가이드와 함께하는 개인 맞춤형 투어로 잊지 못할 추억을 만드세요
            </p>
          </div>
        </div>

        {/* 권한별 메뉴 */}
        {user && (
          <div className="space-y-12">
            {menus.map((menu, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-8">
                <div className="flex items-center mb-6">
                  <div className="text-4xl mr-4">{menu.icon}</div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">{menu.title}</h3>
                    <p className="text-gray-600">{menu.description}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {menu.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      onClick={() => router.push(item.path)}
                      className={`bg-gradient-to-r ${menu.color} text-white p-4 rounded-lg cursor-pointer hover:scale-105 transition-transform`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{item.icon}</span>
                        <span className="font-semibold">{item.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 비로그인 사용자용 안내 */}
        {!user && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-6">🎯</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              지금 시작하세요!
            </h3>
            <p className="text-lg text-gray-600 mb-8">
              로그인하여 견적 작성부터 예약까지 모든 서비스를 이용하세요
            </p>
            <div className="flex justify-center space-x-4 flex-wrap">
              <button
                onClick={() => router.push('/mypage/quotes/new')}
                className="bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors mb-2"
              >
                📋 견적 작성하기
              </button>
              <button
                onClick={handleLogin}
                className="bg-green-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors mb-2"
              >
                🎫 예약 서비스 이용하기
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 하단 정보 */}
      <div className="bg-gray-800 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-xl font-bold mb-4">🏢 회사 정보</h4>
              <p className="text-gray-300 leading-relaxed">
                스테이하롱 크루즈는 하롱베이에서 20년 이상의 경험을 가진
                현지 전문 여행사입니다. 안전하고 품질 높은 서비스를 제공합니다.
              </p>
            </div>
            
            <div>
              <h4 className="text-xl font-bold mb-4">📞 연락처</h4>
              <div className="text-gray-300 space-y-2">
                <p>📧 info@stayhalong.com</p>
                <p>📱 +84 123 456 7890</p>
                <p>🕒 운영시간: 24시간 연중무휴</p>
              </div>
            </div>
            
            <div>
              <h4 className="text-xl font-bold mb-4">🌟 특별 혜택</h4>
              <div className="text-gray-300 space-y-2">
                <p>✅ 네이버 카페 회원 특가</p>
                <p>🛡️ 100% 안전 보장</p>
                <p>🔄 무료 일정 변경</p>
                <p>💎 프리미엄 서비스</p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center">
            <p className="text-gray-400">
              © 2024 스테이하롱 크루즈. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
