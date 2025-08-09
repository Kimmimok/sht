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
  const [confirmationStats, setConfirmationStats] = useState({ total: 0, paid: 0, pending: 0 });
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

        // 확인서 통계 로드
        const { data: allQuotesData } = await supabase
          .from('quote')
          .select('payment_status')
          .eq('user_id', userData.user.id);

        if (allQuotesData) {
          const stats = {
            total: allQuotesData.length,
            paid: allQuotesData.filter(q => q.payment_status === 'paid').length,
            pending: allQuotesData.filter(q => q.payment_status !== 'paid').length
          };
          setConfirmationStats(stats);
        }
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
    { icon: '📅', label: '예약 신청', href: '/mypage/reservations' },
    { icon: '📜', label: '예약 목록', href: '/mypage/reservations/list' },
    { icon: '💳', label: '결제하기', href: '/mypage/payments' },
    { icon: '📄', label: '예약확인서', href: '/mypage/confirmations' },
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
      {/* 로그아웃 버튼 추가 */}
      <div className="flex justify-end mb-4">
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push('/login');
          }}
          className="px-3 py-1 bg-red-100 text-red-600 rounded shadow hover:bg-red-200 text-sm font-medium"
        >
          로그아웃
        </button>
      </div>
      {/* 빠른 액션만 남김 */}
      <SectionBox title="원하는 서비스를 선택하세요">
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

      {/* 예약확인서 요약 */}
      {confirmationStats.total > 0 && (
        <SectionBox title="예약확인서 현황">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-2xl text-blue-600 mb-2">📊</div>
              <div className="text-xl font-bold text-blue-800">{confirmationStats.total}</div>
              <div className="text-sm text-blue-600">전체 견적</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-2xl text-green-600 mb-2">✅</div>
              <div className="text-xl font-bold text-green-800">{confirmationStats.paid}</div>
              <div className="text-sm text-green-600">예약 완료</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <div className="text-2xl text-yellow-600 mb-2">📋</div>
              <div className="text-xl font-bold text-yellow-800">{confirmationStats.pending}</div>
              <div className="text-sm text-yellow-600">진행 중</div>
            </div>
          </div>

          {confirmationStats.paid > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-green-800 mb-1">🎉 예약확인서 이용 가능</h3>
                  <p className="text-green-700 text-sm">
                    {confirmationStats.paid}개의 결제 완료된 예약의 확인서를 확인할 수 있습니다.
                  </p>
                </div>
                <Link
                  href="/mypage/confirmations"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center space-x-2"
                >
                  <span>📄</span>
                  <span>확인서 보기</span>
                </Link>
              </div>
            </div>
          )}

          {confirmationStats.pending > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-yellow-800 mb-1">💳 결제 대기 중</h3>
                  <p className="text-yellow-700 text-sm">
                    {confirmationStats.pending}개의 견적이 결제를 기다리고 있습니다. 결제 완료 후 확인서를 받으실 수 있습니다.
                  </p>
                </div>
                <Link
                  href="/mypage/payments"
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm flex items-center space-x-2"
                >
                  <span>💳</span>
                  <span>결제하기</span>
                </Link>
              </div>
            </div>
          )}
        </SectionBox>
      )}
    </PageWrapper>
  );
}




