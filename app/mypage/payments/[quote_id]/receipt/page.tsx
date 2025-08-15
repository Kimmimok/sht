'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';
import Link from 'next/link';

interface QuoteData {
    quote_id: string;
    title: string;
    user_name: string;
    user_email: string;
    user_phone: string;
    total_price: number;
    payment_status: string;
    payment_method: string;
    payment_date: string;
    created_at: string;
    reservations: any[];
}

export default function PaymentReceiptPage() {
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
                .eq('user_id', user.id)
                .single();

            if (quoteError) throw quoteError;

            // 결제되지 않은 경우
            if (quote.payment_status !== 'paid') {
                alert('결제가 완료되지 않은 견적입니다.');
                router.push(`/mypage/payments/${quoteId}/details`);
                return;
            }

            // 사용자 정보 조회
            const { data: userData } = await supabase
                .from('users')
                .select('name, email, phone')
                .eq('id', user.id)
                .single();

            // 예약 정보 조회
            const { data: reservations } = await supabase
                .from('reservation')
                .select('re_id, re_type, re_status')
                .eq('re_quote_id', quoteId);

            setQuoteData({
                quote_id: quote.quote_id,
                title: quote.title || '제목 없음',
                user_name: userData?.name || '알 수 없음',
                user_email: userData?.email || user.email,
                user_phone: userData?.phone || '',
                total_price: quote.total_price || 0,
                payment_status: quote.payment_status || 'paid',
                payment_method: quote.payment_method || '신용카드',
                payment_date: quote.payment_date || quote.updated_at || quote.created_at,
                created_at: quote.created_at,
                reservations: reservations || []
            });

        } catch (error) {
            console.error('견적 데이터 로드 실패:', error);
            alert('견적 정보를 불러올 수 없습니다.');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const getPaymentMethodName = (method: string) => {
        const methods = {
            card: '신용카드',
            transfer: '계좌이체',
            deposit: '무통장입금'
        };
        return methods[method as keyof typeof methods] || method;
    };

    const printReceipt = () => {
        const printContent = document.getElementById('receipt-content');
        const windowPrint = window.open('', '', 'width=800,height=600');

        if (windowPrint && printContent) {
            windowPrint.document.write(`
        <html>
          <head>
            <title>결제 영수증</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .text-center { text-align: center; }
              .font-bold { font-weight: bold; }
              .mb-4 { margin-bottom: 1rem; }
              .border-b { border-bottom: 1px solid #ccc; padding-bottom: 0.5rem; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
              .space-y-2 > * { margin-bottom: 0.5rem; }
              .bg-gray-50 { background-color: #f9f9f9; padding: 1rem; border-radius: 0.5rem; }
              .text-blue-600 { color: #2563eb; }
              .text-gray-600 { color: #4b5563; }
              .text-green-600 { color: #16a34a; }
              .border-t { border-top: 1px solid #ccc; padding-top: 1rem; margin-top: 1rem; }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
            windowPrint.document.close();
            windowPrint.print();
            windowPrint.close();
        }
    };

    const downloadPdf = async () => {
        if (!quoteData) return;

        try {
            // html2pdf 동적 임포트
            const html2pdf = (await import('html2pdf.js')).default;

            const element = document.getElementById('receipt-content');
            const opt = {
                margin: 1,
                filename: `결제영수증_${quoteData.quote_id}_${quoteData.user_name}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
            };

            await html2pdf().set(opt).from(element).save();

        } catch (error) {
            console.error('PDF 생성 실패:', error);
            alert('PDF 생성에 실패했습니다.');
        }
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
            <PageWrapper title="결제 영수증">
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <p className="ml-4 text-gray-600">데이터를 불러오는 중...</p>
                </div>
            </PageWrapper>
        );
    }

    if (!quoteData) {
        return (
            <PageWrapper title="결제 영수증">
                <div className="text-center py-12">
                    <div className="text-4xl mb-4">❌</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">영수증을 찾을 수 없습니다</h3>
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
        <PageWrapper title="결제 영수증">
            <div className="space-y-6">
                {/* 상단 컨트롤 */}
                <SectionBox title="결제 완료">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <span className="text-2xl">✅</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-green-600">결제가 완료되었습니다!</h1>
                                <p className="text-sm text-gray-600">
                                    결제 완료일: {formatDate(quoteData.payment_date)}
                                </p>
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            <Link
                                href="/mypage/payments"
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            >
                                목록으로
                            </Link>
                            <button
                                onClick={printReceipt}
                                className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50"
                            >
                                🖨️ 인쇄
                            </button>
                            <button
                                onClick={downloadPdf}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                📄 PDF 다운로드
                            </button>
                        </div>
                    </div>
                </SectionBox>

                {/* 영수증 내용 */}
                <div className="bg-white rounded-lg shadow-sm">
                    <div id="receipt-content" className="p-8">
                        {/* 헤더 */}
                        <div className="text-center mb-8 border-b pb-6">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">결제 영수증</h1>
                            <p className="text-xl text-blue-600 font-semibold">스테이하롱 크루즈</p>
                            <p className="text-sm text-gray-500 mt-2">Payment Receipt</p>
                            <p className="text-xs text-gray-400 mt-2">발행일: {formatDate(new Date().toISOString())}</p>
                        </div>

                        {/* 결제 정보 */}
                        <div className="grid grid-cols-2 gap-8 mb-8">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">고객 정보</h3>
                                <div className="space-y-3">
                                    <div className="flex">
                                        <span className="w-20 text-gray-600 text-sm">성명:</span>
                                        <span className="font-semibold">{quoteData.user_name}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="w-20 text-gray-600 text-sm">이메일:</span>
                                        <span className="font-medium">{quoteData.user_email}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="w-20 text-gray-600 text-sm">연락처:</span>
                                        <span className="font-medium">{quoteData.user_phone}</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">결제 정보</h3>
                                <div className="space-y-3">
                                    <div className="flex">
                                        <span className="w-20 text-gray-600 text-sm">견적번호:</span>
                                        <span className="font-semibold">{quoteData.quote_id}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="w-20 text-gray-600 text-sm">결제방법:</span>
                                        <span className="font-medium">{getPaymentMethodName(quoteData.payment_method)}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="w-20 text-gray-600 text-sm">결제일:</span>
                                        <span className="font-medium">{formatDate(quoteData.payment_date)}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="w-20 text-gray-600 text-sm">상태:</span>
                                        <span className="font-semibold text-green-600">결제완료</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 예약 상세 */}
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">예약 상세</h3>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="font-semibold text-gray-900 text-lg">{quoteData.title}</h4>
                                        <div className="text-sm text-gray-600 mt-2">
                                            <div>예약 건수: {quoteData.reservations.length}건</div>
                                            <div>생성일: {formatDate(quoteData.created_at)}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* 서비스별 예약 목록 */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
                                    {quoteData.reservations.map((reservation, index) => (
                                        <div key={reservation.re_id} className="text-sm bg-white rounded p-2 border">
                                            <div className="font-medium">{reservation.re_type}</div>
                                            <div className="text-gray-600">({reservation.re_status})</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 결제 금액 */}
                        <div className="border-t pt-6 mb-8">
                            <div className="flex justify-between items-center text-2xl font-bold">
                                <span>총 결제 금액:</span>
                                <span className="text-blue-600">{quoteData.total_price.toLocaleString()}동</span>
                            </div>
                        </div>

                        {/* 안내사항 */}
                        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-8">
                            <h4 className="font-semibold text-green-800 mb-2">✅ 결제 완료 안내</h4>
                            <ul className="text-sm text-green-700 space-y-1">
                                <li>• 결제가 정상적으로 완료되었습니다.</li>
                                <li>• 예약확인서가 등록된 이메일로 발송됩니다.</li>
                                <li>• 여행 관련 문의는 고객센터로 연락주시기 바랍니다.</li>
                                <li>• 본 영수증은 결제 증빙서류로 사용 가능합니다.</li>
                            </ul>
                        </div>

                        {/* 푸터 */}
                        <div className="text-center text-sm text-gray-500 border-t pt-6">
                            <p className="mb-3 font-medium">스테이하롱 크루즈와 함께 즐거운 여행 되시기 바랍니다.</p>
                            <div className="space-y-1">
                                <div className="font-medium text-gray-700">
                                    <p>🏢 스테이하롱 크루즈 고객센터</p>
                                    <p>📧 support@stayhalong.com | ☎️ 1588-1234</p>
                                    <p>🕒 운영시간: 평일 09:00-18:00 (주말/공휴일 휴무)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 다음 단계 안내 */}
                <SectionBox title="다음 단계">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link
                            href="/mypage/reservations/list"
                            className="block p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                            <div className="text-2xl mb-2">📋</div>
                            <div className="font-medium text-blue-900">예약 확인</div>
                            <div className="text-sm text-blue-700">예약 상세 내역 확인</div>
                        </Link>
                        <div className="block p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl mb-2">📧</div>
                            <div className="font-medium text-green-900">이메일 확인</div>
                            <div className="text-sm text-green-700">예약확인서 수신 확인</div>
                        </div>
                        <div className="block p-4 bg-purple-50 rounded-lg">
                            <div className="text-2xl mb-2">☎️</div>
                            <div className="font-medium text-purple-900">고객센터</div>
                            <div className="text-sm text-purple-700">문의사항이 있으시면 연락</div>
                        </div>
                    </div>
                </SectionBox>
            </div>
        </PageWrapper>
    );
}
