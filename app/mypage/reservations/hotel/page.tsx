'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

export default function HotelPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    schedule_code: '',
    checkin_date: '',
    hotel_name: '',
    room_type: 'standard',
    room_count: 1,
    guest_count: 2,
    special_requests: '',
    discount_rate: 0
  });

  // 옵션 데이터
  const [schedules, setSchedules] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }: any) => {
      if (!user) {
        alert('로그인이 필요합니다.');
        router.push('/login');
      } else {
        setUser(user);
        loadSchedules();
      }
    });
  }, [router]);

  // 일정 옵션 로드
  const loadSchedules = async () => {
    try {
      const { data: scheduleData } = await supabase
        .from('schedule_info')
        .select('*');
      setSchedules(scheduleData || []);
    } catch (error) {
      console.error('일정 로드 실패:', error);
    }
  };

  // 호텔 옵션 로드 (일정과 체크인 날짜 기준)
  useEffect(() => {
    const fetchHotelOptions = async () => {
      if (!form.schedule_code || !form.checkin_date) {
        setHotels([]);
        return;
      }

      try {
        const { data: hotelPrices } = await supabase
          .from('hotel_price')
          .select('hotel_name')
          .lte('start_date', form.checkin_date)
          .gte('end_date', form.checkin_date);

        const hotelNames = [...new Set(hotelPrices?.map((h: any) => h.hotel_name).filter(Boolean))];
        
        if (hotelNames.length > 0) {
          const { data: hotelList } = await supabase
            .from('hotel_info')
            .select('name, location, star_rating')
            .in('name', hotelNames);
          setHotels(hotelList || []);
        } else {
          setHotels([]);
        }
      } catch (error) {
        console.error('호텔 옵션 로드 실패:', error);
        setHotels([]);
      }
    };

    fetchHotelOptions();
  }, [form.schedule_code, form.checkin_date]);

  // 객실 옵션 로드 (일정, 체크인, 호텔명 기준)
  useEffect(() => {
    const fetchRoomOptions = async () => {
      if (!form.schedule_code || !form.checkin_date || !form.hotel_name) {
        setRooms([]);
        return;
      }

      try {
        const { data: roomPrices } = await supabase
          .from('hotel_price')
          .select('room_name, room_type, price')
          .eq('schedule_code', form.schedule_code)
          .eq('hotel_name', form.hotel_name)
          .lte('start_date', form.checkin_date)
          .gte('end_date', form.checkin_date);

        setRooms(roomPrices || []);
      } catch (error) {
        console.error('객실 옵션 로드 실패:', error);
        setRooms([]);
      }
    };

    fetchRoomOptions();
  }, [form.schedule_code, form.checkin_date, form.hotel_name]);

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. quote 테이블에 기본 견적 저장
      const { data: newQuote, error: quoteError } = await supabase
        .from('quote')
        .insert({
          user_id: user.id,
          quote_type: 'hotel',
          schedule_code: form.schedule_code,
          checkin: form.checkin_date,
          discount_rate: form.discount_rate
        })
        .select('id')
        .single();

      if (quoteError) {
        alert('저장 실패: ' + quoteError.message);
        return;
      }

      // 2. quote_hotel 테이블에 호텔 상세 정보 저장
      if (newQuote) {
        const { error: hotelError } = await supabase
          .from('quote_hotel')
          .insert({
            quote_id: newQuote.id,
            hotel_name: form.hotel_name,
            room_type: form.room_type,
            room_count: form.room_count,
            guest_count: form.guest_count,
            special_requests: form.special_requests
          });

        if (hotelError) {
          console.error('호텔 정보 저장 오류:', hotelError);
          alert('견적은 저장되었지만 호텔 정보 저장에 실패했습니다: ' + hotelError.message);
        }
      }

      alert('호텔 견적이 저장되었습니다!');
      router.push('/mypage/quotes/processing');
      
    } catch (error) {
      console.error('견적 저장 오류:', error);
      alert('견적 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pink-50">
      <div className="bg-gradient-to-r from-pink-100 via-rose-100 to-pink-200 text-black">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-black">🏨 호텔 예약</h1>
            <button 
              onClick={() => router.push('/mypage/quotes/new')}
              className="bg-pink-100 hover:bg-pink-200 px-4 py-2 rounded-lg transition-colors text-black border border-pink-200"
            >
              🏠 홈으로
            </button>
          </div>
          <div className="bg-pink-100/60 backdrop-blur rounded-lg p-6 border border-pink-100">
            <p className="text-lg text-black opacity-90">최고의 호텔에서 편안한 휴식을 즐기세요.</p>
            <p className="text-sm text-black opacity-75 mt-2">전 세계 최고급 호텔을 특가로 예약할 수 있습니다.</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          {/* 일정 선택 */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">🗓 일정 선택</label>
            <div className="grid grid-cols-3 gap-2">
              {schedules.map(s => (
                <button 
                  key={s.code} 
                  onClick={() => setForm({ ...form, schedule_code: s.code })} 
                  className={`border p-3 rounded-lg transition-colors ${
                    form.schedule_code === s.code ? 'bg-pink-200 text-pink-700 border-pink-200' : 'bg-pink-50 border-pink-100 text-pink-600 hover:bg-pink-100'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* 체크인 날짜 */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">📅 체크인 날짜</label>
            <input 
              type="date" 
              value={form.checkin_date} 
              onChange={e => setForm({ ...form, checkin_date: e.target.value })} 
              className="w-full border border-pink-100 p-3 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-200 bg-pink-50 text-pink-700" 
            />
          </div>

          {/* 호텔명 선택 */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">🏨 호텔명</label>
            <select
              value={form.hotel_name}
              onChange={e => setForm({ ...form, hotel_name: e.target.value })}
              className="w-full border border-pink-100 p-3 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-200 bg-pink-50 text-pink-700"
              disabled={hotels.length === 0}
            >
              <option value="">{hotels.length === 0 ? '일정과 체크인 날짜를 먼저 선택하세요' : '호텔을 선택하세요'}</option>
              {hotels.map(h => (
                <option key={h.name} value={h.name}>
                  {h.name} {h.star_rating && `(${h.star_rating}성급)`} {h.location && `- ${h.location}`}
                </option>
              ))}
            </select>
          </div>

          {/* 객실 타입 선택 */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">🛏 객실 타입</label>
            <select
              value={form.room_type}
              onChange={e => setForm({ ...form, room_type: e.target.value })}
              className="w-full border border-pink-100 p-3 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-200 bg-pink-50 text-pink-700"
              disabled={rooms.length === 0}
            >
              <option value="">{rooms.length === 0 ? '호텔을 먼저 선택하세요' : '객실을 선택하세요'}</option>
              {rooms.map((room, idx) => (
                <option key={idx} value={room.room_type}>
                  {room.room_name} ({room.room_type}) - {room.price ? `${room.price.toLocaleString()}동` : '가격 문의'}
                </option>
              ))}
            </select>
          </div>

          {/* 객실 수 */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">객실 수</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setForm({ ...form, room_count: n })}
                  className={`border rounded px-3 py-2 transition-colors ${
                    form.room_count === n ? 'bg-pink-200 text-pink-700 border-pink-200' : 'bg-pink-50 border-pink-100 text-pink-600 hover:bg-pink-100'
                  }`}
                >
                  {n}개
                </button>
              ))}
            </div>
          </div>

          {/* 투숙객 수 */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">투숙객 수</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  onClick={() => setForm({ ...form, guest_count: n })}
                  className={`border rounded px-3 py-2 transition-colors ${
                    form.guest_count === n ? 'bg-pink-200 text-pink-700 border-pink-200' : 'bg-pink-50 border-pink-100 text-pink-600 hover:bg-pink-100'
                  }`}
                >
                  {n}명
                </button>
              ))}
            </div>
          </div>

          {/* 특이사항 */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">📝 특이사항</label>
            <textarea
              value={form.special_requests}
              onChange={e => setForm({ ...form, special_requests: e.target.value })}
              placeholder="요청사항이나 특이사항을 입력하세요 (예: 금연실 희망, 높은 층 선호 등)"
              className="w-full border border-pink-100 p-3 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-200 bg-pink-50 text-pink-700 min-h-[100px] resize-vertical"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">💸 할인율</label>
            <div className="flex gap-2">
              {[0, 5, 8, 10].map(rate => (
                <button 
                  key={rate} 
                  onClick={() => setForm({ ...form, discount_rate: rate })} 
                  className={`border px-4 py-2 rounded-lg transition-colors ${
                    form.discount_rate === rate ? 'bg-pink-200 text-pink-700 border-pink-200' : 'bg-pink-50 border-pink-100 text-pink-600 hover:bg-pink-100'
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-black">💡 호텔 예약 시스템은 현재 개발 중입니다. 견적 신청 후 담당자가 연락드립니다.</p>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => router.push('/mypage/quotes/new')}
              className="flex-1 bg-pink-100 text-pink-700 py-3 rounded-lg hover:bg-pink-200 border border-pink-200 transition-colors"
            >
              ← 뒤로가기
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-pink-200 to-rose-200 text-pink-700 py-3 rounded-lg hover:from-pink-300 hover:to-rose-300 border border-pink-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all"
            >
              {loading ? '저장 중...' : '🏨 호텔 예약 신청'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

