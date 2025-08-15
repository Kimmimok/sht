'use client';
import React from 'react';

import { useParams, notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

export default function ReservationViewPage() {
  const params = useParams();
  const id = params?.id as string;

  const [reservation, setReservation] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      const { data, error } = await supabase
        .from('reservation')
        .select(
          `
          *,
          reservation_room(room_price_code, checkin, guest_count, unit_price),
          reservation_car(car_price_code, car_count, unit_price),
          quote(schedule_code, cruise_code, payment_code, checkin, discount_rate),
          users(email)
        `
        )
        .eq('re_id', id)
        .single();

      if (error) {
        setError(error);
      } else {
        setReservation(data);
      }
    };

    fetchData();
  }, [id]);

  if (error) return notFound();
  if (!reservation) return <div className="text-center py-10">🔄 불러오는 중...</div>;

  const { reservation_room = [], reservation_car = [] } = reservation;

  return (
    <PageWrapper>
      <h1 className="text-xl font-bold mb-4 text-center">📄 예약서 상세</h1>

      <SectionBox title="기본 정보">
        <p>🆔 예약 ID: {reservation.re_id}</p>
        <p>👤 사용자: {reservation.users?.email}</p>
        <p>📅 생성일: {new Date(reservation.re_created_at).toLocaleString()}</p>
        <p>💼 예약 유형: {reservation.re_type}</p>
        <p>🧾 연결된 견적: {reservation.re_quote_id || '없음'}</p>
      </SectionBox>

      {reservation.quote && (
        <SectionBox title="견적 정보">
          <p>🗓 일정 코드: {reservation.quote.schedule_code}</p>
          <p>🚢 크루즈: {reservation.quote.cruise_code}</p>
          <p>💳 결제 방식: {reservation.quote.payment_code}</p>
          <p>📅 체크인: {reservation.quote.checkin}</p>
          <p>💸 할인율: {reservation.quote.discount_rate}%</p>
        </SectionBox>
      )}

      {reservation_room.length > 0 && (
        <SectionBox title="객실 정보">
          {reservation_room.map((room: any, index: number) => (
            <div key={index} className="border-b py-2">
              <p>🏨 객실 요금 코드: {room.room_price_code}</p>
              <p>📅 체크인: {room.checkin}</p>
              <p>👥 인원수: {room.guest_count}</p>
              <p>💰 단가: {room.unit_price.toLocaleString()}동</p>
            </div>
          ))}
        </SectionBox>
      )}

      {reservation_car.length > 0 && (
        <SectionBox title="차량 정보">
          {reservation_car.map((car: any, index: number) => (
            <div key={index} className="border-b py-2">
              <p>🚗 차량 요금 코드: {car.car_price_code}</p>
              <p>🚘 차량 수: {car.car_count}</p>
              <p>💰 단가: {car.unit_price.toLocaleString()}동</p>
            </div>
          ))}
        </SectionBox>
      )}

      <div className="text-center mt-6">
        <button onClick={() => window.print()} className="btn">
          🖨️ 인쇄 / PDF 저장
        </button>
      </div>
    </PageWrapper>
  );
}
