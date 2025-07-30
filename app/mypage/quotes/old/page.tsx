'use client';
import React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

// 데이터 구조에 대한 타입 정의
interface Quote {
  id: string;
  user_id: string;
  checkin: string;
  is_confirmed: boolean;
  created_at: string;
  schedule_info: { name: string };
  cruise_info: { name: string };
  quote_type: string;
}

interface QuoteRoom {
  quote_id: string;
  room_price: {
    room_info: {
      name: string;
    };
  };
}

interface QuoteCar {
  quote_id: string;
  car_price: {
    car_info: {
      name: string;
    };
  };
}

export default function MyQuotesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoteRooms, setQuoteRooms] = useState<QuoteRoom[]>([]);
  const [quoteCars, setQuoteCars] = useState<QuoteCar[]>([]);
  // 필터 상태 useState는 반드시 컴포넌트 최상단에서 선언
  const [activeType, setActiveType] = useState<'all' | 'cruise' | 'car' | 'rentcar'>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          alert('로그인이 필요합니다.');
          router.push('/login');
          return;
        }

        // 1. 사용자의 견적 목록과 관련 정보를 한번에 조회 (Join 활용)
        const { data: quoteData, error: quoteError } = await supabase
          .from('quote')
          .select(
            `
            *,
            schedule_info:schedule_code(name),
            cruise_info:cruise_code(name)
          `
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (quoteError)
          throw new Error(`견적 목록 조회 중 오류가 발생했습니다: ${quoteError.message}`);
        if (!quoteData || quoteData.length === 0) {
          setQuotes([]);
          setLoading(false);
          return;
        }
        setQuotes(quoteData);
        const quoteIds = quoteData.map((q: any) => q.id);

        // 2. Promise.all을 사용하여 객실 및 차량 정보를 병렬로 조회
        const [roomsRes, carsRes] = await Promise.all([
          supabase
            .from('quote_room')
            .select('quote_id, room_price:room_price_code(room_info:room_code(name))')
            .in('quote_id', quoteIds),
          supabase
            .from('quote_car')
            .select('quote_id, car_price:car_price_code(car_info:car_code(name))')
            .in('quote_id', quoteIds),
        ]);

        // 3. 조회된 데이터 처리 및 상태 업데이트
        const { data: roomData, error: roomError } = roomsRes;
        if (roomError)
          throw new Error(`객실 정보 조회 중 오류가 발생했습니다: ${roomError.message}`);
        setQuoteRooms(roomData || []);

        const { data: carData, error: carError } = carsRes;
        if (carError) throw new Error(`차량 정보 조회 중 오류가 발생했습니다: ${carError.message}`);
        setQuoteCars(carData || []);
      } catch (e: any) {
        setError(e.message || '데이터를 불러오는 중 오류가 발생했습니다.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // 로딩 상태 UI
  if (loading) {
    return (
      <PageWrapper>
        <h1 className="text-xl font-bold text-center mb-6">내 견적 목록</h1>
        <SectionBox>
          <p className="text-gray-500">견적을 가져오는 중... 잠시만 기다리세요.</p>
        </SectionBox>
      </PageWrapper>
    );
  }

  // 오류 상태 UI
  if (error) {
    return (
      <PageWrapper>
        <h1 className="text-xl font-bold text-center mb-6">내 견적 목록</h1>
        <SectionBox>
          <p className="text-red-500">오류: {error}</p>
        </SectionBox>
      </PageWrapper>
    );
  }

  // 필터링된 견적 리스트
  const filteredQuotes = quotes.filter((q) => {
    if (activeType === 'all') return true;
    if (activeType === 'cruise') return !!q.cruise_info;
    if (activeType === 'car') return quoteCars.some(c => c.quote_id === q.id);
    if (activeType === 'rentcar') return q.quote_type === 'rentcar';
    return true;
  });

  return (
    <PageWrapper>
      <h1 className="text-xl font-bold text-center mb-6">내 견적 목록</h1>
      {/* 필터 버튼 UI */}
      <div className="flex gap-2 mb-6 justify-center">
        <button
          className={`px-3 py-1 rounded ${activeType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setActiveType('all')}
        >전체</button>
        <button
          className={`px-3 py-1 rounded ${activeType === 'cruise' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setActiveType('cruise')}
        >크루즈</button>
        <button
          className={`px-3 py-1 rounded ${activeType === 'car' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setActiveType('car')}
        >차량</button>
        <button
          className={`px-3 py-1 rounded ${activeType === 'rentcar' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setActiveType('rentcar')}
        >렌트카</button>
      </div>
      <SectionBox>
        {filteredQuotes.length === 0 ? (
          <p className="text-gray-500">생성된 견적이 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {filteredQuotes.map((q: any) => (
              <div key={q.id} className="border p-3 rounded bg-white space-y-1">
                <p> 체크인: {q.checkin}</p>
                <p> 일정: {q.schedule_info?.name || '알 수 없음'}</p>
                <p> 크루즈: {q.cruise_info?.name || '알 수 없음'}</p>

                {/* 객실 */}
                {quoteRooms.filter((r) => r.quote_id === q.id).length > 0 ? (
                  <div>
                    <p> 객실:</p>
                    <ul className="ml-4 list-disc">
                      {quoteRooms
                        .filter((r) => r.quote_id === q.id)
                        .map((room, idx) => (
                          <li key={idx}>
                            {room.room_price?.room_info?.name || `❗ 이름을 찾을 수 없음`}
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : (
                  <p> 객실: 없음</p>
                )}

                {/* 차량 */}
                {quoteCars.filter((c) => c.quote_id === q.id).length > 0 ? (
                  <div>
                    <p> 차량:</p>
                    <ul className="ml-4 list-disc">
                      {quoteCars
                        .filter((c) => c.quote_id === q.id)
                        .map((car, idx) => (
                          <li key={idx}>
                            {car.car_price?.car_info?.name || `❗ 이름을 찾을 수 없음`}
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : (
                  <p> 차량: 없음</p>
                )}

                <p>✅ 확정 여부: {q.is_confirmed ? '✔ 확정됨' : '❌ 미확정'}</p>
                <button onClick={() => router.push(`/quote/${q.id}/view`)} className="btn mt-2">
                  견적서 보기
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionBox>
    </PageWrapper>
  );
}
