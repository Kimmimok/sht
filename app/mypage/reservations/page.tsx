'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';
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

function ReservationHomeContent() {
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
  const [reservationStatus, setReservationStatus] = useState<{ [key: string]: boolean }>({});

  const handleGoHome = () => {
    router.push('/mypage');
  };

  // 예약 상태 확인 함수 (각 서비스별로 예약이 완료되었는지 확인)
  const checkReservationStatus = async (quoteId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 각 서비스별 예약 상태 확인
      const serviceTypes = ['cruise', 'airport', 'hotel', 'tour', 'rentcar', 'vehicle'];
      const statusMap: { [key: string]: boolean } = {};

      for (const serviceType of serviceTypes) {
        const { data: reservation } = await supabase
          .from('reservation')
          .select('re_id')
          .eq('re_user_id', user.id)
          .eq('re_quote_id', quoteId)
          .eq('re_type', serviceType)
          .maybeSingle();

        statusMap[serviceType] = !!reservation;
      }

      setReservationStatus(statusMap);
    } catch (error) {
      console.error('예약 상태 확인 오류:', error);
    }
  };

  // 기존 예약 로드 함수
  const loadExistingQuote = async (quoteId: string) => {
    try {
      const quoteData = await getQuoteWithItems(quoteId);
      if (quoteData) {
        setQuote(quoteData);
        setQuoteId(quoteId);
        // 예약 상태도 함께 확인
        await checkReservationStatus(quoteId);
      }
    } catch (error) {
      console.error('예약 로드 오류:', error);
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
        // URL에 quoteId가 있으면 해당 예약 로드
        loadExistingQuote(existingQuoteId);
      }
      // 자동 예약 생성 제거
    }
  }, [existingQuoteId, initialized]);

  // 페이지 포커스시 프로필 다시 로드 (프로필 페이지에서 돌아올 때)
  useEffect(() => {
    const handleFocus = () => {
      loadUserProfile();
      // 예약 상태도 다시 확인
      const currentQuoteId = quoteId || existingQuoteId;
      if (currentQuoteId) {
        checkReservationStatus(currentQuoteId);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [quoteId, existingQuoteId]);

  // 예약 제목 입력 시작
  const handleStartQuoteCreation = () => {
    setShowTitleInput(true);
  };

  // 예약 제목 입력 취소
  const handleCancelTitleInput = () => {
    setShowTitleInput(false);
    setQuoteTitle('');
  };

  // 새로운 예약 생성 (제목과 함께)
  const handleCreateNewQuote = async () => {
    if (!quoteTitle.trim()) {
      alert('예약 제목을 입력해주세요.');
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
        // 새 예약이므로 예약 상태 초기화
        setReservationStatus({});
        // URL도 업데이트
        router.replace(`/mypage/quotes/new?quoteId=${newQuote.id}`);
      } else {
        alert('예약 생성에 실패했습니다.');
      }
    } catch (e) {
      console.error('예약 생성 오류:', e);
      alert('예약 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 예약 신청하기 - 매니저에게 전달
  const handleSubmitReservation = async () => {
    const currentQuoteId = quoteId || existingQuoteId;

    if (!currentQuoteId) {
      alert('예약 ID가 없습니다.');
      return;
    }

    if (!userProfile || !userProfile.name || !userProfile.english_name) {
      alert('먼저 신상정보를 입력해주세요!');
      router.push(`/mypage/reservations/profile?quoteId=${currentQuoteId}`);
      return;
    }

    try {
      setLoading(true);

      // 현재 견적의 상태를 'submitted'로 변경하여 매니저에게 전달
      const { error: updateError } = await supabase
        .from('quote')
        .update({
          status: 'submitted',
          updated_at: new Date().toISOString()
        })
        .eq('id', currentQuoteId);

      if (updateError) {
        throw updateError;
      }

      alert('예약 신청이 완료되었습니다! 매니저가 확인 후 연락드리겠습니다.');
      router.push('/mypage/quotes');

    } catch (error) {
      console.error('예약 신청 오류:', error);
      alert('예약 신청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 기존 예약 데이터 조회 및 수정 모드로 이동
  const handleEditReservation = async (service: typeof menuList[0]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('로그인이 필요합니다.');
        return;
      }

      const currentQuoteId = quoteId || existingQuoteId;
      if (!currentQuoteId) {
        alert('견적 ID를 찾을 수 없습니다.');
        return;
      }

      // 기존 예약 데이터 조회
      const { data: reservation, error } = await supabase
        .from('reservation')
        .select('re_id')
        .eq('re_user_id', user.id)
        .eq('re_quote_id', currentQuoteId)
        .eq('re_type', service.key === 'vehicle' ? 'car' : service.key)
        .single();

      if (error || !reservation) {
        console.error('예약 데이터 조회 오류:', error);
        alert('기존 예약 데이터를 찾을 수 없습니다.');
        return;
      }

      // 수정 모드로 서비스 폼 페이지 이동 (reservationId 파라미터 추가)
      switch (service.key) {
        case 'cruise':
          router.push(`/mypage/reservations/cruise?quoteId=${currentQuoteId}&reservationId=${reservation.re_id}&mode=edit`);
          break;
        case 'hotel':
          router.push(`/mypage/reservations/hotel?quoteId=${currentQuoteId}&reservationId=${reservation.re_id}&mode=edit`);
          break;
        case 'rentcar':
          router.push(`/mypage/reservations/rentcar?quoteId=${currentQuoteId}&reservationId=${reservation.re_id}&mode=edit`);
          break;
        case 'airport':
          router.push(`/mypage/reservations/airport?quoteId=${currentQuoteId}&reservationId=${reservation.re_id}&mode=edit`);
          break;
        case 'tour':
          router.push(`/mypage/reservations/tour?quoteId=${currentQuoteId}&reservationId=${reservation.re_id}&mode=edit`);
          break;
        case 'vehicle':
          router.push(`/mypage/reservations/vehicle?quoteId=${currentQuoteId}&reservationId=${reservation.re_id}&mode=edit`);
          break;
        default:
          alert('해당 서비스는 준비 중입니다.');
      }
    } catch (error) {
      console.error('예약 수정 처리 오류:', error);
      alert('예약 수정 처리 중 오류가 발생했습니다.');
    }
  };

  // 서비스 선택 시 프로필 확인 후 이동
  const handleServiceSelect = (service: typeof menuList[0]) => {
    // 완료된 예약인 경우 수정 모드로 이동
    if (reservationStatus[service.key]) {
      handleEditReservation(service);
      return;
    }

    if (!quoteId && !existingQuoteId) {
      alert('먼저 예약 제목을 입력하고 예약을 생성해주세요!');
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
        router.push(`/mypage/reservations/hotel?quoteId=${currentQuoteId}`);
        break;
      case 'rentcar':
        router.push(`/mypage/reservations/rentcar?quoteId=${currentQuoteId}`);
        break;
      case 'airport':
        router.push(`/mypage/reservations/airport?quoteId=${currentQuoteId}`);
        break;
      case 'tour':
        router.push(`/mypage/reservations/tour?quoteId=${currentQuoteId}`);
        break;
      case 'vehicle':
        router.push(`/mypage/reservations/vehicle?quoteId=${currentQuoteId}`);
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
                {existingQuoteId ? '예약을 바탕으로 예약을 진행하세요.' : '새로운 예약을 작성하여 예약을 시작하세요.'}
              </p>
            </div>

            <div className="flex gap-3">
              {/* 홈 버튼 */}
              <button
                onClick={handleGoHome}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                🏠 홈
              </button>

              {/* 예약 확인 버튼 */}
              {(quoteId || existingQuoteId) && (
                <button
                  onClick={() => router.push(`/mypage/quotes/${quoteId || existingQuoteId}/view`)}
                  className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 transition-colors"
                >
                  📋 예약 확인
                </button>
              )}

              {/* 새로운 예약 버튼 - 기존 예약이 없을 때만 표시 */}
              {!existingQuoteId && !showTitleInput ? (
                <button
                  onClick={handleStartQuoteCreation}
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-400 to-sky-500 text-white px-3 py-1.5 rounded text-xs font-medium shadow hover:from-blue-500 hover:to-sky-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  ➕ 새 예약 작성
                </button>
              ) : null}
            </div>
          </div>

          {/* 예약 상태 표시 */}
          {(quoteId || existingQuoteId) && quote ? (
            <div className="bg-white/70 backdrop-blur rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    ✅ 진행할 예약
                  </h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>예약 제목: <span className="font-semibold text-blue-600">{quote.title}</span></p>
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
                      className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 transition-colors"
                    >
                      신상정보 입력
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push(`/mypage/reservations/profile?quoteId=${existingQuoteId || quoteId}`)}
                      className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600 transition-colors"
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
                  {showTitleInput ? '📝 행복 여행 이름 짓기' : '📝 새 예약을 작성하여 예약을 시작하세요'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {showTitleInput
                    ? (<><span>행복 여행의 이름을 지어 주세요.<br />예) "하롱베이 3박4일", "가족여행 패키지", "허니문 크루즈" 등</span></>)
                    : (<span>"새 예약 작성" 버튼을 클릭하여 예약을 생성하고, 원하는 서비스를 선택해주세요.</span>)}
                </p>
                <div className="text-blue-600 text-sm">
                  {showTitleInput
                    ? (<p>💡 제목은 나중에 예약 목록에서 구분하는데 도움이 됩니다</p>)
                    : (<p>💡 한 번의 예약에 여러 서비스를 추가하여 예약할 수 있습니다</p>)}
                </div>
              </div>
            </div>
          )}

          {/* 예약 제목 입력창과 버튼을 카드 아래에 위치 */}
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
                className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? '생성 중...' : '생성'}
              </button>
              <button
                onClick={handleCancelTitleInput}
                disabled={loading}
                className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600 transition-colors"
              >
                취소
              </button>
            </div>
          )}
        </div>
      </div>
      {/* 서비스 메뉴 그리드 및 하단 안내, 기존 예약 확인 버튼 등 기존 코드 */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuList.map((menu, index) => {
            const isProfileComplete = userProfile && userProfile.name && userProfile.english_name;
            const isDisabled = (existingQuoteId || quoteId) && !isProfileComplete;
            const isReservationComplete = reservationStatus[menu.key] || false;

            return (
              <div
                key={menu.key}
                className={`group relative rounded-xl shadow-lg transform transition-all duration-300 overflow-hidden border-2 ${isDisabled
                  ? 'border-gray-200 bg-gray-100/80 cursor-not-allowed opacity-60'
                  : 'border-gray-200 bg-white/80 hover:shadow-2xl hover:scale-105 cursor-pointer'
                  }`}
                onClick={() => handleServiceSelect(menu)}
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: 'fadeInUp 0.6s ease-out forwards'
                }}
              >
                {/* 완료 배지 */}
                {isReservationComplete && (
                  <div className="absolute top-3 right-3 bg-blue-500 text-white text-sm px-3 py-2 rounded-full font-bold shadow-lg z-10 flex items-center gap-1">
                    ✅ 완료
                  </div>
                )}

                <div className={`h-20 bg-gradient-to-br ${getGradientClass(menu.key, true)} flex items-center justify-center relative ${isDisabled ? 'opacity-50' : ''
                  }`}>
                  <span className="text-4xl relative z-10">{menu.label.split(' ')[0]}</span>
                </div>
                <div className="p-2 relative z-10">
                  <h3 className={`text-lg font-bold mb-2 transition-colors ${isDisabled
                    ? 'text-gray-500'
                    : 'text-gray-800 group-hover:text-blue-500'
                    }`}>
                    {menu.label}
                  </h3>
                  <p className={`text-sm mb-3 leading-relaxed ${isDisabled ? 'text-gray-400' : 'text-gray-700'
                    }`}>
                    {menu.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold text-xs ${isDisabled
                      ? 'text-gray-400'
                      : 'text-blue-400'
                      }`}>
                      {isDisabled
                        ? '신상정보 입력 필요'
                        : isReservationComplete
                          ? '예약 완료 - 수정하기'
                          : '예약 신청하기'
                      }
                    </span>
                    <span className={`text-base transition-transform ${isDisabled
                      ? 'text-gray-400'
                      : 'text-blue-400 group-hover:transform group-hover:translate-x-1'
                      }`}>
                      {isDisabled ? '🔒' : isReservationComplete ? '✏️' : '→'}
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
        {/* 예약 신청 완료 버튼 */}
        {(quoteId || existingQuoteId) && quote && (
          <div className="mt-12 text-center">
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-8 rounded-xl shadow-lg border border-green-200">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">📝 예약 신청 완료</h2>
              <p className="text-gray-600 mb-6">
                모든 예약 정보를 입력하셨으면 아래 버튼을 클릭하여 매니저에게 예약을 신청하세요.
              </p>
              <button
                onClick={handleSubmitReservation}
                disabled={loading || !userProfile?.name}
                className={`px-8 py-4 rounded-lg font-bold text-lg transition-all duration-200 shadow-lg ${loading || !userProfile?.name
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white transform hover:scale-105'
                  }`}
              >
                {loading ? '신청 중...' : '🚀 매니저에게 예약 신청하기'}
              </button>
              {!userProfile?.name && (
                <p className="text-red-500 text-sm mt-2">신상정보를 먼저 입력해주세요.</p>
              )}
            </div>
          </div>
        )}

        {/* 기존 예약 확인 버튼 */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/mypage/quotes')}
            className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-8 py-3 rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-lg"
          >
            📋 기존 예약 목록 보기
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

export default function ReservationHomePage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64">로딩 중...</div>}>
      <ReservationHomeContent />
    </Suspense>
  );
}

