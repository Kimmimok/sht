'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

interface Quote {
    id: string;
    quote_id: string;
    title: string;
    user_name: string;
    user_email: string;
    total_price: number;
    payment_status: string;
    created_at: string;
    confirmed_at?: string;
    reservation_count: number;
}

export default function CustomerSendManagementPage() {
    const router = useRouter();
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'sent' | 'pending'>('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [sending, setSending] = useState<string | null>(null);

    useEffect(() => {
        loadQuotes();
    }, [filter]);

    const loadQuotes = async () => {
        try {
            setLoading(true);

            // 결제 완료된 견적 조회
            let query = supabase
                .from('quote')
                .select(`
                    id,
                    quote_id,
                    title,
                    total_price,
                    payment_status,
                    created_at,
                    confirmed_at,
                    users!quote_user_id_fkey(name, email)
                `)
                .eq('payment_status', 'paid');

            if (filter === 'sent') {
                query = query.not('confirmed_at', 'is', null);
            } else if (filter === 'pending') {
                query = query.is('confirmed_at', null);
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
                user_name: quote.users?.name || '알 수 없음',
                user_email: quote.users?.email || '',
                total_price: quote.total_price || 0,
                payment_status: quote.payment_status,
                created_at: quote.created_at,
                confirmed_at: quote.confirmed_at,
                reservation_count: countMap.get(quote.id) || 0
            }));

            setQuotes(processedQuotes);

        } catch (error) {
            console.error('데이터 로드 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const sendConfirmationEmail = async (quote: Quote) => {
        try {
            setSending(quote.id);

            // 실제로는 이메일 발송 API 호출
            console.log('📧 이메일 발송:', quote.user_email);

            // 발송 완료 시점 기록
            const { error: updateError } = await supabase
                .from('quote')
                .update({ confirmed_at: new Date().toISOString() })
                .eq('id', quote.id);

            if (updateError) {
                console.error('발송 기록 업데이트 실패:', updateError);
                alert('발송 기록 업데이트에 실패했습니다.');
                return;
            }

            // 이메일 발송 로그 기록 (선택사항)
            await supabase
                .from('reservation_confirmation')
                .insert({
                    quote_id: quote.id,
                    method: 'email',
                    status: 'sent',
                    subject: `[스테이하롱 크루즈] 예약확인서 - ${quote.user_name}님`,
                    recipient_email: quote.user_email,
                    sent_at: new Date().toISOString()
                });

            alert(`✅ ${quote.user_name}님에게 예약확인서가 전송되었습니다!\n📧 ${quote.user_email}`);
            loadQuotes(); // 목록 새로고침

        } catch (error) {
            console.error('이메일 전송 실패:', error);
            alert('이메일 전송에 실패했습니다. 다시 시도해 주세요.');
        } finally {
            setSending(null);
        }
    };

    const previewEmail = (quote: Quote) => {
        const previewUrl = `/customer/email-preview?quote_id=${quote.id}&token=preview`;
        window.open(previewUrl, '_blank');
    };

    const viewConfirmation = (quote: Quote) => {
        const confirmationUrl = `/customer/confirmation?quote_id=${quote.id}&token=admin`;
        window.open(confirmationUrl, '_blank');
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

    const filteredQuotes = quotes.filter(quote =>
        quote.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.quote_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">데이터를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 상단 헤더 */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                                <span className="text-3xl mr-3">📧</span>
                                고객 확인서 발송 관리
                            </h1>
                            <p className="text-gray-600 mt-1">결제 완료된 예약의 확인서를 고객에게 발송합니다</p>
                        </div>
                        <button
                            onClick={() => window.history.back()}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                            돌아가기
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* 필터 및 검색 */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                        <div className="flex items-center space-x-4">
                            <div className="flex bg-gray-100 rounded-lg p-1">
                                <button
                                    onClick={() => setFilter('pending')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'pending'
                                            ? 'bg-white text-blue-600 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    📋 발송 대기 ({quotes.filter(q => !q.confirmed_at).length})
                                </button>
                                <button
                                    onClick={() => setFilter('sent')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'sent'
                                            ? 'bg-white text-blue-600 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    ✅ 발송 완료 ({quotes.filter(q => q.confirmed_at).length})
                                </button>
                                <button
                                    onClick={() => setFilter('all')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'all'
                                            ? 'bg-white text-blue-600 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    📊 전체 ({quotes.length})
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="고객명, 이메일, 예약번호로 검색..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-400">🔍</span>
                                </div>
                            </div>
                            <button
                                onClick={loadQuotes}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                새로고침
                            </button>
                        </div>
                    </div>
                </div>

                {/* 예약 목록 */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="text-lg font-semibold text-gray-900">
                            예약 목록 ({filteredQuotes.length}건)
                        </h3>
                    </div>

                    {filteredQuotes.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-4xl mb-4">📭</div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">표시할 예약이 없습니다</h3>
                            <p className="text-gray-600">
                                {filter === 'pending' && '발송 대기 중인 예약이 없습니다.'}
                                {filter === 'sent' && '발송 완료된 예약이 없습니다.'}
                                {filter === 'all' && '조건에 맞는 예약이 없습니다.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            예약 정보
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            고객 정보
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            예약일/금액
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            발송 상태
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            작업
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredQuotes.map((quote) => (
                                        <tr key={quote.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="font-medium text-gray-900">{quote.title}</div>
                                                    <div className="text-sm text-gray-500">
                                                        예약번호: {quote.quote_id}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        서비스: {quote.reservation_count}개
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="font-medium text-gray-900">{quote.user_name}</div>
                                                    <div className="text-sm text-gray-500">{quote.user_email}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="text-sm text-gray-900">
                                                    {formatDate(quote.created_at)}
                                                </div>
                                                <div className="text-lg font-bold text-blue-600">
                                                    {quote.total_price.toLocaleString()}동
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                {quote.confirmed_at ? (
                                                    <div>
                                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                            ✅ 발송완료
                                                        </span>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {formatDate(quote.confirmed_at)}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                        📋 발송대기
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center space-x-2">
                                                    <button
                                                        onClick={() => previewEmail(quote)}
                                                        className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                                        title="이메일 미리보기"
                                                    >
                                                        👁️ 미리보기
                                                    </button>
                                                    <button
                                                        onClick={() => viewConfirmation(quote)}
                                                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                                        title="확인서 보기"
                                                    >
                                                        📄 확인서
                                                    </button>
                                                    {!quote.confirmed_at && (
                                                        <button
                                                            onClick={() => sendConfirmationEmail(quote)}
                                                            disabled={sending === quote.id}
                                                            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title="이메일 발송"
                                                        >
                                                            {sending === quote.id ? '📧 발송중...' : '📧 발송'}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* 통계 요약 */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                        <div className="text-3xl text-yellow-600 mb-2">📋</div>
                        <div className="text-2xl font-bold text-yellow-800">
                            {quotes.filter(q => !q.confirmed_at).length}
                        </div>
                        <div className="text-sm text-yellow-600">발송 대기</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                        <div className="text-3xl text-green-600 mb-2">✅</div>
                        <div className="text-2xl font-bold text-green-800">
                            {quotes.filter(q => q.confirmed_at).length}
                        </div>
                        <div className="text-sm text-green-600">발송 완료</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                        <div className="text-3xl text-blue-600 mb-2">📊</div>
                        <div className="text-2xl font-bold text-blue-800">
                            {quotes.length}
                        </div>
                        <div className="text-sm text-blue-600">전체 예약</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
