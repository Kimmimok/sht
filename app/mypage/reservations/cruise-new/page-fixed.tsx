'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

interface CruiseReservationForm {
    room_price_code: string;
    checkin: string;
    guest_count: number;
    unit_price: number;
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
    const router = useRouter();
    const searchParams = useSearchParams();
    const quoteId = searchParams?.get('quoteId');

    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [formData, setFormData] = useState<CruiseReservationForm>({
        room_price_code: '',
        checkin: '',
        guest_count: 0,
        unit_price: 0,
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
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
                alert('로그인이 필요합니다.');
                router.push('/login');
                return;
            }

            setUser(user);

            if (quoteId) {
                await loadQuoteData(quoteId);
            }

        } catch (error) {
            console.error('인증 확인 중 오류:', error);
            alert('오류가 발생했습니다.');
            router.push('/');
        } finally {
            setLoading(false);
        }
    };

    const loadQuoteData = async (quoteId: string) => {
        try {
            const { data: quote, error } = await supabase
                .from('quote')
                .select(`
          *,
          quote_room(*),
          quote_car(*)
        `)
                .eq('id', quoteId)
                .single();

            if (error) {
                console.error('견적 데이터 로드 오류:', error);
                alert('견적 정보를 불러오는 중 오류가 발생했습니다.');
                return;
            }

            if (quote) {
                setFormData(prev => ({
                    ...prev,
                    checkin: quote.checkin || '',
                    room_price_code: quote.quote_room?.[0]?.room_price_code || '',
                    car_price_code: quote.quote_car?.[0]?.car_price_code || '',
                    guest_count: quote.quote_room?.[0]?.guest_count || 0,
                    car_count: quote.quote_car?.[0]?.car_count || 0,
                    passenger_count: quote.quote_car?.[0]?.passenger_count || 0,
                    pickup_location: quote.quote_car?.[0]?.pickup_location || '',
                    dropoff_location: quote.quote_car?.[0]?.dropoff_location || '',
                }));
            }
        } catch (error) {
            console.error('견적 로드 중 오류:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            alert('로그인이 필요합니다.');
            return;
        }

        try {
            setLoading(true);

            // 예약 데이터 저장
            const { data: reservation, error: reservationError } = await supabase
                .from('reservation')
                .insert({
                    user_id: user.id,
                    quote_id: quoteId,
                    checkin: formData.checkin,
                    guest_count: formData.guest_count,
                    total_price: formData.room_total_price + formData.car_total_price,
                    request_note: formData.request_note,
                    status: 'confirmed'
                })
                .select()
                .single();

            if (reservationError) {
                console.error('예약 저장 오류:', reservationError);
                alert('예약 저장 중 오류가 발생했습니다.');
                return;
            }

            alert('예약이 완료되었습니다!');
            router.push(`/mypage/reservations/${reservation.id}/view`);

        } catch (error) {
            console.error('예약 처리 중 오류:', error);
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

    if (loading) {
        return (
            <PageWrapper>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper>
            <div className="max-w-4xl mx-auto">
                <SectionBox title="크루즈 예약하기">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* 객실 예약 정보 */}
                        <div className="bg-blue-50 rounded-lg p-6">
                            <h3 className="text-lg font-bold text-blue-900 mb-4">객실 예약</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        객실 가격코드
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.room_price_code}
                                        onChange={(e) => handleInputChange('room_price_code', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        투숙 인원
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.guest_count}
                                        onChange={(e) => handleInputChange('guest_count', parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        min="1"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        객실 단가
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.unit_price}
                                        onChange={(e) => handleInputChange('unit_price', parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        min="0"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 차량 정보 */}
                        <div className="bg-green-50 rounded-lg p-6">
                            <h3 className="text-lg font-bold text-green-900 mb-4">차량 서비스</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        차량 가격코드
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.car_price_code}
                                        onChange={(e) => handleInputChange('car_price_code', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        차량 대수
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.car_count}
                                        onChange={(e) => handleInputChange('car_count', parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        탑승 인원
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.passenger_count}
                                        onChange={(e) => handleInputChange('passenger_count', parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                        min="0"
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                        placeholder="픽업 장소를 입력하세요"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        하차 장소
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.dropoff_location}
                                        onChange={(e) => handleInputChange('dropoff_location', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                        placeholder="하차 장소를 입력하세요"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 요청사항 */}
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">추가 요청사항</h3>
                            <textarea
                                value={formData.request_note}
                                onChange={(e) => handleInputChange('request_note', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                                rows={4}
                                placeholder="추가 요청사항이 있으시면 입력해주세요"
                            />
                        </div>

                        {/* 제출 버튼 */}
                        <div className="flex justify-center space-x-4">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="bg-gray-50 text-gray-600 px-6 py-3 rounded border hover:bg-gray-100"
                            >
                                취소
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-blue-50 text-blue-600 px-6 py-3 rounded border hover:bg-blue-100 disabled:opacity-50"
                            >
                                {loading ? '처리 중...' : '예약 완료'}
                            </button>
                        </div>
                    </form>
                </SectionBox>
            </div>
        </PageWrapper>
    );
}
