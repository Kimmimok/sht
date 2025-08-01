'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';


export default function RentCarPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  // quote_rentcar 테이블 컬럼에 맞춘 폼 구조
  const [form, setForm] = useState({
    rc_category_code: '', // 구분 (rc_category)는 별도 처리
    rc_type_code: '',     // 분류 (rc_vehicle_type)는 별도 처리  
    rc_route_code: '',    // 경로 (rc_route)는 별도 처리
    rc_car_code: '',      // 차량종류
    rc_car_count: 1,
    rc_boarding_date: '',
    rc_boarding_time: '',
    rc_pickup_location: '',
    rc_carrier_count: 0,
    rc_dropoff_location: '',
    rc_via_location: '',
    rc_passenger_count: 1,
    rc_usage_period: 1
  });

  // 드롭다운 옵션 데이터 - 렌트카 가격 테이블에서 가져오기
  // 구분 옵션: [{ code, name }]
  const [categoryOptions, setCategoryOptions] = useState<{ code: string; name: string }[]>([]);
  // 분류, 경로, 차량종류 옵션: [{ code, name }]
  const [typeOptions, setTypeOptions] = useState<{ code: string; name: string }[]>([]);
  const [routeOptions, setRouteOptions] = useState<{ code: string; name: string }[]>([]);
  const [carOptions, setCarOptions] = useState<{ code: string; name: string }[]>([]);

  // 초기 데이터 로드 - 구분(rc_category_code, name) 옵션
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // rentcar_category 테이블에서 code, name 컬럼 조회
        const { data: categories } = await supabase
          .from('rentcar_category')
          .select('code, name')
          .not('code', 'is', null);
        // 중복 제거 (code 기준)
        const uniqueCategories = Array.from(
          new Map((categories || []).map((c: any) => [c.code, { code: c.code, name: c.name }])).values()
        );
        setCategoryOptions(uniqueCategories as { code: string; name: string }[]);
      } catch (error) {
          // ...
        setCategoryOptions([]);
      }
    };
    loadInitialData();
  }, []);

  // 분류 옵션: rentcar_price에서 구분별 rc_type_code 조회 후, rentcar_type 테이블에서 이름 가져오기
  useEffect(() => {
    const loadTypeOptions = async () => {
      if (!form.rc_category_code) {
        setTypeOptions([]);
        return;
      }
      try {
        // 1. rentcar_price에서 구분별 rc_type_code 목록 조회
        const { data: priceData, error: priceError } = await supabase
          .from('rentcar_price')
        let typeError = priceError;
        let typeData = priceData;
          {/* 렌트카 서비스 카드들 - 원래 스타일로 복동 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white/80 backdrop-blur rounded-lg p-4 hover:bg-white/90 transition-colors">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">🚙</span>
                <h3 className="font-semibold text-gray-800">프리미엄 차량</h3>
              </div>
              <p className="text-sm text-gray-600">최신 모델의 고급 차량으로 편안한 여행을</p>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-lg p-4 hover:bg-white/90 transition-colors">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">🗺️</span>
                <h3 className="font-semibold text-gray-800">맞춤 경로</h3>
              </div>
              <p className="text-sm text-gray-600">원하는 목적지까지 최적의 경로 제공</p>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-lg p-4 hover:bg-white/90 transition-colors">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">⭐</span>
                <h3 className="font-semibold text-gray-800">전문 기사</h3>
              </div>
              <p className="text-sm text-gray-600">숙련된 전문 기사가 안전하게 모시겠습니다</p>
            </div>
          </div>
        if (typeError) {
          setTypeOptions([]);
          return;
        }
        setTypeOptions((typeData || []).map((t: any) => ({ code: t.code, name: t.name })));
      } catch (error) {
        // ...
        setTypeOptions([]);
      }
    };
    loadTypeOptions();
    setForm(prev => ({ ...prev, rc_type_code: '', rc_route_code: '', rc_car_code: '' }));
  }, [form.rc_category_code]);

  // 경로 옵션: rentcar_price에서 구분+분류별 rc_route_code 조회 후, route_info 테이블에서 이름 가져오기
  useEffect(() => {
    const loadRouteOptions = async () => {
      if (!form.rc_category_code || !form.rc_type_code) {
        setRouteOptions([]);
        return;
      }
      try {
        // 1. rentcar_price에서 구분+분류별 rc_route_code 목록 조회
        const { data: priceData, error: priceError } = await supabase
          .from('rentcar_price')
          .select('rc_route_code')
          .eq('rc_category_code', form.rc_category_code)
          .eq('rc_type_code', form.rc_type_code)
          .not('rc_route_code', 'is', null);
        
        if (priceError) {
          // ...
          setRouteOptions([]);
          return;
        }

        // 2. 중복 제거된 rc_route_code 목록
        const uniqueRouteCodes = [...new Set((priceData || []).map((d: any) => d.rc_route_code))];
        
        if (uniqueRouteCodes.length === 0) {
          setRouteOptions([]);
          return;
        }

        // 3. route_info 테이블에서 해당 코드들의 이름 조회
        const { data: routeData, error: routeError } = await supabase
          .from('route_info')
          .select('code, name')
          .in('code', uniqueRouteCodes);

        if (routeError) {
          // ...
          setRouteOptions([]);
          return;
        }

        setRouteOptions((routeData || []).map((r: any) => ({ code: r.code, name: r.name })));
      } catch (error) {
        // ...
        setRouteOptions([]);
      }
    };
    loadRouteOptions();
    setForm(prev => ({ ...prev, rc_route_code: '', rc_car_code: '' }));
  }, [form.rc_category_code, form.rc_type_code]);

  // 차량종류 옵션: rentcar_price에서 구분+분류+경로별 rc_car_code 조회 후, car_info 테이블에서 이름 가져오기
  useEffect(() => {
    const loadCarOptions = async () => {
      if (!form.rc_category_code || !form.rc_type_code || !form.rc_route_code) {
        setCarOptions([]);
        return;
      }
      try {
        // 1. rentcar_price에서 구분+분류+경로별 rc_car_code 목록 조회
        const { data: priceData, error: priceError } = await supabase
          .from('rentcar_price')
          .select('rc_car_code')
          .eq('rc_category_code', form.rc_category_code)
          .eq('rc_type_code', form.rc_type_code)
          .eq('rc_route_code', form.rc_route_code)
          .not('rc_car_code', 'is', null);
        
        if (priceError) {
          // ...
          setCarOptions([]);
          return;
        }

        // 2. 중복 제거된 rc_car_code 목록
        const uniqueCarCodes = [...new Set((priceData || []).map((d: any) => d.rc_car_code))];
        
        if (uniqueCarCodes.length === 0) {
          setCarOptions([]);
          return;
        }

        // 3. car_info 테이블에서 해당 코드들의 이름 조회
        const { data: carData, error: carError } = await supabase
          .from('car_info')
          .select('code, name')
          .in('code', uniqueCarCodes);

        if (carError) {
          // ...
          setCarOptions([]);
          return;
        }

        setCarOptions((carData || []).map((c: any) => ({ code: c.code, name: c.name })));
      } catch (error) {
        // ...
        setCarOptions([]);
      }
    };
    loadCarOptions();
  }, [form.rc_category_code, form.rc_type_code, form.rc_route_code]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }: any) => {
      if (!user) {
        alert('로그인이 필요합니다.');
        router.push('/login');
      } else {
        setUser(user);
      }
    });
  }, [router]);

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. 먼저 quote 테이블에 기본 견적 정보 저장
      const { data: quoteData, error: quoteError } = await supabase
        .from('quote')
        .insert({ 
          user_id: user.id,
          quote_type: 'rentcar',
          checkin: form.rc_boarding_date
        })
        .select('id')
        .single();
      
      if (quoteError) {
        alert('견적 저장 실패: ' + quoteError.message);
        return;
      }

      // 2. quote_rentcar 테이블에 렌트카 상세 정보 저장
      const { error: rentcarError } = await supabase
        .from('quote_rentcar')
        .insert({
          quote_id: quoteData.id,
          rc_car_code: form.rc_car_code,
          rc_category: form.rc_category_code, // rc_category 컬럼에 저장
          rc_car_category_code: form.rc_category_code, // rc_car_category_code 컬럼에도 저장
          rc_route: form.rc_route_code, // rc_route 컬럼에 저장
          rc_vehicle_type: form.rc_type_code, // rc_vehicle_type 컬럼에 저장
          rc_car_count: form.rc_car_count,
          rc_boarding_date: form.rc_boarding_date, // 날짜 저장
          rc_boarding_time: form.rc_boarding_time, // 시간 저장
          rc_pickup_location: form.rc_pickup_location,
          rc_carrier_count: form.rc_carrier_count,
          rc_dropoff_location: form.rc_dropoff_location,
          rc_via_location: form.rc_via_location,
          rc_passenger_count: form.rc_passenger_count,
          rc_usage_period: form.rc_usage_period
        });
      
      if (rentcarError) {
        alert('렌트카 정보 저장 실패: ' + rentcarError.message);
      } else {
        alert('렌트카 견적이 저장되었습니다!');
        router.push('/mypage/quotes/new');
      }
    } catch (error) {
      alert('견적 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-red-50">
      <div className="bg-gradient-to-r from-red-100 via-rose-100 to-red-100 text-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-rose-600">🚗 렌트카</h1>
            <button 
              onClick={() => router.push('/mypage/quotes/new')}
              className="bg-white/60 hover:bg-white/80 px-4 py-2 rounded-lg transition-colors text-gray-800"
            >
              🏠 홈으로
            </button>
          </div>
          <div className="bg-white/70 backdrop-blur rounded-lg p-6">
            <p className="text-lg text-rose-700 opacity-90">자유로운 여행을 위한 렌트카 서비스.</p>
            <p className="text-sm text-rose-500 opacity-75 mt-2">다양한 차종과 합리적인 가격으로 편안한 드라이브를 즐기세요.</p>
          </div>

          {/* 렌트카 서비스 카드들 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white/80 backdrop-blur rounded-lg p-4 hover:bg-white/90 transition-colors">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">🚙</span>
                <h3 className="font-semibold text-gray-800">프리미엄 차량</h3>
              </div>
              <p className="text-sm text-gray-600">최신 모델의 고급 차량으로 편안한 여행을</p>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-lg p-4 hover:bg-white/90 transition-colors">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">🗺️</span>
                <h3 className="font-semibold text-gray-800">맞춤 경로</h3>
              </div>
              <p className="text-sm text-gray-600">원하는 목적지까지 최적의 경로 제공</p>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-lg p-4 hover:bg-white/90 transition-colors">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">⭐</span>
                <h3 className="font-semibold text-gray-800">전문 기사</h3>
              </div>
              <p className="text-sm text-gray-600">숙련된 전문 기사가 안전하게 모시겠습니다</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          {/* 승차일자 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">📅 승차일자</label>
            <input
              type="date"
              value={form.rc_boarding_date}
              onChange={e => setForm({ ...form, rc_boarding_date: e.target.value })}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {/* 승차시간 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">⏰ 승차시간</label>
            <input
              type="time"
              value={form.rc_boarding_time}
              onChange={e => setForm({ ...form, rc_boarding_time: e.target.value })}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {/* 구분 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">🏷️ 구분</label>
            <div className="flex gap-2 flex-wrap">
              {categoryOptions.map(option => (
                <button
                  key={option.code}
                  type="button"
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                    ${form.rc_category_code === option.code
                      ? 'bg-rose-500 text-white border-rose-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-rose-100'}
                  `}
                  onClick={() => setForm(prev => ({ ...prev, rc_category_code: option.code }))}
                >
                  {option.name}
                </button>
              ))}
            </div>
          </div>

          {/* 분류 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">📋 분류</label>
            <div className="flex gap-2 flex-wrap">
              {typeOptions.length === 0 && form.rc_category_code ? (
                <span className="text-sm text-rose-500">분류 데이터가 없습니다.</span>
              ) : null}
              {typeOptions.map(option => (
                <button
                  key={option.code}
                  type="button"
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                    ${form.rc_type_code === option.code
                      ? 'bg-rose-500 text-white border-rose-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-rose-100'}
                  `}
                  onClick={() => setForm(prev => ({ ...prev, rc_type_code: option.code }))}
                  disabled={!form.rc_category_code}
                >
                  {option.name || option.code}
                </button>
              ))}
            </div>
          </div>

          {/* 경로 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">🛣️ 경로</label>
          <select
            value={form.rc_route_code}
            onChange={e => setForm({ ...form, rc_route_code: e.target.value })}
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            disabled={!form.rc_category_code || !form.rc_type_code}
          >
            <option value="">{!form.rc_category_code || !form.rc_type_code ? '먼저 구분과 분류를 선택해주세요' : '선택해주세요'}</option>
            {routeOptions.map(option => (
              <option key={option.code} value={option.code}>{option.name}</option>
            ))}
          </select>
          </div>

          {/* 차량종류 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">🚗 차량종류</label>
          <select
            value={form.rc_car_code}
            onChange={e => setForm({ ...form, rc_car_code: e.target.value })}
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            disabled={!form.rc_category_code || !form.rc_type_code || !form.rc_route_code}
          >
            <option value="">{!form.rc_category_code || !form.rc_type_code || !form.rc_route_code ? '먼저 구분, 분류, 경로를 선택해주세요' : '선택해주세요'}</option>
            {carOptions.map(option => (
              <option key={option.code} value={option.code}>{option.name}</option>
            ))}
          </select>
          </div>

          {/* 차량대수 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">🔢 차량대수</label>
            <input
              type="number"
              min={1}
              value={form.rc_car_count}
              onChange={e => setForm({ ...form, rc_car_count: Number(e.target.value) })}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="차량 대수"
            />
          </div>

          {/* 캐리어갯수 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">🧳 캐리어갯수</label>
            <input
              type="number"
              min={0}
              value={form.rc_carrier_count}
              onChange={e => setForm({ ...form, rc_carrier_count: Number(e.target.value) })}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="캐리어 개수"
            />
          </div>

          {/* 승차장소 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">📍 승차장소</label>
            <input
              type="text"
              value={form.rc_pickup_location}
              onChange={e => setForm({ ...form, rc_pickup_location: e.target.value })}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="승차장소를 입력해주세요"
            />
          </div>

          {/* 목적지 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">🏁 목적지</label>
            <input
              type="text"
              value={form.rc_dropoff_location}
              onChange={e => setForm({ ...form, rc_dropoff_location: e.target.value })}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="목적지를 입력해주세요"
            />
          </div>

          {/* 경유지 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">🚏 경유지</label>
            <input
              type="text"
              value={form.rc_via_location}
              onChange={e => setForm({ ...form, rc_via_location: e.target.value })}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="경유지를 입력해주세요 (선택사항)"
            />
          </div>

          {/* 승차인동 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">👥 승차인동</label>
            <input
              type="number"
              min={1}
              value={form.rc_passenger_count}
              onChange={e => setForm({ ...form, rc_passenger_count: Number(e.target.value) })}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="승차 인동"
            />
          </div>

          {/* 사용기간 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">📆 사용기간(일)</label>
            <input
              type="number"
              min={1}
              value={form.rc_usage_period}
              onChange={e => setForm({ ...form, rc_usage_period: Number(e.target.value) })}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="사용 기간 (일수)"
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">💡 견적 신청 후 담당자가 연락드립니다.</p>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => router.push('/mypage/quotes/new')}
              className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition-colors"
            >
              ← 뒤로가기
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 text-white py-3 rounded-lg hover:from-red-600 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all"
            >
              {loading ? '저장 중...' : '🚗 렌트카 예약 신청'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

