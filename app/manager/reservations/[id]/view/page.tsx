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
    Clock,
    Save
} from 'lucide-react';

interface ReservationDetail {
    re_id: string;
    re_type: string;
    re_status: string;
    re_created_at: string;
    re_quote_id: string | null;
    re_user_id: string;
    // 원본 예약 행 전체를 함께 보관 (모든 컬럼 표시 용도)
    reservationRow: any;
    users: {
        id: string;
        name: string;
        email: string;
        phone: string;
    } | null;
    quote: {
        title: string;
        status: string;
        total_price: number;
        manager_note?: string | null;
    } | null;
    serviceDetails: any | any[];
    serviceDetailsExtra?: any | any[]; // cruise_car 등 추가 연결 정보 (다중 행)
    serviceCarSht?: any | any[]; // reservation_car_sht 데이터 (다중 행)
    servicePriceDetails?: any[][] | null; // 서비스 상세 각 행에 대한 가격 테이블 행들
    serviceExtraPriceDetails?: any[][] | null; // cruise_car 등 추가 연결의 가격 행들
}

function ReservationViewContent() {
    const router = useRouter();
    const params = useParams();
    const reservationId = params.id as string;

    const [reservation, setReservation] = useState<ReservationDetail | null>(null);
    const [memo, setMemo] = useState<string>('');
    const [memoInitial, setMemoInitial] = useState<string>('');
    const [savingMemo, setSavingMemo] = useState<boolean>(false);
    const [memoMessage, setMemoMessage] = useState<string>('');
    const [savingConfirm, setSavingConfirm] = useState<boolean>(false);
    const [confirmMessage, setConfirmMessage] = useState<string>('');
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

            // 예약 원본 전체 컬럼 조회
            const { data: reservationRow, error: queryError } = await supabase
                .from('reservation')
                .select('*')
                .eq('re_id', reservationId)
                .single();

            if (queryError) {
                throw queryError;
            }

            if (!reservationRow) {
                alert('예약 정보를 찾을 수 없습니다.');
                router.push('/manager/reservations');
                return;
            }

            // 관련 사용자 정보 조회 (있으면)
            let userInfo: ReservationDetail['users'] = null;
            if (reservationRow.re_user_id) {
                const { data: u } = await supabase
                    .from('users')
                    .select('id, name, email, phone')
                    .eq('id', reservationRow.re_user_id)
                    .maybeSingle();
                if (u) userInfo = u as any;
            }

            // 연결된 견적 정보 조회 (있으면)
            let quoteInfo: ReservationDetail['quote'] = null;
            if (reservationRow.re_quote_id) {
                const { data: q } = await supabase
                    .from('quote')
                    .select('title, status, total_price, manager_note')
                    .eq('id', reservationRow.re_quote_id)
                    .maybeSingle();
                if (q) quoteInfo = q as any;
            }

            // 서비스별 상세 정보 조회 (전체 컬럼, 다중 행 지원)
            let serviceDetails: any[] | null = null;
            const serviceTableMap: { [key: string]: string } = {
                cruise: 'reservation_cruise',
                airport: 'reservation_airport',
                hotel: 'reservation_hotel',
                tour: 'reservation_tour',
                rentcar: 'reservation_rentcar'
            };

            const tableName = serviceTableMap[reservationRow.re_type];
            if (tableName) {
                const { data: serviceData } = await supabase
                    .from(tableName)
                    .select('*')
                    .eq('reservation_id', reservationId)
                    .order('created_at', { ascending: false });

                serviceDetails = Array.isArray(serviceData) ? serviceData : (serviceData ? [serviceData] : []);
            }

            // 추가 연결 데이터: 크루즈 차량
            let serviceDetailsExtra: any[] | null = null;
            if (reservationRow.re_type === 'cruise') {
                const { data: cruiseCar } = await supabase
                    .from('reservation_cruise_car')
                    .select('*')
                    .eq('reservation_id', reservationId)
                    .order('created_at', { ascending: false });
                serviceDetailsExtra = Array.isArray(cruiseCar) ? cruiseCar : (cruiseCar ? [cruiseCar] : []);
            }

            // 추가: 사내 차량 정보 (있으면 노출)
            let serviceCarSht: any[] | null = null;
            const { data: carSht } = await supabase
                .from('reservation_car_sht')
                .select('*')
                .eq('reservation_id', reservationId)
                .order('created_at', { ascending: false });
            serviceCarSht = Array.isArray(carSht) ? carSht : (carSht ? [carSht] : []);

            // 가격 테이블 매핑 정보
            const priceMap: Record<string, { table: string; codeKey: string; codeColumn: string }> = {
                cruise: { table: 'room_price', codeKey: 'room_price_code', codeColumn: 'room_code' },
                airport: { table: 'airport_price', codeKey: 'airport_price_code', codeColumn: 'airport_code' },
                hotel: { table: 'hotel_price', codeKey: 'hotel_price_code', codeColumn: 'hotel_code' },
                rentcar: { table: 'rent_price', codeKey: 'rentcar_price_code', codeColumn: 'rent_code' },
                tour: { table: 'tour_price', codeKey: 'tour_price_code', codeColumn: 'tour_code' },
                cruise_car: { table: 'car_price', codeKey: 'car_price_code', codeColumn: 'car_code' }
            };

            // 서비스 상세 가격 정보 조회 (각 행 별 해당 코드로 모든 가격 행 로드)
            let servicePriceDetails: any[][] | null = null;
            if (serviceDetails && Array.isArray(serviceDetails) && reservationRow.re_type in priceMap) {
                const cfg = priceMap[reservationRow.re_type];
                const priceLists: any[][] = [];
                for (const item of serviceDetails) {
                    const code = item?.[cfg.codeKey];
                    if (!code) { priceLists.push([]); continue; }
                    const { data: priceRows } = await supabase
                        .from(cfg.table)
                        .select('*')
                        .eq(cfg.codeColumn, code);
                    priceLists.push(Array.isArray(priceRows) ? priceRows : (priceRows ? [priceRows] : []));
                }
                servicePriceDetails = priceLists;
            }

            // 추가 연결(크루즈 차량) 가격 정보 조회
            let serviceExtraPriceDetails: any[][] | null = null;
            if (serviceDetailsExtra && Array.isArray(serviceDetailsExtra)) {
                const cfg = priceMap['cruise_car'];
                const extraLists: any[][] = [];
                for (const item of serviceDetailsExtra) {
                    const code = item?.[cfg.codeKey];
                    if (!code) { extraLists.push([]); continue; }
                    const { data: priceRows } = await supabase
                        .from(cfg.table)
                        .select('*')
                        .eq(cfg.codeColumn, code);
                    extraLists.push(Array.isArray(priceRows) ? priceRows : (priceRows ? [priceRows] : []));
                }
                serviceExtraPriceDetails = extraLists;
            }

            const result: ReservationDetail = {
                re_id: reservationRow.re_id,
                re_type: reservationRow.re_type,
                re_status: reservationRow.re_status,
                re_created_at: reservationRow.re_created_at,
                re_quote_id: reservationRow.re_quote_id,
                re_user_id: reservationRow.re_user_id,
                reservationRow,
                users: userInfo,
                quote: quoteInfo,
                serviceDetails,
                serviceDetailsExtra,
                serviceCarSht,
                servicePriceDetails,
                serviceExtraPriceDetails
            };
            setReservation(result);
            setMemo(quoteInfo?.manager_note || '');
            setMemoInitial(quoteInfo?.manager_note || '');
            setError(null);

        } catch (error) {
            console.error('예약 상세 정보 로드 실패:', error);
            setError('예약 정보를 불러오는 중 오류가 발생했습니다.');
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

    const hasQuote = !!reservation?.re_quote_id;
    const memoDirty = memo !== memoInitial;

    const handleSaveMemo = async () => {
        if (!reservation?.re_quote_id) return;
        try {
            setSavingMemo(true);
            setMemoMessage('');
            const { error } = await supabase
                .from('quote')
                .update({ manager_note: memo })
                .eq('id', reservation.re_quote_id);
            if (error) throw error;
            setReservation(prev => prev ? { ...prev, quote: prev.quote ? { ...prev.quote, manager_note: memo } : prev.quote } : prev);
            setMemoInitial(memo);
            setMemoMessage('저장되었습니다.');
        } catch (e: any) {
            setMemoMessage(e?.message || '저장 중 오류가 발생했습니다.');
        } finally {
            setSavingMemo(false);
            setTimeout(() => setMemoMessage(''), 2000);
        }
    };

    const handleConfirmReservation = async () => {
        if (!reservation) return;
        if (reservation.re_status === 'confirmed') return;
        try {
            setSavingConfirm(true);
            setConfirmMessage('');
            const { error } = await supabase
                .from('reservation')
                .update({ re_status: 'confirmed' })
                .eq('re_id', reservation.re_id);
            if (error) throw error;
            setReservation(prev => prev ? { ...prev, re_status: 'confirmed', reservationRow: { ...prev.reservationRow, re_status: 'confirmed' } } : prev);
            setConfirmMessage('예약이 확정되었습니다.');
            // 확정 후 바로 이전 페이지로 이동
            router.back();
            return;
        } catch (e: any) {
            setConfirmMessage(e?.message || '예약 확정 중 오류가 발생했습니다.');
        } finally {
            setSavingConfirm(false);
            setTimeout(() => setConfirmMessage(''), 2000);
        }
    };

    // 라벨 맵과 id 숨김 규칙을 가진 표 렌더러 (단일 객체)
    const labelMap: Record<string, Record<string, string>> = {
        reservation: {
            re_status: '예약 상태',
            re_created_at: '예약일시',
            contact_name: '신청자명',
            contact_phone: '신청자 연락처',
            contact_email: '신청자 이메일',
            emergency_contact: '비상 연락처',
            special_requests: '요청 사항',
            applicant_name: '신청자명(예비)',
            applicant_email: '신청자 이메일(예비)',
            applicant_phone: '신청자 전화(예비)',
            application_datetime: '신청 일시'
        },
        cruise: {
            reservation_id: '예약 ID',
            room_price_code: '객실 가격 코드',
            checkin: '체크인',
            guest_count: '탑승객 수',
            unit_price: '단가',
            boarding_assist: '승선 지원',
            room_total_price: '객실 총액',
            request_note: '요청사항',
            created_at: '생성일시'
        },
        airport: {
            reservation_id: '예약 ID',
            airport_price_code: '공항 가격 코드',
            ra_airport_location: '공항 위치',
            ra_flight_number: '항공편 번호',
            ra_datetime: '일시',
            ra_stopover_location: '경유지',
            ra_stopover_wait_minutes: '경유 대기(분)',
            ra_car_count: '차량 수',
            ra_passenger_count: '승객 수',
            ra_luggage_count: '수하물 수',
            request_note: '요청사항',
            ra_is_processed: '처리 여부',
            created_at: '생성일시'
        },
        hotel: {
            reservation_id: '예약 ID',
            hotel_price_code: '호텔 가격 코드',
            schedule: '스케줄',
            room_count: '객실 수',
            checkin_date: '체크인',
            breakfast_service: '조식 서비스',
            hotel_category: '호텔 카테고리',
            guest_count: '투숙객 수',
            total_price: '총액',
            request_note: '요청사항',
            created_at: '생성일시'
        },
        rentcar: {
            reservation_id: '예약 ID',
            rentcar_price_code: '렌터카 가격 코드',
            rentcar_count: '렌터카 수',
            unit_price: '단가',
            car_count: '차량 수',
            passenger_count: '승객 수',
            pickup_datetime: '픽업 일시',
            pickup_location: '픽업 장소',
            destination: '목적지',
            via_location: '경유지',
            via_waiting: '경유 대기',
            luggage_count: '수하물 수',
            total_price: '총액',
            request_note: '요청사항',
            created_at: '생성일시'
        },
        tour: {
            reservation_id: '예약 ID',
            tour_price_code: '투어 가격 코드',
            tour_capacity: '투어 정원',
            pickup_location: '픽업 장소',
            dropoff_location: '하차 장소',
            total_price: '총액',
            request_note: '요청사항',
            created_at: '생성일시'
        },
        cruise_car: {
            reservation_id: '예약 ID',
            car_price_code: '차량 가격 코드',
            car_count: '차량 수',
            passenger_count: '승객 수',
            pickup_datetime: '픽업 일시',
            pickup_location: '픽업 장소',
            dropoff_location: '하차 장소',
            car_total_price: '차량 총액',
            request_note: '요청사항',
            created_at: '생성일시',
            updated_at: '수정일시'
        },
        car_sht: {
            reservation_id: '예약 ID',
            vehicle_number: '차량 번호',
            seat_number: '좌석 수',
            color_label: '색상 라벨',
            created_at: '생성일시'
        }
    };

    const priceLabelMap: Record<string, Record<string, string>> = {
        room_price: {
            room_code: '객실 코드',
            schedule: '스케줄',
            room_category: '객실 카테고리',
            cruise: '크루즈',
            room_type: '객실 타입',
            price: '가격',
            start_date: '시작일',
            end_date: '종료일',
            payment: '결제 방식'
        },
        airport_price: {
            airport_code: '공항 코드',
            airport_category: '카테고리',
            airport_route: '노선',
            airport_car_type: '차량 타입',
            price: '가격'
        },
        hotel_price: {
            hotel_code: '호텔 코드',
            hotel_name: '호텔명',
            room_name: '객실명',
            room_type: '객실 타입',
            price: '가격',
            start_date: '시작일',
            end_date: '종료일',
            weekday_type: '요일 구분'
        },
        rent_price: {
            rent_code: '렌트 코드',
            rent_type: '렌트 타입',
            rent_category: '카테고리',
            rent_route: '경로',
            rent_car_type: '차량 타입',
            price: '가격'
        },
        tour_price: {
            tour_code: '투어 코드',
            tour_name: '투어명',
            tour_capacity: '정원',
            tour_vehicle: '이동수단',
            tour_type: '투어 타입',
            price: '가격'
        },
        car_price: {
            car_code: '차량 코드',
            car_category: '카테고리',
            cruise: '크루즈',
            car_type: '차량 타입',
            price: '가격',
            schedule: '스케줄',
            passenger_count: '승객 수'
        }
    };

    const renderLabeledTable = (obj: any, type?: keyof typeof labelMap) => {
        if (!obj) return null;
        const hiddenKeys = new Set(['id']);
        const entries = Object.entries(obj).filter(([k]) => {
            if (hiddenKeys.has(k)) return false;
            if (k.endsWith('_id')) return false;
            if (k.endsWith('_price_code')) return false;
            return true;
        });
        return (
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                    <tbody>
                        {entries.map(([key, value]) => {
                            let display: any = value;
                            if (value && typeof value === 'string') {
                                const isoLike = /\d{4}-\d{2}-\d{2}/.test(value);
                                if (isoLike) {
                                    const d = new Date(value);
                                    if (!isNaN(d.getTime())) display = d.toLocaleString('ko-KR');
                                }
                            }
                            if (typeof value === 'number') {
                                display = Number(value).toLocaleString('ko-KR');
                            }
                            if (typeof value === 'object' && value !== null) {
                                try { display = JSON.stringify(value); } catch { display = String(value); }
                            }
                            const label = (type && labelMap[type]?.[key]) || key;
                            return (
                                <tr key={key} className="border-b last:border-0">
                                    <th className="w-1/3 text-left bg-gray-50 text-gray-700 px-3 py-2 font-medium align-top">{label}</th>
                                    <td className="px-3 py-2 text-gray-900 break-all">{display === null || display === undefined ? 'null' : display}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderTableList = (items: any[] | null | undefined, type?: keyof typeof labelMap) => {
        if (!items || items.length === 0) return null;
        if (items.length === 1) return renderLabeledTable(items[0], type);
        return (
            <div className="space-y-4">
                {items.map((it, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg">
                        <div className="bg-gray-50 text-xs text-gray-600 px-3 py-2 rounded-t">항목 {idx + 1}</div>
                        <div className="p-3">{renderLabeledTable(it, type)}</div>
                    </div>
                ))}
            </div>
        );
    };

    const renderPriceTable = (obj: any, priceTable: keyof typeof priceLabelMap) => {
        if (!obj) return null;
        const labels = priceLabelMap[priceTable] || {};
        const entries = Object.entries(obj);
        return (
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm border border-blue-200 rounded-lg overflow-hidden">
                    <tbody>
                        {entries.map(([key, value]) => {
                            let display: any = value;
                            if (value && typeof value === 'string') {
                                const isoLike = /\d{4}-\d{2}-\d{2}/.test(value);
                                if (isoLike) {
                                    const d = new Date(value);
                                    if (!isNaN(d.getTime())) display = d.toLocaleDateString('ko-KR');
                                }
                            }
                            if (typeof value === 'number') display = Number(value).toLocaleString('ko-KR');
                            if (typeof value === 'object' && value !== null) { try { display = JSON.stringify(value); } catch { display = String(value); } }
                            return (
                                <tr key={key} className="border-b last:border-0">
                                    <th className="w-1/3 text-left bg-blue-50 text-blue-700 px-3 py-2 font-medium align-top">{labels[key] || key}</th>
                                    <td className="px-3 py-2 text-gray-900 break-all">{display === null || display === undefined ? 'null' : display}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderServiceWithPrices = (
        items: any[] | null | undefined,
        type: keyof typeof labelMap,
        priceLists: any[][] | null | undefined,
        priceTableKey: keyof typeof priceLabelMap
    ) => {
        if (!items || items.length === 0) return null;
        return (
            <div className="space-y-4">
                {items.map((it, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg">
                        <div className="bg-gray-50 text-xs text-gray-600 px-3 py-2 rounded-t">항목 {idx + 1}</div>
                        <div className="p-3 space-y-3">
                            {renderLabeledTable(it, type)}
                            {(priceLists && priceLists[idx] && priceLists[idx].length > 0) && (
                                <div className="mt-2">
                                    <div className="text-sm font-medium text-blue-700 mb-2">가격 옵션</div>
                                    <div className="space-y-3">
                                        {priceLists[idx].map((p, pi) => (
                                            <div key={pi} className="border border-blue-200 rounded">
                                                <div className="bg-blue-50 text-xs text-blue-700 px-3 py-1 rounded-t">가격 항목 {pi + 1}</div>
                                                <div className="p-2">{renderPriceTable(p, priceTableKey)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
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
                            onClick={handleConfirmReservation}
                            disabled={reservation.re_status === 'confirmed' || savingConfirm}
                            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${reservation.re_status === 'confirmed' || savingConfirm ? 'bg-gray-200 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                            title="예약 확정"
                        >
                            <CheckCircle className="w-4 h-4" />
                            {reservation.re_status === 'confirmed' ? '확정됨' : '예약 확정'}
                        </button>
                        <button
                            onClick={() => router.push(`/manager/reservations/${reservation.re_id}/edit`)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                        >
                            <Edit className="w-4 h-4" />
                            수정
                        </button>
                    </div>
                </div>

                {confirmMessage && (
                    <div className="text-sm text-gray-600 -mt-3">{confirmMessage}</div>
                )}

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        ⚠️ {error}
                    </div>
                )}

                {/* 예약 기본 정보는 상위 페이지에서만 표시 */}

                {/* 고객 정보 */}
                {reservation.users && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <User className="w-5 h-5 text-green-600" /> 고객 정보
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
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
                                    <div><span className="text-gray-600">고객 ID:</span> <code className="bg-gray-100 px-2 py-1 rounded text-xs">{reservation.users.id}</code></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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
                                onClick={() => router.push(`/manager/quotes/${reservation.re_quote_id}/view`)}
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

                        {renderServiceWithPrices(
                            Array.isArray(reservation.serviceDetails) ? reservation.serviceDetails : [reservation.serviceDetails],
                            reservation.re_type as any,
                            reservation.servicePriceDetails,
                            (reservation.re_type === 'cruise' ? 'room_price' :
                                reservation.re_type === 'airport' ? 'airport_price' :
                                    reservation.re_type === 'hotel' ? 'hotel_price' :
                                        reservation.re_type === 'rentcar' ? 'rent_price' :
                                            reservation.re_type === 'tour' ? 'tour_price' : 'room_price') as any
                        )}

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

                {/* 크루즈 연결 차량 (reservation_cruise_car) */}
                {reservation.re_type === 'cruise' && reservation.serviceDetailsExtra && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Car className="w-6 h-6 text-red-600" /> 연결 차량 정보 (cruise_car)
                        </h3>
                        {renderServiceWithPrices(
                            Array.isArray(reservation.serviceDetailsExtra) ? reservation.serviceDetailsExtra : [reservation.serviceDetailsExtra],
                            'cruise_car',
                            reservation.serviceExtraPriceDetails,
                            'car_price'
                        )}
                    </div>
                )}

                {/* 사내 차량 정보 (reservation_car_sht) */}
                {reservation.serviceCarSht && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Car className="w-6 h-6 text-gray-600" /> 차량 정보 (reservation_car_sht)
                        </h3>
                        {Array.isArray(reservation.serviceCarSht)
                            ? renderTableList(reservation.serviceCarSht, 'car_sht')
                            : renderLabeledTable(reservation.serviceCarSht, 'car_sht')}
                    </div>
                )}

                {/* 관리자 메모 */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold">관리자 메모</h3>
                        {hasQuote && (
                            <button
                                onClick={handleSaveMemo}
                                disabled={!memoDirty || savingMemo}
                                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 ${(!memoDirty || savingMemo) ? 'bg-gray-200 text-gray-500' : 'bg-green-500 text-white hover:bg-green-600'}`}
                                title="메모 저장"
                            >
                                <Save className="w-4 h-4" /> 저장
                            </button>
                        )}
                    </div>
                    {hasQuote ? (
                        <>
                            <textarea
                                value={memo}
                                onChange={(e) => setMemo(e.target.value)}
                                className="w-full h-32 rounded border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                                placeholder="관리자 메모를 입력하세요..."
                            />
                            {memoMessage && (
                                <div className="text-xs mt-2 text-gray-600">{memoMessage}</div>
                            )}
                        </>
                    ) : (
                        <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500 text-sm">
                            연결된 견적이 없어 메모를 저장할 수 없습니다.
                        </div>
                    )}
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
