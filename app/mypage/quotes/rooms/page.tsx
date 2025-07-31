'use client';
import React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

type RoomPriceInfo = {
  code: string;
  room_code: string;
  cruise_code: string;
  schedule_code: string;
  price: number;
  payment_code: string;
};

type RoomInfo = {
  code: string;
  name: string;
};

export default function QuoteRoomListPage() {
  const router = useRouter();
  const [roomPrices, setRoomPrices] = useState<RoomPriceInfo[]>([]);
  const [roomInfoMap, setRoomInfoMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadData = async () => {
      const { data: roomPrices } = await supabase.from('room_price').select('*').limit(100);

      const { data: roomInfo } = await supabase.from('room_info').select('code, name');

      const map = Object.fromEntries((roomInfo || []).map((r) => [r.code, r.name]));

      setRoomPrices(roomPrices || []);
      setRoomInfoMap(map);
    };

    loadData();
  }, []);

  const handleSelect = (roomPrice: RoomPriceInfo) => {
    router.push(`/quote/new?room_code=${roomPrice.room_code}`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">🛏 객실 선택</h2>

      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1">객실명</th>
            <th className="border px-2 py-1">크루즈</th>
            <th className="border px-2 py-1">일정</th>
            <th className="border px-2 py-1">결제</th>
            <th className="border px-2 py-1">가격</th>
            <th className="border px-2 py-1">선택</th>
          </tr>
        </thead>
        <tbody>
          {roomPrices.map((rp) => (
            <tr key={rp.code} className="hover:bg-gray-50">
              <td className="border px-2 py-1">{roomInfoMap[rp.room_code] || rp.room_code}</td>
              <td className="border px-2 py-1">{rp.cruise_code}</td>
              <td className="border px-2 py-1">{rp.schedule_code}</td>
              <td className="border px-2 py-1">{rp.payment_code}</td>
              <td className="border px-2 py-1 text-right">{rp.price.toLocaleString()} ₩</td>
              <td className="border px-2 py-1 text-center">
                <button onClick={() => handleSelect(rp)} className="text-blue-600 underline">
                  선택
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
