'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import ManagerLayout from '@/components/ManagerLayout';
import SectionBox from '@/components/SectionBox';
import { cancelQuoteApproval, reapproveQuote } from '@/lib/quoteActions';

export default function ManagerQuoteViewPage() {
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
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                console.error('🚨 인증 오류:', userError);
                router.push('/login');
                return;
            }

            console.log('✅ 매니저 인증 확인:', user.email);

            // 매니저/관리자 권한 확인
            const { data: userData } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();

            if (userData && !['manager', 'admin'].includes(userData.role)) {
                alert('매니저 권한이 필요합니다.');
                router.push('/');
                return;
            }

            setManagerId(user.id);
        } catch (error) {
            console.error('🚨 권한 확인 중 오류:', error);
            router.push('/');
        }
    };

    const loadQuoteDetails = async () => {
        try {
            console.log('📋 견적 상세 정보 조회:', quoteId);

            const { data, error } = await supabase
                .from('quote')
                .select(`
          *,
          quote_items:quote_item(
            id,
            service_type,
            service_ref_id,
            quantity,
            unit_price,
            total_price,
            usage_date
          )
        `)
                .eq('id', quoteId)
                .single();

            if (error) {
                console.error('🚨 견적 조회 오류:', error);
                alert('견적을 찾을 수 없습니다.');
                router.push('/manager/quotes');
                return;
            }

            console.log('✅ 견적 데이터 로드 완료:', data?.title);
            setQuote(data);
        } catch (error) {
            console.error('🚨 견적 로드 오류:', error);
            alert('견적 정보를 불러오는 중 오류가 발생했습니다.');
            router.push('/manager/quotes');
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
            console.error('🚨 승인 취소 오류:', error);
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
            console.error('🚨 재승인 오류:', error);
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

    const getServiceTypeText = (serviceType: string) => {
        switch (serviceType) {
            case 'quote_room':
                return '객실';
            case 'quote_car':
                return '차량';
            case 'airport':
                return '공항 서비스';
            case 'hotel':
                return '호텔';
            case 'rentcar':
                return '렌터카';
            default:
                return serviceType;
        }
    };

    if (loading) {
        return (
            <ManagerLayout title="견적 상세" activeTab="quotes">
                <div className="flex flex-col justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">견적을 불러오는 중...</p>
                </div>
            </ManagerLayout>
        );
    }

    if (!quote) {
        return (
            <ManagerLayout title="견적 상세" activeTab="quotes">
                <div className="text-center py-8">
                    <div className="text-4xl mb-4">❌</div>
                    <p className="text-gray-500 mb-4">견적을 찾을 수 없습니다.</p>
                    <button
                        onClick={() => router.push('/manager/quotes')}
                        className="bg-blue-50 text-blue-600 px-4 py-2 rounded border hover:bg-blue-100"
                    >
                        목록으로 돌아가기
                    </button>
                </div>
            </ManagerLayout>
        );
    }

    return (
        <ManagerLayout title="견적 상세" activeTab="quotes">
            <div className="space-y-6">
                {/* 견적 헤더 */}
                <SectionBox title="견적 정보">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <div>
                                <span className="text-xs text-gray-500">주문 제목</span>
                                <div className="text-base font-medium text-gray-800">{quote.title}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">상태</span>
                                <span className={`px-2 py-1 rounded text-xs ${getStatusStyle(quote.status)}`}>
                                    {getStatusText(quote.status)}
                                </span>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500">생성일</span>
                                <div className="text-sm text-gray-700">
                                    {new Date(quote.created_at).toLocaleDateString('ko-KR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                            {quote.approved_at && (
                                <div>
                                    <span className="text-xs text-gray-500">승인일</span>
                                    <div className="text-sm text-gray-700">
                                        {new Date(quote.approved_at).toLocaleDateString('ko-KR', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="space-y-3">
                            <div>
                                <span className="text-xs text-gray-500">고객 닉네임</span>
                                <div className="text-sm text-gray-700">
                                    {quote.user_id ? quote.user_id.slice(0, 8) + '...' : '알 수 없음'}
                                </div>
                            </div>
                            {quote.total_price && (
                                <div>
                                    <span className="text-xs text-gray-500">총 금액</span>
                                    <div className="text-lg font-medium text-blue-600">
                                        {quote.total_price.toLocaleString()}원
                                    </div>
                                </div>
                            )}
                            <div>
                                <span className="text-xs text-gray-500">견적 ID</span>
                                <div className="text-xs text-gray-500 font-mono">
                                    {quote.id}
                                </div>
                            </div>
                        </div>
                    </div>
                </SectionBox>

                {/* 액션 버튼 */}
                <div className="flex justify-between items-center">
                    <button
                        onClick={() => router.push('/manager/quotes')}
                        className="bg-gray-50 text-gray-600 px-4 py-2 rounded border hover:bg-gray-100"
                    >
                        📋 목록으로
                    </button>

                    <div className="flex gap-2">
                        {/* 승인된 견적 - 승인 취소 버튼 */}
                        {quote.status === 'approved' && (
                            <button
                                onClick={handleCancelApproval}
                                disabled={actionLoading}
                                className="bg-red-50 text-red-600 px-4 py-2 rounded border hover:bg-red-100 disabled:opacity-50"
                            >
                                {actionLoading ? '처리 중...' : '❌ 승인 취소'}
                            </button>
                        )}

                        {/* 작성 중/대기 중 견적 - 승인 버튼 */}
                        {(['draft', 'pending'].includes(quote.status)) && (
                            <button
                                onClick={handleReapprove}
                                disabled={actionLoading}
                                className="bg-green-50 text-green-600 px-4 py-2 rounded border hover:bg-green-100 disabled:opacity-50"
                            >
                                {actionLoading ? '처리 중...' : '✅ 승인'}
                            </button>
                        )}

                        {/* 작성 중 견적 - 수정 버튼 */}
                        {quote.status === 'draft' && (
                            <button
                                onClick={() => router.push(`/quote/${quote.id}/edit`)}
                                className="bg-blue-50 text-blue-600 px-4 py-2 rounded border hover:bg-blue-100"
                            >
                                ✏️ 수정
                            </button>
                        )}
                    </div>
                </div>

                {/* 견적 아이템 목록 */}
                {quote.quote_items && quote.quote_items.length > 0 && (
                    <SectionBox title="견적 구성 항목">
                        <div className="space-y-3">
                            {quote.quote_items.map((item: any, index: number) => (
                                <div key={item.id} className="bg-gray-50 rounded border border-gray-200 p-4">
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                        <div>
                                            <span className="text-xs text-gray-500">서비스</span>
                                            <div className="text-sm font-medium text-gray-800">
                                                {getServiceTypeText(item.service_type)}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500">수량</span>
                                            <div className="text-sm text-gray-700">{item.quantity}</div>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500">단가</span>
                                            <div className="text-sm text-gray-700">
                                                {item.unit_price ? `${item.unit_price.toLocaleString()}원` : '미정'}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500">총액</span>
                                            <div className="text-sm font-medium text-blue-600">
                                                {item.total_price ? `${item.total_price.toLocaleString()}원` : '미정'}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500">사용일</span>
                                            <div className="text-sm text-gray-700">
                                                {item.usage_date
                                                    ? new Date(item.usage_date).toLocaleDateString('ko-KR')
                                                    : '미정'
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SectionBox>
                )}

                {/* 매니저 안내 */}
                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">📋 매니저 견적 관리 안내</h4>
                    <ul className="text-xs text-blue-700 space-y-1">
                        <li>• <strong>승인</strong>: 견적을 승인하면 고객이 예약을 진행할 수 있습니다</li>
                        <li>• <strong>승인 취소</strong>: 승인된 견적을 다시 "작성 중" 상태로 되돌립니다</li>
                        <li>• 승인 취소 후 고객이 견적을 다시 수정할 수 있습니다</li>
                        <li>• 모든 승인/취소 내역은 시스템에 기록됩니다</li>
                    </ul>
                </div>
            </div>
        </ManagerLayout>
    );
}