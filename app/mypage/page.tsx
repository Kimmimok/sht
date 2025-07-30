'use client';
import React from 'react';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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

      // 최근 견적 3개 가져오기
      const { data: quotesData } = await supabase
        .from('quote')
        .select('id, cruise_code, schedule_code, created_at, status')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (quotesData) setRecentQuotes(quotesData);

      // 최근 예약 3개 가져오기 (예약 테이블이 있다면)
      const { data: reservationsData } = await supabase
        .from('reservation')
        .select('re_id, re_type, re_created_at, re_status')
        .eq('re_user_id', userData.user.id)
        .order('re_created_at', { ascending: false })
        .limit(3);

      if (reservationsData) setRecentReservations(reservationsData);

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
    { icon: '📝', label: '새 견적 작성', href: '/mypage/quotes/new' },
    { icon: '📊', label: '종합 견적', href: '/mypage/quotes/comprehensive' },
    { icon: '📋', label: '내 견적 목록', href: '/mypage/quotes' },
    { icon: '�', label: '새 예약 신청', href: '/reservation/comprehensive/new' },
    { icon: '📂', label: '내 예약 목록', href: '/mypage/reservations' },
  ];

  return (
    <PageWrapper title={`${user?.email?.split('@')[0]}님의 마이페이지`}>
      <div className="space-y-6">
        {/* 빠른 액션 */}
        <SectionBox title="빠른 액션">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {quickActions.map((action, index) => (
              <Link key={index} href={action.href}>
                <button className="w-full p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all text-center">
                  <div className="text-2xl mb-2">{action.icon}</div>
                  <div className="text-sm font-medium text-gray-700">{action.label}</div>
                </button>
              </Link>
            ))}
          </div>
        </SectionBox>

        <div className="grid md:grid-cols-2 gap-6">
          {/* 최근 견적 */}
          <SectionBox title="최근 견적">
            {recentQuotes.length > 0 ? (
              <div className="space-y-3">
                {recentQuotes.map((quote) => (
                  <div key={quote.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm font-medium">견적 #{quote.id}</div>
                      <div
                        className={`px-2 py-1 text-xs rounded ${
                          quote.status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : quote.status === 'processing'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {quote.status === 'confirmed'
                          ? '확정'
                          : quote.status === 'processing'
                            ? '처리중'
                            : '대기'}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {new Date(quote.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex space-x-2">
                      <Link href={`/mypage/quotes/${quote.id}/view`}>
                        <button className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600">
                          보기
                        </button>
                      </Link>
                      <Link href={`/mypage/quotes/${quote.id}/edit`}>
                        <button className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600">
                          수정
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
                <Link href="/mypage/quotes">
                  <button className="w-full text-sm text-blue-600 hover:text-blue-800">
                    모든 견적 보기 →
                  </button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-3xl mb-2">📋</div>
                <p>아직 작성한 견적이 없습니다.</p>
                <Link href="/mypage/quotes/new">
                  <button className="mt-2 text-blue-600 hover:text-blue-800">
                    첫 견적 작성하기
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
                  <div key={reservation.re_id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm font-medium">예약 #{reservation.re_id}</div>
                      <div
                        className={`px-2 py-1 text-xs rounded ${
                          reservation.re_status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : reservation.re_status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {reservation.re_status === 'confirmed'
                          ? '확정'
                          : reservation.re_status === 'pending'
                            ? '대기'
                            : '처리중'}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {new Date(reservation.re_created_at).toLocaleDateString()}
                    </div>
                    <Link href={`/reservation/view/${reservation.re_id}`}>
                      <button className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600">
                        보기
                      </button>
                    </Link>
                  </div>
                ))}
                <Link href="/mypage/reservations">
                  <button className="w-full text-sm text-blue-600 hover:text-blue-800">
                    모든 예약 보기 →
                  </button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-3xl mb-2">🎫</div>
                <p>아직 예약이 없습니다.</p>
                <Link href="/reserve/new">
                  <button className="mt-2 text-blue-600 hover:text-blue-800">첫 예약하기</button>
                </Link>
              </div>
            )}
          </SectionBox>
        </div>

        {/* 계정 정보 */}
        <SectionBox title="계정 정보">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-lg font-semibold text-blue-900">이메일</div>
              <div className="text-sm text-blue-700">{user?.email}</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-lg font-semibold text-green-900">견적 수</div>
              <div className="text-sm text-green-700">{recentQuotes.length}개</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-lg font-semibold text-purple-900">예약 수</div>
              <div className="text-sm text-purple-700">{recentReservations.length}개</div>
            </div>
          </div>
        </SectionBox>
      </div>
    </PageWrapper>
  );
}
