'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';

interface ReservationDetail {
    reservation_id: string;
    service_type: string;
    service_details: any;
    amount: number;
    status: string;
}

interface QuoteData {
    quote_id: string;
    title: string;
    user_name: string;
    user_email: string;
    user_phone: string;
    total_price: number;
    payment_status: string;
    created_at: string;
    reservations: ReservationDetail[];
}

function CustomerConfirmationClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const quoteId = searchParams.get('quote_id');
    const token = searchParams.get('token'); // 보안을 위한 토큰

    const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (quoteId) {
            loadQuoteData();
        } else {
            setError('올바르지 않은 접근입니다.');
            setLoading(false);
        }
    }, [quoteId]);

    const loadQuoteData = async () => {
        try {
            setLoading(true);

            // 1. 기본 정보들을 병렬로 조회 (최적화됨)
            const [quoteResult, reservationsResult] = await Promise.all([
                // 견적 정보 조회 (id 필드로 조회)
                supabase
                    .from('quote')
                    .select('*')
                    .eq('id', quoteId)
                    .single(),

                // 예약 목록 조회
                supabase
                    .from('reservation')
                    .select('*')
                    .eq('re_quote_id', quoteId)
            ]);

            if (quoteResult.error || !quoteResult.data) {
                console.error('견적 조회 실패:', quoteResult.error);
                setError('예약 정보를 찾을 수 없습니다. 견적 번호를 확인해 주세요.');
                return;
            }

            const quote = quoteResult.data;
            const reservations = reservationsResult.data || [];

            // 2. 사용자 정보와 서비스 상세 정보를 병렬로 조회 (최적화됨)
            const reservationIds = reservations.map(r => r.re_id);

            const [
                userResult,
                cruiseResult,
                airportResult,
                hotelResult,
                rentcarResult,
                tourResult,
                carResult
            ] = await Promise.all([
                // 사용자 정보
                supabase
                    .from('users')
                    .select('name, email, phone')
                    .eq('id', quote.user_id)
                    .single(),

                // 서비스별 상세 정보 (예약 ID가 있는 경우만 조회)
                reservationIds.length > 0 ?
                    supabase.from('reservation_cruise').select('*').in('reservation_id', reservationIds) :
                    Promise.resolve({ data: [] }),

                reservationIds.length > 0 ?
                    supabase.from('reservation_airport').select('*').in('reservation_id', reservationIds) :
                    Promise.resolve({ data: [] }),

                reservationIds.length > 0 ?
                    supabase.from('reservation_hotel').select('*').in('reservation_id', reservationIds) :
                    Promise.resolve({ data: [] }),

                reservationIds.length > 0 ?
                    supabase.from('reservation_rentcar').select('*').in('reservation_id', reservationIds) :
                    Promise.resolve({ data: [] }),

                reservationIds.length > 0 ?
                    supabase.from('reservation_tour').select('*').in('reservation_id', reservationIds) :
                    Promise.resolve({ data: [] }),

                reservationIds.length > 0 ?
                    supabase.from('reservation_car_sht').select('*').in('reservation_id', reservationIds) :
                    Promise.resolve({ data: [] })
            ]);

            // 3. 데이터 매핑 및 최종 구성
            const user = userResult.data;

            // 서비스 상세 정보 맵 생성
            const serviceMap = new Map();
            cruiseResult.data?.forEach(item => serviceMap.set(item.reservation_id, item));
            airportResult.data?.forEach(item => serviceMap.set(item.reservation_id, item));
            hotelResult.data?.forEach(item => serviceMap.set(item.reservation_id, item));
            rentcarResult.data?.forEach(item => serviceMap.set(item.reservation_id, item));
            tourResult.data?.forEach(item => serviceMap.set(item.reservation_id, item));
            carResult.data?.forEach(item => serviceMap.set(item.reservation_id, item));

            // 금액 추출 함수 (실제 데이터 구조에 맞게 수정)
            const pickAmount = (type: string, detail: any): number => {
                if (!detail) return 0;

                // 실제 데이터 구조에 맞는 필드명 사용
                const amountFields = [
                    'room_total_price',    // 크루즈
                    'total_price',         // 공항 등
                    'unit_price',          // 단가
                    'price',
                    'amount'
                ];

                for (const field of amountFields) {
                    const value = detail[field];
                    if (typeof value === 'number' && !isNaN(value) && value > 0) {
                        return value;
                    }
                }
                return 0;
            };

            // 예약 상세 정보 구성
            const processedReservations: ReservationDetail[] = reservations.map(res => {
                const serviceDetail = serviceMap.get(res.re_id);
                return {
                    reservation_id: res.re_id,
                    service_type: res.re_type,
                    service_details: serviceDetail || {},
                    amount: pickAmount(res.re_type, serviceDetail),
                    status: res.re_status || 'pending'
                };
            });

            // 최종 데이터 설정
            setQuoteData({
                quote_id: quote.id, // 실제 데이터베이스 구조에 맞게 수정
                title: quote.title || '제목 없음',
                user_name: user?.name || '알 수 없음',
                user_email: user?.email || '',
                user_phone: user?.phone || '',
                total_price: quote.total_price || 0,
                payment_status: quote.payment_status || 'pending',
                created_at: quote.created_at,
                reservations: processedReservations
            });

        } catch (error) {
            console.error('견적 데이터 로드 실패:', error);
            setError('예약 정보를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const getServiceTypeName = (type: string) => {
        const typeNames = {
            cruise: '크루즈',
            airport: '공항 서비스',
            hotel: '호텔',
            rentcar: '렌터카',
            tour: '투어',
            car: '차량 서비스'
        };
        return typeNames[type as keyof typeof typeNames] || type;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const printConfirmation = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">예약 정보를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    if (error || !quoteData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-6">❌</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">접근 오류</h2>
                    <p className="text-gray-600 mb-6">{error || '예약 정보를 찾을 수 없습니다.'}</p>
                    <button
                        onClick={() => window.close()}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        창 닫기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 상단 고정 바 */}
            <div className="bg-white shadow-sm border-b sticky top-0 z-10 print:hidden">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="text-2xl">🌊</div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900">스테이하롱 크루즈</h1>
                                <p className="text-sm text-gray-600">예약확인서</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={printConfirmation}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                            >
                                <span>🖨️</span>
                                <span>인쇄하기</span>
                            </button>
                            <button
                                onClick={() => window.close()}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 확인서 본문 */}
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden print:shadow-none print:rounded-none">
                    <div className="p-8" style={{ fontFamily: 'Arial, sans-serif' }}>
                        {/* 헤더 */}
                        <div className="text-center mb-8 border-b-2 border-blue-600 pb-6">
                            <div className="flex justify-between items-center mb-4">
                                <div className="text-left">
                                    <div className="text-xs text-gray-500">RESERVATION CONFIRMATION</div>
                                    <div className="text-lg font-bold text-blue-600">스테이하롱 크루즈</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-500">확인서 번호</div>
                                    <div className="text-sm font-mono text-gray-700">{quoteData.quote_id.slice(-8).toUpperCase()}</div>
                                    <div className="text-xs text-gray-400 mt-1">발행일: {formatDate(new Date().toISOString())}</div>
                                </div>
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">🎯 예약 확인서</h1>
                            <p className="text-base text-gray-600">베트남 하롱베이 크루즈 여행 예약이 확정되었습니다</p>
                        </div>

                        {/* 고객 및 예약 정보 표 */}
                        <div className="mb-8">
                            <table className="w-full border border-gray-300">
                                <tbody>
                                    <tr className="bg-blue-50">
                                        <td className="border border-gray-300 px-4 py-3 font-semibold text-gray-700 w-1/4">예약자 정보</td>
                                        <td className="border border-gray-300 px-4 py-3 font-semibold text-gray-700 w-1/4">연락처 정보</td>
                                        <td className="border border-gray-300 px-4 py-3 font-semibold text-gray-700 w-1/4">예약 기본정보</td>
                                        <td className="border border-gray-300 px-4 py-3 font-semibold text-gray-700 w-1/4">결제 정보</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 px-4 py-3 align-top">
                                            <div className="space-y-2">
                                                <div><span className="text-gray-500 text-sm">성명:</span><br /><span className="font-semibold">{quoteData.user_name}</span></div>
                                            </div>
                                        </td>
                                        <td className="border border-gray-300 px-4 py-3 align-top">
                                            <div className="space-y-2">
                                                <div><span className="text-gray-500 text-sm">📧 이메일:</span><br /><span className="text-sm">{quoteData.user_email}</span></div>
                                                <div><span className="text-gray-500 text-sm">📞 연락처:</span><br /><span className="text-sm">{quoteData.user_phone}</span></div>
                                            </div>
                                        </td>
                                        <td className="border border-gray-300 px-4 py-3 align-top">
                                            <div className="space-y-2">
                                                <div><span className="text-gray-500 text-sm">예약번호:</span><br /><span className="font-mono text-sm">{quoteData.quote_id}</span></div>
                                                <div><span className="text-gray-500 text-sm">예약명:</span><br /><span className="font-medium text-sm">{quoteData.title}</span></div>
                                                <div><span className="text-gray-500 text-sm">예약일:</span><br /><span className="text-sm">{formatDate(quoteData.created_at)}</span></div>
                                            </div>
                                        </td>
                                        <td className="border border-gray-300 px-4 py-3 align-top">
                                            <div className="space-y-2">
                                                <div><span className="text-gray-500 text-sm">결제상태:</span><br /><span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">✅ 결제완료</span></div>
                                                <div><span className="text-gray-500 text-sm">총 금액:</span><br /><span className="text-lg font-bold text-blue-600">{quoteData.total_price.toLocaleString()}동</span></div>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* 예약 서비스 상세 표 */}
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <span className="w-1 h-6 bg-blue-600 mr-3"></span>
                                예약 서비스 상세 내역
                            </h3>
                            <table className="w-full border border-gray-300">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 px-3 py-3 text-left text-sm font-semibold text-gray-700">No.</th>
                                        <th className="border border-gray-300 px-3 py-3 text-left text-sm font-semibold text-gray-700">서비스 종류</th>
                                        <th className="border border-gray-300 px-3 py-3 text-left text-sm font-semibold text-gray-700">상세 정보</th>
                                        <th className="border border-gray-300 px-3 py-3 text-center text-sm font-semibold text-gray-700">금액</th>
                                        <th className="border border-gray-300 px-3 py-3 text-center text-sm font-semibold text-gray-700">상태</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {quoteData.reservations.map((reservation, index) => (
                                        <tr key={reservation.reservation_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                            <td className="border border-gray-300 px-3 py-4 text-center font-medium text-gray-700">
                                                {index + 1}
                                            </td>
                                            <td className="border border-gray-300 px-3 py-4">
                                                <div className="font-semibold text-gray-900 mb-1">
                                                    {getServiceTypeName(reservation.service_type)}
                                                </div>
                                                <div className="text-xs text-gray-500 font-mono">
                                                    ID: {reservation.reservation_id.slice(-8)}
                                                </div>
                                            </td>
                                            <td className="border border-gray-300 px-3 py-4">
                                                {reservation.service_type === 'cruise' && reservation.service_details && (
                                                    <div className="space-y-1 text-sm">
                                                        <div><span className="text-gray-500">체크인:</span> <span className="font-medium">{(reservation.service_details as any).checkin || '-'}</span></div>
                                                        <div><span className="text-gray-500">투숙인원:</span> <span className="font-medium">{(reservation.service_details as any).guest_count || 0}명</span></div>
                                                        <div><span className="text-gray-500">객실타입:</span> <span className="font-medium">{(reservation.service_details as any).room_type || '-'}</span></div>
                                                        <div><span className="text-gray-500">요청사항:</span> <span className="text-xs text-gray-600">{(reservation.service_details as any).request_note || '없음'}</span></div>
                                                    </div>
                                                )}
                                                {reservation.service_type === 'airport' && reservation.service_details && (
                                                    <div className="space-y-1 text-sm">
                                                        <div><span className="text-gray-500">공항:</span> <span className="font-medium">{(reservation.service_details as any).ra_airport_location || '-'}</span></div>
                                                        <div><span className="text-gray-500">일시:</span> <span className="font-medium">{(reservation.service_details as any).ra_datetime || '-'}</span></div>
                                                        <div><span className="text-gray-500">항공편:</span> <span className="font-medium">{(reservation.service_details as any).ra_flight_number || '-'}</span></div>
                                                        <div><span className="text-gray-500">인원:</span> <span className="font-medium">{(reservation.service_details as any).ra_passenger_count || 0}명</span></div>
                                                    </div>
                                                )}
                                                {reservation.service_type === 'hotel' && reservation.service_details && (
                                                    <div className="space-y-1 text-sm">
                                                        <div><span className="text-gray-500">체크인:</span> <span className="font-medium">{(reservation.service_details as any).checkin_date || '-'}</span></div>
                                                        <div><span className="text-gray-500">박수:</span> <span className="font-medium">{(reservation.service_details as any).nights || 0}박</span></div>
                                                        <div><span className="text-gray-500">투숙인원:</span> <span className="font-medium">{(reservation.service_details as any).guest_count || 0}명</span></div>
                                                        <div><span className="text-gray-500">호텔명:</span> <span className="font-medium">{(reservation.service_details as any).hotel_name || '-'}</span></div>
                                                    </div>
                                                )}
                                                {reservation.service_type === 'rentcar' && reservation.service_details && (
                                                    <div className="space-y-1 text-sm">
                                                        <div><span className="text-gray-500">픽업:</span> <span className="font-medium">{(reservation.service_details as any).pickup_datetime || (reservation.service_details as any).pickup_date || '-'}</span></div>
                                                        <div><span className="text-gray-500">대여일수:</span> <span className="font-medium">{(reservation.service_details as any).rental_days || 0}일</span></div>
                                                        <div><span className="text-gray-500">기사수:</span> <span className="font-medium">{(reservation.service_details as any).driver_count || 0}명</span></div>
                                                        <div><span className="text-gray-500">차량정보:</span> <span className="font-medium">{(reservation.service_details as any).car_type || '-'}</span></div>
                                                    </div>
                                                )}
                                                {reservation.service_type === 'tour' && reservation.service_details && (
                                                    <div className="space-y-1 text-sm">
                                                        <div><span className="text-gray-500">투어일:</span> <span className="font-medium">{(reservation.service_details as any).tour_date || '-'}</span></div>
                                                        <div><span className="text-gray-500">참가인원:</span> <span className="font-medium">{(reservation.service_details as any).participant_count || 0}명</span></div>
                                                        <div><span className="text-gray-500">투어명:</span> <span className="font-medium">{(reservation.service_details as any).tour_name || '-'}</span></div>
                                                        <div><span className="text-gray-500">픽업장소:</span> <span className="font-medium">{(reservation.service_details as any).pickup_location || '-'}</span></div>
                                                    </div>
                                                )}
                                                {reservation.service_type === 'car' && reservation.service_details && (
                                                    <div className="space-y-1 text-sm">
                                                        <div><span className="text-gray-500">차량번호:</span> <span className="font-medium">{(reservation.service_details as any).vehicle_number || '-'}</span></div>
                                                        <div><span className="text-gray-500">좌석수:</span> <span className="font-medium">{(reservation.service_details as any).seat_number || 0}석</span></div>
                                                        <div><span className="text-gray-500">색상:</span> <span className="font-medium">{(reservation.service_details as any).color_label || '-'}</span></div>
                                                        <div><span className="text-gray-500">기사:</span> <span className="font-medium">{(reservation.service_details as any).driver_name || '-'}</span></div>
                                                    </div>
                                                )}
                                                {!reservation.service_details && (
                                                    <div className="text-sm text-gray-400">상세 정보가 없습니다</div>
                                                )}
                                            </td>
                                            <td className="border border-gray-300 px-3 py-4 text-center">
                                                <div className="text-lg font-bold text-blue-600">
                                                    {reservation.amount.toLocaleString()}동
                                                </div>
                                            </td>
                                            <td className="border border-gray-300 px-3 py-4 text-center">
                                                <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${reservation.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                    reservation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {reservation.status === 'confirmed' ? '확정' :
                                                        reservation.status === 'pending' ? '대기' : reservation.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-blue-50">
                                        <td colSpan={3} className="border border-gray-300 px-3 py-4 text-right font-semibold text-gray-700">
                                            총 결제 금액
                                        </td>
                                        <td className="border border-gray-300 px-3 py-4 text-center">
                                            <div className="text-xl font-bold text-blue-600">
                                                {quoteData.total_price.toLocaleString()}동
                                            </div>
                                        </td>
                                        <td className="border border-gray-300 px-3 py-4 text-center">
                                            <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                                                결제완료
                                            </span>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* 여행 일정 및 중요 안내사항 */}
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <span className="w-1 h-6 bg-orange-500 mr-3"></span>
                                여행 준비사항 및 중요 안내
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                                        <span className="mr-2">📋</span>여행 준비물
                                    </h4>
                                    <ul className="text-sm text-blue-700 space-y-1">
                                        <li>• 여권 (유효기간 6개월 이상)</li>
                                        <li>• 본 예약확인서 출력본</li>
                                        <li>• 여행자보험 가입 권장</li>
                                        <li>• 개인 상비약 및 세면용품</li>
                                        <li>• 편안한 복장 및 운동화</li>
                                    </ul>
                                </div>
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <h4 className="font-semibold text-yellow-800 mb-3 flex items-center">
                                        <span className="mr-2">⚠️</span>주의사항
                                    </h4>
                                    <ul className="text-sm text-yellow-700 space-y-1">
                                        <li>• 여행 3일 전까지 변경/취소 가능</li>
                                        <li>• 날씨에 따라 일정 변경 가능</li>
                                        <li>• 출발 30분 전 집결 완료</li>
                                        <li>• 안전수칙 준수 필수</li>
                                        <li>• 귀중품 분실 주의</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* 긴급연락처 및 고객센터 */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <span className="w-1 h-6 bg-red-500 mr-3"></span>
                                긴급연락처 및 고객지원
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="text-center">
                                    <div className="text-2xl mb-2">📞</div>
                                    <div className="font-semibold text-gray-700">고객센터</div>
                                    <div className="text-sm text-gray-600">평일 09:00-18:00</div>
                                    <div className="font-mono text-blue-600">1588-1234</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl mb-2">🚨</div>
                                    <div className="font-semibold text-gray-700">24시간 긴급연락</div>
                                    <div className="text-sm text-gray-600">여행 중 응급상황</div>
                                    <div className="font-mono text-red-600">010-9999-1234</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl mb-2">📧</div>
                                    <div className="font-semibold text-gray-700">이메일 문의</div>
                                    <div className="text-sm text-gray-600">24시간 접수</div>
                                    <div className="text-blue-600">support@stayhalong.com</div>
                                </div>
                            </div>
                        </div>

                        {/* 푸터 */}
                        <div className="text-center text-sm text-gray-500 border-t-2 border-blue-600 pt-6">
                            <div className="mb-4">
                                <div className="text-lg font-bold text-blue-600 mb-2">🌊 스테이하롱 크루즈와 함께하는 특별한 여행 🌊</div>
                                <p className="text-gray-600">베트남 하롱베이에서 잊지 못할 추억을 만들어보세요!</p>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-4 text-center">
                                <div className="font-medium text-gray-700 mb-2">
                                    <span className="text-blue-600">🏢 스테이하롱 크루즈</span> |
                                    <span className="text-gray-600"> 베트남 전문 여행사</span>
                                </div>
                                <div className="text-xs text-gray-500 space-y-1">
                                    <div>📍 본사: 서울특별시 강남구 테헤란로 123, 크루즈타워 15층</div>
                                    <div>📧 support@stayhalong.com | ☎️ 1588-1234 | 🌐 www.stayhalong.com</div>
                                    <div>🕒 운영시간: 평일 09:00-18:00 (토요일 09:00-15:00, 일요일/공휴일 휴무)</div>
                                    <div className="text-gray-400 mt-2">© 2024 StayHalong Cruise. All rights reserved.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 감사 메시지 */}
            <div className="max-w-4xl mx-auto px-6 pb-6 print:hidden">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6 text-center">
                    <div className="text-3xl mb-3">🎉</div>
                    <h2 className="text-xl font-bold mb-2">예약해 주셔서 감사합니다!</h2>
                    <p className="opacity-90">스테이하롱 크루즈와 함께 특별한 하롱베이 여행을 즐기세요.</p>
                </div>
            </div>
        </div>
    );
}

export const dynamic = 'force-dynamic';

export default function CustomerConfirmationPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">페이지를 불러오는 중...</p>
                </div>
            </div>
        }>
            <CustomerConfirmationClient />
        </Suspense>
    );
}
