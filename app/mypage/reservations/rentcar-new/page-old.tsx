'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

function RentcarReservationContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const quoteId = searchParams.get('quoteId');

    // 폼 상태 - reservation_rentcar 테이블 컬럼 기반
    const [form, setForm] = useState({
        rentcar_price_code: '',
        rentcar_count: 1,
        unit_price: 0,
        car_count: 1,
        passenger_count: 1,
        pickup_datetime: '',
        pickup_location: '',
        destination: '',
        via_location: '',
        via_waiting: '',
        luggage_count: 0,
        total_price: 0,
        request_note: ''
    });

    // 옵션 데이터
    const [rentPriceInfo, setRentPriceInfo] = useState<any[]>([]);
    const [rentcarData, setRentcarData] = useState<any[]>([]);

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

    // 견적에 연결된 렌트카 데이터 로드
    const loadQuoteLinkedData = async () => {
        try {
            // 견적에 연결된 quote_item들 조회 (usage_date 포함)
            const { data: quoteItems } = await supabase
                .from('quote_item')
                .select('service_type, service_ref_id, quantity, unit_price, total_price, usage_date')
                .eq('quote_id', quoteId)
                .eq('service_type', 'rentcar');

            if (quoteItems && quoteItems.length > 0) {
                await loadAllRentcarInfo(quoteItems);

                // 첫 번째 렌트카 아이템에서 날짜 설정
                const firstRentcarUsageDate = quoteItems[0]?.usage_date;
                if (firstRentcarUsageDate) {
                    setForm(prev => ({
                        ...prev,
                        pickup_datetime: firstRentcarUsageDate
                    }));
                }
            }
        } catch (error) {
            console.error('견적 연결 데이터 로드 오류:', error);
        }
    };

    // 모든 렌트카 정보 로드
    const loadAllRentcarInfo = async (rentcarItems: any[]) => {
        try {
            const allRentcarData = [];
            const rentPriceDataList = [];

            // 각 rentcar item에 대해 정보 조회
            for (const rentcarItem of rentcarItems) {
                // rentcar 테이블에서 렌트카 정보 조회
                const { data: rentcarData } = await supabase
                    .from('rentcar')
                    .select('*')
                    .eq('id', rentcarItem.service_ref_id)
                    .single();

                if (rentcarData) {
                    // rent_price 테이블에서 가격 정보 조회
                    const { data: rentPriceData } = await supabase
                        .from('rent_price')
                        .select('*')
                        .eq('rent_code', rentcarData.rent_code);

                    if (rentPriceData && rentPriceData.length > 0) {
                        // quote_item 정보와 함께 저장
                        allRentcarData.push({
                            ...rentcarData,
                            quoteItem: rentcarItem,
                            priceInfo: rentPriceData[0] // 첫 번째 가격 정보 사용
                        });

                        rentPriceDataList.push(...rentPriceData);
                    }
                }
            }

            setRentcarData(allRentcarData);
            setRentPriceInfo(rentPriceDataList);

            // 첫 번째 렌트카 정보로 폼 기본값 설정
            if (allRentcarData.length > 0) {
                const firstRentcar = allRentcarData[0];
                setForm(prev => ({
                    ...prev,
                    rentcar_price_code: firstRentcar.rent_code,
                    unit_price: firstRentcar.quoteItem?.unit_price || firstRentcar.priceInfo?.price || 0,
                    car_count: firstRentcar.car_count || 1,
                    passenger_count: firstRentcar.passenger_count || 1,
                    pickup_location: firstRentcar.pickup_location || '',
                    destination: firstRentcar.destination || '',
                    via_location: firstRentcar.via_location || '',
                    via_waiting: firstRentcar.via_waiting || '',
                    luggage_count: firstRentcar.luggage_count || 0,
                    total_price: firstRentcar.quoteItem?.total_price || 0,
                    pickup_datetime: rentcarItems[0]?.usage_date || ''
                }));
            }

        } catch (error) {
            console.error('렌트카 정보 로드 오류:', error);
        }
    };

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
          re_type: 'rentcar',
          re_status: 'pending'
        })
        .select()
        .single();

      if (reservationError) throw reservationError;

      // 2. 렌트카 예약 상세 정보 저장
      const { error: rentcarError } = await supabase
        .from('reservation_rentcar')
        .insert({
          reservation_id: reservationData.re_id,
          ...formData
        });

      if (rentcarError) throw rentcarError;

      alert('렌트카 예약이 성공적으로 등록되었습니다!');
      router.push(`/mypage/reservations?quoteId=${quoteId}`);

    } catch (error) {
      console.error('렌트카 예약 오류:', error);
      alert('예약 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof RentcarReservationForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto">
        <SectionBox title="🚗 렌트카 예약">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 렌트카 기본 정보 */}
            <div className="bg-green-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-green-900 mb-4">렌트카 기본 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    렌트카 가격 코드
                  </label>
                  <input
                    type="text"
                    value={formData.rentcar_price_code}
                    onChange={(e) => handleInputChange('rentcar_price_code', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    렌트카 대수
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.rentcar_count}
                    onChange={(e) => handleInputChange('rentcar_count', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    차량 대수
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.car_count}
                    onChange={(e) => handleInputChange('car_count', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    단가 (동)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.unit_price}
                    onChange={(e) => handleInputChange('unit_price', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* 이용 정보 */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-blue-900 mb-4">이용 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    탑승 인동 수
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.passenger_count}
                    onChange={(e) => handleInputChange('passenger_count', parseInt(e.target.value))}
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
                    value={formData.luggage_count}
                    onChange={(e) => handleInputChange('luggage_count', parseInt(e.target.value))}
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
                    required
                  />
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

            {/* 장소 정보 */}
            <div className="bg-yellow-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-yellow-900 mb-4">장소 정보</h3>
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
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    목적지
                  </label>
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(e) => handleInputChange('destination', e.target.value)}
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
                    value={formData.via_location}
                    onChange={(e) => handleInputChange('via_location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="경유지가 있을 경우 입력"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    경유지 대기 시간
                  </label>
                  <input
                    type="text"
                    value={formData.via_waiting}
                    onChange={(e) => handleInputChange('via_waiting', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="예: 30분, 1시간"
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
                placeholder="차량 타입, 특별 서비스, 운전자 요청사항 등을 입력해주세요..."
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
                className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? '예약 처리 중...' : '렌트카 예약 완료'}
              </button>
            </div>
          </form>
        </SectionBox>
      </div>
    </PageWrapper>
  );
}


export default function RentcarReservationPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64">로딩 중...</div>}>
      <RentcarReservationContent />
    </Suspense>
  );
}

