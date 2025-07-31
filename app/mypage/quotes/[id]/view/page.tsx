'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import Link from 'next/link';

interface QuoteDetail {
  id: string;
  title: string;
  status: string;
  total_price: number;
  created_at: string;
  submitted_at?: string;
  approved_at?: string;
  manager_note?: string;
  items: QuoteItem[];
}

interface QuoteItem {
  id: string;
  service_type: string;
  service_ref_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  service_detail?: any;
  price_info?: any;
}

export default function QuoteDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuthAndLoadData();
  }, [params.id]);

  const checkAuthAndLoadData = async () => {
    try {
      // 1. 인증 확인
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !authUser) {
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }
      setUser(authUser);

      // 2. 견적 데이터 로드
      await loadQuoteDetail(params.id);
    } catch (error) {
      console.error('데이터 로드 오류:', error);
      setLoading(false);
    }
  };

  const loadQuoteDetail = async (quoteId: string) => {
    try {
      // 견적 기본 정보 조회
      const { data: quoteData, error: quoteError } = await supabase
        .from('quote')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (quoteError || !quoteData) {
        alert('견적을 찾을 수 없습니다.');
        router.push('/mypage/quotes');
        return;
      }

      // 견적 아이템들 조회
      const { data: itemsData, error: itemsError } = await supabase
        .from('quote_item')
        .select('*')
        .eq('quote_id', quoteId);

      if (itemsError) {
        console.error('견적 아이템 조회 오류:', itemsError);
        setQuote({ ...quoteData, items: [] });
        return;
      }

      // 각 아이템의 상세 정보 및 가격 정보 조회
      const itemsWithDetails = await Promise.all(
        (itemsData || []).map(async (item: any) => {
          const serviceDetail = await getServiceDetail(item.service_type, item.service_ref_id);
          const priceInfo = await getPriceInfo(item.service_type, serviceDetail);
          
          return {
            ...item,
            service_detail: serviceDetail,
            price_info: priceInfo
          };
        })
      );

      setQuote({
        ...quoteData,
        items: itemsWithDetails
      });
    } catch (error) {
      console.error('견적 상세 조회 오류:', error);
      alert('견적 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 서비스 상세 정보 조회
  const getServiceDetail = async (serviceType: string, serviceRefId: string) => {
    try {
      const { data, error } = await supabase
        .from(serviceType)
        .select('*')
        .eq('id', serviceRefId)
        .single();

      if (error) {
        console.error(`${serviceType} 서비스 조회 오류:`, error);
        return null;
      }
      return data;
    } catch (error) {
      console.error(`${serviceType} 서비스 조회 중 오류:`, error);
      return null;
    }
  };

  // 가격 정보 조회 (각 서비스별 price_code 테이블에서)
  const getPriceInfo = async (serviceType: string, serviceDetail: any) => {
    if (!serviceDetail) return null;

    try {
      let priceTableName = '';
      let conditions: any = {};

      switch (serviceType) {
        case 'cruise':
          priceTableName = 'room_price';
          conditions = {
            schedule_code: serviceDetail.schedule_code,
            cruise_code: serviceDetail.cruise_code,
            room_code: serviceDetail.rooms_detail?.[0]?.room_code
          };
          break;
        
        case 'rentcar':
          priceTableName = 'rentcar_price';
          conditions = {
            rc_category_code: serviceDetail.rc_category_code,
            rc_type_code: serviceDetail.rc_type_code,
            rc_route_code: serviceDetail.rc_route_code,
            rc_car_code: serviceDetail.rc_car_code
          };
          break;
        
        case 'hotel':
          priceTableName = 'hotel_price';
          conditions = {
            hotel_name: serviceDetail.hotel_name,
            room_name: serviceDetail.room_name,
            room_type: serviceDetail.room_type
          };
          break;
        
        case 'tour':
          priceTableName = 'tour_price';
          conditions = {
            tour_code: serviceDetail.tour_code
          };
          break;
        
        case 'airport':
          priceTableName = 'airport_price';
          conditions = {
            service_type: serviceDetail.service_type,
            route: serviceDetail.route
          };
          break;
        
        default:
          console.log(`⚠️ 알 수 없는 서비스 타입: ${serviceType}`);
          return null;
      }

      if (!priceTableName) {
        console.log(`⚠️ ${serviceType}에 대한 가격 테이블이 정의되지 않음`);
        return null;
      }

      let query = supabase.from(priceTableName).select('*');
      
      // 조건 추가 (null이 아닌 값만)
      Object.entries(conditions).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          query = query.eq(key, value);
        }
      });

      console.log(`🔍 ${priceTableName} 테이블에서 가격 정보 조회:`, conditions);
      
      const { data: priceData, error: priceError } = await query.limit(5);

      if (priceError) {
        console.error(`❌ ${priceTableName} 가격 조회 오류:`, priceError);
        return null;
      }

      if (!priceData || priceData.length === 0) {
        console.log(`⚠️ ${priceTableName}에서 매칭되는 가격 정보 없음:`, conditions);
        return null;
      }

      // 첫 번째 매칭 결과 반환
      const selectedPrice = priceData[0];
      console.log(`✅ ${priceTableName} 가격 정보 조회 성공:`, selectedPrice);
      
      return selectedPrice;
    } catch (error) {
      console.error(`❌ ${serviceType} 가격 정보 조회 중 오류:`, error);
      return null;
    }
  };

  // 예약하기 함수 - 프로필 페이지로 이동
  const handleReservation = async () => {
    if (!quote?.id) {
      alert('견적 정보가 없습니다.');
      return;
    }
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }
      
      // 기존 사용자 정보 확인
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      // 사용자가 이미 등록되어 있고 필수 정보가 모두 있는 경우
      if (existingUser && existingUser.name && existingUser.english_name) {
        console.log('✅ 기존 등록 사용자:', existingUser);
        // 바로 예약 홈으로 이동
        router.push(`/mypage/reservations?quoteId=${quote.id}`);
        return;
      }
      
      // 사용자 정보가 부족한 경우 프로필 입력 페이지로 이동
      console.log('⚠️ 사용자 정보 부족, 프로필 입력 페이지로 이동:', existingUser);
      router.push(`/mypage/reservations/profile?quoteId=${quote.id}`);
      
    } catch (error) {
      console.error('❌ 인증 처리 오류:', error);
      alert('인증 처리 중 오류가 발생했습니다.');
    }
  };

  // 견적 제출 함수
  const submitQuote = async (quoteId: string) => {
    if (!confirm('견적을 제출하시겠습니까? 제출 후에는 수정할 수 없습니다.')) return;

    try {
      const { error } = await supabase
        .from('quote')
        .update({ 
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('id', quoteId);

      if (error) {
        alert('제출 실패: ' + error.message);
        return;
      }

      alert('견적이 제출되었습니다!');
      window.location.reload();
    } catch (error) {
      console.error('견적 제출 오류:', error);
      alert('견적 제출 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p>견적 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p>견적을 찾을 수 없습니다.</p>
          <Link href="/mypage/quotes">
            <button className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
              견적 목록으로 돌아가기
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 헤더 - 매니저 스타일 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">견적 상세보기</h1>
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-sm text-gray-500">견적 ID: {quote.id}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  quote.status === 'approved' ? 'bg-green-100 text-green-800' :
                  quote.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                  quote.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {quote.status === 'draft' ? '작성중' :
                   quote.status === 'submitted' ? '제출됨' :
                   quote.status === 'approved' ? '승인됨' :
                   quote.status === 'rejected' ? '거절됨' : quote.status}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">
                {quote.total_price?.toLocaleString() || 0}원
              </div>
              <div className="text-sm text-gray-500 mt-1">총 견적 금액</div>
            </div>
          </div>

          {/* 견적 기본 정보 그리드 - 매니저 스타일 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-blue-800">생성일</div>
              <div className="text-lg font-semibold text-blue-900">
                {new Date(quote.created_at).toLocaleDateString()}
              </div>
            </div>
            {quote.submitted_at && (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-green-800">제출일</div>
                <div className="text-lg font-semibold text-green-900">
                  {new Date(quote.submitted_at).toLocaleDateString()}
                </div>
              </div>
            )}
            {quote.approved_at && (
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-purple-800">승인일</div>
                <div className="text-lg font-semibold text-purple-900">
                  {new Date(quote.approved_at).toLocaleDateString()}
                </div>
              </div>
            )}
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-yellow-800">서비스 개수</div>
              <div className="text-lg font-semibold text-yellow-900">
                {quote.items.length}개
              </div>
            </div>
          </div>

          {quote.manager_note && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm font-medium text-yellow-800">매니저 메모</p>
                  <p className="text-sm text-yellow-700 mt-1">{quote.manager_note}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 서비스 아이템들 - 매니저 스타일 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">포함 서비스</h2>
          
          {quote.items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              등록된 서비스가 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {quote.items.map((item, index) => (
                <ServiceItemCard 
                  key={item.id} 
                  item={item} 
                  index={index + 1} 
                />
              ))}
            </div>
          )}
        </div>

        {/* 총 금액 - 매니저 스타일 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-gray-900">총 견적 금액</span>
            <span className="text-3xl font-bold text-blue-600">
              {quote.total_price?.toLocaleString() || 0}원
            </span>
          </div>
        </div>

        {/* 액션 버튼들 */}
        <div className="flex justify-between mt-6">
          <Link href="/mypage/quotes">
            <button className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600">
              목록
            </button>
          </Link>
          
          <div className="space-x-3">
            {quote.status === 'draft' && (
              <>
                <Link href={`/mypage/quotes/new?quoteId=${quote.id}`}>
                  <button className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600">
                    수정
                  </button>
                </Link>
                <button 
                  onClick={() => submitQuote(quote.id)}
                  className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600"
                >
                  제출
                </button>
              </>
            )}
            {quote.status === 'approved' && (
              <button 
                onClick={handleReservation}
                className="bg-indigo-500 text-white px-6 py-3 rounded-lg hover:bg-indigo-600"
              >
                🎫 예약하기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 서비스 아이템 카드 컴포넌트 - 매니저 스타일
function ServiceItemCard({ item, index }: { item: QuoteItem; index: number }) {
  const getServiceIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'cruise': return '🚢';
      case 'hotel': return '🏨';
      case 'airport': return '✈️';
      case 'tour': return '🎯';
      case 'rentcar': return '🚗';
      default: return '📋';
    }
  };

  const getServiceName = (serviceType: string) => {
    switch (serviceType) {
      case 'cruise': return '크루즈';
      case 'hotel': return '호텔';
      case 'airport': return '공항 서비스';
      case 'tour': return '투어';
      case 'rentcar': return '렌트카';
      default: return '서비스';
    }
  };

  const getStatusColor = (serviceType: string) => {
    switch (serviceType) {
      case 'cruise': return 'bg-blue-50 border-blue-200';
      case 'hotel': return 'bg-pink-50 border-pink-200';
      case 'airport': return 'bg-yellow-50 border-yellow-200';
      case 'tour': return 'bg-purple-50 border-purple-200';
      case 'rentcar': return 'bg-green-50 border-green-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor(item.service_type)}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getServiceIcon(item.service_type)}</span>
          <div>
            <h3 className="font-bold text-lg text-gray-900">
              {index}. {getServiceName(item.service_type)}
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>수량: {item.quantity}개</span>
              <span>서비스 ID: {item.service_ref_id}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-gray-900">
            {item.total_price?.toLocaleString() || 0}원
          </div>
          {item.unit_price > 0 && (
            <div className="text-sm text-gray-500">
              단가: {item.unit_price.toLocaleString()}원
            </div>
          )}
        </div>
      </div>

      {/* 서비스 상세 정보 */}
      {item.service_detail && (
        <ServiceDetailDisplay 
          serviceType={item.service_type}
          detail={item.service_detail}
          priceInfo={item.price_info}
        />
      )}
    </div>
  );
}

// 서비스별 상세 정보 표시 컴포넌트
function ServiceDetailDisplay({ serviceType, detail, priceInfo }: { 
  serviceType: string; 
  detail: any; 
  priceInfo: any; 
}) {
  switch (serviceType) {
    case 'cruise':
      return (
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-sm font-medium text-blue-800">크루즈 정보</span>
              <p className="text-blue-700 font-semibold">{detail.cruise_name || detail.cruise_code}</p>
              <p className="text-sm text-blue-600">
                {detail.departure_date} ~ {detail.return_date}
              </p>
              {detail.schedule_code && (
                <p className="text-xs text-blue-500">스케줄: {detail.schedule_code}</p>
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-blue-800">인원 구성</span>
              <p className="text-blue-700">
                성인 {detail.adult_count || 0}명, 아동 {detail.child_count || 0}명, 유아 {detail.infant_count || 0}명
              </p>
              <p className="text-sm text-blue-600">
                총 {(detail.adult_count || 0) + (detail.child_count || 0) + (detail.infant_count || 0)}명
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-blue-800">객실 정보</span>
              {detail.rooms_detail && detail.rooms_detail.length > 0 ? (
                detail.rooms_detail.map((room: any, idx: number) => (
                  <div key={idx} className="text-blue-700">
                    <p className="font-medium">{room.room_code}</p>
                    <p className="text-sm text-blue-600">
                      {Object.entries(room.categoryCounts || {}).map(([category, count]) => 
                        `${category}: ${count}명`
                      ).join(', ')}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-blue-700">객실 정보 없음</p>
              )}
            </div>
          </div>
          {priceInfo && (
            <div className="mt-4 pt-3 border-t border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-blue-800">가격 코드 정보</span>
                  <p className="text-sm text-blue-600">
                    스케줄: {priceInfo.schedule_code} | 크루즈: {priceInfo.cruise_code}
                  </p>
                  {priceInfo.room_code && (
                    <p className="text-sm text-blue-600">객실: {priceInfo.room_code}</p>
                  )}
                </div>
                <div>
                  <span className="text-sm font-medium text-blue-800">결제 정보</span>
                  <p className="text-sm text-blue-600">
                    결제코드: {priceInfo.payment_code || 'N/A'}
                  </p>
                  {priceInfo.base_price && (
                    <p className="text-sm text-blue-600">
                      기본가격: {priceInfo.base_price.toLocaleString()}원
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      );

    case 'rentcar':
      return (
        <div className="bg-green-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-sm font-medium text-green-800">렌트카 정보</span>
              <p className="text-green-700 font-semibold">{detail.rc_car_code || '차량 정보'}</p>
              <p className="text-sm text-green-600">
                {detail.pickup_date} ~ {detail.return_date}
              </p>
              {detail.rental_days && (
                <p className="text-xs text-green-500">{detail.rental_days}일간</p>
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-green-800">차량 분류</span>
              <p className="text-green-700">
                구분: {detail.rc_category_code || 'N/A'}
              </p>
              <p className="text-green-700">
                분류: {detail.rc_type_code || 'N/A'}
              </p>
              <p className="text-sm text-green-600">
                경로: {detail.rc_route_code || 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-green-800">추가 옵션</span>
              {detail.insurance_type && (
                <p className="text-green-700">보험: {detail.insurance_type}</p>
              )}
              {detail.driver_age && (
                <p className="text-sm text-green-600">운전자 연령: {detail.driver_age}세</p>
              )}
              {detail.pickup_location && (
                <p className="text-sm text-green-600">픽업: {detail.pickup_location}</p>
              )}
            </div>
          </div>
          {priceInfo && (
            <div className="mt-4 pt-3 border-t border-green-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-green-800">가격 코드 정보</span>
                  <p className="text-sm text-green-600">
                    카테고리: {priceInfo.rc_category_code} | 타입: {priceInfo.rc_type_code}
                  </p>
                  <p className="text-sm text-green-600">
                    경로: {priceInfo.rc_route_code} | 차량: {priceInfo.rc_car_code}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-green-800">요금 정보</span>
                  {priceInfo.price && (
                    <p className="text-sm text-green-600">
                      기간별 가격: {priceInfo.price.toLocaleString()}원
                    </p>
                  )}
                  {priceInfo.base_price && (
                    <p className="text-sm text-green-600">
                      기본 요금: {priceInfo.base_price.toLocaleString()}원
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      );

    case 'hotel':
      return (
        <div className="bg-pink-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-sm font-medium text-pink-800">호텔 정보</span>
              <p className="text-pink-700 font-semibold">{detail.hotel_name || '호텔명'}</p>
              <p className="text-sm text-pink-600">
                {detail.checkin_date} ~ {detail.checkout_date}
              </p>
              {detail.nights && (
                <p className="text-xs text-pink-500">{detail.nights}박</p>
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-pink-800">객실 정보</span>
              <p className="text-pink-700 font-medium">
                {detail.room_name || '객실명'}
              </p>
              <p className="text-pink-700">
                타입: {detail.room_type || 'N/A'}
              </p>
              <p className="text-sm text-pink-600">
                투숙객: {detail.guest_count || 1}명
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-pink-800">추가 정보</span>
              {detail.bed_type && (
                <p className="text-pink-700">침대: {detail.bed_type}</p>
              )}
              {detail.meal_plan && (
                <p className="text-pink-700">식사: {detail.meal_plan}</p>
              )}
              {detail.view_type && (
                <p className="text-sm text-pink-600">뷰: {detail.view_type}</p>
              )}
            </div>
          </div>
          {priceInfo && (
            <div className="mt-4 pt-3 border-t border-pink-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-pink-800">가격 코드 정보</span>
                  <p className="text-sm text-pink-600">
                    호텔: {priceInfo.hotel_name} | 객실: {priceInfo.room_name}
                  </p>
                  <p className="text-sm text-pink-600">
                    타입: {priceInfo.room_type}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-pink-800">요금 정보</span>
                  {priceInfo.price && (
                    <p className="text-sm text-pink-600">
                      1박 요금: {priceInfo.price.toLocaleString()}원
                    </p>
                  )}
                  {priceInfo.base_price && (
                    <p className="text-sm text-pink-600">
                      기본 요금: {priceInfo.base_price.toLocaleString()}원
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      );

    case 'tour':
      return (
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-sm font-medium text-purple-800">투어 정보</span>
              <p className="text-purple-700 font-semibold">{detail.tour_code || detail.tour_name}</p>
              <p className="text-sm text-purple-600">
                날짜: {detail.tour_date}
              </p>
              {detail.duration && (
                <p className="text-xs text-purple-500">소요시간: {detail.duration}</p>
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-purple-800">참가 정보</span>
              <p className="text-purple-700">
                참가자: {detail.participant_count || 1}명
              </p>
              {detail.guide_language && (
                <p className="text-sm text-purple-600">
                  가이드 언어: {detail.guide_language}
                </p>
              )}
              {detail.meeting_point && (
                <p className="text-sm text-purple-600">
                  집결지: {detail.meeting_point}
                </p>
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-purple-800">투어 옵션</span>
              {detail.meal_included && (
                <p className="text-purple-700">식사 포함: {detail.meal_included}</p>
              )}
              {detail.transport_included && (
                <p className="text-purple-700">교통 포함: {detail.transport_included}</p>
              )}
              {detail.difficulty_level && (
                <p className="text-sm text-purple-600">난이도: {detail.difficulty_level}</p>
              )}
            </div>
          </div>
          {detail.special_requests && (
            <div className="mt-3 pt-3 border-t border-purple-200">
              <span className="text-sm font-medium text-purple-800">특별 요청</span>
              <p className="text-sm text-purple-600">{detail.special_requests}</p>
            </div>
          )}
          {priceInfo && (
            <div className="mt-4 pt-3 border-t border-purple-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-purple-800">가격 코드 정보</span>
                  <p className="text-sm text-purple-600">
                    투어 코드: {priceInfo.tour_code}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-purple-800">요금 정보</span>
                  {priceInfo.price && (
                    <p className="text-sm text-purple-600">
                      1인 요금: {priceInfo.price.toLocaleString()}원
                    </p>
                  )}
                  {priceInfo.base_price && (
                    <p className="text-sm text-purple-600">
                      기본 요금: {priceInfo.base_price.toLocaleString()}원
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      );

    case 'airport':
      return (
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-sm font-medium text-yellow-800">공항 서비스</span>
              <p className="text-yellow-700 font-semibold">{detail.service_type || '공항 서비스'}</p>
              <p className="text-sm text-yellow-600">
                경로: {detail.route || 'N/A'}
              </p>
              {detail.service_date && (
                <p className="text-xs text-yellow-500">서비스일: {detail.service_date}</p>
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-yellow-800">차량 정보</span>
              <p className="text-yellow-700 font-medium">
                {detail.car_type || '차량 정보'}
              </p>
              <p className="text-sm text-yellow-600">
                승차 인원: {detail.passenger_count || 1}명
              </p>
              {detail.luggage_count && (
                <p className="text-sm text-yellow-600">
                  수하물: {detail.luggage_count}개
                </p>
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-yellow-800">추가 정보</span>
              {detail.pickup_time && (
                <p className="text-yellow-700">픽업시간: {detail.pickup_time}</p>
              )}
              {detail.pickup_location && (
                <p className="text-yellow-700">픽업장소: {detail.pickup_location}</p>
              )}
              {detail.flight_number && (
                <p className="text-sm text-yellow-600">항공편: {detail.flight_number}</p>
              )}
            </div>
          </div>
          {priceInfo && (
            <div className="mt-4 pt-3 border-t border-yellow-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-yellow-800">가격 코드 정보</span>
                  <p className="text-sm text-yellow-600">
                    서비스: {priceInfo.service_type} | 경로: {priceInfo.route}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-yellow-800">요금 정보</span>
                  {priceInfo.price && (
                    <p className="text-sm text-yellow-600">
                      서비스 요금: {priceInfo.price.toLocaleString()}원
                    </p>
                  )}
                  {priceInfo.base_price && (
                    <p className="text-sm text-yellow-600">
                      기본 요금: {priceInfo.base_price.toLocaleString()}원
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      );

    default:
      return (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-800">서비스 정보</span>
              <p className="text-gray-700">서비스 타입: {serviceType}</p>
              <p className="text-sm text-gray-600">
                상세 정보 표시 준비 중...
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-800">원본 데이터</span>
              <div className="text-xs text-gray-500 max-h-20 overflow-y-auto">
                <pre>{JSON.stringify(detail, null, 2)}</pre>
              </div>
            </div>
          </div>
          {priceInfo && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-800">가격 정보</span>
              <div className="text-xs text-gray-500 max-h-16 overflow-y-auto">
                <pre>{JSON.stringify(priceInfo, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      );
  }
}
