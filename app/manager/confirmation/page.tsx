'use client';
import { useState, useEffect } from 'react';
import ManagerLayout from '@/components/ManagerLayout';
import supabase from '@/lib/supabase';
import Link from 'next/link';

interface QuoteWithReservations {
    quote_id: string;
    quote_title: string;
    user_name: string;
    user_email: string;
    user_phone: string;
    created_at: string;
    total_price: number;
    payment_status: string;
    status?: string;
    confirmed_at?: string | null;
    reservations: any[];
}

export default function ManagerConfirmationPage() {
    const [quotes, setQuotes] = useState<QuoteWithReservations[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('paid'); // paid만 기본으로
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadQuotesWithReservations();
    }, [filter]);

    const loadQuotesWithReservations = async () => {
        try {
            setLoading(true);

            // 1) 견적 기본정보 로드: id 우선, 실패 시 quote_id 시도
            let quotesRaw: any[] | null = null;
            {
                const { data, error } = await supabase
                    .from('quote')
                    .select('id, title, user_id, created_at, total_price, payment_status, status, confirmed_at')
                    .order('created_at', { ascending: false });
                if (!error) {
                    quotesRaw = data || [];
                } else {
                    const { data: data2, error: err2 } = await supabase
                        .from('quote')
                        .select('quote_id, title, user_id, created_at, total_price, payment_status, status, confirmed_at')
                        .order('created_at', { ascending: false });
                    if (err2) throw err2;
                    quotesRaw = data2 || [];
                }
            }

            const normalizedQuotes = (quotesRaw || []).map((q: any) => ({
                _qid: q.quote_id || q.id, // 정규화된 견적ID
                quote_id: q.quote_id || q.id,
                title: q.title,
                user_id: q.user_id,
                created_at: q.created_at,
                total_price: q.total_price,
                payment_status: q.payment_status,
                status: q.status,
                confirmed_at: q.confirmed_at
            }));

            if (normalizedQuotes.length === 0) {
                setQuotes([]);
                return;
            }

            // 2) 예약 로드: re_quote_id ∈ quoteIds
            const quoteIds = normalizedQuotes.map(q => q._qid);
            const { data: reservationsRaw } = await supabase
                .from('reservation')
                .select('re_id, re_quote_id, re_type, re_status')
                .in('re_quote_id', quoteIds);

            const resByQuote = new Map<string, any[]>();
            const allReservationIds: string[] = [];
            for (const r of reservationsRaw || []) {
                if (!r?.re_quote_id) continue;
                if (!resByQuote.has(r.re_quote_id)) resByQuote.set(r.re_quote_id, []);
                resByQuote.get(r.re_quote_id)!.push(r);
                if (r.re_id) allReservationIds.push(r.re_id);
            }

            // 3) 결제완료 존재 여부 계산
            const completedQuoteIds = new Set<string>();
            if (allReservationIds.length > 0) {
                const { data: paymentsData } = await supabase
                    .from('reservation_payment')
                    .select('reservation_id, payment_status')
                    .in('reservation_id', allReservationIds)
                    .eq('payment_status', 'completed');
                for (const p of paymentsData || []) {
                    // reservation_id → 해당 예약의 re_quote_id 찾기
                    // 역매핑을 위해 간단히 순회 (건수 제한된 범위에서 성능 OK)
                    const res = (reservationsRaw || []).find((r: any) => r.re_id === p.reservation_id);
                    const qid = res?.re_quote_id;
                    if (qid) completedQuoteIds.add(qid);
                }
            }

            // 4) 예약 없는 견적 제외 + 상태 필터링
            const withReservations = normalizedQuotes
                .map(q => ({ q, reservations: resByQuote.get(q._qid) || [] }))
                .filter(entry => entry.reservations.length > 0);

            const filteredByStatus = withReservations.filter(({ q }) => {
                if (filter === 'paid') return q.payment_status === 'paid' || completedQuoteIds.has(q._qid);
                if (filter === 'pending') return (q.payment_status ?? 'pending') === 'pending' && !completedQuoteIds.has(q._qid);
                return true;
            });

            // 5) 사용자 정보 로드
            const userIds = [...new Set(filteredByStatus.map(({ q }) => q.user_id).filter(Boolean))];
            const { data: usersData } = await supabase
                .from('users')
                .select('id, name, email, phone')
                .in('id', userIds);
            const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);

            const quotesWithUsers: QuoteWithReservations[] = filteredByStatus.map(({ q, reservations }) => ({
                quote_id: q._qid,
                quote_title: q.title || '제목 없음',
                user_name: usersMap.get(q.user_id)?.name || '알 수 없음',
                user_email: usersMap.get(q.user_id)?.email || '',
                user_phone: usersMap.get(q.user_id)?.phone || '',
                created_at: q.created_at,
                total_price: q.total_price || 0,
                payment_status: (completedQuoteIds.has(q._qid) ? 'paid' : (q.payment_status || 'pending')),
                status: q.status,
                confirmed_at: q.confirmed_at,
                reservations
            }));

            setQuotes(quotesWithUsers);
        } catch (error) {
            console.error('견적 데이터 로드 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 검색 필터링
    const filteredQuotes = quotes.filter(quote =>
        quote.quote_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.quote_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <ManagerLayout title="예약확인서 발송" activeTab="confirmation">
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <p className="ml-4 text-gray-600">데이터를 불러오는 중...</p>
                </div>
            </ManagerLayout>
        );
    }

    return (
        <ManagerLayout title="예약확인서 발송" activeTab="confirmation">
            <div className="space-y-6">
                {/* 헤더 */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">📄</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">예약확인서 발송</h1>
                                <p className="text-sm text-gray-600">결제완료된 예약의 확인서 생성 및 발송</p>
                            </div>
                        </div>

                        {/* 통계 */}
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="bg-green-50 rounded-lg p-3">
                                <div className="text-lg font-bold text-green-600">{quotes.length}</div>
                                <div className="text-xs text-gray-600">발송대상</div>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-3">
                                <div className="text-lg font-bold text-blue-600">
                                    {quotes.reduce((sum, q) => sum + q.reservations.length, 0)}
                                </div>
                                <div className="text-xs text-gray-600">총 예약건</div>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-3">
                                <div className="text-lg font-bold text-purple-600">
                                    {quotes.reduce((sum, q) => sum + q.total_price, 0).toLocaleString()}동
                                </div>
                                <div className="text-xs text-gray-600">총 결제금액</div>
                            </div>
                        </div>
                    </div>

                    {/* 검색 */}
                    <div className="flex items-center space-x-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="견적 제목, 고객명, 견적ID로 검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <button
                            onClick={loadQuotesWithReservations}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            🔄 새로고침
                        </button>
                    </div>
                </div>

                {/* 견적 목록 */}
                <div className="grid grid-cols-1 gap-4">
                    {filteredQuotes.map((quote) => (
                        <div key={quote.quote_id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <h3 className="text-lg font-semibold text-gray-900">{quote.quote_title}</h3>
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">결제완료</span>
                                        {(quote.status === 'confirmed' || quote.confirmed_at) && (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">발송완료</span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-500">견적ID:</span>
                                            <div className="font-medium">{quote.quote_id}</div>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">고객명:</span>
                                            <div className="font-medium">{quote.user_name}</div>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">예약건수:</span>
                                            <div className="font-medium">{quote.reservations.length}건</div>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">결제금액:</span>
                                            <div className="font-medium text-blue-600">{quote.total_price.toLocaleString()}동</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-500">
                                        <div>📧 {quote.user_email}</div>
                                        <div>📞 {quote.user_phone}</div>
                                        <div>📅 {formatDate(quote.created_at)}</div>
                                        {quote.confirmed_at && (
                                            <div>✅ 발송일: {formatDate(quote.confirmed_at)}</div>
                                        )}
                                    </div>
                                    <div className="flex space-x-2">
                                        <Link
                                            href={`/manager/confirmation/${quote.quote_id}/generate`}
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                                        >
                                            📄 확인서 생성
                                        </Link>
                                        <Link
                                            href={`/manager/confirmation/${quote.quote_id}/send`}
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
                                        >
                                            📧 고객 발송
                                        </Link>
                                        <Link
                                            href={`/manager/confirmation/${quote.quote_id}/view`}
                                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                                        >
                                            👁️ 미리보기
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredQuotes.length === 0 && (
                    <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                        <div className="text-4xl mb-4">📄</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {searchTerm ? '검색 결과가 없습니다' : '발송할 확인서가 없습니다'}
                        </h3>
                        <p className="text-gray-500">
                            {searchTerm ? '다른 검색어로 시도해보세요.' : '결제완료된 예약이 없습니다.'}
                        </p>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                전체 보기
                            </button>
                        )}
                    </div>
                )}
            </div>
        </ManagerLayout>
    );
}
