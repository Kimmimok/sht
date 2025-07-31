'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

interface CruiseReservationForm {
  room_price_code: string;
  checkin: string;
  guest_count: number;
  unit_price: number;
  boarding_assist: string;
  car_price_code: string;
  car_count: number;
  passenger_count: number;
  pickup_datetime: string;
  pickup_location: string;
  dropoff_location: string;
  room_total_price: number;
  car_total_price: number;
  request_note: string;
}

export default function CruiseReservationPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64">로딩 중...</div>}>
      <CruiseReservationContent />
    </Suspense>
  );
}

function CruiseReservationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get('quoteId');
  
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState<CruiseReservationForm>({
    room_price_code: '',
    checkin: '',
    guest_count: 1,
    unit_price: 0,
    boarding_assist: '',
    car_price_code: '',
    car_count: 0,
    passenger_count: 0,
    pickup_datetime: '',
    pickup_location: '',
    dropoff_location: '',
    room_total_price: 0,
    car_total_price: 0,
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
          re_type: 'cruise',
          re_status: 'pending'
        })
        .select()
        .single();

      if (reservationError) throw reservationError;

      // 2. 크루즈 예약 상세 정보 저장
      const { error: cruiseError } = await supabase
        .from('reservation_cruise')
        .insert({
          reservation_id: reservationData.re_id,
          ...formData
        });

      if (cruiseError) throw cruiseError;

      alert('크루즈 예약이 성공적으로 등록되었습니다!');
      router.push('/mypage/reservations');
      
    } catch (error) {
      console.error('크루즈 예약 오류:', error);
      alert('예약 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CruiseReservationForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto">
        <SectionBox title="🚢 크루즈 예약">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 객실 정보 섹션 */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-blue-900 mb-4">객실 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    객실 가격 코드
                  </label>
                  <input
                    type="text"
                    value={formData.room_price_code}
                    onChange={(e) => handleInputChange('room_price_code', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    체크인 날짜
                  </label>
                  <input
                    type="date"
                    value={formData.checkin}
                    onChange={(e) => handleInputChange('checkin', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    투숙 인원 수
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.guest_count}
                    onChange={(e) => handleInputChange('guest_count', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    단가 (원)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.unit_price}
                    onChange={(e) => handleInputChange('unit_price', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    승선 지원 서비스
                  </label>
                  <select
                    value={formData.boarding_assist}
                    onChange={(e) => handleInputChange('boarding_assist', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">선택하세요</option>
                    <option value="필요">필요</option>
                    <option value="불필요">불필요</option>
                    <option value="휠체어">휠체어 지원</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    객실 총 금액 (원)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.room_total_price}
                    onChange={(e) => handleInputChange('room_total_price', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* 차량 서비스 섹션 */}
            <div className="bg-green-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-green-900 mb-4">차량 서비스</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    차량 가격 코드
                  </label>
                  <input
                    type="text"
                    value={formData.car_price_code}
                    onChange={(e) => handleInputChange('car_price_code', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    차량 대수
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.car_count}
                    onChange={(e) => handleInputChange('car_count', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    탑승 인원 수
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.passenger_count}
                    onChange={(e) => handleInputChange('passenger_count', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    픽업 일시
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.pickup_datetime}
                    onChange={(e) => handleInputChange('pickup_datetime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    픽업 장소
                  </label>
                  <input
                    type="text"
                    value={formData.pickup_location}
                    onChange={(e) => handleInputChange('pickup_location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    드롭오프 장소
                  </label>
                  <input
                    type="text"
                    value={formData.dropoff_location}
                    onChange={(e) => handleInputChange('dropoff_location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    차량 총 금액 (원)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.car_total_price}
                    onChange={(e) => handleInputChange('car_total_price', parseFloat(e.target.value))}
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
                placeholder="추가 요청사항이나 특별한 요구사항을 입력해주세요..."
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
                {loading ? '예약 처리 중...' : '크루즈 예약 완료'}
              </button>
            </div>
          </form>
        </SectionBox>
      </div>
    </PageWrapper>
  );
}
