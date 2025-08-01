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

        {/* ✅ 본문 */}
        <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
