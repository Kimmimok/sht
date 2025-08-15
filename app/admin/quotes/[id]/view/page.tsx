'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import SectionBox from '@/components/SectionBox';
import { cancelQuoteApproval, reapproveQuote } from '@/lib/quoteActions';

export default function QuoteViewPage() {
    const router = useRouter();
    const params = useParams();
    const quoteId = params.id as string;

    const [quote, setQuote] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [managerId, setManagerId] = useState<string>('');

    useEffect(() => {
        checkAuth();
        if (quoteId) {
            loadQuoteDetails();
        }
    }, [quoteId]);

    const checkAuth = async () => {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            router.push('/login');
            return;
        }

        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        // 관리자만 접근 가능 (매니저는 별도 경로 사용)
        if (!userData || userData.role !== 'admin') {
            alert('관리자 권한이 필요합니다. 매니저는 매니저 전용 페이지를 이용해주세요.');
            router.push('/manager/quotes');
            return;
        }

        setManagerId(user.id);
    };

    const loadQuoteDetails = async () => {
        try {
            const { data, error } = await supabase
                .from('quote')
                .select(`
          *,
          quote_items:quote_item(*)
        `)
                .eq('id', quoteId)
                .single();

            if (error) {
                console.error('견적 조회 오류:', error);
                alert('견적을 찾을 수 없습니다.');
                router.push('/admin/quotes');
                return;
            }

            setQuote(data);
        } catch (error) {
            console.error('견적 로드 오류:', error);
        } finally {
            setLoading(false);
        }
    };

    // 승인 취소 처리
    const handleCancelApproval = async () => {
        const confirmed = confirm(
            `"${quote.title}" 견적의 승인을 취소하시겠습니까?\n\n` +
            '승인 취소 후 고객이 다시 견적을 수정할 수 있습니다.'
        );

        if (!confirmed) return;

        const reason = prompt('승인 취소 사유를 입력해주세요 (선택사항):');

        setActionLoading(true);
        try {
            const result = await cancelQuoteApproval(quoteId, managerId, reason || undefined);

            if (result.success) {
                alert(result.message);
                loadQuoteDetails(); // 견적 정보 새로고침
            } else {
                alert(`승인 취소 실패: ${result.error}`);
            }
        } catch (error) {
            alert('승인 취소 중 오류가 발생했습니다.');
        } finally {
            setActionLoading(false);
        }
    };

    // 재승인 처리
    const handleReapprove = async () => {
        const confirmed = confirm(`"${quote.title}" 견적을 승인하시겠습니까?`);
        if (!confirmed) return;

        setActionLoading(true);
        try {
            const result = await reapproveQuote(quoteId, managerId);

            if (result.success) {
                alert(result.message);
                loadQuoteDetails(); // 견적 정보 새로고침
            } else {
                alert(`승인 실패: ${result.error}`);
            }
        } catch (error) {
            alert('승인 중 오류가 발생했습니다.');
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'draft':
                return 'bg-gray-50 text-gray-600';
            case 'pending':
                return 'bg-yellow-50 text-yellow-600';
            case 'approved':
                return 'bg-green-50 text-green-600';
            case 'rejected':
                return 'bg-red-50 text-red-600';
            default:
                return 'bg-gray-50 text-gray-600';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'draft':
                return '작성 중';
            case 'pending':
                return '검토 대기';
            case 'approved':
                return '승인됨';
            case 'rejected':
                return '거부됨';
            default:
                return status;
        }
    };

    if (loading) {
        return (
            <AdminLayout title="견적 상세" activeTab="quotes">
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <p className="mt-4 text-gray-600">견적을 불러오는 중...</p>
                </div>
            </AdminLayout>
        );
    }

    if (!quote) {
        return (
            <AdminLayout title="견적 상세" activeTab="quotes">
                <div className="text-center py-8">
                    <p className="text-gray-500">견적을 찾을 수 없습니다.</p>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="견적 상세" activeTab="quotes">
            <div className="space-y-6">
                {/* 견적 헤더 */}
                <SectionBox title="견적 정보">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <div className="space-y-2 text-sm">
                                <div>
                                    <span className="text-gray-600">제목: </span>
                                    <span className="font-medium">{quote.title}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-600">상태: </span>
                                    <span className={`px-2 py-1 rounded text-xs ${getStatusStyle(quote.status)}`}>
                                        {getStatusText(quote.status)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-600">생성일: </span>
                                    <span>{new Date(quote.created_at).toLocaleDateString()}</span>
                                </div>
                                {quote.approved_at && (
                                    <div>
                                        <span className="text-gray-600">승인일: </span>
                                        <span>{new Date(quote.approved_at).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            {quote.total_price && (
                                <div className="text-lg font-medium text-blue-600">
                                    총 금액: {quote.total_price.toLocaleString()}동
                                </div>
                            )}
                        </div>
                    </div>
                </SectionBox>

                {/* 액션 버튼 */}
                <div className="flex justify-between items-center">
                    <button
                        onClick={() => router.push('/admin/quotes')}
                        className="bg-gray-50 text-gray-600 px-4 py-2 rounded border hover:bg-gray-100"
                    >
                        목록으로
                    </button>

                    <div className="flex gap-2">
                        {/* 승인된 견적 - 승인 취소 버튼 */}
                        {quote.status === 'approved' && (
                            <button
                                onClick={handleCancelApproval}
                                disabled={actionLoading}
                                className="bg-red-50 text-red-600 px-4 py-2 rounded border hover:bg-red-100 disabled:opacity-50"
                            >
                                {actionLoading ? '처리 중...' : '승인 취소'}
                            </button>
                        )}

                        {/* 작성 중/대기 중 견적 - 승인 버튼 */}
                        {(['draft', 'pending'].includes(quote.status)) && (
                            <button
                                onClick={handleReapprove}
                                disabled={actionLoading}
                                className="bg-green-50 text-green-600 px-4 py-2 rounded border hover:bg-green-100 disabled:opacity-50"
                            >
                                {actionLoading ? '처리 중...' : '승인'}
                            </button>
                        )}

                        {/* 작성 중 견적 - 수정 버튼 */}
                        {quote.status === 'draft' && (
                            <button
                                onClick={() => router.push(`/quote/${quote.id}/edit`)}
                                className="bg-blue-50 text-blue-600 px-4 py-2 rounded border hover:bg-blue-100"
                            >
                                수정
                            </button>
                        )}
                    </div>
                </div>

                {/* 견적 아이템 목록 */}
                {quote.quote_items && quote.quote_items.length > 0 && (
                    <SectionBox title="견적 아이템">
                        <div className="space-y-3">
                            {quote.quote_items.map((item: any, index: number) => (
                                <div key={item.id} className="bg-gray-50 rounded p-3">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                                        <div>
                                            <span className="text-gray-600">서비스: </span>
                                            <span className="font-medium">{item.service_type}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">수량: </span>
                                            <span>{item.quantity}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">단가: </span>
                                            <span>{item.unit_price?.toLocaleString()}동</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">총액: </span>
                                            <span className="font-medium text-blue-600">
                                                {item.total_price?.toLocaleString()}동
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SectionBox>
                )}

                {/* 승인 취소 안내 */}
                {quote.status === 'approved' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                        <h4 className="text-sm font-medium text-yellow-800 mb-2">⚠️ 승인 취소 안내</h4>
                        <ul className="text-xs text-yellow-700 space-y-1">
                            <li>• 승인을 취소하면 견적 상태가 "작성 중"으로 변경됩니다</li>
                            <li>• 고객이 견적을 다시 수정할 수 있게 됩니다</li>
                            <li>• 예약 진행이 불가능해집니다</li>
                            <li>• 필요시 수정 후 다시 승인할 수 있습니다</li>
                        </ul>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}