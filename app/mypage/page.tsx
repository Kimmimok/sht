'use client';
import React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '../../lib/supabase';
import PageWrapper from '../../components/PageWrapper';
import SectionBox from '../../components/SectionBox';
import Link from 'next/link';

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [recentQuotes, setRecentQuotes] = useState<any[]>([]);
  const [recentReservations, setRecentReservations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }

      setUser(userData.user);

      try {
        // 최근 견적 3개 가져오기 - 확정되지 않은 견적만 조회
        const { data: quotesData } = await supabase
          .from('quote')
          .select(`
            id, 
            title,
            cruise_code, 
            schedule_code, 
            created_at, 
            status, 
            checkin,
            total_price,
            quote_item (
              service_type,
              total_price
            )
          `)
          .eq('user_id', userData.user.id)
          .neq('status', 'confirmed')
          .neq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(3);

        if (quotesData) setRecentQuotes(quotesData);

        // 최근 예약 3개 가져오기 - 예약 상세정보 포함
        const { data: reservationsData } = await supabase
          .from('reservation')
          .select(`
            re_id, 
            re_type, 
            re_created_at, 
            re_status,
            re_checkin,
            re_checkout,
            re_total_price,
            re_cruise_name,
            re_schedule_name
          `)
          .eq('re_user_id', userData.user.id)
          .order('re_created_at', { ascending: false })
          .limit(3);

        if (reservationsData) setRecentReservations(reservationsData);
      } catch (error) {
        console.error('데이터 로드 오류:', error);
      }

      setIsLoading(false);
    };

    fetchData();
  }, [router]);

  if (isLoading) {
    return (
      <PageWrapper title="마이페이지">
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔄</div>
          <p>로딩 중...</p>
        </div>
      </PageWrapper>
    );
  }

  const quickActions = [
    { icon: '📝', label: '새 견적', href: '/mypage/quotes/new' },
    { icon: '📋', label: '견적 목록', href: '/mypage/quotes' },
    { icon: '✅', label: '확정 견적', href: '/mypage/quotes/confirmed' },
    { icon: '📅', label: '예약 신청', href: '/mypage/reservations/new' },
    { icon: '📜', label: '예약 목록', href: '/mypage/reservations/list' },
  ];

  // 견적 상태에 따른 색상 표시
  const getQuoteStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return '확정';
      case 'processing': return '처리중';
      case 'pending': return '대기';
      default: return '대기';
    }
  };

  // 예약 상태에 따른 색상 표시
  const getReservationStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return '확정';
      case 'pending': return '대기';
      case 'processing': return '처리중';
      case 'cancelled': return '취소';
      default: return '대기';
    }
  };

  // 서비스 타입 표시
  const getServiceTypeText = (serviceType: string) => {
    switch (serviceType) {
      case 'quote_room': return '객실';
      case 'quote_car': return '차량';
      case 'airport': return '공항';
      case 'hotel': return '호텔';
      case 'tour': return '투어';
      case 'rentcar': return '렌트카';
      default: return serviceType;
    }
  };

  // 예약 타입 표시
  const getReservationTypeText = (reservationType: string) => {
    switch (reservationType) {
      case 'cruise': return '크루즈';
      case 'hotel': return '호텔';
      case 'tour': return '투어';
      case 'airport': return '공항';
      case 'rentcar': return '렌트카';
      case 'vehicle': return '차량';
      case 'comprehensive': return '종합';
      default: return reservationType || '일반';
    }
  };

  // 견적의 서비스 타입들을 문자열로 조합
  const getQuoteServices = (quote: any) => {
    if (!quote.quote_item || quote.quote_item.length === 0) {
      return '서비스 없음';
    }

    const serviceTypes = [...new Set(quote.quote_item.map((item: any) => item.service_type))];
    return serviceTypes.map((type: any) => getServiceTypeText(type)).join(', ');
  };

  // 견적 아이템들의 총 가격 계산
  const getQuoteItemsTotalPrice = (quote: any) => {
    if (!quote.quote_item || quote.quote_item.length === 0) {
      return 0;
    }

    return quote.quote_item.reduce((total: number, item: any) => {
      return total + (item.total_price || 0);
    }, 0);
  };

  // 견적 제목 생성 함수
  const getQuoteTitle = (quote: any) => {
    // title 필드가 있으면 그것을 사용
    if (quote.title && quote.title.trim()) {
      return quote.title;
    }

    // title이 없으면 기본 형식으로 생성
    const date = quote.checkin ? new Date(quote.checkin).toLocaleDateString() : '날짜 미정';
    const cruiseCode = quote.cruise_code || '크루즈 미정';
    return `${date} | ${cruiseCode}`;
  };

  // 예약 제목 생성 함수
  const getReservationTitle = (reservation: any) => {
    const checkIn = reservation.re_checkin ? new Date(reservation.re_checkin).toLocaleDateString() : '날짜 미정';
    const cruiseName = reservation.re_cruise_name || '크루즈 미정';
    return `${checkIn} | ${cruiseName}`;
  };

  return (
    <PageWrapper title={`${user?.email?.split('@')[0]}님의 마이페이지`}>
      <div className="space-y-6">
        {/* 빠른 액션 */}
        <SectionBox title="빠른 액션">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickActions.map((action, index) => (
              <Link key={index} href={action.href}>
                <button className="w-full p-2 bg-white border border-gray-200 rounded hover:border-blue-300 hover:shadow-sm transition-all text-center">
                  <div className="text-lg mb-1">{action.icon}</div>
                  <div className="text-xs font-medium text-gray-700">{action.label}</div>
                </button>
              </Link>
            ))}
            {/* 새로고침 버튼 추가 */}
            <button
              onClick={() => {
                setIsLoading(true);
                window.location.reload();
              }}
              className="w-full p-2 bg-white border border-gray-200 rounded hover:border-green-300 hover:shadow-sm transition-all text-center"
            >
              <div className="text-lg mb-1">🔄</div>
              <div className="text-xs font-medium text-gray-700">새로고침</div>
            </button>
          </div>
        </SectionBox>

        <div className="grid md:grid-cols-2 gap-6">
          {/* 최근 견적 */}
          <SectionBox title="최근 견적 (진행 중)">
            {recentQuotes.length > 0 ? (
              <div className="space-y-3">
                {recentQuotes.map((quote) => (
                  <div key={quote.id} className="p-3 bg-gray-25 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm font-medium">
                        {getQuoteTitle(quote)}
                      </div>
                      <div
                        className={`px-2 py-1 text-xs rounded ${quote.status === 'processing'
                          ? 'bg-yellow-25 text-yellow-600'
                          : 'bg-gray-25 text-gray-600'
                          }`}
                      >
                        {getQuoteStatusText(quote.status)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      생성일: {new Date(quote.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      서비스: <span className="font-medium text-blue-600">{getQuoteServices(quote)}</span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {quote.total_price > 0 ? (
                        <>
                          견적 총액: <span className="text-blue-600 font-medium">{quote.total_price.toLocaleString()}원</span>
                          {getQuoteItemsTotalPrice(quote) > 0 && (
                            <span className="ml-2">
                              (아이템: {getQuoteItemsTotalPrice(quote).toLocaleString()}원)
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400">가격 미정</span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Link href={`/mypage/quotes/${quote.id}/view`}>
                        <button className="text-xs bg-blue-300 text-white px-1 py-0.5 rounded hover:bg-blue-400">
                          조회
                        </button>
                      </Link>
                      <Link href={`/mypage/quotes/${quote.id}/edit`}>
                        <button className="text-xs bg-gray-300 text-white px-1 py-0.5 rounded hover:bg-gray-400">
                          수정
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
                <Link href="/mypage/quotes">
                  <button className="w-full text-xs text-blue-600 hover:text-blue-800">
                    모든 견적 보기 →
                  </button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-3xl mb-2">📋</div>
                <p>처리 중이거나 대기 중인 견적이 없습니다.</p>
                <p className="text-xs text-gray-400 mt-1">승인/확정된 견적은 "확정 견적" 페이지에서 확인하세요.</p>
                <Link href="/mypage/quotes/new">
                  <button className="mt-2 text-blue-600 hover:text-blue-800">
                    새 견적 작성하기
                  </button>
                </Link>
              </div>
            )}
          </SectionBox>

          {/* 최근 예약 */}
          <SectionBox title="최근 예약">
            {recentReservations.length > 0 ? (
              <div className="space-y-3">
                {recentReservations.map((reservation) => (
                  <div key={reservation.re_id} className="p-3 bg-gray-25 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm font-medium">{getReservationTitle(reservation)}</div>
                      <div
                        className={`px-2 py-1 text-xs rounded ${reservation.re_status === 'confirmed'
                          ? 'bg-green-25 text-green-600'
                          : reservation.re_status === 'pending'
                            ? 'bg-yellow-25 text-yellow-600'
                            : reservation.re_status === 'cancelled'
                              ? 'bg-red-25 text-red-600'
                              : 'bg-gray-25 text-gray-600'
                          }`}
                      >
                        {getReservationStatusText(reservation.re_status)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      예약일: {new Date(reservation.re_created_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      예약 타입: <span className="font-medium text-purple-600">{getReservationTypeText(reservation.re_type)}</span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {reservation.re_total_price > 0 ? (
                        <span className="text-blue-600 font-medium">
                          총 금액: {reservation.re_total_price.toLocaleString()}원
                        </span>
                      ) : (
                        <span className="text-gray-400">금액 미정</span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Link href={`/mypage/reservations/${reservation.re_id}/view`}>
                        <button className="text-xs bg-blue-300 text-white px-1 py-0.5 rounded hover:bg-blue-400">
                          조회
                        </button>
                      </Link>
                      {reservation.re_status === 'pending' && (
                        <Link href={`/mypage/reservations/${reservation.re_id}/edit`}>
                          <button className="text-xs bg-gray-300 text-white px-1 py-0.5 rounded hover:bg-gray-400">
                            수정
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
                <Link href="/mypage/reservations/list">
                  <button className="w-full text-xs text-blue-600 hover:text-blue-800">
                    모든 예약 보기 →
                  </button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-3xl mb-2">📅</div>
                <p>아직 예약이 없습니다.</p>
                <Link href="/mypage/reservations/new">
                  <button className="mt-2 text-blue-600 hover:text-blue-800">첫 예약하기</button>
                </Link>
              </div>
            )}
          </SectionBox>
        </div>

        {/* 계정 정보 */}
        <SectionBox title="계정 정보">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-25 rounded-lg">
              <div className="text-lg font-semibold text-blue-900">이메일</div>
              <div className="text-sm text-blue-700">{user?.email}</div>
            </div>
            <div className="text-center p-4 bg-green-25 rounded-lg">
              <div className="text-lg font-semibold text-green-900">총 견적 수</div>
              <div className="text-sm text-green-700">
                {recentQuotes.length >= 3 ? '3개 이상' : `${recentQuotes.length}개`}
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-lg font-semibold text-purple-900">총 예약 수</div>
              <div className="text-sm text-purple-700">
                {recentReservations.length >= 3 ? '3개 이상' : `${recentReservations.length}개`}
              </div>
            </div>
          </div>
        </SectionBox>
      </div>
    </PageWrapper>
  );
}




