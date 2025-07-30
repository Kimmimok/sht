'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function TourPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    tour_destination: '',
    tour_type: 'city',
    tour_date: '',
    duration: '1',
    participant_count: 2,
    tour_guide: 'korean',
    discount_rate: 0
  });

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
      const { error } = await supabase.from('quote').insert({ 
        ...form, 
        user_id: user.id,
        quote_type: 'tour'
      });
      
      if (error) {
        alert('저장 실패: ' + error.message);
      } else {
        alert('투어 견적이 저장되었습니다!');
        router.push('/mypage/quotes');
      }
    } catch (error) {
      alert('견적 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-orange-50">
      <div className="bg-gradient-to-r from-orange-100 via-amber-100 to-orange-100 text-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-amber-600">🗺️ 투어 예약</h1>
            <button 
               onClick={() => router.push('/mypage/quotes/new')}
              className="bg-orange-100 hover:bg-orange-200 px-4 py-2 rounded-lg transition-colors text-amber-700 border border-amber-200"
            >
              🏠 홈으로
            </button>
          </div>
          <div className="bg-orange-100/60 backdrop-blur rounded-lg p-6 border border-orange-100">
            <p className="text-lg text-amber-700 opacity-90">특별한 여행지에서 잊지 못할 추억을 만드세요.</p>
            <p className="text-sm text-amber-500 opacity-75 mt-2">전문 가이드와 함께하는 맞춤형 투어를 경험해보세요.</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">📍 투어 목적지</label>
            <input 
              type="text" 
              value={form.tour_destination} 
              onChange={e => setForm({ ...form, tour_destination: e.target.value })} 
              placeholder="예: 도쿄, 오사카, 교토"
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">🎯 투어 타입</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { value: 'city', label: '시티투어' },
                { value: 'nature', label: '자연관광' },
                { value: 'culture', label: '문화체험' },
                { value: 'food', label: '맛집투어' }
              ].map(option => (
                <button 
                  key={option.value} 
                  onClick={() => setForm({ ...form, tour_type: option.value })} 
                  className={`border p-3 rounded-lg transition-colors ${
                    form.tour_type === option.value
                      ? 'bg-orange-200 text-amber-700 border-orange-200'
                      : 'bg-orange-50 text-amber-600 border-orange-100 hover:bg-orange-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">📅 투어 날짜</label>
              <input 
                type="date" 
                value={form.tour_date} 
                onChange={e => setForm({ ...form, tour_date: e.target.value })} 
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">⏰ 투어 시간</label>
              <select 
                value={form.duration} 
                onChange={e => setForm({ ...form, duration: e.target.value })} 
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="0.5">반나절 (4시간)</option>
                <option value="1">하루 (8시간)</option>
                <option value="2">1박 2일</option>
                <option value="3">2박 3일</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">🗣 가이드 언어</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'korean', label: '한국어' },
                { value: 'english', label: '영어' },
                { value: 'local', label: '현지어' }
              ].map(option => (
                <button 
                  key={option.value} 
                  onClick={() => setForm({ ...form, tour_guide: option.value })} 
                  className={`border p-3 rounded-lg transition-colors ${
                    form.tour_guide === option.value
                      ? 'bg-orange-200 text-amber-700 border-orange-200'
                      : 'bg-orange-50 text-amber-600 border-orange-100 hover:bg-orange-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-100 to-amber-100 rounded-lg p-6 border border-orange-100">
            <h3 className="text-amber-700 text-lg font-semibold mb-4">👥 참가자 수</h3>
            <div className="grid grid-cols-8 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                <button
                  key={n}
                  onClick={() => setForm({ ...form, participant_count: n })}
                  className={`border rounded px-3 py-2 transition-colors ${
                    form.participant_count === n
                      ? 'bg-orange-200 text-amber-700 border-orange-200'
                      : 'bg-orange-50 text-amber-600 border-orange-100 hover:bg-orange-100'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

         

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">💡 투어 예약 시스템은 현재 개발 중입니다. 견적 신청 후 담당자가 연락드립니다.</p>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => router.push('/mypage/quotes/new')}
              className="flex-1 bg-orange-100 text-amber-700 py-3 rounded-lg hover:bg-orange-200 border border-amber-200 transition-colors"
            >
              ← 뒤로가기
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-orange-200 to-amber-200 text-amber-700 py-3 rounded-lg hover:from-orange-300 hover:to-amber-300 border border-amber-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all"
            >
              {loading ? '저장 중...' : '🗺️ 투어 예약 신청'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
