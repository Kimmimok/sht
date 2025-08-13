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

export default function ManagerServiceTablesPage() {
    const [activeTab, setActiveTab] = useState('cruise');
    const [serviceData, setServiceData] = useState<ServiceData[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadError, setLoadError] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<ServiceData | null>(null);
    const [showDetails, setShowDetails] = useState(false);

    const serviceTabs = [
        { id: 'cruise', label: '크루즈', icon: <Ship className="w-4 h-4" />, color: 'blue' },
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
                    .select('id, name, email, phone')
                    .in('id', userIds);
                if (userErr) {
                    console.warn(`[${serviceType}] 사용자 조회 실패:`, userErr.message || userErr);
                } else if (users) {
                    userMap = (users as any[]).reduce((acc, u) => {
                        acc[u.id] = u;
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

    // 검색 필터링
    const filteredData = serviceData.filter(item => {
        if (!searchTerm) return true;

        const searchLower = searchTerm.toLowerCase();
        const userName = item.reservation?.users?.name?.toLowerCase() || '';
        const userEmail = item.reservation?.users?.email?.toLowerCase() || '';
        const reservationId = item.reservation?.re_id?.toLowerCase() || '';

        return userName.includes(searchLower) ||
            userEmail.includes(searchLower) ||
            reservationId.includes(searchLower);
    });

    // 서비스별 테이블 컬럼 정의
    const getTableColumns = (serviceType: string) => {
        switch (serviceType) {
            case 'cruise':
                return [
                    { key: 'reservation.users.name', label: '고객명', width: 'w-32' },
                    { key: 'reservation.users.email', label: '이메일', width: 'w-48' },
                    { key: 'checkin', label: '체크인', width: 'w-32', type: 'date' },
                    { key: 'guest_count', label: '인원', width: 'w-20' },
                    { key: 'room_price_code', label: '객실코드', width: 'w-32' },
                    { key: 'room_total_price', label: '총금액', width: 'w-32', type: 'price' },
                    { key: 'reservation.re_status', label: '상태', width: 'w-24', type: 'status' },
                    { key: 'created_at', label: '등록일', width: 'w-40', type: 'datetime' }
                ];
            case 'airport':
                return [
                    { key: 'reservation.users.name', label: '고객명', width: 'w-32' },
                    { key: 'reservation.users.email', label: '이메일', width: 'w-48' },
                    { key: 'ra_airport_location', label: '공항', width: 'w-32' },
                    { key: 'ra_datetime', label: '일시', width: 'w-40', type: 'datetime' },
                    { key: 'ra_passenger_count', label: '승객수', width: 'w-20' },
                    { key: 'ra_car_count', label: '차량수', width: 'w-20' },
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

    // 값 포맷팅
    const formatValue = (value: any, type?: string) => {
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
                                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.id
                                    ? `bg-${tab.color}-600 text-white shadow-md`
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                                    }`}
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

                    {filteredData.length === 0 && !loadError ? (
                        <div className="p-8 text-center">
                            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-600 mb-2">데이터가 없습니다</h3>
                            <p className="text-gray-500">검색 조건을 변경해보세요.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {getTableColumns(activeTab).map((column) => (
                                            <th
                                                key={column.key}
                                                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.width}`}
                                            >
                                                {column.label}
                                            </th>
                                        ))}
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
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
                                        </div>
                                    </div>

                                    {/* 서비스 상세 정보 */}
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                                            {currentTab?.icon}
                                            서비스 상세
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            {Object.entries(selectedItem).map(([key, value]) => {
                                                if (key === 'id' || key === 'reservation_id' || key === 'reservation' ||
                                                    key === 'created_at' || key === 'updated_at') return null;
                                                return (
                                                    <div key={key}>
                                                        <strong>{key}:</strong> {value ? String(value) : '정보 없음'}
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
