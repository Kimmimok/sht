'use client';
import React from 'react';
// components/RoomSelect.tsx
import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';

interface Props {
  scheduleCode: string;
  checkinDate: string;
  cruiseCode: string;
  paymentCode: string;
  value: string;
  onChange: (val: string) => void;
}

export default function RoomSelect({
  scheduleCode,
  checkinDate,
  cruiseCode,
  paymentCode,
  value,
  onChange,
}: Props) {
  const [options, setOptions] = useState<{ code: string; name: string }[]>([]);

  useEffect(() => {
    const fetchOptions = async () => {
      if (!scheduleCode || !checkinDate || !cruiseCode || !paymentCode) return;

      const { data, error } = await supabase
        .from('room_price')
        .select('room_code')
        .eq('schedule_code', scheduleCode)
        .eq('cruise_code', cruiseCode)
        .eq('payment_code', paymentCode)
        .lte('start_date', checkinDate)
        .gte('end_date', checkinDate);

      const uniqueCodes = Array.from(new Set((data || []).map((d) => d.room_code)));

      const { data: roomInfo } = await supabase
        .from('room_info')
        .select('*')
        .in('code', uniqueCodes);

      setOptions(roomInfo || []);
    };

    fetchOptions();
  }, [scheduleCode, checkinDate, cruiseCode, paymentCode]);

  return (
    <div>
      <label className="block text-sm font-medium mb-1">🏨 객실 선택</label>
      <select
        className="w-full border px-2 py-1 rounded"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">객실을 선택하세요</option>
        {options.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.name}
          </option>
        ))}
      </select>
    </div>
  );
}
