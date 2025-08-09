'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import ManagerLayout from '@/components/ManagerLayout';
import {
    ArrowLeft,
    Edit,
    User,
    Calendar,
    Phone,
    Mail,
    FileText,
    Ship,
    Plane,
    Building,
    MapPin,
    Car,
    CheckCircle,
    XCircle,
    Clock
} from 'lucide-react';

interface ReservationDetail {
    re_id: string;
    re_type: string;
    re_status: string;
    re_created_at: string;
    re_quote_id: string;
    users: {
        id: string;
        name: string;
        email: string;
        phone: string;
    };
    quote: {
        title: string;
        status: string;
        total_price: number;
    };
    serviceDetails: any;
}

function ReservationViewContent() {
    const router = useRouter();
    const params = useParams();
    const reservationId = params.id as string;

    const [reservation, setReservation] = useState<ReservationDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!reservationId) {
            alert('예약 ID가 필요합니다.');
            router.push('/manager/reservations');
            return;
        }
        loadReservationDetail();
    }, [reservationId]);

    const loadReservationDetail = async () => {
        try {
            setLoading(true);

            // 권한 확인
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            const { data: userData } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();

            if (!userData || !['manager', 'admin'].includes(userData.role)) {
                alert('매니저 권한이 필요합니다.');
                router.push('/manager/reservations');
                return;
            }

            // 예약 상세 정보 조회
            const { data, error: queryError } = await supabase
                .from('reservation')
                .select(`
          re_id,
          re_type,
          re_status,
          re_created_at,
          re_quote_id,
          users!inner(
            id,
            name,
            email,
            phone
          ),
          quote:re_quote_id(
            title,
            status,
            total_price
          )
        `)
                .eq('re_id', reservationId)
                .single();

            if (queryError) {
                throw queryError;
            }

            if (!data) {
                alert('예약 정보를 찾을 수 없습니다.');
                router.push('/manager/reservations');
                return;
            }

            // 서비스별 상세 정보 조회
            let serviceDetails = null;
            const serviceTableMap: { [key: string]: string } = {
                cruise: 'reservation_cruise',
                airport: 'reservation_airport',
                hotel: 'reservation_hotel',
                tour: 'reservation_tour',
                rentcar: 'reservation_rentcar'
            };

            const tableName = serviceTableMap[data.re_type];
            if (tableName) {
                const { data: serviceData } = await supabase
                    .from(tableName)
                    .select('*')
                    .eq('reservation_id', reservationId);

                serviceDetails = serviceData?.[0] || null;
            }

            setReservation({
                ...data,
                serviceDetails
            });
            setError(null);

        } catch (error) {
            console.error('예약 상세 정보 로드 실패:', error);
            setError('예약 정보를 불러오는 중 오류가 발생했습니다.');

            // 테스트 데이터
            setReservation({
                re_id: reservationId,
                re_type: 'cruise',
                re_status: 'confirmed',
                re_created_at: new Date().toISOString(),
                re_quote_id: 'quote-test',
                users: {
                    id: 'user-test',
                    name: '김고객',
                    email: 'kim@example.com',
                    phone: '010-1234-5678'
                },
                quote: {
                    title: '부산 크루즈 여행',
                    status: 'active',
                    total_price: 500000
                },
                serviceDetails: {
                    checkin: '2024-08-15',
                    guest_count: 2,
                    request_note: '창가 객실 희망'
                }
            });
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'confirmed': return <CheckCircle className="w-5 h-5 text-green-600" />;
            case 'cancelled': return <XCircle className="w-5 h-5 text-red-600" />;
            default: return <Clock className="w-5 h-5 text-yellow-600" />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending': return '대기중';
            case 'confirmed': return '확정';
            case 'cancelled': return '취소됨';
            default: return status;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
            case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'cruise': return <Ship className="w-6 h-6 text-blue-600" />;
            case 'airport': return <Plane className="w-6 h-6 text-green-600" />;
            case 'hotel': return <Building className="w-6 h-6 text-purple-600" />;
            case 'tour': return <MapPin className="w-6 h-6 text-orange-600" />;
            case 'rentcar': return <Car className="w-6 h-6 text-red-600" />;
            default: return <FileText className="w-6 h-6 text-gray-600" />;
        }
    };

    const getTypeName = (type: string) => {
        switch (type) {
            case 'cruise': return '크루즈';
            case 'airport': return '공항';
            case 'hotel': return '호텔';
            case 'tour': return '투어';
            case 'rentcar': return '렌터카';
            default: return type;
        }
    };

    if (loading) {
        return (
            <ManagerLayout title="예약 상세보기" activeTab="reservations">
                <div className="flex justify-center items-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="mt-4 text-gray-600">예약 정보를 불러오는 중...</p>
                    </div>
                </div>
            </ManagerLayout>
        );
    }

    if (!reservation) {
        return (
            <ManagerLayout title="예약 상세보기" activeTab="reservations">
                <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600">예약 정보를 찾을 수 없습니다</h3>
                </div>
            </ManagerLayout>
        );
    }

    return (
        <ManagerLayout title="예약 상세보기" activeTab="reservations">
            <div className="space-y-6">

                {/* 헤더 */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/manager/reservations')}
                            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                                {getTypeIcon(reservation.re_type)}
                                {getTypeName(reservation.re_type)} 예약 상세
                            </h1>
                            <p className="text-gray-600 mt-1">예약 ID: {reservation.re_id}</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => router.push(`/manager/reservations/${reservation.re_id}/edit`)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                        >
                            <Edit className="w-4 h-4" />
                            수정
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        ⚠️ {error}
                    </div>
                )}

                {/* 예약 기본 정보 */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">예약 기본 정보</h3>
                        <div className={`px-3 py-1 rounded-full border flex items-center gap-2 ${getStatusColor(reservation.re_status)}`}>
                            {getStatusIcon(reservation.re_status)}
                            <span className="font-medium">{getStatusText(reservation.re_status)}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-600" />
                                예약 정보
                            </h4>
                            <div className="space-y-2 text-sm">
                                <div><span className="text-gray-600">예약 ID:</span> <code className="bg-gray-100 px-2 py-1 rounded text-xs">{reservation.re_id}</code></div>
                                <div><span className="text-gray-600">서비스 타입:</span> <strong>{getTypeName(reservation.re_type)}</strong></div>
                                <div><span className="text-gray-600">예약 상태:</span> <strong>{getStatusText(reservation.re_status)}</strong></div>
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4 text-gray-500" />
                                    <span className="text-gray-600">예약일시:</span>
                                    <span>{new Date(reservation.re_created_at).toLocaleString('ko-KR')}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                                <User className="w-5 h-5 text-green-600" />
                                고객 정보
                            </h4>
                            <div className="space-y-2 text-sm">
                                <div><span className="text-gray-600">고객명:</span> <strong>{reservation.users.name}</strong></div>
                                <div className="flex items-center gap-1">
                                    <Mail className="w-4 h-4 text-gray-500" />
                                    <span className="text-gray-600">이메일:</span>
                                    <a href={`mailto:${reservation.users.email}`} className="text-blue-600 hover:underline">
                                        {reservation.users.email}
                                    </a>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Phone className="w-4 h-4 text-gray-500" />
                                    <span className="text-gray-600">전화번호:</span>
                                    <a href={`tel:${reservation.users.phone}`} className="text-blue-600 hover:underline">
                                        {reservation.users.phone}
                                    </a>
                                </div>
                                <div><span className="text-gray-600">고객 ID:</span> <code className="bg-gray-100 px-2 py-1 rounded text-xs">{reservation.users.id.slice(0, 8)}...</code></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 견적 정보 */}
                {reservation.quote && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <FileText className="w-6 h-6 text-purple-600" />
                            연결된 견적 정보
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <span className="text-gray-600 text-sm">견적 제목:</span>
                                <p className="font-medium">{reservation.quote.title}</p>
                            </div>
                            <div>
                                <span className="text-gray-600 text-sm">견적 상태:</span>
                                <p className="font-medium">{reservation.quote.status}</p>
                            </div>
                            <div>
                                <span className="text-gray-600 text-sm">총 금액:</span>
                                <p className="font-medium text-blue-600">
                                    {reservation.quote.total_price?.toLocaleString()}원
                                </p>
                            </div>
                        </div>
                        <div className="mt-4">
                            <button
                                onClick={() => router.push(`/admin/quotes/${reservation.re_quote_id}/view`)}
                                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                            >
                                견적 상세보기 →
                            </button>
                        </div>
                    </div>
                )}

                {/* 서비스 상세 정보 */}
                {reservation.serviceDetails && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            {getTypeIcon(reservation.re_type)}
                            {getTypeName(reservation.re_type)} 서비스 상세
                        </h3>

                        <div className="bg-gray-50 rounded-lg p-4">
                            <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                                {JSON.stringify(reservation.serviceDetails, null, 2)}
                            </pre>
                        </div>

                        {reservation.serviceDetails.request_note && (
                            <div className="mt-4">
                                <h4 className="font-medium text-gray-700 mb-2">고객 요청사항</h4>
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                    <p className="text-sm text-gray-700">
                                        {reservation.serviceDetails.request_note}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 관리 메모 (향후 추가 예정) */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold mb-4">관리자 메모</h3>
                    <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                        <p>관리자 메모 기능은 곧 추가될 예정입니다.</p>
                    </div>
                </div>
            </div>
        </ManagerLayout>
    );
}

export default function ReservationViewPage() {
    return (
        <Suspense fallback={
            <ManagerLayout title="예약 상세보기" activeTab="reservations">
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            </ManagerLayout>
        }>
            <ReservationViewContent />
        </Suspense>
    );
}
