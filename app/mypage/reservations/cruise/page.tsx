'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

// 클라이언트 컴포넌트로 명시적 선언
function CruiseReservationContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const quoteId = searchParams.get('quoteId');

    // 상태 관리
    const [quote, setQuote] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!quoteId) {
            alert('견적 ID가 필요합니다.');
            router.push('/mypage/reservations');
            return;
        }
        loadQuote();
    }, [quoteId, router]);

    // 견적 정보 로드
    const loadQuote = async () => {
        try {
            const { data: quoteData, error } = await supabase
                .from('quote')
                .select('id, title, status')
                .eq('id', quoteId)
                .single();

            if (error || !quoteData) {
                alert('견적을 찾을 수 없습니다.');
                router.push('/mypage/reservations');
                return;
            }

            setQuote(quoteData);
        } catch (error) {
            console.error('견적 로드 오류:', error);
            alert('견적 정보를 불러오는 중 오류가 발생했습니다.');
        }
    };

    if (!quote) {
        return (
            <PageWrapper>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper>
            <div className="space-y-6">
                {/* 헤더 */}
                <div>
                    <h1 className="text-lg font-bold text-gray-800">🚢 크루즈 예약</h1>
                    <p className="text-sm text-gray-600 mt-1">행복 여행 이름: {quote?.title}</p>
                </div>

                {/* 크루즈 정보 */}
                <SectionBox title="크루즈 정보">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="text-sm font-medium text-blue-800 mb-3">🚢 크루즈 예약 정보</h4>
                        <p className="text-gray-600">크루즈 예약 기능이 곧 제공될 예정입니다.</p>
                    </div>
                </SectionBox>

                {/* 하단 버튼 */}
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        className="bg-gray-50 text-gray-600 px-2 py-1 rounded border text-xs hover:bg-gray-100"
                        onClick={() => router.push('/mypage/reservations')}
                    >
                        취소
                    </button>
                    <button
                        type="button"
                        className="bg-blue-50 text-blue-600 px-2 py-1 rounded border text-xs hover:bg-blue-100"
                        onClick={() => router.push(`/mypage/reservations?quoteId=${quoteId}`)}
                    >
                        예약홈으로
                    </button>
                </div>
            </div>
        </PageWrapper>
    );
}

// 페이지 컴포넌트는 Suspense로 감싸서 export
export default function CruiseReservationPage() {
    return (
        <Suspense fallback={
            <PageWrapper>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <p className="mt-4 text-gray-600 ml-3">로딩 중...</p>
                </div>
            </PageWrapper>
        }>
            <CruiseReservationContent />
        </Suspense>
    );
}
