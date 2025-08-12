'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function HotelDirectBookingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        // 쿼리 파라미터 유지하면서 1단계로 리다이렉트
        const quoteId = searchParams.get('quoteId');
        const redirectPath = `/mypage/direct-booking/hotel/1${quoteId ? `?quoteId=${quoteId}` : ''}`;
        router.push(redirectPath);
    }, [router, searchParams]);

    return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="ml-4 text-gray-600">호텔 가격 페이지로 이동 중...</p>
        </div>
    );
}

export default function HotelDirectBookingPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64">로딩 중...</div>}>
            <HotelDirectBookingContent />
        </Suspense>
    );
}

