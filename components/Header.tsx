'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function Header() {
  const router = useRouter();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* 로고만 유지 */}
          <div className="w-full flex justify-center">
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/images/logo.png"
                alt="스테이하롱 크루즈"
                width={40}
                height={40}
                style={{ height: 'auto' }} // 비율 유지
                className="object-contain"
              />
              <span className="text-xl font-bold text-blue-600">
                스테이하롱 크루즈
              </span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
