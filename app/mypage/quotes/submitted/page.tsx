'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getQuoteWithItems } from '@/lib/quoteUtils';
import { Quote } from '@/lib/types';

export default function QuoteSubmittedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get('quoteId');
  
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(60); // 1분 후 다음 단계로

  useEffect(() => {
    if (quoteId) {
      loadQuote();
    }
    
    // 1분 후 내용 검토 단계로 이동
    const timer = setTimeout(() => {
      router.push(`/mypage/quotes/review?quoteId=${quoteId}`);
    }, 60000);

    return () => clearTimeout(timer);
  }, [router, quoteId]);

  // 카운트다운 타이머
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          router.push(`/mypage/quotes/review?quoteId=${quoteId}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router, quoteId]);

  const loadQuote = async () => {
    if (!quoteId) return;
    
    setLoading(true);
    try {
      const quoteData = await getQuoteWithItems(quoteId);
      if (quoteData) {
        setQuote(quoteData);
      }
    } catch (error) {
      console.error('견적 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    return `${seconds}초`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* 헤더 */}
          <div className="text-center mb-12">
            <div className="mb-6">
              <div className="text-8xl mb-4">📝</div>
              <h1 className="text-4xl font-bold text-green-700 mb-4">
                견적이 접수되었습니다!
              </h1>
              <p className="text-xl text-green-600 mb-2">
                견적 요청을 성공적으로 접수했습니다.
              </p>
              <p className="text-green-500">
                다음 단계까지 <span className="font-bold text-green-700">{formatTime(timeLeft)}</span> 남았습니다.
              </p>
            </div>
          </div>

          {/* 견적 정보 카드 */}
          {quote && (
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-green-200">
              <div className="flex items-center mb-6">
                <div className="text-3xl mr-4">✅</div>
                <h3 className="text-2xl font-semibold text-gray-800">접수 완료된 견적</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-lg">
                <div>
                  <span className="text-gray-600 font-medium">견적명:</span>
                  <span className="ml-3 font-bold text-blue-600">{quote.title}</span>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">접수 시간:</span>
                  <span className="ml-3 text-gray-800">
                    {new Date(quote.created_at).toLocaleString('ko-KR')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">현재 상태:</span>
                  <span className="ml-3 text-green-600 font-bold">접수 완료</span>
                </div>
              </div>
            </div>
          )}

          {/* 진행 상황 */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h3 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
              <span className="text-3xl mr-3">🔄</span>
              처리 진행 상황
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 rounded-lg bg-green-50 border-2 border-green-200">
                <div className="text-3xl animate-pulse">📝</div>
                <div className="flex-1">
                  <h4 className="font-bold text-green-700 text-lg">1단계: 견적 접수</h4>
                  <p className="text-green-600">견적 요청이 성공적으로 접수되었습니다</p>
                </div>
                <div className="text-green-600 font-bold">✓ 완료</div>
              </div>

              <div className="flex items-center space-x-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="text-3xl text-gray-400">🔍</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-500 text-lg">2단계: 내용 검토</h4>
                  <p className="text-gray-400">견적 내용을 검토하고 분석합니다</p>
                </div>
                <div className="text-gray-400">대기 중</div>
              </div>

              <div className="flex items-center space-x-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="text-3xl text-gray-400">💰</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-500 text-lg">3단계: 가격 산정</h4>
                  <p className="text-gray-400">최적의 가격을 계산합니다</p>
                </div>
                <div className="text-gray-400">대기 중</div>
              </div>

              <div className="flex items-center space-x-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="text-3xl text-gray-400">✅</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-500 text-lg">4단계: 검증 완료</h4>
                  <p className="text-gray-400">최종 검증 후 견적서를 완성합니다</p>
                </div>
                <div className="text-gray-400">대기 중</div>
              </div>
            </div>
          </div>

          {/* 안내 메시지 */}
          <div className="bg-gradient-to-r from-blue-100 to-green-100 rounded-xl p-8 mb-8">
            <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
              <span className="text-2xl mr-3">💡</span>
              접수 완료 안내
            </h3>
            <div className="space-y-3 text-blue-700">
              <div className="flex items-start space-x-3">
                <span className="text-blue-600 mt-1">📋</span>
                <span>견적 요청이 정상적으로 접수되어 처리를 시작합니다</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-blue-600 mt-1">⏱️</span>
                <span>평균 처리 시간은 3-5분입니다</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-blue-600 mt-1">📧</span>
                <span>각 단계별로 실시간 업데이트를 제공합니다</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-blue-600 mt-1">📞</span>
                <span>궁금한 사항이 있으시면 언제든 연락주세요</span>
              </div>
            </div>
          </div>

          {/* 액션 버튼들 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push(`/mypage/quotes/review?quoteId=${quoteId}`)}
              className="px-8 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold text-lg"
            >
              🔍 다음 단계로 (내용 검토)
            </button>
            <button
              onClick={() => router.push('/mypage/quotes/new')}
              className="px-8 py-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold text-lg"
            >
              🆕 새 견적 작성하기
            </button>
            <button
              onClick={() => router.push('/mypage/quotes')}
              className="px-8 py-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold text-lg"
            >
              📋 견적 목록 보기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
