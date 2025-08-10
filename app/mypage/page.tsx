'use client';
import React from 'react';
import PageWrapper from '../../components/PageWrapper';
import SectionBox from '../../components/SectionBox';
import Link from 'next/link';

export default function MyPage() {
  const quickActions = [
    { icon: '📝', label: '새 견적', href: '/mypage/quotes/new' },
    { icon: '📋', label: '견적 목록', href: '/mypage/quotes' },
    { icon: '✅', label: '확정 예약', href: '/mypage/quotes/confirmed' },

    { icon: '📜', label: '예약 목록', href: '/mypage/reservations/list' },
    { icon: '💳', label: '결제하기', href: '/mypage/payments' },
    { icon: '📄', label: '예약확인서', href: '/mypage/confirmations' },
  ];

  return (
    <PageWrapper title="마이페이지">
      <SectionBox title="원하는 서비스를 선택하세요">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-6">
          {quickActions.map((action, index) => (
            <Link key={index} href={action.href} className="group">
              <div className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-blue-50 border border-gray-200 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative p-6 text-center">
                  <div className="text-3xl mb-3 transform group-hover:scale-110 transition-transform duration-300">
                    {action.icon}
                  </div>
                  <div className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors duration-300">
                    {action.label}
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
              </div>
            </Link>
          ))}
        </div>
      </SectionBox>
    </PageWrapper>
  );
}
