'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import supabase from '@/lib/supabase';
import Link from 'next/link';

// Lucide 아이콘 가져오기
import {
  FileText,
  CalendarCheck,
  Ship,
  CreditCard,
  Percent,
  Clock,
  BedDouble,
  Car,
  BadgeCheck,
  CircleAlert,
  Plane,
  Building,
  Camera,
  ArrowLeft,
} from 'lucide-react';

export default function QuoteViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const [quote, setQuote] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const fetchQuote = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert('로그인이 필요합니다.');
        return router.push('/login');
      }

      const { data, error } = await supabase
        .from('quote')
        .select(
          `
          *,
          cruise_info(name),
          payment_info(name),
          quote_room(*, room_info(name)),
          quote_car(*, car_info(name))
        `
        )
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        setError(error);
        return;
      }

      setQuote(data);
    };

    fetchQuote();
  }, [id]);

  if (error) return notFound();
  if (!quote) return <div className="text-center p-10">견적을 불러오는 중입니다...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-gray-700" />
            견적서
          </h1>
        </div>
        {(quote.status === 'confirmed' || quote.status === 'approved') ? (
          <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full">
            <BadgeCheck className="w-4 h-4" />
            <span className="font-medium">확정됨</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">
            <CircleAlert className="w-4 h-4" />
            <span className="font-medium">미확정</span>
          </div>
        )}
      </div>

      {/* 견적 기본 정보 */}
      <div className="border rounded p-4 space-y-2 bg-white shadow-sm">
        <p className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-600" />
          제목: {quote.title || '제목 없음'}
        </p>
        <p className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-600" />
          설명: {quote.description || '설명 없음'}
        </p>
        <p className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-gray-600" />
          총 금액: {quote.total_price ? `${quote.total_price.toLocaleString()}원` : '견적 대기'}
        </p>
        <p className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-600" />
          작성일: {new Date(quote.created_at).toLocaleString()}
        </p>
      </div>

      {/* 간단한 서비스 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 객실 정보 요약 */}
        {quote.quote_room?.length > 0 && (
          <div className="border rounded p-4 bg-green-50">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-green-700" />
              객실 구성
            </h3>
            <p className="text-sm text-gray-600">
              총 {quote.quote_room.length}개 객실
            </p>
            {quote.quote_room.map((room: any, index: number) => (
              <div key={room.id} className="text-sm mt-1">
                • {room.room_info?.name || room.room_code} ({room.person_count}명)
              </div>
            ))}
          </div>
        )}

        {/* 차량 정보 요약 */}
        {quote.quote_car?.length > 0 && (
          <div className="border rounded p-4 bg-blue-50">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-700" />
              차량 구성
            </h3>
            <p className="text-sm text-gray-600">
              총 {quote.quote_car.length}개 차량
            </p>
            {quote.quote_car.map((car: any, index: number) => (
              <div key={car.id} className="text-sm mt-1">
                • {car.car_info?.name || car.vehicle_code} ({car.car_count}대)
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 추가 서비스 표시 (간단히) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border rounded p-3 bg-orange-50 text-center">
          <Plane className="w-6 h-6 text-orange-600 mx-auto mb-1" />
          <p className="text-sm font-medium">공항 서비스</p>
          <p className="text-xs text-gray-600">포함</p>
        </div>
        <div className="border rounded p-3 bg-purple-50 text-center">
          <Building className="w-6 h-6 text-purple-600 mx-auto mb-1" />
          <p className="text-sm font-medium">호텔</p>
          <p className="text-xs text-gray-600">포함</p>
        </div>
        <div className="border rounded p-3 bg-teal-50 text-center">
          <Camera className="w-6 h-6 text-teal-600 mx-auto mb-1" />
          <p className="text-sm font-medium">투어</p>
          <p className="text-xs text-gray-600">포함</p>
        </div>
        <div className="border rounded p-3 bg-red-50 text-center">
          <Car className="w-6 h-6 text-red-600 mx-auto mb-1" />
          <p className="text-sm font-medium">렌트카</p>
          <p className="text-xs text-gray-600">포함</p>
        </div>
      </div>

      {/* 확정견적 버튼 또는 안내 메시지 */}
      <div className="border rounded p-4 bg-gray-50">
        {(quote.status === 'confirmed' || quote.status === 'approved') ? (
          <div className="text-center">
            <p className="text-lg font-semibold mb-3 text-green-700">
              ✅ 견적이 확정되었습니다!
            </p>
            <Link href={`/quote/${quote.id}/confirmed`}>
              <button className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors">
                확정견적 상세보기
              </button>
            </Link>
          </div>
        ) : (
          <p className="text-sm text-yellow-700 text-center">
            ⏳ 견적 검토 중입니다. 확정되면 상세 가격이 표시됩니다.
          </p>
        )}
      </div>
    </div>
  );
}
