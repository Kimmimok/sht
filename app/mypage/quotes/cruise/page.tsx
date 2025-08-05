'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

export default function CruisePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 폼 데이터 (객실 배열 관리)
  const [form, setForm] = useState({
    checkin: '',
    schedule_code: '',
    cruise_code: '',
    payment_code: '',
    rooms: [
      {
        room_code: '',
        category: '',
        adult_count: 0,
        child_count: 0,
        infant_count: 0,
        extra_adult_count: 0,
        extra_child_count: 0,
        additional_categories: [] as Array<{ category: string, count: number }>
      }
    ],
    discount_rate: 0
  });

  // --- 차량 입력 관련 상태 및 로직 추가 ---
  const [vehicleForm, setVehicleForm] = useState([{
    car_code: '',
    count: 1
  }]);
  const [vehicleCategories, setVehicleCategories] = useState<any[]>([]);
  const [selectedVehicleCategory, setSelectedVehicleCategory] = useState<string>('');
  const [vehicles, setVehicles] = useState<any[]>([]);

  // 옵션 데이터
  const [schedules, setSchedules] = useState<any[]>([]);
  const [cruises, setCruises] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // 사용자 인증 체크
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          alert('로그인이 필요합니다.');
          router.push('/login');
          return;
        }

        setUser(session.user);
        loadBasicData();
      } catch (error) {
        console.error('인증 확인 오류:', error);
        alert('인증 확인 중 오류가 발생했습니다.');
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  // 차량구분(카테고리) 로드 (일정, 크루즈 기준)
  useEffect(() => {
    if (form.schedule_code && form.cruise_code) {
      supabase
        .from('car_price')
        .select('category_code')
        .eq('schedule_code', form.schedule_code)
        .eq('cruise_code', form.cruise_code)
        .then(async ({ data: carPrices }: any) => {
          const categoryCodes = [...new Set(carPrices?.map((v: any) => v.category_code).filter(Boolean))];
          if (categoryCodes.length > 0) {
            const { data: categories } = await supabase
              .from('category_info')
              .select('code, name')
              .in('code', categoryCodes);
            setVehicleCategories(categories || []);
            // 기본 선택값 없으면 첫번째로
            if (categories && categories.length > 0 && !selectedVehicleCategory) {
              setSelectedVehicleCategory(categories[0].code);
            }
          } else {
            setVehicleCategories([]);
            setSelectedVehicleCategory('');
          }
        });
    } else {
      setVehicleCategories([]);
      setSelectedVehicleCategory('');
    }
  }, [form.schedule_code, form.cruise_code]);

  // 차량 옵션 로드 (일정, 크루즈, 차량구분 기준)
  useEffect(() => {
    if (form.schedule_code && form.cruise_code && selectedVehicleCategory) {
      supabase
        .from('car_price')
        .select('car_code')
        .eq('schedule_code', form.schedule_code)
        .eq('cruise_code', form.cruise_code)
        .eq('car_category_code', selectedVehicleCategory)
        .then(async ({ data: carPrices }: any) => {
          const carCodes = [...new Set(carPrices?.map((v: any) => v.car_code).filter(Boolean))];
          if (carCodes.length > 0) {
            // 코드를 그대로 이름으로 사용하여 옵션 생성
            const carList = carCodes.map(code => ({
              code,
              name: code // 코드를 이름으로 직접 사용
            }));
            setVehicles(carList || []);
          } else {
            setVehicles([]);
          }
        });
    } else {
      setVehicles([]);
    }
  }, [form.schedule_code, form.cruise_code, selectedVehicleCategory]);

  // 기본 데이터 로드
  const loadBasicData = async () => {
    try {
      const [scheduleRes, paymentRes] = await Promise.all([
        supabase.from('schedule_info').select('*'),
        supabase.from('payment_info').select('*')
      ]);

      setSchedules(scheduleRes.data || []);
      setPayments(paymentRes.data || []);
    } catch (error) {
      console.error('기본 데이터 로드 실패:', error);
    }
  };

  // 크루즈 옵션 로드
  useEffect(() => {
    const fetchCruiseOptions = async () => {
      if (!form.schedule_code || !form.checkin) return;

      const { data: roomPrices } = await supabase
        .from('room_price')
        .select('cruise_code')
        .eq('schedule_code', form.schedule_code)
        .lte('start_date', form.checkin)
        .gte('end_date', form.checkin);

      const cruiseCodes = [...new Set(roomPrices?.map((r: any) => r.cruise_code).filter(Boolean))];

      if (cruiseCodes.length > 0) {
        // 코드를 그대로 이름으로 사용하여 옵션 생성
        const cruiseList = cruiseCodes.map(code => ({
          code,
          name: code // 코드를 이름으로 직접 사용
        }));
        setCruises(cruiseList || []);
      }
    };

    fetchCruiseOptions();
  }, [form.schedule_code, form.checkin]);

  // 객실 옵션 로드
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
        const filteredCodes = roomPrices?.filter((rp: any) =>
          new Date(rp.start_date) <= checkin && checkin <= new Date(rp.end_date)
        ).map((rp: any) => rp.room_code);

        const uniqueCodes = [...new Set(filteredCodes)];
        if (uniqueCodes.length > 0) {
          // 코드를 그대로 이름으로 사용하여 옵션 생성
          const roomList = uniqueCodes.map(code => ({
            code,
            name: code // 코드를 이름으로 직접 사용
          }));
          setRooms(roomList || []);
        }
      }
    };
    fetchRoomOptions();
  }, [form.schedule_code, form.cruise_code, form.payment_code, form.checkin]);

  // 결제방식 필터링
  useEffect(() => {
    const fetchFilteredPayments = async () => {
      if (form.schedule_code && form.cruise_code && form.checkin) {
        const { data: roomPrices } = await supabase
          .from('room_price')
          .select('payment_code, start_date, end_date')
          .eq('schedule_code', form.schedule_code)
          .eq('cruise_code', form.cruise_code);

        const checkin = new Date(form.checkin);
        const filteredCodes = roomPrices?.filter((rp: any) =>
          new Date(rp.start_date) <= checkin && checkin <= new Date(rp.end_date)
        ).map((rp: any) => rp.payment_code);

        const uniqueCodes = [...new Set(filteredCodes)];
        setFilteredPayments(payments.filter(p => uniqueCodes.includes(p.code)));
      } else {
        setFilteredPayments(payments);
      }
    };
    fetchFilteredPayments();
  }, [form.schedule_code, form.cruise_code, form.checkin, payments]);

  // 객실 추가 함수
  const addNewRoom = () => {
    setForm(prev => ({
      ...prev,
      rooms: [
        ...prev.rooms,
        {
          room_code: '',
          category: '',
          adult_count: 0,
          child_count: 0,
          infant_count: 0,
          extra_adult_count: 0,
          extra_child_count: 0,
          additional_categories: [] as Array<{ category: string, count: number }>
        }
      ]
    }));
  };

  // 추가 인동 구분 추가 함수
  const addAdditionalCategory = (roomIdx: number) => {
    const newRooms = [...form.rooms];
    if (!newRooms[roomIdx].additional_categories) {
      newRooms[roomIdx].additional_categories = [];
    }
    newRooms[roomIdx].additional_categories.push({
      category: '',
      count: 0
    });
    setForm({ ...form, rooms: newRooms });
  };

  // 추가 인동 구분 삭제 함수
  const removeAdditionalCategory = (roomIdx: number, categoryIdx: number) => {
    const newRooms = [...form.rooms];
    newRooms[roomIdx].additional_categories.splice(categoryIdx, 1);
    setForm({ ...form, rooms: newRooms });
  };

  // 인동 구분 필터링 - 객실과 동일한 방식으로 5개 조건 적용
  useEffect(() => {
    const fetchFilteredCategories = async () => {
      if (form.schedule_code && form.cruise_code && form.checkin && form.payment_code) {
        const { data: roomPrices } = await supabase
          .from('room_price')
          .select('room_category_code, start_date, end_date')
          .eq('schedule_code', form.schedule_code)
          .eq('cruise_code', form.cruise_code)
          .eq('payment_code', form.payment_code);

        const checkin = new Date(form.checkin);
        const filteredCategories = roomPrices?.filter((rp: any) =>
          new Date(rp.start_date) <= checkin && checkin <= new Date(rp.end_date)
        ).map((rp: any) => rp.room_category_code);

        const uniqueCategoryCodes = [...new Set(filteredCategories?.filter(Boolean))];

        console.log('필터링된 인동 구분 코드:', uniqueCategoryCodes); // 디버깅용

        if (uniqueCategoryCodes.length > 0) {
          // 임시 하드코딩된 인동 구분 매핑 (추후 DB에서 가져오도록 수정 예정)
          const categoryMap = {
            'C1': '성인',
            'C2': '아동',
            'C3': '엑스트라',
            'C4': '싱글차지',
            'C5': '왕복',
            'C6': '추가',
            'C7': '편도',
            'C8': '엑스트라 성인',
            'C9': '엑스트라 아동',
            'C10': '아동(5세 까지)',
            'C11': '아동(6세_12세)',
            'C12': '유아'
          };

          const categoryInfos = uniqueCategoryCodes.map(code => ({
            code,
            name: categoryMap[code as keyof typeof categoryMap] || code
          }));

          console.log('인동 구분 정보:', categoryInfos); // 디버깅용
          setCategories(categoryInfos || []);
        } else {
          console.log('인동 구분 코드가 없음 - 조건들:', {
            schedule_code: form.schedule_code,
            cruise_code: form.cruise_code,
            checkin: form.checkin,
            payment_code: form.payment_code,
            roomPricesCount: roomPrices?.length
          }); // 디버깅용
          setCategories([]);
        }
      } else {
        console.log('인동 구분 조건 불충족:', {
          schedule_code: form.schedule_code,
          cruise_code: form.cruise_code,
          checkin: form.checkin,
          payment_code: form.payment_code
        }); // 디버깅용
        setCategories([]);
      }
    };
    fetchFilteredCategories();
  }, [form.schedule_code, form.cruise_code, form.checkin, form.payment_code]);

  // 인동 선택 렌더러
  const renderCountSelector = (label: string, field: string) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-blue-700 mb-2">{label}</label>
      <div className="grid grid-cols-8 gap-1">
        {[...Array(8).keys()].map(n => (
          <button
            key={`${field}-${n}`}
            onClick={() => setForm(prev => ({ ...prev, [field]: n }))}
            className={`border rounded px-2 py-1 text-xs transition-colors ${(form as any)[field] === n ? 'bg-blue-200 text-blue-700 border-blue-200' : 'bg-blue-50 border-blue-100 text-purple-600 hover:bg-blue-100'
              }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );

  // 차량 추가
  const handleAddVehicle = () => {
    if (vehicleForm.length < 3) {
      setVehicleForm([...vehicleForm, { car_code: '', count: 1 }]);
    }
  };

  // 차량 제거
  const handleRemoveVehicle = (index: number) => {
    if (vehicleForm.length > 1) {
      setVehicleForm(vehicleForm.filter((_, i) => i !== index));
    }
  };

  // 차량 정보 변경
  const handleVehicleChange = (index: number, field: string, value: any) => {
    const updated = vehicleForm.map((vehicle, i) =>
      i === index ? { ...vehicle, [field]: value } : vehicle
    );
    setVehicleForm(updated);
  };

  // 폼 제출 - 새로운 저장 방식으로 변경
  const handleSubmit = async () => {
    if (!user) return;
    if (!form.checkin || !form.schedule_code || !form.cruise_code || !form.payment_code) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      // 1. 사용자 테이블 확인 및 생성
      const { data: userExists } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      if (!userExists) {
        const isAdmin = user.email && (
          user.email.includes('admin') ||
          user.email.includes('manager') ||
          user.email.endsWith('@cruise.com')
        );
        await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email || '',
            name: isAdmin ? '관리자' : '사용자',
            role: isAdmin ? 'admin' : 'guest'
          });
      }
      // 2. 메인 견적 생성
      const { data: newQuote, error: quoteError } = await supabase
        .from('quote')
        .insert({
          user_id: user.id,
          title: '크루즈 견적',
          status: 'draft'
        })
        .select()
        .single();
      if (quoteError) {
        console.error('Quote 저장 오류:', quoteError);
        alert('견적 저장 실패: ' + quoteError.message);
        return;
      }
      // 3. 크루즈 이름 조회
      let cruiseName = '';
      if (form.cruise_code) {
        const { data: cruiseInfo } = await supabase
          .from('cruise_info')
          .select('name')
          .eq('code', form.cruise_code)
          .single();
        cruiseName = cruiseInfo?.name || form.cruise_code;
      }
      // 4. 크루즈 서비스 데이터 생성
      const cruiseFormData = {
        cruise_name: cruiseName,
        departure_date: form.checkin,
        return_date: form.checkin,
        departure_port: '',
        room_type: form.rooms[0]?.room_code || '',
        adult_count: form.rooms.reduce((sum, room) => sum + (room.adult_count || 0), 0),
        child_count: form.rooms.reduce((sum, room) => sum + (room.child_count || 0), 0),
        infant_count: form.rooms.reduce((sum, room) => sum + (room.infant_count || 0), 0),
        special_requests: `일정: ${form.schedule_code}, 크루즈: ${form.cruise_code}, 결제방식: ${form.payment_code}`,
        schedule_code: form.schedule_code,
        cruise_code: form.cruise_code,
        payment_code: form.payment_code,
        discount_rate: form.discount_rate,
        rooms_detail: JSON.stringify(form.rooms),
        vehicle_detail: JSON.stringify(vehicleForm)
      };
      // 5. 크루즈 서비스 생성
      const { data: cruiseData, error: cruiseError } = await supabase
        .from('cruise')
        .insert({
          ...cruiseFormData,
          base_price: 0
        })
        .select()
        .single();
      if (cruiseError || !cruiseData) {
        console.error('크루즈 서비스 생성 오류:', cruiseError);
        alert('크루즈 서비스 생성 실패: ' + cruiseError?.message);
        return;
      }
      // 6. 견적 아이템 생성
      const { data: itemData, error: itemError } = await supabase
        .from('quote_item')
        .insert({
          quote_id: newQuote.id,
          service_type: 'cruise',
          service_ref_id: cruiseData.id,
          quantity: 1,
          unit_price: 0,
          total_price: 0
        })
        .select()
        .single();
      if (itemError || !itemData) {
        console.error('견적 아이템 생성 오류:', itemError);
        alert('견적 아이템 생성 실패: ' + itemError?.message);
        return;
      }
      // quote_room 테이블에 객실 정보도 별도 저장
      if (form.rooms.length > 0) {
        const roomData = form.rooms
          .filter(room => room.room_code)
          .map(room => ({
            quote_id: newQuote.id,
            room_code: room.room_code,
            category: room.category || null,
            person_count: (room.adult_count || 0) + (room.child_count || 0) + (room.infant_count || 0),
            adult_count: room.adult_count || 0,
            child_count: room.child_count || 0,
            infant_count: room.infant_count || 0,
            extra_adult_count: room.extra_adult_count || 0,
            extra_child_count: room.extra_child_count || 0,
            additional_categories: JSON.stringify(room.additional_categories || [])
          }));
        if (roomData.length > 0) {
          await supabase.from('quote_room').insert(roomData);
        }
      }
      // quote_car 테이블에 차량 정보도 별도 저장
      if (vehicleForm.length > 0) {
        const carData = vehicleForm
          .filter(car => car.car_code)
          .map(car => ({
            quote_id: newQuote.id,
            car_code: car.car_code,
            count: car.count || 1
          }));
        if (carData.length > 0) {
          await supabase.from('quote_car').insert(carData);
        }
      }
      alert('크루즈 견적이 저장되었습니다!');
      // 페이지 이동 없이 그대로 머무름
    } catch (error) {
      console.error('견적 저장 오류:', error);
      alert('견적 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50">
      {/* 그라데이션 헤더 */}
      <div className="bg-gradient-to-r from-blue-100 via-purple-100 to-blue-200 text-blue-700">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-blue-600">🚢 크루즈 예약 (상세)</h1>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/mypage/quotes/cruise/new')}
                className="bg-green-100 hover:bg-green-200 px-4 py-2 rounded-lg transition-colors text-green-700 border border-green-200"
              >
                ✨ 간편 예약
              </button>
              <button
                onClick={() => router.push('/mypage/quotes/new')}
                className="bg-blue-100 hover:bg-blue-200 px-4 py-2 rounded-lg transition-colors text-blue-700 border border-blue-200"
              >
                🏠 홈으로
              </button>
            </div>
          </div>
          <div className="bg-blue-100/60 backdrop-blur rounded-lg p-6 border border-blue-100">
            <p className="text-lg text-blue-700 opacity-90">원하는 크루즈 일정과 객실을 상세하게 선택해주세요.</p>
            <p className="text-sm text-purple-500 opacity-75 mt-2">상세한 정보를 입력하시면 더 정확한 견적을 받으실 수 있습니다. 간편 예약은 상단의 "✨ 간편 예약" 버튼을 이용하세요.</p>
          </div>
        </div>
      </div>

      {/* 입력 폼 영역 */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          {/* 크루즈 안내 카드 (체크인 날짜 위) */}
          <div className="bg-blue-600 rounded-lg p-6 mb-6 border border-blue-700">
            <h3 className="text-white text-lg font-semibold mb-2">📝 상세 예약 안내</h3>
            <p className="text-white/90 text-sm">크루즈 상세 예약을 위해 아래 정보를 순서대로 입력해 주세요.<br />정확한 일정, 객실, 차량 정보를 입력하시면 빠른 견적 안내가 가능합니다.<br />비교 견적이 필요하시면 필요한 만큼 반복하여 작성해 주세요.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">📅 체크인 날짜</label>
            <input
              type="date"
              value={form.checkin}
              onChange={e => setForm({ ...form, checkin: e.target.value })}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">🗓 일정 선택</label>
            <div className="grid grid-cols-3 gap-2">
              {schedules.map(s => (
                <button
                  key={s.code}
                  onClick={() => setForm({ ...form, schedule_code: s.code })}
                  className={`border p-3 rounded-lg transition-colors ${form.schedule_code === s.code ? 'bg-blue-200 text-blue-700 border-blue-200' : 'bg-blue-50 border-blue-100 text-purple-600 hover:bg-blue-100'
                    }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">🚢 크루즈 선택</label>
            <select
              value={form.cruise_code}
              onChange={e => setForm({ ...form, cruise_code: e.target.value })}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">크루즈를 선택하세요</option>
              {cruises.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">💳 결제 방식</label>
            <div className="grid grid-cols-2 gap-2">
              {(form.schedule_code && form.cruise_code && form.checkin && filteredPayments.length > 0
                ? filteredPayments
                : payments.filter(p => p.name.includes('신용카드') && p.name.includes('베트남동'))
              ).map(p => (
                <button
                  key={p.code}
                  onClick={() => setForm({ ...form, payment_code: p.code })}
                  className={`border p-3 rounded-lg transition-colors ${form.payment_code === p.code ? 'bg-blue-200 text-blue-700 border-blue-200' : 'bg-blue-50 border-blue-100 text-purple-600 hover:bg-blue-100'
                    }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* 객실 선택 영역 - 여러 객실 지동 */}
          {form.rooms.map((room, idx) => (
            <div key={idx} className="mb-6 p-4 rounded-lg border border-blue-100 bg-blue-50">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">🛏 객실 {idx + 1} 선택</label>
                {form.rooms.length > 1 && (
                  <button
                    type="button"
                    className="text-xs text-red-500 px-2 py-1 rounded hover:bg-red-100"
                    onClick={() => {
                      setForm(prev => ({
                        ...prev,
                        rooms: prev.rooms.filter((_, i) => i !== idx)
                      }));
                    }}
                  >
                    삭제
                  </button>
                )}
              </div>
              <select
                value={room.room_code}
                onChange={e => {
                  const newRooms = [...form.rooms];
                  newRooms[idx].room_code = e.target.value;
                  setForm({ ...form, rooms: newRooms });
                }}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2"
              >
                <option value="">객실을 선택하세요</option>
                {rooms.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
              </select>
              {/* 인동 선택 - 각 객실별 */}
              <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg p-4 border border-blue-100">
                <h3 className="text-blue-700 text-base font-semibold mb-2">👥 인동 선택</h3>
                {/* 인동 구분 선택 및 인원수 드롭다운 - 모바일 최적화 */}
                <div className="flex gap-2 mb-2">
                  {/* 인동 구분 드롭다운 */}
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-blue-700 mb-1">인동 구분</label>
                    <select
                      value={room.category || '성인'}
                      onChange={e => {
                        const newRooms = [...form.rooms];
                        newRooms[idx].category = e.target.value;
                        setForm({ ...form, rooms: newRooms });
                      }}
                      className="w-full border border-blue-200 rounded px-3 py-2 text-base min-h-[44px]"
                    >
                      <option value="">인원구분 선택</option>
                      {categories.map(cat => (
                        <option key={cat.code} value={cat.code}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* 인원수 드롭다운 */}
                  <div className="w-28">
                    <label className="block text-sm font-medium text-blue-700 mb-1">인원수</label>
                    <select
                      value={room.category === '아동' ? room.child_count : room.adult_count}
                      onChange={e => {
                        const newRooms = [...form.rooms];
                        const count = Number(e.target.value);
                        if ((room.category || '성인') === '아동') {
                          newRooms[idx].child_count = count;
                        } else {
                          newRooms[idx].adult_count = count;
                        }
                        // 인원수 입력시 자동으로 추가 인동 구분 슬롯 생성
                        if (count > 0 && (!newRooms[idx].additional_categories || newRooms[idx].additional_categories.length === 0)) {
                          newRooms[idx].additional_categories = [{ category: '', count: 0 }];
                        }
                        setForm({ ...form, rooms: newRooms });
                      }}
                      className="w-full border border-blue-200 rounded px-2 py-2 text-base min-h-[44px]"
                    >
                      {[...Array(9).keys()].map(n => (
                        <option key={n} value={n}>{n}명</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 추가 인동 구분 입력창들 - 모바일 최적화 */}
                {room.additional_categories?.map((addCat, catIdx) => {
                  const usedCategories = [room.category, ...room.additional_categories.map(ac => ac.category)];
                  const availableCategories = categories.filter(cat => !usedCategories.includes(cat.code) || cat.code === addCat.category);

                  // 첫 번째 빈 추가 인동 구분 슬롯에만 '아동' 자동 표기
                  let defaultCategory = '';
                  if (!addCat.category) {
                    // '아동'이 이미 사용 중인지 확인
                    const isAdultUsed = [room.category, ...room.additional_categories.map(ac => ac.category)].includes('아동');
                    if (!isAdultUsed) {
                      // 첫 번째 빈 슬롯에만 '아동' 표기
                      const firstEmptyIdx = room.additional_categories.findIndex(ac => !ac.category);
                      if (firstEmptyIdx === catIdx) {
                        defaultCategory = '아동';
                      }
                    }
                  }

                  return (
                    <div key={catIdx} className="flex gap-2 mt-2 items-center">
                      {/* 인동 구분 드롭다운 - 50% */}
                      <div className="flex-1 min-w-0">
                        <select
                          value={addCat.category || defaultCategory}
                          onChange={e => {
                            const newRooms = [...form.rooms];
                            newRooms[idx].additional_categories[catIdx].category = e.target.value;
                            setForm({ ...form, rooms: newRooms });
                          }}
                          className="w-full border border-blue-200 rounded px-3 py-2 text-base min-h-[44px]"
                        >
                          <option value="">인원구분</option>
                          {availableCategories.map(cat => (
                            <option key={cat.code} value={cat.code}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                      {/* 인원수 드롭다운 - 50% */}
                      <div className="flex-1 min-w-0">
                        <select
                          value={addCat.count}
                          onChange={e => {
                            const newRooms = [...form.rooms];
                            const count = Number(e.target.value);
                            newRooms[idx].additional_categories[catIdx].count = count;
                            // 숫자 입력시 자동으로 다음 인동 구분 슬롯 추가
                            if (count > 0 && catIdx === newRooms[idx].additional_categories.length - 1) {
                              newRooms[idx].additional_categories.push({ category: '', count: 0 });
                            }
                            setForm({ ...form, rooms: newRooms });
                          }}
                          className="w-full border border-blue-200 rounded px-3 py-2 text-base min-h-[44px]"
                        >
                          <option value={0}>0명</option>
                          {[...Array(10).keys()].map(n => (
                            <option key={n + 1} value={n + 1}>{n + 1}명</option>
                          ))}
                        </select>
                      </div>
                      {/* 삭제 버튼 - 컴팩트하게 */}
                      <button
                        type="button"
                        onClick={() => removeAdditionalCategory(idx, catIdx)}
                        className="w-8 h-8 text-red-500 text-xs hover:bg-red-100 rounded flex items-center justify-center"
                        title="삭제"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}

                {/* 현재 선택된 인동 구분 요약 */}
                {(room.category || room.additional_categories?.length > 0) && (
                  <div className="mt-3">
                    <label className="block text-base font-bold text-red-600 mb-1">승선 인원수 요약</label>
                    <div className="text-lg text-red-600 bg-blue-50 p-2 rounded">
                      {room.category && categories.find(c => c.code === room.category) && (
                        <span>{categories.find(c => c.code === room.category)?.name}: {room.category === '아동' ? room.child_count : room.adult_count}명</span>
                      )}
                      {room.additional_categories?.map((addCat, i) => {
                        const catInfo = categories.find(c => c.code === addCat.category);
                        return catInfo && addCat.count > 0 ? (
                          <span key={i}>
                            {room.category && (room.category === '아동' ? room.child_count : room.adult_count) > 0 ? ', ' : ''}{catInfo.name}: {addCat.count}명
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {/* 객실 추가 버튼 (최대 3개) */}
          {form.rooms.length < 3 && (
            <button
              type="button"
              className="w-full bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 py-2 rounded-lg border border-blue-200 font-semibold mb-4 hover:from-blue-200 hover:to-purple-200 transition-all"
              onClick={addNewRoom}
            >
              + 객실 추가
            </button>
          )}

          {/* 차량 입력 영역 */}
          <div className="mt-12">
            <h2 className="text-xl font-bold mb-4 text-green-700">🚐 차량 정보 입력</h2>
            <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg p-6 mb-6">
              <h3 className="text-white text-lg font-semibold mb-4">💡 차량 예약 안내</h3>
              <p className="text-white/90 text-sm">
                크루즈 여행 시 필요한 차량을 선택하세요. 크루즈 선착장 까지 이동을 위한 차량을 예약할 수 있습니다.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
              {/* 차량구분 하드코딩 버튼 UI */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">🚙 차량구분</label>
                <div className="flex gap-2">
                  {[
                    { code: 'C5', name: '왕복' },
                    { code: 'C7', name: '편도' },
                    { code: 'C6', name: '추가' }
                  ].map(cat => (
                    <button
                      key={cat.code}
                      type="button"
                      onClick={() => setSelectedVehicleCategory(cat.code)}
                      className={`border px-4 py-2 rounded-lg transition-colors ${selectedVehicleCategory === cat.code
                          ? 'bg-green-500 text-white border-green-500'
                          : 'bg-gray-50 border-gray-300 hover:bg-gray-100 text-gray-700'
                        }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">🚗 차량 선택</label>
                {vehicleForm.map((vehicle, vehicleIndex) => (
                  <div key={vehicleIndex} className="border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-gray-700">차량 {vehicleIndex + 1}</h4>
                      {vehicleForm.length > 1 && (
                        <button
                          onClick={() => handleRemoveVehicle(vehicleIndex)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          제거
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">🚗 차량 종류</label>
                        <select
                          value={vehicle.car_code}
                          onChange={e => handleVehicleChange(vehicleIndex, 'car_code', e.target.value)}
                          className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          disabled={vehicles.length === 0}
                        >
                          <option value="">{vehicles.length === 0 ? '일정/크루즈/차량구분을 먼저 선택하세요' : '차량을 선택하세요'}</option>
                          {vehicles.map(v => <option key={v.code} value={v.code}>{v.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">🔢 차량수 및 인원수</label>
                        <div className="grid grid-cols-5 gap-1">
                          {[...Array(10).keys()].map(n => (
                            <button
                              key={n + 1}
                              onClick={() => handleVehicleChange(vehicleIndex, 'count', n + 1)}
                              className={`border rounded px-2 py-1 text-sm transition-colors ${vehicle.count === n + 1 ? 'bg-green-200 text-green-700 border-green-200' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                              {n + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {vehicleForm.length < 3 && (
                  <button
                    onClick={handleAddVehicle}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-3 text-gray-500 hover:border-green-400 hover:text-green-600 transition-colors"
                  >
                    + 차량 추가
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 기존 단일 인동 선택 박스 제거됨. 객실별 인동 선택 UI만 남김 */}

          {/* 제출 버튼 */}
          <div className="flex gap-4">
            <button
              onClick={() => router.back()}
              className="flex-1 bg-blue-100 text-blue-700 py-3 rounded-lg hover:bg-blue-200 border border-blue-200 transition-colors"
            >
              ← 뒤로가기
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-200 to-purple-200 text-blue-700 py-3 rounded-lg hover:from-blue-300 hover:to-purple-300 border border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all"
            >
              {loading ? '추가 중...' : '🚢 견적 추가'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

