'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';
import Link from 'next/link';

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

export default function PaymentDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const quoteId = params.quote_id as string;

    const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (quoteId) {
            loadQuoteData();
        }
    }, [quoteId]);

    const loadQuoteData = async () => {
        try {
            setLoading(true);

            // 인증 확인
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                alert('로그인이 필요합니다.');
                router.push('/login');
                return;
            }

            // 견적 정보 조회
            const { data: quote, error: quoteError } = await supabase
                .from('quote')
                .select('*')
                .eq('quote_id', quoteId)
                .eq('user_id', user.id) // 본인 견적만 조회
                .single();

            if (quoteError) throw quoteError;

            // 사용자 정보 조회
            const { data: userData } = await supabase
                .from('users')
                .select('name, email, phone')
                .eq('id', user.id)
                .single();

            // 예약 정보 조회
            const { data: reservations } = await supabase
                .from('reservation')
                .select(`
          re_id,
          re_type,
          re_status,
          reservation_cruise (*),
          reservation_airport (*),
          reservation_hotel (*),
          reservation_rentcar (*),
          reservation_tour (*),
          reservation_car_sht (*)
        `)
                .eq('re_quote_id', quoteId);

            const processedReservations = reservations?.map(res => {
                let serviceDetails: any = {};
                let amount = 0;

                switch (res.re_type) {
                    case 'cruise':
                        serviceDetails = res.reservation_cruise?.[0] || {};
                        amount = (serviceDetails as any)?.room_total_price || 0;
                        break;
                    case 'airport':
                        serviceDetails = res.reservation_airport?.[0] || {};
                        amount = (serviceDetails as any)?.airport_total_price || 0;
                        break;
                    case 'hotel':
                        serviceDetails = res.reservation_hotel?.[0] || {};
                        amount = (serviceDetails as any)?.hotel_total_price || 0;
                        break;
                    case 'rentcar':
                        serviceDetails = res.reservation_rentcar?.[0] || {};
                        amount = (serviceDetails as any)?.car_total_price || 0;
                        break;
                    case 'tour':
                        serviceDetails = res.reservation_tour?.[0] || {};
                        amount = (serviceDetails as any)?.tour_total_price || 0;
                        break;
                    case 'car':
                        serviceDetails = res.reservation_car_sht?.[0] || {};
                        amount = (serviceDetails as any)?.vehicle_total_price || 0;
                        break;
                }

                return {
                    reservation_id: res.re_id,
                    service_type: res.re_type,
                    service_details: serviceDetails,
                    amount: amount,
                    status: res.re_status
                };
            }) || [];

            setQuoteData({
                quote_id: quote.quote_id,
                title: quote.title || '제목 없음',
                user_name: userData?.name || '알 수 없음',
                user_email: userData?.email || user.email,
                user_phone: userData?.phone || '',
                total_price: quote.total_price || 0,
                payment_status: quote.payment_status || 'pending',
                created_at: quote.created_at,
                reservations: processedReservations
            });

        } catch (error) {
            console.error('견적 데이터 로드 실패:', error);
            alert('견적 정보를 불러올 수 없습니다.');
            router.back();
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

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            paid: { label: '결제완료', color: 'bg-green-100 text-green-800' },
            pending: { label: '결제대기', color: 'bg-yellow-100 text-yellow-800' },
            processing: { label: '처리중', color: 'bg-blue-100 text-blue-800' },
            failed: { label: '결제실패', color: 'bg-red-100 text-red-800' }
        };
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
        return (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                {config.label}
            </span>
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <PageWrapper title="결제 상세">
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <p className="ml-4 text-gray-600">데이터를 불러오는 중...</p>
                </div>
            </PageWrapper>
        );
    }

    if (!quoteData) {
        return (
            <PageWrapper title="결제 상세">
                <div className="text-center py-12">
                    <div className="text-4xl mb-4">❌</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">견적을 찾을 수 없습니다</h3>
                    <Link
                        href="/mypage/payments"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        결제 목록으로
                    </Link>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper title="결제 상세">
            <div className="space-y-6">
                {/* 상단 컨트롤 */}
                <SectionBox title="결제 정보">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{quoteData.title}</h1>
                            <p className="text-sm text-gray-600">
                                견적 ID: {quoteData.quote_id} | 생성일: {formatDate(quoteData.created_at)}
                            </p>
                        </div>
                        <div className="flex items-center space-x-3">
                            {getStatusBadge(quoteData.payment_status)}
                            <div className="text-right">
                                <div className="text-sm text-gray-500">총 결제금액</div>
                                <div className="text-2xl font-bold text-blue-600">
                                    {quoteData.total_price.toLocaleString()}동
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex space-x-3">
                        <Link
                            href="/mypage/payments"
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                            ← 목록으로
                        </Link>
                        {quoteData.payment_status === 'pending' && (
                            <Link
                                href={`/mypage/payments/${quoteData.quote_id}/pay`}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                            >
                                💳 결제하기
                            </Link>
                        )}
                        {quoteData.payment_status === 'paid' && (
                            <Link
                                href={`/mypage/payments/${quoteData.quote_id}/receipt`}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                📄 영수증 보기
                            </Link>
                        )}
                    </div>
                </SectionBox>

                {/* 예약 상세 내역 */}
                <SectionBox title="예약 상세 내역">
                    <div className="space-y-4">
                        {quoteData.reservations.map((reservation, index) => (
                            <div key={reservation.reservation_id} className="bg-gray-50 rounded-lg p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            {index + 1}. {getServiceTypeName(reservation.service_type)}
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-500">예약 ID:</span>
                                                <div className="font-medium">{reservation.reservation_id}</div>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">상태:</span>
                                                <div className="font-medium">{reservation.status}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-gray-500">금액</div>
                                        <div className="text-xl font-bold text-blue-600">
                                            {reservation.amount.toLocaleString()}동
                                        </div>
                                    </div>
                                </div>

                                {/* 서비스별 상세 정보 */}
                                <div className="border-t pt-4">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">서비스 상세</h4>
                                    {reservation.service_type === 'cruise' && reservation.service_details && (
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-500">체크인:</span>
                                                <div className="font-medium">{(reservation.service_details as any).checkin}</div>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">인원:</span>
                                                <div className="font-medium">{(reservation.service_details as any).guest_count}명</div>
                                            </div>
                                        </div>
                                    )}
                                    {reservation.service_type === 'airport' && reservation.service_details && (
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-500">공항:</span>
                                                <div className="font-medium">{(reservation.service_details as any).ra_airport_location}</div>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">일시:</span>
                                                <div className="font-medium">{(reservation.service_details as any).ra_datetime}</div>
                                            </div>
                                        </div>
                                    )}
                                    {(!reservation.service_details || Object.keys(reservation.service_details).length === 0) && (
                                        <div className="text-sm text-gray-500">
                                            상세 정보가 없습니다.
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionBox>

                {/* 결제 안내 */}
                <SectionBox title="결제 안내">
                    <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">💡 결제 관련 안내</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• 결제는 신용카드, 계좌이체, 무통장입금이 가능합니다.</li>
                            <li>• 결제 완료 후 예약확인서가 이메일로 발송됩니다.</li>
                            <li>• 결제 취소는 여행 3일 전까지 가능합니다.</li>
                            <li>• 결제 관련 문의: 고객센터 1588-1234</li>
                        </ul>
                    </div>
                </SectionBox>
            </div>
        </PageWrapper>
    );
}
