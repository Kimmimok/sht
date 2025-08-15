'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import Link from 'next/link';

interface ManagerHeaderProps {
    title?: string;
    user?: any;
    subtitle?: string;
}

export default function ManagerHeader({ title = "매니저 패널", user, subtitle }: ManagerHeaderProps) {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.warn('로그아웃 처리 중 경고:', e);
        } finally {
            router.push('/login');
        }
    };

    return (
        <header className="sticky top-0 z-50 bg-blue-600 text-white shadow-lg">
            <div className="w-full px-2">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-800 rounded-full flex items-center justify-center text-white text-xl font-bold">
                            M
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">{title}</h1>
                            <p className="text-blue-200 text-sm">{subtitle || "스테이하롱 크루즈"}</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        {user && (
                            <span className="text-blue-200 text-sm">{user.email} (매니저)</span>
                        )}
                        <Link
                            href="/"
                            className="px-3 py-2 rounded-md text-sm bg-blue-700 hover:bg-blue-800 transition-colors"
                        >
                            🏠 메인으로
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="px-3 py-2 rounded-md text-sm bg-blue-700 hover:bg-blue-800 transition-colors"
                            title="로그아웃"
                        >
                            🔒 로그아웃
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
