'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

function CruiseReservationContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const quoteId = searchParams.get('quoteId');

    // 폼 상태 - reservation_cruise 테이블 컬럼 기반
    const [form, setForm] = useState({
        room_price_code: '',
        checkin: '',
        guest_count: 0,
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

    // 옵션 데이터
    const [roomPriceInfo, setRoomPriceInfo] = useState<any>(null);
    const [carPriceInfo, setCarPriceInfo] = useState<any>(null);

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

    // 견적에 연결된 룸/차량 데이터 로드
    const loadQuoteLinkedData = async () => {
        try {
            // 견적에 연결된 quote_item들 조회
            const { data: quoteItems } = await supabase
                .from('quote_item')
                .select('service_type, service_ref_id')
                .eq('quote_id', quoteId);

            if (quoteItems) {
                // 룸 정보 로드
                const roomItems = quoteItems.filter(item => item.service_type === 'room');
                if (roomItems.length > 0) {
                    await loadRoomInfo(roomItems[0].service_ref_id);
                }

                // 차량 정보 로드
                const carItems = quoteItems.filter(item => item.service_type === 'car');
                if (carItems.length > 0) {
                    await loadCarInfo(carItems[0].service_ref_id);
                }
            }
        } catch (error) {
            console.error('견적 연결 데이터 로드 오류:', error);
        }
    };

    // 룸 정보 로드
    const loadRoomInfo = async (roomId: string) => {
        try {
            // room 테이블에서 룸 정보 조회
            const { data: roomData } = await supabase
                .from('room')
                .select('room_code')
                .eq('id', roomId)
                .single();

            if (roomData?.room_code) {
                // room_price 테이블에서 가격 정보 조회
                const { data: roomPriceData } = await supabase
                    .from('room_price')
                    .select('*')
                    .eq('room_code', roomData.room_code)
                    .limit(1)
                    .single();

                if (roomPriceData) {
                    setRoomPriceInfo(roomPriceData);
                    // 폼에 룸 코드 설정
                    setForm(prev => ({
                        ...prev,
                        room_price_code: roomData.room_code
                    }));
                }
            }
        } catch (error) {
            console.error('룸 정보 로드 오류:', error);
        }
    };

    // 차량 정보 로드
    const loadCarInfo = async (carId: string) => {
        try {
            // car 테이블에서 차량 정보 조회
            const { data: carData } = await supabase
                .from('car')
                .select('car_code')
                .eq('id', carId)
                .single();

            if (carData?.car_code) {
                // car_price 테이블에서 가격 정보 조회
                const { data: carPriceData } = await supabase
                    .from('car_price')
                    .select('*')
                    .eq('car_code', carData.car_code)
                    .limit(1)
                    .single();

                if (carPriceData) {
                    setCarPriceInfo(carPriceData);
                    // 폼에 차량 코드 설정
                    const carPriceCode = `${carPriceData.car_code}-${carPriceData.cruise}-${carPriceData.car_type}`;
                    setForm(prev => ({
                        ...prev,
                        car_price_code: carPriceCode
                    }));
                }
            }
        } catch (error) {
            console.error('차량 정보 로드 오류:', error);
        }
    };    // 폼 입력 핸들러
    const handleInputChange = (field: string, value: any) => {
        setForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // 인원수 변경 핸들러
    const handleCountChange = (field: string, increment: boolean) => {
        setForm(prev => ({
            ...prev,
            [field]: Math.max(0, (prev[field as keyof typeof prev] as number) + (increment ? 1 : -1))
        }));
    };

    // 폼 제출
    const handleSubmit = async () => {
        try {
            setLoading(true);

            // 필수 필드 검증
            if (!form.checkin) {
                alert('체크인 날짜는 필수 입력 항목입니다.');
                return;
            }

            if (form.guest_count === 0) {
                alert('투숙객 인원은 최소 1명 이상이어야 합니다.');
                return;
            }

            // reservation_cruise 데이터 생성
            const reservationCruiseData = {
                room_price_code: form.room_price_code,
                checkin: form.checkin,
                guest_count: form.guest_count,
                unit_price: form.unit_price,
                boarding_assist: form.boarding_assist,
                car_price_code: form.car_price_code,
                car_count: form.car_count,
                passenger_count: form.passenger_count,
                pickup_datetime: form.pickup_datetime ? new Date(form.pickup_datetime).toISOString() : null,
                pickup_location: form.pickup_location,
                dropoff_location: form.dropoff_location,
                room_total_price: form.room_total_price,
                car_total_price: form.car_total_price,
                request_note: form.request_note
            };

            // reservation_cruise 테이블에 삽입
            const { data: reservationResult, error: reservationError } = await supabase
                .from('reservation_cruise')
                .insert(reservationCruiseData)
                .select()
                .single();

            if (reservationError) {
                console.error('크루즈 예약 저장 오류:', reservationError);
                alert('크루즈 예약 저장 중 오류가 발생했습니다.');
                return;
            }

            alert('크루즈 예약이 성공적으로 저장되었습니다!');
            router.push('/mypage/reservations');

        } catch (error) {
            console.error('예약 저장 오류:', error);
            alert('예약 저장 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
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
                        <h1 className="text-lg font-bold text-gray-800">🚢 크루즈 예약</h1>
                        <p className="text-sm text-gray-600 mt-1">견적: {quote.title}</p>
                    </div>
                    <button
                        onClick={() => router.push('/mypage/reservations')}
                        className="px-3 py-1 bg-gray-50 text-gray-600 rounded border text-sm hover:bg-gray-100"
                    >
                        목록으로
                    </button>
                </div>

                {/* 크루즈 정보 */}
                <SectionBox title="크루즈 정보">
                    {/* 룸 정보 표시 */}
                    {roomPriceInfo && (
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h4 className="text-sm font-medium text-blue-800 mb-3">🏨 룸 정보</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div>
                                    <span className="text-gray-600">룸 코드:</span>
                                    <p className="font-medium text-gray-800">{form.room_price_code || '-'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">크루즈:</span>
                                    <p className="font-medium text-gray-800">{roomPriceInfo.cruise || '-'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">룸 타입:</span>
                                    <p className="font-medium text-gray-800">{roomPriceInfo.room_type || '-'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">일정:</span>
                                    <p className="font-medium text-gray-800">{roomPriceInfo.schedule || '-'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">가격:</span>
                                    <p className="font-medium text-blue-600">{roomPriceInfo.price ? `${roomPriceInfo.price.toLocaleString()}원` : '-'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">시작일:</span>
                                    <p className="font-medium text-gray-800">{roomPriceInfo.start_date || '-'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">종료일:</span>
                                    <p className="font-medium text-gray-800">{roomPriceInfo.end_date || '-'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">결제:</span>
                                    <p className="font-medium text-gray-800">{roomPriceInfo.payment || '-'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 차량 정보 표시 */}
                    {carPriceInfo && (
                        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                            <h4 className="text-sm font-medium text-green-800 mb-3">🚗 차량 정보</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div>
                                    <span className="text-gray-600">차량 코드:</span>
                                    <p className="font-medium text-gray-800">{carPriceInfo.car_code || '-'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">크루즈:</span>
                                    <p className="font-medium text-gray-800">{carPriceInfo.cruise || '-'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">차량 타입:</span>
                                    <p className="font-medium text-gray-800">{carPriceInfo.car_type || '-'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">일정:</span>
                                    <p className="font-medium text-gray-800">{carPriceInfo.schedule || '-'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">가격:</span>
                                    <p className="font-medium text-green-600">{carPriceInfo.price ? `${carPriceInfo.price.toLocaleString()}원` : '-'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">카테고리:</span>
                                    <p className="font-medium text-gray-800">{carPriceInfo.car_category || '-'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">승객수:</span>
                                    <p className="font-medium text-gray-800">{carPriceInfo.passenger_count || '-'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                체크인 날짜 *
                            </label>
                            <input
                                type="date"
                                value={form.checkin}
                                onChange={(e) => handleInputChange('checkin', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                단가
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.unit_price}
                                onChange={(e) => handleInputChange('unit_price', parseFloat(e.target.value) || 0)}
                                placeholder="단가를 입력하세요"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                승선 도움 서비스
                            </label>
                            <input
                                type="text"
                                value={form.boarding_assist}
                                onChange={(e) => handleInputChange('boarding_assist', e.target.value)}
                                placeholder="승선 도움이 필요한 경우 입력하세요"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </SectionBox>

                {/* 인원 정보 */}
                <SectionBox title="인원 정보">
                    <div className="text-center">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            투숙객 수 *
                        </label>
                        <div className="flex items-center justify-center space-x-4">
                            <button
                                type="button"
                                onClick={() => handleCountChange('guest_count', false)}
                                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                            >
                                -
                            </button>
                            <span className="text-xl font-semibold w-8 text-center">
                                {form.guest_count}
                            </span>
                            <button
                                type="button"
                                onClick={() => handleCountChange('guest_count', true)}
                                className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </SectionBox>

                {/* 차량 정보 */}
                <SectionBox title="차량 정보">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    차량 수
                                </label>
                                <div className="flex items-center space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => handleCountChange('car_count', false)}
                                        className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm"
                                    >
                                        -
                                    </button>
                                    <span className="text-lg font-semibold w-6 text-center">
                                        {form.car_count}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleCountChange('car_count', true)}
                                        className="w-6 h-6 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center text-sm"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    승객 수
                                </label>
                                <div className="flex items-center space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => handleCountChange('passenger_count', false)}
                                        className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm"
                                    >
                                        -
                                    </button>
                                    <span className="text-lg font-semibold w-6 text-center">
                                        {form.passenger_count}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleCountChange('passenger_count', true)}
                                        className="w-6 h-6 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center text-sm"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                픽업 일시
                            </label>
                            <input
                                type="datetime-local"
                                value={form.pickup_datetime}
                                onChange={(e) => handleInputChange('pickup_datetime', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                픽업 장소
                            </label>
                            <input
                                type="text"
                                value={form.pickup_location}
                                onChange={(e) => handleInputChange('pickup_location', e.target.value)}
                                placeholder="픽업 장소를 입력하세요"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                드롭오프 장소
                            </label>
                            <input
                                type="text"
                                value={form.dropoff_location}
                                onChange={(e) => handleInputChange('dropoff_location', e.target.value)}
                                placeholder="드롭오프 장소를 입력하세요"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </SectionBox>

                {/* 가격 정보 */}
                <SectionBox title="가격 정보">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                룸 총 가격
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.room_total_price}
                                onChange={(e) => handleInputChange('room_total_price', parseFloat(e.target.value) || 0)}
                                placeholder="룸 총 가격을 입력하세요"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                차량 총 가격
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.car_total_price}
                                onChange={(e) => handleInputChange('car_total_price', parseFloat(e.target.value) || 0)}
                                placeholder="차량 총 가격을 입력하세요"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            특별 요청사항
                        </label>
                        <textarea
                            value={form.request_note}
                            onChange={(e) => handleInputChange('request_note', e.target.value)}
                            placeholder="특별한 요청사항이 있으시면 입력해주세요"
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </SectionBox>

                {/* 제출 버튼 */}
                <div className="flex justify-center space-x-4 pt-6">
                    <button
                        onClick={() => router.push('/mypage/reservations')}
                        className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? '저장 중...' : '크루즈 예약 저장'}
                    </button>
                </div>
            </div>
        </PageWrapper>
    );
}

export default function CruiseReservationPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64">로딩 중...</div>}>
            <CruiseReservationContent />
        </Suspense>
    );
}
