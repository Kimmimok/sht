'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

interface HotelReservationForm {
  schedule: string;
  room_count: number;
  checkin_date: string;
  breakfast_service: string;
  hotel_category: string;
  guest_count: number;
  total_price: number;
  hotel_price_code: string;
  request_note: string;
}

function HotelReservationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get('quoteId');

  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState<HotelReservationForm>({
    schedule: '',
    room_count: 1,
    checkin_date: '',
    breakfast_service: '',
    hotel_category: '',
    guest_count: 1,
    total_price: 0,
    hotel_price_code: '',
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
          re_type: 'hotel',
          re_status: 'pending'
        })
        .select()
        .single();

      if (reservationError) throw reservationError;

      // 2. 호텔 예약 상세 정보 저장
      const { error: hotelError } = await supabase
        .from('reservation_hotel')
        .insert({
          reservation_id: reservationData.re_id,
          ...formData
        });

      if (hotelError) throw hotelError;

      alert('호텔 예약이 성공적으로 등록되었습니다!');
      router.push(`/mypage/reservations?quoteId=${quoteId}`);

    } catch (error) {
      console.error('호텔 예약 오류:', error);
      alert('예약 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof HotelReservationForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto">
        <SectionBox title="🏨 호텔 예약">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 호텔 기본 정보 */}
            <div className="bg-pink-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-pink-900 mb-4">호텔 기본 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    호텔 가격 코드
                  </label>
                  <input
                    type="text"
                    value={formData.hotel_price_code}
                    onChange={(e) => handleInputChange('hotel_price_code', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    일정
                  </label>
                  <input
                    type="text"
                    value={formData.schedule}
                    onChange={(e) => handleInputChange('schedule', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="예: 3박 4일"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    호텔 카테고리
                  </label>
                  <select
                    value={formData.hotel_category}
                    onChange={(e) => handleInputChange('hotel_category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">선택하세요</option>
                    <option value="5성급">5성급</option>
                    <option value="4성급">4성급</option>
                    <option value="3성급">3성급</option>
                    <option value="리조트">리조트</option>
                    <option value="부티크">부티크 호텔</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    체크인 날짜
                  </label>
                  <input
                    type="date"
                    value={formData.checkin_date}
                    onChange={(e) => handleInputChange('checkin_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 객실 및 투숙객 정보 */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-blue-900 mb-4">객실 및 투숙객 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    객실 수
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.room_count}
                    onChange={(e) => handleInputChange('room_count', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    투숙객 수
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
                    조식 서비스
                  </label>
                  <select
                    value={formData.breakfast_service}
                    onChange={(e) => handleInputChange('breakfast_service', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">선택하세요</option>
                    <option value="포함">조식 포함</option>
                    <option value="미포함">조식 미포함</option>
                    <option value="컨티넨탈">컨티넨탈 조식</option>
                    <option value="뷔페">뷔페 조식</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    총 금액 (동)
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
                placeholder="객실 타입, 위치, 특별 서비스 등 요청사항을 입력해주세요..."
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
                className="bg-pink-500 text-white px-6 py-3 rounded-lg hover:bg-pink-600 disabled:opacity-50"
              >
                {loading ? '예약 처리 중...' : '호텔 예약 완료'}
              </button>
            </div>
          </form>
        </SectionBox>
      </div>
    </PageWrapper>
  );
}

export default function HotelReservationPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64">로딩 중...</div>}>
      <HotelReservationContent />
    </Suspense>
  );
}

