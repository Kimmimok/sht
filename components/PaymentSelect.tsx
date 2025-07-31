'use client';
import React from 'react';
// components/PaymentSelect.tsx
import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';

interface Props {
  scheduleCode: string;
  checkinDate: string;
  cruiseCode: string;
  value: string;
  onChange: (val: string) => void;
}

export default function PaymentSelect({
  scheduleCode,
  checkinDate,
  cruiseCode,
  value,
  onChange,
}: Props) {
  const [options, setOptions] = useState<{ code: string; name: string }[]>([]);

  useEffect(() => {
    const fetchOptions = async () => {
      if (!scheduleCode || !checkinDate || !cruiseCode) return;

      const { data, error } = await supabase
        .from('room_price')
        .select('payment_code')
        .eq('schedule_code', scheduleCode)
        .eq('cruise_code', cruiseCode)
        .lte('start_date', checkinDate)
        .gte('end_date', checkinDate);

      const uniqueCodes = Array.from(new Set((data || []).map((d) => d.payment_code)));

      const { data: paymentInfo } = await supabase
        .from('payment_info')
        .select('*')
        .in('code', uniqueCodes);

      setOptions(paymentInfo || []);
    };

    fetchOptions();
  }, [scheduleCode, checkinDate, cruiseCode]);

  return (
    <div>
      <label className="block text-sm font-medium mb-1">💳 결제 방식</label>
      <select
        className="w-full border px-2 py-1 rounded"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">결제 방식을 선택하세요</option>
        {options.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.name}
          </option>
        ))}
      </select>
    </div>
  );
}
