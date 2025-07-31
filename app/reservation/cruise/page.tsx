'use client';
import React, { Suspense } from 'react';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';
import CodeSelect from '@/components/CodeSelect';

function CruiseReservationContent() {
  const params = useSearchParams();
  const router = useRouter();
  const reservationId = params.get('reservation_id');

  const [roomPriceCode, setRoomPriceCode] = useState('');
  const [carPriceCode, setCarPriceCode] = useState('');
  const [checkin, setCheckin] = useState('');
  const [guestCount, setGuestCount] = useState(2);
  const [roomUnitPrice, setRoomUnitPrice] = useState(0);
  const [carCount, setCarCount] = useState(1);
  const [carUnitPrice, setCarUnitPrice] = useState(0);

  useEffect(() => {
    if (!reservationId) {
      alert('reservation_id 없음');
      router.push('/');
    }
  }, [reservationId]);

  const handleSave = async () => {
    if (!reservationId || !roomPriceCode || !carPriceCode || !checkin) {
      alert('모든 값을 입력해주세요');
      return;
    }

    const { error: roomError } = await supabase.from('reservation_room').insert([
      {
        reservation_id: reservationId,
        room_price_code: roomPriceCode,
        checkin,
        guest_count: guestCount,
        unit_price: roomUnitPrice,
      },
    ]);

    const { error: carError } = await supabase.from('reservation_car').insert([
      {
        reservation_id: reservationId,
        car_price_code: carPriceCode,
        car_count: carCount,
        unit_price: carUnitPrice,
      },
    ]);

    if (roomError || carError) {
      alert(`저장 실패\n${roomError?.message || ''}\n${carError?.message || ''}`);
    } else {
      alert('크루즈 예약 저장 완료');
      router.push('/mypage');
    }
  };

  return (
    <PageWrapper>
      <h1 className="text-xl font-bold mb-4">🚢 크루즈 예약 입력</h1>

      <SectionBox title="객실 정보">
        <label className="block mb-1">객실 요금 코드</label>
        <CodeSelect
          table="room_price"
          value={roomPriceCode}
          onChange={setRoomPriceCode}
          placeholder="객실 요금 코드 선택"
        />
        <label className="block mt-3">체크인 날짜</label>
        <input
          type="date"
          value={checkin}
          onChange={(e) => setCheckin(e.target.value)}
          className="w-full border p-2 rounded"
        />
        <label className="block mt-3">인원수</label>
        <input
          type="number"
          min={1}
          value={guestCount}
          onChange={(e) => setGuestCount(Number(e.target.value))}
          className="w-full border p-2 rounded"
        />
        <label className="block mt-3">객실 단가</label>
        <input
          type="number"
          value={roomUnitPrice}
          onChange={(e) => setRoomUnitPrice(Number(e.target.value))}
          className="w-full border p-2 rounded"
        />
      </SectionBox>

      <SectionBox title="차량 정보">
        <label className="block mb-1">차량 요금 코드</label>
        <CodeSelect
          table="car_price"
          value={carPriceCode}
          onChange={setCarPriceCode}
          placeholder="차량 요금 코드 선택"
        />
        <label className="block mt-3">차량 대수</label>
        <input
          type="number"
          min={1}
          value={carCount}
          onChange={(e) => setCarCount(Number(e.target.value))}
          className="w-full border p-2 rounded"
        />
        <label className="block mt-3">차량 단가</label>
        <input
          type="number"
          value={carUnitPrice}
          onChange={(e) => setCarUnitPrice(Number(e.target.value))}
          className="w-full border p-2 rounded"
        />
      </SectionBox>

      <button onClick={handleSave} className="w-full bg-blue-600 text-white py-2 rounded mt-4">
        예약 저장
      </button>
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
