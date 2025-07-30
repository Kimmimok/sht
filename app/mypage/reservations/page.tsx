'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { createQuote, getQuoteWithItems } from '@/lib/quoteUtils';
import { Quote } from '@/lib/types';

// 예약 메뉴 정의 - 예약 홈으로 연결
const menuList = [
  { key: 'cruise', label: '🚢 크루즈 예약', pathTemplate: '/mypage/reservations', description: '럭셔리 크루즈 여행 예약' },
  { key: 'airport', label: '✈️ 공항 예약', pathTemplate: '/mypage/reservations', description: '공항 픽업 및 항공 서비스 예약' },
  { key: 'hotel', label: '🏨 호텔 예약', pathTemplate: '/mypage/reservations', description: '최고급 호텔 숙박 예약' },
  { key: 'tour', label: '🗺️ 투어 예약', pathTemplate: '/mypage/reservations', description: '전문 가이드와 함께하는 맞춤 투어' },
  { key: 'rentcar', label: '🚗 렌트카 예약', pathTemplate: '/mypage/reservations', description: '자유로운 여행을 위한 렌트카' },
  { key: 'vehicle', label: '🚌 차량 예약', pathTemplate: '/mypage/reservations', description: '크루즈 전용 셔틀 차량 서비스' }
];

export default function ReservationHomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingQuoteId = searchParams.get('quoteId');

  const [loading, setLoading] = useState(false);
  const [quoteId, setQuoteId] = useState<string | null>(existingQuoteId);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [quoteTitle, setQuoteTitle] = useState('');
  const [showTitleInput, setShowTitleInput] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // 기존 견적 로드 함수
  const loadExistingQuote = async (quoteId: string) => {
    try {
      const quoteData = await getQuoteWithItems(quoteId);
      if (quoteData) {
        setQuote(quoteData);
        setQuoteId(quoteId);
      }
    } catch (error) {
      console.error('견적 로드 오류:', error);
    }
  };

  // 사용자 프로필 로드 함수
  const loadUserProfile = async () => {
    setProfileLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.log('사용자 인증 필요');
        return;
      }

      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      setUserProfile(existingUser);
    } catch (error) {
      console.error('사용자 프로필 로드 오류:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  // 페이지 진입 시 처리
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      loadUserProfile(); // 사용자 프로필 로드
      if (existingQuoteId) {
        // URL에 quoteId가 있으면 해당 견적 로드
        loadExistingQuote(existingQuoteId);
      }
      // 자동 견적 생성 제거
    }
  }, [existingQuoteId, initialized]);

  // 페이지 포커스시 프로필 다시 로드 (프로필 페이지에서 돌아올 때)
  useEffect(() => {
    const handleFocus = () => {
      loadUserProfile();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // 견적 제목 입력 시작
  const handleStartQuoteCreation = () => {
    setShowTitleInput(true);
  };

  // 견적 제목 입력 취소
  const handleCancelTitleInput = () => {
    setShowTitleInput(false);
    setQuoteTitle('');
  };

  // 새로운 견적 생성 (제목과 함께)
  const handleCreateNewQuote = async () => {
    if (!quoteTitle.trim()) {
      alert('견적 제목을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }
      
      const newQuote = await createQuote(user.id, quoteTitle.trim());
      if (newQuote) {
        setQuoteId(newQuote.id);
        setQuote(newQuote);
        setShowTitleInput(false);
        // URL도 업데이트
        router.replace(`/mypage/quotes/new?quoteId=${newQuote.id}`);
      } else {
        alert('견적 생성에 실패했습니다.');
      }
    } catch (e) {
      console.error('견적 생성 오류:', e);
      alert('견적 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 서비스 선택 시 프로필 확인 후 이동
  const handleServiceSelect = (service: typeof menuList[0]) => {
    if (!quoteId && !existingQuoteId) {
      alert('먼저 견적 제목을 입력하고 견적을 생성해주세요!');
      setShowTitleInput(true);
      return;
    }

    // 프로필 확인
    if (!userProfile || !userProfile.name || !userProfile.english_name) {
      alert('먼저 신상정보를 입력해주세요!');
      const currentQuoteId = quoteId || existingQuoteId;
      router.push(`/mypage/reservations/profile?quoteId=${currentQuoteId}`);
      return;
    }
    
    const currentQuoteId = quoteId || existingQuoteId;
    
    // 새로운 서비스 폼 페이지로 이동
    switch (service.key) {
      case 'cruise':
        router.push(`/mypage/reservations/cruise?quoteId=${currentQuoteId}`);
        break;
      case 'hotel':
        router.push(`/mypage/reservations/hotel-new?quoteId=${currentQuoteId}`);
        break;
      case 'rentcar':
        router.push(`/mypage/reservations/rentcar-new?quoteId=${currentQuoteId}`);
        break;
      case 'airport':
        router.push(`/mypage/reservations/airport-new?quoteId=${currentQuoteId}`);
        break;
      case 'tour':
        router.push(`/mypage/reservations/tour-new?quoteId=${currentQuoteId}`);
        break;
      case 'vehicle':
        router.push(`/mypage/reservations/vehicle-new?quoteId=${currentQuoteId}`);
        break;
      default:
        alert('해당 서비스는 준비 중입니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 메인 그라데이션 헤더 */}
      <div className="bg-gradient-to-br from-blue-200 via-purple-200 to-indigo-100 text-gray-900">
        <div className="container mx-auto px-4 py-12">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">🎫 예약 홈</h1>
              <p className="text-lg opacity-90">
                {existingQuoteId ? '견적을 바탕으로 예약을 진행하세요.' : '새로운 견적을 작성하여 예약을 시작하세요.'}
              </p>
              {existingQuoteId && (
                <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                  <p className="text-sm text-blue-800">견적 ID: {existingQuoteId}</p>
                  <p className="text-sm text-blue-700">이 견적을 바탕으로 예약을 진행합니다.</p>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              {/* 견적 확인 버튼 */}
              {(quoteId || existingQuoteId) && (
                <button
                  onClick={() => router.push(`/mypage/quotes/${quoteId || existingQuoteId}/view`)}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  📋 견적 확인
                </button>
              )}
              
              {/* 새로운 견적 버튼 - 기존 견적이 없을 때만 표시 */}
              {!existingQuoteId && !showTitleInput ? (
                <button
                  onClick={handleStartQuoteCreation}
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-400 to-sky-500 text-white px-6 py-3 rounded-lg font-semibold shadow hover:from-blue-500 hover:to-sky-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  ➕ 새 견적 작성
                </button>
              ) : null}
            </div>
          </div>
          
      {/* 견적 상태 표시 */}
      {(quoteId || existingQuoteId) && quote ? (
        <div className="bg-white/70 backdrop-blur rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                ✅ 예약 진행할 견적
              </h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>견적 제목: <span className="font-semibold text-blue-600">{quote.title}</span></p>
                <p>상태: <span className="text-blue-600 font-medium">{quote.status === 'draft' ? '작성 중' : quote.status === 'approved' ? '승인됨' : quote.status}</span></p>
                <p>생성 시간: {new Date(quote.created_at).toLocaleString('ko-KR')}</p>
              </div>
            </div>
            <div className="text-blue-600">
              <p className="text-sm">아래 서비스 중 원하는 항목을 선택하여</p>
              <p className="text-sm">예약을 진행하세요.</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* 신상정보 입력 카드 - 크루즈 예약 위에 표시 */}
      {(existingQuoteId || quoteId) && (
        <div className="bg-white/70 backdrop-blur rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                👤 신상정보 입력
              </h3>
              <div className="text-sm text-gray-600">
                {profileLoading ? (
                  <p>신상정보를 확인하고 있습니다...</p>
                ) : userProfile && userProfile.name && userProfile.english_name ? (
                  <div>
                    <p className="text-green-600 font-medium">✅ 신상정보 입력 완료</p>
                    <p>이름: <span className="font-semibold">{userProfile.name}</span></p>
                    <p>영문이름: <span className="font-semibold">{userProfile.english_name}</span></p>
                    {userProfile.phone_number && (
                      <p>연락처: <span className="font-semibold">{userProfile.phone_number}</span></p>
                    )}
                  </div>
                ) : (
                  <p className="text-red-600">⚠️ 신상정보를 먼저 입력해주세요</p>
                )}
              </div>
            </div>
            <div>
              {!userProfile || !userProfile.name || !userProfile.english_name ? (
                <button
                  onClick={() => router.push(`/mypage/reservations/profile?quoteId=${existingQuoteId || quoteId}`)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  신상정보 입력
                </button>
              ) : (
                <button
                  onClick={() => router.push(`/mypage/reservations/profile?quoteId=${existingQuoteId || quoteId}`)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  정보 수정
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {!existingQuoteId && (
        <div className="bg-white/70 backdrop-blur rounded-lg p-6 mb-6">
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {showTitleInput ? '📝 행복 여행 이름 짓기' : '📝 새 견적을 작성하여 예약을 시작하세요'}
            </h3>
            <p className="text-gray-600 mb-4">
              {showTitleInput
                ? (<><span>행복 여행의 이름을 지어 주세요.<br/>예) "하롱베이 3박4일", "가족여행 패키지", "허니문 크루즈" 등</span></>)
                : (<span>"새 견적 작성" 버튼을 클릭하여 견적을 생성하고, 원하는 서비스를 선택해주세요.</span>)}
            </p>
            <div className="text-blue-600 text-sm">
              {showTitleInput
                ? (<p>💡 제목은 나중에 견적 목록에서 구분하는데 도움이 됩니다</p>)
                : (<p>💡 한 번의 견적에 여러 서비스를 추가하여 예약할 수 있습니다</p>)}
            </div>
          </div>
        </div>
      )}
      
      {/* 견적 제목 입력창과 버튼을 카드 아래에 위치 */}
      {showTitleInput && (
        <div className="flex items-center justify-center gap-2 mb-1">
          <input
            type="text"
            value={quoteTitle}
            onChange={(e) => setQuoteTitle(e.target.value)}
            placeholder="행복 여행 이름 입력하세요 (예: 하롱베이 3박4일)"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
            autoFocus
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCreateNewQuote();
              }
            }}
          />
          <button
            onClick={handleCreateNewQuote}
            disabled={loading || !quoteTitle.trim()}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? '생성 중...' : '생성'}
          </button>
          <button
            onClick={handleCancelTitleInput}
            disabled={loading}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            취소
          </button>
        </div>
      )}
        </div>
      </div>
      {/* 서비스 메뉴 그리드 및 하단 안내, 기존 견적 확인 버튼 등 기존 코드 */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuList.map((menu, index) => {
            const isProfileComplete = userProfile && userProfile.name && userProfile.english_name;
            const isDisabled = (existingQuoteId || quoteId) && !isProfileComplete;
            
            return (
              <div
                key={menu.key}
                className={`group rounded-xl shadow-lg transform transition-all duration-300 overflow-hidden border border-gray-200 ${
                  isDisabled 
                    ? 'bg-gray-100/80 cursor-not-allowed opacity-60' 
                    : 'bg-white/80 hover:shadow-2xl hover:scale-105 cursor-pointer'
                }`}
                onClick={() => handleServiceSelect(menu)}
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: 'fadeInUp 0.6s ease-out forwards'
                }}
              >
                <div className={`h-20 bg-gradient-to-br ${getGradientClass(menu.key, true)} flex items-center justify-center ${
                  isDisabled ? 'opacity-50' : ''
                }`}>
                  <span className="text-4xl">{menu.label.split(' ')[0]}</span>
                </div>
                <div className="p-2">
                  <h3 className={`text-lg font-bold mb-2 transition-colors ${
                    isDisabled 
                      ? 'text-gray-500' 
                      : 'text-gray-800 group-hover:text-blue-500'
                  }`}>
                    {menu.label}
                  </h3>
                  <p className={`text-sm mb-3 leading-relaxed ${
                    isDisabled ? 'text-gray-400' : 'text-gray-700'
                  }`}>
                    {menu.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold text-xs ${
                      isDisabled ? 'text-gray-400' : 'text-blue-400'
                    }`}>
                      {isDisabled ? '신상정보 입력 필요' : '예약 신청하기'}
                    </span>
                    <span className={`text-base transition-transform ${
                      isDisabled 
                        ? 'text-gray-400' 
                        : 'text-blue-400 group-hover:transform group-hover:translate-x-1'
                    }`}>
                      {isDisabled ? '🔒' : '→'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
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
                <h3 className="font-semibold text-green-700 mb-2">💎 회원 특가</h3>
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
