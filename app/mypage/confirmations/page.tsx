'use client';
import React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '../../../lib/supabase';
import PageWrapper from '../../../components/PageWrapper';
import SectionBox from '../../../components/SectionBox';
import Link from 'next/link';

interface Quote {
    id: string;
    quote_id: string;
    title: string;
    total_price: number;
    payment_status: string;
    created_at: string;
    confirmed_at?: string;
    reservation_count: number;
}

export default function MyConfirmationsPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all');

    useEffect(() => {
        const fetchData = async () => {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData?.user) {
                alert('로그인이 필요합니다.');
                router.push('/login');
                return;
            }

            setUser(userData.user);
            await loadQuotes(userData.user.id);
        };

        fetchData();
    }, [router]);

    // 필터 변경 시 자동 재조회
    useEffect(() => {
        if (user?.id) {
            loadQuotes(user.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter]);

    const loadQuotes = async (userId: string) => {
        try {
            setIsLoading(true);

            // 사용자의 견적 조회
            let query = supabase
                .from('quote')
                .select('*')
                .eq('user_id', userId);

            if (filter === 'paid') {
                query = query.eq('payment_status', 'paid');
            } else if (filter === 'pending') {
                // 결제 대기: 결제 미완료(null 포함) + 결제 대상 금액 존재
                query = query.or('payment_status.is.null,payment_status.neq.paid').gt('total_price', 0);
            }

            const { data: quotesData, error: quotesError } = await query
                .order('created_at', { ascending: false });

            if (quotesError) {
                console.error('견적 조회 실패:', quotesError);
                return;
            }

            // 예약 수 조회
            const quoteIds = quotesData.map(q => q.id);
            const { data: reservationCounts } = await supabase
                .from('reservation')
                .select('re_quote_id')
                .in('re_quote_id', quoteIds);

            const countMap = new Map<string, number>();
            reservationCounts?.forEach(res => {
                const count = countMap.get(res.re_quote_id) || 0;
                countMap.set(res.re_quote_id, count + 1);
            });

            const processedQuotes: Quote[] = quotesData.map(quote => ({
                id: quote.id,
                quote_id: quote.quote_id || quote.id,
                title: quote.title || '제목 없음',
                total_price: quote.total_price || 0,
                payment_status: quote.payment_status || 'pending',
                created_at: quote.created_at,
                confirmed_at: quote.confirmed_at,
                reservation_count: countMap.get(quote.id) || 0
            }));

            setQuotes(processedQuotes);

        } catch (error) {
            console.error('데이터 로드 실패:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const viewConfirmation = (quote: Quote) => {
        const confirmationUrl = `/customer/confirmation?quote_id=${quote.id}&token=customer`;
        window.open(confirmationUrl, '_blank');
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusBadge = (status: string, hasReservations: boolean) => {
        if (status === 'paid' && hasReservations) {
            return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">✅ 예약완료</span>;
        } else if (status === 'paid') {
            return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">💳 결제완료</span>;
        } else {
            return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">📋 견적대기</span>;
        }
    };

    if (isLoading) {
        return (
            <PageWrapper title="예약확인서">
                <div className="text-center py-12">
                    <div className="text-4xl mb-4">🔄</div>
                    <p>로딩 중...</p>
                </div>
            </PageWrapper>
        );
    }

    const paidQuotes = quotes.filter(q => q.payment_status === 'paid');
    const pendingQuotes = quotes.filter(q => q.payment_status !== 'paid');

    return (
        <PageWrapper title="예약확인서">
            {/* 상단 안내 */}
            <SectionBox title="">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                    <div className="flex items-start space-x-4">
                        <div className="text-3xl">📄</div>
                        <div>
                            <h2 className="text-lg font-semibold text-blue-900 mb-2">나의 예약확인서</h2>
                            <p className="text-blue-700 text-sm">
                                결제가 완료된 예약의 확인서를 확인하고 인쇄할 수 있습니다.
                                확인서에는 여행 상세 정보, 준비사항, 연락처 등이 포함되어 있습니다.
                            </p>
                        </div>
                    </div>
                </div>
            </SectionBox>

            {/* 필터 */}
            <SectionBox title="">
                <div className="flex items-center space-x-4 mb-6">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'all'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            📊 전체 ({quotes.length})
                        </button>
                        <button
                            onClick={() => setFilter('paid')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'paid'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            ✅ 예약완료 ({paidQuotes.length})
                        </button>
                        <button
                            onClick={() => setFilter('pending')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'pending'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            📋 견적단계 ({pendingQuotes.length})
                        </button>
                    </div>
                    <button
                        onClick={() => loadQuotes(user?.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                        새로고침
                    </button>
                </div>
            </SectionBox>

            {/* 예약 목록 */}
            <SectionBox title="예약 목록">
                {quotes.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-4xl mb-4">📭</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">예약 내역이 없습니다</h3>
                        <p className="text-gray-600 mb-6">
                            {filter === 'paid' && '결제 완료된 예약이 없습니다.'}
                            {filter === 'pending' && '진행 중인 견적이 없습니다.'}
                            {filter === 'all' && '아직 생성된 견적이 없습니다.'}
                        </p>
                        <Link
                            href="/mypage/quotes/new"
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <span className="mr-2">📝</span>
                            새 견적 생성하기
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {quotes.map((quote) => (
                            <div key={quote.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900">{quote.title}</h3>
                                            {getStatusBadge(quote.payment_status, quote.reservation_count > 0)}
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                                            <div>
                                                <span className="font-medium">예약번호:</span>
                                                <div className="font-mono text-xs">{quote.quote_id}</div>
                                            </div>
                                            <div>
                                                <span className="font-medium">예약일:</span>
                                                <div>{formatDate(quote.created_at)}</div>
                                            </div>
                                            <div>
                                                <span className="font-medium">서비스:</span>
                                                <div>{quote.reservation_count}개</div>
                                            </div>
                                            <div>
                                                <span className="font-medium">총 금액:</span>
                                                <div className="text-blue-600 font-bold">{quote.total_price.toLocaleString()}동</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3 ml-6">
                                        {quote.payment_status === 'paid' ? (
                                            <>
                                                <button
                                                    onClick={() => viewConfirmation(quote)}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center space-x-2"
                                                >
                                                    <span>📄</span>
                                                    <span>확인서 보기</span>
                                                </button>
                                                {quote.confirmed_at && (
                                                    <div className="text-xs text-green-600">
                                                        발송완료: {formatDate(quote.confirmed_at)}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-center">
                                                <div className="text-sm text-gray-500 mb-2">결제 완료 후 확인서 제공</div>
                                                <Link
                                                    href="/mypage/payments"
                                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center space-x-2"
                                                >
                                                    <span>💳</span>
                                                    <span>결제하기</span>
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </SectionBox>

            {/* 안내사항 */}
            <SectionBox title="">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center">
                        <span className="mr-2">💡</span>
                        예약확인서 안내
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-yellow-700">
                        <div>
                            <h4 className="font-semibold mb-2">📄 확인서 내용</h4>
                            <ul className="space-y-1">
                                <li>• 예약자 정보 및 연락처</li>
                                <li>• 예약 서비스 상세 내역</li>
                                <li>• 여행 일정 및 준비사항</li>
                                <li>• 긴급연락처 및 고객지원</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">🖨️ 이용 방법</h4>
                            <ul className="space-y-1">
                                <li>• 확인서 페이지에서 인쇄 가능</li>
                                <li>• 여행 시 출력본 지참 권장</li>
                                <li>• 모바일에서도 열람 가능</li>
                                <li>• 24시간 언제든 접근 가능</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </SectionBox>

            {/* 통계 요약 */}
            {quotes.length > 0 && (
                <SectionBox title="">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                            <div className="text-2xl text-blue-600 mb-2">📊</div>
                            <div className="text-xl font-bold text-blue-800">{quotes.length}</div>
                            <div className="text-sm text-blue-600">전체 견적</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                            <div className="text-2xl text-green-600 mb-2">✅</div>
                            <div className="text-xl font-bold text-green-800">{paidQuotes.length}</div>
                            <div className="text-sm text-green-600">예약 완료</div>
                        </div>
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                            <div className="text-2xl text-orange-600 mb-2">💰</div>
                            <div className="text-xl font-bold text-orange-800">
                                {paidQuotes.reduce((sum, quote) => sum + quote.total_price, 0).toLocaleString()}동
                            </div>
                            <div className="text-sm text-orange-600">총 결제 금액</div>
                        </div>
                    </div>
                </SectionBox>
            )}
        </PageWrapper>
    );
}
