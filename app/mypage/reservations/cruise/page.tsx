'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

function CruiseReservationContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const quoteId = searchParams.get('quoteId');

    // 폼 상태 - reservation_cruise 테이블 컬럼 기반
    const [form, setForm] = useState({
        room_price_code: '',
        checkin: '',
        guest_count: 0,
        unit_price: 0,
        boarding_assist: 'n', // y/n 값으로 변경
        car_price_code: '',
        car_count: 0,
        passenger_count: 0,
        pickup_datetime: '',
        pickup_location: '',
        dropoff_location: '',
        room_total_price: 0,
        car_total_price: 0,
        request_note: ''
    });

    // 옵션 데이터
    const [roomPriceInfo, setRoomPriceInfo] = useState<any[]>([]);
    const [carPriceInfo, setCarPriceInfo] = useState<any>(null);
    const [roomsData, setRoomsData] = useState<any[]>([]);

    // 로딩 상태
    const [loading, setLoading] = useState(false);
    const [quote, setQuote] = useState<any>(null);

    useEffect(() => {
        if (!quoteId) {
            alert('견적 ID가 필요합니다.');
            router.push('/mypage/reservations');
            return;
        }
        loadQuote();
        loadQuoteLinkedData();
    }, [quoteId, router]);

    // 견적 정보 로드
    const loadQuote = async () => {
        try {
            const { data: quoteData, error } = await supabase
                .from('quote')
                .select('id, title, status')
                .eq('id', quoteId)
                .single();

            if (error || !quoteData) {
                alert('견적을 찾을 수 없습니다.');
                router.push('/mypage/reservations');
                return;
            }

            setQuote(quoteData);
        } catch (error) {
            console.error('견적 로드 오류:', error);
            alert('견적 정보를 불러오는 중 오류가 발생했습니다.');
        }
    };

    // 견적에 연결된 룸/차량 데이터 로드
    const loadQuoteLinkedData = async () => {
        try {
            // 견적에 연결된 quote_item들 조회 (usage_date 포함)
            const { data: quoteItems } = await supabase
                .from('quote_item')
                .select('service_type, service_ref_id, quantity, unit_price, total_price, usage_date')
                .eq('quote_id', quoteId);

            if (quoteItems) {
                // 룸 정보 로드 (모든 객실 처리)
                const roomItems = quoteItems.filter(item => item.service_type === 'room');
                if (roomItems.length > 0) {
                    await loadAllRoomInfo(roomItems);

                    // 첫 번째 룸 아이템에서 체크인 날짜 설정
                    const firstRoomUsageDate = roomItems[0]?.usage_date;
                    if (firstRoomUsageDate) {
                        setForm(prev => ({
                            ...prev,
                            checkin: firstRoomUsageDate
                        }));
                    }
                }

                // 차량 정보 로드
                const carItems = quoteItems.filter(item => item.service_type === 'car');
                if (carItems.length > 0) {
                    await loadCarInfo(carItems[0].service_ref_id, carItems[0]);
                }
            }
        } catch (error) {
            console.error('견적 연결 데이터 로드 오류:', error);
        }
    };

    // 모든 룸 정보 로드 및 중복 제거
    const loadAllRoomInfo = async (roomItems: any[]) => {
        try {
            const allRoomsData = [];
            const roomPriceDataList = [];

            // 각 room item에 대해 정보 조회
            for (const roomItem of roomItems) {
                // room 테이블에서 룸 정보 조회
                const { data: roomData } = await supabase
                    .from('room')
                    .select('*')
                    .eq('id', roomItem.service_ref_id)
                    .single();

                if (roomData) {
                    // room_price 테이블에서 가격 정보 조회
                    const { data: roomPriceData } = await supabase
                        .from('room_price')
                        .select('*')
                        .eq('room_code', roomData.room_code);

                    if (roomPriceData && roomPriceData.length > 0) {
                        // quote_item 정보와 함께 저장
                        allRoomsData.push({
                            ...roomData,
                            quoteItem: roomItem,
                            priceInfo: roomPriceData[0] // 첫 번째 가격 정보 사용
                        });

                        roomPriceDataList.push(...roomPriceData);
                    }
                }
            }

            // 중복 제거된 객실 데이터 생성
            const uniqueRooms = deduplicateRooms(allRoomsData);
            setRoomsData(uniqueRooms);

            // 중복 제거된 가격 정보 설정
            const uniquePriceInfo = deduplicatePriceInfo(roomPriceDataList);
            setRoomPriceInfo(uniquePriceInfo);

            // 첫 번째 객실 정보로 폼 기본값 설정
            if (uniqueRooms.length > 0) {
                const firstRoom = uniqueRooms[0];
                const totalGuestCount = uniqueRooms.reduce((sum, room) => sum + (room.adult_count || 0) + (room.child_count || 0) + (room.extra_count || 0), 0);
                const totalPrice = uniqueRooms.reduce((sum, room) => sum + (room.quoteItem?.total_price || 0), 0);

                setForm(prev => ({
                    ...prev,
                    room_price_code: firstRoom.room_code,
                    unit_price: firstRoom.quoteItem?.unit_price || firstRoom.priceInfo?.price || 0,
                    guest_count: totalGuestCount,
                    room_total_price: totalPrice
                }));
            }

        } catch (error) {
            console.error('룸 정보 로드 오류:', error);
        }
    };

    // 객실 데이터 중복 제거 함수
    const deduplicateRooms = (rooms: any[]) => {
        const roomMap = new Map();

        rooms.forEach(room => {
            const key = room.room_code;
            if (roomMap.has(key)) {
                // 같은 room_code가 있으면 인원수 합산
                const existing = roomMap.get(key);
                existing.adult_count += room.adult_count || 0;
                existing.child_count += room.child_count || 0;
                existing.extra_count += room.extra_count || 0;
                existing.totalPrice += room.quoteItem?.total_price || 0;
                existing.roomCount += 1;
                existing.allQuoteItems.push(room.quoteItem);
            } else {
                // 새로운 room_code면 추가
                roomMap.set(key, {
                    ...room,
                    totalPrice: room.quoteItem?.total_price || 0,
                    roomCount: 1,
                    allQuoteItems: [room.quoteItem]
                });
            }
        });

        return Array.from(roomMap.values());
    };

    // 가격 정보 중복 제거 함수
    const deduplicatePriceInfo = (priceList: any[]) => {
        const priceMap = new Map();

        priceList.forEach(price => {
            const key = `${price.room_code}_${price.cruise}_${price.room_type}_${price.schedule}`;
            if (!priceMap.has(key)) {
                priceMap.set(key, price);
            }
        });

        return Array.from(priceMap.values());
    };

    // 차량 정보 로드
    const loadCarInfo = async (carId: string, quoteItem?: any) => {
        try {
            // car 테이블에서 차량 정보 조회
            const { data: carData } = await supabase
                .from('car')
                .select('car_code')
                .eq('id', carId)
                .single();

            if (carData?.car_code) {
                // car_price 테이블에서 가격 정보 조회
                const { data: carPriceData } = await supabase
                    .from('car_price')
                    .select('*')
                    .eq('car_code', carData.car_code)
                    .limit(1)
                    .single();

                if (carPriceData) {
                    setCarPriceInfo(carPriceData);
                    // 폼에 차량 코드와 기본 차량 가격 설정 (quote_item의 quantity와 가격 정보 활용)
                    const carPriceCode = `${carPriceData.car_code}-${carPriceData.cruise}-${carPriceData.car_type}`;
                    const quantity = quoteItem?.quantity || 1;
                    setForm(prev => ({
                        ...prev,
                        car_price_code: carPriceCode,
                        car_count: quantity,
                        car_total_price: quoteItem?.total_price || (carPriceData.price * quantity)
                    }));
                }
            }
        } catch (error) {
            console.error('차량 정보 로드 오류:', error);
        }
    };    // 폼 입력 핸들러
    const handleInputChange = (field: string, value: any) => {
        setForm(prev => {
            const updated = {
                ...prev,
                [field]: value
            };

            // 가격 관련 필드가 변경되면 총 가격 자동 계산
            if (field === 'unit_price' || field === 'guest_count') {
                updated.room_total_price = (updated.unit_price || 0) * (updated.guest_count || 1);
            }

            if (field === 'car_count' && carPriceInfo?.price) {
                updated.car_total_price = (carPriceInfo.price || 0) * (updated.car_count || 0);
            }

            return updated;
        });
    };

    // 인원수 변경 핸들러
    const handleCountChange = (field: string, increment: boolean) => {
        setForm(prev => {
            const updated = {
                ...prev,
                [field]: Math.max(0, (prev[field as keyof typeof prev] as number) + (increment ? 1 : -1))
            };

            // 투숙객 수 변경 시 룸 총 가격 재계산
            if (field === 'guest_count') {
                updated.room_total_price = (updated.unit_price || 0) * (updated.guest_count || 1);
            }

            // 차량 수 변경 시 차량 총 가격 재계산
            if (field === 'car_count' && carPriceInfo?.price) {
                updated.car_total_price = (carPriceInfo.price || 0) * (updated.car_count || 0);
            }

            return updated;
        });
    };

    // 폼 제출
    const handleSubmit = async () => {
        try {
            setLoading(true);

            // 필수 필드 검증
            if (!form.checkin) {
                alert('체크인 날짜는 필수 입력 항목입니다.');
                return;
            }

            if (form.guest_count === 0) {
                alert('투숙객 인원은 최소 1명 이상이어야 합니다.');
                return;
            }

            // 먼저 reservation 테이블에 메인 예약 데이터 생성
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                alert('로그인이 필요합니다.');
                return;
            }

            // 기존 사용자 정보 확인 및 권한 유지
            const { data: existingUser } = await supabase
                .from('users')
                .select('id, role')
                .eq('id', user.id)
                .single();

            // 사용자가 users 테이블에 없는 경우에만 새로 등록 (member 권한으로)
            if (!existingUser) {
                const { error: userInsertError } = await supabase
                    .from('users')
                    .insert({
                        id: user.id,
                        email: user.email,
                        role: 'member', // 예약자는 member 권한
                        created_at: new Date().toISOString()
                    });

                if (userInsertError) {
                    console.error('사용자 등록 오류:', userInsertError);
                    // 이미 존재하는 사용자일 수 있으므로 에러를 무시하고 계속 진행
                }
            }
            // 기존 사용자의 경우 권한을 그대로 유지

            // reservation 테이블에 메인 예약 생성
            const { data: reservationData, error: reservationError } = await supabase
                .from('reservation')
                .insert({
                    re_user_id: user.id,
                    re_quote_id: quoteId,
                    re_type: 'cruise',
                    re_status: 'pending',
                    re_created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (reservationError) {
                console.error('예약 생성 오류:', reservationError);
                alert('예약 생성 중 오류가 발생했습니다.');
                return;
            }

            // reservation_cruise 데이터 생성
            const reservationCruiseData = {
                reservation_id: reservationData.re_id,
                room_price_code: form.room_price_code,
                checkin: form.checkin,
                guest_count: form.guest_count,
                unit_price: form.unit_price,
                boarding_assist: form.boarding_assist,
                car_price_code: form.car_price_code,
                car_count: form.car_count,
                passenger_count: form.passenger_count,
                pickup_datetime: form.pickup_datetime ? new Date(form.pickup_datetime).toISOString() : null,
                pickup_location: form.pickup_location,
                dropoff_location: form.dropoff_location,
                room_total_price: form.room_total_price,
                car_total_price: form.car_total_price,
                request_note: form.request_note
            };

            // reservation_cruise 테이블에 삽입
            const { data: reservationResult, error: cruiseReservationError } = await supabase
                .from('reservation_cruise')
                .insert(reservationCruiseData)
                .select()
                .single();

            if (cruiseReservationError) {
                console.error('크루즈 예약 저장 오류:', cruiseReservationError);
                alert('크루즈 예약 저장 중 오류가 발생했습니다.');
                return;
            }

            alert('크루즈 예약이 성공적으로 저장되었습니다!');
            router.push('/mypage/reservations');

        } catch (error) {
            console.error('예약 저장 오류:', error);
            alert('예약 저장 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    if (!quote) {
        return (
            <PageWrapper>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper>
            <div className="space-y-6">
                {/* 헤더 */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-lg font-bold text-gray-800">🚢 크루즈 예약</h1>
                        <p className="text-sm text-gray-600 mt-1">견적: {quote.title}</p>
                    </div>
                    <button
                        onClick={() => router.push('/mypage/reservations')}
                        className="px-3 py-1 bg-gray-50 text-gray-600 rounded border text-sm hover:bg-gray-100"
                    >
                        목록으로
                    </button>
                </div>

                {/* 크루즈 객실 정보 */}
                <SectionBox title="크루즈 객실 정보">

                    {/* 객실 가격 정보 (중복 제거된) */}
                    {roomPriceInfo.length > 0 && (
                        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                            <h4 className="text-sm font-medium text-green-800 mb-3">🏨 객실 가격 정보</h4>

                            {/* 공통 정보 표시 */}
                            {(() => {
                                const firstPrice = roomPriceInfo[0];
                                const hasCommonInfo = roomPriceInfo.every(price =>
                                    price.schedule === firstPrice.schedule &&
                                    price.cruise === firstPrice.cruise &&
                                    price.room_type === firstPrice.room_type &&
                                    price.payment === firstPrice.payment
                                );

                                return (
                                    <>
                                        {hasCommonInfo && (
                                            <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                    <div>
                                                        <span className="text-gray-600">일정:</span>
                                                        <p className="font-medium text-gray-800">{firstPrice.schedule || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-600">크루즈:</span>
                                                        <p className="font-medium text-gray-800">{firstPrice.cruise || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-600">룸 타입:</span>
                                                        <p className="font-medium text-gray-800">{firstPrice.room_type || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-600">결제:</span>
                                                        <p className="font-medium text-gray-800">{firstPrice.payment || '-'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* 개별 객실 정보 */}
                                        <div className="space-y-3">
                                            {roomPriceInfo.map((priceInfo, index) => {
                                                // 해당 룸 코드의 room 데이터 찾기
                                                const roomData = roomsData.find(room => room.room_code === priceInfo.room_code);
                                                const totalGuests = (roomData?.adult_count || 0) + (roomData?.child_count || 0) + (roomData?.extra_count || 0);
                                                const totalPrice = (priceInfo.price || 0) * totalGuests;

                                                return (
                                                    <div key={index} className="bg-white p-3 rounded border">
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                            {!hasCommonInfo && (
                                                                <>
                                                                    <div>
                                                                        <span className="text-gray-600">일정:</span>
                                                                        <p className="font-medium text-gray-800">{priceInfo.schedule || '-'}</p>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-600">크루즈:</span>
                                                                        <p className="font-medium text-gray-800">{priceInfo.cruise || '-'}</p>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-600">룸 타입:</span>
                                                                        <p className="font-medium text-gray-800">{priceInfo.room_type || '-'}</p>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-600">결제:</span>
                                                                        <p className="font-medium text-gray-800">{priceInfo.payment || '-'}</p>
                                                                    </div>
                                                                </>
                                                            )}
                                                            <div>
                                                                <span className="text-gray-600">카테고리:</span>
                                                                <p className="font-medium text-gray-800">{priceInfo.room_category || '-'}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-600">인원수:</span>
                                                                <p className="font-medium text-gray-800">{totalGuests}명</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-600">가격:</span>
                                                                <p className="font-medium text-blue-600">{priceInfo.price ? `${priceInfo.price.toLocaleString()}원` : '-'}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-600">합계:</span>
                                                                <p className="font-medium text-red-600">{totalPrice.toLocaleString()}원</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                체크인 날짜 (견적 기준)
                            </label>
                            <input
                                type="date"
                                value={form.checkin}
                                readOnly
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                단가
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.unit_price}
                                onChange={(e) => handleInputChange('unit_price', parseFloat(e.target.value) || 0)}
                                placeholder="단가를 입력하세요"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                승선 도움 서비스
                            </label>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="boarding_assist"
                                        value="y"
                                        checked={form.boarding_assist === 'y'}
                                        onChange={(e) => handleInputChange('boarding_assist', e.target.value)}
                                        className="mr-2"
                                    />
                                    <span className="text-sm">예</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="boarding_assist"
                                        value="n"
                                        checked={form.boarding_assist === 'n'}
                                        onChange={(e) => handleInputChange('boarding_assist', e.target.value)}
                                        className="mr-2"
                                    />
                                    <span className="text-sm">아니오</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <SectionBox title="인원 정보">
                        <div className="text-center">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                투숙객 수 *
                            </label>
                            <div className="flex items-center justify-center space-x-4">
                                <button
                                    type="button"
                                    onClick={() => handleCountChange('guest_count', false)}
                                    className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                                >
                                    -
                                </button>
                                <span className="text-xl font-semibold w-8 text-center">
                                    {form.guest_count}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleCountChange('guest_count', true)}
                                    className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </SectionBox>
                </SectionBox>

                {/* 차량 정보 */}
                <SectionBox title="차량 정보">
                    {carPriceInfo && (
                        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                            <h4 className="text-sm font-medium text-green-800 mb-3">🚗 차량 가격 정보</h4>
                            <div className="bg-white p-3 rounded border">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    <div>
                                        <span className="text-gray-600">크루즈:</span>
                                        <p className="font-medium text-gray-800">{carPriceInfo.cruise || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">차량 타입:</span>
                                        <p className="font-medium text-gray-800">{carPriceInfo.car_type || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">일정:</span>
                                        <p className="font-medium text-gray-800">{carPriceInfo.schedule || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">카테고리:</span>
                                        <p className="font-medium text-gray-800">{carPriceInfo.car_category || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">승객수:</span>
                                        <p className="font-medium text-gray-800">{carPriceInfo.passenger_count || '-'}명</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">가격:</span>
                                        <p className="font-medium text-green-600">{carPriceInfo.price ? `${carPriceInfo.price.toLocaleString()}원` : '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">합계:</span>
                                        <p className="font-medium text-red-600">{carPriceInfo.price && form.car_count ? `${(carPriceInfo.price * form.car_count).toLocaleString()}원` : '-'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    차량 수
                                </label>
                                <div className="flex items-center space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => handleCountChange('car_count', false)}
                                        className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm"
                                    >
                                        -
                                    </button>
                                    <span className="text-lg font-semibold w-6 text-center">
                                        {form.car_count}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleCountChange('car_count', true)}
                                        className="w-6 h-6 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center text-sm"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    승객 수
                                </label>
                                <div className="flex items-center space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => handleCountChange('passenger_count', false)}
                                        className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm"
                                    >
                                        -
                                    </button>
                                    <span className="text-lg font-semibold w-6 text-center">
                                        {form.passenger_count}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleCountChange('passenger_count', true)}
                                        className="w-6 h-6 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center text-sm"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                픽업 일시
                            </label>
                            <input
                                type="datetime-local"
                                value={form.pickup_datetime}
                                onChange={(e) => handleInputChange('pickup_datetime', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                픽업 장소
                            </label>
                            <input
                                type="text"
                                value={form.pickup_location}
                                onChange={(e) => handleInputChange('pickup_location', e.target.value)}
                                placeholder="픽업 장소를 입력하세요"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                드롭오프 장소
                            </label>
                            <input
                                type="text"
                                value={form.dropoff_location}
                                onChange={(e) => handleInputChange('dropoff_location', e.target.value)}
                                placeholder="드롭오프 장소를 입력하세요"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </SectionBox>

                {/* 예약 종합 정보 */}
                <SectionBox title="예약 종합 정보">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                룸 총 가격
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.room_total_price}
                                onChange={(e) => handleInputChange('room_total_price', parseFloat(e.target.value) || 0)}
                                placeholder="룸 총 가격을 입력하세요"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                자동 계산: {form.unit_price?.toLocaleString()}원 × {form.guest_count}명 = {(form.unit_price * form.guest_count)?.toLocaleString()}원
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                차량 총 가격
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.car_total_price}
                                onChange={(e) => handleInputChange('car_total_price', parseFloat(e.target.value) || 0)}
                                placeholder="차량 총 가격을 입력하세요"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {carPriceInfo?.price && (
                                <p className="text-xs text-gray-500 mt-1">
                                    자동 계산: {carPriceInfo.price?.toLocaleString()}원 × {form.car_count}대 = {(carPriceInfo.price * form.car_count)?.toLocaleString()}원
                                </p>
                            )}
                        </div>
                    </div>

                    {/* 총 예약 금액 표시 */}
                    <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <h4 className="text-sm font-medium text-yellow-800 mb-3">💰 총 예약 금액</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div>
                                <span className="text-gray-600">룸 비용:</span>
                                <p className="font-medium text-blue-600">{form.room_total_price?.toLocaleString()}원</p>
                            </div>
                            <div>
                                <span className="text-gray-600">차량 비용:</span>
                                <p className="font-medium text-green-600">{form.car_total_price?.toLocaleString()}원</p>
                            </div>
                            <div className="md:text-right">
                                <span className="text-gray-600">총 금액:</span>
                                <p className="font-bold text-lg text-red-600">
                                    {(form.room_total_price + form.car_total_price)?.toLocaleString()}원
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            특별 요청사항
                        </label>
                        <textarea
                            value={form.request_note}
                            onChange={(e) => handleInputChange('request_note', e.target.value)}
                            placeholder="특별한 요청사항이 있으시면 입력해주세요"
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </SectionBox>


                {/* 제출 버튼 */}
                <div className="flex justify-center space-x-4 pt-6">
                    <button
                        onClick={() => router.push('/mypage/reservations')}
                        className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? '저장 중...' : '크루즈 예약 저장'}
                    </button>
                </div>
            </div>
        </PageWrapper>
    );
}

export default function CruiseReservationPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64">로딩 중...</div>}>
            <CruiseReservationContent />
        </Suspense>
    );
}
