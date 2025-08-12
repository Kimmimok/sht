'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';

function RentcarReservationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get('quoteId');

  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);

  // 폼 데이터
  const [formData, setFormData] = useState({
    pickup_datetime: '',
    return_datetime: '',
    pickup_location: '',
    destination: '',
    driver_count: 1,
    passenger_count: 1,
    luggage_count: 0,
    request_note: ''
  });

  useEffect(() => {
    if (!quoteId) {
      alert('가격 ID가 필요합니다.');
      router.push('/mypage/direct-booking');
      return;
    }

    // 사용자 인증 확인
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
      }
    });

    loadQuote();
    loadRentcarServices();
  }, [quoteId, router]);

  // 가격 정보 로드
  const loadQuote = async () => {
    try {
      const { data: quoteData, error } = await supabase
        .from('quote')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (error || !quoteData) {
        alert('가격을 찾을 수 없습니다.');
        router.push('/mypage/direct-booking');
        return;
      }

      setQuote(quoteData);
    } catch (error) {
      console.error('가격 로드 오류:', error);
      alert('가격 정보를 불러오는 중 오류가 발생했습니다.');
    }
  };

  // 가격에 연결된 렌터카 서비스들 조회
  const loadRentcarServices = async () => {
    try {
      const { data: quoteItems } = await supabase
        .from('quote_item')
        .select('service_type, service_ref_id, usage_date')
        .eq('quote_id', quoteId)
        .eq('service_type', 'rentcar');

      if (quoteItems && quoteItems.length > 0) {
        const allServices = [];

        for (const item of quoteItems) {
          const { data: rentcarData } = await supabase
            .from('rentcar')
            .select('rentcar_code')
            .eq('id', item.service_ref_id)
            .single();

          if (rentcarData?.rentcar_code) {
            const { data: priceOptions } = await supabase
              .from('rentcar_price')
              .select('*')
              .eq('rentcar_code', rentcarData.rentcar_code);

            if (priceOptions) {
              allServices.push(...priceOptions.map(option => ({
                ...option,
                usage_date: item.usage_date
              })));
            }
          }
        }

        setAvailableServices(allServices);
      }
    } catch (error) {
      console.error('렌터카 서비스 로드 오류:', error);
    }
  };

  // 서비스 선택/해제
  const toggleService = (service: any) => {
    setSelectedServices(prev => {
      const isSelected = prev.some(s => s.rentcar_code === service.rentcar_code);
      if (isSelected) {
        return prev.filter(s => s.rentcar_code !== service.rentcar_code);
      } else {
        return [...prev, service];
      }
    });
  };

  // 차량 타입별 서비스 분류
  const getServicesByType = () => {
    const types: { [key: string]: any[] } = {};
    availableServices.forEach(service => {
      const type = service.vehicle_type || '기타';
      if (!types[type]) {
        types[type] = [];
      }
      types[type].push(service);
    });
    return types;
  };

  // 예약 저장
  const handleSubmit = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (selectedServices.length === 0) {
      alert('최소 하나의 렌터카를 선택해주세요.');
      return;
    }

    setLoading(true);

    try {
      // 사용자 역할 업데이트
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', user.id)
        .single();

      if (!existingUser || existingUser.role === 'guest') {
        await supabase
          .from('users')
          .upsert({
            id: user.id,
            email: user.email,
            role: 'member',
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
      }

      // 중복 예약 확인
      const { data: duplicateCheck } = await supabase
        .from('reservation')
        .select('re_id')
        .eq('re_user_id', user.id)
        .eq('re_quote_id', quoteId)
        .eq('re_type', 'rentcar')
        .maybeSingle();

      let reservationData;

      if (duplicateCheck) {
        // 기존 예약 업데이트
        reservationData = { re_id: duplicateCheck.re_id };
        await supabase
          .from('reservation_rentcar')
          .delete()
          .eq('reservation_id', duplicateCheck.re_id);
      } else {
        // 새 예약 생성
        const { data: newReservation, error: reservationError } = await supabase
          .from('reservation')
          .insert({
            re_user_id: user.id,
            re_quote_id: quoteId,
            re_type: 'rentcar',
            re_status: 'pending',
            re_created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (reservationError) {
          console.error('예약 생성 오류:', reservationError);
          alert('예약 생성 중 오류가 발생했습니다.');
          return;
        }
        reservationData = newReservation;
      }

      // 메인 서비스 저장 (크루즈 패턴)
      const mainService = selectedServices[0];
      const additionalServicesNote = selectedServices
        .slice(1)
        .map(service => `추가 차량: ${service.car_model} - ${service.vehicle_type} (${service.price?.toLocaleString()}동/일)`)
        .join('\n');

      const fullRequestNote = [
        formData.request_note,
        additionalServicesNote
      ].filter(Boolean).join('\n');

      const rentcarReservationData = {
        reservation_id: reservationData.re_id,
        rentcar_price_code: mainService.rentcar_code,
        pickup_datetime: formData.pickup_datetime ? new Date(formData.pickup_datetime).toISOString() : null,
        return_datetime: formData.return_datetime ? new Date(formData.return_datetime).toISOString() : null,
        pickup_location: formData.pickup_location || null,
        destination: formData.destination || null,
        driver_count: formData.driver_count || 1,
        passenger_count: formData.passenger_count || 1,
        luggage_count: formData.luggage_count || 0,
        request_note: fullRequestNote || null
      };

      const { error: rentcarError } = await supabase
        .from('reservation_rentcar')
        .insert(rentcarReservationData);

      if (rentcarError) {
        console.error('렌터카 예약 저장 오류:', rentcarError);
        alert('렌터카 예약 저장 중 오류가 발생했습니다.');
        return;
      }

      alert('렌터카 예약이 성공적으로 완료되었습니다!');
      router.push('/mypage/direct-booking');

    } catch (error) {
      console.error('예약 저장 오류:', error);
      alert('예약 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!quote) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const servicesByType = getServicesByType();
  const totalPrice = selectedServices.reduce((sum, service) => sum + (service.price || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-purple-200 via-indigo-200 to-blue-100 text-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-lg font-bold text-gray-800">🚗 렌터카 서비스 예약</h1>
              <p className="text-sm text-gray-600 mt-1">가격: {quote.title}</p>
            </div>
            <button
              onClick={() => router.push('/mypage/direct-booking')}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-xs"
            >
              ← 뒤로
            </button>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-lg font-bold text-gray-800 mb-6">🎯 2단계: 예약 진행</h2>

            {/* 가격 정보 */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-purple-800 mb-2">✅ 가격이 성공적으로 저장되었습니다!</h3>
              <div className="text-sm text-purple-700">
                <p>가격명: <span className="font-semibold">{quote.title}</span></p>
                <p>이제 예약 정보를 입력해주세요.</p>
              </div>
            </div>

            {/* 차량 선택 영역 */}
            {availableServices.length > 0 && (
              <div className="space-y-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-800">🚗 차량 선택</h3>

                {Object.entries(servicesByType).map(([type, services]) => (
                  <div key={type} className="space-y-3">
                    <h4 className="text-md font-medium text-purple-700 border-l-4 border-purple-500 pl-3">
                      {type}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {services.map((service) => (
                        <div
                          key={service.rentcar_code}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedServices.some(s => s.rentcar_code === service.rentcar_code)
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 bg-white hover:border-purple-300'
                            }`}
                          onClick={() => toggleService(service)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium">{service.car_model}</span>
                            <span className="text-purple-600 font-bold">{service.price?.toLocaleString()}동</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <div>좌석: {service.seats}인승</div>
                            <div>특징: {service.features}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* 선택된 서비스 요약 */}
                {selectedServices.length > 0 && (
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <h4 className="text-md font-medium text-yellow-800 mb-2">✅ 선택된 차량</h4>
                    <div className="space-y-2">
                      {selectedServices.map((service, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{service.car_model} - {service.vehicle_type}</span>
                          <span className="font-medium">{service.price?.toLocaleString()}동</span>
                        </div>
                      ))}
                      <div className="border-t border-yellow-300 pt-2 mt-2">
                        <div className="flex justify-between font-bold text-red-600">
                          <span>총 예상 금액:</span>
                          <span>{totalPrice.toLocaleString()}동</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 예약 세부 정보 입력 */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">픽업 일시</label>
                  <input
                    type="datetime-local"
                    value={formData.pickup_datetime}
                    onChange={(e) => setFormData({ ...formData, pickup_datetime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">반납 일시</label>
                  <input
                    type="datetime-local"
                    value={formData.return_datetime}
                    onChange={(e) => setFormData({ ...formData, return_datetime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">픽업 장소</label>
                  <input
                    type="text"
                    value={formData.pickup_location}
                    onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
                    placeholder="픽업 희망 장소를 입력해주세요"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">목적지</label>
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    placeholder="최종 목적지를 입력해주세요"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">운전자 수</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.driver_count}
                    onChange={(e) => setFormData({ ...formData, driver_count: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">탑승 인원</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.passenger_count}
                    onChange={(e) => setFormData({ ...formData, passenger_count: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">수하물 개수</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.luggage_count}
                    onChange={(e) => setFormData({ ...formData, luggage_count: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">🚗 렌터카 관련 요청사항</label>
                <textarea
                  value={formData.request_note}
                  onChange={(e) => setFormData({ ...formData, request_note: e.target.value })}
                  placeholder="예) 차량 색상 선호, 네비게이션 언어 설정, 보험 추가 옵션, 운전자 추가 등"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 resize-vertical"
                />
                <p className="mt-1 text-xs text-gray-500">
                  * 차량 인수, 보험, 운전자 관련 특별 요청사항을 입력해 주세요.
                </p>
              </div>
            </div>

            {/* 예약 완료 버튼 */}
            <div className="flex justify-end space-x-4 mt-8">
              <button
                type="button"
                onClick={() => router.push(`/mypage/direct-booking/rentcar/1?quoteId=${quoteId}`)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-xs"
              >
                이전 단계
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || selectedServices.length === 0}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-xs"
              >
                {loading ? '예약 중...' : '예약 완료'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RentcarReservationPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64">로딩 중...</div>}>
      <RentcarReservationContent />
    </Suspense>
  );
}
