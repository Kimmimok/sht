"use client";
import React from 'react';
import Link from 'next/link';

interface ManagerSidebarProps {
    activeTab?: string;
    userEmail?: string;
    onLogout?: () => void;
}

// 그룹 구조: 예약 관련 기능을 묶어 시각적으로 구분
const tabs = [
    { id: 'quotes', label: '견적', path: '/manager/quotes', icon: '📋' },
    { id: 'reservations', label: '예약 고객별', path: '/manager/reservations', icon: '🎫' },
    { id: 'service-tables', label: '예약 서비스별', path: '/manager/service-tables', icon: '🔍' },
    { id: 'reservation-details', label: '예약 상세', path: '/manager/reservation-details', icon: '📝' },
    { id: 'confirmation', label: '예약 확인서', path: '/manager/confirmation', icon: '📄' },
    { id: 'schedule', label: '예약 일정', path: '/manager/schedule', icon: '📅' },

    { id: 'payments', label: '예약 결제', path: '/manager/payments', icon: '💳' },
    { id: 'notifications', label: '예약 알림', path: '/manager/notifications', icon: '🔔' },

    { id: 'dashboard', label: '대시보드', path: '/manager/dashboard', icon: '🏠' },
    { id: 'analytics', label: '분석', path: '/manager/analytics', icon: '📊' },
    { id: 'services', label: '서비스 관리', path: '/manager/services', icon: '🛠️' },
    { id: 'pricing', label: '가격 관리', path: '/manager/pricing', icon: '💰' },
    { id: 'customers', label: '고객', path: '/manager/customers', icon: '👥' },
];

export default function ManagerSidebar({ activeTab, userEmail, onLogout }: ManagerSidebarProps) {
    return (
        <aside className="h-full w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col">
            <div className="h-16 px-4 flex items-center border-b border-gray-200 bg-blue-50">
                <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">M</div>
                    <div>
                        <p className="text-sm font-semibold">매니저</p>
                        <p className="text-xs text-blue-600 font-bold">StayHalong</p>
                    </div>
                </div>
            </div>
            <nav className="flex-1 overflow-y-auto py-3">
                <ul className="space-y-1 px-2">
                    {tabs.map(tab => (
                        <li key={tab.id}>
                            <Link
                                href={tab.path}
                                className={`group flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id
                                    ? 'bg-blue-50 text-blue-600 border border-blue-200'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                            >
                                <span className="text-base w-5 text-center">{tab.icon}</span>
                                <span className="truncate">{tab.label}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="border-t border-gray-200 p-3 space-y-2">
                {userEmail && <div className="text-xs text-gray-500 break-all">{userEmail}</div>}
                <div className="flex gap-2">
                    <Link href="/" className="flex-1 text-xs px-2 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-center">메인</Link>
                    <button onClick={onLogout} className="flex-1 text-xs px-2 py-2 rounded bg-red-100 hover:bg-red-200 text-red-600">로그아웃</button>
                </div>
            </div>
        </aside>
    );
}
