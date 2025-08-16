'use client';

import React, { useState, useEffect } from 'react';
import ManagerLayout from '@/components/ManagerLayout';
import supabase from '@/lib/supabase';
import {
    Ship,
    Plane,
    Building,
    MapPin,
    Car,
    Calendar,
    Search,
    Eye,
    User,
    Package
} from 'lucide-react';

interface ServiceData {
    id: string;
    [key: string]: any;
}

interface RoomPriceInfo {
    room_code: string;
    name: string;
}

export default function ManagerServiceTablesPage() {
    const [activeTab, setActiveTab] = useState('cruise');
    const [serviceData, setServiceData] = useState<ServiceData[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadError, setLoadError] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<ServiceData | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [roomPriceMap, setRoomPriceMap] = useState<Record<string, { cruise: string; room_type: string; name: string }>>({});
    const [carPriceMap, setCarPriceMap] = useState<Record<string, { car_type?: string }>>({});
    // 상태: 공항 가격 테이블 맵 추가
    const [airportPriceMap, setAirportPriceMap] = useState<Record<string, { category?: string; route?: string; car_type?: string }>>({});

    const serviceTabs = [
        { id: 'cruise', label: '크루즈', icon: <Ship className="w-4 h-4" />, color: 'blue' },
        { id: 'cruise_car', label: '크루즈 차량', icon: <Car className="w-4 h-4" />, color: 'cyan' },
        { id: 'sht_car', label: '스하 차량', icon: <Car className="w-4 h-4" />, color: 'teal' },
        { id: 'airport', label: '공항서비스', icon: <Plane className="w-4 h-4" />, color: 'green' },
        { id: 'hotel', label: '호텔', icon: <Building className="w-4 h-4" />, color: 'purple' },
        { id: 'tour', label: '투어', icon: <MapPin className="w-4 h-4" />, color: 'orange' },
        { id: 'rentcar', label: '렌터카', icon: <Car className="w-4 h-4" />, color: 'red' }
    ];

    // 서비스별 데이터 로드 (중첩 embed 회피: 서비스 → 예약 → 사용자 순으로 별도 조회 후 병합)
    const loadServiceData = async (serviceType: string) => {
        setLoading(true);
        setLoadError(null);
        try {
            let tableName = '';
            // 서비스별 기본 정렬 키 후보
            const orderCandidates: string[] = [];

            switch (serviceType) {
                case 'cruise':
                    tableName = 'reservation_cruise';
                    orderCandidates.push('created_at', 'checkin', 'id');
                    break;
                case 'cruise_car':
                    tableName = 'reservation_cruise_car';
                    orderCandidates.push('created_at', 'id');
                    break;
                case 'sht_car':
                    tableName = 'reservation_car_sht';
                    orderCandidates.push('created_at', 'id');
                    break;
                case 'airport':
                    tableName = 'reservation_airport';
                    orderCandidates.push('ra_datetime', 'created_at', 'id');
                    break;
                case 'hotel':
                    tableName = 'reservation_hotel';
                    orderCandidates.push('checkin_date', 'created_at', 'id');
                    break;
                case 'tour':
                    tableName = 'reservation_tour';
                    orderCandidates.push('created_at', 'id');
                    break;
                case 'rentcar':
                    tableName = 'reservation_rentcar';
                    orderCandidates.push('pickup_datetime', 'created_at', 'id');
                    break;
                default:
                    return;
            }

            // 1) 서비스 행만 먼저 조회
            let serviceRows: any[] = [];
            let lastError: any = null;
            for (const col of orderCandidates) {
                const { data, error } = await supabase.from(tableName).select('*').order(col as any, { ascending: false });
                if (!error) {
                    serviceRows = data || [];
                    lastError = null;
                    break;
                } else {
                    lastError = error;
                    console.warn(`[${serviceType}] ${col} 정렬 실패, 다음 후보 시도:`, error.message || error);
                }
            }
            if (!serviceRows.length && lastError) {
                // 마지막으로 정렬 없이 재시도
                const { data, error } = await supabase.from(tableName).select('*');
                if (error) {
                    setLoadError(error.message || '데이터 로딩 실패');
                    setServiceData([]);
                    setLoading(false);
                    return;
                }
                serviceRows = data || [];
            }

            if (serviceRows.length === 0) {
                setServiceData([]);
                setLoading(false);
                return;
            }

            // 2) 예약 정보 일괄 조회
            const reservationIds = Array.from(new Set(serviceRows.map(r => r.reservation_id).filter(Boolean)));
            let reservationMap: Record<string, any> = {};
            if (reservationIds.length) {
                const { data: reservations, error: resErr } = await supabase
                    .from('reservation')
                    .select('re_id, re_user_id, re_status, re_created_at')
                    .in('re_id', reservationIds);
                if (resErr) {
                    console.warn(`[${serviceType}] 예약 조회 실패:`, resErr.message || resErr);
                } else if (reservations) {
                    reservationMap = (reservations as any[]).reduce((acc, r) => {
                        acc[r.re_id] = r;
                        return acc;
                    }, {} as Record<string, any>);
                }
            }

            // 3) 사용자 정보 일괄 조회 (예약에서 사용자ID 수집)
            const userIds = Array.from(new Set(Object.values(reservationMap).map((r: any) => r.re_user_id).filter(Boolean)));
            let userMap: Record<string, any> = {};
            if (userIds.length) {
                const { data: users, error: userErr } = await supabase
                    .from('users')
                    .select('id, name, email, phone_number')
                    .in('id', userIds);
                if (userErr) {
                    console.warn(`[${serviceType}] 사용자 조회 실패:`, userErr.message || userErr);
                } else if (users) {
                    userMap = (users as any[]).reduce((acc, u) => {
                        acc[u.id] = {
                            id: u.id,
                            name: u.name || (u.email ? u.email.split('@')[0] : '사용자'),
                            email: u.email,
                            phone: u.phone_number || '',
                        };
                        return acc;
                    }, {} as Record<string, any>);
                }
            }

            // 4) 병합: 각 서비스 행에 reservation, users 연결
            const merged = serviceRows.map(row => {
                const res = reservationMap[row.reservation_id];
                const user = res ? userMap[res.re_user_id] : undefined;
                return {
                    ...row,
                    reservation: res ? { ...res, users: user } : undefined
                } as ServiceData;
            });

            setServiceData(merged);
        } catch (error) {
            console.error('서비스 데이터 로딩 실패:', error);
            setLoadError((error as any)?.message || '데이터 로딩 실패');
            setServiceData([]);
        } finally {
            setLoading(false);
        }
    };

    // 탭 변경시 데이터 로드
    useEffect(() => {
        loadServiceData(activeTab);
    }, [activeTab]);

    // 객실 가격 테이블(room_price)에서 객실명, 크루즈, 객실타입 맵 로드
    useEffect(() => {
        async function fetchRoomPriceMap() {
            // 컬럼명: room_code, cruise, room_type, room_category
            const { data, error } = await supabase
                .from('room_price')
                .select('room_code, cruise, room_type, room_category');
            if (!error && data) {
                // room_code → {cruise, room_type, name} 맵 생성 (name은 room_category 사용)
                const map: Record<string, { cruise: string; room_type: string; name: string }> = {};
                data.forEach((row: any) => {
                    if (row.room_code) {
                        map[row.room_code] = {
                            cruise: row.cruise || '-',
                            room_type: row.room_type || '-',
                            name: row.room_category || '-' // 객실명은 room_category 컬럼 사용
                        };
                    }
                });
                setRoomPriceMap(map);
            }
        }
        fetchRoomPriceMap();
    }, []); // ← activeTab 의존성 제거, 최초 1회만 로드

    // 차량 가격 테이블(car_price)에서 차량코드별 차량타입(차량명) 맵 로드
    useEffect(() => {
        async function fetchCarPriceMap() {
            const { data, error } = await supabase
                .from('car_price')
                .select('car_code, car_type');
            if (!error && data) {
                const map: Record<string, { car_type?: string }> = {};
                data.forEach((row: any) => {
                    if (row.car_code) {
                        map[row.car_code] = { car_type: row.car_type || '-' };
                    }
                });
                setCarPriceMap(map);
            }
        }
        fetchCarPriceMap();
    }, []);

    // 공항 가격 테이블(airport_price)에서 가격코드별 정보 맵 로드 (실제 DB 컬럼명 사용)
    useEffect(() => {
        async function fetchAirportPriceMap() {
            const { data, error } = await supabase
                .from('airport_price')
                .select('airport_code, airport_category, airport_route, airport_car_type');
            if (!error && data) {
                const map: Record<string, { category?: string; route?: string; car_type?: string }> = {};
                data.forEach((row: any) => {
                    if (row.airport_code) {
                        map[row.airport_code] = {
                            category: row.airport_category || '-',
                            route: row.airport_route || '-',
                            car_type: row.airport_car_type || '-'
                        };
                    }
                });
                setAirportPriceMap(map);
            }
        }
        fetchAirportPriceMap();
    }, []);

    // 검색 필터링
    const filteredData = serviceData.filter(item => {
        if (activeTab === 'sht_car') {
            // 오늘 이후 사용일자만 표시 (usage_date가 오늘 이후)
            if (!item.usage_date) return false;
            const usageDate = new Date(item.usage_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (usageDate < today) return false;
        }

        if (!searchTerm) return true;

        const searchLower = searchTerm.toLowerCase();
        const userName = item.reservation?.users?.name?.toLowerCase() || '';
        const userEmail = item.reservation?.users?.email?.toLowerCase() || '';
        const reservationId = item.reservation?.re_id?.toLowerCase() || '';

        return userName.includes(searchLower) ||
            userEmail.includes(searchLower) ||
            reservationId.includes(searchLower);
    });

    // 크루즈 체크인별 그룹화 함수 (오늘 이후만)
    const groupCruiseByCheckin = (data: ServiceData[]) => {
        // 오늘 이후 체크인만
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const filtered = data.filter(item => {
            if (!item.checkin) return false;
            const checkinDate = new Date(item.checkin);
            return checkinDate >= today;
        });

        // 체크인 날짜별 그룹화 (오름차순)
        const groups: Record<string, ServiceData[]> = {};
        filtered.forEach(item => {
            const date = item.checkin ? new Date(item.checkin).toISOString().slice(0, 10) : '미지정';
            if (!groups[date]) groups[date] = [];
            groups[date].push(item);
        });

        const sortedKeys = Object.keys(groups).sort((a, b) => a.localeCompare(b));
        return sortedKeys.map(key => ({
            groupKey: key,
            date: key,
            items: groups[key]
        }));
    };

    // 크루즈 탭일 때만 그룹화 데이터 사용
    const isCruiseTab = activeTab === 'cruise';
    const groupedCruise = isCruiseTab ? groupCruiseByCheckin(serviceData) : [];

    // 서비스별 테이블 컬럼 정의
    const getTableColumns = (serviceType: string) => {
        switch (serviceType) {
            case 'cruise':
                return [
                    { key: 'reservation.users.name', label: '고객명', width: 'w-32' },
                    { key: 'reservation.users.email', label: '이메일', width: 'w-48' },
                    { key: 'checkin', label: '체크인', width: 'w-32', type: 'date' },
                    { key: 'room_price_code', label: '객실코드', width: 'w-32' },
                    { key: 'cruise_name', label: '크루즈', width: 'w-40' }, // 크루즈명
                    { key: 'room_type_name', label: '객실타입', width: 'w-40' }, // 객실타입명
                    { key: 'room_name', label: '구분', width: 'w-40' }, // 객실명 추가
                    { key: 'guest_count', label: '인원', width: 'w-20' },
                    { key: 'room_total_price', label: '총금액', width: 'w-32', type: 'price' },
                    { key: 'reservation.re_status', label: '상태', width: 'w-24', type: 'status' }
                ];
            case 'cruise_car':
                return [
                    { key: 'reservation.users.name', label: '고객명', width: 'w-32' },
                    { key: 'reservation.users.email', label: '이메일', width: 'w-48' },
                    { key: 'car_price_code', label: '차량코드', width: 'w-32' },
                    { key: 'car_type_name', label: '차량명', width: 'w-32' }, // 차량명(차량타입) 추가
                    { key: 'pickup_location', label: '픽업장소', width: 'w-40' },
                    { key: 'dropoff_location', label: '드롭장소', width: 'w-40' },
                    { key: 'pickup_datetime', label: '픽업일시', width: 'w-40', type: 'datetime' },
                    { key: 'unit_price', label: '단가', width: 'w-32', type: 'price' },
                    { key: 'reservation.re_status', label: '상태', width: 'w-24', type: 'status' }
                ];
            case 'sht_car':
                return [

                    { key: 'usage_date', label: '사용일자', width: 'w-32', type: 'date' }, // 사용일자(usage_date)
                    { key: 'sht_category', label: '카테고리', width: 'w-24' }, // 카테고리(sht_category)
                    { key: 'vehicle_number', label: '차량번호', width: 'w-32' },
                    { key: 'seat_number', label: '좌석번호', width: 'w-20' },
                    { key: 'reservation.users.name', label: '고객명', width: 'w-32' },
                    { key: 'reservation.users.email', label: '이메일', width: 'w-48' },
                    { key: 'reservation.re_status', label: '상태', width: 'w-24', type: 'status' }
                ];
            case 'airport':
                return [
                    { key: 'reservation.users.name', label: '고객명', width: 'w-32' },
                    { key: 'reservation.users.email', label: '이메일', width: 'w-48' },
                    { key: 'airport_price_code', label: '코드', width: 'w-32' }, // 공항 가격 코드 추가
                    { key: 'airport_category', label: '구분', width: 'w-24' }, // 공항카테고리
                    { key: 'airport_route', label: '경로', width: 'w-40' },   // 경로
                    { key: 'airport_car_type', label: '차량', width: 'w-32' }, // 차량타입
                    { key: 'ra_airport_location', label: '공항', width: 'w-42' },
                    { key: 'ra_datetime', label: '일시', width: 'w-60', type: 'datetime' },
                    { key: 'ra_passenger_count', label: '승객', width: 'w-10' },
                    { key: 'ra_car_count', label: '차량', width: 'w-10' },
                    { key: 'total_price', label: '총금액', width: 'w-32', type: 'price' },
                    { key: 'reservation.re_status', label: '상태', width: 'w-24', type: 'status' }
                ];
            case 'hotel':
                return [
                    { key: 'reservation.users.name', label: '고객명', width: 'w-32' },
                    { key: 'reservation.users.email', label: '이메일', width: 'w-48' },
                    { key: 'checkin_date', label: '체크인', width: 'w-32', type: 'date' },
                    { key: 'guest_count', label: '인원', width: 'w-20' },
                    { key: 'room_count', label: '객실수', width: 'w-20' },
                    { key: 'hotel_category', label: '호텔등급', width: 'w-32' },
                    { key: 'total_price', label: '총금액', width: 'w-32', type: 'price' },
                    { key: 'reservation.re_status', label: '상태', width: 'w-24', type: 'status' }
                ];
            case 'tour':
                return [
                    { key: 'reservation.users.name', label: '고객명', width: 'w-32' },
                    { key: 'reservation.users.email', label: '이메일', width: 'w-48' },
                    { key: 'tour_price_code', label: '투어코드', width: 'w-32' },
                    { key: 'tour_capacity', label: '참가인원', width: 'w-24' },
                    { key: 'pickup_location', label: '픽업장소', width: 'w-40' },
                    { key: 'total_price', label: '총금액', width: 'w-32', type: 'price' },
                    { key: 'reservation.re_status', label: '상태', width: 'w-24', type: 'status' },
                    { key: 'created_at', label: '등록일', width: 'w-40', type: 'datetime' }
                ];
            case 'rentcar':
                return [
                    { key: 'reservation.users.name', label: '고객명', width: 'w-32' },
                    { key: 'reservation.users.email', label: '이메일', width: 'w-48' },
                    { key: 'pickup_datetime', label: '픽업일시', width: 'w-40', type: 'datetime' },
                    { key: 'passenger_count', label: '승객수', width: 'w-20' },
                    { key: 'pickup_location', label: '픽업장소', width: 'w-40' },
                    { key: 'destination', label: '목적지', width: 'w-40' },
                    { key: 'total_price', label: '총금액', width: 'w-32', type: 'price' },
                    { key: 'reservation.re_status', label: '상태', width: 'w-24', type: 'status' }
                ];
            default:
                return [];
        }
    };

    // 값 포맷팅 (크루즈명, 객실타입명, 객실명 처리)
    const formatValue = (value: any, type?: string, row?: any, columnKey?: string) => {
        // 공항 서비스 매핑 - airport_price_code로 airport_price 테이블 검색
        if (columnKey === 'airport_category') {
            const code = row?.airport_price_code;
            return code && airportPriceMap[code] ? airportPriceMap[code].category : '-';
        }
        if (columnKey === 'airport_route') {
            const code = row?.airport_price_code;
            return code && airportPriceMap[code] ? airportPriceMap[code].route : '-';
        }
        if (columnKey === 'airport_car_type') {
            const code = row?.airport_price_code;
            return code && airportPriceMap[code] ? airportPriceMap[code].car_type : '-';
        }

        // 차량 서비스 매핑
        if (columnKey === 'car_type_name') {
            const code = row?.car_price_code;
            return code && carPriceMap[code] ? carPriceMap[code].car_type : '-';
        }

        // 크루즈 서비스 매핑
        if (columnKey === 'cruise_name') {
            const code = row?.room_price_code;
            return code && roomPriceMap[code] ? roomPriceMap[code].cruise : '-';
        }
        if (columnKey === 'room_type_name') {
            const code = row?.room_price_code;
            return code && roomPriceMap[code] ? roomPriceMap[code].room_type : '-';
        }
        if (columnKey === 'room_name') {
            const code = row?.room_price_code;
            return code && roomPriceMap[code] ? roomPriceMap[code].name : '-';
        }

        if (!value && value !== 0) return '-';

        switch (type) {
            case 'date':
                return new Date(value).toLocaleDateString('ko-KR');
            case 'datetime':
                return new Date(value).toLocaleString('ko-KR');
            case 'price':
                return `${value.toLocaleString()}원`;
            case 'status':
                return getStatusBadge(value);
            default:
                return value;
        }
    };

    // 상태 배지
    const getStatusBadge = (status: string) => {
        const statusConfig = {
            'confirmed': { bg: 'bg-green-100', text: 'text-green-800', label: '확정' },
            'pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '대기중' },
            'cancelled': { bg: 'bg-red-100', text: 'text-red-800', label: '취소' }
        };

        const config = statusConfig[status as keyof typeof statusConfig] ||
            { bg: 'bg-gray-100', text: 'text-gray-800', label: status };

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                {config.label}
            </span>
        );
    };

    // 중첩 객체 값 가져오기
    const getNestedValue = (obj: any, path: string) => {
        return path.split('.').reduce((o, p) => o?.[p], obj);
    };

    // 상세 정보 표시를 위한 매핑 함수 수정
    const getEnhancedServiceDetails = (item: ServiceData, serviceType: string) => {
        const details: Record<string, any> = { ...item };

        switch (serviceType) {
            case 'cruise':
                const roomCode = item.room_price_code;
                if (roomCode && roomPriceMap[roomCode]) {
                    details['크루즈명'] = roomPriceMap[roomCode].cruise;
                    details['객실타입'] = roomPriceMap[roomCode].room_type;
                    details['객실구분'] = roomPriceMap[roomCode].name;
                }
                break;

            case 'cruise_car':
                const carCode = item.car_price_code;
                if (carCode && carPriceMap[carCode]) {
                    details['차량타입'] = carPriceMap[carCode].car_type;
                }
                break;

            case 'airport':
                const airportCode = item.airport_price_code;
                if (airportCode && airportPriceMap[airportCode]) {
                    details['공항카테고리'] = airportPriceMap[airportCode].category;
                    details['공항경로'] = airportPriceMap[airportCode].route;
                    details['공항차량타입'] = airportPriceMap[airportCode].car_type;
                }
                break;
        }

        return details;
    };

    // 상세 보기
    const handleViewDetails = (item: ServiceData) => {
        setSelectedItem(item);
        setShowDetails(true);
    };

    const currentTab = serviceTabs.find(tab => tab.id === activeTab);

    if (loading) {
        return (
            <ManagerLayout title="서비스별 조회" activeTab="service-tables">
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
                </div>
            </ManagerLayout>
        );
    }

    // sht_car(스하차량) 사용일자+카테고리 기준 그룹화
    const groupShtCarByDateAndCategory = (data: ServiceData[]) => {
        // 사용일자(usage_date), 카테고리(sht_category) 기준 그룹화
        const groups: Record<string, ServiceData[]> = {};
        data.forEach(item => {
            const date = item.usage_date ? new Date(item.usage_date).toISOString().slice(0, 10) : '미지정';
            const category = item.sht_category || '미지정';
            const key = `${date}__${category}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });

        // 사용일자 오름차순, 같은 날짜 내에서는 픽업이 위로 오도록 정렬
        const sortedKeys = Object.keys(groups).sort((a, b) => {
            const [dateA, catA] = a.split('__');
            const [dateB, catB] = b.split('__');
            if (dateA !== dateB) return dateA < dateB ? -1 : 1; // 오름차순
            if (catA === '픽업' && catB !== '픽업') return -1;
            if (catA !== '픽업' && catB === '픽업') return 1;
            return catA.localeCompare(catB, 'ko-KR');
        });

        return sortedKeys.map(key => ({
            groupKey: key,
            date: key.split('__')[0],
            category: key.split('__')[1],
            items: groups[key]
        }));
    };

    // sht_car 탭일 때만 그룹화 데이터 사용
    const isShtCarTab = activeTab === 'sht_car';
    const groupedShtCar = isShtCarTab ? groupShtCarByDateAndCategory(filteredData) : [];

    // 크루즈 차량 픽업일시 기준 그룹화 함수 추가
    const groupCruiseCarByPickupDatetime = (data: ServiceData[]) => {
        // 오늘 이후 픽업일시만
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // pickup_datetime 기준 그룹화 (날짜만 추출)
        const groups: Record<string, ServiceData[]> = {};
        data.forEach(item => {
            if (!item.pickup_datetime) return;
            const dt = new Date(item.pickup_datetime);
            if (dt < today) return; // 오늘 이전은 제외
            const dateKey = dt.toISOString().slice(0, 10);
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(item);
        });

        const sortedKeys = Object.keys(groups).sort((a, b) => a.localeCompare(b));
        return sortedKeys.map(key => ({
            groupKey: key,
            date: key,
            items: groups[key]
        }));
    };

    // 크루즈 차량 탭일 때만 그룹화 데이터 사용
    const isCruiseCarTab = activeTab === 'cruise_car';
    const groupedCruiseCar = isCruiseCarTab ? groupCruiseCarByPickupDatetime(filteredData) : [];

    // 공항서비스 일시별 그룹화 함수 추가
    const groupAirportByDatetime = (data: ServiceData[]) => {
        // 오늘 이후 일시만
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const filtered = data.filter(item => {
            if (!item.ra_datetime) return false;
            const dt = new Date(item.ra_datetime);
            return dt >= today;
        });

        // ra_datetime 날짜별 그룹화 (오름차순)
        const groups: Record<string, ServiceData[]> = {};
        filtered.forEach(item => {
            const date = item.ra_datetime ? new Date(item.ra_datetime).toISOString().slice(0, 10) : '미지정';
            if (!groups[date]) groups[date] = [];
            groups[date].push(item);
        });

        const sortedKeys = Object.keys(groups).sort((a, b) => a.localeCompare(b));
        return sortedKeys.map(key => ({
            groupKey: key,
            date: key,
            items: groups[key]
        }));
    };

    // 공항서비스 탭일 때만 그룹화 데이터 사용
    const isAirportTab = activeTab === 'airport';
    const groupedAirport = isAirportTab ? groupAirportByDatetime(filteredData) : [];

    return (
        <ManagerLayout title="서비스별 조회" activeTab="service-tables">
            <div className="space-y-4">
                {/* 서비스 탭 메뉴 */}
                <div className="mb-4">
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                        {serviceTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={
                                    `flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ` +
                                    (activeTab === tab.id
                                        ? `${tab.color === 'blue' ? 'bg-blue-600 text-white shadow-md' :
                                            tab.color === 'cyan' ? 'bg-cyan-600 text-white shadow-md' :
                                                tab.color === 'teal' ? 'bg-teal-600 text-white shadow-md' :
                                                    tab.color === 'green' ? 'bg-green-600 text-white shadow-md' :
                                                        tab.color === 'purple' ? 'bg-purple-600 text-white shadow-md' :
                                                            tab.color === 'orange' ? 'bg-orange-600 text-white shadow-md' :
                                                                tab.color === 'red' ? 'bg-red-600 text-white shadow-md' :
                                                                    'bg-gray-600 text-white shadow-md'
                                        }
                                        `
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-white')
                                }
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 검색 바 */}
                <div className="mb-4">
                    <div className="flex items-center space-x-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="고객명, 이메일, 예약ID로 검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="text-sm text-gray-600">
                            총 {filteredData.length}건
                        </div>
                    </div>
                </div>

                {/* 서비스 데이터 테이블 */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            {currentTab?.icon}
                            <span className="ml-2">{currentTab?.label} 예약 목록</span>
                        </h3>
                    </div>

                    {loadError && (
                        <div className="p-4 bg-red-50 text-red-700 text-sm border-t border-red-200">
                            로딩 오류: {loadError}
                        </div>
                    )}

                    {/* 크루즈: 체크인별 그룹화 테이블 */}
                    {isCruiseTab ? (
                        groupedCruise.length === 0 && !loadError ? (
                            <div className="p-8 text-center">
                                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-600 mb-2">데이터가 없습니다</h3>
                                <p className="text-gray-500">검색 조건을 변경해보세요.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                                {groupedCruise.map(group => (
                                    <div key={group.groupKey} className="mb-8">
                                        <div className="bg-blue-50 px-4 py-2 rounded-t-lg flex items-center gap-4">
                                            <Calendar className="w-4 h-4 text-blue-600" />
                                            <span className="font-semibold text-blue-900">{group.date}</span>
                                            <span className="ml-2 text-xs text-gray-500">총 {group.items.length}건</span>
                                        </div>
                                        <table className="w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50 sticky top-0 z-10">
                                                <tr>
                                                    {getTableColumns('cruise').map((column) => (
                                                        <th
                                                            key={column.key}
                                                            className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.width} bg-gray-50`}
                                                        >
                                                            {column.label}
                                                        </th>
                                                    ))}
                                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 bg-gray-50">
                                                        상세
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {group.items.map((item, index) => (
                                                    <tr key={item.id || index} className="hover:bg-gray-50">
                                                        {getTableColumns('cruise').map((column) => (
                                                            <td
                                                                key={column.key}
                                                                className={`px-6 py-4 text-sm text-gray-900 ${column.width}`}
                                                            >
                                                                {formatValue(
                                                                    column.key === 'room_name'
                                                                        ? undefined
                                                                        : getNestedValue(item, column.key),
                                                                    column.type,
                                                                    item,
                                                                    column.key
                                                                )}
                                                            </td>
                                                        ))}
                                                        <td className="px-6 py-4 text-center">
                                                            <button
                                                                onClick={() => handleViewDetails(item)}
                                                                className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                                                                title="상세 보기"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : isCruiseCarTab ? (
                        // 크루즈 차량 탭일 때 그룹화 테이블
                        groupedCruiseCar.length === 0 && !loadError ? (
                            <div className="p-8 text-center">
                                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-600 mb-2">데이터가 없습니다</h3>
                                <p className="text-gray-500">검색 조건을 변경해보세요.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                                {groupedCruiseCar.map(group => (
                                    <div key={group.groupKey} className="mb-8">
                                        <div className="bg-cyan-50 px-4 py-2 rounded-t-lg flex items-center gap-4">
                                            <Calendar className="w-4 h-4 text-cyan-600" />
                                            <span className="font-semibold text-cyan-900">{group.date}</span>
                                            <span className="ml-2 text-xs text-gray-500">총 {group.items.length}건</span>
                                        </div>
                                        <table className="w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50 sticky top-0 z-10">
                                                <tr>
                                                    {getTableColumns('cruise_car').map((column) => (
                                                        <th
                                                            key={column.key}
                                                            className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.width} bg-gray-50`}
                                                        >
                                                            {column.label}
                                                        </th>
                                                    ))}
                                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 bg-gray-50">
                                                        상세
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {group.items.map((item, index) => (
                                                    <tr key={item.id || index} className="hover:bg-gray-50">
                                                        {getTableColumns('cruise_car').map((column) => (
                                                            <td
                                                                key={column.key}
                                                                className={`px-6 py-4 text-sm text-gray-900 ${column.width}`}
                                                            >
                                                                {formatValue(
                                                                    getNestedValue(item, column.key),
                                                                    column.type,
                                                                    item,
                                                                    column.key
                                                                )}
                                                            </td>
                                                        ))}
                                                        <td className="px-6 py-4 text-center">
                                                            <button
                                                                onClick={() => handleViewDetails(item)}
                                                                className="text-cyan-600 hover:text-cyan-900 p-1 rounded hover:bg-cyan-50"
                                                                title="상세 보기"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : isAirportTab ? (
                        // 공항서비스 탭일 때 그룹화 테이블
                        groupedAirport.length === 0 && !loadError ? (
                            <div className="p-8 text-center">
                                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-600 mb-2">데이터가 없습니다</h3>
                                <p className="text-gray-500">검색 조건을 변경해보세요.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                                {groupedAirport.map(group => (
                                    <div key={group.groupKey} className="mb-8">
                                        <div className="bg-green-50 px-4 py-2 rounded-t-lg flex items-center gap-4">
                                            <Calendar className="w-4 h-4 text-green-600" />
                                            <span className="font-semibold text-green-900">{group.date}</span>
                                            <span className="ml-2 text-xs text-gray-500">총 {group.items.length}건</span>
                                        </div>
                                        <table className="w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50 sticky top-0 z-10">
                                                <tr>
                                                    {getTableColumns('airport').map((column) => (
                                                        <th
                                                            key={column.key}
                                                            className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.width} bg-gray-50`}
                                                        >
                                                            {column.label}
                                                        </th>
                                                    ))}
                                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 bg-gray-50">
                                                        상세
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {group.items.map((item, index) => (
                                                    <tr key={item.id || index} className="hover:bg-gray-50">
                                                        {getTableColumns('airport').map((column) => (
                                                            <td
                                                                key={column.key}
                                                                className={`px-6 py-4 text-sm text-gray-900 ${column.width}`}
                                                            >
                                                                {formatValue(
                                                                    getNestedValue(item, column.key),
                                                                    column.type,
                                                                    item,
                                                                    column.key
                                                                )}
                                                            </td>
                                                        ))}
                                                        <td className="px-6 py-4 text-center">
                                                            <button
                                                                onClick={() => handleViewDetails(item)}
                                                                className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                                                                title="상세 보기"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        ) : (
                        // 기존(그룹화 없는) 테이블
                        filteredData.length === 0 && !loadError ? (
                            <div className="p-8 text-center">
                                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-600 mb-2">데이터가 없습니다</h3>
                                <p className="text-gray-500">검색 조건을 변경해보세요.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                                <table className="w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0 z-10">
                                        <tr>
                                            {getTableColumns(activeTab).map((column) => (
                                                <th
                                                    key={column.key}
                                                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.width} bg-gray-50`}
                                                >
                                                    {column.label}
                                                </th>
                                            ))}
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 bg-gray-50">
                                                상세
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredData.map((item, index) => (
                                            <tr key={item.id || index} className="hover:bg-gray-50">
                                                {getTableColumns(activeTab).map((column) => (
                                                    <td
                                                        key={column.key}
                                                        className={`px-6 py-4 text-sm text-gray-900 ${column.width}`}
                                                    >
                                                        {formatValue(getNestedValue(item, column.key), column.type)}
                                                    </td>
                                                ))}
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handleViewDetails(item)}
                                                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                                                        title="상세 보기"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}
                </div>

                {/* 상세 정보 모달 */}
                {showDetails && selectedItem && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-semibold flex items-center gap-2">
                                        {currentTab?.icon}
                                        {currentTab?.label} 상세 정보
                                    </h3>
                                    <button
                                        onClick={() => setShowDetails(false)}
                                        className="text-gray-400 hover:text-gray-600 text-2xl"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* 예약자 정보 */}
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <h4 className="text-md font-semibold text-blue-800 mb-3 flex items-center">
                                            <User className="w-4 h-4 mr-2" />
                                            예약자 정보
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <div><strong>이름:</strong> {selectedItem.reservation?.users?.name || '정보 없음'}</div>
                                            <div><strong>이메일:</strong> {selectedItem.reservation?.users?.email || '정보 없음'}</div>
                                            <div><strong>전화번호:</strong> {selectedItem.reservation?.users?.phone || '정보 없음'}</div>
                                            <div><strong>예약ID:</strong> {selectedItem.reservation?.re_id || '정보 없음'}</div>
                                            <div><strong>예약상태:</strong> {getStatusBadge(selectedItem.reservation?.re_status || 'pending')}</div>
                                        </div>
                                    </div>

                                    {/* 서비스 상세 정보 (가격 테이블 매핑 포함) */}
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                                            {currentTab?.icon}
                                            서비스 상세
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            {Object.entries(getEnhancedServiceDetails(selectedItem, activeTab)).map(([key, value]) => {
                                                if (key === 'id' || key === 'reservation_id' || key === 'reservation' ||
                                                    key === 'created_at' || key === 'updated_at') return null;

                                                // 특정 키들에 대해 한글 라벨 적용
                                                const labelMap: Record<string, string> = {
                                                    'room_price_code': '객실코드',
                                                    'car_price_code': '차량코드',
                                                    'airport_price_code': '공항코드',
                                                    'checkin': '체크인',
                                                    'guest_count': '인원수',
                                                    'room_total_price': '총금액',
                                                    'pickup_location': '픽업장소',
                                                    'dropoff_location': '드롭장소',
                                                    'pickup_datetime': '픽업일시',
                                                    'unit_price': '단가',
                                                    'usage_date': '사용일자',
                                                    'sht_category': '카테고리',
                                                    'vehicle_number': '차량번호',
                                                    'seat_number': '좌석번호',
                                                    'ra_airport_location': '공항',
                                                    'ra_datetime': '일시',
                                                    'ra_passenger_count': '승객수',
                                                    'ra_car_count': '차량수',
                                                    'total_price': '총금액'
                                                };

                                                const label = labelMap[key] || key;
                                                let displayValue = value;

                                                // 날짜/시간 포맷팅
                                                if (key.includes('datetime') || key === 'ra_datetime') {
                                                    displayValue = value ? new Date(value).toLocaleString('ko-KR') : '정보 없음';
                                                } else if (key.includes('date') || key === 'checkin') {
                                                    displayValue = value ? new Date(value).toLocaleDateString('ko-KR') : '정보 없음';
                                                } else if (key.includes('price')) {
                                                    displayValue = value ? `${Number(value).toLocaleString()}원` : '정보 없음';
                                                } else {
                                                    displayValue = value ? String(value) : '정보 없음';
                                                }

                                                return (
                                                    <div key={key}>
                                                        <strong>{label}:</strong> {displayValue}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ManagerLayout>
    );
}
