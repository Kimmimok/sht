'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

export default function CruiseReservationRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // 새로운 종합 예약 페이지로 리다이렉트
    router.replace('/reservation/comprehensive/new');
  }, [router]);

  return (
    <PageWrapper>
      <SectionBox title="페이지 이동 중...">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">새로운 종합 예약 페이지로 이동 중입니다...</p>
        </div>
      </SectionBox>
    </PageWrapper>
  );
}
