'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';
import supabase from '@/lib/supabase';

interface Quote {
  id: number;
  quote_number: string;
  name: string;
  total_price: number;
  status: 'pending' | 'approved' | 'rejected';
  cruise_name?: string;
  departure_date?: string;
  return_date?: string;
  departure_port?: string;
  created_at: string;
  quote_items?: QuoteItem[];
}

interface QuoteItem {
  id: number;
  service_type: string;
  service_ref_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  airport?: any;
  hotel?: any;
  rentcar?: any;
  quote_room?: any;
  quote_car?: any;
}

export default function QuoteDetailViewPage() {
  const router = useRouter();
  const params = useParams();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('guest');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !authUser) {
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }

      setUser(authUser);

      // 사용자 역할 확인 (게스트는 users 테이블에 등록되지 않음)
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', authUser.id)
        .single();

      setUserRole(userData?.role || 'guest');
      await loadQuoteDetails(authUser);
    } catch (error) {
      console.error('인증 확인 오류:', error);
      alert('인증 확인 중 오류가 발생했습니다.');
      router.push('/login');
    }
  };

  const loadQuoteDetails = async (authUser: any) => {
    try {
      const quoteId = params.id;
      if (!quoteId) {
        alert('견적 ID가 필요합니다.');
        router.push('/mypage/quotes');
        return;
      }

      // 견적 기본 정보 조회
      const { data: quoteData, error: quoteError } = await supabase
        .from('quote')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (quoteError) {
        console.error('견적 조회 오류:', quoteError);
        alert('견적을 찾을 수 없습니다.');
        router.push('/mypage/quotes');
        return;
      }

      // 견적 소유권 확인 (guest는 auth.uid()로만 확인)
      if (quoteData.user_id !== authUser.id) {
        alert('접근 권한이 없습니다.');
        router.push('/mypage/quotes');
        return;
      }

      // 견적 항목 상세 조회
      const { data: itemsData, error: itemsError } = await supabase
        .from('quote_item')
        .select(`
          *,
          airport(*),
          hotel(*),
          rentcar(*),
          quote_room(*),
          quote_car(*)
        `)
        .eq('quote_id', quoteId);

      if (itemsError) {
        console.error('견적 항목 조회 오류:', itemsError);
      }

      setQuote({
        ...quoteData,
        quote_items: itemsData || []
      });
    } catch (error) {
      console.error('견적 상세 조회 오류:', error);
      alert('견적 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleReservationRequest = async () => {
    if (!quote || !user) return;

    try {
      // 견적이 승인되지 않은 경우 알림
      if (quote.status !== 'approved') {
        alert('승인된 견적만 예약할 수 있습니다.');
        return;
      }

      // 게스트인 경우 자동으로 회원 등록
      if (userRole === 'guest') {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single();

        if (!existingUser) {
          const { error: insertError } = await supabase.from('users').insert({
            id: user.id,
            email: user.email,
            role: 'member',
            name: quote.name,
            created_at: new Date().toISOString()
          });

          if (insertError) {
            console.error('회원 등록 오류:', insertError);
            alert('회원 등록 중 오류가 발생했습니다.');
            return;
          }
        }
      }

      // 예약 페이지로 이동
      router.push(`/reservation/cruise/new?quote_id=${quote.id}`);
    } catch (error) {
      console.error('예약 요청 오류:', error);
      alert('예약 요청 중 오류가 발생했습니다.');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '검토중';
      case 'approved': return '승인됨';
      case 'rejected': return '거부됨';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderServiceItem = (item: QuoteItem) => {
    const { service_type } = item;
    let serviceName = '';
    let serviceDetails = '';

    switch (service_type) {
      case 'airport':
        serviceName = '공항 서비스';
        serviceDetails = item.airport ? `${item.airport.airport_name} - ${item.airport.service_type}` : '';
        break;
      case 'hotel':
        serviceName = '호텔';
        serviceDetails = item.hotel ? `${item.hotel.hotel_name}` : '';
        break;
      case 'rentcar':
        serviceName = '렌터카';
        serviceDetails = item.rentcar ? `${item.rentcar.car_model}` : '';
        break;
      case 'quote_room':
        serviceName = '객실';
        serviceDetails = item.quote_room ? `${item.quote_room.room_code}` : '';
        break;
      case 'quote_car':
        serviceName = '차량';
        serviceDetails = item.quote_car ? `${item.quote_car.car_code}` : '';
        break;
      default:
        serviceName = service_type;
    }

    return (
      <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-medium text-gray-900">{serviceName}</h4>
            {serviceDetails && (
              <p className="text-sm text-gray-600 mt-1">{serviceDetails}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">수량: {item.quantity}</p>
          </div>
          {quote?.status === 'approved' && (
            <div className="text-right">
              <p className="text-sm text-gray-600">
                단가: {formatPrice(item.unit_price)}원
              </p>
              <p className="font-medium text-gray-900">
                소계: {formatPrice(item.total_price)}원
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">견적 정보를 불러오는 중...</p>
        </div>
      </PageWrapper>
    );
  }

  if (!quote) {
    return (
      <PageWrapper>
        <div className="text-center py-8">
          <p className="text-gray-600">견적을 찾을 수 없습니다.</p>
          <button
            onClick={() => router.push('/mypage/quotes')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            견적 목록으로 돌아가기
          </button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">견적 상세보기</h1>
            <p className="text-gray-600 mt-1">견적번호: {quote.quote_number}</p>
          </div>
          <div className="flex gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(quote.status)}`}>
              {getStatusText(quote.status)}
            </span>
          </div>
        </div>

        {/* 기본 정보 */}
        <SectionBox title="기본 정보">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                신청자명
              </label>
              <p className="text-gray-900">{quote.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                작성일
              </label>
              <p className="text-gray-900">
                {new Date(quote.created_at).toLocaleDateString('ko-KR')}
              </p>
            </div>
            {quote.cruise_name && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  크루즈명
                </label>
                <p className="text-gray-900">{quote.cruise_name}</p>
              </div>
            )}
            {quote.departure_date && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  출발일
                </label>
                <p className="text-gray-900">
                  {new Date(quote.departure_date).toLocaleDateString('ko-KR')}
                </p>
              </div>
            )}
            {quote.return_date && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  도착일
                </label>
                <p className="text-gray-900">
                  {new Date(quote.return_date).toLocaleDateString('ko-KR')}
                </p>
              </div>
            )}
            {quote.departure_port && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  출발항구
                </label>
                <p className="text-gray-900">{quote.departure_port}</p>
              </div>
            )}
          </div>
        </SectionBox>

        {/* 견적 항목 */}
        <SectionBox title="견적 항목">
          {quote.quote_items && quote.quote_items.length > 0 ? (
            <div className="space-y-4">
              {quote.quote_items.map(renderServiceItem)}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">견적 항목이 없습니다.</p>
          )}
        </SectionBox>

        {/* 총 금액 (승인된 경우에만 표시) */}
        {quote.status === 'approved' && (
          <SectionBox title="총 견적 금액">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-gray-900">총 금액</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatPrice(quote.total_price)}원
                </span>
              </div>
            </div>
          </SectionBox>
        )}

        {/* 액션 버튼 */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={() => router.push('/mypage/quotes')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            목록으로 돌아가기
          </button>
          
          {quote.status === 'approved' && (
            <button
              onClick={handleReservationRequest}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              예약하기
            </button>
          )}
        </div>

        {/* 상태별 안내 메시지 */}
        {quote.status === 'pending' && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">
              <strong>검토중:</strong> 견적이 검토 중입니다. 승인 후 가격 정보와 예약 기능을 이용하실 수 있습니다.
            </p>
          </div>
        )}
        
        {quote.status === 'rejected' && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">
              <strong>거부됨:</strong> 견적이 거부되었습니다. 새로운 견적을 요청해 주세요.
            </p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}