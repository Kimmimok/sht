'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

export default function HotelPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // 기본 폼 상태
  const [form, setForm] = useState({
    schedule_code: '',
    checkin_date: '',
    hotel_name: '',
    room_name: '',
    room_type: '',
    room_count: 1,
    guest_count: 2,
    special_requests: '',
  });

  // 옵션 데이터
  const [schedules, setSchedules] = useState<any[]>([]);
  const [hotelOptions, setHotelOptions] = useState<{ code: string, name: string }[]>([]);
  const [roomNameOptions, setRoomNameOptions] = useState<{ code: string, name: string }[]>([]);
  const [roomTypeOptions, setRoomTypeOptions] = useState<{ code: string, name: string }[]>([]);
  
  // 요일 및 가격 정보
  const [weekday, setWeekday] = useState('');
  const [priceType, setPriceType] = useState('');
  const [weekdayCode, setWeekdayCode] = useState('');
  const [hotelPriceCode, setHotelPriceCode] = useState('');

  // 사용자 인증 확인
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }: any) => {
      if (!user) {
        alert('로그인이 필요합니다.');
        router.push('/login');
      } else {
        setUser(user);
        loadInitialData();
      }
    });
  }, [router]);

  // 초기 데이터 로드
  const loadInitialData = async () => {
    try {
      // 일정 정보 로드
      const { data: scheduleData } = await supabase
        .from('schedule_info')
        .select('*');
      setSchedules(scheduleData || []);

      // 🏨 호텔명: hotel_price 테이블에서 hotel_name만 중복 없이 조회
      const { data: hotelPriceData } = await supabase
        .from('hotel_price')
        .select('hotel_name');
      if (hotelPriceData && hotelPriceData.length > 0) {
        const uniqueHotelNames = [...new Set(hotelPriceData.map((h: any) => h.hotel_name).filter(Boolean))];
        setHotelOptions(uniqueHotelNames.map((name: string) => ({ code: name, name })));
      } else {
        setHotelOptions([]);
      }
    } catch (error) {
      console.error('초기 데이터 로드 실패:', error);
    }
  };

  // 체크인 날짜 변경시 요일 계산 및 위크데이 코드 조회
  useEffect(() => {
    if (!form.checkin_date) {
      setWeekday('');
      setPriceType('');
      setWeekdayCode('');
      return;
    }

    const date = new Date(form.checkin_date);
    if (isNaN(date.getTime())) return;

    const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const dayOfWeek = date.getDay();
    setWeekday(weekdays[dayOfWeek]);

    // 호텔별 위크데이 코드 조회
    fetchWeekdayCode(dayOfWeek);
  }, [form.checkin_date]);

  // 호텔별 위크데이 코드 조회
  const fetchWeekdayCode = async (dayOfWeek: number) => {
    try {
      const { data: weekdayInfo } = await supabase
        .from('hotel_weekday_info')
        .select('code, name');
      
      if (weekdayInfo) {
        const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
        const matchedWeekday = weekdayInfo.find((w: any) => 
          w.name.includes(weekdays[dayOfWeek]) || w.code.includes(['SUN','MON','TUE','WED','THU','FRI','SAT'][dayOfWeek])
        );
        
        if (matchedWeekday) {
          setWeekdayCode(matchedWeekday.code);
          const isWeekend = matchedWeekday.name.includes('주말') || matchedWeekday.name.includes('weekend');
          setPriceType(isWeekend ? '주말 요금' : '주중 요금');
        } else {
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
          setPriceType(isWeekend ? '주말 요금' : '주중 요금');
          setWeekdayCode('');
        }
      }
    } catch (error) {
      console.error('위크데이 코드 조회 실패:', error);
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
      setPriceType(isWeekend ? '주말 요금' : '주중 요금');
      setWeekdayCode('');
    }
  };

  // 🛏️ 호텔 선택시 객실명 목록 조회 (hotel_price 테이블에서 선택된 호텔의 room_name 중복 제거하여 조회)
  useEffect(() => {
    const fetchRoomNames = async () => {
      if (!form.hotel_name) {
        setRoomNameOptions([]);
        return;
      }
      try {
        // hotel_price에서 선택된 호텔명으로 room_name 목록(중복 제거)
        const { data: roomData } = await supabase
          .from('hotel_price')
          .select('room_name')
          .eq('hotel_name', form.hotel_name);
        if (roomData && roomData.length > 0) {
          const uniqueRoomNames = [...new Set(roomData.map((r: any) => r.room_name).filter(Boolean))];
          // hotel_room_info에서 name(이름)만 value/표시로 사용
          const { data: roomInfoData } = await supabase
            .from('hotel_room_info')
            .select('name')
            .in('name', uniqueRoomNames);
          if (roomInfoData && roomInfoData.length > 0) {
            setRoomNameOptions(roomInfoData.map((r: any) => ({ code: r.name, name: r.name })));
          } else {
            setRoomNameOptions((uniqueRoomNames as string[]).map((name) => ({ code: name, name })));
          }
        } else {
          setRoomNameOptions([]);
        }
      } catch (error) {
        console.error('객실명 조회 실패:', error);
        setRoomNameOptions([]);
      }
    };
    fetchRoomNames();
  }, [form.hotel_name]);

  // 🏠 호텔명 + 객실명 선택시 룸타입 목록 조회 (hotel_price 테이블에서 조회)
  useEffect(() => {
    const fetchRoomTypes = async () => {
      if (!form.hotel_name || !form.room_name) {
        setRoomTypeOptions([]);
        return;
      }

      try {
        // 선택된 호텔과 객실명 찾기
        const selectedHotel = hotelOptions.find(h => h.code === form.hotel_name);
        const selectedRoom = roomNameOptions.find(r => r.code === form.room_name);
        
        if (!selectedHotel || !selectedRoom) {
          setRoomTypeOptions([]);
          return;
        }

        // hotel_price 테이블에서 해당 호텔+객실명의 룸타입 목록 조회 (중복 제거)
        const { data: typeData } = await supabase
          .from('hotel_price')
          .select('room_type')
          .eq('hotel_name', selectedHotel.name)
          .eq('room_name', selectedRoom.name);

        if (typeData && typeData.length > 0) {
          // 중복 제거하여 고유한 룸타입만 추출
          const uniqueRoomTypes = [...new Set(typeData.map((t: any) => t.room_type).filter(Boolean))];
          
          // hotel_type_info 테이블에서 룸타입 코드-이름 매핑 조회
          const { data: typeInfoData } = await supabase
            .from('hotel_type_info')
            .select('code, name')
            .in('name', uniqueRoomTypes);

          if (typeInfoData && typeInfoData.length > 0) {
            setRoomTypeOptions(typeInfoData.map((t: any) => ({ code: t.code, name: t.name })));
          } else {
            // 매핑 정보가 없으면 이름 자체를 코드로 사용
            setRoomTypeOptions((uniqueRoomTypes as string[]).map((name) => ({ code: name, name })));
          }
        } else {
          setRoomTypeOptions([]);
        }
      } catch (error) {
        console.error('룸타입 조회 실패:', error);
        setRoomTypeOptions([]);
      }
    };

    fetchRoomTypes();
  }, [form.hotel_name, form.room_name, hotelOptions, roomNameOptions]);

  // 🔍 모든 조건이 충족되면 호텔 가격 코드 조회 (hotel_price 테이블에서 직접 조회)
  useEffect(() => {
    const fetchHotelPriceCode = async () => {
      if (!form.hotel_name || !form.room_name || !form.room_type || !weekdayCode) {
        setHotelPriceCode('');
        return;
      }

      try {
        // 선택된 호텔, 객실명, 룸타입 찾기
        const selectedHotel = hotelOptions.find(h => h.code === form.hotel_name);
        const selectedRoom = roomNameOptions.find(r => r.code === form.room_name);
        const selectedType = roomTypeOptions.find(t => t.code === form.room_type);
        
        if (!selectedHotel || !selectedRoom || !selectedType) {
          setHotelPriceCode('');
          return;
        }

        // hotel_price 테이블에서 직접 가격 코드 조회 (체크인 날짜 조건 없이 4가지 조건만)
        const { data: priceData } = await supabase
          .from('hotel_price')
          .select('code')
          .eq('hotel_name', selectedHotel.name)
          .eq('room_name', selectedRoom.name)
          .eq('room_type', selectedType.name)
          .eq('weekday', weekdayCode)
          .single();

        setHotelPriceCode(priceData?.code || '');
      } catch (error) {
        console.error('호텔 가격 코드 조회 실패:', error);
        setHotelPriceCode('');
      }
    };

    fetchHotelPriceCode();
  }, [form.hotel_name, form.room_name, form.room_type, weekdayCode, form.checkin_date, hotelOptions, roomNameOptions, roomTypeOptions]);

  // 💾 견적 저장 함수 (코드로 저장하여 정규화)
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
        })
        .select('id')
        .single();

      if (quoteError) {
        alert('저장 실패: ' + quoteError.message);
        return;
      }

      // 2. quote_hotel 테이블에 호텔 상세 정보 저장 (코드로 저장)
      if (newQuote) {
        const { error: hotelError } = await supabase
          .from('quote_hotel')
          .insert({
            quote_id: newQuote.id,
            hotel_code: form.hotel_name, // 호텔 코드 저장
            room_code: form.room_name, // 객실 코드 저장  
            type_code: form.room_type, // 룸타입 코드 저장
            room_count: form.room_count,
            guest_count: form.guest_count,
            special_requests: form.special_requests
          });

        if (hotelError) {
          console.error('호텔 정보 저장 오류:', hotelError);
          alert('호텔 정보 저장에 실패했습니다: ' + hotelError.message);
          return;
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
            <p className="text-sm text-black opacity-75 mt-2">베트남 최고급 호텔을 특가로 예약할 수 있습니다.</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          {/* 일정 선택 */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">🗓️ 일정 선택</label>
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

          {/* 📅 체크인 날짜 */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">📅 체크인 날짜</label>
            <input 
              type="date" 
              value={form.checkin_date} 
              onChange={e => setForm({ ...form, checkin_date: e.target.value })} 
              className="w-full border border-pink-100 p-3 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-200 bg-pink-50 text-pink-700" 
            />
            {/* ⏰ 요일 및 위크데이 정보 표시 */}
            <div className="mt-2">
              <label className="block text-xs font-medium text-black mb-1">⏰ 요일 정보</label>
              <div className="border border-pink-100 rounded-lg bg-pink-50 text-pink-700 px-3 py-2">
                {weekday ? `${weekday} (${priceType}) - 위크데이 코드: ${weekdayCode || '없음'}` : '날짜를 선택하면 요일이 표시됩니다'}
              </div>
            </div>
          </div>

          {/* 🏨 호텔명 선택 */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">🏨 호텔명</label>
            <select
              value={form.hotel_name}
              onChange={e => setForm({ ...form, hotel_name: e.target.value, room_name: '', room_type: '' })}
              className="w-full border border-pink-100 p-3 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-200 bg-pink-50 text-pink-700"
              disabled={hotelOptions.length === 0}
            >
              <option value="">{hotelOptions.length === 0 ? '호텔 정보를 불러오는 중...' : '호텔명을 선택하세요'}</option>
              {hotelOptions.map(hotel => (
                <option key={hotel.code} value={hotel.code}>{hotel.name}</option>
              ))}
            </select>
          </div>

          {/* 🛏️ 객실명 선택 */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">🛏️ 객실명</label>
            <select
              value={form.room_name}
              onChange={e => setForm({ ...form, room_name: e.target.value, room_type: '' })}
              className="w-full border border-pink-100 p-3 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-200 bg-pink-50 text-pink-700"
              disabled={!form.hotel_name || roomNameOptions.length === 0}
            >
              <option value="">
                {!form.hotel_name ? '호텔을 먼저 선택하세요' : 
                 roomNameOptions.length === 0 ? '객실명 로딩 중...' : 
                 '객실명을 선택하세요'}
              </option>
              {roomNameOptions.map(room => (
                <option key={room.code} value={room.code}>{room.name}</option>
              ))}
            </select>
          </div>

          {/* 🏠 룸타입(카테고리) 선택 */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">🏠 구분</label>
            <select
              value={form.room_type}
              onChange={e => setForm({ ...form, room_type: e.target.value })}
              className="w-full border border-pink-100 p-3 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-200 bg-pink-50 text-pink-700"
              disabled={!form.room_name || roomTypeOptions.length === 0}
            >
              <option value="">
                {!form.room_name ? '객실명을 먼저 선택하세요' : 
                 roomTypeOptions.length === 0 ? '룸타입 로딩 중...' : 
                 '룸타입을 선택하세요'}
              </option>
              {roomTypeOptions.map(type => (
                <option key={type.code} value={type.code}>{type.name} ({type.code})</option>
              ))}
            </select>
          </div>

          {/* 🔢 객실 수 */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">🔢 객실 수</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setForm({ ...form, room_count: n })}
                  className={`border rounded px-3 py-2 transition-colors ${
                    form.room_count === n ? 'bg-pink-200 text-pink-700 border-pink-200' : 'bg-pink-50 border-pink-100 text-pink-600 hover:bg-pink-100'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* 👥 인동 수 */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">👥 인동 수</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  onClick={() => setForm({ ...form, guest_count: n })}
                  className={`border rounded px-3 py-2 transition-colors ${
                    form.guest_count === n ? 'bg-pink-200 text-pink-700 border-pink-200' : 'bg-pink-50 border-pink-100 text-pink-600 hover:bg-pink-100'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* 🔍 호텔 가격 코드 표시 */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">🔍 호텔 가격 코드</label>
            <div className="border border-pink-100 rounded-lg bg-pink-50 text-pink-700 px-3 py-2">
              {hotelPriceCode ? (
                <span>가격 코드: <strong className="text-pink-800">{hotelPriceCode}</strong></span>
              ) : (
                <span className="text-gray-500">모든 조건을 선택하면 가격 코드가 표시됩니다</span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              조건: 호텔({form.hotel_name}) + 객실({form.room_name}) + 룸타입({form.room_type}) + 위크데이({weekdayCode}) + 날짜({form.checkin_date})
            </div>
          </div>

          {/* 📝 특이사항 */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">📝 특이사항</label>
            <textarea
              value={form.special_requests}
              onChange={e => setForm({ ...form, special_requests: e.target.value })}
              placeholder="요청사항이나 특이사항을 입력하세요 (예: 금연실 희망, 높은 층 선호 등)"
              className="w-full border border-pink-100 p-3 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-200 bg-pink-50 text-pink-700 min-h-[100px] resize-vertical"
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-black">💡 호텔 예약 시스템: hotel_price 테이블이 메인 데이터 소스가 되고, 각 info 테이블들은 코드를 이름으로 변환하는 참조 테이블 역할을 합니다! 🎉</p>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => router.back()}
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

