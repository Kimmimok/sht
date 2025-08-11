'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';

function CruiseQuoteNewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get('quoteId');
  const itemId = searchParams.get('itemId');
  const serviceRefId = searchParams.get('serviceRefId');
  const mode = searchParams.get('mode');

  // 폼 상태
  const [form, setForm] = useState({
    checkin: '',
    schedule: '',
    cruise_code: '',
    payment_code: '',
    rooms: [{
      room_type: '',
      categories: [{ room_category: '', adult_count: 0, room_code: '' }]
    }]
  });

  // 차량 폼 상태
  const [vehicleForm, setVehicleForm] = useState([{
    car_type: '',
    car_category: '',
    car_code: '',
    count: 1
  }]);

  // 선택된 카테고리 상태
  const [selectedCarCategory, setSelectedCarCategory] = useState('');

  // 옵션 데이터
  const [cruiseOptions, setCruiseOptions] = useState<string[]>([]);
  const [paymentOptions, setPaymentOptions] = useState<string[]>([]);
  const [roomTypeOptions, setRoomTypeOptions] = useState<string[]>([]);
  const [roomCategoryOptions, setRoomCategoryOptions] = useState<string[]>([]);
  const [carCategoryOptions, setCarCategoryOptions] = useState<string[]>([]);
  const [carTypeOptions, setCarTypeOptions] = useState<string[]>([]);

  // 일정 옵션 (하드코딩)
  const scheduleOptions = ['1박2일', '2박3일', '당일'];

  // 특별 요청사항 상태
  const [formData, setFormData] = useState({
    special_requests: ''
  });

  // 로딩 상태
  const [loading, setLoading] = useState(false);

  // 견적 정보 상태
  const [quote, setQuote] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (!quoteId) {
      alert('견적 ID가 필요합니다.');
      router.push('/mypage');
      return;
    }
    loadQuote();

    // 수정 모드인 경우 기존 데이터 로드
    if (mode === 'edit' && itemId && serviceRefId) {
      setIsEditMode(true);
      loadExistingQuoteData();
    }
  }, [quoteId, router, mode, itemId, serviceRefId]);

  // 일정이 선택되면 크루즈 옵션 로드
  useEffect(() => {
    if (form.schedule && form.checkin) {
      loadCruiseOptions();
    } else {
      setCruiseOptions([]);
      setForm(prev => ({ ...prev, cruise_code: '' }));
    }
  }, [form.schedule, form.checkin]);

  // 크루즈가 선택되면 결제방식 옵션 로드
  useEffect(() => {
    if (form.schedule && form.checkin && form.cruise_code) {
      loadPaymentOptions();
      loadCarCategoryOptions();
    } else {
      setPaymentOptions([]);
      setCarCategoryOptions([]);
      setForm(prev => ({ ...prev, payment_code: '' }));
    }
  }, [form.schedule, form.checkin, form.cruise_code]);

  // 결제방식이 선택되면 룸타입 옵션 로드
  useEffect(() => {
    if (form.schedule && form.checkin && form.cruise_code && form.payment_code) {
      loadRoomTypeOptions();
    } else {
      setRoomTypeOptions([]);
    }
  }, [form.schedule, form.checkin, form.cruise_code, form.payment_code]);

  // 차량 카테고리가 선택되면 차량타입 옵션 로드
  useEffect(() => {
    if (selectedCarCategory && form.schedule && form.cruise_code) {
      loadCarTypeOptions();
    } else {
      setCarTypeOptions([]);
    }
  }, [selectedCarCategory, form.schedule, form.cruise_code]);

  const loadQuote = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quote')
        .select('title, status, created_at')
        .eq('id', quoteId)
        .single();

      if (error) throw error;

      setQuote(data);
      console.log('Quote loaded:', data);
    } catch (error) {
      console.error('견적 조회 실패:', error);
      alert('견적을 조회할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 기존 견적 데이터 로드 (수정 모드용)
  const loadExistingQuoteData = async () => {
    try {
      setLoading(true);

      // 서비스 타입에 따라 다른 테이블에서 데이터 조회
      const { data: quoteItem, error: itemError } = await supabase
        .from('quote_item')
        .select('service_type')
        .eq('id', itemId)
        .single();

      if (itemError || !quoteItem) {
        console.error('견적 항목 조회 오류:', itemError);
        alert('견적 항목을 찾을 수 없습니다.');
        return;
      }

      // service_type에 따라 적절한 테이블에서 데이터 조회
      let tableName = '';
      if (quoteItem.service_type === 'room') {
        tableName = 'room';
      } else if (quoteItem.service_type === 'car') {
        tableName = 'car';
      } else {
        alert('지원하지 않는 서비스 타입입니다.');
        return;
      }

      const { data: serviceData, error: serviceError } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', serviceRefId)
        .single();

      if (serviceError || !serviceData) {
        console.error('서비스 데이터 조회 오류:', serviceError);
        alert('서비스 데이터를 찾을 수 없습니다.');
        return;
      }

      // 데이터 타입에 따라 폼에 로드
      if (quoteItem.service_type === 'room') {
        // 객실 데이터 로드
        setForm(prev => ({
          ...prev,
          checkin: serviceData.checkin || '',
          schedule: serviceData.schedule || '',
          cruise_code: serviceData.cruise_code || '',
          payment_code: serviceData.payment_code || '',
          rooms: serviceData.room_categories ?
            JSON.parse(serviceData.room_categories) :
            [{ room_type: '', categories: [{ room_category: '', adult_count: 0, room_code: '' }] }]
        }));

        setFormData(prev => ({
          ...prev,
          special_requests: serviceData.special_requests || ''
        }));
      } else if (quoteItem.service_type === 'car') {
        // 차량 데이터 로드
        setForm(prev => ({
          ...prev,
          checkin: serviceData.usage_date || '',
          schedule: serviceData.schedule || '',
          cruise_code: serviceData.cruise_code || '',
          payment_code: serviceData.payment_code || ''
        }));

        setVehicleForm(serviceData.car_categories ?
          JSON.parse(serviceData.car_categories) :
          [{ car_type: '', car_category: '', car_code: '', count: 1 }]
        );

        setFormData(prev => ({
          ...prev,
          special_requests: serviceData.special_requests || ''
        }));
      }

      console.log('기존 견적 데이터 로드 완료:', serviceData);
    } catch (error) {
      console.error('기존 견적 데이터 로드 오류:', error);
      alert('기존 견적 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 크루즈 옵션 로드 함수
  const loadCruiseOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('room_price')
        .select('cruise')
        .eq('schedule', form.schedule)
        .lte('start_date', form.checkin)
        .gte('end_date', form.checkin)
        .order('cruise');

      if (error) throw error;

      const uniqueCruises = [...new Set(data.map((item: any) => item.cruise).filter(Boolean))] as string[];
      setCruiseOptions(uniqueCruises);
      console.log('크루즈 옵션 로드됨:', uniqueCruises);
    } catch (error) {
      console.error('크루즈 옵션 조회 실패:', error);
    }
  };

  // 결제방식 옵션 로드 함수
  const loadPaymentOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('room_price')
        .select('payment')
        .eq('schedule', form.schedule)
        .eq('cruise', form.cruise_code)
        .lte('start_date', form.checkin)
        .gte('end_date', form.checkin)
        .order('payment');

      if (error) throw error;

      const uniquePayments = [...new Set(data.map((item: any) => item.payment).filter(Boolean))] as string[];
      setPaymentOptions(uniquePayments);
      console.log('결제방식 옵션 로드됨:', uniquePayments);
    } catch (error) {
      console.error('결제방식 옵션 조회 실패:', error);
    }
  };

  // 룸카테고리 옵션 로드 함수 (특정 룸타입에 대해)
  const loadRoomCategoryOptions = async (roomType?: string) => {
    try {
      const { data, error } = await supabase
        .from('room_price')
        .select('room_category')
        .eq('schedule', form.schedule)
        .eq('cruise', form.cruise_code)
        .eq('payment', form.payment_code)
        .eq('room_type', roomType || '') // 특정 룸타입이 제공되면 사용
        .lte('start_date', form.checkin)
        .gte('end_date', form.checkin)
        .order('room_category');

      if (error) throw error;

      const uniqueRoomCategories = [...new Set(data.map((item: any) => item.room_category).filter(Boolean))] as string[];
      setRoomCategoryOptions(uniqueRoomCategories);
      console.log('룸카테고리 옵션 로드됨:', uniqueRoomCategories);
    } catch (error) {
      console.error('룸카테고리 옵션 조회 실패:', error);
    }
  };

  // 객실타입 옵션 로드 함수
  const loadRoomTypeOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('room_price')
        .select('room_type')
        .eq('schedule', form.schedule)
        .eq('cruise', form.cruise_code)
        .eq('payment', form.payment_code)
        .lte('start_date', form.checkin)
        .gte('end_date', form.checkin)
        .order('room_type');

      if (error) throw error;

      const uniqueRoomTypes = [...new Set(data.map((item: any) => item.room_type).filter(Boolean))] as string[];
      setRoomTypeOptions(uniqueRoomTypes);
      console.log('객실타입 옵션 로드됨:', uniqueRoomTypes);
    } catch (error) {
      console.error('객실타입 옵션 조회 실패:', error);
    }
  };

  // 차량 카테고리 옵션 로드 함수
  const loadCarCategoryOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('car_price')
        .select('car_category')
        .eq('schedule', form.schedule)
        .eq('cruise', form.cruise_code)
        .order('car_category');

      if (error) throw error;

      const uniqueCategories = [...new Set(data.map((item: any) => item.car_category).filter(Boolean))] as string[];
      setCarCategoryOptions(uniqueCategories);
      console.log('차량 카테고리 옵션 로드됨:', uniqueCategories);
    } catch (error) {
      console.error('차량 카테고리 옵션 조회 실패:', error);
    }
  };

  // 차량타입 옵션 로드 함수
  const loadCarTypeOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('car_price')
        .select('car_type')
        .eq('schedule', form.schedule)
        .eq('cruise', form.cruise_code)
        .eq('car_category', selectedCarCategory)
        .order('car_type');

      if (error) throw error;

      const uniqueCarTypes = [...new Set(data.map((item: any) => item.car_type).filter(Boolean))] as string[];
      setCarTypeOptions(uniqueCarTypes);
      console.log('차량타입 옵션 로드됨:', uniqueCarTypes);
    } catch (error) {
      console.error('차량타입 옵션 조회 실패:', error);
    }
  };

  // room_code 조회 함수
  const getRoomCode = async (roomType: string, roomCategory: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('room_price')
        .select('room_code')
        .eq('schedule', form.schedule)
        .eq('cruise', form.cruise_code)
        .eq('payment', form.payment_code)
        .eq('room_type', roomType)
        .eq('room_category', roomCategory)
        .lte('start_date', form.checkin)
        .gte('end_date', form.checkin)
        .limit(1)
        .single();

      if (error) throw error;
      console.log('room_code 조회됨:', data.room_code);
      return data.room_code;
    } catch (error) {
      console.error('room_code 조회 실패:', error);
      return '';
    }
  };

  // car_code 조회 함수
  const getCarCode = async (carType: string, carCategory: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('car_price')
        .select('car_code')
        .eq('schedule', form.schedule)
        .eq('cruise', form.cruise_code)
        .eq('car_type', carType)
        .eq('car_category', carCategory)
        .limit(1)
        .single();

      if (error) throw error;
      console.log('car_code 조회됨:', data.car_code);
      return data.car_code;
    } catch (error) {
      console.error('car_code 조회 실패:', error);
      return '';
    }
  };

  // 객실 추가 함수
  const addNewRoom = () => {
    if (form.rooms.length < 3) {
      setForm(prev => ({
        ...prev,
        rooms: [...prev.rooms, {
          room_type: '',
          categories: [{ room_category: '', adult_count: 0, room_code: '' }]
        }]
      }));
    }
  };

  // 카테고리 추가 함수
  const addNewCategory = (roomIndex: number) => {
    setForm(prev => {
      const newRooms = [...prev.rooms];
      newRooms[roomIndex].categories.push({ room_category: '', adult_count: 0, room_code: '' });
      return { ...prev, rooms: newRooms };
    });
  };

  // 카테고리 삭제 함수
  const removeCategory = (roomIndex: number, categoryIndex: number) => {
    setForm(prev => {
      const newRooms = [...prev.rooms];
      newRooms[roomIndex].categories = newRooms[roomIndex].categories.filter((_, i) => i !== categoryIndex);
      return { ...prev, rooms: newRooms };
    });
  };

  // 차량 추가/제거 함수
  const handleAddVehicle = () => {
    if (vehicleForm.length < 3) {
      setVehicleForm([...vehicleForm, { car_type: '', car_category: '', car_code: '', count: 1 }]);
    }
  };

  const handleRemoveVehicle = (index: number) => {
    if (vehicleForm.length > 1) {
      setVehicleForm(vehicleForm.filter((_, i) => i !== index));
    }
  };

  const handleVehicleChange = (index: number, field: string, value: any) => {
    const newVehicleForm = [...vehicleForm];
    (newVehicleForm[index] as any)[field] = value;
    setVehicleForm(newVehicleForm);
  };

  // 제출 함수 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      if (isEditMode && serviceRefId) {
        // 수정 모드: 기존 데이터 업데이트
        await updateExistingQuoteData();
      } else {
        // 신규 생성 모드: 새 데이터 생성
        await createNewQuoteData();
      }

      alert('크루즈 견적이 성공적으로 저장되었습니다!');
      router.push(`/mypage/quotes/new?quoteId=${quoteId}`);
    } catch (error) {
      console.error('견적 저장 오류:', error);
      alert('견적 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 기존 견적 데이터 업데이트
  const updateExistingQuoteData = async () => {
    // 서비스 타입에 따라 적절한 테이블 업데이트
    const { data: quoteItem, error: itemError } = await supabase
      .from('quote_item')
      .select('service_type')
      .eq('id', itemId)
      .single();

    if (itemError || !quoteItem) {
      throw new Error('견적 항목을 찾을 수 없습니다.');
    }

    if (quoteItem.service_type === 'room') {
      // 객실 데이터 업데이트
      const { error: updateError } = await supabase
        .from('room')
        .update({
          room_categories: JSON.stringify(form.rooms),
          checkin: form.checkin,
          schedule: form.schedule,
          cruise_code: form.cruise_code,
          payment_code: form.payment_code,
          special_requests: formData.special_requests
        })
        .eq('id', serviceRefId);

      if (updateError) throw updateError;
    } else if (quoteItem.service_type === 'car') {
      // 차량 데이터 업데이트
      const { error: updateError } = await supabase
        .from('car')
        .update({
          car_categories: JSON.stringify(vehicleForm),
          usage_date: form.checkin,
          schedule: form.schedule,
          cruise_code: form.cruise_code,
          payment_code: form.payment_code,
          special_requests: formData.special_requests
        })
        .eq('id', serviceRefId);

      if (updateError) throw updateError;
    }
  };

  // 새 견적 데이터 생성
  const createNewQuoteData = async () => {
    // 1. 객실 데이터 저장 (DB 스키마에 맞는 컬럼만 저장)
    for (const room of form.rooms) {
      for (const category of room.categories) {
        if (category.room_code && category.adult_count > 0) {
          const { data: roomData, error: roomError } = await supabase
            .from('room')
            .insert({
              room_code: category.room_code,
              adult_count: category.adult_count
            })
            .select()
            .single();
          if (roomError) throw roomError;
          // quote_item에 연결
          const { error: itemError } = await supabase
            .from('quote_item')
            .insert({
              quote_id: quoteId,
              service_type: 'room',
              service_ref_id: roomData.id,
              quantity: 1,
              unit_price: 0,
              total_price: 0,
              usage_date: form.checkin || null
            });
          if (itemError) throw itemError;
        }
      }
    }
    // 2. 차량 데이터 저장 (DB 스키마에 맞는 컬럼만 저장)
    for (const vehicle of vehicleForm) {
      if (vehicle.car_code && vehicle.count > 0) {
        const { data: carData, error: carError } = await supabase
          .from('car')
          .insert({
            car_code: vehicle.car_code,
            car_count: vehicle.count
          })
          .select()
          .single();
        if (carError) throw carError;
        // quote_item에 연결
        const { error: itemError } = await supabase
          .from('quote_item')
          .insert({
            quote_id: quoteId,
            service_type: 'car',
            service_ref_id: carData.id,
            quantity: 1,
            unit_price: 0,
            total_price: 0,
            usage_date: form.checkin || null
          });
        if (itemError) throw itemError;
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-blue-200 via-purple-200 to-indigo-100 text-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">🚢 크루즈 견적</h1>
              <p className="text-lg opacity-90">
                크루즈 여행을 위한 객실, 차량 예약 서비스 견적을 작성해주세요.
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← 뒤로
            </button>
          </div>

          {/* 견적 정보 */}
          <div className="bg-white/70 backdrop-blur rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">현재 견적 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>견적명: <span className="font-semibold text-blue-600">{quote?.title || '크루즈 견적'}</span></div>
              <div>상태: <span className="text-orange-600">{quote?.status === 'draft' ? '작성 중' : quote?.status || '작성 중'}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* 폼 */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">크루즈 여행 정보 입력</h2>

            {/* 크루즈 안내 카드 */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 mb-6">
              <h3 className="text-white text-lg font-semibold mb-2">🚢 크루즈 예약 안내</h3>
              <p className="text-white/90 text-sm">
                원하시는 크루즈 여행 일정과 객실, 차량을 선택하여 견적을 요청하세요.<br />
                날짜와 일정을 먼저 선택하시면 단계별로 옵션이 제공됩니다.
              </p>
            </div>

            {/* 기본 정보 */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📅 체크인 날짜</label>
                <input
                  type="date"
                  value={form.checkin}
                  onChange={e => setForm({ ...form, checkin: e.target.value })}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">🗓 일정 선택</label>
                <div className="grid grid-cols-3 gap-2">
                  {scheduleOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setForm({ ...form, schedule: option })}
                      className={`border p-3 rounded-lg transition-colors ${form.schedule === option ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                    >
                      {option}
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
                  required
                >
                  <option value="">크루즈를 선택하세요</option>
                  {cruiseOptions.map(cruise => (
                    <option key={cruise} value={cruise}>{cruise}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">💳 결제 방식</label>
                <div className="grid grid-cols-2 gap-2">
                  {paymentOptions.map(payment => (
                    <button
                      key={payment}
                      type="button"
                      onClick={() => setForm({ ...form, payment_code: payment })}
                      className={`border p-3 rounded-lg transition-colors ${form.payment_code === payment ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                    >
                      {payment}
                    </button>
                  ))}
                </div>
              </div>

              {/* 객실 선택 영역 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800"></h3>
                {form.rooms.map((room, roomIdx) => (
                  <div key={roomIdx} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900"></h4>
                      {form.rooms.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setForm(prev => ({
                              ...prev,
                              rooms: prev.rooms.filter((_, i) => i !== roomIdx)
                            }));
                          }}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          삭제
                        </button>
                      )}
                    </div>

                    {/* 객실 타입 선택 */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">🛏 객실명</label>
                      <select
                        value={room.room_type}
                        onChange={e => {
                          const newRooms = [...form.rooms];
                          newRooms[roomIdx].room_type = e.target.value;
                          // 객실 타입이 변경되면 카테고리 초기화
                          newRooms[roomIdx].categories = [{ room_category: '', adult_count: 0, room_code: '' }];
                          setForm({ ...form, rooms: newRooms });

                          // 선택된 룸타입에 대한 카테고리 옵션 로드
                          if (e.target.value) {
                            loadRoomCategoryOptions(e.target.value);
                          }
                        }}
                        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">객실 타입을 선택하세요</option>
                        {roomTypeOptions.map(roomType => (
                          <option key={roomType} value={roomType}>{roomType}</option>
                        ))}
                      </select>
                    </div>

                    {/* 카테고리별 객실 선택 */}
                    {room.categories.map((category, catIdx) => {
                      // 이미 선택된 카테고리들 제외
                      const usedCategories = room.categories
                        .filter((_, i) => i !== catIdx)
                        .map(cat => cat.room_category)
                        .filter(Boolean);
                      const availableCategories = roomCategoryOptions.filter(cat => !usedCategories.includes(cat));

                      return (
                        <div key={catIdx} className="border border-gray-200 rounded-lg p-3 mb-3 bg-white">
                          <div className="flex items-center justify-between mb-2">

                            {room.categories.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeCategory(roomIdx, catIdx)}
                                className="text-red-600 hover:text-red-800 text-xs"
                              >
                                삭제
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">구분</label>
                              <select
                                value={category.room_category}
                                onChange={async (e) => {
                                  const roomCategory = e.target.value;
                                  const roomCode = await getRoomCode(room.room_type, roomCategory);
                                  const newRooms = [...form.rooms];
                                  newRooms[roomIdx].categories[catIdx].room_category = roomCategory;
                                  newRooms[roomIdx].categories[catIdx].room_code = roomCode;
                                  setForm({ ...form, rooms: newRooms });
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-sm"
                              >
                                <option value="">성인 아동 선택</option>
                                {availableCategories.map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">인원수</label>
                              <input
                                type="number"
                                min="0"
                                value={category.adult_count}
                                onChange={(e) => {
                                  const newRooms = [...form.rooms];
                                  newRooms[roomIdx].categories[catIdx].adult_count = parseInt(e.target.value) || 0;
                                  setForm({ ...form, rooms: newRooms });

                                  // 인원수가 입력되고 카테고리가 선택되어 있으면 새 카테고리 추가
                                  if (parseInt(e.target.value) > 0 && category.room_category && catIdx === room.categories.length - 1) {
                                    addNewCategory(roomIdx);
                                  }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}

                {form.rooms.length < 3 && (
                  <button
                    type="button"
                    onClick={addNewRoom}
                    className="w-full border-2 border-dashed border-blue-300 rounded-lg p-4 text-blue-600 hover:border-blue-400 hover:text-blue-700 transition-colors"
                  >
                    + 객실 추가 (최대 3개)
                  </button>
                )}
              </div>

              {/* 차량 선택 영역 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">🚗 차량 선택</h3>

                <div>
                  <div className="flex gap-2">
                    {carCategoryOptions.map(category => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setSelectedCarCategory(category)}
                        className={`px-4 py-2 border rounded-lg transition-colors ${selectedCarCategory === category
                          ? 'bg-green-500 text-white border-green-500'
                          : 'bg-gray-50 border-gray-300 hover:bg-gray-100 text-gray-700'
                          }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                {vehicleForm.map((vehicle, vehicleIndex) => (
                  <div key={vehicleIndex} className="border border-green-200 rounded-lg p-4 bg-green-50">
                    <div className="flex items-center justify-between mb-3">

                      {vehicleForm.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveVehicle(vehicleIndex)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          삭제
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">


                      <div>

                        <select
                          value={vehicle.car_type}
                          onChange={async (e) => {
                            const carType = e.target.value;
                            const carCode = await getCarCode(carType, selectedCarCategory);
                            handleVehicleChange(vehicleIndex, 'car_type', carType);
                            handleVehicleChange(vehicleIndex, 'car_category', selectedCarCategory);
                            handleVehicleChange(vehicleIndex, 'car_code', carCode);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                        >
                          <option value="">차량 선택</option>
                          {carTypeOptions.map(carType => (
                            <option key={carType} value={carType}>{carType}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">차량수</label>
                        <input
                          type="number"
                          min="1"
                          value={vehicle.count}
                          onChange={(e) => handleVehicleChange(vehicleIndex, 'count', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {vehicleForm.length < 3 && (
                  <button
                    type="button"
                    onClick={handleAddVehicle}
                    className="w-full border-2 border-dashed border-green-300 rounded-lg p-4 text-green-600 hover:border-green-400 hover:text-green-700 transition-colors"
                  >
                    + 차량 추가 (최대 3개)
                  </button>
                )}
              </div>

              {/* 특별 요청사항 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">특별 요청사항</label>
                <textarea
                  value={formData.special_requests}
                  onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="특별한 요청사항이 있으시면 입력해주세요..."
                />
              </div>
            </div>

            {/* 제출 버튼 */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? '저장 중...' : '견적 추가'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function CruiseQuoteNewPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64">로딩 중...</div>}>
      <CruiseQuoteNewContent />
    </Suspense>
  );
}
