'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';

function AirportQuoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get('quoteId');

  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  
  // 단계별 옵션들 (airport_price 테이블 기준)
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [routeOptions, setRouteOptions] = useState<string[]>([]);
  const [carTypeOptions, setCarTypeOptions] = useState<string[]>([]);

  // 선택된 값들
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedCarType, setSelectedCarType] = useState('');

  const [selectedAirportCode, setSelectedAirportCode] = useState(''); // 검색된 공항 코드 표시용

  const [formData, setFormData] = useState({
    special_requests: ''
  });

  useEffect(() => {
    if (!quoteId) {
      alert('견적 ID가 필요합니다.');
      router.push('/mypage');
      return;
    }
    loadCategoryOptions();
    loadQuote();
  }, [quoteId, router]);

  // 카테고리 선택 시 경로 옵션 업데이트
  useEffect(() => {
    if (selectedCategory) {
      loadRouteOptions(selectedCategory);
    } else {
      setRouteOptions([]);
      setSelectedRoute('');
    }
  }, [selectedCategory]);

  // 카테고리와 경로가 선택될 때 차량 타입 목록 업데이트
  useEffect(() => {
    if (selectedCategory && selectedRoute) {
      loadCarTypeOptions(selectedCategory, selectedRoute);
    } else {
      setCarTypeOptions([]);
      setSelectedCarType('');
    }
  }, [selectedCategory, selectedRoute]);

  // 모든 조건이 선택되면 공항 코드 조회
  useEffect(() => {
    if (selectedCategory && selectedRoute && selectedCarType) {
      getAirportCodeFromConditions(selectedCategory, selectedRoute, selectedCarType)
        .then(code => setSelectedAirportCode(code))
        .catch(() => setSelectedAirportCode(''));
    } else {
      setSelectedAirportCode('');
    }
  }, [selectedCategory, selectedRoute, selectedCarType]);

  const loadCategoryOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('airport_price')
        .select('airport_category')
        .order('airport_category');

      if (error) throw error;
      
      // 중복 제거
      const uniqueCategories = [...new Set(data.map((item: any) => item.airport_category).filter(Boolean))] as string[];
      setCategoryOptions(uniqueCategories);
    } catch (error) {
      console.error('공항 카테고리 로드 실패:', error);
    }
  };

  const loadRouteOptions = async (category: string) => {
    try {
      const { data, error } = await supabase
        .from('airport_price')
        .select('airport_route')
        .eq('airport_category', category)
        .order('airport_route');

      if (error) throw error;
      
      // 중복 제거
      const uniqueRoutes = [...new Set(data.map((item: any) => item.airport_route).filter(Boolean))] as string[];
      setRouteOptions(uniqueRoutes);
    } catch (error) {
      console.error('공항 경로 옵션 로드 실패:', error);
    }
  };

  const loadCarTypeOptions = async (category: string, route: string) => {
    try {
      const { data, error } = await supabase
        .from('airport_price')
        .select('airport_car_type')
        .eq('airport_category', category)
        .eq('airport_route', route)
        .order('airport_car_type');

      if (error) throw error;
      
      // 중복 제거
      const uniqueCarTypes = [...new Set(data.map((item: any) => item.airport_car_type).filter(Boolean))] as string[];
      setCarTypeOptions(uniqueCarTypes);
    } catch (error) {
      console.error('공항 차량 타입 옵션 로드 실패:', error);
    }
  };

  const loadQuote = async () => {
    if (!quoteId) return;
    
    try {
      const { data, error } = await supabase
        .from('quote')
        .select('*')
        .eq('id', quoteId)
        .single();
      
      if (error) throw error;
      setQuote(data);
    } catch (error) {
      console.error('견적 정보 로드 실패:', error);
      alert('견적 정보를 불러올 수 없습니다.');
      router.push('/mypage/quotes');
    }
  };

  // 3가지 조건으로 airport_code 조회
  const getAirportCodeFromConditions = async (category: string, route: string, carType: string) => {
    try {
      const { data, error } = await supabase
        .from('airport_price')
        .select('airport_code')
        .eq('airport_category', category)
        .eq('airport_route', route)
        .eq('airport_car_type', carType)
        .single();

      if (error) throw error;
      return data.airport_code;
    } catch (error) {
      console.error('airport_code 조회 실패:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCategory || !selectedRoute || !selectedCarType) {
      alert('모든 필수 항목을 선택해주세요.');
      return;
    }

    if (!quoteId) {
      alert('견적 ID가 없습니다.');
      return;
    }

    setLoading(true);

    try {
      // 3가지 조건으로 airport_code 조회
      const airportCode = await getAirportCodeFromConditions(
        selectedCategory, 
        selectedRoute, 
        selectedCarType
      );

      // 공항 폼 데이터 구성 - 필수 필드만 포함
      const airportData = {
        airport_code: airportCode,
        ...(formData.special_requests && { special_requests: formData.special_requests })
      };

      console.log('✈️ 공항 데이터:', airportData);

      // 1. 공항 서비스 생성
      const { data: airportServiceData, error: airportError } = await supabase
        .from('airport')
        .insert(airportData)
        .select()
        .single();

      if (airportError) {
        console.error('❌ 공항 서비스 생성 오류:', airportError);
        alert(`공항 서비스 생성 실패: ${airportError.message}`);
        return;
      }

      console.log('✅ 공항 서비스 생성 성공:', airportServiceData);

      // 2. 견적 아이템 생성
      const { data: itemData, error: itemError } = await supabase
        .from('quote_item')
        .insert({
          quote_id: quoteId,
          service_type: 'airport',
          service_ref_id: airportServiceData.id,
          quantity: 1,
          unit_price: 0,
          total_price: 0
        })
        .select()
        .single();

      if (itemError) {
        console.error('❌ 견적 아이템 생성 오류:', itemError);
        alert(`견적 아이템 생성 실패: ${itemError.message}`);
        return;
      }

      console.log('✅ 견적 아이템 생성 성공:', itemData);

      alert('공항 서비스가 견적에 추가되었습니다!');
      router.push(`/mypage/quotes/${quoteId}/view`);

    } catch (error) {
      console.error('❌ 공항 견적 추가 중 오류:', error);
      alert('오류가 발생했습니다: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = selectedCategory && selectedRoute && selectedCarType;

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
              <h1 className="text-3xl font-bold mb-2">✈️ 공항 견적</h1>
              <p className="text-lg opacity-90">
                공항 픽업, 드롭오프, 이동 서비스를 위한 견적을 작성해주세요.
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← 뒤
            </button>
          </div>
          
          {/* 견적 정보 */}
          <div className="bg-white/70 backdrop-blur rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">현재 견적 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>견적명: <span className="font-semibold text-blue-600">{quote.title}</span></div>
              <div>상태: {quote.status === 'draft' ? '작성 중' : quote.status}</div>
              <div>작성일: {new Date(quote.created_at).toLocaleDateString('ko-KR')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 폼 */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">공항 서비스 정보 입력</h2>
            
            {/* 공항 안내 카드 */}
            <div className="bg-sky-600 rounded-lg p-6 mb-6 border border-sky-700">
              <h3 className="text-white text-lg font-semibold mb-2">✈️ 견적안내</h3>
              <p className="text-white/90 text-sm">공항 픽업/드롭오프 서비스 예약을 위해 아래 정보를 순서대로 입력해 주세요.<br/>정확한 카테고리, 경로, 차량 정보를 입력하시면 빠른 견적 안내가 가능합니다.</p>
            </div>

            {/* 공항 서비스 선택 폼 */}
            <div className="space-y-6">
              {/* 1단계: 카테고리 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📋 공항 카테고리 *
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">카테고리를 선택하세요</option>
                  {categoryOptions.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* 2단계: 경로 선택 */}
              {selectedCategory && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🛣️ 공항 경로 *
                  </label>
                  <select
                    value={selectedRoute}
                    onChange={(e) => setSelectedRoute(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">경로를 선택하세요</option>
                    {routeOptions.map(route => (
                      <option key={route} value={route}>{route}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 3단계: 차량 타입 선택 */}
              {selectedCategory && selectedRoute && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🚙 차량 타입 *
                  </label>
                  <select
                    value={selectedCarType}
                    onChange={(e) => setSelectedCarType(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">차량 타입을 선택하세요</option>
                    {carTypeOptions.map(carType => (
                      <option key={carType} value={carType}>{carType}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 특별 요청사항 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📝 특별 요청사항
                </label>
                <textarea
                  value={formData.special_requests}
                  onChange={(e) => setFormData({...formData, special_requests: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="짐의 수량, 장애인 지동, 아이 카시트 필요 여부 등을 입력해주세요"
                />
              </div>

              {/* 선택 요약 */}
              {isFormValid && (
                <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-800 mb-3">✅ 선택 요약</h3>
                  <div className="text-green-700 space-y-2">
                    <div><strong>카테고리:</strong> {selectedCategory}</div>
                    <div><strong>경로:</strong> {selectedRoute}</div>
                    <div><strong>차량 타입:</strong> {selectedCarType}</div>
                    {selectedAirportCode && (
                      <div><strong>공항 코드:</strong> <span className="font-mono text-blue-600">{selectedAirportCode}</span></div>
                    )}
                    {formData.special_requests && <div><strong>특별 요청:</strong> {formData.special_requests}</div>}
                  </div>
                </div>
              )}
            </div>

            {/* 제출 버튼 */}
            <div className="flex justify-center space-x-4 pt-6 mt-8">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={!isFormValid || loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '처리 중...' : '견적에 추가'}
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

