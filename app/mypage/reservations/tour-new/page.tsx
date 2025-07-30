'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

interface TourReservationForm {
  tour_price_code: string;
  tour_capacity: number;
  pickup_location: string;
  dropoff_location: string;
  total_price: number;
  request_note: string;
}

export default function TourReservationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get('quoteId');
  
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState<TourReservationForm>({
    tour_price_code: '',
    tour_capacity: 1,
    pickup_location: '',
    dropoff_location: '',
    total_price: 0,
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
          re_type: 'tour',
          re_status: 'pending'
        })
        .select()
        .single();

      if (reservationError) throw reservationError;

      // 2. 투어 예약 상세 정보 저장
      const { error: tourError } = await supabase
        .from('reservation_tour')
        .insert({
          reservation_id: reservationData.re_id,
          ...formData
        });

      if (tourError) throw tourError;

      alert('투어 예약이 성공적으로 등록되었습니다!');
      router.push('/mypage/reservations');
      
    } catch (error) {
      console.error('투어 예약 오류:', error);
      alert('예약 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof TourReservationForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto">
        <SectionBox title="🗺️ 투어 예약">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 투어 기본 정보 */}
            <div className="bg-purple-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-purple-900 mb-4">투어 기본 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    투어 가격 코드
                  </label>
                  <input
                    type="text"
                    value={formData.tour_price_code}
                    onChange={(e) => handleInputChange('tour_price_code', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    참가 인원 수
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.tour_capacity}
                    onChange={(e) => handleInputChange('tour_capacity', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    총 금액 (원)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.total_price}
                    onChange={(e) => handleInputChange('total_price', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* 픽업/드롭오프 정보 */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-blue-900 mb-4">픽업/드롭오프 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    픽업 장소
                  </label>
                  <input
                    type="text"
                    value={formData.pickup_location}
                    onChange={(e) => handleInputChange('pickup_location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                    placeholder="호텔명, 주소 등 상세하게 입력해주세요"
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
                    required
                    placeholder="투어 종료 후 원하는 하차 장소"
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
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="투어 관련 특별 요청사항을 입력해주세요:&#10;- 특별한 관심사나 선호하는 활동&#10;- 신체적 제약사항이나 접근성 요구사항&#10;- 식이 제한사항 (알레르기, 채식주의 등)&#10;- 언어 선호 (가이드 언어)&#10;- 기타 특별 요청사항"
              />
            </div>

            {/* 투어 안내 정보 */}
            <div className="bg-yellow-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-yellow-900 mb-4">📋 투어 예약 안내</h3>
              <div className="space-y-2 text-sm text-yellow-800">
                <p>• 투어 예약은 최소 3일 전에 완료해주세요.</p>
                <p>• 날씨나 현지 사정에 따라 일정이 변경될 수 있습니다.</p>
                <p>• 취소 정책: 투어 1일 전 취소 시 50% 환불, 당일 취소 시 환불 불가</p>
                <p>• 투어 가이드와의 소통을 위해 현지 연락처를 미리 준비해주세요.</p>
                <p>• 개인 물품 및 안전사고에 대한 책임은 개인에게 있습니다.</p>
              </div>
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
                className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 disabled:opacity-50"
              >
                {loading ? '예약 처리 중...' : '투어 예약 완료'}
              </button>
            </div>
          </form>
        </SectionBox>
      </div>
    </PageWrapper>
  );
}
