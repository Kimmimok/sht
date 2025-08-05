'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

function TourReservationContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const quoteId = searchParams.get('quoteId');

    // 폼 상태 - reservation_tour 테이블 컬럼 기반
    const [form, setForm] = useState({
        tour_price_code: '',
        tour_capacity: 1,
        pickup_location: '',
        dropoff_location: '',
        total_price: 0,
        request_note: ''
    });

    // 옵션 데이터
    const [tourPriceInfo, setTourPriceInfo] = useState<any[]>([]);
    const [tourData, setTourData] = useState<any[]>([]);

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

    // 견적에 연결된 투어 데이터 로드
    const loadQuoteLinkedData = async () => {
        try {
            // 견적에 연결된 quote_item들 조회 (usage_date 포함)
            const { data: quoteItems } = await supabase
                .from('quote_item')
                .select('service_type, service_ref_id, quantity, unit_price, total_price, usage_date')
                .eq('quote_id', quoteId)
                .eq('service_type', 'tour');

            if (quoteItems && quoteItems.length > 0) {
                await loadAllTourInfo(quoteItems);
            }
        } catch (error) {
            console.error('견적 연결 데이터 로드 오류:', error);
        }
    };

    // 모든 투어 정보 로드
    const loadAllTourInfo = async (tourItems: any[]) => {
        try {
            const allTourData = [];
            const tourPriceDataList = [];

            // 각 tour item에 대해 정보 조회
            for (const tourItem of tourItems) {
                // tour 테이블에서 투어 정보 조회
                const { data: tourData } = await supabase
                    .from('tour')
                    .select('*')
                    .eq('id', tourItem.service_ref_id)
                    .single();

                if (tourData) {
                    // tour_price 테이블에서 가격 정보 조회
                    const { data: tourPriceData } = await supabase
                        .from('tour_price')
                        .select('*')
                        .eq('tour_code', tourData.tour_code);

                    if (tourPriceData && tourPriceData.length > 0) {
                        // quote_item 정보와 함께 저장
                        allTourData.push({
                            ...tourData,
                            quoteItem: tourItem,
                            priceInfo: tourPriceData[0] // 첫 번째 가격 정보 사용
                        });

                        tourPriceDataList.push(...tourPriceData);
                    }
                }
            }

            setTourData(allTourData);
            setTourPriceInfo(tourPriceDataList);

            // 첫 번째 투어 정보로 폼 기본값 설정
            if (allTourData.length > 0) {
                const firstTour = allTourData[0];
                setForm(prev => ({
                    ...prev,
                    tour_price_code: firstTour.tour_code,
                    tour_capacity: firstTour.tour_capacity || 1,
                    pickup_location: firstTour.pickup_location || '',
                    dropoff_location: firstTour.dropoff_location || '',
                    total_price: firstTour.quoteItem?.total_price || 0
                }));
            }

        } catch (error) {
            console.error('투어 정보 로드 오류:', error);
        }
    };

    // 예약 제출 처리
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 유효성 검사
            if (!form.tour_price_code) {
                alert('투어 가격 코드는 필수 입력 항목입니다.');
                return;
            }

            if (form.tour_capacity === 0) {
                alert('투어 인원은 최소 1명 이상이어야 합니다.');
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
                    re_type: 'tour',
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

            // reservation_tour 데이터 생성
            const reservationTourData = {
                reservation_id: reservationData.re_id,
                tour_price_code: form.tour_price_code,
                tour_capacity: form.tour_capacity,
                pickup_location: form.pickup_location,
                dropoff_location: form.dropoff_location,
                total_price: form.total_price,
                request_note: form.request_note
            };

            // reservation_tour 테이블에 삽입
            const { data: reservationResult, error: tourReservationError } = await supabase
                .from('reservation_tour')
                .insert(reservationTourData)
                .select()
                .single();

            if (tourReservationError) {
                console.error('투어 예약 저장 오류:', tourReservationError);
                alert('투어 예약 저장 중 오류가 발생했습니다.');
                return;
            }

            alert('투어 예약이 성공적으로 저장되었습니다!');
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
                        <h1 className="text-lg font-bold text-gray-800">🗺️ 투어 예약</h1>
                        <p className="text-sm text-gray-600 mt-1">견적: {quote.title}</p>
                    </div>
                    <button
                        onClick={() => router.push('/mypage/reservations')}
                        className="px-3 py-1 bg-gray-50 text-gray-600 rounded border text-sm hover:bg-gray-100"
                    >
                        목록으로
                    </button>
                </div>

                {/* 투어 가격 정보 */}
                {tourPriceInfo.length > 0 && (
                    <SectionBox title="투어 가격 정보">
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                            <h4 className="text-sm font-medium text-purple-800 mb-3">🗺️ 투어 정보</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                {tourPriceInfo.map((price, index) => (
                                    <div key={index} className="space-y-2">
                                        <div><span className="text-gray-600">지역:</span> <span className="font-medium">{price.area}</span></div>
                                        <div><span className="text-gray-600">투어 타입:</span> <span className="font-medium">{price.tour_type}</span></div>
                                        <div><span className="text-gray-600">기간:</span> <span className="font-medium">{price.duration}</span></div>
                                        <div><span className="text-gray-600">가격:</span> <span className="font-medium text-purple-600">{price.price?.toLocaleString()}원</span></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </SectionBox>
                )}

                {/* 투어 예약 폼 */}
                <SectionBox title="투어 예약 정보">
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
                                        value={form.tour_price_code}
                                        onChange={(e) => handleInputChange('tour_price_code', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        투어 인원
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={form.tour_capacity}
                                        onChange={(e) => handleInputChange('tour_capacity', parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        총 가격
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.total_price}
                                        onChange={(e) => handleInputChange('total_price', parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 위치 정보 */}
                        <div className="bg-blue-50 rounded-lg p-6">
                            <h3 className="text-lg font-bold text-blue-900 mb-4">픽업/드롭오프 정보</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        픽업 장소
                                    </label>
                                    <input
                                        type="text"
                                        value={form.pickup_location}
                                        onChange={(e) => handleInputChange('pickup_location', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        placeholder="투어 시작 장소"
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        placeholder="투어 종료 장소"
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
                                placeholder="투어 코스 변경, 언어 요청, 기타 특별 사항을 입력해주세요..."
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

export default function TourReservationPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64">로딩 중...</div>}>
            <TourReservationContent />
        </Suspense>
    );
}
