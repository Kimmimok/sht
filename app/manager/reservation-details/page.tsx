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
                default:
                    return null;
            }

            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .eq(serviceType === 'cruise' ? 'room_code' :
                    serviceType === 'airport' ? 'airport_code' :
                        serviceType === 'hotel' ? 'hotel_code' :
                            serviceType === 'tour' ? 'tour_code' :
                                'rentcar_code', priceCode)
                .single();

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
                .order('re_created_at', { ascending: false });

            if (reservationsError) {
                console.error('예약 조회 오류:', reservationsError);
                return;
            }

            if (!reservationsData || reservationsData.length === 0) {
                setReservations([]);
                return;
            }

            // 사용자 정보 조회
            const userIds = [...new Set(reservationsData.map(r => r.re_user_id).filter(Boolean))];
            let usersById = new Map<string, any>();

            if (userIds.length > 0) {
                const { data: usersData } = await supabase
                    .from('users')
                    .select('id, name, email, phone')
                    .in('id', userIds);
                usersById = new Map((usersData || []).map(u => [u.id, u]));
            }

            // 각 예약의 서비스별 상세 정보 조회
            const detailedReservations = await Promise.all(
                reservationsData.map(async (reservation) => {
                    let serviceDetails = null;

                    try {
                        switch (reservation.re_type) {
                            case 'cruise':
                                const { data: cruiseData } = await supabase
                                    .from('reservation_cruise')
                                    .select('*')
                                    .eq('reservation_id', reservation.re_id)
                                    .maybeSingle();
                                serviceDetails = cruiseData;
                                break;

                            case 'airport':
                                const { data: airportData } = await supabase
                                    .from('reservation_airport')
                                    .select('*')
                                    .eq('reservation_id', reservation.re_id)
                                    .maybeSingle();
                                serviceDetails = airportData;
                                break;

                            case 'hotel':
                                const { data: hotelData } = await supabase
                                    .from('reservation_hotel')
                                    .select('*')
                                    .eq('reservation_id', reservation.re_id)
                                    .maybeSingle();
                                serviceDetails = hotelData;
                                break;

                            case 'tour':
                                const { data: tourData } = await supabase
                                    .from('reservation_tour')
                                    .select('*')
                                    .eq('reservation_id', reservation.re_id)
                                    .maybeSingle();
                                serviceDetails = tourData;
                                break;

                            case 'rentcar':
                                const { data: rentcarData } = await supabase
                                    .from('reservation_rentcar')
                                    .select('*')
                                    .eq('reservation_id', reservation.re_id)
                                    .maybeSingle();
                                serviceDetails = rentcarData;
                                break;
                        }
                    } catch (error) {
                        console.error(`${reservation.re_type} 상세 정보 조회 오류:`, error);
                    }

                    return {
                        ...reservation,
                        user: usersById.get(reservation.re_user_id) || null,
                        service_details: serviceDetails
                    };
                })
            );

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

    const handleViewDetails = (reservation: any) => {
        setSelectedReservation(reservation);
        setShowDetails(true);
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
            }
        }, [serviceType, priceCode]);

        if (loading) {
            return <div className="text-xs text-gray-500">가격 정보 로딩 중...</div>;
        }

        if (!priceInfo) {
            return <div className="text-xs text-gray-500">가격 정보 없음</div>;
        }

        return (
            <div className="mt-2 p-3 bg-white border rounded text-xs">
                <div className="font-medium text-gray-700 mb-2">📋 가격 테이블 정보</div>
                <div className="grid grid-cols-2 gap-2">
                    {Object.entries(priceInfo).map(([key, value]) => {
                        if (key === 'id' || key === 'created_at' || key === 'updated_at') return null;
                        return (
                            <div key={key}>
                                <span className="text-gray-600">{key}:</span>
                                <span className="ml-1 font-medium">
                                    {typeof value === 'number' && key.includes('price')
                                        ? `${value.toLocaleString()}원`
                                        : String(value || '정보 없음')
                                    }
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderServiceDetails = (reservation: any) => {
        const details = reservation.service_details;
        if (!details) return <p className="text-gray-500">상세 정보 없음</p>;

        switch (reservation.re_type) {
            case 'cruise':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h5 className="font-semibold text-blue-600 border-b pb-2">📅 예약 정보</h5>
                            <div><strong>체크인 날짜:</strong> {details.checkin ? new Date(details.checkin).toLocaleDateString('ko-KR') : '미정'}</div>
                            <div><strong>투숙객 수:</strong> {details.guest_count}명</div>
                            <div><strong>객실 가격 코드:</strong> <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">{details.room_price_code}</span></div>
                            <PriceTableInfo serviceType="cruise" priceCode={details.room_price_code} />
                            <div><strong>단가:</strong> {details.unit_price?.toLocaleString()}원</div>
                            {details.boarding_assist && <div><strong>탑승 지원:</strong> {details.boarding_assist}</div>}
                        </div>
                        <div className="space-y-3">
                            <h5 className="font-semibold text-green-600 border-b pb-2">💰 금액 정보</h5>
                            <div><strong>객실 총 금액:</strong> <span className="text-lg font-bold text-green-600">{details.room_total_price?.toLocaleString()}원</span></div>
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
                            <div><strong>단가:</strong> {details.unit_price?.toLocaleString()}원</div>
                            <div><strong>총 금액:</strong> <span className="text-lg font-bold text-green-600">{details.total_price?.toLocaleString()}원</span></div>
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
                            <div><strong>총 금액:</strong> <span className="text-lg font-bold text-green-600">{details.total_price?.toLocaleString()}원</span></div>
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
                            <div><strong>총 금액:</strong> <span className="text-lg font-bold text-green-600">{details.total_price?.toLocaleString()}원</span></div>
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
                            <div><strong>단가:</strong> {details.unit_price?.toLocaleString()}원</div>
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
                            <div><strong>총 금액:</strong> <span className="text-lg font-bold text-green-600">{details.total_price?.toLocaleString()}원</span></div>
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
            reservation.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            reservation.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
                                                        {getServiceName(reservation.re_type)} - {reservation.user?.name || '고객명 없음'}
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

                                                    {reservation.user?.email && (
                                                        <span className="flex items-center gap-1">
                                                            <Mail className="w-4 h-4" />
                                                            {reservation.user.email}
                                                        </span>
                                                    )}

                                                    {reservation.user?.phone && (
                                                        <span className="flex items-center gap-1">
                                                            <Phone className="w-4 h-4" />
                                                            {reservation.user.phone}
                                                        </span>
                                                    )}

                                                    <span className="text-blue-600">
                                                        ID: {reservation.re_id.slice(0, 8)}...
                                                    </span>
                                                </div>

                                                {/* 서비스별 간단 정보 */}
                                                <div className="mt-2 text-sm text-gray-500">
                                                    {reservation.service_details && (
                                                        <>
                                                            {reservation.re_type === 'cruise' && reservation.service_details.checkin && (
                                                                <span>체크인: {new Date(reservation.service_details.checkin).toLocaleDateString('ko-KR')}</span>
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
                                            <div><strong>이름:</strong> {selectedReservation.user?.name || '정보 없음'}</div>
                                            <div><strong>이메일:</strong> {selectedReservation.user?.email || '정보 없음'}</div>
                                            <div><strong>전화번호:</strong> {selectedReservation.user?.phone || '정보 없음'}</div>
                                            <div><strong>역할:</strong> <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">{selectedReservation.user?.role || '미정'}</span></div>
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
