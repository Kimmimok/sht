'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';
import Link from 'next/link';

interface Quote {
  id: string;
  cruise_code: string;
  schedule_code: string;
  created_at: string;
  status: string;
  checkin: string;
  total_price: number;
  user_id: string;
}

export default function QuotesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUserAndQuotes();
  }, []);

  const loadUserAndQuotes = async () => {
    try {
      // 사용자 인증 확인
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }

      setUser(user);

      // 사용자의 견적 목록 조회 - 더 상세한 정보 포함
      const { data: quotesData, error: quotesError } = await supabase
        .from('quote')
        .select(`
          id,
          cruise_code,
          schedule_code,
          created_at,
          status,
          checkin,
          total_price,
          user_id
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (quotesError) throw quotesError;

      setQuotes(quotesData || []);
    } catch (error) {
      console.error('견적 목록 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string): string => {
    const labels: { [key: string]: string } = {
      draft: '작성중',
      pending: '대기중',
      processing: '처리중',
      confirmed: '확정됨',
      approved: '승인됨',
      rejected: '거절됨',
      completed: '완료됨'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string): string => {
    const colors: { [key: string]: string } = {
      draft: 'bg-gray-25 text-gray-600',
      pending: 'bg-yellow-25 text-yellow-600',
      processing: 'bg-blue-25 text-blue-600',
      confirmed: 'bg-green-25 text-green-600',
      approved: 'bg-green-25 text-green-600',
      rejected: 'bg-red-25 text-red-600',
      completed: 'bg-purple-25 text-purple-600'
    };
    return colors[status] || 'bg-gray-25 text-gray-600';
  };

  // 견적 제목 생성 함수
  const getQuoteTitle = (quote: Quote) => {
    const date = quote.checkin ? new Date(quote.checkin).toLocaleDateString() : '날짜 미정';
    const cruiseCode = quote.cruise_code || '크루즈 미정';
    return `${date} | ${cruiseCode}`;
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-300"></div>
          <p className="ml-4 text-gray-600">견적 목록을 불러오는 중...</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-6">
        <SectionBox title="📋 내 견적 목록">
          {/* 액션 버튼들 */}
          <div className="mb-6 flex gap-3 flex-wrap">
            <Link href="/mypage/quotes/new">
              <button className="bg-blue-300 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-400 transition-all">
                ➕ 새 견적 작성
              </button>
            </Link>
            <Link href="/mypage/quotes/confirmed">
              <button className="bg-green-300 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-400 transition-all">
                ✅ 확정 견적 보기
              </button>
            </Link>
            <Link href="/mypage/reservations/list">
              <button className="bg-purple-300 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-400 transition-all">
                🎫 예약 목록 보기
              </button>
            </Link>
            <button 
              onClick={() => {
                setLoading(true);
                loadUserAndQuotes();
              }}
              className="bg-orange-300 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-400 transition-all"
            >
              🔄 새로고침
            </button>
          </div>

          <div className="mb-4">
            <p className="text-gray-600">총 {quotes.length}건의 견적이 있습니다.</p>
          </div>

          {quotes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">아직 작성한 견적이 없습니다</h3>
              <p className="text-gray-500 mb-6">첫 번째 견적을 작성해보세요!</p>
              <Link href="/mypage/quotes/new">
                <button className="bg-blue-300 text-white px-6 py-3 rounded-lg hover:bg-blue-400 transition-colors">
                  견적 작성하기
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {quotes.map((quote) => (
                <div
                  key={quote.id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100 p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">
                          {getQuoteTitle(quote)}
                        </h3>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(quote.status)}`}>
                          {getStatusLabel(quote.status)}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>생성일: {new Date(quote.created_at).toLocaleDateString('ko-KR')}</p>
                        <p>일정 코드: <span className="font-medium">{quote.schedule_code || '미정'}</span></p>
                        <p>총 금액: <span className="font-semibold text-blue-600">
                          {quote.total_price > 0 ? `${quote.total_price.toLocaleString()}동` : '견적 대기'}
                        </span></p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Link href={`/mypage/quotes/${quote.id}/view`}>
                        <button className="bg-blue-300 text-white px-4 py-2 rounded-lg hover:bg-blue-400 transition-colors text-sm">
                          상세 보기
                        </button>
                      </Link>
                      
                      {(quote.status === 'draft' || quote.status === 'pending') && (
                        <Link href={`/mypage/quotes/${quote.id}/edit`}>
                          <button className="bg-green-300 text-white px-4 py-2 rounded-lg hover:bg-green-400 transition-colors text-sm">
                            수정하기
                          </button>
                        </Link>
                      )}

                      {quote.status === 'confirmed' && (
                        <Link href={`/mypage/reservations/new?quoteId=${quote.id}`}>
                          <button className="bg-orange-300 text-white px-4 py-2 rounded-lg hover:bg-orange-400 transition-colors text-sm">
                            예약하기
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionBox>
      </div>
    </PageWrapper>
  );
}
