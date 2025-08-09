'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';
import supabase from '@/lib/supabase';

export default function IndividualPaymentReceiptPage() {
    const params = useParams<{ payment_id: string }>();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [payment, setPayment] = useState<any>(null);

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/login'); return; }
            const { data } = await supabase
                .from('reservation_payment')
                .select('*')
                .eq('id', params.payment_id)
                .maybeSingle();
            setPayment(data);
            setLoading(false);
        })();
    }, [params.payment_id]);

    if (loading) return <PageWrapper title="개별 결제 영수증"><div className="p-6">로딩중...</div></PageWrapper>;
    if (!payment) return <PageWrapper title="개별 결제 영수증"><div className="p-6">결제를 찾을 수 없습니다.</div></PageWrapper>;

    return (
        <PageWrapper title="개별 결제 영수증">
            <SectionBox title="영수증">
                <div className="space-y-1 text-sm">
                    <div>결제ID: {payment.id}</div>
                    <div>금액: {(payment.amount || 0).toLocaleString()}동</div>
                    <div>상태: {payment.payment_status}</div>
                    <div>수단: {payment.payment_method}</div>
                    <div>일시: {new Date(payment.created_at).toLocaleString('ko-KR')}</div>
                    {payment.memo && <div>메모: {payment.memo}</div>}
                </div>
            </SectionBox>
        </PageWrapper>
    );
}
