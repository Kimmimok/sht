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
    const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);
    const [activeQuoteData, setActiveQuoteData] = useState<any>(null); // 견적 전체 데이터 저장
    const [isFirstBooking, setIsFirstBooking] = useState(false);
    const [canCreateNewBooking, setCanCreateNewBooking] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const initializePage = async () => {
            if (isInitialized) return; // 이미 초기화된 경우 실행하지 않음

            setIsLoading(true);
            setError(null);
            try {
                console.log('🚀 페이지 초기화 시작...');
                await loadUserInfo();
                await loadCompletedServices();
                // 초기화가 완료된 후 견적 상태 확인
                setIsInitialized(true);
            } catch (err) {
                console.error('❌ 페이지 초기화 실패:', err);
                setError('페이지를 로드하는 중 오류가 발생했습니다.');
            } finally {
                setIsLoading(false);
            }
        };

        initializePage();

        // 완료 메시지 표시
        if (completedService) {
            setShowCompletionMessage(true);
            setTimeout(() => setShowCompletionMessage(false), 5000);
        }
    }, [completedService]);

    // 사용자 정보가 로드된 후 견적 상태 확인
    useEffect(() => {
        if (isInitialized && user && userProfile) {
            console.log('👤 사용자 정보 준비 완료 - 견적 상태 확인 시작');
            checkBookingStatusAndAutoCreate();
        }
    }, [isInitialized, user, userProfile]);

    const loadUserInfo = async () => {
        try {
            console.log('👤 사용자 정보 로드 시작...');
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                console.error('❌ 사용자 인증 실패:', userError);
                router.push('/login');
                return;
            }
            console.log('✅ 인증된 사용자:', user.email);
            setUser(user);

            // 사용자 프로필 정보 조회
            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('name, email')
                .eq('id', user.id)
                .single();

            if (profileError) {
                console.error('❌ 사용자 프로필 조회 실패:', profileError);
                // 프로필이 없어도 계속 진행
                setUserProfile({ name: null, email: user.email });
            } else {
                console.log('✅ 사용자 프로필:', profile);
                setUserProfile(profile);
            }
        } catch (error) {
            console.error('❌ 사용자 정보 로드 실패:', error);
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

    // 예약 상태 확인 및 자동 견적 생성 함수
    const checkBookingStatusAndAutoCreate = async () => {
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                console.error('❌ 사용자 인증 실패:', userError);
                return;
            }

            console.log('📋 기존 견적 조회 시작...');
            // 사용자의 기존 견적 조회 (draft 상태) - quote_id 컬럼 제거
            const { data: quotes, error: quotesError } = await supabase
                .from('quote')
                .select('id, title, status, created_at')
                .eq('user_id', user.id)
                .eq('status', 'draft')
                .order('created_at', { ascending: false })
                .limit(1);

            if (quotesError) {
                console.error('❌ 견적 조회 실패:', quotesError);
                console.error('에러 상세:', JSON.stringify(quotesError, null, 2));
                return;
            }

            console.log('✅ 견적 조회 성공:', quotes);

            // 사용자 권한 확인 (매니저인지 체크)
            const { data: userRole } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();

            const isManager = userRole?.role === 'manager' || userRole?.role === 'admin';
            setCanCreateNewBooking(true); // 모든 사용자가 견적 생성 가능

            if (quotes && quotes.length > 0) {
                // 기존 견적이 있는 경우
                console.log('📋 기존 견적 사용:', quotes[0]);
                setActiveQuoteId(quotes[0].id); // id를 사용
                setActiveQuoteData(quotes[0]); // 전체 데이터 저장
                setIsFirstBooking(false);
            } else {
                // 기존 견적이 없는 경우 자동으로 견적 생성
                console.log('🔄 새 견적 자동 생성 시작...');
                await createNewBookingAuto();
            }
        } catch (error) {
            console.error('❌ 예약 상태 확인 실패:', error);
        }
    };

    // 자동 견적 생성 함수 (알림 없음)
    const createNewBookingAuto = async () => {
        if (!user || !userProfile) {
            console.log('❌ 사용자 정보 부족 - 자동 생성 취소');
            return;
        }

        try {
            console.log('🎯 자동 견적 생성 시작...');
            // 견적 타이틀 생성
            const userName = getUserDisplayName();
            console.log('👤 사용자명:', userName);

            const { data: existingQuotes, error: countError } = await supabase
                .from('quote')
                .select('id')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (countError) {
                console.error('❌ 기존 견적 개수 조회 실패:', countError);
                return;
            }

            const quoteNumber = (existingQuotes?.length || 0) + 1;
            const quoteTitle = `${userName}${quoteNumber}`;

            console.log('📝 생성할 견적 정보:', { quoteTitle });

            const insertData = {
                user_id: user.id,
                title: quoteTitle,
                status: 'draft'
            };

            console.log('💾 삽입할 데이터:', insertData);

            const { data: quoteData, error: quoteError } = await supabase
                .from('quote')
                .insert(insertData)
                .select()
                .single();

            if (quoteError) {
                console.error('❌ 자동 견적 생성 오류:', quoteError);
                console.error('에러 상세:', JSON.stringify(quoteError, null, 2));
                return;
            }

            console.log('✅ 자동 견적 생성 성공:', quoteData);
            setActiveQuoteId(quoteData.id); // id 사용
            setActiveQuoteData(quoteData); // 전체 데이터 저장
            setIsFirstBooking(false);
        } catch (error) {
            console.error('❌ 자동 견적 생성 예외:', error);
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

    // 새 예약 생성 함수
    const createNewBooking = async () => {
        if (!user) return;

        try {
            // 견적 타이틀 생성
            const userName = getUserDisplayName();
            const { data: existingQuotes } = await supabase
                .from('quote')
                .select('id')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            const quoteNumber = (existingQuotes?.length || 0) + 1;
            const quoteTitle = `${userName}${quoteNumber}`;

            const { data: quoteData, error: quoteError } = await supabase
                .from('quote')
                .insert({
                    user_id: user.id,
                    title: quoteTitle,
                    status: 'draft'
                })
                .select()
                .single();

            if (quoteError) {
                console.error('견적 생성 오류:', quoteError);
                alert('견적 생성 중 오류가 발생했습니다.');
                return;
            }

            setActiveQuoteId(quoteData.id); // id 사용
            setActiveQuoteData(quoteData); // 전체 데이터 저장
            setIsFirstBooking(false);
            alert(`새 예약 "${quoteTitle}"이 생성되었습니다.`);

            // 상태 새로고침
            checkBookingStatusAndAutoCreate();
        } catch (error) {
            console.error('새 예약 생성 오류:', error);
            alert('새 예약 생성 중 오류가 발생했습니다.');
        }
    };

    // 서비스 링크 생성 함수
    const getServiceHref = (service: any) => {
        // 모든 서비스는 항상 접근 가능 (견적 ID가 있으면 전달, 없으면 새로 생성)
        const baseHref = service.href;
        const quoteParam = activeQuoteId ? `?quoteId=${activeQuoteId}` : '';
        return `${baseHref}${quoteParam}`;
    };

    // 서비스 접근 가능 여부 확인
    const isServiceAccessible = () => {
        // 서비스는 항상 접근 가능 (견적 ID 생성과 무관)
        return true;
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
            href: '/mypage/direct-booking/rentcar/1',
            description: '렌터카 서비스 직접 예약',
            color: 'from-green-500 to-emerald-500',
            type: 'rentcar'
        },
        {
            icon: '🗺️',
            label: '투어 예약',
            href: '/mypage/direct-booking/tour/1',
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
            {/* 로딩 상태 */}
            {isLoading && (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <p className="ml-4 text-gray-600">페이지를 로드하는 중...</p>
                </div>
            )}

            {/* 에러 상태 */}
            {error && (
                <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
                    <div className="flex items-center">
                        <span className="text-red-600 text-xl mr-2">⚠️</span>
                        <div>
                            <h3 className="text-red-800 font-semibold">오류가 발생했습니다</h3>
                            <p className="text-red-700 text-sm mt-1">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-2 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                            >
                                페이지 새로고침
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 정상 로드된 경우만 내용 표시 */}
            {!isLoading && !error && (
                <>
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

                    {/* 현재 진행 중인 견적 정보 */}
                    {activeQuoteData && (
                        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <span className="text-blue-600 text-xl mr-2">📋</span>
                                    <div>
                                        <h3 className="text-blue-800 font-semibold">
                                            진행 중인 견적: {activeQuoteData.title}
                                        </h3>
                                        <p className="text-blue-700 text-sm mt-1">
                                            생성일: {new Date(activeQuoteData.created_at).toLocaleDateString('ko-KR')} | ID: {activeQuoteData.id}
                                        </p>
                                        <p className="text-blue-600 text-xs mt-1">
                                            이 견적에 서비스를 추가하거나 수정할 수 있습니다.
                                        </p>
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}

                    {/* 견적이 없을 때 안내 */}
                    {!activeQuoteData && (
                        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <span className="text-blue-600 text-xl mr-2">⏳</span>
                                    <div>
                                        <h3 className="text-blue-800 font-semibold">
                                            견적을 생성하는 중입니다...
                                        </h3>
                                        <p className="text-blue-700 text-sm mt-1">
                                            잠시만 기다려 주세요. 자동으로 새 견적이 생성됩니다.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={createNewBooking}
                                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 whitespace-nowrap"
                                >
                                    수동 생성
                                </button>
                            </div>
                        </div>
                    )}

                    <SectionBox title="예약할 서비스를 선택하세요">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {services.map((service, index) => {
                                const isCompleted = completedServices.includes(service.type);
                                const href = getServiceHref(service);
                                const isAccessible = isServiceAccessible();

                                const ServiceCard = ({ children }: { children: React.ReactNode }) => {
                                    // 견적이 있을 때만 서비스 접근 가능
                                    if (activeQuoteData) {
                                        return <Link href={href} className="group">{children}</Link>;
                                    } else {
                                        return <div className="cursor-not-allowed">{children}</div>;
                                    }
                                };

                                return (
                                    <ServiceCard key={index}>
                                        <div className={`relative overflow-hidden bg-white border border-gray-200 rounded-xl shadow-lg transform transition-all duration-300 ease-out ${activeQuoteData
                                            ? 'hover:shadow-xl hover:-translate-y-2 cursor-pointer'
                                            : 'opacity-50 cursor-not-allowed'
                                            }`}>
                                            <div className={`absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 opacity-0 transition-opacity duration-300 ${activeQuoteData ? 'group-hover:opacity-5' : ''
                                                }`}></div>

                                            {/* 완료 배지 */}
                                            {isCompleted && (
                                                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold z-10 flex items-center gap-1">
                                                    <span>✅</span>
                                                    <span>완료</span>
                                                </div>
                                            )}

                                            <div className="relative p-6">
                                                <div className="flex items-center mb-4">
                                                    <div className={`text-4xl mr-4 transform transition-transform duration-300 ${activeQuoteData ? 'group-hover:scale-110' : ''
                                                        }`}>
                                                        {service.icon}
                                                    </div>
                                                    <div>
                                                        <h3 className={`text-lg font-bold transition-colors duration-300 ${activeQuoteData
                                                            ? 'text-gray-800 group-hover:text-blue-700'
                                                            : 'text-gray-500'
                                                            }`}>
                                                            {service.label}
                                                        </h3>
                                                        <p className={`text-sm mt-1 ${activeQuoteData ? 'text-gray-600' : 'text-gray-400'
                                                            }`}>
                                                            {service.description}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <span className={`text-sm font-medium ${activeQuoteData
                                                        ? isCompleted ? 'text-green-600' : 'text-blue-600'
                                                        : 'text-gray-400'
                                                        }`}>
                                                        {activeQuoteData
                                                            ? isCompleted
                                                                ? '수정하기 →'
                                                                : '견적에 추가 →'
                                                            : '견적을 먼저 생성하세요'
                                                        }
                                                    </span>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${activeQuoteData
                                                        ? isCompleted
                                                            ? 'bg-green-100 group-hover:bg-green-200'
                                                            : 'bg-blue-100 group-hover:bg-blue-200'
                                                        : 'bg-gray-100'
                                                        }`}>
                                                        <span className={`text-sm ${activeQuoteData
                                                            ? isCompleted ? 'text-green-600' : 'text-blue-600'
                                                            : 'text-gray-400'
                                                            }`}>
                                                            {activeQuoteData ? (isCompleted ? '✏️' : '➕') : '⏸️'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${service.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
                                        </div>
                                    </ServiceCard>
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
                </>
            )}
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
