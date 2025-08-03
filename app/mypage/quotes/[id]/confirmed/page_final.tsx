'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

export default function ConfirmedQuoteDetailPage() {
    const params = useParams();
    const router = useRouter();
    const quoteId = Array.isArray(params.id) ? params.id[0] : params.id;

    const [loading, setLoading] = useState(true);
    const [quote, setQuote] = useState<any>(null);
    const [quoteItems, setQuoteItems] = useState<any[]>([]);

    useEffect(() => {
        checkAuthAndLoadData();
    }, [quoteId]);

    const checkAuthAndLoadData = async () => {
        try {
            setLoading(true);

            // 사용자 인증 확인
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                alert('로그인이 필요합니다.');
                router.push('/login');
                return;
            }

            await loadQuoteDetail();
        } catch (error) {
            console.error('인증 확인 오류:', error);
            alert('인증 처리 중 오류가 발생했습니다.');
            router.push('/login');
        } finally {
            setLoading(false);
        }
    };

    const handleReservation = async () => {
        try {
            if (!quote) {
                alert('견적 정보를 찾을 수 없습니다.');
                return;
            }

            // 예약 홈으로 이동
            router.push('/mypage/reservations');
        } catch (error) {
            console.error('예약 처리 오류:', error);
            alert('예약 처리 중 오류가 발생했습니다.');
        }
    };

    const loadQuoteDetail = async () => {
        try {
            console.log('📋 견적 상세 정보 로딩 시작...', quoteId);

            // 견적 기본 정보 조회 (실제 존재하는 컬럼만)
            const { data: quoteData, error: quoteError } = await supabase
                .from('quote')
                .select('id, title, total_price, status, created_at')
                .eq('id', quoteId)
                .single();

            if (quoteError) {
                console.error('견적 조회 오류:', quoteError);
                alert('견적을 찾을 수 없습니다.');
                router.push('/mypage/quotes/confirmed');
                return;
            }

            if (!quoteData) {
                alert('견적을 찾을 수 없습니다.');
                router.push('/mypage/quotes/confirmed');
                return;
            }

            setQuote(quoteData);
            console.log('✅ 견적 기본 정보 로딩 완료:', quoteData);

            // quote_item 정보 조회
            const { data: itemsData, error: itemsError } = await supabase
                .from('quote_item')
                .select('*')
                .eq('quote_id', quoteId);

            if (itemsError) {
                console.error('Quote items 조회 오류:', itemsError);
            } else {
                setQuoteItems(itemsData || []);
                console.log('✅ Quote items 로딩 완료:', itemsData);
            }

        } catch (error) {
            console.error('견적 상세 정보 로딩 오류:', error);
            alert('견적 정보를 불러오는 중 오류가 발생했습니다.');
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short'
        });
    };

    const formatPrice = (price: number) => {
        return price?.toLocaleString() || '0';
    };

    if (loading) {
        return (
            <PageWrapper>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
                </div>
            </PageWrapper>
        );
    }

    if (!quote) {
        return (
            <PageWrapper>
                <div className="text-center py-8">
                    <p className="text-gray-600">견적을 찾을 수 없습니다.</p>
                    <button
                        onClick={() => router.push('/mypage/quotes/confirmed')}
                        className="mt-4 btn"
                    >
                        목록으로 돌아가기
                    </button>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper>
            <div className="space-y-6">
                {/* 헤더 */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-lg font-bold text-gray-800">확정견적 상세보기</h1>
                        <p className="text-sm text-gray-600 mt-1">견적번호: {quote.id}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => router.push('/mypage/quotes/confirmed')}
                            className="px-3 py-1 bg-gray-50 text-gray-600 rounded border text-sm hover:bg-gray-100"
                        >
                            목록으로
                        </button>
                        <button
                            onClick={handleReservation}
                            className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 font-medium"
                        >
                            예약하기
                        </button>
                    </div>
                </div>

                {/* 기본 정보 */}
                <SectionBox title="기본 정보">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <span className="text-sm text-gray-600">제목:</span>
                            <p className="font-medium">{quote.title || '제목 없음'}</p>
                        </div>
                        <div>
                            <span className="text-sm text-gray-600">견적 ID:</span>
                            <p className="font-medium">{quote.id}</p>
                        </div>
                        <div>
                            <span className="text-sm text-gray-600">총 금액:</span>
                            <p className="font-medium text-blue-600">{formatPrice(quote.total_price)}원</p>
                        </div>
                        <div>
                            <span className="text-sm text-gray-600">상태:</span>
                            <p className="font-medium">{quote.status || '상태없음'}</p>
                        </div>
                    </div>
                </SectionBox>

                {/* 인원 구성 */}
                <SectionBox title="인원 구성">
                    <div className="text-center p-4 bg-gray-50 rounded">
                        <p className="text-sm text-gray-600">인원 정보가 quote_item에서 관리됩니다.</p>
                    </div>
                </SectionBox>

                {/* 서비스 항목 */}
                {quoteItems.length > 0 && (
                    <SectionBox title="서비스 항목">
                        <div className="space-y-3">
                            {quoteItems.map((item, index) => (
                                <div key={index} className="border border-gray-200 rounded p-3">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                                        <div>
                                            <span className="text-gray-600">서비스:</span>
                                            <p className="font-medium">{item.service_type || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">수량:</span>
                                            <p className="font-medium">{item.quantity || 0}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">단가:</span>
                                            <p className="font-medium">{formatPrice(item.unit_price)}원</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">합계:</span>
                                            <p className="font-medium text-blue-600">{formatPrice(item.total_price)}원</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SectionBox>
                )}

                {/* 상태 정보 */}
                <SectionBox title="상태 정보">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <span className="text-sm text-gray-600">상태:</span>
                            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                                {quote.status || '확정완료'}
                            </span>
                        </div>
                        <div>
                            <span className="text-sm text-gray-600">생성일:</span>
                            <p className="font-medium">{formatDate(quote.created_at)}</p>
                        </div>
                    </div>
                </SectionBox>

                {/* 액션 버튼 */}
                <div className="flex justify-center pt-6">
                    <button
                        onClick={handleReservation}
                        className="px-6 py-3 bg-blue-500 text-white rounded font-medium hover:bg-blue-600 transition-colors"
                    >
                        이 견적으로 예약하기
                    </button>
                </div>
            </div>
        </PageWrapper>
    );
}
