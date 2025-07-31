'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

export default function QuoteDetailView() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<any>(null);
  const [quoteItems, setQuoteItems] = useState<any[]>([]);
  const [showPrices, setShowPrices] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && quoteId) {
      loadQuoteDetails();
    }
  }, [user, quoteId]);

  const checkAuth = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.log('❌ 사용자 인증 실패:', userError?.message);
        router.push('/login');
        return;
      }

      console.log('✅ 사용자 인증 성공:', user.id);
      setUser(user);
    } catch (error) {
      console.error('❌ 인증 확인 오류:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadQuoteDetails = async () => {
    try {
      console.log('🔄 견적 상세 데이터 로딩 시작...', quoteId);
      
      // 견적 기본 정보 조회
      const { data: quoteData, error: quoteError } = await supabase
        .from('quote')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (quoteError) {
        console.error('❌ 견적 조회 실패:', quoteError);
        alert('견적을 찾을 수 없습니다.');
        router.push('/mypage/quotes');
        return;
      }

      // 견적 소유권 확인 (견적자는 auth.uid로만 확인)
      if (quoteData.user_id !== user.id) {
        console.log('❌ 견적 소유권 없음');
        alert('해당 견적에 접근할 권한이 없습니다.');
        router.push('/mypage/quotes');
        return;
      }

      // 견적 상태에 따라 가격 표시 여부 결정
      const approvedStatuses = ['approved', 'confirmed', 'reserved'];
      setShowPrices(approvedStatuses.includes(quoteData.status));

      console.log('✅ 견적 데이터:', quoteData);
      console.log('💰 가격 표시 여부:', approvedStatuses.includes(quoteData.status));
      setQuote(quoteData);

      // quote_item과 관련 서비스 데이터 조회
      const { data: itemsData, error: itemsError } = await supabase
        .from('quote_item')
        .select(`
          *,
          airport:airport(*),
          hotel:hotel(*),
          rentcar:rentcar(*),
          quote_room:quote_room(*, room_code:room_code(*)),
          quote_car:quote_car(*, car_code:car_code(*))
        `)
        .eq('quote_id', quoteId)
        .order('created_at');

      if (itemsError) {
        console.error('❌ 견적 아이템 조회 실패:', itemsError);
        setQuoteItems([]);
      } else {
        console.log('✅ 견적 아이템:', itemsData);
        setQuoteItems(itemsData || []);
      }

    } catch (error) {
      console.error('❌ 견적 상세 로드 실패:', error);
      alert('견적 데이터를 불러오는데 실패했습니다.');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      submitted: 'bg-yellow-100 text-yellow-800',
      draft: 'bg-gray-100 text-gray-800',
      approved: 'bg-green-100 text-green-800',
      confirmed: 'bg-blue-100 text-blue-800',
      reserved: 'bg-purple-100 text-purple-800',
      rejected: 'bg-red-100 text-red-800'
    };
    const labels = {
      pending: '검토중',
      submitted: '제출됨',
      draft: '임시저장',
      approved: '승인됨',
      confirmed: '확정됨',
      reserved: '예약완료',
      rejected: '거절됨'
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const renderQuoteItem = (item: any) => {
    const { service_type } = item;
    
    switch (service_type) {
      case 'airport':
        return (
          <div key={item.id} className="border-l-4 border-blue-500 pl-4 mb-4">
            <h4 className="font-medium text-gray-900">✈️ 공항 서비스</h4>
            {item.airport && (
              <div className="text-sm text-gray-600 mt-2">
                <p>출발공항: {item.airport.departure_airport}</p>
                <p>도착공항: {item.airport.arrival_airport}</p>
                <p>출발일: {item.airport.departure_date}</p>
                <p>도착일: {item.airport.arrival_date}</p>
                {showPrices && (
                  <p className="font-medium text-blue-600 mt-2">
                    가격: {item.total_price?.toLocaleString() || '0'}원
                  </p>
                )}
              </div>
            )}
          </div>
        );
      
      case 'hotel':
        return (
          <div key={item.id} className="border-l-4 border-green-500 pl-4 mb-4">
            <h4 className="font-medium text-gray-900">🏨 호텔</h4>
            {item.hotel && (
              <div className="text-sm text-gray-600 mt-2">
                <p>호텔명: {item.hotel.hotel_name}</p>
                <p>체크인: {item.hotel.checkin_date}</p>
                <p>체크아웃: {item.hotel.checkout_date}</p>
                <p>박수: {item.hotel.nights}박</p>
                {showPrices && (
                  <p className="font-medium text-green-600 mt-2">
                    가격: {item.total_price?.toLocaleString() || '0'}원
                  </p>
                )}
              </div>
            )}
          </div>
        );
      
      case 'rentcar':
        return (
          <div key={item.id} className="border-l-4 border-purple-500 pl-4 mb-4">
            <h4 className="font-medium text-gray-900">🚗 렌터카</h4>
            {item.rentcar && (
              <div className="text-sm text-gray-600 mt-2">
                <p>픽업일: {item.rentcar.pickup_date}</p>
                <p>반납일: {item.rentcar.return_date}</p>
                <p>픽업장소: {item.rentcar.pickup_location}</p>
                <p>반납장소: {item.rentcar.return_location}</p>
                {showPrices && (
                  <p className="font-medium text-purple-600 mt-2">
                    가격: {item.total_price?.toLocaleString() || '0'}원
                  </p>
                )}
              </div>
            )}
          </div>
        );
      
      case 'quote_room':
        return (
          <div key={item.id} className="border-l-4 border-orange-500 pl-4 mb-4">
            <h4 className="font-medium text-gray-900">🛏️ 객실</h4>
            {item.quote_room && (
              <div className="text-sm text-gray-600 mt-2">
                <p>객실타입: {item.quote_room.room_code?.name || '정보 없음'}</p>
                <p>수량: {item.quantity}개</p>
                <p>성인: {item.quote_room.adult_count}명</p>
                <p>아동: {item.quote_room.child_count}명</p>
                <p>유아: {item.quote_room.infant_count}명</p>
                {showPrices && (
                  <p className="font-medium text-orange-600 mt-2">
                    가격: {item.total_price?.toLocaleString() || '0'}원
                  </p>
                )}
              </div>
            )}
          </div>
        );
      
      case 'quote_car':
        return (
          <div key={item.id} className="border-l-4 border-red-500 pl-4 mb-4">
            <h4 className="font-medium text-gray-900">🚌 차량</h4>
            {item.quote_car && (
              <div className="text-sm text-gray-600 mt-2">
                <p>차량타입: {item.quote_car.car_code?.name || '정보 없음'}</p>
                <p>수량: {item.quantity}대</p>
                <p>탑승인원: {item.quote_car.passenger_count}명</p>
                {showPrices && (
                  <p className="font-medium text-red-600 mt-2">
                    가격: {item.total_price?.toLocaleString() || '0'}원
                  </p>
                )}
              </div>
            )}
          </div>
        );
      
      default:
        return (
          <div key={item.id} className="border-l-4 border-gray-500 pl-4 mb-4">
            <h4 className="font-medium text-gray-900">📦 기타 서비스</h4>
            <p className="text-sm text-gray-600">서비스 타입: {service_type}</p>
            {showPrices && (
              <p className="font-medium text-gray-600 mt-2">
                가격: {item.total_price?.toLocaleString() || '0'}원
              </p>
            )}
          </div>
        );
    }
  };

  const handleReservationRequest = async () => {
    if (!quote || quote.status !== 'approved') {
      alert('승인된 견적만 예약 신청이 가능합니다.');
      return;
    }

    const confirmMessage = '이 견적으로 예약을 신청하시겠습니까?\n\n예약 신청 후에는 담당자가 확인하여 최종 예약을 확정합니다.';
    
    if (confirm(confirmMessage)) {
      router.push(`/reservation/cruise/${quoteId}`);
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </PageWrapper>
    );
  }

  if (!quote) {
    return (
      <PageWrapper>
        <SectionBox title="❌ 견적을 찾을 수 없습니다">
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">요청하신 견적을 찾을 수 없습니다.</p>
            <button
              onClick={() => router.push('/mypage/quotes')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              견적 목록으로 돌아가기
            </button>
          </div>
        </SectionBox>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      {/* 헤더 */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            📋 견적 상세보기
          </h1>
          <div className="flex items-center space-x-3">
            {getStatusBadge(quote.status || 'pending')}
            <span className="text-sm text-gray-500">
              견적 ID: {quote.id?.slice(0, 8)}...
            </span>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => router.push('/mypage/quotes')}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm"
          >
            목록으로
          </button>
          {quote.status === 'approved' && (
            <button
              onClick={handleReservationRequest}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              🎫 예약 신청하기
            </button>
          )}
        </div>
      </div>

      {/* 기본 정보 */}
      <SectionBox title="🚢 기본 정보">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">여행 일정</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">출발일:</span>
                <span className="font-medium">
                  {quote.departure_date ? new Date(quote.departure_date).toLocaleDateString() : '미정'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">여행 기간:</span>
                <span className="font-medium">{quote.duration || '미정'}일</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">크루즈:</span>
                <span className="font-medium">{quote.cruise_name || '미정'}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3">인원 구성</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">성인:</span>
                <span className="font-medium">{quote.adult_count || 0}명</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">아동:</span>
                <span className="font-medium">{quote.child_count || 0}명</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">유아:</span>
                <span className="font-medium">{quote.infant_count || 0}명</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-medium">
                <span className="text-gray-900">총 인원:</span>
                <span className="text-blue-600">
                  {(quote.adult_count || 0) + (quote.child_count || 0) + (quote.infant_count || 0)}명
                </span>
              </div>
            </div>
          </div>
        </div>
      </SectionBox>

      {/* 서비스 상세 */}
      <SectionBox title="🛏️ 서비스 상세">
        {quoteItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            등록된 서비스가 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {quoteItems.map(renderQuoteItem)}
          </div>
        )}
      </SectionBox>

      {/* 가격 정보 (승인된 견적만 표시) */}
      {showPrices && (
        <SectionBox title="💰 견적 가격">
          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">총 견적가</p>
              <p className="text-3xl font-bold text-blue-600">
                {quote.total_price?.toLocaleString() || '0'}원
              </p>
              <p className="text-xs text-gray-500 mt-2">
                * 상기 요금은 예상 견적가이며, 최종 확정가격은 예약 확정 시 안내됩니다.
              </p>
            </div>
          </div>
        </SectionBox>
      )}

      {/* 견적 설명 및 노트 */}
      {(quote.description || quote.manager_note) && (
        <SectionBox title="📝 상세 내용">
          {quote.description && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">견적 요청 내용</h4>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {quote.description}
                </p>
              </div>
            </div>
          )}
          
          {quote.manager_note && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">담당자 메모</h4>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {quote.manager_note}
                </p>
              </div>
            </div>
          )}
        </SectionBox>
      )}

      {/* 상태별 안내 메시지 */}
      <SectionBox title="📢 현재 상태">
        <div className="bg-gray-50 p-4 rounded-md">
          {quote.status === 'pending' || quote.status === 'submitted' ? (
            <div className="text-yellow-700">
              <p className="font-medium">⏰ 검토 중입니다</p>
              <p className="text-sm mt-1">
                담당자가 견적을 검토하고 있습니다. 승인까지 1-2일 정도 소요될 수 있습니다.
              </p>
            </div>
          ) : quote.status === 'approved' ? (
            <div className="text-green-700">
              <p className="font-medium">✅ 견적이 승인되었습니다</p>
              <p className="text-sm mt-1">
                위의 '예약 신청하기' 버튼을 클릭하여 예약을 진행하실 수 있습니다.
              </p>
            </div>
          ) : quote.status === 'confirmed' || quote.status === 'reserved' ? (
            <div className="text-blue-700">
              <p className="font-medium">🎉 예약이 확정되었습니다</p>
              <p className="text-sm mt-1">
                예약이 성공적으로 완료되었습니다. 담당자가 자세한 안내를 드릴 예정입니다.
              </p>
            </div>
          ) : quote.status === 'rejected' ? (
            <div className="text-red-700">
              <p className="font-medium">❌ 견적이 거절되었습니다</p>
              <p className="text-sm mt-1">
                죄송하지만 해당 견적은 처리가 어려운 상황입니다. 새로운 견적을 요청해 주세요.
              </p>
            </div>
          ) : (
            <div className="text-gray-700">
              <p className="font-medium">📝 임시저장 상태입니다</p>
              <p className="text-sm mt-1">
                견적 작성이 완료되지 않은 상태입니다.
              </p>
            </div>
          )}
        </div>
      </SectionBox>

      {/* 생성일시 정보 */}
      <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t">
        <p>견적 생성일: {new Date(quote.created_at).toLocaleString()}</p>
        {quote.updated_at && quote.updated_at !== quote.created_at && (
          <p>마지막 수정일: {new Date(quote.updated_at).toLocaleString()}</p>
        )}
      </div>
    </PageWrapper>
  );
}
