'use client';
import React from 'react';
import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';

type Props = {
  scheduleCode: string;
  checkinDate: string;
  value: string;
  onChange: (val: string) => void;
};

export default function CruiseSelect({ scheduleCode, checkinDate, value, onChange }: Props) {
  const [options, setOptions] = useState<{ code: string; name: string }[]>([]);

  useEffect(() => {
    const loadCruises = async () => {
      if (!scheduleCode || !checkinDate) return;

      const { data: roomPrices } = await supabase
        .from('room_price')
        .select('cruise_code')
        .eq('schedule_code', scheduleCode)
        .lte('start_date', checkinDate)
        .gte('end_date', checkinDate);

      const cruiseCodes = [...new Set((roomPrices || []).map((rp) => rp.cruise_code))];

      const { data: cruises } = await supabase
        .from('cruise_info')
        .select('code, name')
        .in('code', cruiseCodes);

      setOptions(cruises || []);
    };

    loadCruises();
  }, [scheduleCode, checkinDate]);

  return (
    <div className="mb-3">
      <label className="block text-sm font-medium mb-1">
        🛳️ 승선을 원하는 크루즈를 선택하세요.
      </label>

      <select
        className="w-full border rounded px-2 py-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">크루즈를 선택하세요</option>
        {options.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
