'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '../../../../../lib/supabase';
import PageWrapper from '../../../../../components/PageWrapper';
import SectionBox from '../../../../../components/SectionBox';

function AirportServiceContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const quoteId = searchParams.get('quoteId');

    // 폼 상태 - 크루즈 패턴 적용 (서비스 정보 입력)
    const [form, setForm] = useState({
        // 서비스 타입별 폼 데이터
        serviceData: {
            pickup_location: '',
            pickup_datetime: '',
            pickup_flight_number: '',
            sending_location: '',
            sending_datetime: '',
            sending_flight_number: '',
            passenger_count: 1,
            luggage_count: 0,
            stopover_location: '',
            stopover_wait_minutes: 0,
            car_count: 1,
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
            router.push('/mypage/direct-booking/airport/1');
            return;
        }
        loadQuote();
        loadAvailableAirportServices();
        checkExistingReservation();
    }, [quoteId, router]);

    // 가격 정보 로드
    const loadQuote = async () => {
        try {
            const { data: quoteData, error } = await supabase
                .from('quote')
                .select('id, title, status')
                .eq('id', quoteId)
                .single();

            if (error || !quoteData) {
                alert('가격을 찾을 수 없습니다.');
                router.push('/mypage/direct-booking/airport/1');
                return;
            }

            setQuote(quoteData);
        } catch (error) {
            console.error('가격 로드 오류:', error);
            alert('가격 정보를 불러오는 중 오류가 발생했습니다.');
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
          reservation_airport (*)
        `)
                .eq('re_user_id', user.id)
                .eq('re_quote_id', quoteId)
                .eq('re_type', 'airport')
                .maybeSingle();

            if (existingRes) {
                setExistingReservation(existingRes);
                setIsEditMode(true);

                // 기존 데이터로 폼 초기화
                if (existingRes.reservation_airport && existingRes.reservation_airport.length > 0) {
                    const airportData = existingRes.reservation_airport[0];
                    setForm(prev => ({
                        ...prev,
                        serviceData: {
                            pickup_location: airportData.ra_airport_location || '',
                            pickup_datetime: airportData.ra_datetime ? new Date(airportData.ra_datetime).toISOString().slice(0, 16) : '',
                            pickup_flight_number: airportData.ra_flight_number || '',
                            sending_location: airportData.ra_airport_location || '',
                            sending_datetime: airportData.ra_datetime ? new Date(airportData.ra_datetime).toISOString().slice(0, 16) : '',
                            sending_flight_number: airportData.ra_flight_number || '',
                            passenger_count: airportData.ra_passenger_count || 1,
                            luggage_count: airportData.ra_luggage_count || 0,
                            stopover_location: airportData.ra_stopover_location || '',
                            stopover_wait_minutes: airportData.ra_stopover_wait_minutes || 0,
                            car_count: airportData.ra_car_count || 1,
                        },
                        request_note: airportData.request_note || ''
                    }));
                }
            }
        } catch (error) {
            console.error('기존 예약 확인 오류:', error);
        }
    };

    // 사용 가능한 공항 서비스 로드 (크루즈의 객실 가격 로드 방식과 동일)
    const loadAvailableAirportServices = async () => {
        try {
            // 가격에 연결된 공항 서비스들 조회
            const { data: quoteItems } = await supabase
                .from('quote_item')
                .select('service_type, service_ref_id, usage_date')
                .eq('quote_id', quoteId)
                .eq('service_type', 'airport');

            if (quoteItems && quoteItems.length > 0) {
                const allServices = [];

                // 각 공항 아이템에 대해 가격 옵션들 조회 (크루즈의 room_price 방식)
                for (const item of quoteItems) {
                    const { data: airportData } = await supabase
                        .from('airport')
                        .select('airport_code')
                        .eq('id', item.service_ref_id)
                        .single();

                    if (airportData?.airport_code) {
                        // 해당 공항 코드의 모든 가격 옵션 조회 (크루즈의 카테고리별 가격과 동일)
                        const { data: priceOptions } = await supabase
                            .from('airport_price')
                            .select('*')
                            .eq('airport_code', airportData.airport_code);

                        if (priceOptions) {
                            allServices.push(...priceOptions.map(option => ({
                                ...option,
                                usage_date: item.usage_date
                            })));
                        }
                    }
                }

                setAvailableServices(allServices);
            }
        } catch (error) {
            console.error('공항 서비스 로드 오류:', error);
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
            alert('예약할 공항 서비스가 없습니다.');
            return;
        }

        setLoading(true);

        try {
            // 사용자 인증 및 역할 확인
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                router.push(`/mypage/direct-booking/airport/1`);
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

                // 기존 reservation_airport의 모든 행 삭제 (픽업/샌딩 모두)
                await supabase
                    .from('reservation_airport')
                    .delete()
                    .eq('reservation_id', existingReservation.re_id);
            } else {
                // 새 예약 생성 (중복 확인 강화)
                const { data: duplicateCheck } = await supabase
                    .from('reservation')
                    .select('re_id')
                    .eq('re_user_id', user.id)
                    .eq('re_quote_id', quoteId)
                    .eq('re_type', 'airport')
                    .maybeSingle();

                if (duplicateCheck) {
                    // 기존 예약이 있으면 해당 예약의 airport 데이터도 삭제하고 재생성
                    console.log('🔄 기존 공항 예약 발견 - 업데이트 모드로 전환');
                    reservationData = { re_id: duplicateCheck.re_id };

                    // 기존 공항 예약 데이터 삭제
                    await supabase
                        .from('reservation_airport')
                        .delete()
                        .eq('reservation_id', duplicateCheck.re_id);
                } else {
                    // 완전히 새로운 예약 생성
                    const { data: newReservation, error: reservationError } = await supabase
                        .from('reservation')
                        .insert({
                            re_user_id: user.id,
                            re_quote_id: quoteId,
                            re_type: 'airport',
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

            // 픽업/샌딩 서비스 분류
            const pickupServices = availableServices.filter(service =>
                service.airport_category?.toLowerCase().includes('픽업')
            );
            const sendingServices = availableServices.filter(service =>
                service.airport_category?.toLowerCase().includes('샌딩')
            );

            // 픽업/샌딩 각각 별도 행으로 저장
            let errors = [];

            // 픽업
            if (pickupServices.length > 0) {
                console.log('📤 픽업 서비스 저장 중...', pickupServices.length, '개');
                for (const pickup of pickupServices) {
                    const pickupData = {
                        reservation_id: reservationData.re_id,
                        airport_price_code: pickup.airport_code,
                        ra_airport_location: form.serviceData.pickup_location,
                        ra_flight_number: form.serviceData.pickup_flight_number || null,
                        ra_datetime: form.serviceData.pickup_datetime ? new Date(form.serviceData.pickup_datetime).toISOString() : null,
                        ra_stopover_location: form.serviceData.stopover_location || null,
                        ra_stopover_wait_minutes: form.serviceData.stopover_wait_minutes || 0,
                        ra_car_count: form.serviceData.car_count || 1,
                        ra_passenger_count: form.serviceData.passenger_count,
                        ra_luggage_count: form.serviceData.luggage_count,
                        ra_is_processed: false,
                        request_note: form.request_note || null
                    };

                    console.log('📤 픽업 데이터:', pickupData);
                    const { error: pickupError } = await supabase
                        .from('reservation_airport')
                        .insert(pickupData);

                    if (pickupError) {
                        console.error('픽업 서비스 저장 오류:', pickupError);
                        errors.push(`픽업 서비스 오류: ${pickupError.message}`);
                    }
                }
            }

            // 샌딩 
            if (sendingServices.length > 0) {
                console.log('📨 샌딩 서비스 저장 중...', sendingServices.length, '개');
                for (const sending of sendingServices) {
                    const sendingData = {
                        reservation_id: reservationData.re_id,
                        airport_price_code: sending.airport_code,
                        ra_airport_location: form.serviceData.sending_location,
                        ra_flight_number: form.serviceData.sending_flight_number || null,
                        ra_datetime: form.serviceData.sending_datetime ? new Date(form.serviceData.sending_datetime).toISOString() : null,
                        ra_stopover_location: form.serviceData.stopover_location || null,
                        ra_stopover_wait_minutes: form.serviceData.stopover_wait_minutes || 0,
                        ra_car_count: form.serviceData.car_count || 1,
                        ra_passenger_count: form.serviceData.passenger_count,
                        ra_luggage_count: form.serviceData.luggage_count,
                        ra_is_processed: false,
                        request_note: form.request_note || null
                    };

                    console.log('📨 샌딩 데이터:', sendingData);
                    const { error: sendingError } = await supabase
                        .from('reservation_airport')
                        .insert(sendingData);

                    if (sendingError) {
                        console.error('샌딩 서비스 저장 오류:', sendingError);
                        errors.push(`샌딩 서비스 오류: ${sendingError.message}`);
                    }
                }
            }

            if (errors.length > 0) {
                console.error('💥 공항서비스 예약 저장 중 오류 발생:', errors);
                alert('공항 예약 저장 중 오류가 발생했습니다:\n' + errors.join('\n'));
                return;
            }

            alert(isEditMode ? '공항 서비스 예약이 성공적으로 수정되었습니다!' : '공항 서비스 예약이 성공적으로 저장되었습니다!');
            router.push('/mypage/direct-booking?completed=airport');

        } catch (error) {
            console.error('💥 공항서비스 예약 전체 처리 오류:', error);
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

    // 픽업/샌딩 서비스 분류
    const pickupServices = availableServices.filter(service =>
        service.airport_category?.toLowerCase().includes('픽업')
    );
    const sendingServices = availableServices.filter(service =>
        service.airport_category?.toLowerCase().includes('샌딩')
    );

    return (
        <PageWrapper>
            <div className="space-y-6">
                {/* 헤더 */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-lg font-bold text-gray-800">
                            ✈️ 공항 서비스 {isEditMode ? '수정' : '예약'}
                        </h1>
                        <p className="text-sm text-gray-600 mt-1">2단계: 행복 여행 이름: {quote.title}</p>
                        {isEditMode && (
                            <p className="text-sm text-blue-600 mt-1">📝 기존 예약을 수정하고 있습니다</p>
                        )}
                    </div>
                </div>

                {/* 사용 가능한 서비스 옵션들 - 정보 표시만 (선택 불가) */}
                <SectionBox title="가격 산정에 포함된 공항 서비스">
                    {/* 픽업 서비스들 */}
                    {pickupServices.length > 0 && (
                        <div className="mb-6">
                            <h4 className="text-md font-medium text-blue-800 mb-3">🚗 픽업 서비스</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {pickupServices.map((service) => (
                                    <div
                                        key={service.airport_code}
                                        className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-medium text-gray-800">{service.airport_category}</span>
                                            <span className="text-blue-600 font-bold">{service.price?.toLocaleString()}동</span>
                                        </div>
                                        <div className="text-sm text-gray-600 space-y-1">
                                            <div>경로: {service.airport_route}</div>
                                            <div>차량: {service.airport_car_type}</div>
                                            <div>지역: {service.area}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 샌딩 서비스들 */}
                    {sendingServices.length > 0 && (
                        <div className="mb-6">
                            <h4 className="text-md font-medium text-green-800 mb-3">✈️ 샌딩 서비스</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {sendingServices.map((service) => (
                                    <div
                                        key={service.airport_code}
                                        className="p-4 rounded-lg border-2 border-green-200 bg-green-50"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-medium text-gray-800">{service.airport_category}</span>
                                            <span className="text-green-600 font-bold">{service.price?.toLocaleString()}동</span>
                                        </div>
                                        <div className="text-sm text-gray-600 space-y-1">
                                            <div>경로: {service.airport_route}</div>
                                            <div>차량: {service.airport_car_type}</div>
                                            <div>지역: {service.area}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </SectionBox>

                {/* 입력 폼 - 서비스 존재 여부에 따라 자동 표시 */}
                {(pickupServices.length > 0 || sendingServices.length > 0) && (
                    <SectionBox title="서비스 상세 정보">
                        <div className="space-y-6">
                            {/* 픽업 정보 - 픽업 서비스가 존재하면 자동 표시 */}
                            {pickupServices.length > 0 && (
                                <div className="bg-blue-50 rounded-lg p-4">
                                    <h4 className="text-md font-medium text-blue-800 mb-3">픽업 서비스 정보</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">목적지 *</label>
                                            <input
                                                type="text"
                                                value={form.serviceData.pickup_location}
                                                onChange={(e) => handleInputChange('pickup_location', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">픽업 일시 *</label>
                                            <input
                                                type="datetime-local"
                                                value={form.serviceData.pickup_datetime}
                                                onChange={(e) => handleInputChange('pickup_datetime', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">항공편 번호</label>
                                            <input
                                                type="text"
                                                value={form.serviceData.pickup_flight_number}
                                                onChange={(e) => handleInputChange('pickup_flight_number', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                placeholder="예: KE001"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">탑승 인원수</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={form.serviceData.passenger_count}
                                                onChange={(e) => handleInputChange('passenger_count', parseInt(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">수하물 개수</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={form.serviceData.luggage_count}
                                                onChange={(e) => handleInputChange('luggage_count', parseInt(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">차량 대수</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={form.serviceData.car_count}
                                                onChange={(e) => handleInputChange('car_count', parseInt(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">경유지</label>
                                            <input
                                                type="text"
                                                value={form.serviceData.stopover_location}
                                                onChange={(e) => handleInputChange('stopover_location', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                placeholder="경유지가 있다면 입력해주세요"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">경유지 대기시간 (분)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={form.serviceData.stopover_wait_minutes}
                                                onChange={(e) => handleInputChange('stopover_wait_minutes', parseInt(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 샌딩 정보 - 샌딩 서비스가 존재하면 자동 표시 */}
                            {sendingServices.length > 0 && (
                                <div className="bg-green-50 rounded-lg p-4">
                                    <h4 className="text-md font-medium text-green-800 mb-3">샌딩 서비스 정보</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">출발지 *</label>
                                            <input
                                                type="text"
                                                value={form.serviceData.sending_location}
                                                onChange={(e) => handleInputChange('sending_location', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">출발 일시 *</label>
                                            <input
                                                type="datetime-local"
                                                value={form.serviceData.sending_datetime}
                                                onChange={(e) => handleInputChange('sending_datetime', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">항공편 번호</label>
                                            <input
                                                type="text"
                                                value={form.serviceData.sending_flight_number}
                                                onChange={(e) => handleInputChange('sending_flight_number', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                placeholder="예: KE001"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">탑승 인원수</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={form.serviceData.passenger_count}
                                                onChange={(e) => handleInputChange('passenger_count', parseInt(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">수하물 개수</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={form.serviceData.luggage_count}
                                                onChange={(e) => handleInputChange('luggage_count', parseInt(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">차량 대수</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={form.serviceData.car_count}
                                                onChange={(e) => handleInputChange('car_count', parseInt(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">경유지</label>
                                            <input
                                                type="text"
                                                value={form.serviceData.stopover_location}
                                                onChange={(e) => handleInputChange('stopover_location', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                placeholder="경유지가 있다면 입력해주세요"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">경유지 대기시간 (분)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={form.serviceData.stopover_wait_minutes}
                                                onChange={(e) => handleInputChange('stopover_wait_minutes', parseInt(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 특별 요청사항 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">특별 요청사항</label>
                                <textarea
                                    value={form.request_note}
                                    onChange={(e) => setForm(prev => ({ ...prev, request_note: e.target.value }))}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="특별 서비스 등 요청사항을 입력해주세요..."
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
                        className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    >
                        {loading ? (isEditMode ? '수정 처리 중...' : '예약 처리 중...') : (isEditMode ? '예약 수정' : '예약 완료')}
                    </button>
                </div>
            </div>
        </PageWrapper>
    );
}

export default function AirportServicePage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64">로딩 중...</div>}>
            <AirportServiceContent />
        </Suspense>
    );
}
