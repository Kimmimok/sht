'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import { addAirportToQuote, getQuoteWithItems } from '@/lib/quoteUtils';
import { AirportFormData, QuoteWithItems } from '@/lib/types';

function AirportQuoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get('quoteId');

  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<QuoteWithItems | null>(null);
  const [formData, setFormData] = useState<AirportFormData>({
    service_type: 'pickup',
    flight_number: '',
    arrival_date: '',
    departure_date: '',
    pickup_location: '',
    dropoff_location: '',
    passenger_count: 2,
    vehicle_type: '',
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

  const handleInputChange = (field: keyof AirportFormData, value: string | number) => {
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

    if (formData.passenger_count < 1) {
      alert('승객 수는 1명 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    try {
      const result = await addAirportToQuote(quoteId, formData);
      if (result) {
        alert('공항 서비스 견적이 추가되었습니다!');
        router.push(`/mypage/quotes/${quoteId}/view`);
      } else {
        alert('공항 서비스 견적 추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('공항 서비스 견적 추가 중 오류:', error);
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
      <div className="bg-gradient-to-br from-sky-200 via-blue-200 to-indigo-100 text-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">✈️ 공항 서비스 견적 신청</h1>
              <p className="text-lg opacity-90">
                공항 픽업, 드롭오프, 이동 서비스를 위한 견적을 작성해주세요.
              </p>
            </div>
            <button
              onClick={() => router.push('/mypage/quotes/new')}
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
            <h2 className="text-2xl font-bold text-gray-800 mb-6">공항 서비스 정보 입력</h2>
            
            {/* 서비스 타입 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                서비스 타입 *
              </label>
              <select
                value={formData.service_type}
                onChange={(e) => handleInputChange('service_type', e.target.value as 'pickup' | 'dropoff' | 'transfer')}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="pickup">공항 픽업 (공항에서 목적지로)</option>
                <option value="dropoff">공항 드롭오프 (목적지에서 공항으로)</option>
                <option value="transfer">공항 경유 (공항을 거치는 이동)</option>
              </select>
            </div>

            {/* 항공편 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  항공편 번호
                </label>
                <input
                  type="text"
                  value={formData.flight_number}
                  onChange={(e) => handleInputChange('flight_number', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="예: KE123, OZ456"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  승객 수 *
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.passenger_count}
                  onChange={(e) => handleInputChange('passenger_count', parseInt(e.target.value) || 1)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* 날짜 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  도착일 (픽업/경유 시)
                </label>
                <input
                  type="date"
                  value={formData.arrival_date}
                  onChange={(e) => handleInputChange('arrival_date', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  출발일 (드롭오프/경유 시)
                </label>
                <input
                  type="date"
                  value={formData.departure_date}
                  onChange={(e) => handleInputChange('departure_date', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* 위치 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  픽업 장소
                </label>
                <input
                  type="text"
                  value={formData.pickup_location}
                  onChange={(e) => handleInputChange('pickup_location', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="예: 인천국제공항 1터미널, 호텔명 등"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  목적지
                </label>
                <input
                  type="text"
                  value={formData.dropoff_location}
                  onChange={(e) => handleInputChange('dropoff_location', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="예: 명동역, 강남역, 호텔명 등"
                />
              </div>
            </div>

            {/* 차량 타입 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                차량 타입
              </label>
              <select
                value={formData.vehicle_type}
                onChange={(e) => handleInputChange('vehicle_type', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">선택해주세요</option>
                <option value="sedan">세단 (1-3명)</option>
                <option value="suv">SUV (1-5명)</option>
                <option value="van">밴 (1-8명)</option>
                <option value="minibus">미니버스 (9-15명)</option>
                <option value="bus">대형버스 (16명 이상)</option>
              </select>
            </div>

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
                placeholder="짐의 수량, 장애인 지동, 아이 카시트 필요 여부 등을 입력해주세요..."
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

export default function AirportQuotePage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64">로딩 중...</div>}>
      <AirportQuoteContent />
    </Suspense>
  );
}

