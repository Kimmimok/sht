'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { addTourToQuote, getQuoteWithItems } from '@/lib/quoteUtils';
import { TourFormData, QuoteWithItems } from '@/lib/types';

export default function TourQuotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get('quoteId');

  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<QuoteWithItems | null>(null);
  const [formData, setFormData] = useState<TourFormData>({
    tour_name: '',
    tour_date: '',
    duration_hours: 8,
    participant_count: 2,
    pickup_location: '',
    tour_type: '',
    language: 'korean',
    special_requests: ''
  });

  useEffect(() => {
    if (!quoteId) {
      alert('견적 ID가 필요합니다.');
      router.push('/mypage/quotes/new');
      return;
    }
    loadQuote();
  }, [quoteId, router]);

  const loadQuote = async () => {
    if (!quoteId) return;
    
    const quoteData = await getQuoteWithItems(quoteId);
    if (quoteData) {
      setQuote(quoteData);
    } else {
      alert('견적 정보를 불러올 수 없습니다.');
      router.push('/mypage/quotes/new');
    }
  };

  const handleInputChange = (field: keyof TourFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quoteId) {
      alert('견적 ID가 없습니다.');
      return;
    }

    if (!formData.tour_name || !formData.tour_date) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }

    if (formData.participant_count < 1) {
      alert('참가자 수는 1명 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    try {
      const result = await addTourToQuote(quoteId, formData);
      if (result) {
        alert('투어 견적이 추가되었습니다!');
        router.push(`/mypage/quotes/${quoteId}/view`);
      } else {
        alert('투어 견적 추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('투어 견적 추가 중 오류:', error);
      alert('오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!quote) {
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
      <div className="bg-gradient-to-br from-orange-200 via-amber-200 to-yellow-100 text-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">🗺️ 투어 견적 신청</h1>
              <p className="text-lg opacity-90">
                전문 가이드와 함께하는 맞춤 투어를 위한 견적을 작성해주세요.
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← 뒤로가기
            </button>
          </div>
          
          {/* 견적 정보 */}
          <div className="bg-white/70 backdrop-blur rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">현재 견적 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>견적명: <span className="font-semibold text-blue-600">{quote.title}</span></div>
              <div>상태: {quote.status === 'draft' ? '작성 중' : quote.status}</div>
              <div>총 서비스 수: {quote.items.length}개</div>
            </div>
          </div>
        </div>
      </div>

      {/* 폼 */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">투어 정보 입력</h2>
            
            {/* 투어 기본 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  투어명 *
                </label>
                <input
                  type="text"
                  value={formData.tour_name}
                  onChange={(e) => handleInputChange('tour_name', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="예: 하롱베이 일일투어, 서울 시티투어, 제주도 동부 투어"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  투어 날짜 *
                </label>
                <input
                  type="date"
                  value={formData.tour_date}
                  onChange={(e) => handleInputChange('tour_date', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  투어 시간 (시간)
                </label>
                <select
                  value={formData.duration_hours}
                  onChange={(e) => handleInputChange('duration_hours', parseInt(e.target.value) || 8)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={4}>반나절 (4시간)</option>
                  <option value={8}>종일 (8시간)</option>
                  <option value={12}>12시간</option>
                  <option value={24}>1박 2일</option>
                  <option value={48}>2박 3일</option>
                </select>
              </div>
            </div>

            {/* 인원 및 언어 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  참가자 수 *
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.participant_count}
                  onChange={(e) => handleInputChange('participant_count', parseInt(e.target.value) || 1)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  가이드 언어 *
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => handleInputChange('language', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="korean">한국어</option>
                  <option value="english">영어</option>
                  <option value="chinese">중국어</option>
                  <option value="japanese">일본어</option>
                  <option value="vietnamese">베트남어</option>
                </select>
              </div>
            </div>

            {/* 투어 타입 및 픽업 위치 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  투어 타입
                </label>
                <select
                  value={formData.tour_type}
                  onChange={(e) => handleInputChange('tour_type', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">선택해주세요</option>
                  <option value="sightseeing">관광</option>
                  <option value="cultural">문화체험</option>
                  <option value="adventure">모험/액티비티</option>
                  <option value="food">음식투어</option>
                  <option value="shopping">쇼핑투어</option>
                  <option value="nature">자연탐방</option>
                  <option value="historical">역사탐방</option>
                  <option value="cruise">크루즈투어</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  픽업 위치
                </label>
                <input
                  type="text"
                  value={formData.pickup_location}
                  onChange={(e) => handleInputChange('pickup_location', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="예: 호텔명, 지하철역, 공항 등"
                />
              </div>
            </div>

            {/* 투어 일정 정보 */}
            {formData.tour_date && formData.duration_hours && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">투어 일정</h3>
                <div className="text-green-700">
                  <div>날짜: {new Date(formData.tour_date).toLocaleDateString('ko-KR')}</div>
                  <div>시간: {formData.duration_hours}시간</div>
                  <div>참가자: {formData.participant_count}명</div>
                  <div>언어: {
                    formData.language === 'korean' ? '한국어' :
                    formData.language === 'english' ? '영어' :
                    formData.language === 'chinese' ? '중국어' :
                    formData.language === 'japanese' ? '일본어' :
                    formData.language === 'vietnamese' ? '베트남어' : formData.language
                  }</div>
                </div>
              </div>
            )}

            {/* 특별 요청 사항 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                특별 요청사항
              </label>
              <textarea
                value={formData.special_requests}
                onChange={(e) => handleInputChange('special_requests', e.target.value)}
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="선호하는 일정, 음식 제한사항, 접근성 요구사항, 특별한 관심사 등을 입력해주세요..."
              />
            </div>

            {/* 버튼 */}
            <div className="flex gap-4 justify-end">
              <button
                type="button"
                onClick={() => router.push('/mypage/quotes/new')}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '추가 중...' : '견적에 추가'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
