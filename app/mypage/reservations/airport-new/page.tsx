'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

function AirportReservationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get('quoteId');

  // 폼 상태 - reservation_airport 테이블 컬럼 기반
  const [form, setForm] = useState({
    airport_price_code: '',
    ra_airport_name: '',
    ra_pickup_location: '',
    ra_dropoff_location: '',
    ra_airport_location: '',
    ra_flight_number: '',
    ra_datetime: '',
    ra_direction: 'departure',
    ra_stopover_location: '',
    ra_stopover_wait_minutes: 0,
    ra_car_count: 1,
    ra_passenger_count: 1,
    ra_luggage_count: 0,
    ra_is_processed: false,
    request_note: ''
  });

  // 옵션 데이터
  const [airportPriceInfo, setAirportPriceInfo] = useState<any[]>([]);
  const [airportData, setAirportData] = useState<any[]>([]);

  // 로딩 상태
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);

  useEffect(() => {
    if (!quoteId) {
      alert('견적 ID가 필요합니다.');
      router.push('/mypage/reservations');
      return;
    }
    loadQuote();
    loadQuoteLinkedData();
  }, [quoteId, router]);

  // 견적 정보 로드
  const loadQuote = async () => {
    try {
      const { data: quoteData, error } = await supabase
        .from('quote')
        .select('id, title, status')
        .eq('id', quoteId)
        .single();

      if (error || !quoteData) {
        alert('견적을 찾을 수 없습니다.');
        router.push('/mypage/reservations');
        return;
      }

      setQuote(quoteData);
    } catch (error) {
      console.error('견적 로드 오류:', error);
      alert('견적 정보를 불러오는 중 오류가 발생했습니다.');
    }
  };

  // 견적에 연결된 공항 데이터 로드
  const loadQuoteLinkedData = async () => {
    try {
      // 견적에 연결된 quote_item들 조회 (usage_date 포함)
      const { data: quoteItems } = await supabase
        .from('quote_item')
        .select('service_type, service_ref_id, quantity, unit_price, total_price, usage_date')
        .eq('quote_id', quoteId)
        .eq('service_type', 'airport');

      if (quoteItems && quoteItems.length > 0) {
        await loadAllAirportInfo(quoteItems);

        // 첫 번째 공항 아이템에서 날짜 설정
        const firstAirportUsageDate = quoteItems[0]?.usage_date;
        if (firstAirportUsageDate) {
          setForm(prev => ({
            ...prev,
            ra_datetime: firstAirportUsageDate
          }));
        }
      }
    } catch (error) {
      console.error('견적 연결 데이터 로드 오류:', error);
    }
  };

  // 모든 공항 정보 로드
  const loadAllAirportInfo = async (airportItems: any[]) => {
    try {
      const allAirportData = [];
      const airportPriceDataList = [];

      // 각 airport item에 대해 정보 조회
      for (const airportItem of airportItems) {
        // airport 테이블에서 공항 정보 조회
        const { data: airportData } = await supabase
          .from('airport')
          .select('*')
          .eq('id', airportItem.service_ref_id)
          .single();

        if (airportData) {
          // airport_price 테이블에서 가격 정보 조회
          const { data: airportPriceData } = await supabase
            .from('airport_price')
            .select('*')
            .eq('airport_code', airportData.airport_code);

          if (airportPriceData && airportPriceData.length > 0) {
            // quote_item 정보와 함께 저장
            allAirportData.push({
              ...airportData,
              quoteItem: airportItem,
              priceInfo: airportPriceData[0] // 첫 번째 가격 정보 사용
            });

            airportPriceDataList.push(...airportPriceData);
          }
        }
      }

      setAirportData(allAirportData);
      setAirportPriceInfo(airportPriceDataList);

      // 첫 번째 공항 정보로 폼 기본값 설정
      if (allAirportData.length > 0) {
        const firstAirport = allAirportData[0];
        setForm(prev => ({
          ...prev,
          airport_price_code: firstAirport.airport_code,
          ra_airport_name: firstAirport.airport_name,
          ra_pickup_location: firstAirport.pickup_location || '',
          ra_dropoff_location: firstAirport.dropoff_location || '',
          ra_airport_location: firstAirport.airport_location || '',
          ra_flight_number: firstAirport.flight_number || '',
          ra_direction: firstAirport.direction || 'departure',
          ra_stopover_location: firstAirport.stopover_location || '',
          ra_stopover_wait_minutes: firstAirport.stopover_wait_minutes || 0,
          ra_car_count: firstAirport.car_count || 1,
          ra_passenger_count: firstAirport.passenger_count || 1,
          ra_luggage_count: firstAirport.luggage_count || 0,
          ra_datetime: airportItems[0]?.usage_date || ''
        }));
      }

    } catch (error) {
      console.error('공항 정보 로드 오류:', error);
    }
  };

  // 예약 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 유효성 검사
      if (!form.ra_airport_name) {
        alert('공항명은 필수 입력 항목입니다.');
        return;
      }

      if (!form.ra_datetime) {
        alert('출발/도착 일시는 필수 입력 항목입니다.');
        return;
      }

      if (form.ra_passenger_count === 0) {
        alert('탑승 인원은 최소 1명 이상이어야 합니다.');
        return;
      }

      // 먼저 reservation 테이블에 메인 예약 데이터 생성
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push(`/mypage/reservations?quoteId=${quoteId}`);
        return;
      }

      // 기존 사용자 정보 확인
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', user.id)
        .single();

      // 사용자가 없거나 'guest'일 경우에만 'member'로 승급 또는 등록
      if (!existingUser || existingUser.role === 'guest') {
        const { error: upsertError } = await supabase
          .from('users')
          .upsert({
            id: user.id,
            email: user.email,
            role: 'member', // 예약 시 'member'로 승급
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });

        if (upsertError) {
          console.error('사용자 역할 업데이트 오류:', upsertError);
          // 에러가 발생해도 예약을 중단하지 않고 계속 진행할 수 있음
        }
      }

      // reservation 테이블에 메인 예약 생성
      const { data: reservationData, error: reservationError } = await supabase
        .from('reservation')
        .insert({
          re_user_id: user.id,
          re_quote_id: quoteId,
          re_type: 'airport',
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

      // reservation_airport 데이터 생성
      const reservationAirportData = {
        ra_reservation_id: reservationData.re_id,
        airport_price_code: form.airport_price_code,
        ra_airport_name: form.ra_airport_name,
        ra_pickup_location: form.ra_pickup_location,
        ra_dropoff_location: form.ra_dropoff_location,
        ra_airport_location: form.ra_airport_location,
        ra_flight_number: form.ra_flight_number,
        ra_datetime: form.ra_datetime ? new Date(form.ra_datetime).toISOString() : null,
        ra_direction: form.ra_direction,
        ra_stopover_location: form.ra_stopover_location,
        ra_stopover_wait_minutes: form.ra_stopover_wait_minutes,
        ra_car_count: form.ra_car_count,
        ra_passenger_count: form.ra_passenger_count,
        ra_luggage_count: form.ra_luggage_count,
        ra_is_processed: false,
        request_note: form.request_note
      };

      // reservation_airport 테이블에 삽입
      const { data: reservationResult, error: airportReservationError } = await supabase
        .from('reservation_airport')
        .insert(reservationAirportData)
        .select()
        .single();

      if (airportReservationError) {
        console.error('공항 예약 저장 오류:', airportReservationError);
        alert('공항 예약 저장 중 오류가 발생했습니다.');
        return;
      }

      alert('공항 서비스 예약이 성공적으로 저장되었습니다!');
      router.push(`/mypage/reservations?quoteId=${quoteId}`);

    } catch (error) {
      console.error('예약 저장 오류:', error);
      alert('예약 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!quote) {
    return (
      <PageWrapper>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-gray-800">✈️ 공항 서비스 예약</h1>
            <p className="text-sm text-gray-600 mt-1">견적: {quote.title}</p>
          </div>
          <button
            onClick={() => router.push('/mypage/reservations')}
            className="px-3 py-1 bg-gray-50 text-gray-600 rounded border text-sm hover:bg-gray-100"
          >
            목록으로
          </button>
        </div>

        {/* 공항 가격 정보 */}
        {airportPriceInfo.length > 0 && (
          <SectionBox title="공항 서비스 가격 정보">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-medium text-blue-800 mb-3">✈️ 공항 서비스 정보</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {airportPriceInfo.map((price, idx) => (
                  <div key={idx} className="space-y-2 p-2 border border-gray-200 rounded bg-white">
                    {Object.entries(price)
                      .filter(([col]) => col !== 'deleted' && col !== 'is_deleted')
                      .map(([col, val]) => {
                        // 컬럼명 한글 매핑
                        const colMap: Record<string, string> = {
                          airport: '공항명',
                          area: '지역',
                          car_type: '차량종류',
                          price: '가격',
                          created_at: '생성일',
                          updated_at: '수정일',
                          airport_category: '구분',
                          airport_route: '경로',
                          airport_car_type: '차량종류',
                        };
                        if (col === 'airport_code') return null;
                        const label = colMap[col] || col;
                        return (
                          <div key={col}>
                            <span className="text-gray-600">{label}:</span> <span className="font-medium">{typeof val === 'number' ? val.toLocaleString() : String(val)}</span>
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>
          </SectionBox>
        )}

        {/* 공항 서비스 예약 폼 */}
        <SectionBox title="공항 서비스 예약 정보">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 구분: 픽업 */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-blue-900 mb-4">🚗 구분: 픽업</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    공항명
                  </label>
                  <input
                    type="text"
                    value={form.ra_airport_name}
                    onChange={(e) => handleInputChange('ra_airport_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    항공편명
                  </label>
                  <input
                    type="text"
                    value={form.ra_flight_number}
                    onChange={(e) => handleInputChange('ra_flight_number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="예: KE001"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    도착일시
                  </label>
                  <input
                    type="datetime-local"
                    value={form.ra_datetime}
                    onChange={(e) => handleInputChange('ra_datetime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    장소명
                  </label>
                  <input
                    type="text"
                    value={form.ra_pickup_location}
                    onChange={(e) => handleInputChange('ra_pickup_location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    경유지
                  </label>
                  <input
                    type="text"
                    value={form.ra_stopover_location}
                    onChange={(e) => handleInputChange('ra_stopover_location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="경유지가 있을 경우 입력"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    경유지 대기시간 (분)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.ra_stopover_wait_minutes}
                    onChange={(e) => handleInputChange('ra_stopover_wait_minutes', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    탑승 인원 수
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.ra_passenger_count}
                    onChange={(e) => handleInputChange('ra_passenger_count', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    수하물 개수
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.ra_luggage_count}
                    onChange={(e) => handleInputChange('ra_luggage_count', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* 구분: 샌딩 */}
            <div className="bg-green-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-green-900 mb-4">✈️ 구분: 샌딩</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    장소명
                  </label>
                  <input
                    type="text"
                    value={form.ra_dropoff_location}
                    onChange={(e) => handleInputChange('ra_dropoff_location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    출발일시
                  </label>
                  <input
                    type="datetime-local"
                    value={form.ra_datetime}
                    onChange={(e) => handleInputChange('ra_datetime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    경유지
                  </label>
                  <input
                    type="text"
                    value={form.ra_stopover_location}
                    onChange={(e) => handleInputChange('ra_stopover_location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="경유지가 있을 경우 입력"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    경유지 대기시간 (분)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.ra_stopover_wait_minutes}
                    onChange={(e) => handleInputChange('ra_stopover_wait_minutes', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    탑승인원수
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.ra_passenger_count}
                    onChange={(e) => handleInputChange('ra_passenger_count', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    수하물 개수
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.ra_luggage_count}
                    onChange={(e) => handleInputChange('ra_luggage_count', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* 특별 요청 사항 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                특별 요청 사항
              </label>
              <textarea
                value={form.request_note}
                onChange={(e) => handleInputChange('request_note', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="특별 서비스, 휠체어 지원, 어린이 카시트 등 요청사항을 입력해주세요..."
              />
            </div>

            {/* 제출 버튼 */}
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => router.push('/mypage/reservations')}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? '예약 처리 중...' : '공항 서비스 예약 완료'}
              </button>
            </div>
          </form>
        </SectionBox>
      </div>
    </PageWrapper>
  );
}

export default function AirportReservationPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64">로딩 중...</div>}>
      <AirportReservationContent />
    </Suspense>
  );
}

