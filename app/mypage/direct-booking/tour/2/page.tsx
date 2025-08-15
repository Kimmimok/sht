'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';

function TourReservationContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const quoteId = searchParams.get('quoteId');

    const [loading, setLoading] = useState(false);
    const [quote, setQuote] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [availableServices, setAvailableServices] = useState<any[]>([]);
    const [selectedServices, setSelectedServices] = useState<any[]>([]);

    // 예약에 필요한 추가 state
    const [tourCount, setTourCount] = useState(1);
    const [unitPrice, setUnitPrice] = useState(0);

    // 폼 데이터
    const [formData, setFormData] = useState({
        tour_date: '',
        participant_count: 1,
        pickup_location: '',
        dropoff_location: '',
        tour_duration: '',
        request_note: ''
    });

    useEffect(() => {
        if (!quoteId) {
            alert('가격 ID가 필요합니다.');
            router.push('/mypage/direct-booking');
            return;
        }

        // 사용자 인증 확인
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) {
                router.push('/login');
                return;
            }
            setUser(user);
            loadQuote();
            loadTourServices();
        });
    }, [quoteId, router]);

    const loadQuote = async () => {
        try {
            const { data, error } = await supabase
                .from('quote')
                .select('*')
                .eq('id', quoteId)
                .single();

            if (error) throw error;
            setQuote(data);
        } catch (error) {
            console.error('견적 로드 오류:', error);
            alert('견적을 불러올 수 없습니다.');
        }
    };

    // 투어 서비스 로드 (크루즈 패턴과 동일)
    const loadTourServices = async () => {
        try {
            console.log('🎯 투어 서비스 로드 시작, Quote ID:', quoteId);

            // 1단계에서 생성된 quote_item 조회
            const { data: quoteItems, error: itemsError } = await supabase
                .from('quote_item')
                .select('service_type, service_ref_id, usage_date')
                .eq('quote_id', quoteId)
                .eq('service_type', 'tour');

            console.log('📋 Quote Items:', quoteItems);

            if (itemsError) {
                console.error('Quote items 조회 오류:', itemsError);
                return;
            }

            if (quoteItems && quoteItems.length > 0) {
                const allServices = [];

                for (const item of quoteItems) {
                    console.log('🔍 Processing item:', item);

                    // tour 테이블에서 tour_code 조회
                    const { data: tourData, error: tourError } = await supabase
                        .from('tour')
                        .select('tour_code')
                        .eq('id', item.service_ref_id)
                        .single();

                    console.log('🎫 Tour Data:', tourData);

                    if (tourData?.tour_code) {
                        // tour_price 테이블에서 가격 정보 조회 (크루즈의 room_price 방식)
                        const { data: priceOptions, error: priceError } = await supabase
                            .from('tour_price')
                            .select('*')
                            .eq('tour_code', tourData.tour_code);

                        console.log('💰 Tour Price Options:', priceOptions);

                        if (priceOptions && priceOptions.length > 0) {
                            allServices.push(...priceOptions.map(option => ({
                                tour_code: option.tour_code,
                                tour_name: option.tour_name,
                                tour_vehicle: option.tour_vehicle,
                                tour_type: option.tour_type,
                                tour_capacity: option.tour_capacity,
                                price: option.price,
                                tour_duration: option.tour_duration,
                                description: option.description
                            })));
                        }
                    }
                }

                console.log('📋 All Services:', allServices);
                setAvailableServices(allServices);

                // 1단계에서 선택된 투어 정보를 자동으로 설정 (읽기 전용)
                if (allServices.length > 0) {
                    console.log('💡 1단계에서 선택된 투어 정보를 확인합니다:', allServices.length, '개');

                    const firstService = allServices[0];
                    console.log('🎯 선택된 투어:', firstService.tour_name);

                    setSelectedServices([firstService]);
                    setTourCount(1);
                    setUnitPrice(firstService.price || 0);

                    console.log('💰 계산된 총 금액:', (firstService.price || 0), '동');

                    // 투어 날짜를 폼에 설정 (1단계에서 설정한 날짜 사용)
                    if (quoteItems[0]?.usage_date) {
                        setFormData(prev => ({
                            ...prev,
                            tour_date: quoteItems[0].usage_date
                        }));
                    }
                }
            }
        } catch (error) {
            console.error('투어 서비스 로드 오류:', error);
        }
    };

    // 총 금액 계산
    const totalPrice = selectedServices.reduce((sum, service) => sum + (service.price || 0), 0);

    // 예약 처리
    const handleReservation = async () => {
        if (!user) {
            alert('로그인이 필요합니다.');
            router.push('/login');
            return;
        }

        if (selectedServices.length === 0) {
            alert('선택된 투어가 없습니다.');
            return;
        }

        if (!formData.tour_date || !formData.participant_count) {
            alert('투어 날짜와 참가 인원을 입력해주세요.');
            return;
        }

        setLoading(true);

        try {
            // 중복 예약 확인
            const { data: existingReservation } = await supabase
                .from('reservation')
                .select('re_id')
                .eq('re_user_id', user.id)
                .eq('re_quote_id', quoteId)
                .eq('re_type', 'tour')
                .maybeSingle();

            if (existingReservation) {
                alert('이미 이 견적에 대한 투어 예약이 존재합니다. 기존 예약을 수정하시겠습니까?');
                router.push(`/mypage/reservations?quoteId=${quoteId}`);
                return;
            }

            // 사용자 역할 확인 및 업데이트
            const { data: userData } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();

            if (!userData || userData.role === 'guest') {
                await supabase.from('users').upsert({
                    id: user.id,
                    email: user.email,
                    role: 'member',
                    updated_at: new Date().toISOString()
                });
            }

            // 메인 예약 생성
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

            if (reservationError) {
                console.error('예약 생성 오류:', reservationError);
                alert('예약 생성 중 오류가 발생했습니다.');
                return;
            }

            // 투어 예약 상세 정보 저장 (크루즈 패턴과 동일)
            const mainService = selectedServices[0];

            // 요청사항에 투어 시간 정보 포함
            const requestNotes = [
                formData.request_note,
                formData.tour_duration ? `투어 시간: ${formData.tour_duration}` : null
            ].filter(Boolean).join('\n');

            const tourReservationData = {
                reservation_id: reservationData.re_id,
                tour_price_code: mainService.tour_code,
                tour_capacity: formData.participant_count || 1,
                pickup_location: formData.pickup_location || null,
                dropoff_location: formData.dropoff_location || null,
                total_price: totalPrice,
                request_note: requestNotes || null
            };

            console.log('💾 Tour Reservation Data:', tourReservationData);

            const { error: tourError } = await supabase
                .from('reservation_tour')
                .insert(tourReservationData);

            if (tourError) {
                console.error('투어 예약 저장 오류:', tourError);
                alert('투어 예약 저장 중 오류가 발생했습니다.');
                return;
            }

            alert('투어 예약이 성공적으로 완료되었습니다!');
            router.push('/mypage/reservations');

        } catch (error) {
            console.error('예약 처리 오류:', error);
            alert('예약 처리 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !quote) {
        return (
            <PageWrapper>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
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
                        <h1 className="text-lg font-bold text-gray-800">🎯 투어 예약 (2단계)</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            행복여행 이름: {quote?.title}
                        </p>
                    </div>
                    <button
                        onClick={() => router.back()}
                        className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 text-sm"
                    >
                        ← 이전
                    </button>
                </div>

                {/* 선택된 투어 정보 표시 (읽기 전용) */}
                {availableServices.length > 0 ? (
                    <div className="space-y-4 mb-6">
                        <h3 className="text-lg font-semibold text-gray-800">🎯 선택된 투어 정보 (1단계에서 선택됨)</h3>

                        {/* 선택된 서비스 표시 (클릭 불가) */}
                        {selectedServices.length > 0 && (
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <h4 className="text-md font-medium text-purple-800 mb-3">✅ 확정된 투어</h4>
                                <div className="space-y-3">
                                    {selectedServices.map((service, index) => (
                                        <div
                                            key={index}
                                            className="p-4 rounded-lg border-2 border-purple-500 bg-purple-50"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-medium text-purple-900">{service.tour_name}</span>
                                                <span className="text-purple-600 font-bold">{service.price?.toLocaleString()}동</span>
                                            </div>
                                            <div className="text-sm text-purple-700">
                                                <div>정원: {service.tour_capacity}명</div>
                                                <div>차량: {service.tour_vehicle}</div>
                                                <div>타입: {service.tour_type}</div>
                                                {service.description && <div>설명: {service.description}</div>}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="border-t border-purple-300 pt-3 mt-3">
                                        <div className="flex justify-between font-bold text-purple-800">
                                            <span>총 예상 금액:</span>
                                            <span>{totalPrice.toLocaleString()}동</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 수정 안내 */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-sm text-gray-600 flex items-center">
                                <span className="mr-2">💡</span>
                                투어 선택을 변경하려면 <button
                                    onClick={() => router.push(`/mypage/direct-booking/tour/1?quoteId=${quoteId}`)}
                                    className="text-blue-600 hover:text-blue-800 underline mx-1"
                                >
                                    이전 단계
                                </button>로 돌아가세요.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-6">
                        <div className="text-center">
                            <div className="text-orange-500 text-3xl mb-3">🎯</div>
                            <h3 className="text-lg font-medium text-orange-800 mb-2">투어 정보를 불러오는 중...</h3>
                            <p className="text-orange-600 text-sm">
                                1단계에서 선택한 투어 정보를 확인하고 있습니다.
                            </p>
                            <p className="text-orange-500 text-xs mt-2">
                                Quote ID: {quoteId} | Available Services: {availableServices.length}
                            </p>
                        </div>
                    </div>
                )}

                {/* 예약 정보 입력 폼 */}
                {selectedServices.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">📝 예약 정보 입력</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">투어 날짜 *</label>
                                <input
                                    type="date"
                                    value={formData.tour_date}
                                    onChange={(e) => setFormData({ ...formData, tour_date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">참가 인원 *</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.participant_count}
                                    onChange={(e) => setFormData({ ...formData, participant_count: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">픽업 장소</label>
                                <input
                                    type="text"
                                    value={formData.pickup_location}
                                    onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                                    placeholder="픽업 희망 장소"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">드롭오프 장소</label>
                                <input
                                    type="text"
                                    value={formData.dropoff_location}
                                    onChange={(e) => setFormData({ ...formData, dropoff_location: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                                    placeholder="드롭오프 희망 장소"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">투어 시간</label>
                                <input
                                    type="text"
                                    value={formData.tour_duration}
                                    onChange={(e) => setFormData({ ...formData, tour_duration: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                                    placeholder="예: 8시간, 하루종일 등"
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">특별 요청사항</label>
                            <textarea
                                value={formData.request_note}
                                onChange={(e) => setFormData({ ...formData, request_note: e.target.value })}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                                placeholder="투어 관련 기타 요청사항을 입력해주세요..."
                            />
                        </div>
                    </div>
                )}



                {/* 예약 버튼 */}
                <div className="flex justify-end space-x-4">
                    <button
                        onClick={() => router.push(`/mypage/direct-booking/tour/1?quoteId=${quoteId}`)}
                        className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600"
                    >
                        이전 단계
                    </button>
                    <button
                        onClick={handleReservation}
                        disabled={!selectedServices.length || !formData.tour_date || !formData.participant_count || loading}
                        className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {loading ? '예약 처리 중...' : '예약 완료'}
                    </button>
                </div>
            </div>
        </PageWrapper>
    );
}

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
