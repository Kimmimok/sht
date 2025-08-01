'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

// 메뉴 정의
const menuList = [
  { key: 'cruise', label: '🚢 크루즈', path: '/mypage/quotes/cruise', description: '럭셔리 크루즈 여행을 예약하세요' },
  { key: 'airport', label: '✈️ 공항', path: '/mypage/quotes/airport', description: '공항 픽업 및 항공 서비스' },
  { key: 'hotel', label: '🏨 호텔', path: '/mypage/quotes/hotel', description: '최고급 호텔에서 편안한 휴식' },
  { key: 'tour', label: '🗺️ 투어', path: '/mypage/quotes/tour', description: '전문 가이드와 함께하는 맞춤 투어' },
  { key: 'rentcar', label: '🚗 렌트카', path: '/mypage/quotes/rentcar', description: '자유로운 여행을 위한 렌트카' }
];

export default function QuoteManagementPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 메인 그라데이션 헤더 */}
      <div className="bg-gradient-to-br from-blue-200 via-purple-200 to-indigo-100 text-gray-900">
        <div className="container mx-auto px-4 py-12">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">📝 견적 신청</h1>
              <p className="text-lg opacity-90">원하는 서비스를 선택해서<br /> 견적을 신청하세요</p>
            </div>
            <button 
            onClick={() => router.push('/mypage/quotes/new')}  
            className="bg-white/60 hover:bg-white/80 px-6 py-3 rounded-lg transition-colors backdrop-blur text-gray-800"
            >
              🏠 홈
            </button>
          </div>
          
          <div className="bg-white/70 backdrop-blur rounded-xl shadow-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <h3 className="text-xl font-semibold mb-2">✨ 맞춤 서비스</h3>
                <p className="text-sm opacity-75">고객님의 요구에 맞는 완벽한 여행 서비스</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">💰 최저가 보장</h3>
                <p className="text-sm opacity-75">합리적인 가격으로 프리미엄 서비스 제공</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">🎯 전문 상담</h3>
                <p className="text-sm opacity-75">여행 전문가의 1:1 맞춤 상담 서비스</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 서비스 메뉴 그리드 */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuList.map((menu, index) => (
            <div
              key={menu.key}
              className="group bg-white/80 rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 overflow-hidden cursor-pointer border border-gray-200"
              onClick={() => router.push(menu.path)}
              style={{
                animationDelay: `${index * 100}ms`,
                animation: 'fadeInUp 0.6s ease-out forwards'
              }}
            >
              <div className={`h-20 bg-gradient-to-br ${getGradientClass(menu.key, true)} flex items-center justify-center`}>
                <span className="text-4xl">{menu.label.split(' ')[0]}</span>
              </div>
              <div className="p-2">
                <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-blue-500 transition-colors">
                  {menu.label}
                </h3>
                <p className="text-gray-700 text-sm mb-3 leading-relaxed">
                  {menu.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-blue-400 font-semibold text-xs">견적 신청하기</span>
                  <span className="text-blue-400 group-hover:transform group-hover:translate-x-1 transition-transform text-base">
                    →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 하단 추가 정보 */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">🎉 특별 혜택</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-700 mb-2">� 빠른 답변 상담</h3>
                <p className="text-sm text-gray-600">언제든지 전문 상담사와 상담 가능</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-700 mb-2">💎 회동 특가</h3>
                <p className="text-sm text-gray-600">회원님만을 위한 특별 할인 혜택</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="font-semibold text-purple-700 mb-2">🛡️ 안전 보장</h3>
                <p className="text-sm text-gray-600">하롱현지 유일한 한국인 여행사 서비스로 빠른대처</p>
              </div>
            </div>
          </div>
        </div>

        {/* 기존 견적 확인 버튼 */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/mypage/quotes')}
            className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-8 py-3 rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-lg"
          >
            📋 기존 견적 목록 보기
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

// 각 서비스별 그라데이션 클래스
function getGradientClass(key: string, light?: boolean): string {
  // 밝은 색상용 그라데이션
  const gradientsLight = {
    cruise: 'from-blue-100 to-purple-100',
    vehicle: 'from-green-100 to-teal-100',
    airport: 'from-sky-100 to-blue-100',
    hotel: 'from-pink-100 to-rose-100',
    tour: 'from-orange-100 to-amber-100',
    rentcar: 'from-red-100 to-rose-100'
  };
  // 기존 진한 색상
  const gradientsDark = {
    cruise: 'from-blue-500 to-purple-600',
    vehicle: 'from-green-500 to-teal-600',
    airport: 'from-sky-500 to-blue-600',
    hotel: 'from-pink-500 to-rose-600',
    tour: 'from-orange-500 to-amber-600',
    rentcar: 'from-red-500 to-rose-600'
  };
  if (light) {
    return gradientsLight[key as keyof typeof gradientsLight] || 'from-gray-100 to-gray-200';
  }
  return gradientsDark[key as keyof typeof gradientsDark] || 'from-gray-500 to-gray-600';
}

