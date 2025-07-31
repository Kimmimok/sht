'use client';
import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import CodeSelect from './CodeSelect';
import QuoteRoomSection from './QuoteRoomSection';

export default function QuoteForm({
  mode = 'new',
  initialData,
}: {
  mode?: 'new' | 'edit';
  initialData?: any;
}) {
  const router = useRouter();
  const [checkin, setCheckin] = useState('');
  const [scheduleCode, setScheduleCode] = useState('');
  const [cruiseCode, setCruiseCode] = useState('');
  const [paymentCode, setPaymentCode] = useState('');
  const [discountRate, setDiscountRate] = useState(0);
  const [rooms, setRooms] = useState<any[]>([{}]);

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setCheckin(initialData.checkin ?? '');
      setScheduleCode(initialData.schedule_code ?? '');
      setCruiseCode(initialData.cruise_code ?? '');
      setPaymentCode(initialData.payment_code ?? '');
      setDiscountRate(initialData.discount_rate ?? 0);

      const parsedRooms = (initialData.quote_room ?? []).map((room: any) => ({
        room_code: room.room_code,
        vehicle_code: room.vehicle_code,
        vehicle_category_code: room.vehicle_category_code,
        categoryCounts: (room.quote_room_detail ?? []).reduce((acc: any, r: any) => {
          acc[r.category] = r.person_count;
          return acc;
        }, {}),
      }));

      setRooms(parsedRooms.length > 0 ? parsedRooms : [{}]);
    }
  }, [mode, initialData]);

  const handleAddRoom = () => {
    if (rooms.length < 3) setRooms([...rooms, {}]);
  };

  const handleSubmit = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return alert('로그인 필요');

    let quoteId = initialData?.id;
    if (mode === 'new') {
      const { data: quote, error } = await supabase
        .from('quote')
        .insert({
          user_id: user.id,
          checkin,
          schedule_code: scheduleCode,
          cruise_code: cruiseCode,
          payment_code: paymentCode,
          discount_rate: discountRate,
        })
        .select()
        .single();
      if (error || !quote) return alert('견적 저장 실패');
      quoteId = quote.id;
    } else {
      // 수정: quote 테이블만 업데이트
      await supabase
        .from('quote')
        .update({
          checkin,
          schedule_code: scheduleCode,
          cruise_code: cruiseCode,
          payment_code: paymentCode,
          discount_rate: discountRate,
        })
        .eq('id', quoteId);
      // 기존 quote_room + detail 삭제
      await supabase.from('quote_room_detail').delete().eq('quote_id', quoteId);
      await supabase.from('quote_room').delete().eq('quote_id', quoteId);
    }

    for (const room of rooms) {
      const { data: roomRow, error: roomErr } = await supabase
        .from('quote_room')
        .insert({
          quote_id: quoteId,
          room_code: room.room_code,
          vehicle_code: room.vehicle_code,
          vehicle_category_code: room.vehicle_category_code,
        })
        .select()
        .single();

      if (!roomRow || roomErr) continue;

      for (const [category, count] of Object.entries(room.categoryCounts || {})) {
        if ((count as number) > 0) {
          await supabase.from('quote_room_detail').insert({
            quote_id: quoteId,
            category,
            person_count: count as number,
            passenger_type: category,
            car_count: 1,
          });
        }
      }
    }

    alert('저장 완료');
    router.push('/mypage');
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <CodeSelect
          table="schedule_info"
          label="일정"
          placeholder="일정을 선택하세요"
          value={scheduleCode}
          onChange={setScheduleCode}
        />
        <CodeSelect
          table="cruise_info"
          label="크루즈"
          placeholder="크루즈를 선택하세요"
          value={cruiseCode}
          onChange={setCruiseCode}
        />
        <CodeSelect
          table="payment_info"
          label="결제 방식"
          placeholder="결제 방식을 선택하세요"
          value={paymentCode}
          onChange={setPaymentCode}
        />
        <div>
          <label className="block text-sm font-medium mb-1">체크인 날짜</label>
          <input
            type="date"
            className="w-full border px-2 py-1 rounded"
            value={checkin}
            onChange={(e) => setCheckin(e.target.value)}
          />
        </div>
      </div>

      {rooms.map((room, idx) => (
        <QuoteRoomSection
          key={idx}
          index={idx}
          room={room}
          setRoom={(updated) => setRooms((prev) => prev.map((r, i) => (i === idx ? updated : r)))}
        />
      ))}

      <button onClick={handleAddRoom} className="text-blue-500 underline mt-2">
        ➕ 객실 추가
      </button>

      <button onClick={handleSubmit} className="mt-6 bg-blue-600 text-white px-4 py-2 rounded">
        저장하기
      </button>
    </div>
  );
}
