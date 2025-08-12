'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';

function RentcarQuoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get('quoteId');
  const itemId = searchParams.get('itemId');
  const serviceRefId = searchParams.get('serviceRefId');
  const mode = searchParams.get('mode');

  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // 단계별 옵션들 (rent_price 테이블 기준)
  const [routeOptions, setRouteOptions] = useState<string[]>([]);
  const [carTypeOptions, setCarTypeOptions] = useState<string[]>([]);

  // 선택된 값들
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedCarType, setSelectedCarType] = useState('');

  const [selectedRentCode, setSelectedRentCode] = useState(''); // 검색된 렌트 코드 표시용

  const [formData, setFormData] = useState({
    special_requests: ''
  });

  useEffect(() => {
    if (!quoteId) {
      alert('견적 ID가 필요합니다.');
      router.push('/mypage');
      return;
    }
    const initializeData = async () => {
      if (isEditMode && itemId && serviceRefId) {
        // 수정 모드: 기존 데이터 로드
        await loadExistingQuoteData();
      }
      // 카테고리는 고정 버튼으로 처리하므로 별도 로드 불필요
    };

    initializeData();
    loadQuote();

    // 수정 모드인 경우 기존 데이터 로드
    if (mode === 'edit' && itemId && serviceRefId) {
      setIsEditMode(true);
      loadExistingQuoteData();
    }
  }, [quoteId, router, mode, itemId, serviceRefId]);

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

  // 기존 견적 데이터 로드 (수정 모드용)
  const loadExistingQuoteData = async () => {
    try {
      setLoading(true);

      const { data: serviceData, error: serviceError } = await supabase
        .from('rentcar')
        .select('*')
        .eq('id', serviceRefId)
        .single();

      if (serviceError || !serviceData) {
        console.error('서비스 데이터 조회 오류:', serviceError);
        alert('서비스 데이터를 찾을 수 없습니다.');
        return;
      }

      // rentcar_code를 통해 rent_price에서 조건들을 역으로 찾기
      if (serviceData.rentcar_code) {
        const { data: priceData, error: priceError } = await supabase
          .from('rent_price')
          .select('*')
          .eq('rent_code', serviceData.rentcar_code)
          .single();

        if (priceError || !priceData) {
          console.error('렌터카 가격 정보 조회 오류:', priceError);
          alert('렌터카 가격 정보를 찾을 수 없습니다.');
          return;
        } else {
          // 가격 정보에서 조건들을 복원
          setSelectedCategory(priceData.rent_category);
          await loadRouteOptions(priceData.rent_category);

          setSelectedRoute(priceData.rent_route);
          await loadCarTypeOptions(priceData.rent_category, priceData.rent_route);

          setSelectedCarType(priceData.rent_car_type);
        }
      }

      setFormData(prev => ({
        ...prev,
        special_requests: serviceData.special_requests || ''
      }));

      console.log('기존 렌터카 견적 데이터 로드 완료:', serviceData);
    } catch (error) {
      console.error('기존 견적 데이터 로드 오류:', error);
      alert('기존 견적 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 모든 조건이 선택되면 렌트 코드 조회
  useEffect(() => {
    if (selectedCategory && selectedRoute && selectedCarType) {
      getRentCodeFromConditions(selectedCategory, selectedRoute, selectedCarType)
        .then(code => setSelectedRentCode(code))
        .catch(() => setSelectedRentCode(''));
    } else {
      setSelectedRentCode('');
    }
  }, [selectedCategory, selectedRoute, selectedCarType]);

  // 카테고리 표시명 변환 함수
  const getCategoryDisplayName = (category: string) => {
    switch (category) {
      case '당일':
        return '왕복 당일';
      case '다른날':
        return '왕복 다른날';
      case '안함':
        return '편도';
      default:
        return category;
    }
  };



  const loadRouteOptions = async (category: string) => {
    try {
      const { data, error } = await supabase
        .from('rent_price')
        .select('rent_route')
        .eq('rent_category', category)
        .order('rent_route');

      if (error) throw error;

      // 중복 제거
      const uniqueRoutes = [...new Set(data.map((item: any) => item.rent_route).filter(Boolean))] as string[];
      setRouteOptions(uniqueRoutes);
    } catch (error) {
      console.error('렌트카 경로 옵션 로드 실패:', error);
    }
  };

  const loadCarTypeOptions = async (category: string, route: string) => {
    try {
      const { data, error } = await supabase
        .from('rent_price')
        .select('rent_car_type')
        .eq('rent_category', category)
        .eq('rent_route', route)
        .order('rent_car_type');

      if (error) throw error;

      // 중복 제거
      const uniqueCarTypes = [...new Set(data.map((item: any) => item.rent_car_type).filter(Boolean))] as string[];
      setCarTypeOptions(uniqueCarTypes);
    } catch (error) {
      console.error('렌트카 차량 타입 옵션 로드 실패:', error);
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

  // 3가지 조건으로 rent_code 조회
  const getRentCodeFromConditions = async (category: string, route: string, carType: string) => {
    try {
      const { data, error } = await supabase
        .from('rent_price')
        .select('rent_code')
        .eq('rent_category', category)
        .eq('rent_route', route)
        .eq('rent_car_type', carType)
        .single();

      if (error) throw error;
      return data.rent_code;
    } catch (error) {
      console.error('rent_code 조회 실패:', error);
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
      // 3가지 조건으로 rent_code 조회
      const rentCode = await getRentCodeFromConditions(
        selectedCategory,
        selectedRoute,
        selectedCarType
      );

      // 렌트카 폼 데이터 구성 - 필수 필드만 포함
      const rentcarData = {
        rentcar_code: rentCode,
        ...(formData.special_requests && { special_requests: formData.special_requests })
      };

      console.log('🚗 렌트카 데이터:', rentcarData);

      if (isEditMode && serviceRefId) {
        // 수정 모드: 기존 렌트카 서비스 업데이트
        const { error: updateError } = await supabase
          .from('rentcar')
          .update(rentcarData)
          .eq('id', serviceRefId);

        if (updateError) {
          console.error('❌ 렌트카 서비스 수정 오류:', updateError);
          alert(`렌트카 서비스 수정 실패: ${updateError.message}`);
          return;
        }

        console.log('✅ 렌트카 서비스 수정 성공');
        alert('렌트카 정보가 수정되었습니다!');
      } else {
        // 생성 모드: 새 렌트카 서비스 생성
        const { data: rentcarServiceData, error: rentcarError } = await supabase
          .from('rentcar')
          .insert([rentcarData])
          .select()
          .single();

        if (rentcarError) {
          console.error('❌ 렌트카 서비스 생성 오류:', rentcarError);
          alert(`렌트카 서비스 생성 실패: ${rentcarError.message}`);
          return;
        }

        console.log('✅ 렌트카 서비스 생성 성공:', rentcarServiceData);

        // 견적 아이템 생성
        const { data: itemData, error: itemError } = await supabase
          .from('quote_item')
          .insert({
            quote_id: quoteId,
            service_type: 'rentcar',
            service_ref_id: rentcarServiceData.id,
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
        alert('렌트카 서비스가 견적에 추가되었습니다!');
      }

      // 수정 완료 후 견적 목록으로 이동
      router.push(`/mypage/quotes/new?quoteId=${quoteId}`);

    } catch (error) {
      console.error('❌ 렌트카 견적 처리 중 오류:', error);
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
      <div className="bg-gradient-to-br from-green-200 via-emerald-200 to-teal-100 text-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">🚗 렌트카 견적 신청</h1>
              <p className="text-lg opacity-90">
                편리한 렌트카 서비스를 위한 견적을 작성해주세요.
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← 뒤로
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
            <h2 className="text-2xl font-bold text-gray-800 mb-6">렌트카 정보 입력</h2>

            {/* 렌트카 안내 카드 */}
            <div className="bg-green-600 rounded-lg p-6 mb-6 border border-green-700">
              <h3 className="text-white text-lg font-semibold mb-2">🚗 견적안내</h3>
              <p className="text-white/90 text-sm">렌트카 예약을 위해 아래 정보를 순서대로 입력해 주세요.<br />정확한 카테고리, 경로, 차량 타입 정보를 입력하시면 빠른 견적 안내가 가능합니다.</p>
            </div>

            {/* 렌트카 서비스 선택 폼 */}
            <div className="space-y-6">
              {/* 1단계: 카테고리 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📋 렌트카 카테고리 *
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('당일')}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all text-center ${selectedCategory === '당일'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white hover:border-blue-300 text-gray-700'
                      }`}
                  >
                    <div className="font-medium">왕복 당일</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('다른날')}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all text-center ${selectedCategory === '다른날'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white hover:border-blue-300 text-gray-700'
                      }`}
                  >
                    <div className="font-medium">왕복 다른날</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('안함')}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all text-center ${selectedCategory === '안함'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white hover:border-blue-300 text-gray-700'
                      }`}
                  >
                    <div className="font-medium">편도</div>
                  </button>
                </div>
              </div>

              {/* 2단계: 경로 선택 */}
              {selectedCategory && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🛣️ 렌트카 경로 *
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
                  onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="네비게이션, 차일드시트, 픽업 위치, 반납 위치 등을 입력해주세요"
                />
              </div>

              {/* 선택 요약 */}
              {isFormValid && (
                <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-800 mb-3">✅ 선택 요약</h3>
                  <div className="text-green-700 space-y-2">
                    <div><strong>카테고리:</strong> {getCategoryDisplayName(selectedCategory)}</div>
                    <div><strong>경로:</strong> {selectedRoute}</div>
                    <div><strong>차량 타입:</strong> {selectedCarType}</div>
                    {selectedRentCode && (
                      <div><strong>렌트카 코드:</strong> <span className="font-mono text-blue-600">{selectedRentCode}</span></div>
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


export default function RentcarQuotePage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64">로딩 중...</div>}>
      <RentcarQuoteContent />
    </Suspense>
  );
}
