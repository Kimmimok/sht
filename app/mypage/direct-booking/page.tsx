'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageWrapper from '../../../components/PageWrapper';
import SectionBox from '../../../components/SectionBox';
import Link from 'next/link';
import supabase from '../../../lib/supabase';

function DirectBookingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const completedService = searchParams.get('completed');

    const [user, setUser] = useState<any>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [completedServices, setCompletedServices] = useState<string[]>([]);
    const [showCompletionMessage, setShowCompletionMessage] = useState(false);

    useEffect(() => {
        loadUserInfo();
        loadCompletedServices();

        // 완료 메시지 표시
        if (completedService) {
            setShowCompletionMessage(true);
            setTimeout(() => setShowCompletionMessage(false), 5000);
        }
    }, [completedService]);

    const loadUserInfo = async () => {
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                router.push('/login');
                return;
            }
            setUser(user);

            // 사용자 프로필 정보 조회
            const { data: profile } = await supabase
                .from('users')
                .select('name, email')
                .eq('id', user.id)
                .single();

            setUserProfile(profile);
        } catch (error) {
            console.error('사용자 정보 로드 실패:', error);
        }
    };

    const loadCompletedServices = async () => {
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) return;

            // 사용자의 예약 데이터 조회
            const { data: reservations } = await supabase
                .from('reservation')
                .select('re_type')
                .eq('re_user_id', user.id);

            if (reservations) {
                const completedTypes = reservations.map(r => r.re_type);
                setCompletedServices(completedTypes);
            }
        } catch (error) {
            console.error('완료된 서비스 로드 실패:', error);
        }
    };

    const getUserDisplayName = () => {
        if (userProfile?.name) return userProfile.name;
        if (user?.email) {
            return user.email.split('@')[0];
        }
        return '고객';
    };

    const getServiceDisplayName = (serviceType: string) => {
        const names: { [key: string]: string } = {
            cruise: '크루즈',
            airport: '공항 서비스',
            hotel: '호텔',
            rentcar: '렌터카',
            tour: '투어',
            vehicle: '차량 서비스'
        };
        return names[serviceType] || serviceType;
    };

    const services = [
        {
            icon: '🚢',
            label: '크루즈 예약',
            href: '/mypage/direct-booking/cruise',
            description: '크루즈 여행 객실 및 차량 직접 예약',
            color: 'from-blue-500 to-cyan-500',
            type: 'cruise'
        },
        {
            icon: '✈️',
            label: '공항 서비스',
            href: '/mypage/direct-booking/airport/1',
            description: '공항 픽업/샌딩 서비스 직접 예약',
            color: 'from-sky-500 to-blue-500',
            type: 'airport'
        },
        {
            icon: '🏨',
            label: '호텔 예약',
            href: '/mypage/direct-booking/hotel',
            description: '호텔 숙박 서비스 직접 예약',
            color: 'from-purple-500 to-pink-500',
            type: 'hotel'
        },
        {
            icon: '🚗',
            label: '렌터카 예약',
            href: '/mypage/direct-booking/rentcar',
            description: '렌터카 서비스 직접 예약',
            color: 'from-green-500 to-emerald-500',
            type: 'rentcar'
        },
        {
            icon: '🗺️',
            label: '투어 예약',
            href: '/mypage/direct-booking/tour',
            description: '관광 투어 서비스 직접 예약',
            color: 'from-orange-500 to-red-500',
            type: 'tour'
        },
        {
            icon: '🚐',
            label: '차량 서비스',
            href: '/mypage/direct-booking/vehicle',
            description: '차량 운송 서비스 직접 예약',
            color: 'from-indigo-500 to-purple-500',
            type: 'vehicle'
        }
    ];

    return (
        <PageWrapper title={`🎯 ${getUserDisplayName()}님, 바로 예약하기`}>
            {/* 완료 메시지 */}
            {showCompletionMessage && completedService && (
                <div className="mb-6 p-4 bg-green-100 border border-green-300 rounded-lg animate-pulse">
                    <div className="flex items-center">
                        <span className="text-green-600 text-xl mr-2">🎉</span>
                        <div>
                            <h3 className="text-green-800 font-semibold">
                                {getServiceDisplayName(completedService)} 예약이 완료되었습니다!
                            </h3>
                            <p className="text-green-700 text-sm mt-1">
                                예약 내용은 마이페이지 → 예약 관리에서 확인하실 수 있습니다.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* 안내 카드 */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 mb-8 text-white">
                <h2 className="text-2xl font-bold mb-2">⚡ 빠른 예약 서비스</h2>
                <p className="text-blue-100 mb-4">
                    견적 신청 과정을 생략하고 바로 예약하실 수 있습니다.<br />
                    원하는 서비스를 선택하여 정보를 입력하시면 즉시 예약이 완료됩니다.
                </p>
                <div className="bg-white/20 rounded-lg p-3">
                    <p className="text-sm font-medium">✨ 장점</p>
                    <ul className="text-sm text-blue-100 mt-1 space-y-1">
                        <li>• 빠른 예약 처리 (견적 대기 시간 없음)</li>
                        <li>• 실시간 가격 확인 및 예약 확정</li>
                        <li>• 통합된 예약 정보 관리</li>
                    </ul>
                </div>
            </div>

            <SectionBox title="예약할 서비스를 선택하세요">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map((service, index) => {
                        const isCompleted = completedServices.includes(service.type);
                        return (
                            <Link key={index} href={service.href} className="group">
                                <div className="relative overflow-hidden bg-white border border-gray-200 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-2 transition-all duration-300 ease-out">
                                    <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>

                                    {/* 완료 배지 */}
                                    {isCompleted && (
                                        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold z-10 flex items-center gap-1">
                                            <span>✅</span>
                                            <span>완료</span>
                                        </div>
                                    )}

                                    <div className="relative p-6">
                                        <div className="flex items-center mb-4">
                                            <div className="text-4xl mr-4 transform group-hover:scale-110 transition-transform duration-300">
                                                {service.icon}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-700 transition-colors duration-300">
                                                    {service.label}
                                                </h3>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {service.description}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-blue-600 font-medium">
                                                {isCompleted ? '수정하기 →' : '바로 예약 →'}
                                            </span>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${isCompleted
                                                ? 'bg-green-100 group-hover:bg-green-200'
                                                : 'bg-blue-100 group-hover:bg-blue-200'
                                                }`}>
                                                <span className={`text-sm ${isCompleted ? 'text-green-600' : 'text-blue-600'}`}>
                                                    {isCompleted ? '✏️' : '▶'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${isCompleted ? 'from-green-500 to-emerald-500' : service.color
                                        } transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </SectionBox>

            {/* 기존 예약 방식 링크 */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-2">기존 예약 방식을 원하시나요?</h3>
                <div className="flex gap-4 text-sm">
                    <Link href="/mypage/quotes/new" className="text-blue-600 hover:text-blue-800 transition-colors">
                        📝 견적 신청하기
                    </Link>
                    <Link href="/mypage/quotes" className="text-blue-600 hover:text-blue-800 transition-colors">
                        📋 견적 목록 보기
                    </Link>
                    <Link href="/mypage/reservations" className="text-blue-600 hover:text-blue-800 transition-colors">
                        📅 예약 관리하기
                    </Link>
                </div>
            </div>
        </PageWrapper>
    );
}

export default function DirectBookingPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64">로딩 중...</div>}>
            <DirectBookingContent />
        </Suspense>
    );
}
