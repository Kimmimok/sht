'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import supabase from '@/lib/supabase';

interface QuoteDetail {
  id: string;
  status: string;
  total_price: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  departure_date: string;
  return_date: string;
  adult_count: number;
  child_count: number;
  infant_count: number;
  cruise_name?: string;
  manager_note?: string;
  title?: string;
  cruise_code?: string;
  schedule_code?: string;
  users?: {
    name: string;
    email: string;
    phone_number?: string;
  };
  rentcar?: any[];
  cruise?: any[];
  airport?: any[];
  hotel?: any[];
  tour?: any[];
}

export default function QuoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<QuoteDetail | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && quoteId) {
      loadQuoteDetail();
    }
  }, [user, quoteId]);

  const checkAuth = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }

      setUser(user);
    } catch (error) {
      console.error('❌ 인증 확인 오류:', error);
      router.push('/login');
    }
  };

  const loadQuoteDetail = async () => {
    try {
      const { data: quoteData, error: quoteError } = await supabase
        .from('quote')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (quoteError) {
        console.error('❌ 견적 조회 실패:', quoteError);
        alert('견적을 찾을 수 없습니다.');
        router.push('/mypage/quotes');
        return;
      }

      setQuote(quoteData);
    } catch (error) {
      console.error('❌ 견적 상세 정보 로드 실패:', error);
      alert('견적 정보를 불러오는데 실패했습니다.');
      router.push('/mypage/quotes');
    } finally {
      setLoading(false);
    }
  };

  const handleReservation = async () => {
    try {
      if (!quote) {
        alert('견적 정보를 찾을 수 없습니다.');
        return;
      }

      // 견적 데이터 조회
      const { data: quoteData, error } = await supabase
        .from('quote')
        .select(`
          id,
          title,
          cruise_code,
          schedule_code,
          departure_date,
          return_date,
          total_price,
          quote_item (
            service_type,
            service_ref_id,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq('id', quoteId)
        .single();

      if (error) {
        console.error('견적 조회 오류:', error);
        alert('견적 데이터를 가져올 수 없습니다.');
        return;
      }

      if (!quoteData) {
        alert('견적을 찾을 수 없습니다.');
        return;
      }

      // 견적 데이터를 URL 파라미터로 전달하여 예약 페이지로 이동
      const reservationData = {
        quoteId: quoteData.id,
        title: quoteData.title,
        cruiseCode: quoteData.cruise_code,
        scheduleCode: quoteData.schedule_code,
        checkin: quoteData.departure_date,
        checkout: quoteData.return_date,
        totalPrice: quoteData.total_price,
        services: (quoteData.quote_item || []).map((item: any) => ({
          type: item.service_type,
          code: item.service_ref_id,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.total_price
        }))
      };

      // 데이터를 Base64로 인코딩하여 URL에 전달
      const encodedData = btoa(JSON.stringify(reservationData));
      router.push(`/mypage/reservations/cruise-new?data=${encodedData}`);
    } catch (error) {
      console.error('예약 처리 오류:', error);
      alert('예약 처리 중 오류가 발생했습니다.');
    }
  };

  if (loading || !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">견적 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-blue-100 via-cyan-100 to-teal-50 text-gray-700">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">✅ 확정 견적 상세</h1>
            <p className="text-lg opacity-80">
              승인된 견적의 상세 정보를 확인하세요.
            </p>
          </div>
        </div>
      </div>

      {/* 견적 상세 정보 */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            {/* 기본 정보 */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">📋 견적 기본 정보</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">견적 제목</label>
                  <p className="text-lg font-semibold">{quote.title || '제목 없음'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-green-25 text-green-600">
                    확정됨
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">출발일</label>
                  <p className="text-lg">{quote.departure_date ? new Date(quote.departure_date).toLocaleDateString('ko-KR') : '미정'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">복귀일</label>
                  <p className="text-lg">{quote.return_date ? new Date(quote.return_date).toLocaleDateString('ko-KR') : '미정'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">크루즈 코드</label>
                  <p className="text-lg font-semibold text-blue-600">{quote.cruise_code || '미정'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">총 금액</label>
                  <p className="text-2xl font-bold text-green-600">{quote.total_price.toLocaleString()}원</p>
                </div>
              </div>
            </div>

            {/* 승인 정보 */}
            <div className="mb-8 p-6 bg-green-50 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-2">✅ 견적 승인 완료</h3>
              <p className="text-green-700">
                이 견적은 승인이 완료되어 예약 진행이 가능합니다.
                아래 예약하기 버튼을 클릭하여 예약을 진행하세요.
              </p>
              <p className="text-sm text-green-600 mt-2">
                승인일: {new Date(quote.updated_at || quote.created_at).toLocaleDateString('ko-KR')}
              </p>
            </div>

            {/* 예약하기 버튼 */}
            <div className="flex justify-center mt-10">
              <button
                onClick={handleReservation}
                className="bg-blue-300 text-white px-10 py-4 rounded-lg text-lg hover:bg-blue-400 transition-colors font-bold shadow-sm"
              >
                🚢 예약하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
