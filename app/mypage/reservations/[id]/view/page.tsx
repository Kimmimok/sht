"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

type ServiceType = 'cruise' | 'airport' | 'hotel' | 'rentcar' | 'tour';

interface ReservationRow {
  re_id: string;
  re_type: ServiceType;
  re_status: string;
  re_created_at: string;
  re_quote_id: string | null;
  re_user_id: string;
}

interface QuoteInfo { id: string; title: string | null; status?: string | null }

function getStatusText(status: string) {
  switch (status) {
    case 'pending': return '대기중';
    case 'confirmed': return '확정';
    case 'cancelled': return '취소됨';
    default: return status;
  }
}

function getTypeName(type: string) {
  switch (type) {
    case 'cruise': return '크루즈';
    case 'airport': return '공항';
    case 'hotel': return '호텔';
    case 'rentcar': return '렌터카';
    case 'tour': return '투어';
    default: return type;
  }
}

const labelMap: Record<string, Record<string, string>> = {
  cruise: { reservation_id: '예약 ID', room_price_code: '객실 가격 코드', checkin: '체크인', guest_count: '탑승객 수', unit_price: '단가', boarding_assist: '승선 지원', room_total_price: '객실 총액', request_note: '요청사항', created_at: '생성일시' },
  airport: { reservation_id: '예약 ID', airport_price_code: '공항 가격 코드', ra_airport_location: '공항 위치', ra_flight_number: '항공편 번호', ra_datetime: '일시', ra_stopover_location: '경유지', ra_stopover_wait_minutes: '경유 대기(분)', ra_car_count: '차량 수', ra_passenger_count: '승객 수', ra_luggage_count: '수하물 수', request_note: '요청사항', ra_is_processed: '처리 여부', created_at: '생성일시' },
  hotel: { reservation_id: '예약 ID', hotel_price_code: '호텔 가격 코드', schedule: '스케줄', room_count: '객실 수', checkin_date: '체크인', breakfast_service: '조식 서비스', hotel_category: '호텔 카테고리', guest_count: '투숙객 수', total_price: '총액', request_note: '요청사항', created_at: '생성일시' },
  rentcar: { reservation_id: '예약 ID', rentcar_price_code: '렌터카 가격 코드', rentcar_count: '렌터카 수', unit_price: '단가', car_count: '차량 수', passenger_count: '승객 수', pickup_datetime: '픽업 일시', pickup_location: '픽업 장소', destination: '목적지', via_location: '경유지', via_waiting: '경유 대기', luggage_count: '수하물 수', total_price: '총액', request_note: '요청사항', created_at: '생성일시' },
  tour: { reservation_id: '예약 ID', tour_price_code: '투어 가격 코드', tour_capacity: '투어 정원', pickup_location: '픽업 장소', dropoff_location: '하차 장소', total_price: '총액', request_note: '요청사항', created_at: '생성일시' },
  cruise_car: { reservation_id: '예약 ID', car_price_code: '차량 가격 코드', car_count: '차량 수', passenger_count: '승객 수', pickup_datetime: '픽업 일시', pickup_location: '픽업 장소', dropoff_location: '하차 장소', car_total_price: '차량 총액', request_note: '요청사항', created_at: '생성일시', updated_at: '수정일시' }
};

function renderLabeledTable(obj: any, type?: keyof typeof labelMap) {
  if (!obj) return null;
  const hiddenKeys = new Set(['id']);
  const entries = Object.entries(obj).filter(([k]) => {
    if (hiddenKeys.has(k)) return false;
    if (k.endsWith('_id')) return false;
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
}

function ReservationViewInner() {
  const router = useRouter();
  const params = useParams();
  const reservationId = params?.id as string;

  const [reservation, setReservation] = useState<ReservationRow | null>(null);
  const [quote, setQuote] = useState<QuoteInfo | null>(null);
  const [serviceDetails, setServiceDetails] = useState<any[] | null>(null);
  const [serviceDetailsExtra, setServiceDetailsExtra] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reservationId) return;
    (async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        // 본인 예약만 조회
        const { data: row, error: rErr } = await supabase
          .from('reservation')
          .select('*')
          .eq('re_id', reservationId)
          .eq('re_user_id', user.id)
          .maybeSingle();
        if (rErr) throw rErr;
        if (!row) { setError('예약이 없거나 접근 권한이 없습니다.'); return; }

        setReservation(row as ReservationRow);

        // 견적 정보
        if (row.re_quote_id) {
          const { data: q } = await supabase
            .from('quote')
            .select('id, title, status')
            .eq('id', row.re_quote_id)
            .maybeSingle();
          if (q) setQuote(q as QuoteInfo);
        }

        // 서비스 상세
        const tableByType: Record<ServiceType, string> = {
          cruise: 'reservation_cruise',
          airport: 'reservation_airport',
          hotel: 'reservation_hotel',
          rentcar: 'reservation_rentcar',
          tour: 'reservation_tour',
        };
        const table = tableByType[row.re_type as ServiceType];
        if (table) {
          const { data: svc } = await supabase
            .from(table)
            .select('*')
            .eq('reservation_id', reservationId)
            .order('created_at', { ascending: false });
          setServiceDetails(Array.isArray(svc) ? svc : (svc ? [svc] : []));
        }

        // 크루즈 차량 추가 데이터
        if (row.re_type === 'cruise') {
          const { data: car } = await supabase
            .from('reservation_cruise_car')
            .select('*')
            .eq('reservation_id', reservationId)
            .order('created_at', { ascending: false });
          setServiceDetailsExtra(Array.isArray(car) ? car : (car ? [car] : []));
        }

        setError(null);
      } catch (e: any) {
        console.error('예약 상세 조회 실패', e);
        setError(e?.message || '예약 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, [reservationId]);

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">예약 정보를 불러오는 중...</p>
        </div>
      </PageWrapper>
    );
  }

  if (!reservation) {
    return (
      <PageWrapper>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-600">예약 정보를 찾을 수 없습니다</h3>
          <button onClick={() => router.push('/mypage/reservations/list')} className="mt-4 px-3 py-1 rounded border">목록으로</button>
        </div>
      </PageWrapper>
    );
  }

  const title = quote?.title ?? '예약 상세';

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-800">{getTypeName(reservation.re_type)} 예약 상세</h1>
            <p className="text-sm text-gray-600 mt-1">
              상태: <span className="font-medium">{getStatusText(reservation.re_status)}</span> · 예약 ID: {reservation.re_id.slice(0, 8)}...
            </p>
          </div>
          <div className="flex items-center gap-2">
            {reservation.re_quote_id && (
              <button onClick={() => router.push(`/mypage/quotes/${reservation.re_quote_id}/view`)} className="px-3 py-1 bg-blue-50 text-blue-700 rounded border border-blue-200 text-sm">
                견적 보기
              </button>
            )}
            <button onClick={() => router.push('/mypage/reservations/list')} className="px-3 py-1 bg-gray-50 text-gray-700 rounded border text-sm">
              목록으로
            </button>
          </div>
        </div>

        {/* 견적 정보 */}
        <SectionBox title="연결된 견적">
          {reservation.re_quote_id ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-600">견적 제목</div>
                <div className="font-medium">{title}</div>
              </div>
              <div>
                <div className="text-gray-600">견적 상태</div>
                <div className="font-medium">{quote?.status || '-'}</div>
              </div>
              <div>
                <div className="text-gray-600">연결 ID</div>
                <div className="font-mono text-xs bg-gray-50 px-2 py-1 rounded border">{reservation.re_quote_id}</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">연결된 견적이 없습니다.</div>
          )}
        </SectionBox>

        {/* 서비스 상세 */}
        <SectionBox title={`${getTypeName(reservation.re_type)} 서비스 상세`}>
          {serviceDetails && serviceDetails.length > 0 ? (
            <div className="space-y-4">
              {serviceDetails.map((it, idx) => (
                <div key={idx} className="border border-gray-200 rounded">
                  <div className="bg-gray-50 text-xs text-gray-600 px-3 py-2 rounded-t">항목 {idx + 1}</div>
                  <div className="p-3">{renderLabeledTable(it, reservation.re_type)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-600">서비스 상세 정보가 없습니다.</div>
          )}
        </SectionBox>

        {/* 크루즈 연결 차량 */}
        {reservation.re_type === 'cruise' && (
          <SectionBox title="연결 차량 정보 (크루즈)">
            {serviceDetailsExtra && serviceDetailsExtra.length > 0 ? (
              <div className="space-y-4">
                {serviceDetailsExtra.map((it, idx) => (
                  <div key={idx} className="border border-gray-200 rounded">
                    <div className="bg-gray-50 text-xs text-gray-600 px-3 py-2 rounded-t">항목 {idx + 1}</div>
                    <div className="p-3">{renderLabeledTable(it, 'cruise_car')}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-600">연결 차량 정보가 없습니다.</div>
            )}
          </SectionBox>
        )}
      </div>
    </PageWrapper>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <PageWrapper>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </PageWrapper>
    }>
      <ReservationViewInner />
    </Suspense>
  );
}
