'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import { upgradeGuestToMember } from '@/lib/userRoleUtils';

interface QuoteDetail {
  id: string;
  status: string;
  payment_status?: string;
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
  users?: {
    name: string;
    email: string;
    phone_number?: string;
  };
  // 서비스 테이블 (견적 룸 제거됨)
  rentcar?: any[];
  cruise?: any[];
  airport?: any[];
  hotel?: any[];
  tour?: any[];
}

export default function QuoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = (
    Array.isArray((params as any)?.id)
      ? (params as any).id[0]
      : (params as any)?.id
  ) as string;

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [detailedServices, setDetailedServices] = useState<any>({});

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && quoteId) {
      loadQuoteDetail();
      loadDetailedServices();
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

      // 게스트 권한 허용 (users 테이블에 등록되지 않은 사용자도 접근 가능)
      console.log('✅ 사용자 인증 성공 (guest 포함):', user.id);
      setUser(user);
    } catch (error) {
      console.error('❌ 인증 확인 오류:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleReservation = async () => {
    if (!user || !quote?.id) return;
    try {
      // 1. 게스트를 멤버로 승격 시도
      const upgradeResult = await upgradeGuestToMember(user.id, user.email);
      if (!upgradeResult.success && upgradeResult.error) {
        console.error('권한 업그레이드 실패:', upgradeResult.error);
        alert('예약 권한 설정 중 오류가 발생했습니다.');
        return;
      }
      // 2. 예약 페이지로 이동 (견적 ID 포함)
      router.push(`/mypage/reservations?quoteId=${quote.id}`);
    } catch (error) {
      console.error('예약 처리 중 오류:', error);
      alert('예약 처리 중 오류가 발생했습니다.');
    }
  };

  const loadQuoteDetail = async () => {
    try {
      console.log('📋 견적 상세 정보 로딩 시작...', quoteId);

      // 견적 기본 정보 조회
      const { data: quoteData, error: quoteError } = await supabase
        .from('quote')
        .select('*, payment_status')
        .eq('id', quoteId)
        .single();

      if (quoteError) {
        console.error('❌ 견적 조회 실패:', quoteError);
        alert('견적을 찾을 수 없습니다.');
        router.push('/manager/quotes');
        return;
      }

      console.log('✅ 견적 기본 정보:', quoteData);

      // 사용자 정보 조회 (안전한 방식)
      let userData = null;
      try {
        const { data: userResult, error: userError } = await supabase
          .from('users')
          .select('id, name, email, phone_number')
          .eq('id', quoteData.user_id)
          .single();

        if (userError) {
          console.warn('⚠️ 사용자 정보 조회 실패:', userError);
        } else {
          userData = userResult;
        }
      } catch (userErr) {
        console.warn('⚠️ 사용자 정보 조회 예외:', userErr);
      }

      console.log('👤 사용자 정보:', userData);

      // quote_item을 통해 서비스 데이터 조회 (올바른 스키마 구조)
      const serviceQueries = await Promise.allSettled([
        // 객실 정보 (quote_room 테이블이 없을 수 있으므로 안전하게)
        supabase
          .from('quote_room')
          .select(`*`)
          .eq('quote_id', quoteId),

        // quote_item을 통한 각 서비스별 데이터 조회 (조인 없이 먼저 시도)
        supabase
          .from('quote_item')
          .select('*')
          .eq('quote_id', quoteId)
          .eq('service_type', 'rentcar'),

        supabase
          .from('quote_item')
          .select('*')
          .eq('quote_id', quoteId)
          .eq('service_type', 'cruise'),

        supabase
          .from('quote_item')
          .select('*')
          .eq('quote_id', quoteId)
          .eq('service_type', 'airport'),

        supabase
          .from('quote_item')
          .select('*')
          .eq('quote_id', quoteId)
          .eq('service_type', 'hotel'),

        supabase
          .from('quote_item')
          .select('*')
          .eq('quote_id', quoteId)
          .eq('service_type', 'tour')
      ]);

      console.log('🔍 각 테이블별 조회 상태:');
      serviceQueries.forEach((result, index) => {
        const tableNames = ['quote_room', 'rentcar(quote_item)', 'cruise(quote_item)', 'airport(quote_item)', 'hotel(quote_item)', 'tour(quote_item)'];
        console.log(`  ${tableNames[index]}: ${result.status}`);
        if (result.status === 'rejected') {
          console.log(`    에러:`, result.reason);
        }
      });

      // 결과 처리 및 상세 로깅

      // serviceQueries 인덱스 매핑
      // [0]=quote_room, [1]=rentcar(items), [2]=cruise(items), [3]=airport(items), [4]=hotel(items), [5]=tour(items)
      const rentcarItems = serviceQueries[1].status === 'fulfilled' ? (serviceQueries[1].value.data || []) : [];
      const cruiseItems = serviceQueries[2].status === 'fulfilled' ? (serviceQueries[2].value.data || []) : [];
      const airportItems = serviceQueries[3].status === 'fulfilled' ? (serviceQueries[3].value.data || []) : [];
      const hotelItems = serviceQueries[4].status === 'fulfilled' ? (serviceQueries[4].value.data || []) : [];
      const tourItems = serviceQueries[5].status === 'fulfilled' ? (serviceQueries[5].value.data || []) : [];

      // quote_item 데이터를 그대로 사용 (조인 없이)
      const carData = rentcarItems.map((item: any) => ({
        id: item.id,
        service_ref_id: item.service_ref_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        options: item.options,
        // 기본 필드들
        car_model: item.options?.car_model || '렌트카',
        pickup_date: item.options?.pickup_date || null,
        return_date: item.options?.return_date || null,
        pickup_location: item.options?.pickup_location || '미정',
        return_location: item.options?.return_location || '미정'
      }));

      const cruiseData = cruiseItems.map((item: any) => ({
        id: item.id,
        service_ref_id: item.service_ref_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        options: item.options,
        // 기본 필드들
        cruise_name: item.options?.cruise_name || '크루즈',
        departure_date: item.options?.departure_date || null,
        return_date: item.options?.return_date || null,
        departure_port: item.options?.departure_port || '미정'
      }));

      const airportData = airportItems.map((item: any) => ({
        id: item.id,
        service_ref_id: item.service_ref_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        options: item.options,
        // 기본 필드들
        service_type: item.options?.service_type || '공항 서비스',
        flight_number: item.options?.flight_number || '미정'
      }));

      const hotelData = hotelItems.map((item: any) => ({
        id: item.id,
        service_ref_id: item.service_ref_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        options: item.options,
        // 기본 필드들
        hotel_name: item.options?.hotel_name || '호텔',
        check_in_date: item.options?.check_in_date || null,
        check_out_date: item.options?.check_out_date || null
      }));

      const tourData = tourItems.map((item: any) => ({
        id: item.id,
        service_ref_id: item.service_ref_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        options: item.options,
        // 기본 필드들
        tour_name: item.options?.tour_name || '투어',
        tour_date: item.options?.tour_date || null,
        duration_hours: item.options?.duration_hours || null
      }));

      // 상세 에러 로깅 및 성공 여부 확인
      serviceQueries.forEach((result, index) => {
        const names = ['객실(quote_room)', '렌트카(rentcar)', '크루즈(cruise)', '공항(airport)', '호텔(hotel)', '투어(tour)'];
        if (result.status === 'rejected') {
          console.warn(`❌ ${names[index]} 테이블 조회 실패:`, result.reason);
          console.warn(`   - 에러 코드:`, result.reason?.code);
          console.warn(`   - 에러 메시지:`, result.reason?.message);
        } else {
          console.log(`✅ ${names[index]} 테이블 조회 성공:`, result.value.data?.length || 0, '건');
        }
      });

      // 데이터 상세 로깅
      console.log('📊 서비스별 데이터 요약:');
      console.log('🚗 렌트카 데이터:', carData?.length || 0, '건', carData);
      console.log('🚢 크루즈 데이터:', cruiseData?.length || 0, '건', cruiseData);
      console.log('✈️ 공항 서비스 데이터:', airportData?.length || 0, '건', airportData);
      console.log('🏨 호텔 데이터:', hotelData?.length || 0, '건', hotelData);
      console.log('🎯 투어 데이터:', tourData?.length || 0, '건', tourData);

      const detailedQuote: QuoteDetail = {
        ...quoteData,
        users: userData || { name: '알 수 없음', email: '미확인', phone_number: '미확인' },
        rentcar: carData || [],
        cruise: cruiseData || [],
        airport: airportData || [],
        hotel: hotelData || [],
        tour: tourData || []
      };

      console.log('✅ 견적 상세 정보 로드 완료:', detailedQuote);
      setQuote(detailedQuote);

    } catch (error) {
      console.error('❌ 견적 상세 정보 로드 실패:', error);
      alert('견적 정보를 불러오는데 실패했습니다.');
      router.push('/manager/quotes');
    }
  };

  // 상세 서비스 정보 로드
  const loadDetailedServices = async () => {
    try {
      console.log('🔍 상세 서비스 정보 로드 시작...', quoteId);

      const { data: quoteItems, error } = await supabase
        .from('quote_item')
        .select('*')
        .eq('quote_id', quoteId);

      if (error) throw error;

      console.log('📋 Quote Items 로드됨:', quoteItems);

      const detailed: any = {
        rooms: [],
        cars: [],
        airports: [],
        hotels: [],
        rentcars: [],
        tours: []
      };

      for (const item of quoteItems || []) {
        try {
          console.log(`🔍 처리 중: ${item.service_type} (ref_id: ${item.service_ref_id})`);

          if (item.service_type === 'room') {
            const { data: roomData } = await supabase
              .from('room')
              .select('*')
              .eq('id', item.service_ref_id)
              .single();

            if (roomData) {
              console.log('✅ 객실 정보:', roomData);
              // room_price 테이블에서 모든 가격 정보 조회
              const { data: priceData } = await supabase
                .from('room_price')
                .select('*')
                .eq('room_code', roomData.room_code);

              // 수량 업데이트 - 인원수를 quantity로 설정
              const actualQuantity = roomData.adult_count || 1;

              detailed.rooms.push({
                ...item,
                roomInfo: roomData,
                priceInfo: priceData || [],
                displayQuantity: actualQuantity // 표시용 수량
              });
            }
          } else if (item.service_type === 'car') {
            const { data: carData } = await supabase
              .from('car')
              .select('*')
              .eq('id', item.service_ref_id)
              .single();

            if (carData) {
              console.log('✅ 차량 정보:', carData);
              const { data: priceData } = await supabase
                .from('car_price')
                .select('*')
                .eq('car_code', carData.car_code);

              // 수량 업데이트 - 차량 수를 quantity로 설정
              const actualQuantity = carData.car_count || 1;

              detailed.cars.push({
                ...item,
                carInfo: carData,
                priceInfo: priceData || [],
                displayQuantity: actualQuantity // 표시용 수량
              });
            }
          } else if (item.service_type === 'airport') {
            const { data: airportData } = await supabase
              .from('airport')
              .select('*')
              .eq('id', item.service_ref_id)
              .single();

            if (airportData) {
              console.log('✅ 공항 정보:', airportData);
              const { data: priceData } = await supabase
                .from('airport_price')
                .select('*')
                .eq('airport_code', airportData.airport_code);

              // 수량 업데이트 - 승객 수를 quantity로 설정
              const actualQuantity = airportData.passenger_count || 1;

              detailed.airports.push({
                ...item,
                airportInfo: airportData,
                priceInfo: priceData || [],
                displayQuantity: actualQuantity // 표시용 수량
              });
            }
          } else if (item.service_type === 'hotel') {
            const { data: hotelData } = await supabase
              .from('hotel')
              .select('*')
              .eq('id', item.service_ref_id)
              .single();

            if (hotelData) {
              console.log('✅ 호텔 정보:', hotelData);
              const { data: priceData } = await supabase
                .from('hotel_price')
                .select('*')
                .eq('hotel_code', hotelData.hotel_code);

              // 수량 업데이트 - 객실 수를 quantity로 설정
              const actualQuantity = hotelData.room_count || 1;

              detailed.hotels.push({
                ...item,
                hotelInfo: hotelData,
                priceInfo: priceData || [],
                displayQuantity: actualQuantity // 표시용 수량
              });
            }
          } else if (item.service_type === 'rentcar') {
            const { data: rentcarData } = await supabase
              .from('rentcar')
              .select('*')
              .eq('id', item.service_ref_id)
              .single();

            if (rentcarData) {
              console.log('✅ 렌트카 정보:', rentcarData);
              const { data: priceData } = await supabase
                .from('rent_price')
                .select('*')
                .eq('rent_code', rentcarData.rentcar_code);

              // 수량 업데이트 - 차량 수를 quantity로 설정
              const actualQuantity = rentcarData.vehicle_count || 1;

              detailed.rentcars.push({
                ...item,
                rentcarInfo: rentcarData,
                priceInfo: priceData || [],
                displayQuantity: actualQuantity // 표시용 수량
              });
            }
          } else if (item.service_type === 'tour') {
            const { data: tourData } = await supabase
              .from('tour')
              .select('*')
              .eq('id', item.service_ref_id)
              .single();

            if (tourData) {
              console.log('✅ 투어 정보:', tourData);
              const { data: priceData } = await supabase
                .from('tour_price')
                .select('*')
                .eq('tour_code', tourData.tour_code);

              // 수량 업데이트 - 참가자 수를 quantity로 설정
              const actualQuantity = tourData.participant_count || 1;

              detailed.tours.push({
                ...item,
                tourInfo: tourData,
                priceInfo: priceData || [],
                displayQuantity: actualQuantity // 표시용 수량
              });
            }
          }
        } catch (serviceError) {
          console.warn(`⚠️ ${item.service_type} 상세 정보 로드 실패:`, serviceError);
        }
      }

      setDetailedServices(detailed);
      console.log('✅ 상세 서비스 정보 로드 완료:', detailed);
    } catch (error) {
      console.error('❌ 상세 서비스 정보 로드 실패:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-50 text-yellow-600',
      submitted: 'bg-yellow-50 text-yellow-600',
      draft: 'bg-gray-50 text-gray-600',
      confirmed: 'bg-blue-50 text-blue-600',
      approved: 'bg-blue-50 text-blue-600',
      rejected: 'bg-red-50 text-red-600'
    };
    const labels = {
      pending: '검토 대기',
      submitted: '제출됨',
      draft: '임시저장',
      confirmed: '확정됨 (예약)',
      approved: '승인됨',
      rejected: '거절됨'
    };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badges[status as keyof typeof badges] || 'bg-gray-50 text-gray-600'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const handleSubmitQuote = async () => {
    if (!quote?.id) return;
    try {
      const { error } = await supabase
        .from('quote')
        .update({ status: 'submitted' })
        .eq('id', quote.id);
      if (error) {
        alert('견적 제출 중 오류가 발생했습니다.');
        return;
      }
      alert('견적이 성공적으로 제출되었습니다!');
      router.push('/mypage/quotes');
    } catch (err) {
      alert('견적 제출 중 오류가 발생했습니다.');
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
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/mypage/quotes')}
                className="p-2 text-black hover:text-black font-bold text-lg"
              >
                <span className="font-extrabold text-xl text-black">←</span>
              </button>
              <h1 className="text-xl font-bold text-gray-700">📋 {quote.cruise_name || '견적 상세'}</h1>
              {getStatusBadge(quote.status)}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-8">
          {/* 메인 콘텐츠 */}
          <div className="space-y-6">
            {/* 고객 정보 */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-600 mb-4">👤 고객 정보</h2>
              <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                <tbody>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25 w-32">닉네임</td>
                    <td className="px-2 py-1 border-blue-100 border">{quote.users?.name || '정보 없음'}</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">이메일</td>
                    <td className="px-2 py-1 border-blue-100 border">{quote.users?.email || '정보 없음'}</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">연락처</td>
                    <td className="px-2 py-1 border-blue-100 border">{quote.users?.phone_number || '정보 없음'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 상세 서비스 정보 섹션 */}
            {/* 객실 정보 */}
            {detailedServices.rooms && detailedServices.rooms.length > 0 && (
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-600 mb-4">🛏 객실 정보 (상세)</h2>
                <div className="space-y-4">
                  {detailedServices.rooms.map((room: any, index: number) => (
                    <div key={index} className="border border-gray-100 rounded-lg p-4">
                      <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                        <tbody>
                          {(room.priceInfo && room.priceInfo.length > 0 ? room.priceInfo : [{}]).map((price: any, priceIndex: number) => (
                            <React.Fragment key={priceIndex}>
                              <tr className="bg-gray-25">
                                <td className="px-2 py-1 font-medium border-blue-100 border">일정</td>
                                <td className="px-2 py-1 border-blue-100 border">{price.schedule || '-'}</td>
                              </tr>
                              <tr>
                                <td className="px-2 py-1 font-medium border-blue-100 border">크루즈</td>
                                <td className="px-2 py-1 border-blue-100 border">{price.cruise || '-'}</td>
                              </tr>
                              <tr>
                                <td className="px-2 py-1 font-medium border-blue-100 border">객실 타입</td>
                                <td className="px-2 py-1 border-blue-100 border">{price.room_type || '-'}</td>
                              </tr>
                              <tr>
                                <td className="px-2 py-1 font-medium border-blue-100 border">카테고리</td>
                                <td className="px-2 py-1 border-blue-100 border">{price.room_category || '-'}</td>
                              </tr>
                              <tr className="bg-gray-50">
                                <td className="px-2 py-1 font-medium border-blue-100 border">인원수</td>
                                <td className="px-2 py-1 border-blue-100 border">{room.roomInfo?.adult_count}명</td>
                              </tr>

                              <tr className="bg-gray-50">
                                <td className="px-2 py-1 font-medium border-blue-100 border">추가수</td>
                                <td className="px-2 py-1 border-blue-100 border">{room.roomInfo?.extra_count || 0}명</td>
                              </tr>
                              {/* 추가 요금 행이 마지막으로 이동됨 */}
                              <tr>
                                <td className="px-2 py-1 font-medium border-blue-100 border">추가 요금</td>
                                <td className="px-2 py-1 border-blue-100 border">{price.extra_charge ? price.extra_charge.toLocaleString() + '동' : '-'}</td>
                              </tr>
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 차량 정보 */}
            {detailedServices.cars && detailedServices.cars.length > 0 && (
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-600 mb-4">🚗 차량 정보 (상세)</h2>
                <div className="space-y-4">
                  {detailedServices.cars.map((car: any, index: number) => (
                    <div key={index} className="border border-gray-100 rounded-lg p-4">
                      <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                        <tbody>
                          {(car.priceInfo && car.priceInfo.length > 0 ? car.priceInfo : [{}]).map((price: any, priceIndex: number) => (
                            <React.Fragment key={priceIndex}>
                              <tr className="bg-gray-25">
                                <td className="px-2 py-1 font-medium border-blue-100 border">일정</td>
                                <td className="px-2 py-1 border-blue-100 border">{price.schedule || '-'}</td>
                              </tr>
                              <tr>
                                <td className="px-2 py-1 font-medium border-blue-100 border">크루즈</td>
                                <td className="px-2 py-1 border-blue-100 border">{price.cruise || '-'}</td>
                              </tr>
                              <tr>
                                <td className="px-2 py-1 font-medium border-blue-100 border">차량 타입</td>
                                <td className="px-2 py-1 border-blue-100 border">{price.car_type || '-'}</td>
                              </tr>
                              <tr>
                                <td className="px-2 py-1 font-medium border-blue-100 border">카테고리</td>
                                <td className="px-2 py-1 border-blue-100 border">{price.car_category || '-'}</td>
                              </tr>
                              <tr className="bg-gray-50">
                                <td className="px-2 py-1 font-medium border-blue-100 border">차량수</td>
                                <td className="px-2 py-1 border-blue-100 border">{car.carInfo?.car_count}대</td>
                              </tr>
                              {/* 추가 요금 행이 마지막으로 이동됨 */}
                              <tr>
                                <td className="px-2 py-1 font-medium border-blue-100 border">추가 요금</td>
                                <td className="px-2 py-1 border-blue-100 border">{price.extra_charge ? price.extra_charge.toLocaleString() + '동' : '-'}</td>
                              </tr>
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 공항 서비스 정보 */}
            {detailedServices.airports && detailedServices.airports.length > 0 && (
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-600 mb-4">✈️ 공항 서비스 (상세)</h2>
                <div className="space-y-4">
                  {detailedServices.airports.map((airport: any, index: number) => (
                    <div key={index} className="border border-gray-100 rounded-lg p-4">
                      <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                        <tbody>
                          {(airport.priceInfo && airport.priceInfo.length > 0 ? airport.priceInfo : [{}]).map((price: any, priceIndex: number) => (
                            <React.Fragment key={priceIndex}>
                              <tr className="bg-gray-25">
                                <td className="px-2 py-1 font-medium border-blue-100 border">카테고리</td>
                                <td className="px-2 py-1 border-blue-100 border">{price.airport_category || '-'}</td>
                              </tr>
                              <tr>
                                <td className="px-2 py-1 font-medium border-blue-100 border">경로</td>
                                <td className="px-2 py-1 border-blue-100 border">{price.airport_route || '-'}</td>
                              </tr>
                              <tr>
                                <td className="px-2 py-1 font-medium border-blue-100 border">차량 타입</td>
                                <td className="px-2 py-1 border-blue-100 border">{price.airport_car_type || '-'}</td>
                              </tr>
                              <tr className="bg-gray-50">
                                <td className="px-2 py-1 font-medium border-blue-100 border">승객수</td>
                                <td className="px-2 py-1 border-blue-100 border">{airport.airportInfo?.passenger_count}명</td>
                              </tr>
                              {/* 추가 요금 행이 마지막으로 이동됨 */}
                              <tr>
                                <td className="px-2 py-1 font-medium border-blue-100 border">추가 요금</td>
                                <td className="px-2 py-1 border-blue-100 border">{price.extra_charge ? price.extra_charge.toLocaleString() + '동' : '-'}</td>
                              </tr>
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 호텔 정보 */}
            {detailedServices.hotels && detailedServices.hotels.length > 0 && (
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-600 mb-4">🏨 호텔 정보 (상세)</h2>
                <div className="space-y-4">
                  {detailedServices.hotels.map((hotel: any, index: number) => (
                    <div key={index} className="border border-gray-100 rounded-lg p-4">
                      <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                        <tbody>
                          {(hotel.priceInfo && hotel.priceInfo.length > 0 ? hotel.priceInfo : [{}]).map((price: any, priceIndex: number) => (
                            <React.Fragment key={priceIndex}>
                              <tr className="bg-gray-25">
                                <td className="px-2 py-1 font-medium border-blue-100 border">호텔명</td>
                                <td className="px-2 py-1 border-blue-100 border">{price.hotel_name || '-'}</td>
                              </tr>
                              <tr>
                                <td className="px-2 py-1 font-medium border-blue-100 border">객실명</td>
                                <td className="px-2 py-1 border-blue-100 border">{price.room_name || '-'}</td>
                              </tr>
                              <tr>
                                <td className="px-2 py-1 font-medium border-blue-100 border">객실 타입</td>
                                <td className="px-2 py-1 border-blue-100 border">{price.room_type || '-'}</td>
                              </tr>
                              {/* 추가 요금 행이 마지막으로 이동됨 */}
                              <tr>
                                <td className="px-2 py-1 font-medium border-blue-100 border">추가 요금</td>
                                <td className="px-2 py-1 border-blue-100 border">{price.extra_charge ? price.extra_charge.toLocaleString() + '동' : '-'}</td>
                              </tr>

                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 렌트카 정보 */}
            {detailedServices.rentcars && detailedServices.rentcars.length > 0 && (
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-600 mb-4">🚙 렌트카 정보 (상세)</h2>
                <div className="space-y-4">
                  {detailedServices.rentcars.map((rentcar: any, index: number) => (
                    <div key={index} className="border border-gray-100 rounded-lg p-4">
                      <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                        <tbody>
                          {(rentcar.priceInfo && rentcar.priceInfo.length > 0 ? rentcar.priceInfo : [{}]).map((price: any, priceIndex: number) => (
                            <React.Fragment key={priceIndex}>
                              <tr className="bg-gray-25">
                                <td className="px-2 py-1 font-medium border-blue-100 border">렌트 타입</td>
                                <td className="px-2 py-1 border-blue-100 border">{price.rent_type || '-'}</td>
                              </tr>
                              <tr>
                                <td className="px-2 py-1 font-medium border-blue-100 border">카테고리</td>
                                <td className="px-2 py-1 border-blue-100 border">{price.rent_category || '-'}</td>
                              </tr>
                              <tr>
                                <td className="px-2 py-1 font-medium border-blue-100 border">경로</td>
                                <td className="px-2 py-1 border-blue-100 border">{price.rent_route || '-'}</td>
                              </tr>
                              <tr className="bg-gray-50">
                                <td className="px-2 py-1 font-medium border-blue-100 border">차량 종류</td>
                                <td className="px-2 py-1 border-blue-100 border">{price.rent_car_type || '-'}</td>
                              </tr>
                              <tr className="bg-gray-50">
                                <td className="px-2 py-1 font-medium border-blue-100 border">수량</td>
                                <td className="px-2 py-1 border-blue-100 border">{rentcar.displayQuantity || rentcar.quantity || 1}대</td>
                              </tr>
                              {/* 추가 요금 행이 마지막으로 이동됨 */}
                              <tr>
                                <td className="px-2 py-1 font-medium border-blue-100 border">추가 요금</td>
                                <td className="px-2 py-1 border-blue-100 border">{price.extra_charge ? price.extra_charge.toLocaleString() + '동' : '-'}</td>
                              </tr>
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 투어 정보 */}
            {detailedServices.tours && detailedServices.tours.length > 0 && (
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-600 mb-4">🎯 투어 정보 (상세)</h2>
                <div className="space-y-4">
                  {detailedServices.tours.map((tour: any, index: number) => (
                    <div key={index} className="border border-gray-100 rounded-lg p-4">
                      <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                        <tbody>
                          {(tour.priceInfo && tour.priceInfo.length > 0 ? tour.priceInfo : [{}]).map((price: any, priceIndex: number) => (
                            <React.Fragment key={priceIndex}>
                              <tr className="bg-gray-25">
                                <td className="px-2 py-1 font-medium border-blue-100 border">투어명</td>
                                <td className="px-2 py-1 border-blue-100 border">{price.tour_name || '-'}</td>
                              </tr>
                              <tr>
                                <td className="px-2 py-1 font-medium border-blue-100 border">최대 인원수</td>
                                <td className="px-2 py-1 border-blue-100 border">{price.tour_capacity ? price.tour_capacity + '명' : '-'}</td>
                              </tr>
                              <tr>
                                <td className="px-2 py-1 font-medium border-blue-100 border">차량</td>
                                <td className="px-2 py-1 border-blue-100 border">{price.tour_vehicle || '-'}</td>
                              </tr>
                              <tr className="bg-gray-50">
                                <td className="px-2 py-1 font-medium border-blue-100 border">투어 날짜</td>
                                <td className="px-2 py-1 border-blue-100 border">{tour.tourInfo?.tour_date || '-'}</td>
                              </tr>
                              <tr className="bg-gray-50">
                                <td className="px-2 py-1 font-medium border-blue-100 border">차량수</td>
                                <td className="px-2 py-1 border-blue-100 border">{tour.tourInfo?.participant_count || 0}대</td>
                              </tr>
                              {/* 추가 요금 행이 마지막으로 이동됨 */}
                              <tr>
                                <td className="px-2 py-1 font-medium border-blue-100 border">추가 요금</td>
                                <td className="px-2 py-1 border-blue-100 border">{price.extra_charge ? price.extra_charge.toLocaleString() + '동' : '-'}</td>
                              </tr>
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            )}



            {/* 기본 견적 정보 완료 */}

            {/* 렌트카 정보 */}
            {quote.rentcar && quote.rentcar.length > 0 && (
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-600 mb-4">🚗 렌트카 정보</h2>
                <div className="space-y-4">
                  {quote.rentcar.map((car: any, index: number) => (
                    <div key={index} className="border border-gray-100 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-600">
                            {car.car_model || '차량 정보 없음'}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            픽업일: {car.pickup_date ? new Date(car.pickup_date).toLocaleDateString() : '미정'} |
                            반납일: {car.return_date ? new Date(car.return_date).toLocaleDateString() : '미정'}
                          </p>
                          <p className="text-sm text-gray-500">
                            픽업장소: {car.pickup_location || '미정'} |
                            반납장소: {car.return_location || '미정'}
                          </p>
                          <div className="mt-2">
                            <span className="text-sm text-gray-400">
                              수량: {car.quantity || 1}대
                            </span>
                          </div>
                          {car.options && (
                            <p className="text-sm text-gray-400 mt-1">
                              추가 옵션: {JSON.stringify(car.options)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 액션 버튼 - 페이지 하단 */}
            <div className="flex justify-center items-center gap-4 mt-10">
              <button
                onClick={handleSubmitQuote}
                className="bg-green-300 text-black px-4 py-2 rounded text-xs hover:bg-green-400 transition-colors font-bold shadow-sm"
              >
                📝 견적 제출
              </button>

              {quote?.payment_status === 'paid' && (
                <button
                  onClick={() => {
                    const confirmationUrl = `/customer/confirmation?quote_id=${quote.id}&token=customer`;
                    window.open(confirmationUrl, '_blank');
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded text-xs hover:bg-blue-600 transition-colors font-bold shadow-sm"
                >
                  📄 예약확인서 보기
                </button>
              )}

              {quote?.payment_status !== 'paid' && (quote?.total_price || 0) > 0 && (
                <button
                  onClick={() => router.push('/mypage/payments')}
                  className="bg-yellow-500 text-white px-4 py-2 rounded text-xs hover:bg-yellow-600 transition-colors font-bold shadow-sm"
                >
                  💳 결제하기
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
