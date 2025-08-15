'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

function HotelReservationContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const quoteId = searchParams.get('quoteId');
    const reservationId = searchParams.get('reservationId');
    const mode = searchParams.get('mode');

    // 폼 상태 - 크루즈 패턴 적용 (서비스 정보 입력)
    const [form, setForm] = useState({
        // 서비스 타입별 폼 데이터
        serviceData: {
            checkin_date: '',
            checkout_date: '',
            room_count: 1,
            guest_count: 1,
            nights: 1,
            breakfast_service: '',
            room_type: '',
            special_amenities: ''
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
            alert('가격 ID가 필요합니다.');
            router.push('/mypage/reservations');
            return;
        }
        loadQuote();
        loadAvailableHotelServices();

        // 수정 모드인 경우 특정 예약 데이터 로드
        if (mode === 'edit' && reservationId) {
            loadExistingReservation(reservationId);
        } else {
            checkExistingReservation();
        }
    }, [quoteId, router, mode, reservationId]);

    // 견적 정보 로드
    const loadQuote = async () => {
        try {
            const { data: quoteData, error } = await supabase
                .from('quote')
                .select('id, title, status')
                .eq('id', quoteId)
                .single();

            if (error || !quoteData) {
                alert('가격을 찾을 수 없습니다.');
                router.push('/mypage/reservations');
                return;
            }

            setQuote(quoteData);
        } catch (error) {
            console.error('가격 로드 오류:', error);
            alert('가격 정보를 불러오는 중 오류가 발생했습니다.');
        }
    };

    // 특정 예약 ID로 데이터 로드 (수정 모드용)
    const loadExistingReservation = async (reservationId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: existingRes } = await supabase
                .from('reservation')
                .select(`
                    *,
                    reservation_hotel (*)
                `)
                .eq('re_id', reservationId)
                .eq('re_user_id', user.id)
                .single();

            if (existingRes) {
                setExistingReservation(existingRes);
                setIsEditMode(true);

                // 기존 데이터로 폼 초기화
                if (existingRes.reservation_hotel && existingRes.reservation_hotel.length > 0) {
                    const hotelData = existingRes.reservation_hotel[0];
                    setForm(prev => ({
                        ...prev,
                        serviceData: {
                            checkin_date: hotelData.checkin_date ? new Date(hotelData.checkin_date).toISOString().split('T')[0] : '',
                            checkout_date: hotelData.checkout_date ? new Date(hotelData.checkout_date).toISOString().split('T')[0] : '',
                            room_count: hotelData.room_count || 1,
                            guest_count: hotelData.guest_count || 1,
                            nights: hotelData.nights || 1,
                            breakfast_service: hotelData.breakfast_service || '',
                            room_type: hotelData.room_type || '',
                            special_amenities: hotelData.special_amenities || '',
                        },
                        request_note: hotelData.request_note || ''
                    }));
                }
            } else {
                alert('해당 예약을 찾을 수 없습니다.');
                router.push('/mypage/reservations');
            }
        } catch (error) {
            console.error('예약 데이터 로드 오류:', error);
            alert('예약 데이터를 불러오는 중 오류가 발생했습니다.');
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
                    reservation_hotel (*)
                `)
                .eq('re_user_id', user.id)
                .eq('re_quote_id', quoteId)
                .eq('re_type', 'hotel')
                .maybeSingle();

            if (existingRes) {
                setExistingReservation(existingRes);
                setIsEditMode(true);

                // 기존 데이터로 폼 초기화
                if (existingRes.reservation_hotel && existingRes.reservation_hotel.length > 0) {
                    const hotelData = existingRes.reservation_hotel[0];
                    setForm(prev => ({
                        ...prev,
                        serviceData: {
                            checkin_date: hotelData.checkin_date ? new Date(hotelData.checkin_date).toISOString().split('T')[0] : '',
                            checkout_date: hotelData.checkout_date ? new Date(hotelData.checkout_date).toISOString().split('T')[0] : '',
                            room_count: hotelData.room_count || 1,
                            guest_count: hotelData.guest_count || 1,
                            nights: hotelData.nights || 1,
                            breakfast_service: hotelData.breakfast_service || '',
                            room_type: hotelData.room_type || '',
                            special_amenities: hotelData.special_amenities || '',
                        },
                        request_note: hotelData.request_note || ''
                    }));
                }
            }
        } catch (error) {
            console.error('기존 예약 확인 오류:', error);
        }
    };

    // 사용 가능한 호텔 서비스 로드 (크루즈의 객실 가격 로드 방식과 동일)
    const loadAvailableHotelServices = async () => {
        try {
            // 가격에 연결된 호텔 서비스들 조회
            const { data: quoteItems } = await supabase
                .from('quote_item')
                .select('service_type, service_ref_id, usage_date')
                .eq('quote_id', quoteId)
                .eq('service_type', 'hotel');

            if (quoteItems && quoteItems.length > 0) {
                const allServices = [];

                // 각 호텔 아이템에 대해 가격 옵션들 조회 (크루즈의 room_price 방식)
                for (const item of quoteItems) {
                    const { data: hotelData } = await supabase
                        .from('hotel')
                        .select('hotel_code')
                        .eq('id', item.service_ref_id)
                        .single();

                    if (hotelData?.hotel_code) {
                        // 해당 호텔 코드의 모든 가격 옵션 조회 (크루즈의 카테고리별 가격과 동일)
                        const { data: priceOptions } = await supabase
                            .from('hotel_price')
                            .select('*')
                            .eq('hotel_code', hotelData.hotel_code);

                        if (priceOptions) {
                            allServices.push(...priceOptions.map(option => ({
                                ...option,
                                usage_date: item.usage_date
                            })));
                        }
                    }
                }

                setAvailableServices(allServices);

                // 첫 번째 서비스 정보로 체크인 날짜 설정
                if (allServices.length > 0 && quoteItems[0]?.usage_date) {
                    setForm(prev => ({
                        ...prev,
                        serviceData: {
                            ...prev.serviceData,
                            checkin_date: quoteItems[0].usage_date
                        }
                    }));
                }
            }
        } catch (error) {
            console.error('호텔 서비스 로드 오류:', error);
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
            alert('예약할 호텔 서비스가 없습니다.');
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

                // 기존 reservation_hotel의 모든 행 삭제
                await supabase
                    .from('reservation_hotel')
                    .delete()
                    .eq('reservation_id', existingReservation.re_id);
            } else {
                // 새 예약 생성 (중복 확인 강화)
                const { data: duplicateCheck } = await supabase
                    .from('reservation')
                    .select('re_id')
                    .eq('re_user_id', user.id)
                    .eq('re_quote_id', quoteId)
                    .eq('re_type', 'hotel')
                    .maybeSingle();

                if (duplicateCheck) {
                    // 기존 예약이 있으면 해당 예약의 hotel 데이터도 삭제하고 재생성
                    console.log('🔄 기존 호텔 예약 발견 - 업데이트 모드로 전환');
                    reservationData = { re_id: duplicateCheck.re_id };

                    // 기존 호텔 예약 데이터 삭제
                    await supabase
                        .from('reservation_hotel')
                        .delete()
                        .eq('reservation_id', duplicateCheck.re_id);
                } else {
                    // 완전히 새로운 예약 생성
                    const { data: newReservation, error: reservationError } = await supabase
                        .from('reservation')
                        .insert({
                            re_user_id: user.id,
                            re_quote_id: quoteId,
                            re_type: 'hotel',
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

            // 선택된 호텔 서비스들 저장 (크루즈와 같은 패턴)
            let errors = [];

            if (availableServices.length > 0) {
                console.log('🏨 호텔 서비스 저장 중...', availableServices.length, '개');

                // 첫 번째 호텔 서비스를 메인으로 저장 (크루즈의 객실 선택 방식)
                const mainHotel = availableServices[0];
                const hotelData = {
                    reservation_id: reservationData.re_id,
                    hotel_price_code: mainHotel.hotel_code,
                    checkin_date: form.serviceData.checkin_date ? new Date(form.serviceData.checkin_date).toISOString().split('T')[0] : null,
                    room_count: form.serviceData.room_count || 1,
                    guest_count: form.serviceData.guest_count || 1,
                    breakfast_service: form.serviceData.breakfast_service || null,
                    hotel_category: mainHotel.hotel_name || null,
                    schedule: mainHotel.weekday_type || null,
                    total_price: mainHotel.price || 0,
                    request_note: form.request_note || null
                };

                console.log('🏨 호텔 데이터:', hotelData);
                const { error: hotelError } = await supabase
                    .from('reservation_hotel')
                    .insert(hotelData);

                if (hotelError) {
                    console.error('호텔 서비스 저장 오류:', hotelError);
                    errors.push(`호텔 서비스 오류: ${hotelError.message}`);
                }
            }

            if (errors.length > 0) {
                console.error('💥 호텔서비스 예약 저장 중 오류 발생:', errors);
                alert('호텔 예약 저장 중 오류가 발생했습니다:\n' + errors.join('\n'));
                return;
            }

            alert(isEditMode ? '호텔 서비스 예약이 성공적으로 수정되었습니다!' : '호텔 서비스 예약이 성공적으로 저장되었습니다!');
            router.push('/mypage/direct-booking');

        } catch (error) {
            console.error('💥 호텔서비스 예약 전체 처리 오류:', error);
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
                            🏨 호텔 서비스 {isEditMode ? '수정' : '예약'}
                        </h1>
                        <p className="text-sm text-gray-600 mt-1">행복 여행 이름: {quote.title}</p>
                        {isEditMode && (
                            <p className="text-sm text-blue-600 mt-1">📝 기존 예약을 수정하고 있습니다</p>
                        )}
                    </div>
                </div>

                {/* 사용 가능한 서비스 옵션들 - 정보 표시만 (선택 불가) */}
                <SectionBox title="가격에 포함된 호텔 서비스">
                    {availableServices.length > 0 && (
                        <div className="mb-6">
                            <h4 className="text-md font-medium text-orange-800 mb-3">🏨 호텔 서비스</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {availableServices.map((service, index) => (
                                    <div
                                        key={index}
                                        className="p-4 rounded-lg border-2 border-orange-200 bg-orange-50"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-medium text-gray-800">{service.hotel_name}</span>
                                            <span className="text-orange-600 font-bold">{service.price?.toLocaleString()}동</span>
                                        </div>
                                        <div className="text-sm text-gray-600 space-y-1">
                                            <div>객실: {service.room_name}</div>
                                            <div>타입: {service.room_type}</div>
                                            <div>기간: {service.start_date} ~ {service.end_date}</div>
                                            <div>요일: {service.weekday_type}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </SectionBox>

                {/* 입력 폼 - 서비스 존재 여부에 따라 자동 표시 */}
                {availableServices.length > 0 && (
                    <SectionBox title="호텔 상세 정보">
                        <div className="space-y-6">
                            {/* 호텔 기본 정보 */}
                            <div className="bg-orange-50 rounded-lg p-4">
                                <h4 className="text-md font-medium text-orange-800 mb-3">호텔 기본 정보</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">체크인 날짜 *</label>
                                        <input
                                            type="date"
                                            value={form.serviceData.checkin_date}
                                            onChange={(e) => handleInputChange('checkin_date', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">체크아웃 날짜</label>
                                        <input
                                            type="date"
                                            value={form.serviceData.checkout_date}
                                            onChange={(e) => handleInputChange('checkout_date', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">객실 수</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={form.serviceData.room_count}
                                            onChange={(e) => handleInputChange('room_count', parseInt(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">투숙객 수</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={form.serviceData.guest_count}
                                            onChange={(e) => handleInputChange('guest_count', parseInt(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">숙박 일수</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={form.serviceData.nights}
                                            onChange={(e) => handleInputChange('nights', parseInt(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">조식 서비스</label>
                                        <select
                                            value={form.serviceData.breakfast_service}
                                            onChange={(e) => handleInputChange('breakfast_service', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        >
                                            <option value="">조식 선택</option>
                                            <option value="없음">조식 없음</option>
                                            <option value="유럽식">유럽식 조식</option>
                                            <option value="아메리칸">아메리칸 조식</option>
                                            <option value="부페">부페 조식</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">객실 타입</label>
                                        <input
                                            type="text"
                                            value={form.serviceData.room_type}
                                            onChange={(e) => handleInputChange('room_type', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            placeholder="예: 디럭스, 스위트 등"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">특별 편의시설</label>
                                        <input
                                            type="text"
                                            value={form.serviceData.special_amenities}
                                            onChange={(e) => handleInputChange('special_amenities', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            placeholder="예: 온천, 수영장, 스파 등"
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
                                    placeholder="객실 층수, 전망, 기타 요청사항을 입력해주세요..."
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
                        className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 disabled:opacity-50"
                    >
                        {loading ? (isEditMode ? '수정 처리 중...' : '예약 처리 중...') : (isEditMode ? '예약 수정' : '예약 추가')}
                    </button>
                </div>
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
