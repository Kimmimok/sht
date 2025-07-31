'use client';
import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

// 타입 정의
interface QuoteFormData {
  // 기본 정보
  checkin: string;
  checkout: string;
  schedule_code: string;
  cruise_code: string;
  payment_code: string;
  discount_rate: number;

  // 크루즈 정보
  cruise: {
    cruise_code: string;
    room_type: string;
    passenger_count: number;
    special_requests: string;
  };

  // 차량 정보
  vehicle: {
    vehicle_code: string;
    vehicle_category_code: string;
    pickup_location: string;
    dropoff_location: string;
    pickup_time: string;
    passenger_count: number;
  };

  // 호텔 정보
  hotel: {
    hotel_name: string;
    room_type: string;
    room_count: number;
    guest_count: number;
    special_requests: string;
  };

  // 공항 서비스
  airport: {
    service_type: string; // pickup, dropoff, both
    flight_number: string;
    arrival_time: string;
    departure_time: string;
    terminal: string;
  };

  // 투어 정보
  tour: {
    tour_type: string;
    duration: string;
    participant_count: number;
    preferred_language: string;
    special_requests: string;
  };

  // 고객 정보
  customer: {
    name: string;
    phone: string;
    email: string;
    emergency_contact: string;
    special_needs: string;
  };
}

export default function ComprehensiveQuoteForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<QuoteFormData>({
    checkin: '',
    checkout: '',
    schedule_code: '',
    cruise_code: '',
    payment_code: '',
    discount_rate: 0,
    cruise: {
      cruise_code: '',
      room_type: '',
      passenger_count: 2,
      special_requests: '',
    },
    vehicle: {
      vehicle_code: '',
      vehicle_category_code: '',
      pickup_location: '',
      dropoff_location: '',
      pickup_time: '',
      passenger_count: 2,
    },
    hotel: {
      hotel_name: '',
      room_type: '',
      room_count: 1,
      guest_count: 2,
      special_requests: '',
    },
    airport: {
      service_type: '',
      flight_number: '',
      arrival_time: '',
      departure_time: '',
      terminal: '',
    },
    tour: {
      tour_type: '',
      duration: '',
      participant_count: 2,
      preferred_language: 'korean',
      special_requests: '',
    },
    customer: {
      name: '',
      phone: '',
      email: '',
      emergency_contact: '',
      special_needs: '',
    },
  });

  // 옵션 데이터
  const [scheduleOptions, setScheduleOptions] = useState<any[]>([]);
  const [cruiseOptions, setCruiseOptions] = useState<any[]>([]);
  const [vehicleOptions, setVehicleOptions] = useState<any[]>([]);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const [scheduleRes, cruiseRes, vehicleRes] = await Promise.all([
        supabase.from('schedule_info').select('*'),
        supabase.from('cruise_info').select('*'),
        supabase.from('car_info').select('*'),
      ]);

      setScheduleOptions(scheduleRes.data || []);
      setCruiseOptions(cruiseRes.data || []);
      setVehicleOptions(vehicleRes.data || []);
    } catch (error) {
      console.error('옵션 로딩 실패:', error);
    }
  };

  const handleInputChange = (section: string, field: string, value: any) => {
    if (section === 'root') {
      setFormData((prev) => ({ ...prev, [field]: value }));
    } else {
      setFormData((prev) => {
        const sectionObj = prev[section as keyof QuoteFormData];
        return {
          ...prev,
          [section]: {
            ...(typeof sectionObj === 'object' && sectionObj !== null ? sectionObj : {}),
            [field]: value,
          },
        };
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }

      // 1. 기본 견적 저장
      const { data: quote, error: quoteError } = await supabase
        .from('quote')
        .insert({
          user_id: user.id,
          checkin: formData.checkin,
          checkout: formData.checkout,
          schedule_code: formData.schedule_code,
          cruise_code: formData.cruise_code,
          payment_code: formData.payment_code,
          discount_rate: formData.discount_rate,
          quote_type: 'comprehensive', // 종합 견적 표시
          customer_info: formData.customer,
          special_requests: [
            formData.cruise.special_requests,
            formData.hotel.special_requests,
            formData.tour.special_requests,
          ]
            .filter(Boolean)
            .join('; '),
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      const quoteId = quote.id;

      // 2. 크루즈 정보 저장
      if (formData.cruise.cruise_code) {
        await supabase.from('quote_cruise').insert({
          quote_id: quoteId,
          cruise_code: formData.cruise.cruise_code,
          room_type: formData.cruise.room_type,
          passenger_count: formData.cruise.passenger_count,
          special_requests: formData.cruise.special_requests,
        });
      }

      // 3. 차량 정보 저장
      if (formData.vehicle.vehicle_code) {
        await supabase.from('quote_car').insert({
          quote_id: quoteId,
          vehicle_code: formData.vehicle.vehicle_code,
          car_category_code: formData.vehicle.vehicle_category_code,
          pickup_location: formData.vehicle.pickup_location,
          dropoff_location: formData.vehicle.dropoff_location,
          pickup_time: formData.vehicle.pickup_time,
          passenger_count: formData.vehicle.passenger_count,
        });
      }

      // 4. 호텔 정보 저장
      if (formData.hotel.hotel_name) {
        await supabase.from('quote_hotel').insert({
          quote_id: quoteId,
          hotel_name: formData.hotel.hotel_name,
          room_type: formData.hotel.room_type,
          room_count: formData.hotel.room_count,
          guest_count: formData.hotel.guest_count,
          special_requests: formData.hotel.special_requests,
        });
      }

      // 5. 공항 서비스 저장
      if (formData.airport.service_type) {
        await supabase.from('quote_airport').insert({
          quote_id: quoteId,
          service_type: formData.airport.service_type,
          flight_number: formData.airport.flight_number,
          arrival_time: formData.airport.arrival_time,
          departure_time: formData.airport.departure_time,
          terminal: formData.airport.terminal,
        });
      }

      // 6. 투어 정보 저장
      if (formData.tour.tour_type) {
        await supabase.from('quote_tour').insert({
          quote_id: quoteId,
          tour_type: formData.tour.tour_type,
          duration: formData.tour.duration,
          participant_count: formData.tour.participant_count,
          preferred_language: formData.tour.preferred_language,
          special_requests: formData.tour.special_requests,
        });
      }

      alert('종합 견적이 성공적으로 저장되었습니다!');
      router.push(`/quote/${quoteId}/view`);
    } catch (error: any) {
      console.error('견적 저장 실패:', error);
      alert('견적 저장에 실패했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-8">🌟 종합 견적 작성</h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 기본 정보 */}
          <SectionBox title="📅 기본 여행 정보">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">체크인 날짜</label>
                <input
                  type="date"
                  className="w-full border px-3 py-2 rounded"
                  value={formData.checkin}
                  onChange={(e) => handleInputChange('root', 'checkin', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">체크아웃 날짜</label>
                <input
                  type="date"
                  className="w-full border px-3 py-2 rounded"
                  value={formData.checkout}
                  onChange={(e) => handleInputChange('root', 'checkout', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">여행 일정</label>
                <select
                  className="w-full border px-3 py-2 rounded"
                  value={formData.schedule_code}
                  onChange={(e) => handleInputChange('root', 'schedule_code', e.target.value)}
                  required
                >
                  <option value="">일정을 선택하세요</option>
                  {scheduleOptions.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">결제 방법</label>
                <select
                  className="w-full border px-3 py-2 rounded"
                  value={formData.payment_code}
                  onChange={(e) => handleInputChange('root', 'payment_code', e.target.value)}
                  required
                >
                  <option value="">결제 방법 선택</option>
                  <option value="CARD">카드결제</option>
                  <option value="CASH">현금결제</option>
                  <option value="BANK">계좌이체</option>
                </select>
              </div>
            </div>
          </SectionBox>

          {/* 크루즈 정보 */}
          <SectionBox title="🚢 크루즈 정보">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">크루즈 선택</label>
                <select
                  className="w-full border px-3 py-2 rounded"
                  value={formData.cruise.cruise_code}
                  onChange={(e) => handleInputChange('cruise', 'cruise_code', e.target.value)}
                >
                  <option value="">크루즈를 선택하세요</option>
                  {cruiseOptions.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">객실 타입</label>
                <select
                  className="w-full border px-3 py-2 rounded"
                  value={formData.cruise.room_type}
                  onChange={(e) => handleInputChange('cruise', 'room_type', e.target.value)}
                >
                  <option value="">객실 타입 선택</option>
                  <option value="suite">스위트</option>
                  <option value="deluxe">디럭스</option>
                  <option value="standard">스탠다드</option>
                  <option value="balcony">발코니</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">승선 인원</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  className="w-full border px-3 py-2 rounded"
                  value={formData.cruise.passenger_count}
                  onChange={(e) =>
                    handleInputChange('cruise', 'passenger_count', parseInt(e.target.value))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">크루즈 특별 요청사항</label>
                <textarea
                  className="w-full border px-3 py-2 rounded"
                  rows={2}
                  value={formData.cruise.special_requests}
                  onChange={(e) => handleInputChange('cruise', 'special_requests', e.target.value)}
                  placeholder="특별한 요청사항이 있으시면 입력해주세요"
                />
              </div>
            </div>
          </SectionBox>

          {/* 차량 정보 */}
          <SectionBox title="🚗 차량 서비스">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">차량 종류</label>
                <select
                  className="w-full border px-3 py-2 rounded"
                  value={formData.vehicle.vehicle_code}
                  onChange={(e) => handleInputChange('vehicle', 'vehicle_code', e.target.value)}
                >
                  <option value="">차량을 선택하세요</option>
                  {vehicleOptions.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">서비스 구분</label>
                <select
                  className="w-full border px-3 py-2 rounded"
                  value={formData.vehicle.vehicle_category_code}
                  onChange={(e) =>
                    handleInputChange('vehicle', 'vehicle_category_code', e.target.value)
                  }
                >
                  <option value="">서비스 구분 선택</option>
                  <option value="ROUND">왕복</option>
                  <option value="ONE_WAY">편도</option>
                  <option value="EXTRA">추가</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">픽업 장소</label>
                <input
                  type="text"
                  className="w-full border px-3 py-2 rounded"
                  value={formData.vehicle.pickup_location}
                  onChange={(e) => handleInputChange('vehicle', 'pickup_location', e.target.value)}
                  placeholder="호텔명, 공항 등 구체적인 위치"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">목적지</label>
                <input
                  type="text"
                  className="w-full border px-3 py-2 rounded"
                  value={formData.vehicle.dropoff_location}
                  onChange={(e) => handleInputChange('vehicle', 'dropoff_location', e.target.value)}
                  placeholder="크루즈 터미널, 호텔 등"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">픽업 시간</label>
                <input
                  type="time"
                  className="w-full border px-3 py-2 rounded"
                  value={formData.vehicle.pickup_time}
                  onChange={(e) => handleInputChange('vehicle', 'pickup_time', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">탑승 인원</label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  className="w-full border px-3 py-2 rounded"
                  value={formData.vehicle.passenger_count}
                  onChange={(e) =>
                    handleInputChange('vehicle', 'passenger_count', parseInt(e.target.value))
                  }
                />
              </div>
            </div>
          </SectionBox>

          {/* 호텔 정보 */}
          <SectionBox title="🏨 호텔 정보">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">호텔명</label>
                <input
                  type="text"
                  className="w-full border px-3 py-2 rounded"
                  value={formData.hotel.hotel_name}
                  onChange={(e) => handleInputChange('hotel', 'hotel_name', e.target.value)}
                  placeholder="호텔명을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">객실 타입</label>
                <select
                  className="w-full border px-3 py-2 rounded"
                  value={formData.hotel.room_type}
                  onChange={(e) => handleInputChange('hotel', 'room_type', e.target.value)}
                >
                  <option value="">객실 타입 선택</option>
                  <option value="single">싱글룸</option>
                  <option value="double">더블룸</option>
                  <option value="twin">트윈룸</option>
                  <option value="triple">트리플룸</option>
                  <option value="suite">스위트룸</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">객실 수</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  className="w-full border px-3 py-2 rounded"
                  value={formData.hotel.room_count}
                  onChange={(e) =>
                    handleInputChange('hotel', 'room_count', parseInt(e.target.value))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">투숙 인원</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  className="w-full border px-3 py-2 rounded"
                  value={formData.hotel.guest_count}
                  onChange={(e) =>
                    handleInputChange('hotel', 'guest_count', parseInt(e.target.value))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">호텔 특별 요청사항</label>
                <textarea
                  className="w-full border px-3 py-2 rounded"
                  rows={2}
                  value={formData.hotel.special_requests}
                  onChange={(e) => handleInputChange('hotel', 'special_requests', e.target.value)}
                  placeholder="금연실, 고층, 뷰 객실 등"
                />
              </div>
            </div>
          </SectionBox>

          {/* 공항 서비스 */}
          <SectionBox title="✈️ 공항 서비스">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">서비스 종류</label>
                <select
                  className="w-full border px-3 py-2 rounded"
                  value={formData.airport.service_type}
                  onChange={(e) => handleInputChange('airport', 'service_type', e.target.value)}
                >
                  <option value="">서비스 선택</option>
                  <option value="pickup">공항 픽업만</option>
                  <option value="dropoff">공항 배송만</option>
                  <option value="both">픽업 + 배송</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">항공편명</label>
                <input
                  type="text"
                  className="w-full border px-3 py-2 rounded"
                  value={formData.airport.flight_number}
                  onChange={(e) => handleInputChange('airport', 'flight_number', e.target.value)}
                  placeholder="예: KE123"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">도착 시간</label>
                <input
                  type="datetime-local"
                  className="w-full border px-3 py-2 rounded"
                  value={formData.airport.arrival_time}
                  onChange={(e) => handleInputChange('airport', 'arrival_time', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">출발 시간</label>
                <input
                  type="datetime-local"
                  className="w-full border px-3 py-2 rounded"
                  value={formData.airport.departure_time}
                  onChange={(e) => handleInputChange('airport', 'departure_time', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">터미널</label>
                <select
                  className="w-full border px-3 py-2 rounded"
                  value={formData.airport.terminal}
                  onChange={(e) => handleInputChange('airport', 'terminal', e.target.value)}
                >
                  <option value="">터미널 선택</option>
                  <option value="T1">터미널 1</option>
                  <option value="T2">터미널 2</option>
                  <option value="T3">터미널 3</option>
                </select>
              </div>
            </div>
          </SectionBox>

          {/* 투어 정보 */}
          <SectionBox title="🗺️ 투어 정보">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">투어 종류</label>
                <select
                  className="w-full border px-3 py-2 rounded"
                  value={formData.tour.tour_type}
                  onChange={(e) => handleInputChange('tour', 'tour_type', e.target.value)}
                >
                  <option value="">투어 선택</option>
                  <option value="city">시내 관광</option>
                  <option value="nature">자연 탐방</option>
                  <option value="culture">문화 체험</option>
                  <option value="food">음식 투어</option>
                  <option value="adventure">액티비티</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">투어 시간</label>
                <select
                  className="w-full border px-3 py-2 rounded"
                  value={formData.tour.duration}
                  onChange={(e) => handleInputChange('tour', 'duration', e.target.value)}
                >
                  <option value="">소요시간 선택</option>
                  <option value="half">반일 (4시간)</option>
                  <option value="full">일일 (8시간)</option>
                  <option value="multi">다일 투어</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">참가 인원</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  className="w-full border px-3 py-2 rounded"
                  value={formData.tour.participant_count}
                  onChange={(e) =>
                    handleInputChange('tour', 'participant_count', parseInt(e.target.value))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">선호 언어</label>
                <select
                  className="w-full border px-3 py-2 rounded"
                  value={formData.tour.preferred_language}
                  onChange={(e) => handleInputChange('tour', 'preferred_language', e.target.value)}
                >
                  <option value="korean">한국어</option>
                  <option value="english">영어</option>
                  <option value="chinese">중국어</option>
                  <option value="japanese">일본어</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">투어 특별 요청사항</label>
                <textarea
                  className="w-full border px-3 py-2 rounded"
                  rows={2}
                  value={formData.tour.special_requests}
                  onChange={(e) => handleInputChange('tour', 'special_requests', e.target.value)}
                  placeholder="특별한 관심사나 요청사항"
                />
              </div>
            </div>
          </SectionBox>

          {/* 고객 정보 */}
          <SectionBox title="👤 고객 정보">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">성명 *</label>
                <input
                  type="text"
                  className="w-full border px-3 py-2 rounded"
                  value={formData.customer.name}
                  onChange={(e) => handleInputChange('customer', 'name', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">연락처 *</label>
                <input
                  type="tel"
                  className="w-full border px-3 py-2 rounded"
                  value={formData.customer.phone}
                  onChange={(e) => handleInputChange('customer', 'phone', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">이메일 *</label>
                <input
                  type="email"
                  className="w-full border px-3 py-2 rounded"
                  value={formData.customer.email}
                  onChange={(e) => handleInputChange('customer', 'email', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">비상 연락처</label>
                <input
                  type="tel"
                  className="w-full border px-3 py-2 rounded"
                  value={formData.customer.emergency_contact}
                  onChange={(e) =>
                    handleInputChange('customer', 'emergency_contact', e.target.value)
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">특별한 요구사항</label>
                <textarea
                  className="w-full border px-3 py-2 rounded"
                  rows={3}
                  value={formData.customer.special_needs}
                  onChange={(e) => handleInputChange('customer', 'special_needs', e.target.value)}
                  placeholder="휠체어, 알레르기, 기타 특별한 요구사항"
                />
              </div>
            </div>
          </SectionBox>

          {/* 할인 및 제출 */}
          <SectionBox title="💰 할인 및 최종 확인">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">할인율 (%)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  className="w-full md:w-1/4 border px-3 py-2 rounded"
                  value={formData.discount_rate}
                  onChange={(e) =>
                    handleInputChange('root', 'discount_rate', parseFloat(e.target.value))
                  }
                />
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h3 className="font-semibold text-yellow-800 mb-2">📝 견적 요청 확인사항</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• 모든 가격은 예상 금액이며, 최종 확정 후 변동될 수 있습니다.</li>
                  <li>• 견적 요청 후 24시간 내에 담당자가 연락드립니다.</li>
                  <li>• 성수기/비수기에 따라 가격이 달라질 수 있습니다.</li>
                  <li>• 취소 정책은 각 서비스별로 다르게 적용됩니다.</li>
                </ul>
              </div>

              <div className="flex justify-center space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  뒤로가기
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? '저장중...' : '📋 견적 요청하기'}
                </button>
              </div>
            </div>
          </SectionBox>
        </form>
      </div>
    </PageWrapper>
  );
}
