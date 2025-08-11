'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';
import Link from 'next/link';

interface PaymentData {
    id: string;
    reservation_id: string;
    amount: number;
    payment_status: string;
    payment_method: string;
    created_at: string;
    memo?: string;
    reservation: any;
    quote_info?: any;
    quote_id?: string;
}

export default function MyPaymentsPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [managerPayments, setManagerPayments] = useState<PaymentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending'); // pending, paid, all

    const handleGoHome = () => {
        router.push('/mypage');
    };

    useEffect(() => {
        checkAuthAndLoadData();
    }, [filter]);

    const checkAuthAndLoadData = async () => {
        try {
            setLoading(true);

            // 인증 확인
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                alert('로그인이 필요합니다.');
                router.push('/login');
                return;
            }

            setUser(user);

            // 매니저가 생성한 개별 결제만 로드 (견적 기반 결제는 제외)
            const paymentsResult = await loadManagerCreatedPayments(user.id);
            setManagerPayments(paymentsResult);

            console.log('📈 최종 데이터 설정 완료:', {
                managerPayments: paymentsResult.length,
                filter: filter
            });
        } catch (error) {
            console.error('데이터 로드 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 견적 기반 결제 로직 제거됨

    // 매니저가 생성한 개별 결제 조회 (예약자 소유권 기준 포함)
    const loadManagerCreatedPayments = async (userId: string) => {
        try {
            console.log('🔍 매니저 결제 조회 시작 - userId:', userId);

            const baseSelect = `
                id,
                reservation_id,
                amount,
                payment_status,
                payment_method,
                created_at,
                memo,
                user_id,
                reservation:reservation(
                    re_id,
                    re_quote_id,
                    re_user_id,
                    re_type,
                    re_status,
                    quote:re_quote_id(quote_id, title)
                )
            `;

            // 1) 결제.user_id = 본인인 건
            const q1 = supabase
                .from('reservation_payment')
                .select(baseSelect)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            // 2) 결제에 연결된 예약의 소유자(re_user_id)가 본인인 건
            const q2 = supabase
                .from('reservation_payment')
                .select(`
                    id,
                    reservation_id,
                    amount,
                    payment_status,
                    payment_method,
                    created_at,
                    memo,
                    user_id,
                    reservation:reservation!inner(
                        re_id,
                        re_user_id,
                        re_type,
                        re_status,
                        re_quote_id,
                        quote:re_quote_id(quote_id, title)
                    )
                `)
                .eq('reservation.re_user_id', userId)
                .order('created_at', { ascending: false });

            const [{ data: d1, error: e1 }, { data: d2, error: e2 }] = await Promise.all([q1, q2]);
            if (e1) console.warn('q1 경고:', e1);
            if (e2) console.warn('q2 경고:', e2);

            const rows: any[] = [...(d1 || []), ...(d2 || [])];
            // 중복 제거 (id 기준)
            const uniqMap = new Map<string, any>();
            rows.forEach(r => {
                if (!uniqMap.has(r.id)) uniqMap.set(r.id, r);
            });
            let result = Array.from(uniqMap.values());

            // 상태 필터 적용
            if (filter === 'pending') {
                result = result.filter(r => r.payment_status === 'pending');
            } else if (filter === 'paid') {
                result = result.filter(r => r.payment_status === 'completed');
            }

            console.log('📋 조회된 매니저 결제 개수(병합 후):', result.length);

            // Fallback: 조인이 실패하여 result가 비었을 때 분리 조회로 보강
            if (result.length === 0) {
                console.log('⚠️ 조인 결과 없음 → 분리 조회 Fallback 수행');
                // 1) 내 예약 목록
                const { data: myReservations, error: rErr } = await supabase
                    .from('reservation')
                    .select('re_id, re_type, re_status, re_quote_id')
                    .eq('re_user_id', userId);
                if (rErr) console.warn('예약 조회 경고:', rErr);

                const resIds = (myReservations || []).map((r: any) => r.re_id);

                // 2) 내 예약들에 대한 결제 + 나에게 직접 할당된 결제까지 포함
                const [byRes, byUser] = await Promise.all([
                    resIds.length
                        ? supabase
                            .from('reservation_payment')
                            .select('id,reservation_id,amount,payment_status,payment_method,created_at,memo,user_id')
                            .in('reservation_id', resIds)
                        : Promise.resolve({ data: [] as any[], error: null }),
                    supabase
                        .from('reservation_payment')
                        .select('id,reservation_id,amount,payment_status,payment_method,created_at,memo,user_id')
                        .eq('user_id', userId)
                ]);

                const rows: any[] = [
                    ...(((byRes as any).data) || []),
                    ...(((byUser as any).data) || [])
                ];
                const uniq = new Map<string, any>();
                rows.forEach(r => { if (!uniq.has(r.id)) uniq.set(r.id, r); });
                let merged = Array.from(uniq.values());

                // 상태 필터 적용
                if (filter === 'pending') merged = merged.filter(r => r.payment_status === 'pending');
                else if (filter === 'paid') merged = merged.filter(r => r.payment_status === 'completed');

                // 예약 메타 매핑
                const resMap = new Map((myReservations || []).map((r: any) => [r.re_id, r]));
                return merged.map((p: any) => ({
                    id: p.id,
                    reservation_id: p.reservation_id,
                    amount: p.amount || 0,
                    payment_status: p.payment_status,
                    payment_method: p.payment_method,
                    created_at: p.created_at,
                    memo: p.memo,
                    reservation: resMap.get(p.reservation_id) || null,
                    quote_info: null
                } as PaymentData));
            }

            return result.map((payment: any) => {
                const reservationRaw = payment.reservation;
                const reservationNorm = Array.isArray(reservationRaw) ? reservationRaw[0] : reservationRaw;
                const quoteRaw = reservationNorm?.quote;
                const quoteNorm = Array.isArray(quoteRaw) ? quoteRaw[0] : quoteRaw;

                const processed = {
                    id: payment.id,
                    reservation_id: payment.reservation_id,
                    amount: payment.amount || 0,
                    payment_status: payment.payment_status,
                    payment_method: payment.payment_method,
                    created_at: payment.created_at,
                    memo: payment.memo,
                    reservation: reservationNorm || null,
                    quote_info: quoteNorm || null,
                    quote_id: reservationNorm?.re_quote_id || quoteNorm?.quote_id || undefined
                } as PaymentData;

                return processed;
            });
        } catch (error) {
            console.error('매니저 생성 결제 로드 실패:', error);
            return [];
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            paid: { label: '결제완료', color: 'bg-green-100 text-green-800' },
            completed: { label: '결제완료', color: 'bg-green-100 text-green-800' },
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

    const getPaymentMethodName = (method: string) => {
        const methods = {
            card: '신용카드',
            bank: '계좌이체',
            cash: '현금',
            transfer: '계좌이체',
            deposit: '무통장입금',
            CARD: '카드결제',
            BANK: '계좌이체',
            CASH: '현금결제'
        };
        return methods[method as keyof typeof methods] || method;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // 견적ID별 그룹화 및 합계 계산
    const groupedByQuote = useMemo(() => {
        const map = new Map<string, { quote_id: string; title?: string; items: PaymentData[]; totalPending: number; totalCompleted: number }>();
        for (const p of managerPayments) {
            const qid = p.quote_id || p.reservation?.re_quote_id || '미지정';
            const title = p.quote_info?.title;
            if (!map.has(qid)) {
                map.set(qid, { quote_id: qid, title, items: [], totalPending: 0, totalCompleted: 0 });
            }
            const g = map.get(qid)!;
            g.items.push(p);
            if (p.payment_status === 'pending') g.totalPending += p.amount || 0;
            if (p.payment_status === 'completed') g.totalCompleted += p.amount || 0;
            if (!g.title && title) g.title = title;
        }
        return Array.from(map.values());
    }, [managerPayments]);

    const payAllForQuote = async (quoteId: string) => {
        const group = groupedByQuote.find(g => g.quote_id === quoteId);
        if (!group) return;
        const pendingIds = group.items.filter(i => i.payment_status === 'pending').map(i => i.id);
        if (pendingIds.length === 0) return;
        const { error } = await supabase
            .from('reservation_payment')
            .update({ payment_status: 'completed' })
            .in('id', pendingIds);
        if (error) {
            alert('일괄 결제 처리 중 오류가 발생했습니다.');
            return;
        }
        // 견적 결제상태 동기화(paid)
        if (quoteId && quoteId !== '미지정') {
            try {
                await supabase
                    .from('quote')
                    .update({ payment_status: 'paid' })
                    .eq('quote_id', quoteId);
            } catch (e) {
                console.warn('견적 결제상태 동기화 실패:', e);
            }
        }
        await checkAuthAndLoadData();
    };

    if (loading) {
        return (
            <PageWrapper title="결제 관리">
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <p className="ml-4 text-gray-600">데이터를 불러오는 중...</p>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper title="결제 관리">
            <div className="space-y-6">
                {/* 홈 버튼 */}
                <div className="flex justify-end">
                    <button
                        onClick={handleGoHome}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                    >
                        🏠 홈
                    </button>
                </div>

                {/* 헤더 및 필터 */}
                <SectionBox title="💳 결제 관리">
                    <div className="space-y-4">
                        {/* 통계 (개별 결제 기준) */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-yellow-50 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-yellow-600">
                                    {managerPayments.filter(p => p.payment_status === 'pending').length}
                                </div>
                                <div className="text-sm text-gray-600">결제대기 건수</div>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-green-600">
                                    {managerPayments.filter(p => p.payment_status === 'completed').length}
                                </div>
                                <div className="text-sm text-gray-600">결제완료 건수</div>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                    {managerPayments.reduce((sum, p) => sum + (p.payment_status === 'completed' ? (p.amount || 0) : 0), 0).toLocaleString()}동
                                </div>
                                <div className="text-sm text-gray-600">총 결제완료 금액</div>
                            </div>
                        </div>

                        {/* 필터 버튼 */}
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setFilter('pending')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'pending'
                                    ? 'bg-yellow-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                결제대기
                            </button>
                            <button
                                onClick={() => setFilter('paid')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'paid'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                결제완료
                            </button>
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                전체
                            </button>
                        </div>
                    </div>
                </SectionBox>

                {/* 견적ID 별 개별 결제(일괄 결제) */}
                <SectionBox title="견적별 개별 결제">
                    {groupedByQuote.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-4xl mb-4">💳</div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">결제할 항목이 없습니다</h3>
                            <p className="text-gray-500 mb-4">매니저가 생성한 개별 결제가 있을 때 표시됩니다.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {groupedByQuote.map(group => (
                                <div key={group.quote_id} className="bg-white border border-gray-200 rounded-lg p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <div className="flex items-center space-x-3 mb-1">
                                                <h3 className="text-lg font-semibold text-gray-900">{group.title || '견적'}</h3>
                                                <span className="text-xs text-gray-500">{group.quote_id}</span>
                                            </div>
                                            <div className="text-sm text-gray-600">항목 {group.items.length}개 · 대기 {group.items.filter(i => i.payment_status === 'pending').length}개</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-gray-500">대기 총액</div>
                                            <div className="text-xl font-bold text-red-600">{group.totalPending.toLocaleString()}동</div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center border-t pt-4">
                                        <div className="text-sm text-gray-500">
                                            완료 금액: <span className="text-green-600 font-semibold">{group.totalCompleted.toLocaleString()}동</span>
                                        </div>
                                        <div className="flex space-x-2">
                                            {group.items.some(i => i.payment_status === 'pending') && (
                                                <button onClick={() => payAllForQuote(group.quote_id)} className="px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">한번에 결제</button>
                                            )}
                                            {group.items.every(i => i.payment_status === 'completed') && (
                                                <button
                                                    onClick={() => router.push(`/customer/confirmation?quote_id=${group.quote_id}&token=customer`)}
                                                    className="px-4 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                                                >
                                                    예약확인서
                                                </button>
                                            )}
                                            {group.quote_id && group.quote_id !== '미지정' && (
                                                <Link href={`/mypage/quotes/${group.quote_id}/view`} className="px-3 py-1 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm">견적 보기</Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </SectionBox>

                {/* 이용 안내 */}
                <SectionBox title="결제 이용 안내">
                    <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">📌 결제 관련 안내사항</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• 예약이 완료된 견적만 결제 대상입니다.</li>
                            <li>• 결제는 신용카드, 계좌이체, 무통장입금이 가능합니다.</li>
                            <li>• 결제 완료 후 예약확인서가 이메일로 발송됩니다.</li>
                            <li>• 결제 관련 문의는 고객센터로 연락주세요.</li>
                        </ul>
                    </div>
                </SectionBox>
            </div>
        </PageWrapper>
    );
}
