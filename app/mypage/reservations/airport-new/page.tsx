'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

interface AirportReservationForm {
  airport_price_code: string;
  ra_airport_name: string;
  ra_pickup_location: string;
  ra_dropoff_location: string;
  ra_airport_location: string;
  ra_flight_number: string;
  ra_datetime: string;
  ra_direction: string;
  ra_stopover_location: string;
  ra_stopover_wait_minutes: number;
  ra_car_count: number;
  ra_passenger_count: number;
  ra_luggage_count: number;
  ra_is_processed: boolean;
  request_note: string;
}

function AirportReservationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get('quoteId');
  
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState<AirportReservationForm>({
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

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !authUser) {
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }
      setUser(authUser);
    } catch (error) {
      console.error('인증 확인 오류:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // 1. 메인 예약 레코드 생성
      const { data: reservationData, error: reservationError } = await supabase
        .from('reservation')
        .insert({
          re_user_id: user.id,
          re_quote_id: quoteId,
          re_type: 'airport',
          re_status: 'pending'
        })
        .select()
        .single();

      if (reservationError) throw reservationError;

      // 2. 공항 서비스 예약 상세 정보 저장
      const { error: airportError } = await supabase
        .from('reservation_airport')
        .insert({
          ra_reservation_id: reservationData.re_id,
          ...formData
        });

      if (airportError) throw airportError;

      alert('공항 서비스 예약이 성공적으로 등록되었습니다!');
      router.push('/mypage/reservations');
      
    } catch (error) {
      console.error('공항 서비스 예약 오류:', error);
      alert('예약 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof AirportReservationForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto">
        <SectionBox title="✈️ 공항 서비스 예약">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 공항 기본 정보 */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-blue-900 mb-4">공항 기본 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    공항 가격 코드
                  </label>
                  <input
                    type="text"
                    value={formData.airport_price_code}
                    onChange={(e) => handleInputChange('airport_price_code', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    공항명
                  </label>
                  <input
                    type="text"
                    value={formData.ra_airport_name}
                    onChange={(e) => handleInputChange('ra_airport_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    공항 위치
                  </label>
                  <input
                    type="text"
                    value={formData.ra_airport_location}
                    onChange={(e) => handleInputChange('ra_airport_location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="터미널 번호 등"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    방향
                  </label>
                  <select
                    value={formData.ra_direction}
                    onChange={(e) => handleInputChange('ra_direction', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="departure">출발 (공항으로)</option>
                    <option value="arrival">도착 (공항에서)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 항공편 정보 */}
            <div className="bg-yellow-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-yellow-900 mb-4">항공편 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    항공편명
                  </label>
                  <input
                    type="text"
                    value={formData.ra_flight_number}
                    onChange={(e) => handleInputChange('ra_flight_number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="예: KE001"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    출발/도착 일시
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.ra_datetime}
                    onChange={(e) => handleInputChange('ra_datetime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 픽업/드롭오프 정보 */}
            <div className="bg-green-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-green-900 mb-4">픽업/드롭오프 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    픽업 장소
                  </label>
                  <input
                    type="text"
                    value={formData.ra_pickup_location}
                    onChange={(e) => handleInputChange('ra_pickup_location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    드롭오프 장소
                  </label>
                  <input
                    type="text"
                    value={formData.ra_dropoff_location}
                    onChange={(e) => handleInputChange('ra_dropoff_location', e.target.value)}
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
                    value={formData.ra_stopover_location}
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
                    value={formData.ra_stopover_wait_minutes}
                    onChange={(e) => handleInputChange('ra_stopover_wait_minutes', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* 차량 및 인원 정보 */}
            <div className="bg-purple-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-purple-900 mb-4">차량 및 인원 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    차량 대수
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.ra_car_count}
                    onChange={(e) => handleInputChange('ra_car_count', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    탑승 인원 수
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.ra_passenger_count}
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
                    value={formData.ra_luggage_count}
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
                value={formData.request_note}
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
