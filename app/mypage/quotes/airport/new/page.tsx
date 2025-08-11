'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import { calculateServiceQuantity } from '@/lib/calculateServiceQuantity';

function AirportQuoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get('quoteId');
  const itemId = searchParams.get('itemId');
  const serviceRefId = searchParams.get('serviceRefId');
  const mode = searchParams.get('mode');

  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // 단계별 옵션들 (airport_price 테이블 기준)
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  // A(첫 서비스), B(추가 서비스) 각각의 경로/차량타입 옵션
  const [routeOptions, setRouteOptions] = useState<string[]>([]);
  const [carTypeOptions, setCarTypeOptions] = useState<string[]>([]);
  const [routeOptions2, setRouteOptions2] = useState<string[]>([]);
  const [carTypeOptions2, setCarTypeOptions2] = useState<string[]>([]);

  // 서비스 종류: pickup, sending, both
  const [applyType, setApplyType] = useState<'pickup' | 'sending' | 'both'>('pickup');

  // 선택된 값들 - A(메인), B(추가)
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedCarType, setSelectedCarType] = useState('');
  const [selectedCategory2, setSelectedCategory2] = useState('');
  const [selectedRoute2, setSelectedRoute2] = useState('');
  const [selectedCarType2, setSelectedCarType2] = useState('');

  // 신청 종류에 따른 자동 카테고리 매핑
  const getCategoryFromApplyType = (type: 'pickup' | 'sending' | 'both') => {
    switch (type) {
      case 'pickup': return '픽업';
      case 'sending': return '샌딩';
      case 'both': return '픽업'; // both일 때는 첫 번째가 픽업
      default: return '';
    }
  };

  const getCategory2FromApplyType = (type: 'pickup' | 'sending' | 'both') => {
    return type === 'both' ? '샌딩' : '';
  };

  const [selectedAirportCode, setSelectedAirportCode] = useState(''); // A 코드 표시용
  const [selectedAirportCode2, setSelectedAirportCode2] = useState(''); // B 코드 표시용

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

    // 수정 모드인 경우 기존 데이터 로드
    if (mode === 'edit' && itemId && serviceRefId) {
      setIsEditMode(true);
      loadExistingQuoteData();
    }
  }, [quoteId, router, mode, itemId, serviceRefId]);

  // 카테고리 선택 시 경로 옵션 업데이트 (A)
  useEffect(() => {
    if (selectedCategory) {
      loadRouteOptions(selectedCategory);
    } else {
      setRouteOptions([]);
      setSelectedRoute('');
    }
  }, [selectedCategory]);

  // 카테고리와 경로가 선택될 때 차량 타입 목록 업데이트 (A)
  useEffect(() => {
    if (selectedCategory && selectedRoute) {
      loadCarTypeOptions(selectedCategory, selectedRoute);
    } else {
      setCarTypeOptions([]);
      setSelectedCarType('');
    }
  }, [selectedCategory, selectedRoute]);

  // 모든 조건이 선택되면 공항 코드 조회 (A)
  useEffect(() => {
    if (selectedCategory && selectedRoute && selectedCarType) {
      getAirportCodeFromConditions(selectedCategory, selectedRoute, selectedCarType)
        .then(code => setSelectedAirportCode(code))
        .catch(() => setSelectedAirportCode(''));
    } else {
      setSelectedAirportCode('');
    }
  }, [selectedCategory, selectedRoute, selectedCarType]);

  // 카테고리 선택 시 경로 옵션 업데이트 (B)
  useEffect(() => {
    if (selectedCategory2) {
      loadRouteOptions(selectedCategory2).then(() => {/* noop */ });
      // 동일 쿼리를 사용하지만 결과는 별도 상태에 저장 필요 → 별도 래퍼 사용
      (async () => {
        try {
          const { data, error } = await supabase
            .from('airport_price')
            .select('airport_route')
            .eq('airport_category', selectedCategory2)
            .order('airport_route');
          if (error) throw error;
          const uniqueRoutes = [...new Set((data || []).map((item: any) => item.airport_route).filter(Boolean))] as string[];
          setRouteOptions2(uniqueRoutes);
        } catch {
          setRouteOptions2([]);
        }
      })();
    } else {
      setRouteOptions2([]);
      setSelectedRoute2('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory2]);

  // 카테고리와 경로가 선택될 때 차량 타입 목록 업데이트 (B)
  useEffect(() => {
    if (selectedCategory2 && selectedRoute2) {
      (async () => {
        try {
          const { data, error } = await supabase
            .from('airport_price')
            .select('airport_car_type')
            .eq('airport_category', selectedCategory2)
            .eq('airport_route', selectedRoute2)
            .order('airport_car_type');
          if (error) throw error;
          const uniqueCarTypes = [...new Set((data || []).map((item: any) => item.airport_car_type).filter(Boolean))] as string[];
          setCarTypeOptions2(uniqueCarTypes);
        } catch {
          setCarTypeOptions2([]);
        }
      })();
    } else {
      setCarTypeOptions2([]);
      setSelectedCarType2('');
    }
  }, [selectedCategory2, selectedRoute2]);

  // 모든 조건이 선택되면 공항 코드 조회 (B)
  useEffect(() => {
    if (selectedCategory2 && selectedRoute2 && selectedCarType2) {
      getAirportCodeFromConditions(selectedCategory2, selectedRoute2, selectedCarType2)
        .then(code => setSelectedAirportCode2(code))
        .catch(() => setSelectedAirportCode2(''));
    } else {
      setSelectedAirportCode2('');
    }
  }, [selectedCategory2, selectedRoute2, selectedCarType2]);

  // 픽업+샌딩 모드에서 첫 서비스 카테고리가 변경되면 추가 서비스 카테고리도 동기화
  useEffect(() => {
    if (applyType === 'both' && selectedCategory) {
      setSelectedCategory2(selectedCategory);
    }
  }, [applyType, selectedCategory]);

  // 신청 종류 변경 시 카테고리 자동 설정
  useEffect(() => {
    const autoCategory = getCategoryFromApplyType(applyType);
    const autoCategory2 = getCategory2FromApplyType(applyType);

    setSelectedCategory(autoCategory);
    setSelectedCategory2(autoCategory2);

    // 카테고리가 자동 설정되면 경로 옵션을 로드
    if (autoCategory) {
      loadRouteOptions(autoCategory);
    }
  }, [applyType]);

  // 기존 견적 데이터 로드 (수정 모드용)
  const loadExistingQuoteData = async () => {
    try {
      setLoading(true);

      const { data: serviceData, error: serviceError } = await supabase
        .from('airport')
        .select('*')
        .eq('id', serviceRefId)
        .single();

      if (serviceError || !serviceData) {
        console.error('서비스 데이터 조회 오류:', serviceError);
        alert('서비스 데이터를 찾을 수 없습니다.');
        return;
      }

      // airport_code를 통해 airport_price에서 조건들을 역으로 찾기
      if (serviceData.airport_code) {
        const { data: priceData, error: priceError } = await supabase
          .from('airport_price')
          .select('*')
          .eq('airport_code', serviceData.airport_code)
          .single();

        if (priceError || !priceData) {
          console.error('가격 정보 조회 오류:', priceError);
          // 가격 정보를 찾지 못하면 선택값 복원을 생략하고 코드만 표시
          setSelectedAirportCode(serviceData.airport_code);
        } else {
          // 가격 정보에서 조건들을 복원
          setSelectedCategory(priceData.airport_category);
          await loadRouteOptions(priceData.airport_category);

          setSelectedRoute(priceData.airport_route);
          await loadCarTypeOptions(priceData.airport_category, priceData.airport_route);

          setSelectedCarType(priceData.airport_car_type);
          setSelectedAirportCode(priceData.airport_code);
        }
      }

      setFormData(prev => ({
        ...prev,
        special_requests: serviceData.special_requests || ''
      }));

      console.log('기존 공항 견적 데이터 로드 완료:', serviceData);
    } catch (error) {
      console.error('기존 견적 데이터 로드 오류:', error);
      alert('기존 견적 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const mainValid = !!(selectedCategory && selectedRoute && selectedCarType);
    const extraValid = applyType === 'both' ? !!(selectedCategory2 && selectedRoute2 && selectedCarType2) : true;
    if (!mainValid || !extraValid) {
      alert('필수 항목을 모두 선택해주세요.');
      return;
    }

    if (!quoteId) {
      alert('견적 ID가 없습니다.');
      return;
    }

    setLoading(true);

    try {
      if (isEditMode && serviceRefId) {
        // 수정 모드: 기존 데이터 업데이트
        await updateExistingQuoteData();
      } else {
        // 신규 생성 모드: 새 데이터 생성
        await createNewQuoteData();
      }

      alert(isEditMode ? '공항 서비스가 성공적으로 수정되었습니다!' : '공항 서비스가 견적에 추가되었습니다!');
      router.push(`/mypage/quotes/new?quoteId=${quoteId}`);
    } catch (error) {
      console.error('❌ 공항 견적 처리 중 오류:', error);
      alert('오류가 발생했습니다: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 기존 견적 데이터 업데이트 (airport 테이블 존재 컬럼만 저장)
  const updateExistingQuoteData = async () => {
    if (applyType === 'both') {
      // 픽업+샌딩일 때는 수정 모드에서 새로 생성 (기존 데이터 삭제 후 2개 생성)
      // 기존 데이터 삭제
      await deleteExistingData();
      // 새로 2개 생성
      await createTwoAirportServices();
    } else {
      // 단일 서비스 수정
      await updateSingleAirportService();
    }
  };

  // 기존 데이터 삭제 (수정 모드에서 픽업+샌딩으로 변경 시)
  const deleteExistingData = async () => {
    // 견적 아이템 삭제
    const { error: itemDeleteError } = await supabase
      .from('quote_item')
      .delete()
      .eq('id', itemId);

    if (itemDeleteError) {
      throw new Error(`기존 견적 아이템 삭제 실패: ${itemDeleteError.message}`);
    }

    // 공항 서비스 삭제
    const { error: serviceDeleteError } = await supabase
      .from('airport')
      .delete()
      .eq('id', serviceRefId);

    if (serviceDeleteError) {
      throw new Error(`기존 공항 서비스 삭제 실패: ${serviceDeleteError.message}`);
    }

    console.log('✅ 기존 데이터 삭제 성공');
  };

  // 단일 공항 서비스 수정
  const updateSingleAirportService = async () => {
    const airportCode = await getAirportCodeFromConditions(
      selectedCategory,
      selectedRoute,
      selectedCarType
    );

    const airportData = {
      airport_code: airportCode,
      special_requests: formData.special_requests?.trim() || null
    } as const;

    const { error: updateError } = await supabase
      .from('airport')
      .update(airportData)
      .eq('id', serviceRefId);

    if (updateError) {
      throw new Error(`공항 서비스 수정 실패: ${updateError.message}`);
    }

    console.log('✅ 단일 공항 서비스 수정 성공');
  };

  // 새 견적 데이터 생성 (airport 테이블 존재 컬럼만 저장)
  const createNewQuoteData = async () => {
    if (applyType === 'both') {
      // 픽업+샌딩일 때 2개 행으로 분리 저장
      await createTwoAirportServices();
    } else {
      // 단일 서비스 저장
      await createSingleAirportService();
    }
  };

  // 단일 공항 서비스 생성
  const createSingleAirportService = async () => {
    const airportCode = await getAirportCodeFromConditions(
      selectedCategory,
      selectedRoute,
      selectedCarType
    );

    const airportData = {
      airport_code: airportCode,
      special_requests: formData.special_requests?.trim() || null
    } as const;

    console.log('✈️ 단일 공항 데이터:', airportData);

    // 1. 공항 서비스 생성
    const { data: airportServiceData, error: airportError } = await supabase
      .from('airport')
      .insert(airportData)
      .select()
      .single();

    if (airportError) {
      throw new Error(`공항 서비스 생성 실패: ${airportError.message}`);
    }

    console.log('✅ 단일 공항 서비스 생성 성공:', airportServiceData);

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
      throw new Error(`견적 아이템 생성 실패: ${itemError.message}`);
    }

    console.log('✅ 견적 아이템 생성 성공:', itemData);
  };

  // 픽업+샌딩 2개 공항 서비스 생성
  const createTwoAirportServices = async () => {
    // 첫 번째 서비스 (픽업)
    const airportCode1 = await getAirportCodeFromConditions(
      selectedCategory,
      selectedRoute,
      selectedCarType
    );

    const airportData1 = {
      airport_code: airportCode1,
      special_requests: formData.special_requests?.trim() || null
    } as const;

    console.log('✈️ 픽업 공항 데이터:', airportData1);

    // 1-1. 첫 번째 공항 서비스 생성 (픽업)
    const { data: airportServiceData1, error: airportError1 } = await supabase
      .from('airport')
      .insert(airportData1)
      .select()
      .single();

    if (airportError1) {
      throw new Error(`픽업 공항 서비스 생성 실패: ${airportError1.message}`);
    }

    console.log('✅ 픽업 공항 서비스 생성 성공:', airportServiceData1);

    // 1-2. 첫 번째 견적 아이템 생성 (픽업)
    const { data: itemData1, error: itemError1 } = await supabase
      .from('quote_item')
      .insert({
        quote_id: quoteId,
        service_type: 'airport',
        service_ref_id: airportServiceData1.id,
        quantity: 1,
        unit_price: 0,
        total_price: 0
      })
      .select()
      .single();

    if (itemError1) {
      throw new Error(`픽업 견적 아이템 생성 실패: ${itemError1.message}`);
    }

    console.log('✅ 픽업 견적 아이템 생성 성공:', itemData1);

    // 두 번째 서비스 (샌딩)
    const airportCode2 = await getAirportCodeFromConditions(
      selectedCategory2,
      selectedRoute2,
      selectedCarType2
    );

    const airportData2 = {
      airport_code: airportCode2,
      special_requests: null // 추가 요청사항은 첫 번째에만
    } as const;

    console.log('✈️ 샌딩 공항 데이터:', airportData2);

    // 2-1. 두 번째 공항 서비스 생성 (샌딩)
    const { data: airportServiceData2, error: airportError2 } = await supabase
      .from('airport')
      .insert(airportData2)
      .select()
      .single();

    if (airportError2) {
      throw new Error(`샌딩 공항 서비스 생성 실패: ${airportError2.message}`);
    }

    console.log('✅ 샌딩 공항 서비스 생성 성공:', airportServiceData2);

    // 2-2. 두 번째 견적 아이템 생성 (샌딩)
    const { data: itemData2, error: itemError2 } = await supabase
      .from('quote_item')
      .insert({
        quote_id: quoteId,
        service_type: 'airport',
        service_ref_id: airportServiceData2.id,
        quantity: 1,
        unit_price: 0,
        total_price: 0
      })
      .select()
      .single();

    if (itemError2) {
      throw new Error(`샌딩 견적 아이템 생성 실패: ${itemError2.message}`);
    }

    console.log('✅ 샌딩 견적 아이템 생성 성공:', itemData2);
  };

  const isFormValid = (applyType === 'both')
    ? (selectedCategory && selectedRoute && selectedCarType && selectedCategory2 && selectedRoute2 && selectedCarType2)
    : (selectedCategory && selectedRoute && selectedCarType);

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
              <h1 className="text-2xl font-bold mb-2">✈️ 공항 견적</h1>
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


            {/* 공항 안내 카드 */}
            <div className="bg-sky-600 rounded-lg p-6 mb-6 border border-sky-700">
              <h3 className="text-white text-lg font-semibold mb-2">✈️ 견적안내</h3>
              <p className="text-white/90 text-sm">공항 픽업/드롭오프 서비스 예약을 위해 아래 정보를 순서대로 입력해 주세요.<br />정확한 카테고리, 경로, 차량 정보를 입력하시면 빠른 견적 안내가 가능합니다.</p>
            </div>

            {/* 공항 서비스 선택 폼 */}
            <div className="space-y-6">
              {/* 1단계: 신청 종류 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📋 신청 종류</label>
                <div className="flex gap-2 mb-4">
                  {(['both', 'pickup', 'sending'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setApplyType(t);
                        // 추가 서비스 선택값 초기화 (카테고리는 자동 설정되므로 제외)
                        if (t !== 'both') {
                          setSelectedRoute2('');
                          setSelectedCarType2('');
                          setRouteOptions2([]);
                          setCarTypeOptions2([]);
                          setSelectedAirportCode2('');
                        }
                      }}
                      className={`px-3 py-2 rounded border ${applyType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                    >
                      {t === 'pickup' ? '픽업만' : t === 'sending' ? '샌딩만' : '픽업+샌딩'}
                    </button>
                  ))}
                </div>

                {/* 자동 설정된 카테고리 표시 */}
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="text-sm font-medium text-blue-800 mb-1">
                    선택된 서비스: {applyType === 'pickup' ? '픽업만' : applyType === 'sending' ? '샌딩만' : '픽업+샌딩'}
                  </div>
                  <div className="text-sm text-blue-700">
                    {applyType === 'both' ? (
                      <>
                        첫 서비스: 픽업 카테고리 | 추가 서비스: 샌딩 카테고리
                      </>
                    ) : (
                      <>
                        카테고리: {getCategoryFromApplyType(applyType)}
                      </>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  {applyType === 'both' ? '픽업+샌딩 선택 시 첫 서비스=픽업, 추가 서비스=샌딩으로 자동 지정됩니다.' : '카테고리가 자동으로 설정되었습니다.'}
                </p>
              </div>              {/* 2단계: 경로 선택 */}
              {selectedCategory && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {`🛣️ 공항 경로 * (${applyType === 'both' ? '픽업' : applyType === 'pickup' ? '픽업' : '샌딩'})`}
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
                    {`🚙 차량 타입 * (${applyType === 'both' ? '픽업' : applyType === 'pickup' ? '픽업' : '샌딩'})`}
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

              {/* 추가 서비스 블록 (둘 다 선택한 경우) */}
              {applyType === 'both' && (
                <div className="mt-6 border-t pt-6">
                  <h4 className="font-semibold text-gray-800 mb-4">추가 서비스 (샌딩)</h4>
                  <div className="space-y-6">
                    {/* 자동 설정된 카테고리 표시 */}
                    <div>
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <div className="text-sm font-medium text-green-800 mb-1">
                          추가 서비스 카테고리
                        </div>
                        <div className="text-sm text-green-700">
                          카테고리: 샌딩 (자동 설정됨)
                        </div>
                      </div>
                    </div>

                    {/* 경로2 */}
                    {selectedCategory2 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">🛣️ 공항 경로 (샌딩)</label>
                        <select
                          value={selectedRoute2}
                          onChange={(e) => setSelectedRoute2(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">경로를 선택하세요</option>
                          {routeOptions2.map(route => (
                            <option key={route} value={route}>{route}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* 차량 타입2 */}
                    {selectedCategory2 && selectedRoute2 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">🚙 차량 타입 (샌딩)</label>
                        <select
                          value={selectedCarType2}
                          onChange={(e) => setSelectedCarType2(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">차량 타입을 선택하세요</option>
                          {carTypeOptions2.map(carType => (
                            <option key={carType} value={carType}>{carType}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
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
                  placeholder="짐의 수량, 장애인 지동, 아이 카시트 필요 여부 등을 입력해주세요"
                />
              </div>

              {/* 선택 요약 */}
              {isFormValid && (
                <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-800 mb-3">✅ 선택 요약</h3>
                  <div className="text-green-700 space-y-2">
                    <div className="font-medium text-gray-800">{`첫 서비스 (${applyType === 'both' || applyType === 'pickup' ? '픽업' : '샌딩'})`}</div>
                    <div><strong>카테고리:</strong> {selectedCategory}</div>
                    <div><strong>경로:</strong> {selectedRoute}</div>
                    <div><strong>차량 타입:</strong> {selectedCarType}</div>
                    {selectedAirportCode && (
                      <div><strong>공항 코드:</strong> <span className="font-mono text-blue-600">{selectedAirportCode}</span></div>
                    )}
                    {applyType === 'both' && (
                      <>
                        <div className="mt-4 font-medium text-gray-800">추가 서비스 (샌딩)</div>
                        <div><strong>카테고리:</strong> {selectedCategory2}</div>
                        <div><strong>경로:</strong> {selectedRoute2}</div>
                        <div><strong>차량 타입:</strong> {selectedCarType2}</div>
                        {selectedAirportCode2 && (
                          <div><strong>공항 코드:</strong> <span className="font-mono text-blue-600">{selectedAirportCode2}</span></div>
                        )}
                      </>
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
                {loading ? '처리 중...' : (isEditMode ? '수정 저장' : '견적에 추가')}
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

