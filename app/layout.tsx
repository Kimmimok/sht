import React from 'react';
import '../styles/globals.css';
import Header from '@/components/Header';

export const metadata = {
  title: '스테이하롱 예약',
  description: '스테이하롱 자유여행 예약 시스템',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-background text-foreground">
        {/* ✅ 머릿글 */}
        <Header />

        {/* ✅ 본문: 전체 너비 사용 (페이지별 레이아웃에서 여백 처리) */}
        <main className="w-full">{children}</main>
      </body>
    </html>
  );
}
