'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

// 클라이언트 컴포넌트로 명시적 선언
function TourReservationContent() {
    // useSearchParams()는 클라이언트 컴포넌트에서만 사용 가능
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
                setLoading(false);
                return;
            }

            if (form.tour_capacity === 0) {
                alert('투어 인원은 최소 1명 이상이어야 합니다.');
                setLoading(false);
                return;
            }

            // 예약자 등록 및 예약 생성 로직 (유지)
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                router.push(`/mypage/reservations?quoteId=${quoteId}`);
                setLoading(false);
                return;
            }

            const { data: existingUser } = await supabase
                .from('users')
                .select('id, role')
                .eq('id', user.id)
                .single();

            if (!existingUser || existingUser.role === 'guest') {
                await supabase
                    .from('users')
                    .upsert({
                        id: user.id,
                        email: user.email,
                        role: 'member',
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'id' });
            }

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
                alert('예약 생성 중 오류가 발생했습니다.');
                setLoading(false);
                return;
            }

            const reservationTourData = {
                reservation_id: reservationData.re_id,
                tour_price_code: form.tour_price_code,
                tour_capacity: form.tour_capacity,
                pickup_location: form.pickup_location,
                dropoff_location: form.dropoff_location,
                total_price: form.total_price,
                request_note: form.request_note
            };

            const { error: tourReservationError } = await supabase
                .from('reservation_tour')
                .insert(reservationTourData)
                .select()
                .single();

            if (tourReservationError) {
                alert('투어 예약 저장 중 오류가 발생했습니다.');
                setLoading(false);
                return;
            }

            alert('투어 예약이 성공적으로 저장되었습니다!');
            // 저장 후 견적id를 가지고 예약홈으로 이동
            router.push(`/mypage/reservations?quoteId=${quoteId}`);

        } catch (error) {
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
                <div>
                    <h1 className="text-lg font-bold text-gray-800">🗺️ 투어 예약</h1>
                    <p className="text-sm text-gray-600 mt-1">행복 여행 이름: {quote?.title}</p>
                </div>

                {/* 투어 가격 정보 */}
                {tourPriceInfo.length > 0 && (
                    <SectionBox title="투어 가격 정보">
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                            <h4 className="text-sm font-medium text-purple-800 mb-3">🗺️ 투어 가격 정보</h4>
                            <div className="space-y-6">
                                {tourPriceInfo.map((price, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-white rounded border border-gray-200 p-4"
                                    >
                                        <div className="space-y-2">
                                            <div>
                                                <span className="text-gray-600">투어명: </span>
                                                <span className="font-medium">{price.tour_name}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">정원: </span>
                                                <span className="font-medium">{price.tour_capacity} 명</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">차량: </span>
                                                <span className="font-medium">{price.tour_vehicle}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">투어 타입: </span>
                                                <span className="font-medium">{price.tour_type}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">가격: </span>
                                                <span className="font-medium text-purple-600">{price.price?.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </SectionBox>
                )}

                {/* 하단 버튼 */}
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
                        onClick={() => router.push('/mypage/reservations')}
                    >
                        취소
                    </button>
                    <button
                        type="button"
                        className="bg-purple-500 text-white px-6 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
                        onClick={() => router.push(`/mypage/reservations?quoteId=${quoteId}`)}
                    >
                        예약홈으로
                    </button>
                </div>
            </div>
        </PageWrapper>
    );
}

// 페이지 컴포넌트는 Suspense로 감싸서 export
export default function TourReservationPage() {
    return (
        <Suspense fallback={
            <PageWrapper>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                    <p className="mt-4 text-gray-600 ml-3">로딩 중...</p>
                </div>
            </PageWrapper>
        }>
            <TourReservationContent />
        </Suspense>
    );
}
