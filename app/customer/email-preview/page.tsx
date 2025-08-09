'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';

interface QuoteData {
    quote_id: string;
    title: string;
    user_name: string;
    user_email: string;
    user_phone: string;
    total_price: number;
    payment_status: string;
    created_at: string;
    reservations: any[];
}

function CustomerEmailPreviewClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const quoteId = searchParams.get('quote_id');
    const token = searchParams.get('token');

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

            const { data: quote, error: quoteError } = await supabase
                .from('quote')
                .select('*, users!quote_user_id_fkey(name, email, phone)')
                .eq('id', quoteId)
                .single();

            if (quoteError) {
                console.error('견적 조회 실패:', quoteError);
                setError('예약 정보를 찾을 수 없습니다.');
                return;
            }

            const user = quote.users;

            const { data: resList, error: resError } = await supabase
                .from('reservation')
                .select('*')
                .eq('re_quote_id', quoteId);

            if (resError) {
                console.error('예약 조회 실패:', resError);
            }

            setQuoteData({
                quote_id: quote.quote_id || quote.id,
                title: quote.title || '제목 없음',
                user_name: user?.name || '알 수 없음',
                user_email: user?.email || '',
                user_phone: user?.phone || '',
                total_price: quote.total_price || 0,
                payment_status: quote.payment_status || 'pending',
                created_at: quote.created_at,
                reservations: resList || []
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

    const openConfirmationPage = () => {
        const confirmationUrl = `/customer/confirmation?quote_id=${quoteId}&token=${token}`;
        window.open(confirmationUrl, '_blank');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">이메일을 준비하는 중...</p>
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
                    <p className="text-gray-600">{error || '예약 정보를 찾을 수 없습니다.'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            fontFamily: 'Arial, sans-serif'
        }}>
            <div className="container mx-auto py-8 px-4">
                <div className="max-w-2xl mx-auto bg-white rounded-xl overflow-hidden shadow-2xl">
                    {/* 이메일 헤더 */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white text-center py-12 px-8">
                        <h1 className="text-3xl font-bold mb-3">🌊 예약이 확정되었습니다! 🌊</h1>
                        <p className="text-lg opacity-90">베트남 하롱베이 크루즈 여행이 성공적으로 예약되었습니다</p>
                    </div>

                    {/* 이메일 본문 */}
                    <div className="p-8">
                        <div className="text-lg text-gray-700 mb-8 leading-relaxed">
                            안녕하세요, <strong className="text-blue-600">{quoteData.user_name}</strong>님!<br /><br />
                            스테이하롱 크루즈를 선택해 주셔서 진심으로 감사드립니다.
                            <strong>{quoteData.title}</strong> 예약이 성공적으로 완료되었으며,
                            아래와 같이 예약 상세 내역을 확인해 드립니다.
                        </div>

                        {/* 예약 정보 박스 */}
                        <div className="bg-gray-50 border-l-4 border-blue-500 p-6 mb-8 rounded-r-lg">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-gray-600">📝 예약번호</span>
                                    <span className="font-bold text-gray-900">{quoteData.quote_id}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-gray-600">📅 예약일시</span>
                                    <span className="text-gray-900">{formatDate(quoteData.created_at)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-gray-600">💳 결제상태</span>
                                    <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                                        ✅ 결제완료
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-gray-600">💰 총 결제금액</span>
                                    <span className="text-2xl font-bold text-red-600">{quoteData.total_price.toLocaleString()}동</span>
                                </div>
                            </div>
                        </div>

                        {/* 예약 서비스 목록 */}
                        <div className="mb-8">
                            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                                🎯 예약 서비스 내역
                            </h3>
                            <div className="space-y-3">
                                {quoteData.reservations.map((reservation, index) => (
                                    <div key={reservation.re_id} className="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-center">
                                        <div>
                                            <div className="font-semibold text-blue-600 text-lg">
                                                {index + 1}. {getServiceTypeName(reservation.re_type)}
                                            </div>
                                            <div className="text-sm text-gray-500 mt-1">
                                                예약ID: {reservation.re_id.slice(-8)} | 상태: {reservation.re_status === 'confirmed' ? '확정' : reservation.re_status}
                                            </div>
                                        </div>
                                        <div className="text-lg font-bold text-red-600">
                                            추후 안내
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 여행 준비사항 */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
                            <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                                📋 여행 준비사항
                            </h3>
                            <ul className="text-green-700 space-y-2">
                                <li className="flex items-start">
                                    <span className="text-green-600 mr-2">•</span>
                                    <span><strong>여권</strong>: 유효기간 6개월 이상 남은 여권 필수</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-green-600 mr-2">•</span>
                                    <span><strong>예약확인서</strong>: 본 이메일과 첨부된 PDF 파일 출력</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-green-600 mr-2">•</span>
                                    <span><strong>여행자보험</strong>: 안전한 여행을 위해 가입 권장</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-green-600 mr-2">•</span>
                                    <span><strong>개인준비물</strong>: 상비약, 세면용품, 편안한 복장</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-green-600 mr-2">•</span>
                                    <span><strong>중요</strong>: 출발 30분 전 집결 완료</span>
                                </li>
                            </ul>
                        </div>

                        {/* 긴급연락처 */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8 text-center">
                            <h3 className="text-lg font-semibold text-yellow-800 mb-4">🚨 긴급연락처 및 고객지원</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="text-center">
                                    <div className="font-semibold text-gray-700 mb-1">📞 고객센터</div>
                                    <div className="text-2xl font-bold text-blue-600 mb-1">1588-1234</div>
                                    <div className="text-sm text-gray-600">평일 09:00-18:00</div>
                                </div>
                                <div className="text-center">
                                    <div className="font-semibold text-gray-700 mb-1">🚨 24시간 긴급</div>
                                    <div className="text-2xl font-bold text-red-600 mb-1">010-9999-1234</div>
                                    <div className="text-sm text-gray-600">여행 중 응급상황</div>
                                </div>
                            </div>
                        </div>

                        {/* 상세 확인서 버튼 */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center mb-8">
                            <p className="text-blue-700 mb-4 font-medium">🌟 베트남 하롱베이에서 특별한 추억을 만들어보세요! 🌟</p>
                            <p className="text-sm text-gray-600 mb-6">
                                더 자세한 예약 정보는 아래 버튼을 클릭하여 상세 확인서를 확인해 주세요.
                            </p>
                            <button
                                onClick={openConfirmationPage}
                                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
                            >
                                <span>📄</span>
                                <span>상세 예약확인서 보기</span>
                            </button>
                        </div>
                    </div>

                    {/* 이메일 푸터 */}
                    <div className="bg-gray-100 text-center p-8 border-t">
                        <div className="text-xl font-bold text-blue-600 mb-3">🌊 스테이하롱 크루즈</div>
                        <div className="text-sm text-gray-600 space-y-1">
                            <div>📍 서울특별시 강남구 테헤란로 123, 크루즈타워 15층</div>
                            <div>📧 support@stayhalong.com | ☎️ 1588-1234 | 🌐 www.stayhalong.com</div>
                            <div className="text-gray-400 mt-3">© 2024 StayHalong Cruise. All rights reserved.</div>
                        </div>
                    </div>
                </div>

                {/* 이메일 하단 안내 */}
                <div className="max-w-2xl mx-auto mt-6 text-center">
                    <div className="bg-white bg-opacity-90 rounded-lg p-4 text-gray-700">
                        <p className="text-sm">
                            ℹ️ 이 이메일은 예약 확정 알림입니다.
                            문의사항이 있으시면 고객센터로 연락주시기 바랍니다.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export const dynamic = 'force-dynamic';

export default function CustomerEmailPreviewPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">페이지를 불러오는 중...</p>
                </div>
            </div>
        }>
            <CustomerEmailPreviewClient />
        </Suspense>
    );
}
