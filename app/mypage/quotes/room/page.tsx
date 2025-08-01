'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

export default function QuoteFormPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [cruises, setCruises] = useState([]);
  const [payments, setPayments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState({
    korean_name: '',
    checkin: '',
    schedule_code: '',
    cruise_code: '',
    payment_code: '',
    room_code: '',
    adult_count: 0,
    child_count: 0,
    infant_count: 0,
    extra_adult_count: 0,
    extra_child_count: 0,
    vehicle_category_code: '',
    vehicle_code: '',
    discount_rate: 0
  });

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) router.push('/login');
      else {
        setUser(user);
        const { data: lastQuote } = await supabase
          .from('quote')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (lastQuote) {
          setForm({ ...form, ...lastQuote });
        }
      }
    });

    supabase.from('schedule_info').select().then(({ data }) => setSchedules(data || []));
    supabase.from('category_info').select().then(({ data }) => setCategories((data || []).filter(c => ['왕복', '편도', '추가'].includes(c.name))));
  }, [router]);

 useEffect(() => {
  const fetchCruiseOptions = async () => {
    if (!form.schedule_code || !form.checkin) return;

    const { data: roomPrices, error: roomError } = await supabase
      .from('room_price')
      .select('cruise_code')
      .eq('schedule_code', form.schedule_code)
      .lte('start_date', form.checkin)
      .gte('end_date', form.checkin);

    if (roomError) {
      console.error('❌ room_price 조회 오류:', roomError.message);
      return;
    }

    const cruiseCodes = roomPrices?.map(r => r.cruise_code).filter(Boolean);
    const uniqueCodes = [...new Set(cruiseCodes)];

    if (uniqueCodes.length === 0) {
      setCruises([]);
      return;
    }

    const { data: cruiseList, error: cruiseError } = await supabase
      .from('cruise_info')
      .select('code, name')
      .in('code', uniqueCodes);

    if (cruiseError) {
      console.error('❌ cruise_info 조회 오류:', cruiseError.message);
      return;
    }

    setCruises(cruiseList || []);
  };

  fetchCruiseOptions();
}, [form.schedule_code, form.checkin]);

  useEffect(() => {
    const fetchPaymentOptions = async () => {
      if (form.schedule_code && form.cruise_code && form.checkin) {
        const { data: roomPrices } = await supabase
          .from('room_price')
          .select('payment_code, start_date, end_date')
          .eq('schedule_code', form.schedule_code)
          .eq('cruise_code', form.cruise_code);

        const checkin = new Date(form.checkin);
        const filteredCodes = roomPrices.filter(rp => new Date(rp.start_date) <= checkin && checkin <= new Date(rp.end_date)).map(rp => rp.payment_code);

        const uniqueCodes = Array.from(new Set(filteredCodes));
        if (uniqueCodes.length === 0) return setPayments([]);

        const { data: infos } = await supabase
          .from('payment_info')
          .select('code, name')
          .in('code', uniqueCodes);

        setPayments(infos || []);
      }
    };
    fetchPaymentOptions();
  }, [form.schedule_code, form.cruise_code, form.checkin]);

  useEffect(() => {
    const fetchRoomOptions = async () => {
      if (form.schedule_code && form.cruise_code && form.checkin && form.payment_code) {
        const { data: roomPrices } = await supabase
          .from('room_price')
          .select('room_code, start_date, end_date')
          .eq('schedule_code', form.schedule_code)
          .eq('cruise_code', form.cruise_code)
          .eq('payment_code', form.payment_code);

        const checkin = new Date(form.checkin);
        const filteredCodes = roomPrices.filter(rp => new Date(rp.start_date) <= checkin && checkin <= new Date(rp.end_date)).map(rp => rp.room_code);

        const uniqueCodes = Array.from(new Set(filteredCodes));
        if (uniqueCodes.length === 0) return setRooms([]);

        const { data: infos } = await supabase
          .from('room_info')
          .select('code, name')
          .in('code', uniqueCodes);

        setRooms(infos || []);
      }
    };
    fetchRoomOptions();
  }, [form.schedule_code, form.cruise_code, form.payment_code, form.checkin]);

  useEffect(() => {
    const fetchVehicleOptions = async () => {
      if (form.schedule_code && form.cruise_code && form.vehicle_category_code) {
        const category = categories.find(c => c.name === form.vehicle_category_code);
        if (!category) return setVehicles([]);

        const { data: carPrices } = await supabase
          .from('car_price')
          .select('car_code')
          .eq('schedule_code', form.schedule_code)
          .eq('cruise_code', form.cruise_code)
          .eq('category_code', category.code);

        const carCodes = Array.from(new Set(carPrices?.map(v => v.car_code)));
        if (carCodes.length === 0) return setVehicles([]);

        const { data: carInfo } = await supabase
          .from('car_info')
          .select('code, name')
          .in('code', carCodes);

        setVehicles(carInfo || []);
      }
    };
    fetchVehicleOptions();
  }, [form.schedule_code, form.vehicle_category_code, form.cruise_code, categories]);

  const handleSubmit = async () => {
    if (!user) return;
    const { error } = await supabase.from('quote').insert({ ...form, user_id: user.id });
    if (error) alert('저장 실패: ' + error.message);
    else alert('견적이 저장되었습니다!');
  };

  const renderCountSelector = (label, field) => (
    <div className="mb-2">
      <label className="block text-sm font-medium text-gray-700 mt-2 mb-1">{label}</label>
      <div className="grid grid-cols-8 gap-1">
        {[...Array(8).keys()].map(n => (
          <button
            key={`${field}-${n}`}
            onClick={() => setForm(prev => ({ ...prev, [field]: n }))}
            className={`border rounded px-2 py-1 text-xs ${form[field] === n ? 'bg-blue-200' : 'bg-gray-100'}`}
          >{n}</button>
        ))}
      </div>
    </div>
  );

  return (

    <div className="p-4 max-w-2xl mx-auto space-y-4 text-gray-700">
      <h1 className="text-2xl font-bold text-center">📝 견적 입력</h1>

      <label>📅 체크인 날짜</label>
      <input type="date" value={form.checkin} onChange={e => setForm({ ...form, checkin: e.target.value })} className="w-full border p-2 rounded" />

      <label>🗓 일정 선택</label>
      <div className="flex gap-2 flex-wrap">
        {schedules.map(s => (
          <button key={s.code} onClick={() => setForm({ ...form, schedule_code: s.code })} className={`border px-3 py-1 rounded ${form.schedule_code === s.code ? 'bg-blue-300' : 'bg-gray-100'}`}>{s.name}</button>
        ))}
      </div>

      <label>🚢 크루즈 선택</label>
      <select value={form.cruise_code} onChange={e => setForm({ ...form, cruise_code: e.target.value })} className="w-full border p-2 rounded">
        <option value="">선택하세요</option>
        {cruises.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
      </select>

      <label>💳 결제 방식</label>
      <div className="flex gap-2 flex-wrap">
        {payments.map(p => (
          <button key={p.code} onClick={() => setForm({ ...form, payment_code: p.code })} className={`border px-3 py-1 rounded ${form.payment_code === p.code ? 'bg-blue-300' : 'bg-gray-100'}`}>{p.name}</button>
        ))}
      </div>

      <label>🛏 객실 선택</label>
      <select value={form.room_code} onChange={e => setForm({ ...form, room_code: e.target.value })} className="w-full border p-2 rounded">
        <option value="">선택하세요</option>
        {rooms.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
      </select>

      {renderCountSelector('성인 인동', 'adult_count')}
      {renderCountSelector('아동 인동', 'child_count')}
      {renderCountSelector('유아 인동', 'infant_count')}
      {renderCountSelector('엑스트라 성인', 'extra_adult_count')}
      {renderCountSelector('엑스트라 아동', 'extra_child_count')}

      <label>🚐 차량 구분</label>
      <div className="flex gap-2 flex-wrap">
        {categories.map(c => (
          <button key={c.code} onClick={() => setForm({ ...form, vehicle_category_code: c.name })} className={`border px-3 py-1 rounded ${form.vehicle_category_code === c.name ? 'bg-blue-300' : 'bg-gray-100'}`}>{c.name}</button>
        ))}
      </div>

      <label>🚗 차량 선택</label>
      <select value={form.vehicle_code} onChange={e => setForm({ ...form, vehicle_code: e.target.value })} className="w-full border p-2 rounded">
        <option value="">선택하세요</option>
        {vehicles.map(v => <option key={v.code} value={v.code}>{v.name}</option>)}
      </select>

      <label>💸 할인율</label>
      <div className="flex gap-2">
        {[5, 8, 10].map(rate => (
          <button key={rate} onClick={() => setForm({ ...form, discount_rate: rate })} className={`border px-3 py-1 rounded ${form.discount_rate === rate ? 'bg-blue-300' : 'bg-gray-100'}`}>{rate}%</button>
        ))}
      </div>

      <button onClick={handleSubmit} className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600">저장하기</button>
    </div>
  );
}

