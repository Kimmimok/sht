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
    const reservationId = searchParams.get('reservationId');
    const mode = searchParams.get('mode');

    // 폼 상태 - 크루즈 패턴 적용 (서비스 정보 입력)
    const [form, setForm] = useState({
        // 서비스 타입별 폼 데이터
        serviceData: {
            tour_date: '',
            participant_count: 1,
            pickup_location: '',
            dropoff_location: '',
            tour_duration: '',
            special_requirements: ''
        },
        request_note: ''
    });

    // 데이터 상태
    const [availableServices, setAvailableServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [quote, setQuote] = useState<any>(null);
    const [existingReservation, setExistingReservation] = useState<any>(null);
    const [isEditMode, setIsEditMode] = useState(false);

    useEffect(() => {
        if (!quoteId) {
            alert('견적 ID가 필요합니다.');
            router.push('/mypage/reservations');
            return;
        }
        loadQuote();
        loadAvailableTourServices();
        checkExistingReservation();
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

    // 기존 예약 확인 (중복 방지)
    const checkExistingReservation = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: existingRes } = await supabase
                .from('reservation')
                .select(`
                    *,
                    reservation_tour (*)
                `)
                .eq('re_user_id', user.id)
                .eq('re_quote_id', quoteId)
                .eq('re_type', 'tour')
                .maybeSingle();

            if (existingRes) {
                setExistingReservation(existingRes);
                setIsEditMode(true);

                // 기존 데이터로 폼 초기화
                if (existingRes.reservation_tour && existingRes.reservation_tour.length > 0) {
                    const tourData = existingRes.reservation_tour[0];
                    setForm(prev => ({
                        ...prev,
                        serviceData: {
                            tour_date: tourData.tour_date ? new Date(tourData.tour_date).toISOString().split('T')[0] : '',
                            participant_count: tourData.tour_capacity || 1,
                            pickup_location: tourData.pickup_location || '',
                            dropoff_location: tourData.dropoff_location || '',
                            tour_duration: tourData.tour_duration || '',
                            special_requirements: tourData.special_requirements || '',
                        },
                        request_note: tourData.request_note || ''
                    }));
                }
            }
        } catch (error) {
            console.error('기존 예약 확인 오류:', error);
        }
    };

    // 사용 가능한 투어 서비스 로드 (크루즈의 객실 가격 로드 방식과 동일)
    const loadAvailableTourServices = async () => {
        try {
            // 견적에 연결된 투어 서비스들 조회
            const { data: quoteItems } = await supabase
                .from('quote_item')
                .select('service_type, service_ref_id, usage_date')
                .eq('quote_id', quoteId)
                .eq('service_type', 'tour');

            if (quoteItems && quoteItems.length > 0) {
                const allServices = [];

                // 각 투어 아이템에 대해 가격 옵션들 조회 (크루즈의 room_price 방식)
                for (const item of quoteItems) {
                    const { data: tourData } = await supabase
                        .from('tour')
                        .select('tour_code')
                        .eq('id', item.service_ref_id)
                        .single();

                    if (tourData?.tour_code) {
                        // 해당 투어 코드의 모든 가격 옵션 조회 (크루즈의 카테고리별 가격과 동일)
                        const { data: priceOptions } = await supabase
                            .from('tour_price')
                            .select('*')
                            .eq('tour_code', tourData.tour_code);

                        if (priceOptions) {
                            allServices.push(...priceOptions.map(option => ({
                                ...option,
                                usage_date: item.usage_date
                            })));
                        }
                    }
                }

                setAvailableServices(allServices);

                // 첫 번째 서비스 정보로 투어 날짜 설정
                if (allServices.length > 0 && quoteItems[0]?.usage_date) {
                    setForm(prev => ({
                        ...prev,
                        serviceData: {
                            ...prev.serviceData,
                            tour_date: quoteItems[0].usage_date
                        }
                    }));
                }
            }
        } catch (error) {
            console.error('투어 서비스 로드 오류:', error);
        }
    };

    // 폼 입력 핸들러
    const handleInputChange = (field: string, value: any) => {
        setForm(prev => ({
            ...prev,
            serviceData: {
                ...prev.serviceData,
                [field]: value
            }
        }));
    };

    // 예약 제출/수정 (중복 방지 적용)
    const handleSubmit = async () => {
        if (availableServices.length === 0) {
            alert('예약할 투어 서비스가 없습니다.');
            return;
        }

        setLoading(true);

        try {
            // 사용자 인증 및 역할 확인
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                router.push(`/mypage/reservations?quoteId=${quoteId}`);
                return;
            }

            // 사용자 역할 업데이트 (크루즈와 동일)
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

            let reservationData;

            if (isEditMode && existingReservation) {
                // 수정 모드: 기존 예약 사용
                reservationData = existingReservation;

                // 기존 reservation_tour의 모든 행 삭제
                await supabase
                    .from('reservation_tour')
                    .delete()
                    .eq('reservation_id', existingReservation.re_id);
            } else {
                // 새 예약 생성 (중복 확인 강화)
                const { data: duplicateCheck } = await supabase
                    .from('reservation')
                    .select('re_id')
                    .eq('re_user_id', user.id)
                    .eq('re_quote_id', quoteId)
                    .eq('re_type', 'tour')
                    .maybeSingle();

                if (duplicateCheck) {
                    // 기존 예약이 있으면 해당 예약의 tour 데이터도 삭제하고 재생성
                    console.log('🔄 기존 투어 예약 발견 - 업데이트 모드로 전환');
                    reservationData = { re_id: duplicateCheck.re_id };

                    // 기존 투어 예약 데이터 삭제
                    await supabase
                        .from('reservation_tour')
                        .delete()
                        .eq('reservation_id', duplicateCheck.re_id);
                } else {
                    // 완전히 새로운 예약 생성
                    const { data: newReservation, error: reservationError } = await supabase
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
                    reservationData = newReservation;
                }
            }

            // 선택된 투어 서비스들 저장 (크루즈와 같은 패턴)
            let errors = [];

            if (availableServices.length > 0) {
                console.log('🗺️ 투어 서비스 저장 중...', availableServices.length, '개');

                // 첫 번째 투어 서비스를 메인으로 저장 (크루즈의 객실 선택 방식)
                const mainTour = availableServices[0];
                const tourData = {
                    reservation_id: reservationData.re_id,
                    tour_price_code: mainTour.tour_code,
                    tour_capacity: form.serviceData.participant_count || 1,
                    pickup_location: form.serviceData.pickup_location || null,
                    dropoff_location: form.serviceData.dropoff_location || null,
                    total_price: mainTour.price || 0,
                    request_note: form.request_note || null
                };

                console.log('🗺️ 투어 데이터:', tourData);
                const { error: tourError } = await supabase
                    .from('reservation_tour')
                    .insert(tourData);

                if (tourError) {
                    console.error('투어 서비스 저장 오류:', tourError);
                    errors.push(`투어 서비스 오류: ${tourError.message}`);
                }
            }

            if (errors.length > 0) {
                console.error('💥 투어서비스 예약 저장 중 오류 발생:', errors);
                alert('투어 예약 저장 중 오류가 발생했습니다:\n' + errors.join('\n'));
                return;
            }

            alert(isEditMode ? '투어 서비스 예약이 성공적으로 수정되었습니다!' : '투어 서비스 예약이 성공적으로 저장되었습니다!');
            router.push(`/mypage/reservations?quoteId=${quoteId}`);

        } catch (error) {
            console.error('💥 투어서비스 예약 전체 처리 오류:', error);
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
                        <h1 className="text-lg font-bold text-gray-800">
                            🗺️ 투어 서비스 {isEditMode ? '수정' : '예약'}
                        </h1>
                        <p className="text-sm text-gray-600 mt-1">행복 여행 이름: {quote.title}</p>
                        {isEditMode && (
                            <p className="text-sm text-blue-600 mt-1">📝 기존 예약을 수정하고 있습니다</p>
                        )}
                    </div>
                </div>

                {/* 사용 가능한 서비스 옵션들 - 정보 표시만 (선택 불가) */}
                <SectionBox title="견적에 포함된 투어 서비스">
                    {availableServices.length > 0 && (
                        <div className="mb-6">
                            <h4 className="text-md font-medium text-purple-800 mb-3">🗺️ 투어 서비스</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {availableServices.map((service, index) => (
                                    <div
                                        key={index}
                                        className="p-4 rounded-lg border-2 border-purple-200 bg-purple-50"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-medium text-gray-800">{service.tour_name}</span>
                                            <span className="text-purple-600 font-bold">{service.price?.toLocaleString()}동</span>
                                        </div>
                                        <div className="text-sm text-gray-600 space-y-1">
                                            <div>정원: {service.tour_capacity}명</div>
                                            <div>차량: {service.tour_vehicle}</div>
                                            <div>타입: {service.tour_type}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </SectionBox>

                {/* 입력 폼 - 서비스 존재 여부에 따라 자동 표시 */}
                {availableServices.length > 0 && (
                    <SectionBox title="투어 상세 정보">
                        <div className="space-y-6">
                            {/* 투어 기본 정보 */}
                            <div className="bg-purple-50 rounded-lg p-4">
                                <h4 className="text-md font-medium text-purple-800 mb-3">투어 기본 정보</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">투어 날짜 *</label>
                                        <input
                                            type="date"
                                            value={form.serviceData.tour_date}
                                            onChange={(e) => handleInputChange('tour_date', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">참가 인원 *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={form.serviceData.participant_count}
                                            onChange={(e) => handleInputChange('participant_count', parseInt(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">픽업 장소</label>
                                        <input
                                            type="text"
                                            value={form.serviceData.pickup_location}
                                            onChange={(e) => handleInputChange('pickup_location', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            placeholder="픽업 희망 장소를 입력해주세요"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">드롭오프 장소</label>
                                        <input
                                            type="text"
                                            value={form.serviceData.dropoff_location}
                                            onChange={(e) => handleInputChange('dropoff_location', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            placeholder="드롭오프 희망 장소를 입력해주세요"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">투어 시간</label>
                                        <input
                                            type="text"
                                            value={form.serviceData.tour_duration}
                                            onChange={(e) => handleInputChange('tour_duration', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            placeholder="예: 8시간, 하루종일 등"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">특별 요구사항</label>
                                        <input
                                            type="text"
                                            value={form.serviceData.special_requirements}
                                            onChange={(e) => handleInputChange('special_requirements', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            placeholder="음식, 접근성, 언어 등 특별 요구사항"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 특별 요청사항 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">특별 요청사항</label>
                                <textarea
                                    value={form.request_note}
                                    onChange={(e) => setForm(prev => ({ ...prev, request_note: e.target.value }))}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="투어 관련 기타 요청사항을 입력해주세요..."
                                />
                            </div>
                        </div>
                    </SectionBox>
                )}

                {/* 예약 버튼 */}
                <div className="flex justify-end">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 disabled:opacity-50"
                    >
                        {loading ? (isEditMode ? '수정 처리 중...' : '예약 처리 중...') : (isEditMode ? '예약 수정' : '예약 추가')}
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
