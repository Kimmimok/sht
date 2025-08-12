'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '../../../../lib/supabase';
import { createQuote } from '../../../../lib/quoteUtils';

function DirectBookingHotelContent() {
    const router = useRouter();

    // 현재 단계 상태 (quote → reservation)
    const [currentStep, setCurrentStep] = useState<'quote' | 'reservation'>('quote');
    const [quoteId, setQuoteId] = useState<string | null>(null);

    // 견적 폼 상태
    const [quoteForm, setQuoteForm] = useState({
        checkin_date: '',
        checkout_date: '',
        nights: 1,
        room_count: 1,
        guest_count: 2,
        hotel_location: '',
        room_type: '',
        special_requests: ''
    });

    // 예약 폼 상태
    const [reservationForm, setReservationForm] = useState({
        request_note: '',
        guest_names: '',
        contact_phone: '',
        arrival_time: ''
    });

    // 옵션 데이터
    const [hotelPriceOptions, setHotelPriceOptions] = useState<any[]>([]);
    const [selectedServices, setSelectedServices] = useState<any[]>([]);

    // 로딩 상태
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [quote, setQuote] = useState<any>(null);

    // 예약 관련 상태
    const [hotelData, setHotelData] = useState<any>(null);

    useEffect(() => {
        // 사용자 인증 확인
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) {
                router.push('/login');
            } else {
                setUser(user);
                loadHotelPriceOptions();
            }
        });
    }, [router]);

    // 체크아웃 날짜 자동 계산
    useEffect(() => {
        if (quoteForm.checkin_date && quoteForm.nights > 0) {
            const checkinDate = new Date(quoteForm.checkin_date);
            const checkoutDate = new Date(checkinDate);
            checkoutDate.setDate(checkinDate.getDate() + quoteForm.nights);
            setQuoteForm(prev => ({
                ...prev,
                checkout_date: checkoutDate.toISOString().split('T')[0]
            }));
        }
    }, [quoteForm.checkin_date, quoteForm.nights]);

    // 호텔 가격 옵션 로드
    const loadHotelPriceOptions = async () => {
        try {
            const { data, error } = await supabase
                .from('hotel_price')
                .select('*')
                .order('hotel_name, room_type');

            if (error) throw error;

            setHotelPriceOptions(data || []);
            console.log('호텔 서비스 옵션 로드됨:', data?.length);
        } catch (error) {
            console.error('호텔 서비스 옵션 조회 실패:', error);
        }
    };

    // 서비스 선택/해제
    const toggleService = (service: any) => {
        setSelectedServices(prev => {
            const isSelected = prev.some(s => s.hotel_code === service.hotel_code);
            if (isSelected) {
                return prev.filter(s => s.hotel_code !== service.hotel_code);
            } else {
                return [...prev, service];
            }
        });
    };

    // 호텔별 서비스 분류
    const getServicesByHotel = () => {
        const hotels: { [key: string]: any[] } = {};
        hotelPriceOptions.forEach(service => {
            const hotelName = service.hotel_name || '기타';
            if (!hotels[hotelName]) {
                hotels[hotelName] = [];
            }
            hotels[hotelName].push(service);
        });
        return hotels;
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
                alert('최소 하나의 호텔을 선택해주세요.');
                return;
            }

            // 견적 생성
            const newQuote = await createQuote(user.id, `호텔 예약 직접예약 ${new Date().toLocaleDateString()}`);
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

            // 호텔 서비스 데이터 저장
            const { data: hotelData, error: hotelError } = await supabase
                .from('hotel')
                .insert({
                    hotel_code: mainService.hotel_code,
                    checkin_date: quoteForm.checkin_date,
                    checkout_date: quoteForm.checkout_date,
                    nights: quoteForm.nights,
                    room_count: quoteForm.room_count,
                    guest_count: quoteForm.guest_count
                })
                .select()
                .single();

            if (hotelError) throw hotelError;

            // quote_item에 연결
            const { error: itemError } = await supabase
                .from('quote_item')
                .insert({
                    quote_id: newQuote.id,
                    service_type: 'hotel',
                    service_ref_id: hotelData.id,
                    quantity: quoteForm.room_count,
                    unit_price: mainService.price,
                    total_price: mainService.price * quoteForm.room_count * quoteForm.nights,
                    usage_date: quoteForm.checkin_date
                });

            if (itemError) throw itemError;

            // 호텔 데이터 설정
            setHotelData({
                ...hotelData,
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

            if (!user || !quoteId || !hotelData) {
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
                    re_type: 'hotel',
                    re_status: 'pending',
                    re_created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (reservationError) throw reservationError;

            // 추가 서비스 정보를 request_note에 포함
            const additionalServicesNote = selectedServices
                .filter(service => service.hotel_code !== hotelData.priceInfo.hotel_code)
                .map(service => `추가 호텔: ${service.hotel_name} - ${service.room_type} (${service.price?.toLocaleString()}동/박)`)
                .join('\n');

            const fullRequestNote = [
                reservationForm.request_note,
                additionalServicesNote
            ].filter(Boolean).join('\n');

            // 호텔 예약 저장
            const hotelReservationData = {
                reservation_id: newReservation.re_id,
                hotel_price_code: hotelData.priceInfo.hotel_code,
                checkin_date: quoteForm.checkin_date,
                checkout_date: quoteForm.checkout_date,
                nights: quoteForm.nights,
                room_count: quoteForm.room_count,
                guest_count: quoteForm.guest_count,
                guest_names: reservationForm.guest_names || null,
                request_note: fullRequestNote || null
            };

            const { error: hotelError } = await supabase
                .from('reservation_hotel')
                .insert(hotelReservationData);

            if (hotelError) throw hotelError;

            alert('예약이 성공적으로 완료되었습니다!');
            router.push('/mypage/direct-booking?completed=hotel');

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

    const servicesByHotel = getServicesByHotel();
    const totalPrice = selectedServices.reduce((sum, service) => sum + (service.price || 0) * quoteForm.room_count * quoteForm.nights, 0);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 헤더 */}
            <div className="bg-gradient-to-br from-emerald-200 via-green-200 to-teal-100 text-gray-900">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">🏨 호텔 예약 직접 예약</h1>
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
                            <div className={`flex items-center space-x-2 ${currentStep === 'quote' ? 'text-green-600 font-semibold' : 'text-green-600'}`}>
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${currentStep === 'quote' ? 'bg-green-500' : 'bg-green-500'}`}>
                                    {currentStep === 'quote' ? '1' : '✓'}
                                </span>
                                <span>견적 작성</span>
                            </div>
                            <div className="flex-1 h-1 bg-gray-300 rounded">
                                <div className={`h-full bg-green-500 rounded transition-all duration-500 ${currentStep === 'reservation' ? 'w-full' : 'w-0'}`}></div>
                            </div>
                            <div className={`flex items-center space-x-2 ${currentStep === 'reservation' ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${currentStep === 'reservation' ? 'bg-green-500' : 'bg-gray-400'}`}>
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

                            {/* 호텔 예약 안내 카드 */}
                            <div className="bg-gradient-to-r from-emerald-600 to-green-600 rounded-lg p-6 mb-6">
                                <h3 className="text-white text-lg font-semibold mb-2">🏨 호텔 예약 안내</h3>
                                <p className="text-white/90 text-sm">
                                    다양한 호텔과 객실 타입을 선택하여 편안한 숙박을 예약하세요.<br />
                                    여러 호텔을 조합하여 선택할 수 있습니다.
                                </p>
                            </div>

                            {/* 기본 정보 */}
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">📅 체크인 날짜</label>
                                        <input
                                            type="date"
                                            value={quoteForm.checkin_date}
                                            onChange={e => setQuoteForm({ ...quoteForm, checkin_date: e.target.value })}
                                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">🌙 숙박 일수</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={quoteForm.nights}
                                            onChange={e => setQuoteForm({ ...quoteForm, nights: parseInt(e.target.value) || 1 })}
                                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">📅 체크아웃 날짜</label>
                                        <input
                                            type="date"
                                            value={quoteForm.checkout_date}
                                            readOnly
                                            className="w-full border border-gray-300 p-3 rounded-lg bg-gray-100 text-gray-600"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">🏠 객실 수</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={quoteForm.room_count}
                                            onChange={e => setQuoteForm({ ...quoteForm, room_count: parseInt(e.target.value) || 1 })}
                                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">👥 투숙객 수</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={quoteForm.guest_count}
                                            onChange={e => setQuoteForm({ ...quoteForm, guest_count: parseInt(e.target.value) || 1 })}
                                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">📍 호텔 지역</label>
                                        <input
                                            type="text"
                                            value={quoteForm.hotel_location}
                                            onChange={e => setQuoteForm({ ...quoteForm, hotel_location: e.target.value })}
                                            placeholder="예: 하노이 올드쿼터, 호치민 1군"
                                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        />
                                    </div>
                                </div>

                                {/* 호텔 선택 영역 */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-800">🏨 호텔 선택</h3>

                                    {Object.entries(servicesByHotel).map(([hotelName, services]) => (
                                        <div key={hotelName} className="space-y-3">
                                            <h4 className="text-md font-medium text-green-700 border-l-4 border-green-500 pl-3">
                                                {hotelName}
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {services.map((service) => (
                                                    <div
                                                        key={service.hotel_code}
                                                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedServices.some(s => s.hotel_code === service.hotel_code)
                                                                ? 'border-green-500 bg-green-50'
                                                                : 'border-gray-200 bg-white hover:border-green-300'
                                                            }`}
                                                        onClick={() => toggleService(service)}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="font-medium">{service.room_type}</span>
                                                            <span className="text-green-600 font-bold">{service.price?.toLocaleString()}동/박</span>
                                                        </div>
                                                        <div className="text-sm text-gray-600">
                                                            <div>위치: {service.location}</div>
                                                            <div>특징: {service.facilities}</div>
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
                                        <h4 className="text-md font-medium text-yellow-800 mb-2">✅ 선택된 호텔</h4>
                                        <div className="space-y-2">
                                            {selectedServices.map((service, index) => (
                                                <div key={index} className="flex justify-between text-sm">
                                                    <span>{service.hotel_name} - {service.room_type}</span>
                                                    <span className="font-medium">{(service.price * quoteForm.room_count * quoteForm.nights)?.toLocaleString()}동</span>
                                                </div>
                                            ))}
                                            <div className="border-t border-yellow-300 pt-2 mt-2">
                                                <div className="flex justify-between font-bold text-red-600">
                                                    <span>총 예상 금액:</span>
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500"
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
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                                >
                                    {loading ? '저장 중...' : '견적 저장 후 예약 진행'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* 예약 진행 단계 */}
                    {currentStep === 'reservation' && quote && hotelData && (
                        <div className="bg-white rounded-xl shadow-lg p-8">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6">🎯 2단계: 예약 진행</h2>

                            {/* 견적 정보 */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                                <h3 className="font-semibold text-green-800 mb-2">✅ 견적이 성공적으로 저장되었습니다!</h3>
                                <div className="text-sm text-green-700">
                                    <p>견적명: <span className="font-semibold">{quote.title}</span></p>
                                    <p>이제 예약 정보를 입력해주세요.</p>
                                </div>
                            </div>

                            {/* 선택된 서비스 정보 */}
                            <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                                <h4 className="text-sm font-medium text-green-800 mb-3">🏨 선택된 호텔 정보</h4>
                                <div className="space-y-2">
                                    {selectedServices.map((service, index) => (
                                        <div key={index} className="bg-white p-3 rounded border">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm">
                                                <span className="text-gray-600">호텔: <span className="font-medium text-gray-800">{service.hotel_name}</span></span>
                                                <span className="text-gray-600">객실: <span className="font-medium text-gray-800">{service.room_type}</span></span>
                                                <span className="text-gray-600">위치: <span className="font-medium text-gray-800">{service.location}</span></span>
                                                <span className="text-gray-600">가격: <span className="font-medium text-green-600">{service.price?.toLocaleString()}동/박</span></span>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="bg-yellow-100 p-3 rounded border border-yellow-300">
                                        <div className="flex justify-between font-bold text-red-600">
                                            <span>총 예상 금액 ({quoteForm.room_count}실 × {quoteForm.nights}박):</span>
                                            <span>{totalPrice.toLocaleString()}동</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 예약 세부 정보 입력 */}
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">투숙객 명단</label>
                                        <textarea
                                            value={reservationForm.guest_names}
                                            onChange={(e) => setReservationForm({ ...reservationForm, guest_names: e.target.value })}
                                            placeholder="투숙객 이름을 입력하세요 (한 줄에 한 명씩)"
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">연락처</label>
                                        <input
                                            type="tel"
                                            value={reservationForm.contact_phone}
                                            onChange={(e) => setReservationForm({ ...reservationForm, contact_phone: e.target.value })}
                                            placeholder="비상 연락처를 입력하세요"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">예상 도착 시간</label>
                                        <input
                                            type="time"
                                            value={reservationForm.arrival_time}
                                            onChange={(e) => setReservationForm({ ...reservationForm, arrival_time: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">🏨 호텔 관련 요청사항</label>
                                    <textarea
                                        value={reservationForm.request_note}
                                        onChange={(e) => setReservationForm({ ...reservationForm, request_note: e.target.value })}
                                        placeholder="예) 높은 층 객실 선호, 금연실 요청, 어메니티 추가, 조식 포함 여부 등"
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-vertical"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        * 객실 배정, 부대시설 이용, 특별 서비스 관련 요청사항을 입력해 주세요.
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
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
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

export default function DirectBookingHotelPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64">로딩 중...</div>}>
            <DirectBookingHotelContent />
        </Suspense>
    );
}
