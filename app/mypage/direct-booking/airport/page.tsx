'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '../../../../lib/supabase';
import { calculateServiceQuantity } from '../../../../lib/calculateServiceQuantity';
import PageWrapper from '../../../../components/PageWrapper';
import SectionBox from '../../../../components/SectionBox';

function DirectBookingAirportContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // 상태 관리
    const [step, setStep] = useState(1);
    const [quoteId, setQuoteId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>(null);

    // === 견적 공항 페이지 상태들 ===
    const [quote, setQuote] = useState<any>(null);

    // 단계별 옵션들 (airport_price 테이블 기준)
    const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
    // A(첫 서비스), B(추가 서비스) 각각의 경로/차량타입 옵션
    const [routeOptions, setRouteOptions] = useState<string[]>([]);
    const [carTypeOptions, setCarTypeOptions] = useState<string[]>([]);
    const [routeOptions2, setRouteOptions2] = useState<string[]>([]);
    const [carTypeOptions2, setCarTypeOptions2] = useState<string[]>([]);

    // 서비스 종류: pickup, sending, both
    const [applyType, setApplyType] = useState<'pickup' | 'sending' | 'both'>('pickup');

    // 선택된 값들 - A(메인), B(추가)
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedRoute, setSelectedRoute] = useState('');
    const [selectedCarType, setSelectedCarType] = useState('');
    const [selectedCategory2, setSelectedCategory2] = useState('');
    const [selectedRoute2, setSelectedRoute2] = useState('');
    const [selectedCarType2, setSelectedCarType2] = useState('');

    const [selectedAirportCode, setSelectedAirportCode] = useState(''); // A 코드 표시용
    const [selectedAirportCode2, setSelectedAirportCode2] = useState(''); // B 코드 표시용

    const [quoteFormData, setQuoteFormData] = useState({
        special_requests: ''
    });

    // === 예약 공항 페이지 상태들 ===
    // 폼 상태 - 크루즈 패턴 적용 (서비스 정보 입력)
    const [reservationForm, setReservationForm] = useState({
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

    const [availableServices, setAvailableServices] = useState<any[]>([]);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert('로그인이 필요합니다.');
                router.push('/login');
                return;
            }
            setUser(user);
        };

        checkUser();
        loadCategoryOptions();
    }, [router]);

    // === 견적 공항 페이지 함수들 ===
    // 신청 종류에 따른 자동 카테고리 매핑
    const getCategoryFromApplyType = (type: 'pickup' | 'sending' | 'both') => {
        switch (type) {
            case 'pickup': return '픽업';
            case 'sending': return '샌딩';
            case 'both': return '픽업'; // both일 때는 첫 번째가 픽업
            default: return '';
        }
    };

    const getCategory2FromApplyType = (type: 'pickup' | 'sending' | 'both') => {
        return type === 'both' ? '샌딩' : '';
    };

    // 카테고리 선택 시 경로 옵션 업데이트 (A)
    useEffect(() => {
        if (selectedCategory) {
            loadRouteOptions(selectedCategory);
        } else {
            setRouteOptions([]);
            setSelectedRoute('');
        }
    }, [selectedCategory]);

    // 카테고리와 경로가 선택될 때 차량 타입 목록 업데이트 (A)
    useEffect(() => {
        if (selectedCategory && selectedRoute) {
            loadCarTypeOptions(selectedCategory, selectedRoute);
        } else {
            setCarTypeOptions([]);
            setSelectedCarType('');
        }
    }, [selectedCategory, selectedRoute]);

    // 모든 조건이 선택되면 공항 코드 조회 (A)
    useEffect(() => {
        if (selectedCategory && selectedRoute && selectedCarType) {
            getAirportCodeFromConditions(selectedCategory, selectedRoute, selectedCarType)
                .then(code => setSelectedAirportCode(code))
                .catch(() => setSelectedAirportCode(''));
        } else {
            setSelectedAirportCode('');
        }
    }, [selectedCategory, selectedRoute, selectedCarType]);

    // 카테고리 선택 시 경로 옵션 업데이트 (B)
    useEffect(() => {
        if (selectedCategory2) {
            loadRouteOptions2(selectedCategory2);
        } else {
            setRouteOptions2([]);
            setSelectedRoute2('');
        }
    }, [selectedCategory2]);

    // 카테고리와 경로가 선택될 때 차량 타입 목록 업데이트 (B)
    useEffect(() => {
        if (selectedCategory2 && selectedRoute2) {
            loadCarTypeOptions2(selectedCategory2, selectedRoute2);
        } else {
            setCarTypeOptions2([]);
            setSelectedCarType2('');
        }
    }, [selectedCategory2, selectedRoute2]);

    // 모든 조건이 선택되면 공항 코드 조회 (B)
    useEffect(() => {
        if (selectedCategory2 && selectedRoute2 && selectedCarType2) {
            getAirportCodeFromConditions(selectedCategory2, selectedRoute2, selectedCarType2)
                .then(code => setSelectedAirportCode2(code))
                .catch(() => setSelectedAirportCode2(''));
        } else {
            setSelectedAirportCode2('');
        }
    }, [selectedCategory2, selectedRoute2, selectedCarType2]);

    // 신청 종류 변경 시 카테고리 자동 설정
    useEffect(() => {
        setSelectedCategory(getCategoryFromApplyType(applyType));
        setSelectedCategory2(getCategory2FromApplyType(applyType));
    }, [applyType]);

    const loadCategoryOptions = async () => {
        try {
            const { data, error } = await supabase
                .from('airport_price')
                .select('category')
                .order('category');

            if (error) throw error;

            const categories = [...new Set(data?.map(item => item.category))].filter(Boolean);
            setCategoryOptions(categories);
        } catch (error) {
            console.error('카테고리 로드 오류:', error);
        }
    };

    const loadRouteOptions = async (category: string) => {
        try {
            const { data, error } = await supabase
                .from('airport_price')
                .select('route')
                .eq('category', category)
                .order('route');

            if (error) throw error;

            const routes = [...new Set(data?.map(item => item.route))].filter(Boolean);
            setRouteOptions(routes);
        } catch (error) {
            console.error('경로 로드 오류:', error);
        }
    };

    const loadCarTypeOptions = async (category: string, route: string) => {
        try {
            const { data, error } = await supabase
                .from('airport_price')
                .select('vehicle_type')
                .eq('category', category)
                .eq('route', route)
                .order('vehicle_type');

            if (error) throw error;

            const carTypes = [...new Set(data?.map(item => item.vehicle_type))].filter(Boolean);
            setCarTypeOptions(carTypes);
        } catch (error) {
            console.error('차량 타입 로드 오류:', error);
        }
    };

    const loadRouteOptions2 = async (category: string) => {
        try {
            const { data, error } = await supabase
                .from('airport_price')
                .select('route')
                .eq('category', category)
                .order('route');

            if (error) throw error;

            const routes = [...new Set(data?.map(item => item.route))].filter(Boolean);
            setRouteOptions2(routes);
        } catch (error) {
            console.error('경로 로드 오류 (B):', error);
        }
    };

    const loadCarTypeOptions2 = async (category: string, route: string) => {
        try {
            const { data, error } = await supabase
                .from('airport_price')
                .select('vehicle_type')
                .eq('category', category)
                .eq('route', route)
                .order('vehicle_type');

            if (error) throw error;

            const carTypes = [...new Set(data?.map(item => item.vehicle_type))].filter(Boolean);
            setCarTypeOptions2(carTypes);
        } catch (error) {
            console.error('차량 타입 로드 오류 (B):', error);
        }
    };

    const getAirportCodeFromConditions = async (category: string, route: string, vehicleType: string) => {
        try {
            const { data, error } = await supabase
                .from('airport_price')
                .select('airport_code')
                .eq('category', category)
                .eq('route', route)
                .eq('vehicle_type', vehicleType)
                .single();

            if (error) throw error;
            return data?.airport_code || '';
        } catch (error) {
            console.error('공항 코드 조회 오류:', error);
            return '';
        }
    };

    // === 예약 공항 페이지 함수들 ===
    const loadAvailableAirportServices = async () => {
        if (!quoteId) return;

        try {
            const { data: services, error } = await supabase
                .from('airport_price')
                .select('*')
                .order('category', { ascending: true });

            if (error) throw error;
            setAvailableServices(services || []);
        } catch (error) {
            console.error('사용 가능한 서비스 로드 오류:', error);
        }
    };

    // === 저장 함수들 ===
    // 견적 생성 및 저장 (견적 공항 기반)
    const handleQuoteSubmit = async () => {
        try {
            setLoading(true);

            if (!user) {
                alert('로그인이 필요합니다.');
                return;
            }

            if (!selectedAirportCode) {
                alert('서비스를 선택해주세요.');
                return;
            }

            // 견적 생성
            const { data: newQuote, error: quoteError } = await supabase
                .from('quote')
                .insert({
                    user_id: user.id,
                    title: `공항 서비스 견적`,
                    status: 'pending',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (quoteError) throw quoteError;

            // 공항 서비스 저장 (A)
            const airportData = {
                quote_id: newQuote.id,
                airport_price_code: selectedAirportCode,
                special_requests: quoteFormData.special_requests || null
            };

            const { data: airportResponse, error: airportError } = await supabase
                .from('airport')
                .insert(airportData)
                .select()
                .single();

            if (airportError) throw airportError;

            // 견적 아이템 생성 (A)
            const quoteItemData = {
                quote_id: newQuote.id,
                service_type: 'airport',
                service_ref_id: airportResponse.id,
                quantity: 1,
                unit_price: 0,
                total_price: 0
            };

            const { error: itemError } = await supabase
                .from('quote_item')
                .insert(quoteItemData);

            if (itemError) throw itemError;

            // 두 번째 서비스가 있는 경우 추가 (B)
            if (selectedAirportCode2) {
                const airport2Data = {
                    quote_id: newQuote.id,
                    airport_price_code: selectedAirportCode2,
                    special_requests: quoteFormData.special_requests || null
                };

                const { data: airport2Response, error: airport2Error } = await supabase
                    .from('airport')
                    .insert(airport2Data)
                    .select()
                    .single();

                if (airport2Error) throw airport2Error;

                const quoteItem2Data = {
                    quote_id: newQuote.id,
                    service_type: 'airport',
                    service_ref_id: airport2Response.id,
                    quantity: 1,
                    unit_price: 0,
                    total_price: 0
                };

                const { error: item2Error } = await supabase
                    .from('quote_item')
                    .insert(quoteItem2Data);

                if (item2Error) throw item2Error;
            }

            setQuoteId(newQuote.id);
            setQuote(newQuote);
            setStep(2);

            // 예약을 위한 서비스 로드
            await loadAvailableAirportServices();

            alert('견적이 성공적으로 생성되었습니다!');

        } catch (error) {
            console.error('견적 생성 오류:', error);
            alert('견적 생성 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 예약 생성 및 저장 (예약 공항 기반)
    const handleReservationSubmit = async () => {
        try {
            setLoading(true);

            if (!user || !quoteId) {
                alert('잘못된 접근입니다.');
                return;
            }

            // 사용자 역할 업데이트
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

            // 기존 예약 확인 (중복 방지)
            const { data: existingReservations } = await supabase
                .from('reservation')
                .select('re_id')
                .eq('re_user_id', user.id)
                .eq('re_quote_id', quoteId)
                .eq('re_type', 'airport');

            if (existingReservations && existingReservations.length > 0) {
                alert('이미 이 견적에 대한 예약이 존재합니다.');
                return;
            }

            // 새 예약 생성
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

            if (reservationError) throw reservationError;

            // 공항 예약 저장 (예약 공항 패턴)
            const airportReservationData = {
                reservation_id: newReservation.re_id,
                airport_price_code: selectedAirportCode,
                ra_airport_location: reservationForm.serviceData.pickup_location,
                ra_flight_number: reservationForm.serviceData.pickup_flight_number,
                ra_datetime: reservationForm.serviceData.pickup_datetime ? new Date(reservationForm.serviceData.pickup_datetime).toISOString() : null,
                ra_passenger_count: reservationForm.serviceData.passenger_count,
                request_note: reservationForm.request_note || null
            };

            const { error: airportError } = await supabase
                .from('reservation_airport')
                .insert(airportReservationData);

            if (airportError) throw airportError;

            alert('예약이 성공적으로 완료되었습니다!');
            router.push('/mypage/direct-booking?completed=airport');

        } catch (error) {
            console.error('예약 저장 오류:', error);
            alert('예약 저장 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <PageWrapper>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">처리 중...</p>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper>
            {/* 진행 상태 표시 */}
            <div className="bg-blue-600 text-white p-6 rounded-lg mb-6">
                <h1 className="text-2xl font-bold mb-4">공항 서비스 다이렉트 예약</h1>
                <div className="flex items-center space-x-4">
                    <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-white' : 'text-blue-300'}`}>
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${step >= 1 ? 'bg-white text-blue-600' : 'border-blue-300'}`}>
                            1
                        </div>
                        <span>견적 생성</span>
                    </div>
                    <div className="flex-1 h-px bg-blue-300"></div>
                    <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-white' : 'text-blue-300'}`}>
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${step >= 2 ? 'bg-white text-blue-600' : 'border-blue-300'}`}>
                            2
                        </div>
                        <span>예약 완료</span>
                    </div>
                </div>
            </div>

            {/* Step 1: 견적 공항 페이지 내용 */}
            {step === 1 && (
                <SectionBox title="1단계: 공항 서비스 견적">
                    <div className="space-y-6">
                        {/* 신청 타입 선택 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">신청 타입</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { value: 'pickup', label: '픽업만' },
                                    { value: 'sending', label: '샌딩만' },
                                    { value: 'both', label: '픽업+샌딩' }
                                ].map(option => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setApplyType(option.value as any)}
                                        className={`p-2 text-sm rounded border transition-colors ${applyType === option.value
                                            ? 'bg-blue-500 text-white border-blue-500'
                                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 서비스 A (메인) */}
                        <div className="border rounded-lg p-4">
                            <h3 className="text-lg font-medium mb-4">
                                {applyType === 'pickup' ? '픽업 서비스' :
                                    applyType === 'sending' ? '샌딩 서비스' : '픽업 서비스 (1차)'}
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="w-full px-2 py-1 rounded border border-gray-200"
                                        disabled={true}
                                    >
                                        <option value="">[자동선택]</option>
                                        {categoryOptions.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">루트</label>
                                    <select
                                        value={selectedRoute}
                                        onChange={(e) => setSelectedRoute(e.target.value)}
                                        className="w-full px-2 py-1 rounded border border-gray-200"
                                        disabled={!selectedCategory}
                                    >
                                        <option value="">루트 선택</option>
                                        {routeOptions.map(route => (
                                            <option key={route} value={route}>{route}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">차량 타입</label>
                                    <select
                                        value={selectedCarType}
                                        onChange={(e) => setSelectedCarType(e.target.value)}
                                        className="w-full px-2 py-1 rounded border border-gray-200"
                                        disabled={!selectedRoute}
                                    >
                                        <option value="">차량 타입 선택</option>
                                        {carTypeOptions.map(carType => (
                                            <option key={carType} value={carType}>{carType}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {selectedAirportCode && (
                                <div className="mt-4 p-3 bg-blue-50 rounded">
                                    <p className="text-sm text-blue-700">
                                        선택된 서비스 코드: <strong>{selectedAirportCode}</strong>
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 서비스 B (추가) - both 선택 시만 표시 */}
                        {applyType === 'both' && (
                            <div className="border rounded-lg p-4">
                                <h3 className="text-lg font-medium mb-4">샌딩 서비스 (2차)</h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
                                        <select
                                            value={selectedCategory2}
                                            onChange={(e) => setSelectedCategory2(e.target.value)}
                                            className="w-full px-2 py-1 rounded border border-gray-200"
                                            disabled={true}
                                        >
                                            <option value="">[자동선택]</option>
                                            {categoryOptions.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">루트</label>
                                        <select
                                            value={selectedRoute2}
                                            onChange={(e) => setSelectedRoute2(e.target.value)}
                                            className="w-full px-2 py-1 rounded border border-gray-200"
                                            disabled={!selectedCategory2}
                                        >
                                            <option value="">루트 선택</option>
                                            {routeOptions2.map(route => (
                                                <option key={route} value={route}>{route}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">차량 타입</label>
                                        <select
                                            value={selectedCarType2}
                                            onChange={(e) => setSelectedCarType2(e.target.value)}
                                            className="w-full px-2 py-1 rounded border border-gray-200"
                                            disabled={!selectedRoute2}
                                        >
                                            <option value="">차량 타입 선택</option>
                                            {carTypeOptions2.map(carType => (
                                                <option key={carType} value={carType}>{carType}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {selectedAirportCode2 && (
                                    <div className="mt-4 p-3 bg-green-50 rounded">
                                        <p className="text-sm text-green-700">
                                            선택된 서비스 코드 (2차): <strong>{selectedAirportCode2}</strong>
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 특별 요청사항 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">특별 요청사항</label>
                            <textarea
                                value={quoteFormData.special_requests}
                                onChange={(e) => setQuoteFormData({ ...quoteFormData, special_requests: e.target.value })}
                                rows={3}
                                placeholder="추가 요청사항이 있으시면 입력해주세요"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* 견적 생성 버튼 */}
                        <div className="flex justify-end">
                            <button
                                onClick={handleQuoteSubmit}
                                disabled={!selectedAirportCode || loading}
                                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {loading ? '처리 중...' : '견적 생성하기'}
                            </button>
                        </div>
                    </div>
                </SectionBox>
            )}

            {/* Step 2: 예약 공항 페이지 내용 */}
            {step === 2 && (
                <SectionBox title="2단계: 공항 서비스 예약">
                    <div className="space-y-6">
                        {/* 견적 정보 표시 */}
                        {quote && (
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="text-lg font-medium mb-2">견적 정보</h3>
                                <p><strong>견적 ID:</strong> {quote.id}</p>
                                <p><strong>제목:</strong> {quote.title}</p>
                                <p><strong>상태:</strong> {quote.status}</p>
                            </div>
                        )}

                        {/* 픽업 정보 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">픽업 위치</label>
                            <input
                                type="text"
                                value={reservationForm.serviceData.pickup_location}
                                onChange={(e) => setReservationForm({
                                    ...reservationForm,
                                    serviceData: { ...reservationForm.serviceData, pickup_location: e.target.value }
                                })}
                                placeholder="상세한 픽업 주소를 입력해주세요"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">픽업 일시</label>
                                <input
                                    type="datetime-local"
                                    value={reservationForm.serviceData.pickup_datetime}
                                    onChange={(e) => setReservationForm({
                                        ...reservationForm,
                                        serviceData: { ...reservationForm.serviceData, pickup_datetime: e.target.value }
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">항공편명</label>
                                <input
                                    type="text"
                                    value={reservationForm.serviceData.pickup_flight_number}
                                    onChange={(e) => setReservationForm({
                                        ...reservationForm,
                                        serviceData: { ...reservationForm.serviceData, pickup_flight_number: e.target.value }
                                    })}
                                    placeholder="예: KE123"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">승객 수</label>
                            <input
                                type="number"
                                min="1"
                                value={reservationForm.serviceData.passenger_count}
                                onChange={(e) => setReservationForm({
                                    ...reservationForm,
                                    serviceData: { ...reservationForm.serviceData, passenger_count: parseInt(e.target.value) || 1 }
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* 요청사항 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">요청사항</label>
                            <textarea
                                value={reservationForm.request_note}
                                onChange={(e) => setReservationForm({ ...reservationForm, request_note: e.target.value })}
                                rows={3}
                                placeholder="추가 요청사항이 있으시면 입력해주세요"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* 예약 완료 버튼 */}
                        <div className="flex justify-between">
                            <button
                                onClick={() => setStep(1)}
                                className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                            >
                                이전 단계
                            </button>
                            <button
                                onClick={handleReservationSubmit}
                                disabled={loading || !reservationForm.serviceData.pickup_location}
                                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {loading ? '처리 중...' : '예약 완료하기'}
                            </button>
                        </div>
                    </div>
                </SectionBox>
            )}
        </PageWrapper>
    );
}

export default function DirectBookingAirportPage() {
    return (
        <Suspense fallback={
            <PageWrapper>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">로딩 중...</p>
                </div>
            </PageWrapper>
        }>
            <DirectBookingAirportContent />
        </Suspense>
    );
}
