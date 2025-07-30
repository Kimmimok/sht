'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';
import SelectableButton from '@/components/SelectableButton';

interface FormData {
  checkin_date: string;
  checkout_date: string;
  guest_count: number;
  special_requests: string;
}

interface HotelOption {
  hotel_code: string;
  hotel_name: string;
  room_name: string;
  room_type: string;
  price: string;
}

export default function NewHotelPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get('quote_id');

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    checkin_date: '',
    checkout_date: '',
    guest_count: 1,
    special_requests: ''
  });

  // 단계별 옵션들
  const [hotelNameOptions, setHotelNameOptions] = useState<string[]>([]);
  const [roomNameOptions, setRoomNameOptions] = useState<string[]>([]);
  const [roomTypeOptions, setRoomTypeOptions] = useState<string[]>([]);
  const [filteredHotels, setFilteredHotels] = useState<HotelOption[]>([]);

  // 선택된 값들
  const [selectedHotelName, setSelectedHotelName] = useState('');
  const [selectedRoomName, setSelectedRoomName] = useState('');
  const [selectedRoomType, setSelectedRoomType] = useState('');
  const [selectedHotel, setSelectedHotel] = useState<HotelOption | null>(null);

  // 체크인 날짜가 설정되면 호텔 이름 옵션 로드
  useEffect(() => {
    if (formData.checkin_date && formData.checkout_date) {
      loadHotelNameOptions();
    } else {
      setHotelNameOptions([]);
      resetSelections();
    }
  }, [formData.checkin_date, formData.checkout_date]);

  // 호텔명 선택 시 객실명 옵션 업데이트
  useEffect(() => {
    if (selectedHotelName && formData.checkin_date && formData.checkout_date) {
      loadRoomNameOptions(selectedHotelName);
    } else {
      setRoomNameOptions([]);
      setSelectedRoomName('');
      setSelectedRoomType('');
    }
  }, [selectedHotelName, formData.checkin_date, formData.checkout_date]);

  // 객실명 선택 시 객실 타입 옵션 업데이트
  useEffect(() => {
    if (selectedRoomName && formData.checkin_date && formData.checkout_date) {
      loadRoomTypeOptions(selectedHotelName, selectedRoomName);
    } else {
      setRoomTypeOptions([]);
      setSelectedRoomType('');
    }
  }, [selectedRoomName, selectedHotelName, formData.checkin_date, formData.checkout_date]);

  // 모든 조건이 선택되면 최종 호텔 옵션 검색
  useEffect(() => {
    if (selectedHotelName && selectedRoomName && selectedRoomType && formData.checkin_date && formData.checkout_date) {
      searchFinalHotels();
    } else {
      setFilteredHotels([]);
      setSelectedHotel(null);
    }
  }, [selectedHotelName, selectedRoomName, selectedRoomType, formData.checkin_date, formData.checkout_date]);

  // 요일 계산 함수
  const getWeekdayFromDate = (dateString: string): string => {
    const date = new Date(dateString);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return weekdays[date.getDay()];
  };

  // 날짜 범위와 요일에 맞는 호텔명 로드
  const loadHotelNameOptions = async () => {
    try {
      const checkinWeekday = getWeekdayFromDate(formData.checkin_date);
      console.log('🏨 체크인 요일:', checkinWeekday);

      const { data, error } = await supabase
        .from('hotel_price')
        .select('hotel_name')
        .lte('start_date', formData.checkin_date)
        .gte('end_date', formData.checkout_date)
        .like('weekday_type', `%${checkinWeekday}%`)
        .order('hotel_name');

      if (error) throw error;
      
      // 중복 제거
      const uniqueHotelNames = [...new Set(data.map((item: any) => item.hotel_name).filter(Boolean))] as string[];
      setHotelNameOptions(uniqueHotelNames);
      
      console.log('🏨 필터링된 호텔명 옵션:', uniqueHotelNames);
    } catch (error) {
      console.error('호텔명 옵션 로드 실패:', error);
    }
  };

  // 객실명 옵션 로드
  const loadRoomNameOptions = async (hotelName: string) => {
    try {
      const checkinWeekday = getWeekdayFromDate(formData.checkin_date);

      const { data, error } = await supabase
        .from('hotel_price')
        .select('room_name')
        .eq('hotel_name', hotelName)
        .lte('start_date', formData.checkin_date)
        .gte('end_date', formData.checkout_date)
        .like('weekday_type', `%${checkinWeekday}%`)
        .order('room_name');

      if (error) throw error;
      
      const uniqueRoomNames = [...new Set(data.map((item: any) => item.room_name).filter(Boolean))] as string[];
      setRoomNameOptions(uniqueRoomNames);
      
      console.log('🏨 필터링된 객실명 옵션:', uniqueRoomNames);
    } catch (error) {
      console.error('객실명 옵션 로드 실패:', error);
    }
  };

  // 객실 타입 옵션 로드
  const loadRoomTypeOptions = async (hotelName: string, roomName: string) => {
    try {
      const checkinWeekday = getWeekdayFromDate(formData.checkin_date);

      const { data, error } = await supabase
        .from('hotel_price')
        .select('room_type')
        .eq('hotel_name', hotelName)
        .eq('room_name', roomName)
        .lte('start_date', formData.checkin_date)
        .gte('end_date', formData.checkout_date)
        .like('weekday_type', `%${checkinWeekday}%`)
        .order('room_type');

      if (error) throw error;
      
      const uniqueRoomTypes = [...new Set(data.map((item: any) => item.room_type).filter(Boolean))] as string[];
      setRoomTypeOptions(uniqueRoomTypes);
      
      console.log('🏨 필터링된 객실 타입 옵션:', uniqueRoomTypes);
    } catch (error) {
      console.error('객실 타입 옵션 로드 실패:', error);
    }
  };

  // 최종 호텔 옵션 검색 (호텔 코드 포함)
  const searchFinalHotels = async () => {
    try {
      const checkinWeekday = getWeekdayFromDate(formData.checkin_date);

      const { data, error } = await supabase
        .from('hotel_price')
        .select('hotel_code, hotel_name, room_name, room_type, price')
        .eq('hotel_name', selectedHotelName)
        .eq('room_name', selectedRoomName)
        .eq('room_type', selectedRoomType)
        .lte('start_date', formData.checkin_date)
        .gte('end_date', formData.checkout_date)
        .like('weekday_type', `%${checkinWeekday}%`)
        .order('hotel_code');

      if (error) throw error;
      
      setFilteredHotels(data as HotelOption[]);
      console.log('🏨 최종 필터링된 호텔들:', data);
    } catch (error) {
      console.error('최종 호텔 검색 실패:', error);
      setFilteredHotels([]);
    }
  };

  // 선택 초기화
  const resetSelections = () => {
    setSelectedHotelName('');
    setSelectedRoomName('');
    setSelectedRoomType('');
    setSelectedHotel(null);
    setFilteredHotels([]);
  };

  // 폼 데이터 변경 핸들러
  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 호텔 서비스 저장
  const handleSubmit = async () => {
    // 유효성 검사
    if (!formData.checkin_date || !formData.checkout_date) {
      alert('체크인/체크아웃 날짜를 선택해주세요.');
      return;
    }

    if (!selectedHotel) {
      alert('호텔을 선택해주세요.');
      return;
    }

    if (!quoteId) {
      alert('견적 ID가 없습니다.');
      return;
    }

    setLoading(true);

    try {
      // 호텔 폼 데이터 구성
      const hotelData = {
        hotel_code: selectedHotel.hotel_code,
        special_requests: formData.special_requests || null,
        base_price: 0
      };

      console.log('🏨 호텔 데이터:', hotelData);

      // 1. 호텔 서비스 생성
      const { data: hotelServiceData, error: hotelError } = await supabase
        .from('hotel')
        .insert(hotelData)
        .select()
        .single();

      if (hotelError) {
        console.error('❌ 호텔 서비스 생성 실패:', hotelError);
        throw hotelError;
      }

      console.log('✅ 호텔 서비스 생성 성공:', hotelServiceData);

      // 2. quote_item에 연결
      const quoteItemData = {
        quote_id: quoteId,
        service_type: 'hotel',
        service_ref_id: hotelServiceData.id,
        quantity: 1,
        unit_price: parseInt(selectedHotel.price) || 0,
        total_price: parseInt(selectedHotel.price) || 0
      };

      const { data: itemData, error: itemError } = await supabase
        .from('quote_item')
        .insert(quoteItemData)
        .select()
        .single();

      if (itemError) {
        console.error('❌ Quote item 생성 실패:', itemError);
        throw itemError;
      }

      console.log('✅ Quote item 생성 성공:', itemData);

      alert('호텔 서비스가 성공적으로 추가되었습니다.');
      router.push(`/mypage/quotes/${quoteId}`);

    } catch (error) {
      console.error('❌ 호텔 서비스 저장 실패:', error);
      alert(`호텔 서비스 저장 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper title="호텔 서비스 추가">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* 1단계: 체크인/체크아웃 날짜 */}
        <SectionBox title="1. 투숙 기간">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                체크인 날짜
              </label>
              <input
                type="date"
                value={formData.checkin_date}
                onChange={(e) => handleInputChange('checkin_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {formData.checkin_date && (
                <p className="text-sm text-gray-500 mt-1">
                  요일: {getWeekdayFromDate(formData.checkin_date)}요일
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                체크아웃 날짜
              </label>
              <input
                type="date"
                value={formData.checkout_date}
                onChange={(e) => handleInputChange('checkout_date', e.target.value)}
                min={formData.checkin_date}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </SectionBox>

        {/* 2단계: 호텔명 선택 */}
        {hotelNameOptions.length > 0 && (
          <SectionBox title="2. 호텔 선택">
            <div className="grid grid-cols-1 gap-3">
              {hotelNameOptions.map((hotelName) => (
                <SelectableButton
                  key={hotelName}
                  label={hotelName}
                  value={hotelName}
                  selectedValue={selectedHotelName}
                  onSelect={setSelectedHotelName}
                />
              ))}
            </div>
          </SectionBox>
        )}

        {/* 3단계: 객실명 선택 */}
        {selectedHotelName && roomNameOptions.length > 0 && (
          <SectionBox title="3. 객실 선택">
            <div className="grid grid-cols-2 gap-3">
              {roomNameOptions.map((roomName) => (
                <SelectableButton
                  key={roomName}
                  label={roomName}
                  value={roomName}
                  selectedValue={selectedRoomName}
                  onSelect={setSelectedRoomName}
                />
              ))}
            </div>
          </SectionBox>
        )}

        {/* 4단계: 객실 타입 선택 */}
        {selectedRoomName && roomTypeOptions.length > 0 && (
          <SectionBox title="4. 객실 타입">
            <div className="grid grid-cols-2 gap-3">
              {roomTypeOptions.map((roomType) => (
                <SelectableButton
                  key={roomType}
                  label={roomType}
                  value={roomType}
                  selectedValue={selectedRoomType}
                  onSelect={setSelectedRoomType}
                />
              ))}
            </div>
          </SectionBox>
        )}

        {/* 5단계: 최종 호텔 선택 */}
        {filteredHotels.length > 0 && (
          <SectionBox title="5. 최종 호텔 선택">
            <div className="space-y-3">
              {filteredHotels.map((hotel, index) => (
                <div
                  key={`${hotel.hotel_code}-${index}`}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedHotel?.hotel_code === hotel.hotel_code
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onClick={() => setSelectedHotel(hotel)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{hotel.hotel_name}</h3>
                      <p className="text-sm text-gray-600">
                        {hotel.room_name} - {hotel.room_type}
                      </p>
                      <p className="text-sm text-gray-500">코드: {hotel.hotel_code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">
                        {parseInt(hotel.price || '0').toLocaleString()}원
                      </p>
                      <p className="text-sm text-gray-500">1박 기준</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionBox>
        )}

        {/* 6단계: 추가 정보 */}
        {selectedHotel && (
          <SectionBox title="6. 추가 정보">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  투숙 인원
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.guest_count}
                  onChange={(e) => handleInputChange('guest_count', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  특별 요청사항
                </label>
                <textarea
                  value={formData.special_requests}
                  onChange={(e) => handleInputChange('special_requests', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="특별한 요청사항이 있으시면 입력해주세요."
                />
              </div>
            </div>
          </SectionBox>
        )}

        {/* 선택 요약 */}
        {formData.checkin_date && (
          <SectionBox title="선택 요약">
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div><strong>체크인:</strong> {formData.checkin_date} ({getWeekdayFromDate(formData.checkin_date)}요일)</div>
              <div><strong>체크아웃:</strong> {formData.checkout_date}</div>
              {selectedHotelName && <div><strong>호텔:</strong> {selectedHotelName}</div>}
              {selectedRoomName && <div><strong>객실:</strong> {selectedRoomName}</div>}
              {selectedRoomType && <div><strong>타입:</strong> {selectedRoomType}</div>}
              {selectedHotel && (
                <>
                  <div><strong>호텔 코드:</strong> {selectedHotel.hotel_code}</div>
                  <div><strong>1박 요금:</strong> {parseInt(selectedHotel.price || '0').toLocaleString()}원</div>
                </>
              )}
              <div><strong>투숙 인원:</strong> {formData.guest_count}명</div>
              {formData.special_requests && (
                <div><strong>특별 요청:</strong> {formData.special_requests}</div>
              )}
            </div>
          </SectionBox>
        )}

        {/* 버튼 그룹 */}
        <div className="flex justify-between pt-6">
          <button
            onClick={() => router.back()}
            className="px-6 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={loading}
          >
            취소
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={loading || !selectedHotel}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? '저장 중...' : '호텔 서비스 추가'}
          </button>
        </div>
      </div>
    </PageWrapper>
  );
}

  // 카테고리와 경로가 선택될 때 호텔 타입 목록 업데이트
  useEffect(() => {
    if (selectedCategory && selectedRoute) {
      loadHotelTypeOptions(selectedCategory, selectedRoute);
    } else {
      setHotelTypeOptions([]);
      setSelectedHotelType('');
    }
  }, [selectedCategory, selectedRoute]);

  // 모든 조건이 선택되면 호텔 코드 조회
  useEffect(() => {
    if (selectedCategory && selectedRoute && selectedHotelType) {
      getHotelCodeFromConditions(selectedCategory, selectedRoute, selectedHotelType)
        .then(code => setSelectedHotelCode(code))
        .catch(() => setSelectedHotelCode(''));
    } else {
      setSelectedHotelCode('');
    }
  }, [selectedCategory, selectedRoute, selectedHotelType]);

  const loadCategoryOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('hotel_price')
        .select('hotel_category')
        .order('hotel_category');

      if (error) throw error;
      
      // 중복 제거
      const uniqueCategories = [...new Set(data.map((item: any) => item.hotel_category).filter(Boolean))] as string[];
      setCategoryOptions(uniqueCategories);
    } catch (error) {
      console.error('호텔 카테고리 로드 실패:', error);
    }
  };

  const loadRouteOptions = async (category: string) => {
    try {
      const { data, error } = await supabase
        .from('hotel_price')
        .select('hotel_route')
        .eq('hotel_category', category)
        .order('hotel_route');

      if (error) throw error;
      
      // 중복 제거
      const uniqueRoutes = [...new Set(data.map((item: any) => item.hotel_route).filter(Boolean))] as string[];
      setRouteOptions(uniqueRoutes);
    } catch (error) {
      console.error('호텔 경로 옵션 로드 실패:', error);
    }
  };

  const loadHotelTypeOptions = async (category: string, route: string) => {
    try {
      const { data, error } = await supabase
        .from('hotel_price')
        .select('hotel_type')
        .eq('hotel_category', category)
        .eq('hotel_route', route)
        .order('hotel_type');

      if (error) throw error;
      
      // 중복 제거
      const uniqueHotelTypes = [...new Set(data.map((item: any) => item.hotel_type).filter(Boolean))] as string[];
      setHotelTypeOptions(uniqueHotelTypes);
    } catch (error) {
      console.error('호텔 타입 옵션 로드 실패:', error);
    }
  };

  const loadQuote = async () => {
    if (!quoteId) return;
    
    try {
      const { data, error } = await supabase
        .from('quote')
        .select('*')
        .eq('id', quoteId)
        .single();
      
      if (error) throw error;
      setQuote(data);
    } catch (error) {
      console.error('견적 정보 로드 실패:', error);
      alert('견적 정보를 불러올 수 없습니다.');
      router.push('/mypage/quotes');
    }
  };

  // 3가지 조건으로 hotel_code 조회
  const getHotelCodeFromConditions = async (category: string, route: string, hotelType: string) => {
    try {
      const { data, error } = await supabase
        .from('hotel_price')
        .select('hotel_code')
        .eq('hotel_category', category)
        .eq('hotel_route', route)
        .eq('hotel_type', hotelType)
        .single();

      if (error) throw error;
      return data.hotel_code;
    } catch (error) {
      console.error('hotel_code 조회 실패:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCategory || !selectedRoute || !selectedHotelType) {
      alert('모든 필수 항목을 선택해주세요.');
      return;
    }

    if (!quoteId) {
      alert('견적 ID가 없습니다.');
      return;
    }

    setLoading(true);

    try {
      // 3가지 조건으로 hotel_code 조회
      const hotelCode = await getHotelCodeFromConditions(
        selectedCategory, 
        selectedRoute, 
        selectedHotelType
      );

      // 호텔 폼 데이터 구성 - 필수 필드만 포함
      const hotelData = {
        hotel_code: hotelCode,
        ...(formData.special_requests && { special_requests: formData.special_requests })
      };

      console.log('🏨 호텔 데이터:', hotelData);

      // 1. 호텔 서비스 생성
      const { data: hotelServiceData, error: hotelError } = await supabase
        .from('hotel')
        .insert([hotelData])
        .select()
        .single();

      if (hotelError) {
        console.error('❌ 호텔 서비스 생성 오류:', hotelError);
        alert(`호텔 서비스 생성 실패: ${hotelError.message}`);
        return;
      }

      console.log('✅ 호텔 서비스 생성 성공:', hotelServiceData);

      // 2. 견적 아이템 생성
      const { data: itemData, error: itemError } = await supabase
        .from('quote_item')
        .insert({
          quote_id: quoteId,
          service_type: 'hotel',
          service_ref_id: hotelServiceData.id,
          quantity: 1,
          unit_price: 0,
          total_price: 0
        })
        .select()
        .single();

      if (itemError) {
        console.error('❌ 견적 아이템 생성 오류:', itemError);
        alert(`견적 아이템 생성 실패: ${itemError.message}`);
        return;
      }

      console.log('✅ 견적 아이템 생성 성공:', itemData);

      alert('호텔 서비스가 견적에 추가되었습니다!');
      router.push(`/mypage/quotes/${quoteId}/view`);

    } catch (error) {
      console.error('❌ 호텔 견적 추가 중 오류:', error);
      alert('오류가 발생했습니다: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = selectedCategory && selectedRoute && selectedHotelType;

  if (!quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">견적 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-pink-200 via-purple-200 to-violet-100 text-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">🏨 호텔 서비스 견적 신청</h1>
              <p className="text-lg opacity-90">
                숙박 서비스를 위한 견적을 작성해주세요.
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← 뒤로가기
            </button>
          </div>
          
          {/* 견적 정보 */}
          <div className="bg-white/70 backdrop-blur rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">현재 견적 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>견적명: <span className="font-semibold text-purple-600">{quote.title}</span></div>
              <div>상태: {quote.status === 'draft' ? '작성 중' : quote.status}</div>
              <div>작성일: {new Date(quote.created_at).toLocaleDateString('ko-KR')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 폼 */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">호텔 서비스 정보 입력</h2>
            
            {/* 호텔 안내 카드 */}
            <div className="bg-purple-600 rounded-lg p-6 mb-6 border border-purple-700">
              <h3 className="text-white text-lg font-semibold mb-2">🏨 견적안내</h3>
              <p className="text-white/90 text-sm">호텔 숙박 서비스 예약을 위해 아래 정보를 입력해 주세요.<br/>정확한 호텔 정보와 체크인/체크아웃 날짜를 입력하시면 빠른 견적 안내가 가능합니다.</p>
            </div>

            {/* 호텔 서비스 선택 폼 */}
            <div className="space-y-6">
              {/* 1단계: 카테고리 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📋 호텔 카테고리 *
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">카테고리를 선택하세요</option>
                  {categoryOptions.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* 2단계: 경로 선택 */}
              {selectedCategory && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    �️ 호텔 경로 *
                  </label>
                  <select
                    value={selectedRoute}
                    onChange={(e) => setSelectedRoute(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  >
                    <option value="">경로를 선택하세요</option>
                    {routeOptions.map(route => (
                      <option key={route} value={route}>{route}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 3단계: 호텔 타입 선택 */}
              {selectedCategory && selectedRoute && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    � 호텔 타입 *
                  </label>
                  <select
                    value={selectedHotelType}
                    onChange={(e) => setSelectedHotelType(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  >
                    <option value="">호텔 타입을 선택하세요</option>
                    {hotelTypeOptions.map(hotelType => (
                      <option key={hotelType} value={hotelType}>{hotelType}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 특별 요청사항 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📝 특별 요청사항
                </label>
                <textarea
                  value={formData.special_requests}
                  onChange={(e) => setFormData({...formData, special_requests: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={4}
                  placeholder="금연실, 고층/저층 요청, 조식 포함, 기타 요청사항 등을 입력해주세요"
                />
              </div>

              {/* 선택 요약 */}
              {isFormValid && (
                <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-800 mb-3">✅ 선택 요약</h3>
                  <div className="text-green-700 space-y-2">
                    <div><strong>카테고리:</strong> {selectedCategory}</div>
                    <div><strong>경로:</strong> {selectedRoute}</div>
                    <div><strong>호텔 타입:</strong> {selectedHotelType}</div>
                    {selectedHotelCode && (
                      <div><strong>호텔 코드:</strong> <span className="font-mono text-blue-600">{selectedHotelCode}</span></div>
                    )}
                    {formData.special_requests && <div><strong>특별 요청:</strong> {formData.special_requests}</div>}
                  </div>
                </div>
              )}
            </div>

            {/* 제출 버튼 */}
            <div className="flex justify-center space-x-4 pt-6 mt-8">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={!isFormValid || loading}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '처리 중...' : '견적에 추가'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
