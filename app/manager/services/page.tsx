'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import ManagerHeader from '@/components/ManagerHeader';
import ManagerNav from '@/components/ManagerNav';

export default function ServiceManagement() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cruises'); // cruises, schedules, rooms, cars
  const [cruises, setCruises] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // add, edit
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, activeTab]);

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

  const loadData = async () => {
    try {
      console.log('🔍 서비스 데이터 로딩:', activeTab);

      switch (activeTab) {
        case 'rooms':
          const { data: roomPriceData, error: roomError } = await supabase
            .from('room_price')
            .select('*')
            .order('room_code')
            .limit(20);

          if (roomError) {
            console.error('객실 가격 데이터 로드 실패:', roomError);
            setRooms([]);
          } else {
            // room_price 데이터를 room_info 형태로 변환
            const roomInfoData = roomPriceData?.map((item: any) => ({
              code: item.room_code,
              name: item.room_type || item.room_code,
              description: `${item.cruise || ''} ${item.room_category || ''}`.trim(),
              price: item.price
            })) || [];
            setRooms(roomInfoData);
          }
          break;

        case 'cars':
          const { data: carPriceData, error: carError } = await supabase
            .from('car_price')
            .select('*')
            .order('car_code')
            .limit(20);

          if (carError) {
            console.error('차량 가격 데이터 로드 실패:', carError);
            setCars([]);
          } else {
            // car_price 데이터를 car_info 형태로 변환
            const carInfoData = carPriceData?.map((item: any) => ({
              code: item.car_code,
              name: item.car_type || item.car_code,
              description: `${item.cruise || ''} ${item.car_category || ''}`.trim(),
              price: item.price
            })) || [];
            setCars(carInfoData);
          }
          break;

        case 'cruises':
          // cruise 테이블의 실제 데이터 조회
          const { data: cruiseData, error: cruiseError } = await supabase
            .from('cruise')
            .select('cruise_code, cruise_name, schedule_code')
            .order('cruise_name')
            .limit(20);

          if (cruiseError) {
            console.error('크루즈 데이터 로드 실패:', cruiseError);
            setCruises([]);
          } else {
            // cruise 데이터를 cruise_info 형태로 변환
            const cruiseInfoData = cruiseData?.map((item: any) => ({
              code: item.cruise_code,
              name: item.cruise_name || item.cruise_code,
              description: `일정: ${item.schedule_code || 'N/A'}`,
              capacity: 100 // 기본값
            })) || [];
            setCruises(cruiseInfoData);
          }
          break;

        case 'schedules':
          // 임시 스케줄 데이터 (실제 테이블이 없으므로)
          setSchedules([
            { code: 'SCH001', name: '3박4일 제주 크루즈', description: '제주도 일주 크루즈' },
            { code: 'SCH002', name: '4박5일 부산 크루즈', description: '부산 출발 일본 크루즈' }
          ]);
          break;
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    }
  };

  const openModal = (type: string, item?: any) => {
    setModalType(type);
    setSelectedItem(item || null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setSelectedItem(null);
  };

  const saveItem = async (formData: any) => {
    try {
      const table = {
        cruises: 'cruise_info',
        schedules: 'schedule_info',
        rooms: 'room_info',
        cars: 'car_info'
      }[activeTab];

      if (modalType === 'add') {
        const { error } = await supabase
          .from(table!)
          .insert(formData);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(table!)
          .update(formData)
          .eq('code', selectedItem.code);
        if (error) throw error;
      }

      alert('저장되었습니다.');
      loadData();
      closeModal();
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장에 실패했습니다.');
    }
  };

  const deleteItem = async (code: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const table = {
        cruises: 'cruise_info',
        schedules: 'schedule_info',
        rooms: 'room_info',
        cars: 'car_info'
      }[activeTab];

      const { error } = await supabase
        .from(table!)
        .delete()
        .eq('code', code);

      if (error) throw error;

      alert('삭제되었습니다.');
      loadData();
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const renderTable = () => {
    let data: any[] = [];
    let columns: string[] = [];

    switch (activeTab) {
      case 'cruises':
        data = cruises;
        columns = ['코드', '크루즈명', '설명', '운영'];
        break;
      case 'schedules':
        data = schedules;
        columns = ['코드', '일정명', '설명', '운영'];
        break;
      case 'rooms':
        data = rooms;
        columns = ['코드', '객실명', '설명', '운영'];
        break;
      case 'cars':
        data = cars;
        columns = ['코드', '차량명', '설명', '운영'];
        break;
    }

    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {activeTab === 'cruises' && '크루즈 관리'}
              {activeTab === 'schedules' && '일정 관리'}
              {activeTab === 'rooms' && '객실 관리'}
              {activeTab === 'cars' && '차량 관리'}
            </h3>
            <button
              onClick={() => openModal('add')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              추가
            </button>
          </div>

          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-4 text-center text-gray-500">
                      데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  data.map((item) => (
                    <tr key={item.code}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openModal('edit', item)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => deleteItem(item.code)}
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
                {modalType === 'add' ? '추가' : '수정'}
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
                saveItem(data);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">코드</label>
                <input
                  type="text"
                  name="code"
                  defaultValue={selectedItem?.code || ''}
                  disabled={modalType === 'edit'}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">이름</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={selectedItem?.name || ''}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">설명</label>
                <textarea
                  name="description"
                  defaultValue={selectedItem?.description || ''}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
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
      <ManagerHeader title="🛠️ 서비스 관리" user={user} />
      <ManagerNav activeTab="services" />

      {/* 탭 메뉴 - sticky로 고정 */}
      <div className="sticky top-16 z-40 bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 py-4">
            {[
              { key: 'cruises', label: '크루즈', icon: '🚢' },
              { key: 'schedules', label: '일정', icon: '📅' },
              { key: 'rooms', label: '객실', icon: '🛏️' },
              { key: 'cars', label: '차량', icon: '🚗' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`${activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* 메인 컨텐츠 영역 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 서비스 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">크루즈</div>
            <div className="text-2xl font-bold text-blue-600">{cruises.length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">일정</div>
            <div className="text-2xl font-bold text-green-600">{schedules.length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">객실</div>
            <div className="text-2xl font-bold text-purple-600">{rooms.length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">차량</div>
            <div className="text-2xl font-bold text-red-600">{cars.length}</div>
          </div>
        </div>

        {/* 테이블 */}
        {renderTable()}
      </div>

      {/* 모달 */}
      {renderModal()}
    </div>
  );
}
