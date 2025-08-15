'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

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

export default function PaymentPage() {
    const params = useParams();
    const router = useRouter();
    const quoteId = params.quote_id as string;

    const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [formData, setFormData] = useState({
        // 카드 결제
        cardNumber: '',
        cardExpiry: '',
        cardCvc: '',
        cardName: '',
        // 계좌이체
        bankCode: '',
        accountNumber: '',
        accountName: '',
        // 무통장입금
        depositorName: '',
        depositAmount: 0,
        // 공통
        agreeTerms: false,
        agreePrivacy: false
    });

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

            // 이미 결제완료된 경우
            if (quote.payment_status === 'paid') {
                alert('이미 결제가 완료된 견적입니다.');
                router.push(`/mypage/payments/${quoteId}/receipt`);
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
                payment_status: quote.payment_status || 'pending',
                created_at: quote.created_at,
                reservations: reservations || []
            });

            // 결제 금액 초기화
            setFormData(prev => ({
                ...prev,
                depositAmount: quote.total_price || 0
            }));

        } catch (error) {
            console.error('견적 데이터 로드 실패:', error);
            alert('견적 정보를 불러올 수 없습니다.');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field: string, value: string | number | boolean) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const validateForm = () => {
        if (!formData.agreeTerms || !formData.agreePrivacy) {
            alert('이용약관과 개인정보처리방침에 동의해주세요.');
            return false;
        }

        if (paymentMethod === 'card') {
            if (!formData.cardNumber || !formData.cardExpiry || !formData.cardCvc || !formData.cardName) {
                alert('카드 정보를 모두 입력해주세요.');
                return false;
            }
        } else if (paymentMethod === 'transfer') {
            if (!formData.bankCode || !formData.accountNumber || !formData.accountName) {
                alert('계좌 정보를 모두 입력해주세요.');
                return false;
            }
        } else if (paymentMethod === 'deposit') {
            if (!formData.depositorName) {
                alert('입금자명을 입력해주세요.');
                return false;
            }
        }

        return true;
    };

    const processPayment = async () => {
        if (!quoteData || !validateForm()) return;

        try {
            setProcessing(true);

            // 실제 결제 처리 로직 (시뮬레이션)
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 결제 상태 업데이트
            const { error: updateError } = await supabase
                .from('quote')
                .update({
                    payment_status: 'paid',
                    payment_method: paymentMethod,
                    payment_date: new Date().toISOString(),
                    payment_amount: quoteData.total_price
                })
                .eq('quote_id', quoteId);

            if (updateError) throw updateError;

            // 결제 이력 저장 (선택사항)
            const { error: historyError } = await supabase
                .from('payment_history')
                .insert({
                    quote_id: quoteId,
                    user_id: quoteData.user_email,
                    amount: quoteData.total_price,
                    method: paymentMethod,
                    status: 'completed',
                    created_at: new Date().toISOString()
                });

            // 결제 성공
            alert('결제가 완료되었습니다!');
            router.push(`/mypage/payments/${quoteId}/receipt`);

        } catch (error) {
            console.error('결제 처리 실패:', error);
            alert('결제 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setProcessing(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <PageWrapper title="결제하기">
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <p className="ml-4 text-gray-600">데이터를 불러오는 중...</p>
                </div>
            </PageWrapper>
        );
    }

    if (!quoteData) {
        return (
            <PageWrapper title="결제하기">
                <div className="text-center py-12">
                    <div className="text-4xl mb-4">❌</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">견적을 찾을 수 없습니다</h3>
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        돌아가기
                    </button>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper title="결제하기">
            <div className="space-y-6">
                {/* 결제 정보 요약 */}
                <SectionBox title="결제 정보">
                    <div className="bg-blue-50 rounded-lg p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{quoteData.title}</h2>
                                <p className="text-sm text-gray-600">견적 ID: {quoteData.quote_id}</p>
                                <p className="text-sm text-gray-600">생성일: {formatDate(quoteData.created_at)}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-gray-500">총 결제금액</div>
                                <div className="text-3xl font-bold text-blue-600">
                                    {quoteData.total_price.toLocaleString()}동
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500">예약자:</span>
                                <div className="font-medium">{quoteData.user_name}</div>
                            </div>
                            <div>
                                <span className="text-gray-500">예약건수:</span>
                                <div className="font-medium">{quoteData.reservations.length}건</div>
                            </div>
                        </div>
                    </div>
                </SectionBox>

                {/* 결제 방법 선택 */}
                <SectionBox title="결제 방법 선택">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <button
                            onClick={() => setPaymentMethod('card')}
                            className={`p-4 border-2 rounded-lg transition-all ${paymentMethod === 'card'
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-blue-300'
                                }`}
                        >
                            <div className="text-2xl mb-2">💳</div>
                            <div className="font-medium">신용카드</div>
                            <div className="text-sm text-gray-500">즉시 결제</div>
                        </button>
                        <button
                            onClick={() => setPaymentMethod('transfer')}
                            className={`p-4 border-2 rounded-lg transition-all ${paymentMethod === 'transfer'
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-blue-300'
                                }`}
                        >
                            <div className="text-2xl mb-2">🏦</div>
                            <div className="font-medium">계좌이체</div>
                            <div className="text-sm text-gray-500">실시간 이체</div>
                        </button>
                        <button
                            onClick={() => setPaymentMethod('deposit')}
                            className={`p-4 border-2 rounded-lg transition-all ${paymentMethod === 'deposit'
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-blue-300'
                                }`}
                        >
                            <div className="text-2xl mb-2">🏧</div>
                            <div className="font-medium">무통장입금</div>
                            <div className="text-sm text-gray-500">입금 확인 후 처리</div>
                        </button>
                    </div>

                    {/* 결제 정보 입력 */}
                    <div className="space-y-4">
                        {paymentMethod === 'card' && (
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-medium mb-4">신용카드 정보</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            카드번호
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="1234-5678-9012-3456"
                                            value={formData.cardNumber}
                                            onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            카드명의자
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="홍길동"
                                            value={formData.cardName}
                                            onChange={(e) => handleInputChange('cardName', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            유효기간
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="MM/YY"
                                            value={formData.cardExpiry}
                                            onChange={(e) => handleInputChange('cardExpiry', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            CVC
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="123"
                                            value={formData.cardCvc}
                                            onChange={(e) => handleInputChange('cardCvc', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {paymentMethod === 'transfer' && (
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-medium mb-4">계좌이체 정보</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            은행선택
                                        </label>
                                        <select
                                            value={formData.bankCode}
                                            onChange={(e) => handleInputChange('bankCode', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="">은행을 선택하세요</option>
                                            <option value="004">국민은행</option>
                                            <option value="011">농협은행</option>
                                            <option value="020">우리은행</option>
                                            <option value="088">신한은행</option>
                                            <option value="081">하나은행</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            계좌번호
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="123-456-789012"
                                            value={formData.accountNumber}
                                            onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            예금주명
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="홍길동"
                                            value={formData.accountName}
                                            onChange={(e) => handleInputChange('accountName', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {paymentMethod === 'deposit' && (
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-medium mb-4">무통장입금 정보</h4>
                                <div className="mb-4 p-3 bg-blue-100 rounded-lg">
                                    <h5 className="font-medium text-blue-900 mb-2">입금 계좌</h5>
                                    <div className="text-sm text-blue-800">
                                        <div>국민은행 123-456-789012</div>
                                        <div>예금주: 스테이하롱크루즈(주)</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            입금자명
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="홍길동"
                                            value={formData.depositorName}
                                            onChange={(e) => handleInputChange('depositorName', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            입금금액
                                        </label>
                                        <input
                                            type="text"
                                            value={quoteData.total_price.toLocaleString() + '동'}
                                            disabled
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </SectionBox>

                {/* 약관 동의 */}
                <SectionBox title="약관 동의">
                    <div className="space-y-3">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={formData.agreeTerms}
                                onChange={(e) => handleInputChange('agreeTerms', e.target.checked)}
                                className="mr-2"
                            />
                            <span className="text-sm">
                                <span className="text-red-500">*</span> 이용약관에 동의합니다.
                                <a href="#" className="text-blue-600 underline ml-1">보기</a>
                            </span>
                        </label>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={formData.agreePrivacy}
                                onChange={(e) => handleInputChange('agreePrivacy', e.target.checked)}
                                className="mr-2"
                            />
                            <span className="text-sm">
                                <span className="text-red-500">*</span> 개인정보처리방침에 동의합니다.
                                <a href="#" className="text-blue-600 underline ml-1">보기</a>
                            </span>
                        </label>
                    </div>
                </SectionBox>

                {/* 결제 버튼 */}
                <div className="flex space-x-4">
                    <button
                        onClick={() => router.back()}
                        className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                        취소
                    </button>
                    <button
                        onClick={processPayment}
                        disabled={processing}
                        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                    >
                        {processing ? '결제 처리 중...' : `${quoteData.total_price.toLocaleString()}동 결제하기`}
                    </button>
                </div>
            </div>
        </PageWrapper>
    );
}
