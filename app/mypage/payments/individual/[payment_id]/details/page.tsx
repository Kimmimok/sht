'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';
import supabase from '@/lib/supabase';

export default function IndividualPaymentDetailsPage() {
    const params = useParams<{ payment_id: string }>();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [payment, setPayment] = useState<any>(null);

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/login'); return; }

            const { data, error } = await supabase
                .from('reservation_payment')
                .select(`
          *,
          reservation:reservation(
            re_id,
            re_type,
            re_status,
            re_quote_id,
            quote:re_quote_id(quote_id, title)
          )
        `)
                .eq('id', params.payment_id)
                .maybeSingle();
            if (!error) setPayment(data);
            setLoading(false);
        })();
    }, [params.payment_id]);

    if (loading) return <PageWrapper title="개별 결제 상세"><div className="p-6">로딩중...</div></PageWrapper>;
    if (!payment) return <PageWrapper title="개별 결제 상세"><div className="p-6">결제를 찾을 수 없습니다.</div></PageWrapper>;

    const quote = Array.isArray(payment.reservation?.quote) ? payment.reservation.quote[0] : payment.reservation?.quote;

    return (
        <PageWrapper title="개별 결제 상세">
            <SectionBox title="결제 정보">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div><div className="text-gray-500">결제ID</div><div className="font-medium">{payment.id}</div></div>
                    <div><div className="text-gray-500">금액</div><div className="font-bold text-red-600">{(payment.amount || 0).toLocaleString()}동</div></div>
                    <div><div className="text-gray-500">상태</div><div className="font-medium">{payment.payment_status}</div></div>
                    <div><div className="text-gray-500">결제수단</div><div className="font-medium">{payment.payment_method}</div></div>
                    <div><div className="text-gray-500">예약ID</div><div className="font-medium">{payment.reservation_id}</div></div>
                    <div><div className="text-gray-500">예약유형</div><div className="font-medium">{payment.reservation?.re_type}</div></div>
                    {quote && <div className="md:col-span-2"><div className="text-gray-500">견적</div><div className="font-medium">{quote.title} ({quote.quote_id})</div></div>}
                    {payment.memo && <div className="md:col-span-2"><div className="text-gray-500">메모</div><div>{payment.memo}</div></div>}
                </div>
                <div className="mt-4 flex space-x-2">
                    {payment.payment_status === 'pending' && (
                        <button onClick={() => router.push(`/mypage/payments/individual/${payment.id}/pay`)} className="px-4 py-2 bg-blue-600 text-white rounded">결제하기</button>
                    )}
                    {payment.payment_status === 'completed' && (
                        <button onClick={() => router.push(`/mypage/payments/individual/${payment.id}/receipt`)} className="px-4 py-2 bg-green-600 text-white rounded">영수증</button>
                    )}
                </div>
            </SectionBox>
        </PageWrapper>
    );
}
