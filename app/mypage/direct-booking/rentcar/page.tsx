'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '../../../../lib/supabase';
import { createQuote } from '../../../../lib/quoteUtils';

function DirectBookingRentcarContent() {
    const router = useRouter();

    // 현재 단계 상태 (quote → reservation)
    const [currentStep, setCurrentStep] = useState<'quote' | 'reservation'>('quote');
    const [quoteId, setQuoteId] = useState<string | null>(null);

    // 견적 폼 상태
    const [quoteForm, setQuoteForm] = useState({
        pickup_date: '',
        return_date: '',
        rental_days: 1,
        pickup_location: '',
        return_location: '',
        driver_count: 1,
        car_type: '',
        insurance_type: 'basic',
        special_requests: ''
    });

    // 예약 폼 상태
    const [reservationForm, setReservationForm] = useState({
        request_note: '',
        driver_names: '',
        contact_phone: '',
        pickup_time: ''
    });

    // 옵션 데이터
    const [rentcarPriceOptions, setRentcarPriceOptions] = useState<any[]>([]);
    const [selectedServices, setSelectedServices] = useState<any[]>([]);

    // 로딩 상태
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [quote, setQuote] = useState<any>(null);

    // 예약 관련 상태
    const [rentcarData, setRentcarData] = useState<any>(null);

    useEffect(() => {
        // 사용자 인증 확인
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) {
                router.push('/login');
            } else {
                setUser(user);
                loadRentcarPriceOptions();
            }
        });
    }, [router]);

    // 반납일 자동 계산
    useEffect(() => {
        if (quoteForm.pickup_date && quoteForm.rental_days > 0) {
            const pickupDate = new Date(quoteForm.pickup_date);
            const returnDate = new Date(pickupDate);
            returnDate.setDate(pickupDate.getDate() + quoteForm.rental_days);
            setQuoteForm(prev => ({
                ...prev,
                return_date: returnDate.toISOString().split('T')[0]
            }));
        }
    }, [quoteForm.pickup_date, quoteForm.rental_days]);

    // 렌터카 가격 옵션 로드
    const loadRentcarPriceOptions = async () => {
        try {
            const { data, error } = await supabase
                .from('rentcar_price')
                .select('*')
                .order('vehicle_type, car_model');

            if (error) throw error;

            setRentcarPriceOptions(data || []);
            console.log('렌터카 서비스 옵션 로드됨:', data?.length);
        } catch (error) {
            console.error('렌터카 서비스 옵션 조회 실패:', error);
        }
    };

    // 서비스 선택/해제
    const toggleService = (service: any) => {
        setSelectedServices(prev => {
            const isSelected = prev.some(s => s.rentcar_code === service.rentcar_code);
            if (isSelected) {
                return prev.filter(s => s.rentcar_code !== service.rentcar_code);
            } else {
                return [...prev, service];
            }
        });
    };

    // 차량 타입별 서비스 분류
    const getServicesByType = () => {
        const types: { [key: string]: any[] } = {};
        rentcarPriceOptions.forEach(service => {
            const type = service.vehicle_type || '기타';
            if (!types[type]) {
                types[type] = [];
            }
            types[type].push(service);
        });
        return types;
    };

    // 견적 제출 함수
    const handleQuoteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);

            if (!user) {
                alert('로그인이 필요합니다.');
                return;
            }

            if (selectedServices.length === 0) {
                alert('최소 하나의 렌터카를 선택해주세요.');
                return;
            }

            // 견적 생성
            const newQuote = await createQuote(user.id, `렌터카 예약 직접예약 ${new Date().toLocaleDateString()}`);
            if (!newQuote) {
                alert('견적 생성에 실패했습니다.');
                return;
            }

            setQuoteId(newQuote.id);
            setQuote(newQuote);

            // 메인 서비스 (가장 비싼 서비스)를 기준으로 저장
            const mainService = selectedServices.reduce((prev, current) =>
                (prev.price > current.price) ? prev : current
            );

            // 렌터카 서비스 데이터 저장
            const { data: rentcarData, error: rentcarError } = await supabase
                .from('rentcar')
                .insert({
                    rentcar_code: mainService.rentcar_code,
                    pickup_date: quoteForm.pickup_date,
                    return_date: quoteForm.return_date,
                    rental_days: quoteForm.rental_days,
                    pickup_location: quoteForm.pickup_location,
                    return_location: quoteForm.return_location,
                    driver_count: quoteForm.driver_count
                })
                .select()
                .single();

            if (rentcarError) throw rentcarError;

            // quote_item에 연결
            const { error: itemError } = await supabase
                .from('quote_item')
                .insert({
                    quote_id: newQuote.id,
                    service_type: 'rentcar',
                    service_ref_id: rentcarData.id,
                    quantity: quoteForm.rental_days,
                    unit_price: mainService.price,
                    total_price: mainService.price * quoteForm.rental_days,
                    usage_date: quoteForm.pickup_date
                });

            if (itemError) throw itemError;

            // 렌터카 데이터 설정
            setRentcarData({
                ...rentcarData,
                priceInfo: mainService,
                selectedServices: selectedServices
            });

            alert('견적이 성공적으로 저장되었습니다! 이제 예약을 진행해주세요.');
            setCurrentStep('reservation');

        } catch (error) {
            console.error('견적 저장 실패:', error);
            alert('견적 저장 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 예약 제출 함수
    const handleReservationSubmit = async () => {
        try {
            setLoading(true);

            if (!user || !quoteId || !rentcarData) {
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

            // 새 예약 생성
            const { data: newReservation, error: reservationError } = await supabase
                .from('reservation')
                .insert({
                    re_user_id: user.id,
                    re_quote_id: quoteId,
                    re_type: 'rentcar',
                    re_status: 'pending',
                    re_created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (reservationError) throw reservationError;

            // 추가 서비스 정보를 request_note에 포함
            const additionalServicesNote = selectedServices
                .filter(service => service.rentcar_code !== rentcarData.priceInfo.rentcar_code)
                .map(service => `추가 차량: ${service.car_model} - ${service.vehicle_type} (${service.price?.toLocaleString()}동/일)`)
                .join('\n');

            const fullRequestNote = [
                reservationForm.request_note,
                additionalServicesNote
            ].filter(Boolean).join('\n');

            // 렌터카 예약 저장
            const rentcarReservationData = {
                reservation_id: newReservation.re_id,
                rentcar_price_code: rentcarData.priceInfo.rentcar_code,
                pickup_datetime: quoteForm.pickup_date ? new Date(`${quoteForm.pickup_date}T${reservationForm.pickup_time || '09:00'}`).toISOString() : null,
                return_datetime: quoteForm.return_date ? new Date(`${quoteForm.return_date}T${reservationForm.pickup_time || '09:00'}`).toISOString() : null,
                destination: quoteForm.return_location,
                driver_count: quoteForm.driver_count,
                request_note: fullRequestNote || null
            };

            const { error: rentcarError } = await supabase
                .from('reservation_rentcar')
                .insert(rentcarReservationData);

            if (rentcarError) throw rentcarError;

            alert('예약이 성공적으로 완료되었습니다!');
            router.push('/mypage/direct-booking?completed=rentcar');

        } catch (error) {
            console.error('예약 저장 오류:', error);
            alert('예약 저장 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    if (loading && currentStep === 'quote') {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">처리 중...</p>
                </div>
            </div>
        );
    }

    const servicesByType = getServicesByType();
    const totalPrice = selectedServices.reduce((sum, service) => sum + (service.price || 0) * quoteForm.rental_days, 0);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 헤더 */}
            <div className="bg-gradient-to-br from-purple-200 via-indigo-200 to-blue-100 text-gray-900">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">🚗 렌터카 예약 직접 예약</h1>
                            <p className="text-lg opacity-90">
                                {currentStep === 'quote' ? '견적 작성 → 예약 진행' : '예약 정보 입력'}
                            </p>
                        </div>
                        <button
                            onClick={() => router.back()}
                            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            ← 뒤로
                        </button>
                    </div>

                    {/* 진행 단계 표시 */}
                    <div className="bg-white/70 backdrop-blur rounded-lg p-4 mb-6">
                        <div className="flex items-center space-x-4">
                            <div className={`flex items-center space-x-2 ${currentStep === 'quote' ? 'text-purple-600 font-semibold' : 'text-purple-600'}`}>
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${currentStep === 'quote' ? 'bg-purple-500' : 'bg-purple-500'}`}>
                                    {currentStep === 'quote' ? '1' : '✓'}
                                </span>
                                <span>견적 작성</span>
                            </div>
                            <div className="flex-1 h-1 bg-gray-300 rounded">
                                <div className={`h-full bg-purple-500 rounded transition-all duration-500 ${currentStep === 'reservation' ? 'w-full' : 'w-0'}`}></div>
                            </div>
                            <div className={`flex items-center space-x-2 ${currentStep === 'reservation' ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${currentStep === 'reservation' ? 'bg-purple-500' : 'bg-gray-400'}`}>
                                    2
                                </span>
                                <span>예약 진행</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 메인 컨텐츠 */}
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">

                    {/* 견적 작성 단계 */}
                    {currentStep === 'quote' && (
                        <form onSubmit={handleQuoteSubmit} className="bg-white rounded-xl shadow-lg p-8">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6">📝 1단계: 견적 작성</h2>

                            {/* 렌터카 예약 안내 카드 */}
                            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 mb-6">
                                <h3 className="text-white text-lg font-semibold mb-2">🚗 렌터카 예약 안내</h3>
                                <p className="text-white/90 text-sm">
                                    다양한 차량과 렌터카 서비스를 선택하여 자유로운 여행을 계획하세요.<br />
                                    여러 차량을 조합하여 선택할 수 있습니다.
                                </p>
                            </div>

                            {/* 기본 정보 */}
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">📅 인수 날짜</label>
                                        <input
                                            type="date"
                                            value={quoteForm.pickup_date}
                                            onChange={e => setQuoteForm({ ...quoteForm, pickup_date: e.target.value })}
                                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">🗓️ 대여 일수</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={quoteForm.rental_days}
                                            onChange={e => setQuoteForm({ ...quoteForm, rental_days: parseInt(e.target.value) || 1 })}
                                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">📅 반납 날짜</label>
                                        <input
                                            type="date"
                                            value={quoteForm.return_date}
                                            readOnly
                                            className="w-full border border-gray-300 p-3 rounded-lg bg-gray-100 text-gray-600"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">📍 인수 장소</label>
                                        <input
                                            type="text"
                                            value={quoteForm.pickup_location}
                                            onChange={e => setQuoteForm({ ...quoteForm, pickup_location: e.target.value })}
                                            placeholder="예: 하노이 공항, 호치민 시내"
                                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">📍 반납 장소</label>
                                        <input
                                            type="text"
                                            value={quoteForm.return_location}
                                            onChange={e => setQuoteForm({ ...quoteForm, return_location: e.target.value })}
                                            placeholder="예: 하노이 공항, 호치민 시내"
                                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">👤 운전자 수</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={quoteForm.driver_count}
                                            onChange={e => setQuoteForm({ ...quoteForm, driver_count: parseInt(e.target.value) || 1 })}
                                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* 차량 선택 영역 */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-800">🚗 차량 선택</h3>

                                    {Object.entries(servicesByType).map(([type, services]) => (
                                        <div key={type} className="space-y-3">
                                            <h4 className="text-md font-medium text-purple-700 border-l-4 border-purple-500 pl-3">
                                                {type}
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {services.map((service) => (
                                                    <div
                                                        key={service.rentcar_code}
                                                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedServices.some(s => s.rentcar_code === service.rentcar_code)
                                                                ? 'border-purple-500 bg-purple-50'
                                                                : 'border-gray-200 bg-white hover:border-purple-300'
                                                            }`}
                                                        onClick={() => toggleService(service)}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="font-medium">{service.car_model}</span>
                                                            <span className="text-purple-600 font-bold">{service.price?.toLocaleString()}동/일</span>
                                                        </div>
                                                        <div className="text-sm text-gray-600">
                                                            <div>좌석: {service.seats}인승</div>
                                                            <div>특징: {service.features}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* 선택된 서비스 요약 */}
                                {selectedServices.length > 0 && (
                                    <div className="bg-yellow-50 rounded-lg p-4">
                                        <h4 className="text-md font-medium text-yellow-800 mb-2">✅ 선택된 차량</h4>
                                        <div className="space-y-2">
                                            {selectedServices.map((service, index) => (
                                                <div key={index} className="flex justify-between text-sm">
                                                    <span>{service.car_model} - {service.vehicle_type}</span>
                                                    <span className="font-medium">{(service.price * quoteForm.rental_days)?.toLocaleString()}동</span>
                                                </div>
                                            ))}
                                            <div className="border-t border-yellow-300 pt-2 mt-2">
                                                <div className="flex justify-between font-bold text-red-600">
                                                    <span>총 예상 금액 ({quoteForm.rental_days}일):</span>
                                                    <span>{totalPrice.toLocaleString()}동</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 특별 요청사항 */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">특별 요청사항</label>
                                    <textarea
                                        value={quoteForm.special_requests}
                                        onChange={(e) => setQuoteForm({ ...quoteForm, special_requests: e.target.value })}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                                        placeholder="특별한 요청사항이 있으시면 입력해주세요..."
                                    />
                                </div>
                            </div>

                            {/* 제출 버튼 */}
                            <div className="flex justify-end space-x-4 mt-8">
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || selectedServices.length === 0}
                                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                                >
                                    {loading ? '저장 중...' : '견적 저장 후 예약 진행'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* 예약 진행 단계 */}
                    {currentStep === 'reservation' && quote && rentcarData && (
                        <div className="bg-white rounded-xl shadow-lg p-8">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6">🎯 2단계: 예약 진행</h2>

                            {/* 견적 정보 */}
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                                <h3 className="font-semibold text-purple-800 mb-2">✅ 견적이 성공적으로 저장되었습니다!</h3>
                                <div className="text-sm text-purple-700">
                                    <p>견적명: <span className="font-semibold">{quote.title}</span></p>
                                    <p>이제 예약 정보를 입력해주세요.</p>
                                </div>
                            </div>

                            {/* 선택된 서비스 정보 */}
                            <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                                <h4 className="text-sm font-medium text-purple-800 mb-3">🚗 선택된 렌터카 정보</h4>
                                <div className="space-y-2">
                                    {selectedServices.map((service, index) => (
                                        <div key={index} className="bg-white p-3 rounded border">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm">
                                                <span className="text-gray-600">차량: <span className="font-medium text-gray-800">{service.car_model}</span></span>
                                                <span className="text-gray-600">타입: <span className="font-medium text-gray-800">{service.vehicle_type}</span></span>
                                                <span className="text-gray-600">좌석: <span className="font-medium text-gray-800">{service.seats}인승</span></span>
                                                <span className="text-gray-600">가격: <span className="font-medium text-purple-600">{service.price?.toLocaleString()}동/일</span></span>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="bg-yellow-100 p-3 rounded border border-yellow-300">
                                        <div className="flex justify-between font-bold text-red-600">
                                            <span>총 예상 금액 ({quoteForm.rental_days}일):</span>
                                            <span>{totalPrice.toLocaleString()}동</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 예약 세부 정보 입력 */}
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">운전자 명단</label>
                                        <textarea
                                            value={reservationForm.driver_names}
                                            onChange={(e) => setReservationForm({ ...reservationForm, driver_names: e.target.value })}
                                            placeholder="운전자 이름을 입력하세요 (한 줄에 한 명씩)"
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">연락처</label>
                                        <input
                                            type="tel"
                                            value={reservationForm.contact_phone}
                                            onChange={(e) => setReservationForm({ ...reservationForm, contact_phone: e.target.value })}
                                            placeholder="비상 연락처를 입력하세요"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">인수 시간</label>
                                        <input
                                            type="time"
                                            value={reservationForm.pickup_time}
                                            onChange={(e) => setReservationForm({ ...reservationForm, pickup_time: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">🚗 렌터카 관련 요청사항</label>
                                    <textarea
                                        value={reservationForm.request_note}
                                        onChange={(e) => setReservationForm({ ...reservationForm, request_note: e.target.value })}
                                        placeholder="예) 차량 색상 선호, 내비게이션 언어 설정, 보험 추가 옵션, 운전자 추가 등"
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 resize-vertical"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        * 차량 인수, 보험, 운전자 관련 특별 요청사항을 입력해 주세요.
                                    </p>
                                </div>
                            </div>

                            {/* 예약 완료 버튼 */}
                            <div className="flex justify-end space-x-4 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep('quote')}
                                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    이전 단계
                                </button>
                                <button
                                    onClick={handleReservationSubmit}
                                    disabled={loading}
                                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                                >
                                    {loading ? '예약 중...' : '예약 완료'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function DirectBookingRentcarPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64">로딩 중...</div>}>
            <DirectBookingRentcarContent />
        </Suspense>
    );
}
