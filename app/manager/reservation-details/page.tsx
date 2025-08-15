'use client';

import React, { useState, useEffect } from 'react';
import ManagerLayout from '@/components/ManagerLayout';
import supabase from '@/lib/supabase';
import {
    Calendar,
    Clock,
    Ship,
    Plane,
    Building,
    MapPin,
    Car,
    Search,
    Filter,
    Eye,
    Edit,
    User,
    Phone,
    Mail,
    CreditCard,
    FileText
} from 'lucide-react';

export default function ManagerReservationDetailsPage() {
    const [reservations, setReservations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [selectedReservation, setSelectedReservation] = useState<any>(null);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        loadReservationDetails();
    }, []);

    // 가격 테이블 정보 로드 함수
    const loadPriceDetails = async (serviceType: string, priceCode: string) => {
        if (!priceCode) return null;

        try {
            let tableName = '';
            switch (serviceType) {
                case 'cruise':
                    tableName = 'room_price';
                    break;
                case 'airport':
                    tableName = 'airport_price';
                    break;
                case 'hotel':
                    tableName = 'hotel_price';
                    break;
                case 'tour':
                    tableName = 'tour_price';
                    break;
                case 'rentcar':
                    tableName = 'rentcar_price';
                    break;
                case 'car':
                    tableName = 'car_price';
                    break;
                default:
                    return null;
            }

            const codeColumn = serviceType === 'cruise'
                ? 'room_code'
                : serviceType === 'airport'
                    ? 'airport_code'
                    : serviceType === 'hotel'
                        ? 'hotel_code'
                        : serviceType === 'tour'
                            ? 'tour_code'
                            : serviceType === 'rentcar'
                                ? 'rentcar_code'
                                : serviceType === 'car'
                                    ? 'car_code'
                                    : undefined;

            if (!codeColumn) return null;

            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .eq(codeColumn, priceCode)
                .maybeSingle();

            if (error) {
                console.error(`${tableName} 조회 실패:`, error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('가격 정보 로드 실패:', error);
            return null;
        }
    };

    const loadReservationDetails = async () => {
        try {
            setLoading(true);

            // 모든 예약 기본 정보 조회
            const { data: reservationsData, error: reservationsError } = await supabase
                .from('reservation')
                .select('*')
                .order('re_created_at', { ascending: false })

            if (reservationsError) {
                console.error('예약 조회 오류:', reservationsError);
                return;
            }

            if (!reservationsData || reservationsData.length === 0) {
                setReservations([]);
                return;
            }

            console.log('📊 전체 예약 데이터 샘플:', reservationsData.slice(0, 2));

            // 사용자 정보 조회
            const userIds = [...new Set(reservationsData.map(r => r.re_user_id).filter(Boolean))];
            let usersById = new Map<string, any>();

            console.log('🔍 사용자 ID 목록:', userIds);

            if (userIds.length > 0) {
                const { data: usersData, error: usersError } = await supabase
                    .from('users')
                    .select('id, name, email, phone_number, role')
                    .in('id', userIds);

                console.log('👥 조회된 사용자 데이터:', usersData);
                console.log('❌ 사용자 조회 오류:', usersError);

                usersById = new Map((usersData || []).map(u => [u.id, u]));
                console.log('📋 사용자 맵 크기:', usersById.size);
            }

            // 각 서비스 타입별로 reservation_id를 수집하여 배치 조회
            const cruiseIds = reservationsData.filter(r => r.re_type === 'cruise').map(r => r.re_id);
            const airportIds = reservationsData.filter(r => r.re_type === 'airport').map(r => r.re_id);
            const hotelIds = reservationsData.filter(r => r.re_type === 'hotel').map(r => r.re_id);
            const tourIds = reservationsData.filter(r => r.re_type === 'tour').map(r => r.re_id);
            const rentcarIds = reservationsData.filter(r => r.re_type === 'rentcar').map(r => r.re_id);
            const carIds = reservationsData.filter(r => r.re_type === 'car').map(r => r.re_id);

            const [cruiseRes, airportRes, hotelRes, tourRes, rentcarRes, carRes] = await Promise.all([
                cruiseIds.length
                    ? supabase.from('reservation_cruise').select('*').in('reservation_id', cruiseIds)
                    : Promise.resolve({ data: [], error: null }),
                airportIds.length
                    ? supabase.from('reservation_airport').select('*').in('reservation_id', airportIds)
                    : Promise.resolve({ data: [], error: null }),
                hotelIds.length
                    ? supabase.from('reservation_hotel').select('*').in('reservation_id', hotelIds)
                    : Promise.resolve({ data: [], error: null }),
                tourIds.length
                    ? supabase.from('reservation_tour').select('*').in('reservation_id', tourIds)
                    : Promise.resolve({ data: [], error: null }),
                rentcarIds.length
                    ? supabase.from('reservation_rentcar').select('*').in('reservation_id', rentcarIds)
                    : Promise.resolve({ data: [], error: null }),
                carIds.length
                    ? supabase.from('reservation_car_sht').select('*').in('reservation_id', carIds)
                    : Promise.resolve({ data: [], error: null }),
            ]);

            if (cruiseRes.error) console.warn('reservation_cruise 조회 오류:', cruiseRes.error);
            if (airportRes.error) console.warn('reservation_airport 조회 오류:', airportRes.error);
            if (hotelRes.error) console.warn('reservation_hotel 조회 오류:', hotelRes.error);
            if (tourRes.error) console.warn('reservation_tour 조회 오류:', tourRes.error);
            if (rentcarRes.error) console.warn('reservation_rentcar 조회 오류:', rentcarRes.error);
            if (carRes.error) console.warn('reservation_car_sht 조회 오류:', carRes.error);

            // 크루즈/공항: 대체 키로 누락분 추가 조회
            let cruiseRows: any[] = cruiseRes.data || [];
            if (cruiseIds.length && cruiseRows.length < cruiseIds.length) {
                const foundIds = new Set(cruiseRows.map((r: any) => r.reservation_id));
                const missing = cruiseIds.filter(id => !foundIds.has(id));
                if (missing.length) {
                    const alt = await supabase
                        .from('reservation_cruise')
                        .select('*')
                        .in('re_id', missing);
                    if (!alt.error && alt.data) {
                        cruiseRows = cruiseRows.concat(alt.data);
                    }
                }
            }

            let airportRows: any[] = airportRes.data || [];
            if (airportIds.length && airportRows.length < airportIds.length) {
                const foundIds = new Set(airportRows.map((r: any) => r.reservation_id));
                const missing = airportIds.filter(id => !foundIds.has(id));
                if (missing.length) {
                    const alt = await supabase
                        .from('reservation_airport')
                        .select('*')
                        .in('ra_reservation_id', missing);
                    if (!alt.error && alt.data) {
                        airportRows = airportRows.concat(alt.data);
                    }
                }
            }

            const cruiseMap = new Map(cruiseRows.map((r: any) => [r.reservation_id || r.re_id, r]));
            const airportMap = new Map(airportRows.map((r: any) => [r.reservation_id || r.ra_reservation_id, r]));
            const hotelMap = new Map((hotelRes.data || []).map((r: any) => [r.reservation_id, r]));
            const tourMap = new Map((tourRes.data || []).map((r: any) => [r.reservation_id, r]));
            const rentcarMap = new Map((rentcarRes.data || []).map((r: any) => [r.reservation_id, r]));
            const carMap = new Map((carRes.data || []).map((r: any) => [r.reservation_id, r]));

            const detailedReservations = reservationsData.map((reservation) => {
                let serviceDetails: any = null;
                switch (reservation.re_type) {
                    case 'cruise':
                        serviceDetails = cruiseMap.get(reservation.re_id) || null;
                        break;
                    case 'airport':
                        serviceDetails = airportMap.get(reservation.re_id) || null;
                        break;
                    case 'hotel':
                        serviceDetails = hotelMap.get(reservation.re_id) || null;
                        break;
                    case 'tour':
                        serviceDetails = tourMap.get(reservation.re_id) || null;
                        break;
                    case 'rentcar':
                        serviceDetails = rentcarMap.get(reservation.re_id) || null;
                        break;
                    case 'car':
                        serviceDetails = carMap.get(reservation.re_id) || null;
                        break;
                }

                const customer = usersById.get(reservation.re_user_id) || null;
                return {
                    ...reservation,
                    user: customer,
                    customer_name: customer?.name || '고객명 없음',
                    customer_email: customer?.email || null,
                    customer_phone: customer?.phone_number || null,
                    service_details: serviceDetails,
                };
            });

            setReservations(detailedReservations);
        } catch (error) {
            console.error('예약 상세 정보 로딩 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const getServiceIcon = (type: string) => {
        switch (type) {
            case 'cruise': return <Ship className="w-5 h-5 text-blue-600" />;
            case 'airport': return <Plane className="w-5 h-5 text-green-600" />;
            case 'hotel': return <Building className="w-5 h-5 text-purple-600" />;
            case 'tour': return <MapPin className="w-5 h-5 text-orange-600" />;
            case 'rentcar': return <Car className="w-5 h-5 text-red-600" />;
            case 'car': return <Car className="w-5 h-5 text-amber-600" />;
            default: return <FileText className="w-5 h-5 text-gray-600" />;
        }
    };

    const getServiceName = (type: string) => {
        switch (type) {
            case 'cruise': return '크루즈';
            case 'airport': return '공항서비스';
            case 'hotel': return '호텔';
            case 'tour': return '투어';
            case 'rentcar': return '렌터카';
            case 'car': return '차량';
            default: return type;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'confirmed': return '확정';
            case 'pending': return '대기중';
            case 'cancelled': return '취소';
            default: return status;
        }
    };

    const handleViewDetails = async (reservation: any) => {
        let res = reservation;

        // 1) 상세 누락 시, 타입별 상세를 모달 직전에 재조회하여 연결
        if (!res?.service_details && res?.re_type === 'cruise' && res?.re_id) {
            let cruiseData: any = null;
            // reservation_id 우선
            const r1 = await supabase
                .from('reservation_cruise')
                .select('*')
                .eq('reservation_id', res.re_id)
                .maybeSingle();
            cruiseData = r1.data || null;
            // 대체키 re_id
            if (!cruiseData) {
                const r2 = await supabase
                    .from('reservation_cruise')
                    .select('*')
                    .eq('re_id', res.re_id)
                    .maybeSingle();
                cruiseData = r2.data || null;
            }
            // 패턴 매칭(최후 수단)
            if (!cruiseData) {
                const r3 = await supabase
                    .from('reservation_cruise')
                    .select('*')
                    .limit(1000);
                const all = r3.data || [];
                const shortId = String(res.re_id).slice(0, 8);
                cruiseData = all.find((row: any) =>
                    row?.reservation_id?.includes?.(shortId) ||
                    row?.re_id?.includes?.(shortId) ||
                    JSON.stringify(row).includes(shortId)
                ) || null;
            }

            if (cruiseData?.room_price_code) {
                const rp = await supabase
                    .from('room_price')
                    .select('*')
                    .eq('room_code', cruiseData.room_price_code)
                    .maybeSingle();
                const roomPriceData = rp.data || null;
                if (roomPriceData) {
                    cruiseData = {
                        ...cruiseData,
                        room_price_info: roomPriceData,
                        cruise_name: roomPriceData?.cruise || '크루즈명 없음',
                        room_name: roomPriceData?.room_category || '객실명 없음',
                        room_type: roomPriceData?.room_type || '객실타입 없음',
                    };
                }
            }

            if (cruiseData) {
                res = { ...res, service_details: cruiseData };
            }
        }

        // 2) 크루즈 room_price_info 지연 로드(이미 상세가 있을 때 보강)
        if (res?.re_type === 'cruise' && res?.service_details?.room_price_code && !res?.service_details?.room_price_info) {
            const { data: roomPriceData } = await supabase
                .from('room_price')
                .select('*')
                .eq('room_code', res.service_details.room_price_code)
                .maybeSingle();
            if (roomPriceData) {
                res = {
                    ...res,
                    service_details: {
                        ...res.service_details,
                        room_price_info: roomPriceData,
                        cruise_name: roomPriceData?.cruise || res.service_details?.cruise_name || '크루즈명 없음',
                        room_name: roomPriceData?.room_category || res.service_details?.room_name || '객실명 없음',
                        room_type: roomPriceData?.room_type || res.service_details?.room_type || '객실타입 없음',
                    }
                };
            }
        }

        setSelectedReservation(res);
        setShowDetails(true);
    };

    // 상세 데이터가 없을 때도 항상 표시되는 Fallback 상세 컴포넌트
    const FallbackServiceDetails = ({ reservation }: { reservation: any }) => {
        const [loading, setLoading] = React.useState(false);
        const [rawData, setRawData] = React.useState<any | null>(null);
        const [error, setError] = React.useState<string | null>(null);

        React.useEffect(() => {
            const run = async () => {
                try {
                    setLoading(true);
                    setError(null);
                    setRawData(null);

                    const type = reservation?.re_type;
                    const reId = reservation?.re_id;
                    const tableMap: Record<string, string> = {
                        cruise: 'reservation_cruise',
                        airport: 'reservation_airport',
                        hotel: 'reservation_hotel',
                        tour: 'reservation_tour',
                        rentcar: 'reservation_rentcar',
                        car: 'reservation_car_sht',
                    };

                    const table = tableMap[type];
                    if (!table || !reId) {
                        setError('유효한 서비스 타입 또는 예약 ID가 없습니다.');
                    } else {
                        // 1차: reservation_id
                        let { data, error } = await supabase
                            .from(table)
                            .select('*')
                            .eq('reservation_id', reId)
                            .maybeSingle();

                        // 2차: re_id, 또는 공항의 경우 ra_reservation_id
                        if (!data) {
                            const r2 = await supabase
                                .from(table)
                                .select('*')
                                .eq(type === 'airport' ? 'ra_reservation_id' : 're_id', reId)
                                .maybeSingle();
                            data = r2.data as any;
                            error = r2.error as any;
                        }

                        // 3차: 전체에서 패턴 매칭
                        if (!data) {
                            const r3 = await supabase
                                .from(table)
                                .select('*')
                                .limit(1000);
                            const all = r3.data || [];
                            const shortId = String(reId).slice(0, 8);
                            const found = all.find((row: any) =>
                                row?.reservation_id?.includes?.(shortId) ||
                                row?.re_id?.includes?.(shortId) ||
                                JSON.stringify(row).includes(shortId)
                            );
                            if (found) data = found;
                            if (r3.error) error = r3.error as any;
                        }

                        if (error) console.warn('Fallback 조회 경고:', error);
                        setRawData(data || null);
                    }
                } catch (e: any) {
                    setError(e?.message || '알 수 없는 오류');
                } finally {
                    setLoading(false);
                }
            };
            run();
        }, [reservation?.re_id, reservation?.re_type]);

        const renderGrid = (obj: any) => {
            if (!obj) return null;
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {Object.entries(obj).map(([k, v]) => (
                        <div key={k} className="flex">
                            <div className="w-40 text-gray-600">{k}</div>
                            <div className="flex-1 font-medium break-words">
                                {v === null || v === undefined
                                    ? '—'
                                    : typeof v === 'number' && String(k).toLowerCase().includes('price')
                                        ? `${v.toLocaleString()}동`
                                        : typeof v === 'object'
                                            ? JSON.stringify(v)
                                            : String(v)}
                            </div>
                        </div>
                    ))}
                </div>
            );
        };

        return (
            <div className="space-y-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                    <div className="font-semibold text-yellow-800">세부 데이터가 연결되지 않아 원시 데이터를 표시합니다.</div>
                    <div className="text-yellow-700">서비스 타입: {getServiceName(reservation?.re_type)} / 예약ID: <span className="font-mono">{reservation?.re_id}</span></div>
                </div>
                {loading && <div className="text-xs text-gray-500">원시 데이터 로딩 중...</div>}
                {error && <div className="text-xs text-red-600">오류: {error}</div>}
                {rawData ? (
                    <>
                        <div className="font-medium text-gray-700">서비스 원시 데이터</div>
                        {renderGrid(rawData)}
                    </>
                ) : (
                    <>
                        <div className="font-medium text-gray-700">예약 기본 정보</div>
                        {renderGrid(reservation)}
                    </>
                )}
            </div>
        );
    };


    // 가격 테이블 정보를 표시하는 별도 컴포넌트
    const PriceTableInfo = ({ serviceType, priceCode }: { serviceType: string; priceCode: string }) => {
        const [priceInfo, setPriceInfo] = React.useState<any>(null);
        const [loading, setLoading] = React.useState(false);

        React.useEffect(() => {
            if (priceCode) {
                setLoading(true);
                loadPriceDetails(serviceType, priceCode)
                    .then(data => {
                        setPriceInfo(data);
                        setLoading(false);
                    })
                    .catch(() => {
                        setLoading(false);
                    });
            } else {
                setPriceInfo(null);
            }
        }, [serviceType, priceCode]);

        const codeKey = (
            serviceType === 'cruise' ? 'room_code'
                : serviceType === 'airport' ? 'airport_code'
                    : serviceType === 'hotel' ? 'hotel_code'
                        : serviceType === 'tour' ? 'tour_code'
                            : serviceType === 'rentcar' ? 'rentcar_code'
                                : serviceType === 'car' ? 'car_code'
                                    : 'code'
        );

        const renderEntries = () => {
            if (loading) {
                return <div className="text-xs text-gray-500">가격 정보 로딩 중...</div>;
            }

            if (priceInfo) {
                return (
                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(priceInfo).map(([key, value]) => {
                            if (key === 'id' || key === 'created_at' || key === 'updated_at') return null;
                            return (
                                <div key={key}>
                                    <span className="text-gray-600">{key}:</span>
                                    <span className="ml-1 font-medium">
                                        {typeof value === 'number' && key.includes('price')
                                            ? `${value.toLocaleString()}동`
                                            : String(value || '')
                                        }
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                );
            }

            // Fallback: 서비스 타입별 기본 필드 구성(크루즈는 예시 양식 고정 표시)
            if (serviceType === 'cruise') {
                const fields: Record<string, any> = {
                    room_code: priceCode || '',
                    schedule: '',
                    room_category: '',
                    cruise: '',
                    room_type: '',
                    price: '',
                    start_date: '',
                    end_date: '',
                    payment: '',
                };
                return (
                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(fields).map(([key, value]) => (
                            <div key={key}>
                                <span className="text-gray-600">{key}:</span>
                                <span className="ml-1 font-medium">{String(value)}</span>
                            </div>
                        ))}
                    </div>
                );
            }

            // 기타 타입: 코드만 노출
            return (
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <span className="text-gray-600">{codeKey}:</span>
                        <span className="ml-1 font-medium">{priceCode || ''}</span>
                    </div>
                </div>
            );
        };

        return (
            <div className="mt-2 p-3 bg-white border rounded text-xs">
                <div className="font-medium text-gray-700 mb-2">📋 가격 테이블 정보</div>
                {renderEntries()}
            </div>
        );
    };

    const renderServiceDetails = (reservation: any) => {
        const details = reservation.service_details;

        if (!details) {
            return <FallbackServiceDetails reservation={reservation} />;
        }

        switch (reservation.re_type) {
            case 'cruise':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h5 className="font-semibold text-blue-600 border-b pb-2">🚢 크루즈 정보</h5>
                            <div><strong>크루즈명:</strong> <span className="text-blue-700 font-medium">{details.cruise_name || details.room_price_info?.cruise || ''}</span></div>
                            <div><strong>객실명:</strong> <span className="text-blue-700">{details.room_name || details.room_price_info?.room_category || ''}</span></div>
                            <div><strong>객실타입:</strong> <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">{details.room_type || details.room_price_info?.room_type || ''}</span></div>
                            <div><strong>체크인 날짜:</strong> {details.checkin ? new Date(details.checkin).toLocaleDateString('ko-KR') : '미정'}</div>
                            <div><strong>투숙객 수:</strong> <span className="font-semibold text-purple-600">{typeof details.guest_count === 'number' ? `${details.guest_count}명` : ''}</span></div>
                            <div><strong>객실 가격 코드:</strong> <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">{details.room_price_code || ''}</span></div>
                            <div><strong>탑승 지원:</strong> {details.boarding_assist || ''}</div>
                        </div>
                        <div className="space-y-3">
                            <h5 className="font-semibold text-green-600 border-b pb-2">💰 금액 정보</h5>
                            <div><strong>단가:</strong> <span className="text-lg text-orange-600">{details.unit_price?.toLocaleString()}동</span></div>
                            <div><strong>객실 총 금액:</strong> <span className="text-lg font-bold text-green-600">{details.room_total_price?.toLocaleString()}동</span></div>
                            <div><strong>생성일:</strong> {details.created_at ? new Date(details.created_at).toLocaleString('ko-KR') : '정보 없음'}</div>

                            <div className="mt-4">
                                <PriceTableInfo serviceType="cruise" priceCode={details.room_price_code} />
                            </div>

                            {/* 객실 상세 정보 섹션 제거됨 */}

                            {details.request_note && (
                                <div className="mt-4">
                                    <strong>요청사항:</strong>
                                    <div className="bg-gray-100 p-3 rounded mt-2 text-sm">{details.request_note}</div>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'car':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h5 className="font-semibold text-amber-600 border-b pb-2">🚐 차량 정보</h5>
                            <div><strong>차량 가격 코드:</strong> <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-sm">{details.car_price_code}</span></div>
                            <PriceTableInfo serviceType="car" priceCode={details.car_price_code} />
                            {details.vehicle_number && <div><strong>차량번호:</strong> {details.vehicle_number}</div>}
                            {details.seat_number && <div><strong>좌석 수:</strong> {details.seat_number}석</div>}
                            {details.color_label && <div><strong>색상:</strong> {details.color_label}</div>}
                            <div><strong>단가:</strong> {details.unit_price?.toLocaleString()}동</div>
                        </div>
                        <div className="space-y-3">
                            <h5 className="font-semibold text-blue-600 border-b pb-2">💰 금액 및 메모</h5>
                            <div><strong>총 금액:</strong> <span className="text-lg font-bold text-green-600">{details.total_price?.toLocaleString()}동</span></div>
                            <div><strong>생성일:</strong> {details.created_at ? new Date(details.created_at).toLocaleString('ko-KR') : '정보 없음'}</div>
                            {details.request_note && (
                                <div className="mt-4">
                                    <strong>요청사항:</strong>
                                    <div className="bg-gray-100 p-3 rounded mt-2 text-sm">{details.request_note}</div>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'airport':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h5 className="font-semibold text-green-600 border-b pb-2">✈️ 공항 정보</h5>
                            <div><strong>공항 위치:</strong> <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">{details.ra_airport_location}</span></div>
                            <div><strong>항공편 번호:</strong> {details.ra_flight_number || '미정'}</div>
                            <div><strong>출발/도착 일시:</strong> {details.ra_datetime ? new Date(details.ra_datetime).toLocaleString('ko-KR') : '미정'}</div>
                            <div><strong>가격 코드:</strong> <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">{details.airport_price_code}</span></div>
                            <PriceTableInfo serviceType="airport" priceCode={details.airport_price_code} />
                            {details.ra_stopover_location && <div><strong>경유지:</strong> {details.ra_stopover_location}</div>}
                            {details.ra_stopover_wait_minutes && <div><strong>경유 대기시간:</strong> {details.ra_stopover_wait_minutes}분</div>}
                        </div>
                        <div className="space-y-3">
                            <h5 className="font-semibold text-blue-600 border-b pb-2">🚗 차량 및 인원</h5>
                            <div><strong>승객 수:</strong> {details.ra_passenger_count}명</div>
                            <div><strong>차량 수:</strong> {details.ra_car_count}대</div>
                            <div><strong>수하물 개수:</strong> {details.ra_luggage_count}개</div>
                            <div><strong>단가:</strong> {details.unit_price?.toLocaleString()}동</div>
                            <div><strong>총 금액:</strong> <span className="text-lg font-bold text-green-600">{details.total_price?.toLocaleString()}동</span></div>
                            <div><strong>처리 상태:</strong> {details.ra_is_processed || '미처리'}</div>
                            {details.request_note && (
                                <div className="mt-4">
                                    <strong>요청사항:</strong>
                                    <div className="bg-gray-100 p-3 rounded mt-2 text-sm">{details.request_note}</div>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'hotel':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h5 className="font-semibold text-purple-600 border-b pb-2">🏨 호텔 정보</h5>
                            <div><strong>체크인 날짜:</strong> {details.checkin_date ? new Date(details.checkin_date).toLocaleDateString('ko-KR') : '미정'}</div>
                            <div><strong>호텔 카테고리:</strong> <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">{details.hotel_category}</span></div>
                            <div><strong>호텔 가격 코드:</strong> <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">{details.hotel_price_code}</span></div>
                            <PriceTableInfo serviceType="hotel" priceCode={details.hotel_price_code} />
                            <div><strong>일정:</strong> {details.schedule || '정보 없음'}</div>
                            {details.breakfast_service && <div><strong>조식 서비스:</strong> {details.breakfast_service}</div>}
                        </div>
                        <div className="space-y-3">
                            <h5 className="font-semibold text-blue-600 border-b pb-2">🛏️ 객실 및 금액</h5>
                            <div><strong>투숙객 수:</strong> {details.guest_count}명</div>
                            <div><strong>객실 수:</strong> {details.room_count}개</div>
                            <div><strong>총 금액:</strong> <span className="text-lg font-bold text-green-600">{details.total_price?.toLocaleString()}동</span></div>
                            <div><strong>생성일:</strong> {details.created_at ? new Date(details.created_at).toLocaleString('ko-KR') : '정보 없음'}</div>
                            {details.request_note && (
                                <div className="mt-4">
                                    <strong>요청사항:</strong>
                                    <div className="bg-gray-100 p-3 rounded mt-2 text-sm">{details.request_note}</div>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'tour':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h5 className="font-semibold text-orange-600 border-b pb-2">🗺️ 투어 정보</h5>
                            <div><strong>투어 가격 코드:</strong> <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm">{details.tour_price_code}</span></div>
                            <PriceTableInfo serviceType="tour" priceCode={details.tour_price_code} />
                            <div><strong>참가 인원:</strong> {details.tour_capacity}명</div>
                            <div><strong>픽업 장소:</strong> {details.pickup_location || '미정'}</div>
                            <div><strong>드롭오프 장소:</strong> {details.dropoff_location || '미정'}</div>
                        </div>
                        <div className="space-y-3">
                            <h5 className="font-semibold text-green-600 border-b pb-2">💰 금액 정보</h5>
                            <div><strong>총 금액:</strong> <span className="text-lg font-bold text-green-600">{details.total_price?.toLocaleString()}동</span></div>
                            <div><strong>생성일:</strong> {details.created_at ? new Date(details.created_at).toLocaleString('ko-KR') : '정보 없음'}</div>
                            {details.request_note && (
                                <div className="mt-4">
                                    <strong>요청사항:</strong>
                                    <div className="bg-gray-100 p-3 rounded mt-2 text-sm">{details.request_note}</div>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'rentcar':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h5 className="font-semibold text-red-600 border-b pb-2">🚗 렌터카 정보</h5>
                            <div><strong>렌터카 가격 코드:</strong> <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">{details.rentcar_price_code}</span></div>
                            <PriceTableInfo serviceType="rentcar" priceCode={details.rentcar_price_code} />
                            <div><strong>렌터카 수:</strong> {details.rentcar_count}대</div>
                            <div><strong>차량 수:</strong> {details.car_count || '정보 없음'}대</div>
                            <div><strong>단가:</strong> {details.unit_price?.toLocaleString()}동</div>
                            <div><strong>픽업 일시:</strong> {details.pickup_datetime ? new Date(details.pickup_datetime).toLocaleString('ko-KR') : '미정'}</div>
                        </div>
                        <div className="space-y-3">
                            <h5 className="font-semibold text-blue-600 border-b pb-2">📍 이동 경로 및 승객</h5>
                            <div><strong>승객 수:</strong> {details.passenger_count}명</div>
                            <div><strong>픽업 장소:</strong> {details.pickup_location || '미정'}</div>
                            <div><strong>목적지:</strong> {details.destination || '미정'}</div>
                            {details.via_location && <div><strong>경유지:</strong> {details.via_location}</div>}
                            {details.via_waiting && <div><strong>경유 대기:</strong> {details.via_waiting}</div>}
                            <div><strong>수하물 개수:</strong> {details.luggage_count}개</div>
                            <div><strong>총 금액:</strong> <span className="text-lg font-bold text-green-600">{details.total_price?.toLocaleString()}동</span></div>
                            <div><strong>생성일:</strong> {details.created_at ? new Date(details.created_at).toLocaleString('ko-KR') : '정보 없음'}</div>
                            {details.request_note && (
                                <div className="mt-4">
                                    <strong>요청사항:</strong>
                                    <div className="bg-gray-100 p-3 rounded mt-2 text-sm">{details.request_note}</div>
                                </div>
                            )}
                        </div>
                    </div>
                );

            default:
                return <p className="text-gray-500">알 수 없는 서비스 타입</p>;
        }
    };

    const filteredReservations = reservations.filter(reservation => {
        const matchesSearch = searchQuery === '' ||
            reservation.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            reservation.customer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            reservation.re_id.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'all' || reservation.re_status === statusFilter;
        const matchesType = typeFilter === 'all' || reservation.re_type === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
    });

    if (loading) {
        return (
            <ManagerLayout title="예약 상세 정보" activeTab="reservation-details">
                <div className="flex justify-center items-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="mt-4 text-gray-600">예약 상세 정보를 불러오는 중...</p>
                    </div>
                </div>
            </ManagerLayout>
        );
    }

    return (
        <ManagerLayout title="예약 상세 정보" activeTab="reservation-details">
            <div className="space-y-6">

                {/* 검색 및 필터 */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="고객명, 이메일, 예약ID로 검색..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">모든 상태</option>
                                <option value="pending">대기중</option>
                                <option value="confirmed">확정</option>
                                <option value="cancelled">취소</option>
                            </select>

                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">모든 서비스</option>
                                <option value="cruise">크루즈</option>
                                <option value="airport">공항서비스</option>
                                <option value="hotel">호텔</option>
                                <option value="tour">투어</option>
                                <option value="rentcar">렌터카</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 예약 목록 */}
                <div className="bg-white rounded-lg shadow-md">
                    <div className="p-6 border-b">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <FileText className="w-6 h-6 text-blue-600" />
                            예약 상세 목록 ({filteredReservations.length}건)
                        </h3>
                    </div>

                    {filteredReservations.length === 0 ? (
                        <div className="p-8 text-center">
                            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-600 mb-2">예약 정보가 없습니다</h3>
                            <p className="text-gray-500">검색 조건을 변경해보세요.</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {filteredReservations.map((reservation) => (
                                <div key={reservation.re_id} className="p-6 hover:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {getServiceIcon(reservation.re_type)}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <h4 className="font-semibold text-lg">
                                                        {getServiceName(reservation.re_type)} - {reservation.customer_name}
                                                    </h4>
                                                    <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(reservation.re_status)}`}>
                                                        {getStatusText(reservation.re_status)}
                                                    </span>
                                                </div>

                                                <div className="flex gap-6 text-sm text-gray-600 mt-2">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-4 h-4" />
                                                        {new Date(reservation.re_created_at).toLocaleDateString('ko-KR')}
                                                    </span>

                                                    {reservation.customer_email && (
                                                        <span className="flex items-center gap-1">
                                                            <Mail className="w-4 h-4" />
                                                            {reservation.customer_email}
                                                        </span>
                                                    )}

                                                    {reservation.customer_phone && (
                                                        <span className="flex items-center gap-1">
                                                            <Phone className="w-4 h-4" />
                                                            {reservation.customer_phone}
                                                        </span>
                                                    )}

                                                    <span className="text-blue-600">
                                                        ID: {reservation.re_id.slice(0, 8)}...
                                                    </span>
                                                </div>

                                                {/* 서비스별 간단 정보 */}
                                                <div className="mt-2 text-sm text-gray-500 flex flex-wrap gap-4">
                                                    {reservation.service_details && (
                                                        <>
                                                            {reservation.re_type === 'cruise' && (
                                                                <>
                                                                    <span>
                                                                        체크인: {reservation.service_details.checkin
                                                                            ? new Date(reservation.service_details.checkin).toLocaleDateString('ko-KR')
                                                                            : '미정'}
                                                                    </span>
                                                                    {(reservation.service_details.cruise_name || reservation.service_details.room_price_info?.cruise) && (
                                                                        <span>
                                                                            크루즈: {reservation.service_details.cruise_name || reservation.service_details.room_price_info?.cruise}
                                                                        </span>
                                                                    )}
                                                                    {(reservation.service_details.room_name || reservation.service_details.room_price_info?.room_category) && (
                                                                        <span>
                                                                            객실: {reservation.service_details.room_name || reservation.service_details.room_price_info?.room_category}
                                                                        </span>
                                                                    )}
                                                                </>
                                                            )}
                                                            {reservation.re_type === 'airport' && reservation.service_details.ra_airport_location && (
                                                                <span>공항: {reservation.service_details.ra_airport_location}</span>
                                                            )}
                                                            {reservation.re_type === 'hotel' && reservation.service_details.hotel_category && (
                                                                <span>호텔: {reservation.service_details.hotel_category}</span>
                                                            )}
                                                            {reservation.re_type === 'tour' && reservation.service_details.pickup_location && (
                                                                <span>픽업: {reservation.service_details.pickup_location}</span>
                                                            )}
                                                            {reservation.re_type === 'rentcar' && reservation.service_details.pickup_location && (
                                                                <span>픽업: {reservation.service_details.pickup_location}</span>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleViewDetails(reservation)}
                                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                                            >
                                                <Eye className="w-4 h-4" />
                                                상세보기
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 상세 정보 모달 */}
                {showDetails && selectedReservation && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-semibold flex items-center gap-2">
                                        {getServiceIcon(selectedReservation.re_type)}
                                        {getServiceName(selectedReservation.re_type)} 예약 상세정보
                                    </h3>
                                    <button
                                        onClick={() => setShowDetails(false)}
                                        className="text-gray-400 hover:text-gray-600 text-2xl"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* 통합 정보 카드들 */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* 예약자 정보 */}
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                        <h4 className="text-md font-semibold text-blue-800 mb-3 flex items-center">
                                            <User className="w-4 h-4 mr-2" />
                                            예약자 정보
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <div><strong>이름:</strong> {selectedReservation.customer_name}</div>
                                            <div><strong>이메일:</strong> {selectedReservation.customer_email || '정보 없음'}</div>
                                            <div><strong>전화번호:</strong> {selectedReservation.customer_phone || '정보 없음'}</div>
                                            {selectedReservation.user?.role && (
                                                <div><strong>역할:</strong> <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">{selectedReservation.user.role}</span></div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 예약 기본 정보 */}
                                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                        <h4 className="text-md font-semibold text-green-800 mb-3 flex items-center">
                                            <FileText className="w-4 h-4 mr-2" />
                                            예약 기본 정보
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <div><strong>예약 ID:</strong> <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{selectedReservation.re_id}</span></div>
                                            <div><strong>견적 ID:</strong> {selectedReservation.re_quote_id || '정보 없음'}</div>
                                            <div><strong>서비스 타입:</strong> <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">{getServiceName(selectedReservation.re_type)}</span></div>
                                            <div><strong>예약일:</strong> {new Date(selectedReservation.re_created_at).toLocaleDateString('ko-KR')}</div>
                                        </div>
                                    </div>

                                    {/* 상태 및 관리 */}
                                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                        <h4 className="text-md font-semibold text-purple-800 mb-3 flex items-center">
                                            <Calendar className="w-4 h-4 mr-2" />
                                            처리 상태
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <div><strong>현재 상태:</strong>
                                                <span className={`ml-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedReservation.re_status)}`}>
                                                    {getStatusText(selectedReservation.re_status)}
                                                </span>
                                            </div>
                                            <div><strong>등록일시:</strong> {new Date(selectedReservation.re_created_at).toLocaleString('ko-KR')}</div>
                                            <div><strong>최종 수정:</strong> {selectedReservation.re_updated_at ? new Date(selectedReservation.re_updated_at).toLocaleString('ko-KR') : '수정 없음'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* 서비스별 상세 정보 - 전체 폭 사용 */}
                                <div className="bg-gray-50 p-4 rounded-lg border">
                                    <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                        {getServiceIcon(selectedReservation.re_type)}
                                        {getServiceName(selectedReservation.re_type)} 서비스 상세 정보
                                    </h4>
                                    {renderServiceDetails(selectedReservation)}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ManagerLayout>
    );
}
