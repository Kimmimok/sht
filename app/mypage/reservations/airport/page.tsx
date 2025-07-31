'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

export default function AirportPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 폼 데이터
  const [form, setForm] = useState({
    flight_number: '', // 항공편 번호
    ap_time: '', // 시간(도착/출발 통합)
    terminal: '', // 터미널
    ap_category_code: '', // 구분
    ap_type_code: '',     // 분류
    ap_route_code: '',    // 경로
    ap_car_code: '',      // 차량종류
    airport_name: '',     // 공항명
    place_name: '',       // 장소명
    stopover_place: '',   // 경유지
    stopover_wait_time: '', // 경유지 대기시간
    car_count: '',        // 차량수
    passenger_count: '',  // 승차인원
    luggage_count: '',    // 캐리어수
    fast_track: false     // 패스트트랙
  });

  // 사용자 인증 체크
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

  // 폼 제출
  const handleSubmit = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // 임시로 quote 테이블에 저장 (추후 airport_quote 테이블 생성 예정)
      const { error } = await supabase.from('quote_airport').insert({ 
        ...form, 
        user_id: user.id
      });
      
      if (error) {
        alert('저장 실패: ' + error.message);
      } else {
        alert('공항 서비스 견적이 저장되었습니다!');
        router.push('/mypage/quotes');
      }
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
      <div className="bg-gradient-to-r from-sky-100 via-blue-100 to-sky-200 text-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">✈️ 공항 서비스</h1>
            <button 
              onClick={() => router.push('/mypage/quotes/new')}
              className="bg-white/60 hover:bg-white/80 px-4 py-2 rounded-lg transition-colors text-gray-800"
            >
              🏠 홈으로
            </button>
          </div>
          <div className="bg-white/70 backdrop-blur rounded-lg p-6">
            <p className="text-lg opacity-90">편리한 공항 서비스를 예약해보세요.</p>
            <p className="text-sm opacity-75 mt-2">항공권 예약부터 공항 픽업까지 원스톱 서비스를 제공합니다.</p>
          </div>
        </div>
      </div>

      {/* 입력 폼 영역 - DB 컬럼에 맞게 수정 */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white/80 rounded-lg shadow p-6 space-y-6">
          {/* 구분, 분류, 경로, 차량종류 - 위로 이동 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">구분</label>
              <input
                type="text"
                value={form.ap_category_code}
                onChange={e => setForm({ ...form, ap_category_code: e.target.value })}
                placeholder="예: 일반, VIP 등"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">분류</label>
              <input
                type="text"
                value={form.ap_type_code}
                onChange={e => setForm({ ...form, ap_type_code: e.target.value })}
                placeholder="예: 대형, 소형 등"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">경로</label>
              <input
                type="text"
                value={form.ap_route_code}
                onChange={e => setForm({ ...form, ap_route_code: e.target.value })}
                placeholder="예: 인천-김포"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">차량종류</label>
              <input
                type="text"
                value={form.ap_car_code}
                onChange={e => setForm({ ...form, ap_car_code: e.target.value })}
                placeholder="예: 카니발, 스타렉스 등"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
          </div>
          {/* 시간 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">시간</label>
            <input
              type="datetime-local"
              value={form.ap_time}
              onChange={e => setForm({ ...form, ap_time: e.target.value })}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          {/* 공항명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">공항명</label>
            <input
              type="text"
              value={form.airport_name}
              onChange={e => setForm({ ...form, airport_name: e.target.value })}
              placeholder="예: 인천국제공항"
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          {/* 장소명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">장소명</label>
            <input
              type="text"
              value={form.place_name}
              onChange={e => setForm({ ...form, place_name: e.target.value })}
              placeholder="예: 호텔, 집 등"
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          {/* 경유지 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">경유지</label>
            <input
              type="text"
              value={form.stopover_place}
              onChange={e => setForm({ ...form, stopover_place: e.target.value })}
              placeholder="예: 강남역"
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          {/* 경유지 대기시간 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">경유지 대기시간(분)</label>
            <input
              type="number"
              value={form.stopover_wait_time}
              onChange={e => setForm({ ...form, stopover_wait_time: e.target.value })}
              placeholder="예: 30"
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          {/* 차량수 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">차량수</label>
            <input
              type="number"
              value={form.car_count}
              onChange={e => setForm({ ...form, car_count: e.target.value })}
              placeholder="예: 1"
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          {/* 승차인원 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">승차인원</label>
            <input
              type="number"
              value={form.passenger_count}
              onChange={e => setForm({ ...form, passenger_count: e.target.value })}
              placeholder="예: 4"
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          {/* 캐리어수 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">캐리어수</label>
            <input
              type="number"
              value={form.luggage_count}
              onChange={e => setForm({ ...form, luggage_count: e.target.value })}
              placeholder="예: 2"
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          {/* 패스트트랙 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="fast_track"
              checked={form.fast_track}
              onChange={e => setForm({ ...form, fast_track: e.target.checked })}
              className="h-5 w-5 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
            />
            <label htmlFor="fast_track" className="text-sm font-medium text-gray-700">패스트트랙(Y/N)</label>
          </div>
          {/* 항공편 번호 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">항공편 번호</label>
              <input
                type="text"
                value={form.flight_number}
                onChange={e => setForm({ ...form, flight_number: e.target.value })}
                placeholder="예: OZ123"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">터미널</label>
            <input
              type="text"
              value={form.terminal}
              onChange={e => setForm({ ...form, terminal: e.target.value })}
              placeholder="예: 제1터미널"
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          <div className="bg-yellow-50/80 border border-yellow-100 rounded-lg p-4">
            <p className="text-yellow-700">💡 견적 신청 후 담당자가 연락드립니다.</p>
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
              className="flex-1 bg-gradient-to-r from-sky-500 to-blue-600 text-white py-3 rounded-lg hover:from-sky-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all"
            >
              {loading ? '저장 중...' : '✈️ 공항 서비스 신청'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
