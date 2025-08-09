'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';
import supabase from '@/lib/supabase';

export default function IndividualPaymentPayPage() {
    const params = useParams<{ payment_id: string }>();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [payment, setPayment] = useState<any>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/login'); return; }
            const { data } = await supabase.from('reservation_payment').select('*').eq('id', params.payment_id).maybeSingle();
            setPayment(data);
            setLoading(false);
        })();
    }, [params.payment_id]);

    const handlePay = async () => {
        if (!payment) return;
        setProcessing(true);
        // 1) 결제 상태 완료로 업데이트
        const { error: payErr } = await supabase
            .from('reservation_payment')
            .update({ payment_status: 'completed' })
            .eq('id', payment.id);

        // 2) 연결된 예약 → 견적ID 찾아 견적 결제상태 동기화(paid)
        if (!payErr) {
            try {
                const { data: reservation } = await supabase
                    .from('reservation')
                    .select('re_quote_id')
                    .eq('re_id', payment.reservation_id)
                    .maybeSingle();
                const quoteId = reservation?.re_quote_id;
                if (quoteId) {
                    await supabase
                        .from('quote')
                        .update({ payment_status: 'paid' })
                        .eq('quote_id', quoteId);
                }
            } catch (e) {
                // 표시는 계속 진행, 오류는 콘솔에만
                console.warn('견적 결제상태 동기화 실패:', e);
            }
        }

        setProcessing(false);
        if (!payErr) router.replace(`/mypage/payments/individual/${payment.id}/receipt`);
    };

    if (loading) return <PageWrapper title="개별 결제"><div className="p-6">로딩중...</div></PageWrapper>;
    if (!payment) return <PageWrapper title="개별 결제"><div className="p-6">결제가 없습니다.</div></PageWrapper>;

    return (
        <PageWrapper title="개별 결제">
            <SectionBox title="결제 진행">
                <div className="mb-4">결제 금액: <span className="font-bold text-red-600">{(payment.amount || 0).toLocaleString()}동</span></div>
                <button disabled={processing} onClick={handlePay} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
                    {processing ? '처리중...' : '결제하기'}
                </button>
            </SectionBox>
        </PageWrapper>
    );
}
