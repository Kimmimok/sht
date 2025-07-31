'use client';
import React from 'react';

import { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import supabase from '@/lib/supabase';

export default function QuoteViewPage() {
  const params = useParams();
  const id = params?.id as string;
  const [quote, setQuote] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      const { data, error } = await supabase
        .from('quote')
        .select(
          `
          *,
          quote_price_summary(*),
          users(email),
          quote_room(*),
          quote_car(*)
        `
        )
        .eq('id', id)
        .single();

      if (error) {
        setError(error);
      } else {
        setQuote(data);
      }
    };

    fetchData();
  }, [id]);

  if (error) return notFound();
  if (!quote) return <p className="text-center py-10">불러오는 중...</p>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-bold">📄 견적서 확인</h1>

      <div className="border p-4 rounded">
        <h2 className="font-semibold mb-2">🧾 기본 정보</h2>
        <p>견적자: {quote.users?.email || '—'}</p>
        <p>체크인: {quote.checkin}</p>
        <p>일정: {quote.schedule_code}</p>
        <p>크루즈: {quote.cruise_code}</p>
        <p>결제 방식: {quote.payment_code}</p>
        <p>할인율: {quote.discount_rate}%</p>
      </div>

      <div className="border p-4 rounded">
        <h2 className="font-semibold mb-2">🏨 객실 구성</h2>
        {quote.quote_room?.length > 0 ? (
          quote.quote_room.map((room: any, idx: number) => (
            <div key={room.id} className="mb-3">
              <p>
                <strong>객실 {idx + 1}:</strong> {room.room_code}
              </p>
              <p>
                ⮡ 카테고리: {room.category} / 인원: {room.person_count}명
              </p>
              <p>
                ⮡ 객실 금액: {room.room_unit_price?.toLocaleString()} × {room.person_count} ={' '}
                {room.room_total_price?.toLocaleString()}원
              </p>
            </div>
          ))
        ) : (
          <p>객실 정보 없음</p>
        )}
      </div>

      <div className="border p-4 rounded">
        <h2 className="font-semibold mb-2">🚐 차량 정보</h2>
        {quote.quote_car?.length > 0 ? (
          quote.quote_car.map((car: any, idx: number) => (
            <div key={car.id} className="mb-3">
              <p>
                <strong>차량:</strong> {car.vehicle_code} / {car.car_category_code}
              </p>
              <p>
                ⮡ 차량 금액: {car.car_unit_price?.toLocaleString()} × {car.car_count} ={' '}
                {car.car_total_price?.toLocaleString()}원
              </p>
            </div>
          ))
        ) : (
          <p>차량 정보 없음</p>
        )}
      </div>

      <div className="border p-4 rounded bg-gray-50">
        <h2 className="font-semibold mb-2">💰 요약 금액</h2>
        <p>객실 합계: {quote.quote_price_summary?.total_room_price?.toLocaleString() || 0}원</p>
        <p>차량 합계: {quote.quote_price_summary?.total_car_price?.toLocaleString() || 0}원</p>
        <p>총합 (할인 전): {quote.quote_price_summary?.grand_total?.toLocaleString() || 0}원</p>
        <p className="font-bold text-lg">
          최종 결제 금액: {quote.quote_price_summary?.final_total?.toLocaleString() || 0}원
        </p>
      </div>
    </div>
  );
}
