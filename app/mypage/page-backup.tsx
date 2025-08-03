'use client';
import React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';
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
        // 理쒓렐 寃ъ쟻 3媛?媛?몄삤湲?- 寃ъ쟻 ?꾩씠?쒓낵 ?쒕퉬??????뺣낫 ?ы븿
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
          .order('created_at', { ascending: false })
          .limit(3);

        if (quotesData) setRecentQuotes(quotesData);

        // 理쒓렐 ?덉빟 3媛?媛?몄삤湲?- ?덉빟 ????뺣낫 ?ы븿
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
        console.error('?곗씠??濡쒕뱶 ?ㅻ쪟:', error);
      }

      setIsLoading(false);
    };

    fetchData();
  }, [router]);

  if (isLoading) {
    return (
      <PageWrapper title="留덉씠?섏씠吏">
        <div className="text-center py-12">
          <div className="text-4xl mb-4">?봽</div>
          <p>濡쒕뵫 以?..</p>
        </div>
      </PageWrapper>
    );
  }

  const quickActions = [
    { icon: '?뱷', label: '??寃ъ쟻 ', href: '/mypage/quotes/new' },
    { icon: '?뱥', label: '??寃ъ쟻 紐⑸줉', href: '/mypage/quotes' },
    {
      icon: '??, label: ' ? 뺤젙 寃ъ쟻', href: '/mypage/quotes / confirmed' },
    { icon: '?렖', label: '???덉빟 ?좎껌', href: '/mypage/reservations/new' },
    { icon: '?뱛', label: '???덉빟 紐⑸줉', href: '/mypage/reservations/list' },
  ];

  // 寃ъ쟻 ?곹깭???곕Ⅸ ?쒓? ?쒖떆
  const getQuoteStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return '?뺤젙';
      case 'processing': return '泥섎━以?;
      case 'pending': return '?湲?;
      default: return '?湲?;
    }
  };

  // ?덉빟 ?곹깭???곕Ⅸ ?쒓? ?쒖떆
  const getReservationStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return '?뺤젙';
      case 'pending': return '?湲?;
      case 'processing': return '泥섎━以?;
      case 'cancelled': return '痍⑥냼';
      default: return '?湲?;
    }
  };

  // ?쒕퉬??????쒓? ?쒖떆
  const getServiceTypeText = (serviceType: string) => {
    switch (serviceType) {
      case 'quote_room': return '媛앹떎';
      case 'quote_car': return '李⑤웾';
      case 'airport': return '怨듯빆';
      case 'hotel': return '?명뀛';
      case 'tour': return '?ъ뼱';
      case 'rentcar': return '?뚰듃移?;
      default: return serviceType;
    }
  };

  // ?덉빟 ????쒓? ?쒖떆
  const getReservationTypeText = (reservationType: string) => {
    switch (reservationType) {
      case 'cruise': return '?щ（利?;
      case 'hotel': return '?명뀛';
      case 'tour': return '?ъ뼱';
      case 'airport': return '怨듯빆';
      case 'rentcar': return '?뚰듃移?;
      case 'vehicle': return '李⑤웾';
      case 'comprehensive': return '醫낇빀';
      default: return reservationType || '?쇰컲';
    }
  };

  // 寃ъ쟻???쒕퉬????낅뱾??臾몄옄?대줈 議고빀
  const getQuoteServices = (quote: any) => {
    if (!quote.quote_item || quote.quote_item.length === 0) {
      return '?쒕퉬???놁쓬';
    }

    const serviceTypes = [...new Set(quote.quote_item.map((item: any) => item.service_type))];
    return serviceTypes.map((type: any) => getServiceTypeText(type)).join(', ');
  };

  // 寃ъ쟻 ?꾩씠?쒕뱾??珥?媛寃?怨꾩궛
  const getQuoteItemsTotalPrice = (quote: any) => {
    if (!quote.quote_item || quote.quote_item.length === 0) {
      return 0;
    }

    return quote.quote_item.reduce((total: number, item: any) => {
      return total + (item.total_price || 0);
    }, 0);
  };

  // 寃ъ쟻 ?쒕ぉ ?앹꽦 ?⑥닔
  const getQuoteTitle = (quote: any) => {
    // title ?꾨뱶媛 ?덉쑝硫??곗꽑 ?ъ슜
    if (quote.title && quote.title.trim()) {
      return quote.title;
    }

    // title???놁쑝硫?湲곕낯 ?뺤떇?쇰줈 ?앹꽦
    const date = quote.checkin ? new Date(quote.checkin).toLocaleDateString() : '?좎쭨 誘몄젙';
    const cruiseCode = quote.cruise_code || '?щ（利?誘몄젙';
    return `${date} | ${cruiseCode}`;
  };

  // ?덉빟 ?쒕ぉ ?앹꽦 ?⑥닔
  const getReservationTitle = (reservation: any) => {
    const checkIn = reservation.re_checkin ? new Date(reservation.re_checkin).toLocaleDateString() : '?좎쭨 誘몄젙';
    const cruiseName = reservation.re_cruise_name || '?щ（利?誘몄젙';
    return `${checkIn} | ${cruiseName}`;
  };

  return (
    <PageWrapper title={`${user?.email?.split('@')[0]}?섏쓽 留덉씠?섏씠吏`}>
      <div className="space-y-6">
        {/* 鍮좊Ⅸ ?≪뀡 */}
        <SectionBox title="鍮좊Ⅸ ?≪뀡">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickActions.map((action, index) => (
              <Link key={index} href={action.href}>
                <button className="w-full p-2 bg-white border border-gray-200 rounded hover:border-blue-300 hover:shadow-sm transition-all text-center">
                  <div className="text-lg mb-1">{action.icon}</div>
                  <div className="text-xs font-medium text-gray-700">{action.label}</div>
                </button>
              </Link>
            ))}
            {/* ?덈줈怨좎묠 踰꾪듉 異붽? */}
            <button
              onClick={() => {
                setIsLoading(true);
                window.location.reload();
              }}
              className="w-full p-2 bg-white border border-gray-200 rounded hover:border-green-300 hover:shadow-sm transition-all text-center"
            >
              <div className="text-lg mb-1">?봽</div>
              <div className="text-xs font-medium text-gray-700">?덈줈怨좎묠</div>
            </button>
          </div>
        </SectionBox>

        <div className="grid md:grid-cols-2 gap-6">
          {/* 理쒓렐 寃ъ쟻 */}
          <SectionBox title="理쒓렐 寃ъ쟻">
            {recentQuotes.length > 0 ? (
              <div className="space-y-3">
                {recentQuotes.map((quote) => (
                  <div key={quote.id} className="p-3 bg-gray-25 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm font-medium">
                        {getQuoteTitle(quote)}
                        {quote.status === 'confirmed' && (
                          <span className="ml-2 text-green-600 font-bold">???뺤젙</span>
                        )}
                      </div>
                      <div
                        className={`px-2 py-1 text-xs rounded ${quote.status === 'confirmed'
                          ? 'bg-green-25 text-green-600'
                          : quote.status === 'processing'
                            ? 'bg-yellow-25 text-yellow-600'
                            : 'bg-gray-25 text-gray-600'
                          }`}
                      >
                        {getQuoteStatusText(quote.status)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      ?앹꽦?? {new Date(quote.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      ?쒕퉬?? <span className="font-medium text-blue-600">{getQuoteServices(quote)}</span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {quote.total_price > 0 ? (
                        <>
                          寃ъ쟻 珥앹븸: <span className="text-blue-600 font-medium">{quote.total_price.toLocaleString()}??/span>
                            {getQuoteItemsTotalPrice(quote) > 0 && (
                              <span className="ml-2">
                                (?꾩씠?? {getQuoteItemsTotalPrice(quote).toLocaleString()}??
                              </span>
                            )}
                          </>
                          ) : (
                          <span className="text-gray-400">媛寃?誘몄젙</span>
                      )}
                        </div>
                      <div className="flex space-x-2">
                        <Link href={`/mypage/quotes/${quote.id}/view`}>
                          <button className="text-xs bg-blue-300 text-white px-1 py-0.5 rounded hover:bg-blue-400">

                          </button>
                        </Link>
                        <Link href={`/mypage/quotes/${quote.id}/edit`}>
                          <button className="text-xs bg-gray-300 text-white px-1 py-0.5 rounded hover:bg-gray-400">
                            ?섏젙
                          </button>
                        </Link>
                      </div>
                    </div>
                ))}
                    <Link href="/mypage/quotes">
                      <button className="w-full text-xs text-blue-600 hover:text-blue-800">
                        紐⑤뱺 寃ъ쟻  ??
                      </button>
                    </Link>
                  </div>
                ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-3xl mb-2">?뱥</div>
                  <p>?꾩쭅 ??寃ъ쟻???놁뒿?덈떎.</p>
                  <Link href="/mypage/quotes/new">
                    <button className="mt-2 text-blue-600 hover:text-blue-800">
                      泥?寃ъ쟻
                    </button>
                  </Link>
                </div>
            )}
              </SectionBox>

          {/* 理쒓렐 ?덉빟 */}
            <SectionBox title="理쒓렐 ?덉빟">
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
                        ?덉빟?? {new Date(reservation.re_created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        ?덉빟 ??? <span className="font-medium text-purple-600">{getReservationTypeText(reservation.re_type)}</span>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        {reservation.re_total_price > 0 ? (
                          <span className="text-blue-600 font-medium">
                            珥?湲덉븸: {reservation.re_total_price.toLocaleString()}??
                          </span>
                        ) : (
                          <span className="text-gray-400">湲덉븸 誘몄젙</span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Link href={`/mypage/reservations/${reservation.re_id}/view`}>
                          <button className="text-xs bg-blue-300 text-white px-1 py-0.5 rounded hover:bg-blue-400">

                          </button>
                        </Link>
                        {reservation.re_status === 'pending' && (
                          <Link href={`/mypage/reservations/${reservation.re_id}/edit`}>
                            <button className="text-xs bg-gray-300 text-white px-1 py-0.5 rounded hover:bg-gray-400">
                              ?섏젙
                            </button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                  <Link href="/mypage/reservations/list">
                    <button className="w-full text-xs text-blue-600 hover:text-blue-800">
                      紐⑤뱺 ?덉빟  ??
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-3xl mb-2">?렖</div>
                  <p>?꾩쭅 ?덉빟???놁뒿?덈떎.</p>
                  <Link href="/mypage/reservations/new">
                    <button className="mt-2 text-blue-600 hover:text-blue-800">泥??덉빟?</button>
                  </Link>
                </div>
              )}
            </SectionBox>
        </div>

        {/* 怨꾩젙 ?뺣낫 */}
        <SectionBox title="怨꾩젙 ?뺣낫">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-25 rounded-lg">
              <div className="text-lg font-semibold text-blue-900">?대찓??/div>
                <div className="text-sm text-blue-700">{user?.email}</div>
              </div>
              <div className="text-center p-4 bg-green-25 rounded-lg">
                <div className="text-lg font-semibold text-green-900">珥?寃ъ쟻 ??/div>
                  <div className="text-sm text-green-700">
                    {recentQuotes.length >= 3 ? '3媛??댁긽' : `${recentQuotes.length}媛?}
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-lg font-semibold text-purple-900">珥??덉빟 ??/div>
              <div className="text-sm text-purple-700">
                {recentReservations.length >= 3 ? '3媛??댁긽' : `${recentReservations.length}媛?}
                  </div>
                </div>
              </div>
            </SectionBox>
          </div>
        </PageWrapper>
        );
}




