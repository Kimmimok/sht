'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '../../../../lib/supabase';
import { createQuote } from '../../../../lib/quoteUtils';

function DirectBookingTourContent() {
    const router = useRouter();

    // 현재 단계 상태 (quote → reservation)
    const [currentStep, setCurrentStep] = useState<'quote' | 'reservation'>('quote');
    const [quoteId, setQuoteId] = useState<string | null>(null);

    // 견적 폼 상태
    const [quoteForm, setQuoteForm] = useState({
        tour_date: '',
        participant_count: 2,
        tour_type: '',
        pickup_location: '',
        duration: '',
        language: 'korean',
        special_requests: ''
    });

    // 예약 폼 상태
    const [reservationForm, setReservationForm] = useState({
        request_note: '',
        participant_names: '',
        contact_phone: '',
        pickup_time: ''
    });

    // 옵션 데이터
    const [tourPriceOptions, setTourPriceOptions] = useState<any[]>([]);
    const [selectedServices, setSelectedServices] = useState<any[]>([]);

    // 로딩 상태
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [quote, setQuote] = useState<any>(null);

    // 예약 관련 상태
    const [tourData, setTourData] = useState<any>(null);

    useEffect(() => {
        // 사용자 인증 확인
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) {
                router.push('/login');
            } else {
                setUser(user);
                loadTourPriceOptions();
            }
        });
    }, [router]);

    // 투어 가격 옵션 로드
    const loadTourPriceOptions = async () => {
        try {
            const { data, error } = await supabase
                .from('tour_price')
                .select('*')
                .order('tour_category, tour_name');

            if (error) throw error;

            setTourPriceOptions(data || []);
            console.log('투어 서비스 옵션 로드됨:', data?.length);
        } catch (error) {
            console.error('투어 서비스 옵션 조회 실패:', error);
        }
    };

    // 서비스 선택/해제
    const toggleService = (service: any) => {
        setSelectedServices(prev => {
            const isSelected = prev.some(s => s.tour_code === service.tour_code);
            if (isSelected) {
                return prev.filter(s => s.tour_code !== service.tour_code);
            } else {
                return [...prev, service];
            }
        });
    };

    // 카테고리별 투어 분류
    const getServicesByCategory = () => {
        const categories: { [key: string]: any[] } = {};
        tourPriceOptions.forEach(service => {
            const category = service.tour_category || '기타';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(service);
        });
        return categories;
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
                alert('최소 하나의 투어를 선택해주세요.');
                return;
            }

            // 견적 생성
            const newQuote = await createQuote(user.id, `투어 예약 직접예약 ${new Date().toLocaleDateString()}`);
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

            // 투어 서비스 데이터 저장
            const { data: tourData, error: tourError } = await supabase
                .from('tour')
                .insert({
                    tour_code: mainService.tour_code,
                    tour_date: quoteForm.tour_date,
                    participant_count: quoteForm.participant_count,
                    pickup_location: quoteForm.pickup_location,
                    language: quoteForm.language
                })
                .select()
                .single();

            if (tourError) throw tourError;

            // quote_item에 연결
            const { error: itemError } = await supabase
                .from('quote_item')
                .insert({
                    quote_id: newQuote.id,
                    service_type: 'tour',
                    service_ref_id: tourData.id,
                    quantity: quoteForm.participant_count,
                    unit_price: mainService.price,
                    total_price: mainService.price * quoteForm.participant_count,
                    usage_date: quoteForm.tour_date
                });

            if (itemError) throw itemError;

            // 투어 데이터 설정
            setTourData({
                ...tourData,
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

            if (!user || !quoteId || !tourData) {
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
                    re_type: 'tour',
                    re_status: 'pending',
                    re_created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (reservationError) throw reservationError;

            // 추가 서비스 정보를 request_note에 포함
            const additionalServicesNote = selectedServices
                .filter(service => service.tour_code !== tourData.priceInfo.tour_code)
                .map(service => `추가 투어: ${service.tour_name} - ${service.tour_category} (${service.price?.toLocaleString()}동/명)`)
                .join('\n');

            const fullRequestNote = [
                reservationForm.request_note,
                additionalServicesNote
            ].filter(Boolean).join('\n');

            // 투어 예약 저장
            const tourReservationData = {
                reservation_id: newReservation.re_id,
                tour_price_code: tourData.priceInfo.tour_code,
                tour_date: quoteForm.tour_date,
                tour_capacity: quoteForm.participant_count,
                pickup_location: quoteForm.pickup_location,
                participant_names: reservationForm.participant_names || null,
                request_note: fullRequestNote || null
            };

            const { error: tourError } = await supabase
                .from('reservation_tour')
                .insert(tourReservationData);

            if (tourError) throw tourError;

            alert('예약이 성공적으로 완료되었습니다!');
            router.push('/mypage/direct-booking?completed=tour');

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

    const servicesByCategory = getServicesByCategory();
    const totalPrice = selectedServices.reduce((sum, service) => sum + (service.price || 0) * quoteForm.participant_count, 0);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 헤더 */}
            <div className="bg-gradient-to-br from-orange-200 via-amber-200 to-yellow-100 text-gray-900">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">🗺️ 투어 예약 직접 예약</h1>
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
                            <div className={`flex items-center space-x-2 ${currentStep === 'quote' ? 'text-orange-600 font-semibold' : 'text-orange-600'}`}>
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${currentStep === 'quote' ? 'bg-orange-500' : 'bg-orange-500'}`}>
                                    {currentStep === 'quote' ? '1' : '✓'}
                                </span>
                                <span>견적 작성</span>
                            </div>
                            <div className="flex-1 h-1 bg-gray-300 rounded">
                                <div className={`h-full bg-orange-500 rounded transition-all duration-500 ${currentStep === 'reservation' ? 'w-full' : 'w-0'}`}></div>
                            </div>
                            <div className={`flex items-center space-x-2 ${currentStep === 'reservation' ? 'text-orange-600 font-semibold' : 'text-gray-400'}`}>
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${currentStep === 'reservation' ? 'bg-orange-500' : 'bg-gray-400'}`}>
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

                            {/* 투어 예약 안내 카드 */}
                            <div className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-lg p-6 mb-6">
                                <h3 className="text-white text-lg font-semibold mb-2">🗺️ 투어 예약 안내</h3>
                                <p className="text-white/90 text-sm">
                                    다양한 관광지와 체험 투어를 선택하여 특별한 여행을 계획하세요.<br />
                                    여러 투어를 조합하여 선택할 수 있습니다.
                                </p>
                            </div>

                            {/* 기본 정보 */}
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">📅 투어 날짜</label>
                                        <input
                                            type="date"
                                            value={quoteForm.tour_date}
                                            onChange={e => setQuoteForm({ ...quoteForm, tour_date: e.target.value })}
                                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">👥 참가자 수</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={quoteForm.participant_count}
                                            onChange={e => setQuoteForm({ ...quoteForm, participant_count: parseInt(e.target.value) || 1 })}
                                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">📍 픽업 장소</label>
                                        <input
                                            type="text"
                                            value={quoteForm.pickup_location}
                                            onChange={e => setQuoteForm({ ...quoteForm, pickup_location: e.target.value })}
                                            placeholder="예: 호텔명, 주소, 랜드마크"
                                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">🗣️ 언어</label>
                                        <select
                                            value={quoteForm.language}
                                            onChange={e => setQuoteForm({ ...quoteForm, language: e.target.value })}
                                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        >
                                            <option value="korean">한국어</option>
                                            <option value="english">영어</option>
                                            <option value="vietnamese">베트남어</option>
                                            <option value="chinese">중국어</option>
                                        </select>
                                    </div>
                                </div>

                                {/* 투어 선택 영역 */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-800">🎯 투어 선택</h3>

                                    {Object.entries(servicesByCategory).map(([category, services]) => (
                                        <div key={category} className="space-y-3">
                                            <h4 className="text-md font-medium text-orange-700 border-l-4 border-orange-500 pl-3">
                                                {category}
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {services.map((service) => (
                                                    <div
                                                        key={service.tour_code}
                                                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedServices.some(s => s.tour_code === service.tour_code)
                                                                ? 'border-orange-500 bg-orange-50'
                                                                : 'border-gray-200 bg-white hover:border-orange-300'
                                                            }`}
                                                        onClick={() => toggleService(service)}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="font-medium">{service.tour_name}</span>
                                                            <span className="text-orange-600 font-bold">{service.price?.toLocaleString()}동/명</span>
                                                        </div>
                                                        <div className="text-sm text-gray-600">
                                                            <div>소요시간: {service.duration}</div>
                                                            <div>특징: {service.highlights}</div>
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
                                        <h4 className="text-md font-medium text-yellow-800 mb-2">✅ 선택된 투어</h4>
                                        <div className="space-y-2">
                                            {selectedServices.map((service, index) => (
                                                <div key={index} className="flex justify-between text-sm">
                                                    <span>{service.tour_name} - {service.tour_category}</span>
                                                    <span className="font-medium">{(service.price * quoteForm.participant_count)?.toLocaleString()}동</span>
                                                </div>
                                            ))}
                                            <div className="border-t border-yellow-300 pt-2 mt-2">
                                                <div className="flex justify-between font-bold text-red-600">
                                                    <span>총 예상 금액 ({quoteForm.participant_count}명):</span>
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
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
                                    className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
                                >
                                    {loading ? '저장 중...' : '견적 저장 후 예약 진행'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* 예약 진행 단계 */}
                    {currentStep === 'reservation' && quote && tourData && (
                        <div className="bg-white rounded-xl shadow-lg p-8">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6">🎯 2단계: 예약 진행</h2>

                            {/* 견적 정보 */}
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                                <h3 className="font-semibold text-orange-800 mb-2">✅ 견적이 성공적으로 저장되었습니다!</h3>
                                <div className="text-sm text-orange-700">
                                    <p>견적명: <span className="font-semibold">{quote.title}</span></p>
                                    <p>이제 예약 정보를 입력해주세요.</p>
                                </div>
                            </div>

                            {/* 선택된 서비스 정보 */}
                            <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                                <h4 className="text-sm font-medium text-orange-800 mb-3">🗺️ 선택된 투어 정보</h4>
                                <div className="space-y-2">
                                    {selectedServices.map((service, index) => (
                                        <div key={index} className="bg-white p-3 rounded border">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm">
                                                <span className="text-gray-600">투어: <span className="font-medium text-gray-800">{service.tour_name}</span></span>
                                                <span className="text-gray-600">카테고리: <span className="font-medium text-gray-800">{service.tour_category}</span></span>
                                                <span className="text-gray-600">소요시간: <span className="font-medium text-gray-800">{service.duration}</span></span>
                                                <span className="text-gray-600">가격: <span className="font-medium text-orange-600">{service.price?.toLocaleString()}동/명</span></span>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="bg-yellow-100 p-3 rounded border border-yellow-300">
                                        <div className="flex justify-between font-bold text-red-600">
                                            <span>총 예상 금액 ({quoteForm.participant_count}명):</span>
                                            <span>{totalPrice.toLocaleString()}동</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 예약 세부 정보 입력 */}
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">참가자 명단</label>
                                        <textarea
                                            value={reservationForm.participant_names}
                                            onChange={(e) => setReservationForm({ ...reservationForm, participant_names: e.target.value })}
                                            placeholder="참가자 이름을 입력하세요 (한 줄에 한 명씩)"
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">연락처</label>
                                        <input
                                            type="tel"
                                            value={reservationForm.contact_phone}
                                            onChange={(e) => setReservationForm({ ...reservationForm, contact_phone: e.target.value })}
                                            placeholder="비상 연락처를 입력하세요"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">픽업 시간</label>
                                        <input
                                            type="time"
                                            value={reservationForm.pickup_time}
                                            onChange={(e) => setReservationForm({ ...reservationForm, pickup_time: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">🗺️ 투어 관련 요청사항</label>
                                    <textarea
                                        value={reservationForm.request_note}
                                        onChange={(e) => setReservationForm({ ...reservationForm, request_note: e.target.value })}
                                        placeholder="예) 특정 관광지 추가 요청, 식사 선호도, 이동 편의사항, 포토 서비스 등"
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 resize-vertical"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        * 투어 일정, 식사, 가이드 관련 특별 요청사항을 입력해 주세요.
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
                                    className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
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

export default function DirectBookingTourPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64">로딩 중...</div>}>
            <DirectBookingTourContent />
        </Suspense>
    );
}
