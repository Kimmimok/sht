'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import supabase from '@/lib/supabase';

interface QuoteDetail {
    id: string;
    status: string;
    total_price: number;
    created_at: string;
    updated_at: string;
    user_id: string;
    departure_date: string;
    return_date: string;
    adult_count: number;
    child_count: number;
    infant_count: number;
    cruise_name?: string;
    manager_note?: string;
    users?: {
        name: string;
        email: string;
        phone_number?: string;
    };
}

export default function QuoteDetailPage() {
    const router = useRouter();
    const params = useParams();
    const quoteId = params.id as string;

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [quote, setQuote] = useState<QuoteDetail | null>(null);

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        if (user && quoteId) {
            loadQuoteDetail();
        }
    }, [user, quoteId]);

    const checkAuth = async () => {
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                alert('로그인이 필요합니다.');
                router.push('/login');
                return;
            }

            console.log('✅ 사용자 인증 성공:', user.id);
            setUser(user);
        } catch (error) {
            console.error('❌ 인증 확인 오류:', error);
            router.push('/login');
        } finally {
            setLoading(false);
        }
    };

    const handleReservation = async () => {
        try {
            if (!quote) {
                alert('견적 정보를 찾을 수 없습니다.');
                return;
            }

            // 견적 데이터 조회 - 실제 테이블 컬럼명 사용
            const { data: quoteData, error } = await supabase
                .from('quote')
                .select(`
          id,
          title,
          cruise_name,
          departure_date,
          return_date,
          total_price,
          quote_item (
            service_type,
            service_ref_id,
            quantity,
            unit_price,
            total_price
          )
        `)
                .eq('id', quoteId)
                .single();

            if (error) {
                console.error('견적 조회 오류:', error);
                alert('견적 데이터를 가져올 수 없습니다.');
                return;
            }

            if (!quoteData) {
                alert('견적을 찾을 수 없습니다.');
                return;
            }

            // 견적 데이터를 URL 파라미터로 전달하여 예약 페이지로 이동
            const reservationData = {
                quoteId: quoteData.id,
                title: quoteData.title,
                cruiseCode: quoteData.cruise_name,
                scheduleCode: quoteData.cruise_name, // cruise_name을 schedule로도 사용
                checkin: quoteData.departure_date,
                checkout: quoteData.return_date,
                totalPrice: quoteData.total_price,
                services: (quoteData.quote_item || []).map((item: any) => ({
                    type: item.service_type,
                    code: item.service_ref_id, // service_ref_id를 code로 사용
                    quantity: item.quantity,
                    unitPrice: item.unit_price,
                    totalPrice: item.total_price
                }))
            };

            // 데이터를 Base64로 인코딩하여 URL에 전달
            const encodedData = btoa(JSON.stringify(reservationData));
            router.push(`/mypage/reservations/cruise-new?data=${encodedData}`);
        } catch (error) {
            console.error('예약 처리 오류:', error);
            alert('예약 처리 중 오류가 발생했습니다.');
        }
    };

    const loadQuoteDetail = async () => {
        try {
            console.log('📋 견적 상세 정보 로딩 시작...', quoteId);

            // 견적 기본 정보 조회
            const { data: quoteData, error: quoteError } = await supabase
                .from('quote')
                .select('*')
                .eq('id', quoteId)
                .single();

            if (quoteError) {
                console.error('❌ 견적 조회 실패:', quoteError);
                alert('견적을 찾을 수 없습니다.');
                router.push('/mypage/quotes');
                return;
            }

            console.log('✅ 견적 기본 정보:', quoteData);

            // 사용자 정보 조회 (안전한 방식)
            let userData = null;
            try {
                const { data: userResult, error: userError } = await supabase
                    .from('users')
                    .select('id, name, email, phone_number')
                    .eq('id', quoteData.user_id)
                    .single();

                if (userError) {
                    console.warn('⚠️ 사용자 정보 조회 실패:', userError);
                } else {
                    userData = userResult;
                }
            } catch (userErr) {
                console.warn('⚠️ 사용자 정보 조회 예외:', userErr);
            }

            console.log('👤 사용자 정보:', userData);

            const detailedQuote: QuoteDetail = {
                ...quoteData,
                users: userData || { name: '알 수 없음', email: '미확인', phone_number: '미확인' }
            };

            console.log('✅ 견적 상세 정보 로드 완료:', detailedQuote);
            setQuote(detailedQuote);

        } catch (error) {
            console.error('❌ 견적 상세 정보 로드 실패:', error);
            alert('견적 정보를 불러오는데 실패했습니다.');
            router.push('/mypage/quotes');
        }
    };

    const getStatusBadge = (status: string) => {
        const badges = {
            pending: 'bg-yellow-50 text-yellow-600',
            submitted: 'bg-yellow-50 text-yellow-600',
            draft: 'bg-gray-50 text-gray-600',
            confirmed: 'bg-blue-50 text-blue-600',
            approved: 'bg-blue-50 text-blue-600',
            rejected: 'bg-red-50 text-red-600'
        };
        const labels = {
            pending: '검토 대기',
            submitted: '제출됨',
            draft: '임시저장',
            confirmed: '확정됨 (예약)',
            approved: '승인됨',
            rejected: '거절됨'
        };
        return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badges[status as keyof typeof badges] || 'bg-gray-50 text-gray-600'}`}>
                {labels[status as keyof typeof labels] || status}
            </span>
        );
    };

    if (loading || !quote) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
                    <p className="mt-4 text-gray-600">견적 정보를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 헤더 */}
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => router.push('/mypage/quotes')}
                                className="p-2 text-gray-300 hover:text-gray-500"
                            >
                                ← 목록으로
                            </button>
                            <h1 className="text-2xl font-bold text-gray-700">📋 {quote.cruise_name || '크루즈 견적'}</h1>
                            {getStatusBadge(quote.status)}
                        </div>
                        <div className="text-sm text-gray-400">사용자: {user?.email}</div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 gap-8">
                    {/* 메인 콘텐츠 */}
                    <div className="space-y-6">
                        {/* 고객 정보 */}
                        <div className="bg-white shadow-sm rounded-lg p-6">
                            <h2 className="text-lg font-medium text-gray-600 mb-4">👤 고객 정보</h2>
                            <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                                <tbody>
                                    <tr>
                                        <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25 w-32">닉네임</td>
                                        <td className="px-2 py-1 border-blue-100 border">{quote.users?.name || '정보 없음'}</td>
                                    </tr>
                                    <tr>
                                        <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">이메일</td>
                                        <td className="px-2 py-1 border-blue-100 border">{quote.users?.email || '정보 없음'}</td>
                                    </tr>
                                    <tr>
                                        <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">연락처</td>
                                        <td className="px-2 py-1 border-blue-100 border">{quote.users?.phone_number || '정보 없음'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* 견적 기본 정보 */}
                        <div className="bg-white shadow-sm rounded-lg p-6">
                            <h2 className="text-lg font-medium text-gray-600 mb-4">🚢 견적 정보</h2>
                            <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                                <tbody>
                                    <tr>
                                        <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25 w-32">크루즈명</td>
                                        <td className="px-2 py-1 border-blue-100 border">{quote.cruise_name || '미정'}</td>
                                    </tr>
                                    <tr>
                                        <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">출발일</td>
                                        <td className="px-2 py-1 border-blue-100 border">
                                            {quote.departure_date ? new Date(quote.departure_date).toLocaleDateString() : '미정'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">귀항일</td>
                                        <td className="px-2 py-1 border-blue-100 border">
                                            {quote.return_date ? new Date(quote.return_date).toLocaleDateString() : '미정'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">성인</td>
                                        <td className="px-2 py-1 border-blue-100 border">{quote.adult_count || 0}명</td>
                                    </tr>
                                    <tr>
                                        <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">아동</td>
                                        <td className="px-2 py-1 border-blue-100 border">{quote.child_count || 0}명</td>
                                    </tr>
                                    <tr>
                                        <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">유아</td>
                                        <td className="px-2 py-1 border-blue-100 border">{quote.infant_count || 0}명</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* 전체 견적 금액 요약 */}
                        <div className="bg-white shadow-sm rounded-lg p-6 border-2 border-blue-200">
                            <h2 className="text-xl font-bold text-gray-800 mb-6">💰 견적 금액 요약</h2>

                            {/* 총 합계 */}
                            <div className="border-t-2 border-blue-200 pt-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-xl font-bold text-gray-800">총 견적 금액</span>
                                    <span className="text-3xl font-bold text-blue-600">
                                        {(quote.total_price || 0).toLocaleString()}원
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 매니저 노트 */}
                        {quote.manager_note && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                                <h2 className="text-lg font-medium text-yellow-800 mb-4">📝 매니저 노트</h2>
                                <p className="text-sm text-yellow-700">{quote.manager_note}</p>
                            </div>
                        )}

                        {/* 예약하기 버튼 - 페이지 하단 */}
                        <div className="flex justify-center mt-10">
                            <button
                                onClick={handleReservation}
                                className="bg-blue-300 text-white px-10 py-4 rounded-lg text-lg hover:bg-blue-400 transition-colors font-bold shadow-sm"
                            >
                                🚢 예약하기
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
