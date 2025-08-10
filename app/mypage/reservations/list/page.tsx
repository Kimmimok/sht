'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';
// Link 사용 제거됨

interface Reservation {
  re_id: string;
  re_type: string;
  re_status: string;
  re_created_at: string;
  re_quote_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
}

export default function MyReservationsListPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [cruiseMeta, setCruiseMeta] = useState<Record<string, { checkin?: string; guest_count?: number }>>({});
  const [methods, setMethods] = useState<{ code: string; name: string }[]>([]);
  // 섹션 상세 데이터 & 합계
  const [cruiseDetails, setCruiseDetails] = useState<any[]>([]);
  const [cruiseCarDetails, setCruiseCarDetails] = useState<any[]>([]);
  const [airportDetails, setAirportDetails] = useState<any[]>([]);
  const [hotelDetails, setHotelDetails] = useState<any[]>([]);
  const [rentcarDetails, setRentcarDetails] = useState<any[]>([]);
  const [tourDetails, setTourDetails] = useState<any[]>([]);
  const [amountsByReservation, setAmountsByReservation] = useState<Record<string, number>>({});
  // 가격 테이블 by code 맵
  const [roomPricesByCode, setRoomPricesByCode] = useState<Record<string, any[]>>({});
  const [carPricesByCode, setCarPricesByCode] = useState<Record<string, any[]>>({});
  const [airportPricesByCode, setAirportPricesByCode] = useState<Record<string, any[]>>({});
  const [hotelPricesByCode, setHotelPricesByCode] = useState<Record<string, any[]>>({});
  const [rentPricesByCode, setRentPricesByCode] = useState<Record<string, any[]>>({});
  const [tourPricesByCode, setTourPricesByCode] = useState<Record<string, any[]>>({});
  // 견적 타이틀 맵
  const [quotesById, setQuotesById] = useState<Record<string, { title: string; status?: string }>>({});
  // 결제 상태 매핑
  const [paymentStatusByReservation, setPaymentStatusByReservation] = useState<Record<string, { hasCompleted: boolean; payments: any[] }>>({});

  // payment modal state
  const [showPay, setShowPay] = useState(false);
  const [payReservationId, setPayReservationId] = useState<string>('');
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<string>('');
  const [savingPay, setSavingPay] = useState(false);
  // 일괄 결제 모달 상태
  const [showBulkPay, setShowBulkPay] = useState(false);
  const [bulkSelections, setBulkSelections] = useState<Record<string, boolean>>({});
  const [bulkMethod, setBulkMethod] = useState('');
  const [savingBulk, setSavingBulk] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      setLoading(true);

      // 사용자 인증 확인
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }

      // 결제 수단 로드
      const { data: methodsData } = await supabase
        .from('payment_info')
        .select('code, name')
        .order('name');
      setMethods((methodsData as any[])?.map(m => ({ code: m.code, name: m.name })) || []);

      // 예약 목록 조회 (기본 컬럼)
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservation')
        .select(`
          re_id,
          re_type,
          re_status,
          re_created_at,
          re_quote_id,
          contact_name,
          contact_phone,
          contact_email
        `)
        .eq('re_user_id', user.id)
        .order('re_created_at', { ascending: false });

      if (reservationsError) throw reservationsError;

      const rows = (reservationsData as Reservation[]) || [];
      setReservations(rows);

      // 결제 상태 조회
      const allReservationIds = rows.map(r => r.re_id);
      if (allReservationIds.length) {
        const { data: paymentData } = await supabase
          .from('reservation_payment')
          .select('reservation_id, payment_status, amount, payment_method, created_at')
          .in('reservation_id', allReservationIds);

        // 예약별 결제 정보 매핑
        const paymentMap: Record<string, { hasCompleted: boolean; payments: any[] }> = {};
        for (const rid of allReservationIds) {
          const payments = (paymentData || []).filter(p => p.reservation_id === rid);
          const hasCompleted = payments.some(p => p.payment_status === 'completed');
          paymentMap[rid] = { hasCompleted, payments };
        }
        setPaymentStatusByReservation(paymentMap);
      } else {
        setPaymentStatusByReservation({});
      }

      // 견적 타이틀 배치 조회
      const quoteIds = Array.from(new Set(rows.map(r => r.re_quote_id).filter(Boolean))) as string[];
      if (quoteIds.length) {
        const { data: quotes } = await supabase
          .from('quote')
          .select('id, title, status')
          .in('id', quoteIds);
        const map: Record<string, { title: string; status?: string }> = {};
        for (const q of (quotes as any[]) || []) {
          map[q.id] = { title: q.title ?? '제목 없음', status: q.status };
        }
        setQuotesById(map);
      } else {
        setQuotesById({});
      }

      // 크루즈 메타 정보 (체크인, 인원) 보조 조회
      const cruiseIds = rows.filter(r => r.re_type === 'cruise').map(r => r.re_id);
      if (cruiseIds.length) {
        const { data: cruiseRows } = await supabase
          .from('reservation_cruise')
          .select('reservation_id, checkin, guest_count')
          .in('reservation_id', cruiseIds);
        const map: Record<string, { checkin?: string; guest_count?: number }> = {};
        for (const c of (cruiseRows as any[]) || []) {
          map[c.reservation_id] = { checkin: c.checkin, guest_count: c.guest_count };
        }
        setCruiseMeta(map);
      } else {
        setCruiseMeta({});
      }

      // 섹션 데이터 일괄 로드 및 금액 합계 계산
      const allIds = rows.map(r => r.re_id);
      if (allIds.length) {
        const [cruiseRes, cruiseCarRes, airportRes, hotelRes, rentRes, tourRes] = await Promise.all([
          supabase.from('reservation_cruise').select('*').in('reservation_id', allIds),
          supabase.from('reservation_cruise_car').select('*').in('reservation_id', allIds),
          supabase.from('reservation_airport').select('*').in('reservation_id', allIds),
          supabase.from('reservation_hotel').select('*').in('reservation_id', allIds),
          supabase.from('reservation_rentcar').select('*').in('reservation_id', allIds),
          supabase.from('reservation_tour').select('*').in('reservation_id', allIds)
        ]);
        setCruiseDetails((cruiseRes.data as any[]) || []);
        setCruiseCarDetails((cruiseCarRes.data as any[]) || []);
        setAirportDetails((airportRes.data as any[]) || []);
        setHotelDetails((hotelRes.data as any[]) || []);
        setRentcarDetails((rentRes.data as any[]) || []);
        setTourDetails((tourRes.data as any[]) || []);

        // 가격 테이블 조회 (코드 IN)
        const uniq = (arr: any[]) => Array.from(new Set(arr.filter(Boolean)));
        const roomCodes = uniq(((cruiseRes.data as any[]) || []).map(r => r.room_price_code));
        const carCodes = uniq(((cruiseCarRes.data as any[]) || []).map(r => r.car_price_code));
        const airportCodes = uniq(((airportRes.data as any[]) || []).map(r => r.airport_price_code));
        const hotelCodes = uniq(((hotelRes.data as any[]) || []).map(r => r.hotel_price_code));
        const rentCodes = uniq(((rentRes.data as any[]) || []).map(r => r.rentcar_price_code));
        const tourCodes = uniq(((tourRes.data as any[]) || []).map(r => r.tour_price_code));

        const [roomPriceRes, carPriceRes, airportPriceRes, hotelPriceRes, rentPriceRes, tourPriceRes] = await Promise.all([
          roomCodes.length ? supabase.from('room_price').select('*').in('room_code', roomCodes) : Promise.resolve({ data: [] as any[] }),
          carCodes.length ? supabase.from('car_price').select('*').in('car_code', carCodes) : Promise.resolve({ data: [] as any[] }),
          airportCodes.length ? supabase.from('airport_price').select('*').in('airport_code', airportCodes) : Promise.resolve({ data: [] as any[] }),
          hotelCodes.length ? supabase.from('hotel_price').select('*').in('hotel_code', hotelCodes) : Promise.resolve({ data: [] as any[] }),
          rentCodes.length ? supabase.from('rent_price').select('*').in('rent_code', rentCodes) : Promise.resolve({ data: [] as any[] }),
          tourCodes.length ? supabase.from('tour_price').select('*').in('tour_code', tourCodes) : Promise.resolve({ data: [] as any[] })
        ]);

        const groupBy = (rows: any[], key: string) => {
          const map: Record<string, any[]> = {};
          for (const row of rows || []) {
            const k = row?.[key];
            if (!k) continue;
            if (!map[k]) map[k] = [];
            map[k].push(row);
          }
          return map;
        };
        setRoomPricesByCode(groupBy((roomPriceRes as any).data || [], 'room_code'));
        setCarPricesByCode(groupBy((carPriceRes as any).data || [], 'car_code'));
        setAirportPricesByCode(groupBy((airportPriceRes as any).data || [], 'airport_code'));
        setHotelPricesByCode(groupBy((hotelPriceRes as any).data || [], 'hotel_code'));
        setRentPricesByCode(groupBy((rentPriceRes as any).data || [], 'rent_code'));
        setTourPricesByCode(groupBy((tourPriceRes as any).data || [], 'tour_code'));

        const amounts: Record<string, number> = {};
        for (const c of ((cruiseRes.data as any[]) || [])) {
          const rid = c.reservation_id; amounts[rid] = (amounts[rid] || 0) + Number(c.room_total_price || 0);
        }
        for (const cc of ((cruiseCarRes.data as any[]) || [])) {
          const rid = cc.reservation_id; amounts[rid] = (amounts[rid] || 0) + Number(cc.car_total_price || 0);
        }
        for (const a of ((airportRes.data as any[]) || [])) {
          const rid = a.reservation_id; amounts[rid] = (amounts[rid] || 0) + Number(a.total_price || 0);
        }
        for (const h of ((hotelRes.data as any[]) || [])) {
          const rid = h.reservation_id; amounts[rid] = (amounts[rid] || 0) + Number(h.total_price || 0);
        }
        for (const r of ((rentRes.data as any[]) || [])) {
          const rid = r.reservation_id; amounts[rid] = (amounts[rid] || 0) + Number(r.total_price || 0);
        }
        for (const t of ((tourRes.data as any[]) || [])) {
          const rid = t.reservation_id; amounts[rid] = (amounts[rid] || 0) + Number(t.total_price || 0);
        }
        setAmountsByReservation(amounts);
        const defaults: Record<string, boolean> = {};
        for (const r of rows) {
          if (r.re_status === 'confirmed' && (amounts[r.re_id] || 0) > 0) defaults[r.re_id] = true;
        }
        setBulkSelections(defaults);
      } else {
        setCruiseDetails([]); setCruiseCarDetails([]); setAirportDetails([]); setHotelDetails([]); setRentcarDetails([]); setTourDetails([]);
        setAmountsByReservation({}); setBulkSelections({});
        setRoomPricesByCode({}); setCarPricesByCode({}); setAirportPricesByCode({}); setHotelPricesByCode({}); setRentPricesByCode({}); setTourPricesByCode({});
      }
    } catch (error) {
      console.error('예약 목록 조회 오류:', error);
      alert('예약 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '대기중';
      case 'confirmed': return '확정됨';
      case 'processing': return '처리중';
      case 'cancelled': return '취소됨';
      case 'completed': return '완료됨';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-25';
      case 'confirmed': return 'text-green-600 bg-green-25';
      case 'processing': return 'text-blue-600 bg-blue-25';
      case 'cancelled': return 'text-red-600 bg-red-25';
      case 'completed': return 'text-purple-600 bg-purple-25';
      default: return 'text-gray-600 bg-gray-25';
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

  // 예약 제목 생성 함수
  const getReservationTitle = (reservation: Reservation) => {
    if (reservation.re_type === 'cruise') {
      const meta = cruiseMeta[reservation.re_id];
      const checkIn = meta?.checkin ? new Date(meta.checkin).toLocaleDateString() : '날짜 미정';
      const guests = meta?.guest_count ? ` • 인원 ${meta.guest_count}명` : '';
      return `${checkIn} | 크루즈${guests}`;
    }
    return `${new Date(reservation.re_created_at).toLocaleDateString()} | ${reservation.re_type}`;
  };

  // === 견적 상세보기와 동일 렌더링을 위한 라벨 맵/가격 라벨 맵/공통 렌더러 ===
  const labelMap: Record<string, Record<string, string>> = {
    cruise: {
      reservation_id: '예약 ID', room_price_code: '객실 가격 코드', checkin: '체크인', guest_count: '탑승객 수', unit_price: '단가', boarding_assist: '승선 지원', room_total_price: '객실 총액', request_note: '요청사항', created_at: '생성일시'
    },
    cruise_car: {
      reservation_id: '예약 ID', car_price_code: '차량 가격 코드', car_count: '차량 수', passenger_count: '승객 수', pickup_datetime: '픽업 일시', pickup_location: '픽업 장소', dropoff_location: '하차 장소', car_total_price: '차량 총액', request_note: '요청사항', created_at: '생성일시', updated_at: '수정일시'
    },
    airport: {
      reservation_id: '예약 ID', airport_price_code: '공항 가격 코드', ra_airport_location: '공항 위치', ra_flight_number: '항공편 번호', ra_datetime: '일시', ra_stopover_location: '경유지', ra_stopover_wait_minutes: '경유 대기(분)', ra_car_count: '차량 수', ra_passenger_count: '승객 수', ra_luggage_count: '수하물 수', request_note: '요청사항', ra_is_processed: '처리 여부', created_at: '생성일시'
    },
    hotel: {
      reservation_id: '예약 ID', hotel_price_code: '호텔 가격 코드', schedule: '스케줄', room_count: '객실 수', checkin_date: '체크인', breakfast_service: '조식 서비스', hotel_category: '호텔 카테고리', guest_count: '투숙객 수', total_price: '총액', request_note: '요청사항', created_at: '생성일시'
    },
    rentcar: {
      reservation_id: '예약 ID', rentcar_price_code: '렌터카 가격 코드', rentcar_count: '렌터카 수', unit_price: '단가', car_count: '차량 수', passenger_count: '승객 수', pickup_datetime: '픽업 일시', pickup_location: '픽업 장소', destination: '목적지', via_location: '경유지', via_waiting: '경유 대기', luggage_count: '수하물 수', total_price: '총액', request_note: '요청사항', created_at: '생성일시'
    },
    tour: {
      reservation_id: '예약 ID', tour_price_code: '투어 가격 코드', tour_capacity: '투어 정원', pickup_location: '픽업 장소', dropoff_location: '하차 장소', total_price: '총액', request_note: '요청사항', created_at: '생성일시'
    }
  };

  const priceLabelMap: Record<string, Record<string, string>> = {
    room_price: { room_code: '객실 코드', schedule: '스케줄', room_category: '객실 카테고리', cruise: '크루즈', room_type: '객실 타입', price: '가격', start_date: '시작일', end_date: '종료일', payment: '결제 방식' },
    car_price: { car_code: '차량 코드', car_category: '카테고리', cruise: '크루즈', car_type: '차량 타입', price: '가격', schedule: '스케줄', passenger_count: '승객 수' },
    airport_price: { airport_code: '공항 코드', airport_category: '카테고리', airport_route: '노선', airport_car_type: '차량 타입', price: '가격' },
    hotel_price: { hotel_code: '호텔 코드', hotel_name: '호텔명', room_name: '객실명', room_type: '객실 타입', price: '가격', start_date: '시작일', end_date: '종료일', weekday_type: '요일 구분' },
    rent_price: { rent_code: '렌트 코드', rent_type: '렌트 타입', rent_category: '카테고리', rent_route: '경로', rent_car_type: '차량 타입', price: '가격' },
    tour_price: { tour_code: '투어 코드', tour_name: '투어명', tour_capacity: '정원', tour_vehicle: '이동수단', tour_type: '투어 타입', price: '가격' }
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
              if (typeof value === 'number') display = Number(value).toLocaleString('ko-KR');
              if (typeof value === 'object' && value !== null) { try { display = JSON.stringify(value); } catch { display = String(value); } }
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

  const renderServiceWithPricesByCode = (
    items: any[] | null | undefined,
    type: keyof typeof labelMap,
    priceTableKey: keyof typeof priceLabelMap,
    getCode: (it: any) => string | undefined,
    codeMap: Record<string, any[]>
  ) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="space-y-4">
        {items.map((it, idx) => {
          const code = getCode(it);
          const prices = (code && codeMap[code]) || [];
          return (
            <div key={idx} className="border border-gray-200 rounded-lg">
              <div className="bg-gray-50 text-xs text-gray-600 px-3 py-2 rounded-t">항목 {idx + 1} · 예약 {String(it.reservation_id || '').slice(0, 8)}… · {getStatusText(reservations.find(r => r.re_id === it.reservation_id)?.re_status || '-')}</div>
              <div className="p-3 space-y-3">
                {renderLabeledTable(it, type)}
                {prices && prices.length > 0 && (
                  <div className="mt-2">
                    <div className="text-sm font-medium text-blue-700 mb-2">가격 옵션</div>
                    <div className="space-y-3">
                      {prices.map((p, pi) => (
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
          );
        })}
      </div>
    );
  };

  const handleOpenPay = (reservationId: string) => {
    setPayReservationId(reservationId);
    setPayAmount('');
    setPayMethod('');
    setShowPay(true);
  };

  const handleCreatePayment = async () => {
    if (!payReservationId || !payAmount || !payMethod) return;
    setSavingPay(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('로그인이 필요합니다.');
        return;
      }
      const { error } = await supabase
        .from('reservation_payment')
        .insert({
          reservation_id: payReservationId,
          user_id: user.id,
          amount: Number(payAmount),
          payment_method: payMethod,
          payment_status: 'pending'
        });
      if (error) throw error;
      setShowPay(false);
      alert('결제 요청이 생성되었습니다.');
      // 결제 상태 다시 로드
      await fetchReservations();
    } catch (e) {
      console.error('결제 생성 실패', e);
      alert('결제 생성에 실패했습니다.');
    } finally {
      setSavingPay(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-300"></div>
          <p className="ml-4 text-gray-600">예약 목록을 불러오는 중...</p>
        </div>
      </PageWrapper>
    );
  }
  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-6">
        <SectionBox>
          <div className="mb-6">
            <div className="text-xl font-bold text-gray-800">📂 내 예약 목록</div>
          </div>
          <div className="mb-4 flex justify-between items-center">
            <p className="text-gray-600">총 {reservations.length}건의 예약이 있습니다.</p>
            <div className="space-x-2">
              {reservations.some(r => {
                const paymentInfo = paymentStatusByReservation[r.re_id];
                return r.re_status === 'confirmed' &&
                  (amountsByReservation[r.re_id] || 0) > 0 &&
                  !paymentInfo?.hasCompleted;
              }) && (
                  <button
                    onClick={() => setShowBulkPay(true)}
                    className="bg-orange-300 text-gray-700 px-2 py-1 rounded hover:bg-orange-400 text-base"
                  >
                    결제 신청
                  </button>
                )}
            </div>
          </div>

          {reservations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🎫</div>
              <p className="text-gray-500">예약 내역이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 요약 카드 */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-gray-500">예약 건수</div>
                    <div className="text-lg font-semibold">{reservations.length}건</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">확정 + 미결제</div>
                    <div className="text-lg font-semibold">
                      {reservations.filter(r => {
                        const paymentInfo = paymentStatusByReservation[r.re_id];
                        return r.re_status === 'confirmed' &&
                          (amountsByReservation[r.re_id] || 0) > 0 &&
                          !paymentInfo?.hasCompleted;
                      }).length}건
                    </div>
                  </div>
                </div>
              </div>

              {/* 견적 ID별 그룹 목록 */}
              {(() => {
                const grouped = reservations.reduce((acc, r) => {
                  const key = r.re_quote_id || 'no-quote';
                  (acc[key] ||= []).push(r);
                  return acc;
                }, {} as Record<string, Reservation[]>);
                const entries = Object.entries(grouped).sort(([, a], [, b]) => {
                  const ta = Math.max(...a.map(x => new Date(x.re_created_at).getTime()));
                  const tb = Math.max(...b.map(x => new Date(x.re_created_at).getTime()));
                  return tb - ta;
                });
                return entries.map(([qid, list]) => {
                  const title = qid !== 'no-quote' ? (quotesById[qid]?.title || '제목 없음') : '연결된 견적 없음';
                  const shortId = qid !== 'no-quote' ? `${qid.slice(0, 8)}...` : '';
                  const typeOrder = ['cruise', 'airport', 'hotel', 'tour', 'rentcar'];
                  const sorted = list.slice().sort((a, b) => {
                    const ta = typeOrder.indexOf(a.re_type); const tb = typeOrder.indexOf(b.re_type);
                    if (ta !== tb) return ta - tb;
                    return new Date(b.re_created_at).getTime() - new Date(a.re_created_at).getTime();
                  });
                  return (
                    <div key={qid} className="bg-white rounded-lg border overflow-hidden">
                      <div className="px-4 py-3 bg-blue-50 border-b flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-blue-800">견적: {title}</span>
                          {shortId && <span className="text-xs text-blue-600">({shortId})</span>}
                          <div className="flex items-center gap-1 ml-2">
                            {['cruise', 'airport', 'hotel', 'tour', 'rentcar'].map(t => {
                              const cnt = list.filter(x => x.re_type === t).length;
                              if (!cnt) return null;
                              const color = t === 'cruise' ? 'bg-blue-100 text-blue-700' : t === 'airport' ? 'bg-green-100 text-green-700' : t === 'hotel' ? 'bg-purple-100 text-purple-700' : t === 'tour' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700';
                              return <span key={t} className={`px-2 py-0.5 rounded-full text-xs ${color}`}>{getTypeName(t)} {cnt}</span>;
                            })}
                          </div>
                        </div>
                        {qid !== 'no-quote' && (
                          <button onClick={() => router.push(`/mypage/quotes/${qid}/view`)} className="text-xs px-3 py-1 rounded border border-blue-300 text-blue-700 hover:bg-blue-100">견적 보기</button>
                        )}
                      </div>
                      <div className="p-3 space-y-2">
                        {sorted.map(r => {
                          const meta = r.re_type === 'cruise' ? cruiseMeta[r.re_id] : undefined;
                          const dateMain = meta?.checkin ? new Date(meta.checkin).toLocaleDateString('ko-KR') : new Date(r.re_created_at).toLocaleDateString('ko-KR');
                          const amount = Number(amountsByReservation[r.re_id] || 0);
                          const paymentInfo = paymentStatusByReservation[r.re_id];
                          const hasCompletedPayment = paymentInfo?.hasCompleted || false;
                          return (
                            <div key={r.re_id} className="flex items-center justify-between p-3 border rounded">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">{getTypeName(r.re_type)}</span>
                                  <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(r.re_status)}`}>{getStatusText(r.re_status)}</span>
                                  {hasCompletedPayment && (
                                    <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">결제완료</span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-600 mt-0.5 flex gap-3">
                                  <span>{dateMain}</span>
                                  <span className="text-gray-400">ID: {r.re_id.slice(0, 8)}...</span>
                                  {hasCompletedPayment && paymentInfo.payments.length > 0 && (
                                    <span className="text-green-600">
                                      결제: {paymentInfo.payments.filter(p => p.payment_status === 'completed').length}건
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {amount > 0 && <span className="text-sm font-semibold text-orange-600">{amount.toLocaleString()}동</span>}
                                <button onClick={() => router.push(`/mypage/reservations/${r.re_id}/view`)} className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">상세</button>
                                {hasCompletedPayment && (
                                  <button
                                    onClick={() => router.push(`/customer/confirmation?quote_id=${r.re_quote_id}&token=customer`)}
                                    className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                                  >
                                    예약확인서
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </SectionBox>
        {/* 일괄 결제 모달 */}
        {showBulkPay && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-xl p-6">
              <h3 className="text-lg font-semibold mb-4">결제 신청</h3>
              <div className="max-h-64 overflow-auto border rounded">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600">
                      <th className="px-3 py-2 text-left">선택</th>
                      <th className="px-3 py-2 text-left">예약</th>
                      <th className="px-3 py-2 text-left">상태</th>
                      <th className="px-3 py-2 text-left">금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations
                      .filter(r => {
                        const paymentInfo = paymentStatusByReservation[r.re_id];
                        return r.re_status === 'confirmed' &&
                          (amountsByReservation[r.re_id] || 0) > 0 &&
                          !paymentInfo?.hasCompleted;
                      })
                      .map(r => (
                        <tr key={r.re_id} className="border-t">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={!!bulkSelections[r.re_id]}
                              onChange={(e) => setBulkSelections(s => ({ ...s, [r.re_id]: e.target.checked }))}
                            />
                          </td>
                          <td className="px-3 py-2">{String(r.re_id).slice(0, 8)}...</td>
                          <td className="px-3 py-2">{getStatusText(r.re_status)}</td>
                          <td className="px-3 py-2">{Number(amountsByReservation[r.re_id] || 0).toLocaleString()}동</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">결제 수단</label>
                  <select
                    value={bulkMethod}
                    onChange={(e) => setBulkMethod(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">선택</option>
                    {methods.map(m => (
                      <option key={m.code} value={m.code}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">총 결제 금액</div>
                  <div className="text-xl font-bold text-orange-600">
                    {Object.entries(bulkSelections)
                      .filter(([, v]) => v)
                      .reduce((sum, [rid]) => sum + (amountsByReservation[rid] || 0), 0)
                      .toLocaleString()}동
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button className="px-4 py-2 rounded border" onClick={() => setShowBulkPay(false)} disabled={savingBulk}>취소</button>
                <button
                  className="px-4 py-2 rounded bg-orange-600 text-white disabled:opacity-50"
                  disabled={savingBulk || !bulkMethod || Object.values(bulkSelections).every(v => !v)}
                  onClick={async () => {
                    setSavingBulk(true);
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) { alert('로그인이 필요합니다.'); return; }
                      const targets = reservations.filter(r => {
                        const paymentInfo = paymentStatusByReservation[r.re_id];
                        return bulkSelections[r.re_id] && !paymentInfo?.hasCompleted;
                      });
                      if (!targets.length) { setSavingBulk(false); return; }
                      const payload = targets.map(r => ({
                        reservation_id: r.re_id,
                        user_id: user.id,
                        amount: Number(amountsByReservation[r.re_id] || 0),
                        payment_method: bulkMethod,
                        payment_status: 'pending'
                      }));
                      const { error } = await supabase.from('reservation_payment').insert(payload);
                      if (error) throw error;
                      setShowBulkPay(false);
                      alert('결제 신청이 생성되었습니다.');
                      // 결제 상태 다시 로드
                      await fetchReservations();
                    } catch (e) {
                      console.error('일괄 결제 생성 실패', e);
                      alert('일괄 결제 생성에 실패했습니다.');
                    } finally {
                      setSavingBulk(false);
                    }
                  }}
                >{savingBulk ? '생성 중...' : '결제 신청'}</button>
              </div>
            </div>
          </div>
        )}
        {showPay && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-semibold mb-4">결제 생성</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">예약 ID</label>
                  <input value={payReservationId} readOnly className="w-full px-3 py-2 border rounded bg-gray-50 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">금액</label>
                    <input
                      type="number"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">결제 수단</label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                    >
                      <option value="">선택</option>
                      {methods.map(m => (
                        <option key={m.code} value={m.code}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button className="px-4 py-2 rounded border" onClick={() => setShowPay(false)} disabled={savingPay}>취소</button>
                <button
                  className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50"
                  onClick={handleCreatePayment}
                  disabled={savingPay || !payReservationId || !payAmount || !payMethod}
                >{savingPay ? '저장 중...' : '결제 생성'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
