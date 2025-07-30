'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

interface QuoteData {
  id: string;
  quote_number: string;
  departure_date: string;
  departure_port: string;
  arrival_port: string;
  nights: number;
  days: number;
  adult_count: number;
  child_count: number;
  infant_count: number;
  total_price: number;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  approved_at?: string;
  manager_note?: string;
  user_id: string;
  status: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function QuoteDetailPage({ params }: PageProps) {
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadQuoteData = async () => {
      try {
        // 로그인 확인 (Supabase 인증만, users 테이블 등록 없이)
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          alert('로그인이 필요합니다.');
          router.push('/login');
          return;
        }

        // params 해결
        const resolvedParams = await params;
        const quoteId = resolvedParams.id;

        // 견적 데이터 조회 (users 테이블 조인 없이, Supabase 인증만으로 접근)
        const { data: quoteData, error: quoteError } = await supabase
          .from('quote')
          .select('*')
          .eq('id', quoteId)
          .single();

        if (quoteError) {
          console.error('견적 조회 오류:', quoteError);
          alert('견적 정보를 불러올 수 없습니다.');
          return;
        }

        setQuote(quoteData);
      } catch (error) {
        console.error('데이터 로드 오류:', error);
        alert('견적 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadQuoteData();
  }, [params, router]);

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="ml-4 text-gray-600">견적 정보를 불러오는 중...</p>
        </div>
      </PageWrapper>
    );
  }

  if (!quote) {
    return (
      <PageWrapper>
        <SectionBox title="견적 정보">
          <p className="text-center text-gray-600">견적 정보를 찾을 수 없습니다.</p>
        </SectionBox>
      </PageWrapper>
    );
  }

  const handleReservation = () => {
    // 예약하기 클릭 시 예약 페이지로 이동 (이때 users 테이블에 등록됨)
    router.push(`/reservation/new?quote_id=${quote.id}`);
  };

  return (
    <PageWrapper>
      <SectionBox title="견적 상세 정보">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                견적 번호
              </label>
              <p className="text-lg font-semibold">{quote.quote_number}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                상태
              </label>
              <p className="text-lg">
                <span className={`px-2 py-1 rounded text-sm ${
                  quote.status === 'approved' ? 'bg-green-100 text-green-800' :
                  quote.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {quote.status === 'approved' ? '승인됨' :
                   quote.status === 'submitted' ? '제출됨' : '작성중'}
                </span>
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                출발일
              </label>
              <p className="text-lg">{quote.departure_date}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                출발항구
              </label>
              <p className="text-lg">{quote.departure_port}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                도착항구
              </label>
              <p className="text-lg">{quote.arrival_port}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                여행 기간
              </label>
              <p className="text-lg">{quote.nights}박 {quote.days}일</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                인원
              </label>
              <p className="text-lg">
                성인 {quote.adult_count}명
                {quote.child_count > 0 && `, 아동 ${quote.child_count}명`}
                {quote.infant_count > 0 && `, 유아 ${quote.infant_count}명`}
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="text-xl font-semibold">총 견적 금액</span>
              <span className="text-2xl font-bold text-blue-600">
                {quote.total_price.toLocaleString()}원
              </span>
            </div>
          </div>

          {quote.manager_note && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">관리자 메모</h3>
              <p className="text-yellow-700">{quote.manager_note}</p>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              onClick={() => router.back()}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              뒤로가기
            </button>
            
            {quote.status === 'approved' && (
              <button
                onClick={handleReservation}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                예약하기
              </button>
            )}
          </div>
        </div>
      </SectionBox>
    </PageWrapper>
  );
}
