'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

export default function PricingManagement() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('room'); // room, car, hotel, tour
  const [roomPrices, setRoomPrices] = useState<any[]>([]);
  const [carPrices, setCarPrices] = useState<any[]>([]);
  const [hotelPrices, setHotelPrices] = useState<any[]>([]);
  const [tourPrices, setTourPrices] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [cruises, setCruises] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [tours, setTours] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // add, edit
  const [selectedPrice, setSelectedPrice] = useState<any>(null);
  const [filter, setFilter] = useState({
    schedule: '',
    cruise: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadBasicData();
      loadPrices();
    }
  }, [user, activeTab, filter]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!userData || (userData.role !== 'manager' && userData.role !== 'admin')) {
        alert('매니저 권한이 필요합니다.');
        router.push('/');
        return;
      }

      setUser(session.user);
    } catch (error) {
      console.error('인증 오류:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadBasicData = async () => {
    try {
      const [
        { data: scheduleData },
        { data: cruiseData },
        { data: roomData },
        { data: carData },
        { data: hotelData },
        { data: tourData },
        { data: paymentData }
      ] = await Promise.all([
        supabase.from('schedule_info').select('*').order('name'),
        supabase.from('cruise_info').select('*').order('name'),
        supabase.from('room_info').select('*').order('name'),
        supabase.from('car_info').select('*').order('name'),
        supabase.from('hotel_info').select('*').order('name'),
        supabase.from('tour_info').select('*').order('name'),
        supabase.from('payment_info').select('*').order('name')
      ]);

      setSchedules(scheduleData || []);
      setCruises(cruiseData || []);
      setRooms(roomData || []);
      setCars(carData || []);
      setHotels(hotelData || []);
      setTours(tourData || []);
      setPayments(paymentData || []);
    } catch (error) {
      console.error('기본 데이터 로드 실패:', error);
      // 데모 데이터 설정
      setHotels([
        { code: 'H001', name: '하노이 힐튼', location: '하노이 시내', star_rating: 5 },
        { code: 'H002', name: '롯데 호텔 하노이', location: '하노이 시내', star_rating: 5 },
        { code: 'H003', name: '하롱베이 리조트', location: '하롱베이', star_rating: 4 }
      ]);
      setTours([
        { code: 'T001', name: '하노이 시내 관광', type: 'city', duration: 'half' },
        { code: 'T002', name: '하롱베이 선셋 크루즈', type: 'nature', duration: 'half' },
        { code: 'T003', name: '사파 트래킹 투어', type: 'adventure', duration: 'multi' }
      ]);
    }
  };

  const loadPrices = async () => {
    try {
      console.log('💰 가격 데이터 로딩:', activeTab);

      if (activeTab === 'room') {
        // 객실 가격 조회
        const { data } = await supabase
          .from('room_price_code')
          .select(`
            *,
            room_info:room_code(name, description)
          `)
          .order('start_date', { ascending: false });

        setRoomPrices(data || []);
      } else if (activeTab === 'car') {
        // 차량 가격 조회
        const { data } = await supabase
          .from('car_price_code')
          .select(`
            *,
            car_info:car_code(name, description)
          `)
          .order('start_date', { ascending: false });

        setCarPrices(data || []);
      } else if (activeTab === 'hotel') {
        // 호텔 가격 조회 (새로 추가)
        const { data } = await supabase
          .from('hotel_price_code')
          .select(`
            *,
            hotel_info:hotel_code(name, location, star_rating)
          `)
          .order('start_date', { ascending: false });

        setHotelPrices(data || [
          {
            id: 'hp1',
            hotel_code: 'H001',
            room_type: 'standard',
            price: 150000,
            start_date: '2025-01-01',
            end_date: '2025-03-31',
            hotel_info: { name: '하노이 힐튼', location: '하노이 시내', star_rating: 5 }
          },
          {
            id: 'hp2',
            hotel_code: 'H002',
            room_type: 'deluxe',
            price: 200000,
            start_date: '2025-01-01',
            end_date: '2025-03-31',
            hotel_info: { name: '롯데 호텔 하노이', location: '하노이 시내', star_rating: 5 }
          }
        ]);
      } else if (activeTab === 'tour') {
        // 투어 가격 조회 (새로 추가)
        const { data } = await supabase
          .from('tour_price_code')
          .select(`
            *,
            tour_info:tour_code(name, type, duration)
          `)
          .order('start_date', { ascending: false });

        setTourPrices(data || [
          {
            id: 'tp1',
            tour_code: 'T001',
            participant_type: 'adult',
            price: 80000,
            start_date: '2025-01-01',
            end_date: '2025-03-31',
            tour_info: { name: '하노이 시내 관광', type: 'city', duration: 'half' }
          },
          {
            id: 'tp2',
            tour_code: 'T002',
            participant_type: 'adult',
            price: 120000,
            start_date: '2025-01-01',
            end_date: '2025-03-31',
            tour_info: { name: '하롱베이 선셋 크루즈', type: 'nature', duration: 'half' }
          }
        ]);
      }
    } catch (error) {
      console.error('가격 로드 실패:', error);
      // 데모 데이터 설정
      if (activeTab === 'room') {
        setRoomPrices([
          {
            id: 'rp1',
            room_code: 'R001',
            category: 'adult',
            price: 250000,
            start_date: '2025-01-01',
            end_date: '2025-03-31',
            room_info: { name: '스탠다드 룸', description: '기본 객실' }
          }
        ]);
      } else if (activeTab === 'car') {
        setCarPrices([
          {
            id: 'cp1',
            car_code: 'C001',
            price: 50000,
            start_date: '2025-01-01',
            end_date: '2025-03-31',
            car_info: { name: '세단', description: '4인승 세단' }
          }
        ]);
      }
    }
  };

  const openModal = (type: string, price?: any) => {
    setModalType(type);
    setSelectedPrice(price || null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setSelectedPrice(null);
  };

  const savePrice = async (formData: any) => {
    try {
      let table = '';
      switch (activeTab) {
        case 'room': table = 'room_price_code'; break;
        case 'car': table = 'car_price_code'; break;
        case 'hotel': table = 'hotel_price_code'; break;
        case 'tour': table = 'tour_price_code'; break;
        default: table = 'room_price_code';
      }
      
      if (modalType === 'add') {
        const { error } = await supabase
          .from(table)
          .insert(formData);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(table)
          .update(formData)
          .eq('id', selectedPrice.id);
        if (error) throw error;
      }

      alert('저장되었습니다.');
      loadPrices();
      closeModal();
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장에 실패했습니다. (데모 모드)');
      loadPrices(); // 데모 데이터 새로고침
      closeModal();
    }
  };

  const deletePrice = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const table = activeTab === 'room' ? 'room_price' : 'car_price';
      
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('삭제되었습니다.');
      loadPrices();
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const duplicatePriceRange = async (priceData: any) => {
    try {
      const table = activeTab === 'room' ? 'room_price' : 'car_price';
      const { id, created_at, updated_at, ...copyData } = priceData;
      
      // 새로운 날짜 범위로 복사
      const newStartDate = prompt('새 시작일을 입력하세요 (YYYY-MM-DD):', copyData.start_date);
      const newEndDate = prompt('새 종료일을 입력하세요 (YYYY-MM-DD):', copyData.end_date);
      
      if (!newStartDate || !newEndDate) return;

      const newData = {
        ...copyData,
        start_date: newStartDate,
        end_date: newEndDate
      };

      const { error } = await supabase
        .from(table)
        .insert(newData);

      if (error) throw error;

      alert('가격 정보가 복사되었습니다.');
      loadPrices();
    } catch (error) {
      console.error('복사 실패:', error);
      alert('복사에 실패했습니다.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const renderPriceTable = () => {
    let data: any[] = [];
    let title = '';
    
    switch (activeTab) {
      case 'room':
        data = roomPrices;
        title = '객실 가격 관리';
        break;
      case 'car':
        data = carPrices;
        title = '차량 가격 관리';
        break;
      case 'hotel':
        data = hotelPrices;
        title = '호텔 가격 관리';
        break;
      case 'tour':
        data = tourPrices;
        title = '투어 가격 관리';
        break;
      default:
        data = roomPrices;
        title = '객실 가격 관리';
    }
    
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {title}
            </h3>
            <button
              onClick={() => openModal('add')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              가격 추가
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {(activeTab === 'room' || activeTab === 'car') && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        일정
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        크루즈
                      </th>
                    </>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {activeTab === 'room' && '객실'}
                    {activeTab === 'car' && '차량'}
                    {activeTab === 'hotel' && '호텔'}
                    {activeTab === 'tour' && '투어'}
                  </th>
                  {activeTab === 'hotel' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      객실타입
                    </th>
                  )}
                  {activeTab === 'tour' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      참가자타입
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    기간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    가격
                  </th>
                  {activeTab === 'room' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      결제방식
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    운영
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      가격 정보가 없습니다.
                    </td>
                  </tr>
                ) : (
                  data.map((price) => (
                    <tr key={price.id}>
                      {(activeTab === 'room' || activeTab === 'car') && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {price.schedule_info?.name || price.schedule_code || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {price.cruise_info?.name || price.cruise_code || '-'}
                          </td>
                        </>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {activeTab === 'room' && (price.room_info?.name || price.room_code)}
                        {activeTab === 'car' && (price.car_info?.name || price.car_code)}
                        {activeTab === 'hotel' && (price.hotel_info?.name || price.hotel_code)}
                        {activeTab === 'tour' && (price.tour_info?.name || price.tour_code)}
                      </td>
                      {activeTab === 'hotel' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {price.room_type || '스탠다드'}
                        </td>
                      )}
                      {activeTab === 'tour' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {price.participant_type || '성인'}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {price.start_date} ~ {price.end_date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(price.price)}
                      </td>
                      {activeTab === 'room' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {price.payment_info?.name || price.payment_code || '-'}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openModal('edit', price)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => duplicatePriceRange(price)}
                            className="text-green-600 hover:text-green-900"
                          >
                            복사
                          </button>
                          <button
                            onClick={() => deletePrice(price.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderModal = () => {
    if (!showModal) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {modalType === 'add' ? '가격 추가' : '가격 수정'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const data = Object.fromEntries(formData.entries());
                data.price = parseFloat(data.price as string);
                savePrice(data);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">일정</label>
                <select
                  name="schedule_code"
                  defaultValue={selectedPrice?.schedule_code || ''}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="">선택하세요</option>
                  {schedules.map(schedule => (
                    <option key={schedule.code} value={schedule.code}>
                      {schedule.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">크루즈</label>
                <select
                  name="cruise_code"
                  defaultValue={selectedPrice?.cruise_code || ''}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="">선택하세요</option>
                  {cruises.map(cruise => (
                    <option key={cruise.code} value={cruise.code}>
                      {cruise.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {activeTab === 'room' ? '객실' : '차량'}
                </label>
                <select
                  name={activeTab === 'room' ? 'room_code' : 'car_code'}
                  defaultValue={selectedPrice?.[activeTab === 'room' ? 'room_code' : 'car_code'] || ''}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="">선택하세요</option>
                  {(activeTab === 'room' ? rooms : cars).map(item => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              {activeTab === 'room' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">결제방식</label>
                  <select
                    name="payment_code"
                    defaultValue={selectedPrice?.payment_code || ''}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="">선택하세요</option>
                    {payments.map(payment => (
                      <option key={payment.code} value={payment.code}>
                        {payment.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">시작일</label>
                  <input
                    type="date"
                    name="start_date"
                    defaultValue={selectedPrice?.start_date || ''}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">종료일</label>
                  <input
                    type="date"
                    name="end_date"
                    defaultValue={selectedPrice?.end_date || ''}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">가격 (원)</label>
                <input
                  type="number"
                  name="price"
                  defaultValue={selectedPrice?.price || ''}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-lg text-gray-600">로딩 중...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">💰 가격 관리</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">매니저: {user?.email}</div>
              <button
                onClick={() => router.push('/manager/dashboard')}
                className="p-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                title="대시보드로 이동"
              >
                �
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 탭 메뉴 */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('room')}
              className={`${
                activeTab === 'room'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <span>🛏️</span>
              <span>객실 가격</span>
            </button>
            <button
              onClick={() => setActiveTab('car')}
              className={`${
                activeTab === 'car'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <span>🚗</span>
              <span>차량 가격</span>
            </button>
            <button
              onClick={() => setActiveTab('hotel')}
              className={`${
                activeTab === 'hotel'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <span>🏨</span>
              <span>호텔 가격</span>
            </button>
            <button
              onClick={() => setActiveTab('tour')}
              className={`${
                activeTab === 'tour'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <span>🗺️</span>
              <span>투어 가격</span>
            </button>
          </nav>
        </div>

        {/* 필터 */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={filter.schedule}
            onChange={(e) => setFilter({ ...filter, schedule: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">전체 일정</option>
            {schedules.map(schedule => (
              <option key={schedule.code} value={schedule.code}>
                {schedule.name}
              </option>
            ))}
          </select>
          
          <select
            value={filter.cruise}
            onChange={(e) => setFilter({ ...filter, cruise: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">전체 크루즈</option>
            {cruises.map(cruise => (
              <option key={cruise.code} value={cruise.code}>
                {cruise.name}
              </option>
            ))}
          </select>
          
          <input
            type="date"
            value={filter.startDate}
            onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="시작일"
          />
          
          <input
            type="date"
            value={filter.endDate}
            onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="종료일"
          />
        </div>

        {/* 가격 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">
              {activeTab === 'room' ? '객실 가격 설정' : '차량 가격 설정'}
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {activeTab === 'room' ? roomPrices.length : carPrices.length}건
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">평균 가격</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(
                (activeTab === 'room' ? roomPrices : carPrices).reduce((sum, price) => sum + price.price, 0) /
                Math.max((activeTab === 'room' ? roomPrices : carPrices).length, 1)
              )}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">최고 가격</div>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(
                Math.max(...(activeTab === 'room' ? roomPrices : carPrices).map(price => price.price), 0)
              )}
            </div>
          </div>
        </div>

        {/* 가격 테이블 */}
        {renderPriceTable()}
      </div>

      {/* 모달 */}
      {renderModal()}
    </div>
  );
}
