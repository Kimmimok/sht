'use client';
import React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import { saveQuoteWithRooms } from '@/lib/saveQuoteWithRooms';
import { updateQuoteRoomPrices } from '@/lib/updateQuoteRoomPrices';
import { updateQuoteCarPrices } from '@/lib/updateQuoteCarPrices';
import CodeSelect from '@/components/CodeSelect';
import CruiseSelect from '@/components/CruiseSelect';
import PaymentSelect from '@/components/PaymentSelect';
import QuoteRoomSection from '@/components/QuoteRoomSection';
import { CarCategorySelect, CarInfoSelect } from '@/components/CarSelectComponents';
import SectionBox from '@/components/SectionBox';

export default function QuoteFormPage() {
  const router = useRouter();
  const [checkin, setCheckin] = useState('');
  const [scheduleCode, setScheduleCode] = useState('');
  const [cruiseCode, setCruiseCode] = useState('');
  const [paymentCode, setPaymentCode] = useState('');
  const [discountRate, setDiscountRate] = useState(0);
  const [rooms, setRooms] = useState<any[]>([{ people: [] }]);
  const [vehicleCode, setVehicleCode] = useState('');
  const [vehicleCategoryCode, setVehicleCategoryCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddRoom = () => {
    if (rooms.length < 3) {
      setRooms([...rooms, { people: [] }]);
    }
  };

  const handleSubmit = async () => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    if (!userId) {
      alert('로그인이 필요합니다.');
      return;
    }

    setIsLoading(true);

    try {
      const quoteId = await saveQuoteWithRooms({
        userId,
        checkin,
        scheduleCode,
        cruiseCode,
        paymentCode,
        discountRate,
        vehicleCategoryCode,
        rooms,
        cars: [
          {
            vehicle_code: vehicleCode,
            car_category_code: vehicleCategoryCode,
            car_count: 1,
          },
        ],
      });

      await updateQuoteRoomPrices(quoteId, checkin);
      await updateQuoteCarPrices(quoteId);

      // ✅ 저장 완료 후 처리 안내 페이지로 이동
      router.push('/mypage/quotes/processing');
    } catch (error: any) {
      console.error('❌ 저장 실패:', error.message);
      alert('❌ 저장 실패: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const isSubmitDisabled =
    isLoading ||
    !checkin ||
    !scheduleCode ||
    !cruiseCode ||
    !paymentCode ||
    !vehicleCategoryCode ||
    !vehicleCode ||
    rooms.some(
      (r) => !r.room_code || !r.categoryCounts || Object.keys(r.categoryCounts).length === 0
    );

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-lg font-bold mb-4">
        비교 견적이 필요하시면 각각 따로 신청을 하셔야 합니다.
      </h2>

      <SectionBox title="📋 일정 및 예약 정보">
        <CodeSelect
          table="schedule_info"
          label="📅 일정 을 선택 하세요"
          placeholder="일정을 선택하세요"
          value={scheduleCode}
          onChange={setScheduleCode}
        />

        <div className="mt-2">
          <label className="block text-sm font-medium mb-1">📆 체크인 날짜를 선택하세요</label>
          <input
            type="date"
            className="w-full border px-2 py-1 rounded"
            value={checkin}
            onChange={(e) => setCheckin(e.target.value)}
            required
          />
        </div>

        <CruiseSelect
          scheduleCode={scheduleCode}
          checkinDate={checkin}
          value={cruiseCode}
          onChange={setCruiseCode}
        />

        <PaymentSelect
          scheduleCode={scheduleCode}
          checkinDate={checkin}
          cruiseCode={cruiseCode}
          value={paymentCode}
          onChange={setPaymentCode}
        />
      </SectionBox>

      {rooms.map((room, idx) => (
        <SectionBox key={idx} title={`🏨 객실 ${idx + 1}`}>
          <QuoteRoomSection
            index={idx}
            room={room}
            setRoom={(updated) => setRooms((prev) => prev.map((r, i) => (i === idx ? updated : r)))}
            scheduleCode={scheduleCode}
            checkinDate={checkin}
            cruiseCode={cruiseCode}
            paymentCode={paymentCode}
          />
        </SectionBox>
      ))}

      <div className="text-right mb-6">
        <button onClick={handleAddRoom} className="text-blue-500 underline">
          ➕ 객실 추가
        </button>
      </div>

      <SectionBox title="🚐 차량 선택">
        <CarCategorySelect
          scheduleCode={scheduleCode}
          cruiseCode={cruiseCode}
          value={vehicleCategoryCode}
          onChange={setVehicleCategoryCode}
        />

        <CarInfoSelect
          scheduleCode={scheduleCode}
          cruiseCode={cruiseCode}
          categoryCode={vehicleCategoryCode}
          value={vehicleCode}
          onChange={setVehicleCode}
        />
      </SectionBox>

      <div className="mt-4 text-center">
        <button
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          className="bg-blue-600 text-white px-6 py-2 rounded disabled:bg-gray-400"
        >
          {isLoading ? '저장 중...' : '신청 하기'}
        </button>
      </div>
    </div>
  );
}
