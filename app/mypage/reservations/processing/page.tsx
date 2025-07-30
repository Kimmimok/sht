'use client';
import React from 'react';
// app/quote/processing/page.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function QuoteProcessingPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/mypage'); // 또는 `/quote/123/view`
    }, 300000); // 5분(300,000ms)
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-blue-50 px-6 text-center">
      <Image
        src="/images/thank-you.png"
        alt="감사 이미지"
        width={200}
        height={200}
        className="mb-6"
      />
      <h1 className="text-2xl font-bold text-blue-700 mb-4">
        🎉 소중한 견적을 작성해주셔서 감사합니다!
      </h1>
      <p className="text-blue-600 mb-6">견적이 처리되는 중입니다. 잠시만 기다려주세요...</p>
      <p className="text-lg text-blue-400 mb-8">5분정도 후에 확인 가능합니다.</p>
      <button
        onClick={() => router.push('/mypage/quotes/new')}
        className="mt-2 px-6 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg border border-blue-200 font-semibold transition-colors"
      >
        🏠 견적 신청으로     </button>
    </div>
  );
}
