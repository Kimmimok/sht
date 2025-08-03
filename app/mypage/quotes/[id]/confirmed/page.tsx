'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

export default function ConfirmedQuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<any>(null);
  const [quoteItems, setQuoteItems] = useState<any[]>([]);

  useEffect(() => {
    checkAuthAndLoadData();
  }, [quoteId]);

  const checkAuthAndLoadData = async () => {
    try {
      setLoading(true);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }

      await loadQuoteDetail();
    } catch (error) {
      console.error('인증 확인 오류:', error);
      alert('인증 처리 중 오류가 발생했습니다.');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleReservation = async () => {
    try {
      if (!quote) {
        alert('견적 정보를 찾을 수 없습니다.');
        return;
      }

      router.push(`/mypage/reservations/cruise-new?quoteId=${quote.id}`);
    } catch (error) {
      console.error('예약 처리 오류:', error);
      alert('예약 처리 중 오류가 발생했습니다.');
    }
  };

  const loadQuoteDetail = async () => {
    try {
      const { data: quoteData, error: quoteError } = await supabase
        .from('quote')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (quoteError) {
        console.error('견적 조회 오류:', quoteError);
        alert('견적을 찾을 수 없습니다.');
        router.push('/mypage/quotes/confirmed');
        return;
      }

      if (!quoteData) {
        alert('견적을 찾을 수 없습니다.');
        router.push('/mypage/quotes/confirmed');
        return;
      }

      setQuote(quoteData);

      const { data: itemsData, error: itemsError } = await supabase
        .from('quote_item')
        .select('*')
        .eq('quote_id', quoteId);

      if (itemsError) {
        console.error('Quote items 조회 오류:', itemsError);
      } else {
        setQuoteItems(itemsData || []);
      }
    } catch (error) {
      console.error('견적 상세 정보 로딩 오류:', error);
      alert('견적 정보를 불러오는 중 오류가 발생했습니다.');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  };

  const formatPrice = (price: number) => {
    return price?.toLocaleString() || '0';
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
        <div className="text-center py-8">
          <p className="text-gray-600">견적을 찾을 수 없습니다.</p>
          <button
            onClick={() => router.push('/mypage/quotes/confirmed')}
            className="mt-4 btn"
          >
            목록으로 돌아가기
          </button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-gray-800">확정견적 상세보기</h1>
            <p className="text-sm text-gray-600 mt-1">견적번호: {quote.id}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/mypage/quotes/confirmed')}
              className="px-3 py-1 bg-gray-50 text-gray-600 rounded border text-sm hover:bg-gray-100"
            >
              목록으로
            </button>
            <button
              onClick={handleReservation}
              className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 font-medium"
            >
              예약하기
            </button>
          </div>
        </div>

        <SectionBox title="기본 정보">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-600">제목:</span>
              <p className="font-medium">{quote.title || '제목 없음'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">출항일:</span>
              <p className="font-medium">{formatDate(quote.departure_date)}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">귀항일:</span>
              <p className="font-medium">{formatDate(quote.return_date)}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">총 인원:</span>
              <p className="font-medium">{quote.total_people || 0}명</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">총 금액:</span>
              <p className="font-medium text-blue-600">{formatPrice(quote.total_price)}원</p>
            </div>
          </div>

          {quote.description && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <span className="text-sm text-gray-600">설명:</span>
              <p className="mt-1 text-sm">{quote.description}</p>
            </div>
          )}
        </SectionBox>

        <SectionBox title="인원 구성">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded">
              <p className="text-sm text-gray-600">성인</p>
              <p className="text-lg font-bold text-blue-600">{quote.adults || 0}명</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded">
              <p className="text-sm text-gray-600">아동</p>
              <p className="text-lg font-bold text-green-600">{quote.children || 0}명</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded">
              <p className="text-sm text-gray-600">유아</p>
              <p className="text-lg font-bold text-yellow-600">{quote.infants || 0}명</p>
            </div>
          </div>
        </SectionBox>

        {quoteItems.length > 0 && (
          <SectionBox title="서비스 항목">
            <div className="space-y-3">
              {quoteItems.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded p-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">서비스:</span>
                      <p className="font-medium">{item.service_type || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">수량:</span>
                      <p className="font-medium">{item.quantity || 0}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">단가:</span>
                      <p className="font-medium">{formatPrice(item.unit_price)}원</p>
                    </div>
                    <div>
                      <span className="text-gray-600">합계:</span>
                      <p className="font-medium text-blue-600">{formatPrice(item.total_price)}원</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionBox>
        )}

        <SectionBox title="상태 정보">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-600">상태:</span>
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                확정완료
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-600">생성일:</span>
              <p className="font-medium">{formatDate(quote.created_at)}</p>
            </div>
          </div>
        </SectionBox>

        <div className="flex justify-center pt-6">
          <button
            onClick={handleReservation}
            className="px-6 py-3 bg-blue-500 text-white rounded font-medium hover:bg-blue-600 transition-colors"
          >
            이 견적으로 예약하기
          </button>
        </div>
      </div>
    </PageWrapper>
  );
}

useEffect(() => {
  checkAuthAndLoadData();
}, [quoteId]);

const checkAuthAndLoadData = async () => {
  try {
    setLoading(true);

    // 사용자 인증 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      alert('로그인이 필요합니다.');
      router.push('/login');
      return;
    }

    await loadQuoteDetail();
  } catch (error) {
    console.error('인증 확인 오류:', error);
    alert('인증 처리 중 오류가 발생했습니다.');
    router.push('/login');
  } finally {
    setLoading(false);
  }
};

const handleReservation = async () => {
  try {
    if (!quote) {
      alert('견적 정보를 찾을 수 없습니다.');
      return;
    }

    // 간단하게 견적 ID만 전달하여 예약 페이지로 이동
    router.push(`/mypage/reservations/cruise-new?quoteId=${quote.id}`);
  } catch (error) {
    console.error('예약 처리 오류:', error);
    alert('예약 처리 중 오류가 발생했습니다.');
  }
};

const loadQuoteDetail = async () => {
  try {
    console.log('📋 견적 상세 정보 로딩 시작...', quoteId);

    // 견적 기본 정보 조회
    const { data: quoteData, error: quoteError } = await supabase
      .from('quote')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (quoteError) {
      console.error('견적 조회 오류:', quoteError);
      alert('견적을 찾을 수 없습니다.');
      router.push('/mypage/quotes/confirmed');
      return;
    }

    if (!quoteData) {
      alert('견적을 찾을 수 없습니다.');
      router.push('/mypage/quotes/confirmed');
      return;
    }

    setQuote(quoteData);
    console.log('✅ 견적 기본 정보 로딩 완료:', quoteData);

    // quote_item 정보 조회
    const { data: itemsData, error: itemsError } = await supabase
      .from('quote_item')
      .select('*')
      .eq('quote_id', quoteId);

    if (itemsError) {
      console.error('Quote items 조회 오류:', itemsError);
    } else {
      setQuoteItems(itemsData || []);
      console.log('✅ Quote items 로딩 완료:', itemsData);
    }

  } catch (error) {
    console.error('견적 상세 정보 로딩 오류:', error);
    alert('견적 정보를 불러오는 중 오류가 발생했습니다.');
  }
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  });
};

const formatPrice = (price: number) => {
  return price?.toLocaleString() || '0';
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
      <div className="text-center py-8">
        <p className="text-gray-600">견적을 찾을 수 없습니다.</p>
        <button
          onClick={() => router.push('/mypage/quotes/confirmed')}
          className="mt-4 btn"
        >
          목록으로 돌아가기
        </button>
      </div>
    </PageWrapper>
  );
}

return (
  <PageWrapper>
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-gray-800">확정견적 상세보기</h1>
          <p className="text-sm text-gray-600 mt-1">견적번호: {quote.id}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/mypage/quotes/confirmed')}
            className="px-3 py-1 bg-gray-50 text-gray-600 rounded border text-sm hover:bg-gray-100"
          >
            목록으로
          </button>
          <button
            onClick={handleReservation}
            className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 font-medium"
          >
            예약하기
          </button>
        </div>
      </div>

      {/* 기본 정보 */}
      <SectionBox title="기본 정보">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-600">제목:</span>
            <p className="font-medium">{quote.title || '제목 없음'}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">크루즈:</span>
            <p className="font-medium">{quote.cruise_name || '-'}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">출항일:</span>
            <p className="font-medium">{formatDate(quote.departure_date)}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">귀항일:</span>
            <p className="font-medium">{formatDate(quote.return_date)}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">총 인원:</span>
            <p className="font-medium">{quote.total_people || 0}명</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">총 금액:</span>
            <p className="font-medium text-blue-600">{formatPrice(quote.total_price)}원</p>
          </div>
        </div>

        {quote.description && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <span className="text-sm text-gray-600">설명:</span>
            <p className="mt-1 text-sm">{quote.description}</p>
          </div>
        )}
      </SectionBox>

      {/* 인원 구성 */}
      <SectionBox title="인원 구성">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded">
            <p className="text-sm text-gray-600">성인</p>
            <p className="text-lg font-bold text-blue-600">{quote.adults || 0}명</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded">
            <p className="text-sm text-gray-600">아동</p>
            <p className="text-lg font-bold text-green-600">{quote.children || 0}명</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded">
            <p className="text-sm text-gray-600">유아</p>
            <p className="text-lg font-bold text-yellow-600">{quote.infants || 0}명</p>
          </div>
        </div>
      </SectionBox>

      {/* 서비스 항목 */}
      {quoteItems.length > 0 && (
        <SectionBox title="서비스 항목">
          <div className="space-y-3">
            {quoteItems.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded p-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">서비스:</span>
                    <p className="font-medium">{item.service_type || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">수량:</span>
                    <p className="font-medium">{item.quantity || 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">단가:</span>
                    <p className="font-medium">{formatPrice(item.unit_price)}원</p>
                  </div>
                  <div>
                    <span className="text-gray-600">합계:</span>
                    <p className="font-medium text-blue-600">{formatPrice(item.total_price)}원</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionBox>
      )}

      {/* 상태 정보 */}
      <SectionBox title="상태 정보">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-600">상태:</span>
            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
              확정완료
            </span>
          </div>
          <div>
            <span className="text-sm text-gray-600">생성일:</span>
            <p className="font-medium">{formatDate(quote.created_at)}</p>
          </div>
        </div>
      </SectionBox>

      {/* 액션 버튼 */}
      <div className="flex justify-center pt-6">
        <button
          onClick={handleReservation}
          className="px-6 py-3 bg-blue-500 text-white rounded font-medium hover:bg-blue-600 transition-colors"
        >
          이 견적으로 예약하기
        </button>
      </div>
    </div>
  </PageWrapper>
);
}

// 간단하게 견적 ID만 전달하여 예약 페이지로 이동
router.push(`/mypage/reservations/cruise-new?quoteId=${quote.id}`);
    } catch (error) {
  console.error('예약 처리 오류:', error);
  alert('예약 처리 중 오류가 발생했습니다.');
}
  };
created_at: string;
updated_at: string;
user_id: string;
departure_date: string;
return_date: string;
adult_count: number;
child_count: number;
infant_count: number;
cruise_name ?: string;
manager_note ?: string;
users ?: {
  name: string;
  email: string;
  phone_number?: string;
};
}

export default function QuoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<QuoteDetail | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && quoteId) {
      loadQuoteDetail();
    }
  }, [user, quoteId]);

  const checkAuth = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        alert('로그인이 필요합니다.');
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

  const handleReservation = async () => {
    try {
      if (!quote) {
        alert('견적 정보를 찾을 수 없습니다.');
        return;
      }

      // 견적 데이터 조회 - 실제 테이블 컬럼명 사용
      const { data: quoteData, error } = await supabase
        .from('quote')
        .select(`
          id,
          title,
          cruise_name,
          departure_date,
          return_date,
          total_price,
          quote_item (
            service_type,
            service_ref_id,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq('id', quoteId)
        .single();

      if (error) {
        console.error('견적 조회 오류:', error);
        alert('견적 데이터를 가져올 수 없습니다.');
        return;
      }

      if (!quoteData) {
        alert('견적을 찾을 수 없습니다.');
        return;
      }

      // 견적 데이터를 URL 파라미터로 전달하여 예약 페이지로 이동
      const reservationData = {
        quoteId: quoteData.id,
        title: quoteData.title,
        cruiseCode: quoteData.cruise_name,
        scheduleCode: quoteData.cruise_name, // cruise_name을 schedule로도 사용
        checkin: quoteData.departure_date,
        checkout: quoteData.return_date,
        totalPrice: quoteData.total_price,
        services: (quoteData.quote_item || []).map((item: any) => ({
          type: item.service_type,
          code: item.service_ref_id, // service_ref_id를 code로 사용
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.total_price
        }))
      };

      // 데이터를 Base64로 인코딩하여 URL에 전달
      const encodedData = btoa(JSON.stringify(reservationData));
      router.push(`/mypage/reservations/cruise-new?data=${encodedData}`);
    } catch (error) {
      console.error('예약 처리 오류:', error);
      alert('예약 처리 중 오류가 발생했습니다.');
    }
  };

  const loadQuoteDetail = async () => {
    try {
      console.log('📋 견적 상세 정보 로딩 시작...', quoteId);

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

      console.log('✅ 견적 기본 정보:', quoteData);

      // 사용자 정보 조회 (안전한 방식)
      let userData = null;
      try {
        const { data: userResult, error: userError } = await supabase
          .from('users')
          .select('id, name, email, phone_number')
          .eq('id', quoteData.user_id)
          .single();

        if (userError) {
          console.warn('⚠️ 사용자 정보 조회 실패:', userError);
        } else {
          userData = userResult;
        }
      } catch (userErr) {
        console.warn('⚠️ 사용자 정보 조회 예외:', userErr);
      }

      console.log('👤 사용자 정보:', userData);

      const detailedQuote: QuoteDetail = {
        ...quoteData,
        users: userData || { name: '알 수 없음', email: '미확인', phone_number: '미확인' }
      };

      console.log('✅ 견적 상세 정보 로드 완료:', detailedQuote);
      setQuote(detailedQuote);

    } catch (error) {
      console.error('❌ 견적 상세 정보 로드 실패:', error);
      alert('견적 정보를 불러오는데 실패했습니다.');
      router.push('/mypage/quotes');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-50 text-yellow-600',
      submitted: 'bg-yellow-50 text-yellow-600',
      draft: 'bg-gray-50 text-gray-600',
      confirmed: 'bg-blue-50 text-blue-600',
      approved: 'bg-blue-50 text-blue-600',
      rejected: 'bg-red-50 text-red-600'
    };
    const labels = {
      pending: '검토 대기',
      submitted: '제출됨',
      draft: '임시저장',
      confirmed: '확정됨 (예약)',
      approved: '승인됨',
      rejected: '거절됨'
    };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badges[status as keyof typeof badges] || 'bg-gray-50 text-gray-600'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  if (loading || !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">견적 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/mypage/quotes')}
                className="p-2 text-gray-300 hover:text-gray-500"
              >
                ← 목록으로
              </button>
              <h1 className="text-2xl font-bold text-gray-700">📋 {quote.cruise_name || '크루즈 견적'}</h1>
              {getStatusBadge(quote.status)}
            </div>
            <div className="text-sm text-gray-400">사용자: {user?.email}</div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-8">
          {/* 메인 콘텐츠 */}
          <div className="space-y-6">
            {/* 고객 정보 */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-600 mb-4">👤 고객 정보</h2>
              <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                <tbody>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25 w-32">닉네임</td>
                    <td className="px-2 py-1 border-blue-100 border">{quote.users?.name || '정보 없음'}</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">이메일</td>
                    <td className="px-2 py-1 border-blue-100 border">{quote.users?.email || '정보 없음'}</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">연락처</td>
                    <td className="px-2 py-1 border-blue-100 border">{quote.users?.phone_number || '정보 없음'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 견적 기본 정보 */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-600 mb-4">🚢 견적 정보</h2>
              <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                <tbody>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25 w-32">크루즈명</td>
                    <td className="px-2 py-1 border-blue-100 border">{quote.cruise_name || '미정'}</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">출발일</td>
                    <td className="px-2 py-1 border-blue-100 border">
                      {quote.departure_date ? new Date(quote.departure_date).toLocaleDateString() : '미정'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">귀항일</td>
                    <td className="px-2 py-1 border-blue-100 border">
                      {quote.return_date ? new Date(quote.return_date).toLocaleDateString() : '미정'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">성인</td>
                    <td className="px-2 py-1 border-blue-100 border">{quote.adult_count || 0}명</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">아동</td>
                    <td className="px-2 py-1 border-blue-100 border">{quote.child_count || 0}명</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">유아</td>
                    <td className="px-2 py-1 border-blue-100 border">{quote.infant_count || 0}명</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 전체 견적 금액 요약 */}
            <div className="bg-white shadow-sm rounded-lg p-6 border-2 border-blue-200">
              <h2 className="text-xl font-bold text-gray-800 mb-6">💰 견적 금액 요약</h2>

              {/* 총 합계 */}
              <div className="border-t-2 border-blue-200 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-800">총 견적 금액</span>
                  <span className="text-3xl font-bold text-blue-600">
                    {(quote.total_price || 0).toLocaleString()}원
                  </span>
                </div>
              </div>
            </div>

            {/* 매니저 노트 */}
            {quote.manager_note && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h2 className="text-lg font-medium text-yellow-800 mb-4">📝 매니저 노트</h2>
                <p className="text-sm text-yellow-700">{quote.manager_note}</p>
              </div>
            )}

            {/* 예약하기 버튼 - 페이지 하단 */}
            <div className="flex justify-center mt-10">
              <button
                onClick={handleReservation}
                className="bg-blue-300 text-white px-10 py-4 rounded-lg text-lg hover:bg-blue-400 transition-colors font-bold shadow-sm"
              >
                🚢 예약하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface QuoteDetail {
  id: string;
  status: string;
  total_price: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  departure_date: string;
  return_date: string;
  adult_count: number;
  child_count: number;
  infant_count: number;
  cruise_name?: string;
  manager_note?: string;
  users?: {
    name: string;
    email: string;
    phone_number?: string;
  };
}

export default function QuoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<QuoteDetail | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && quoteId) {
      loadQuoteDetail();
    }
  }, [user, quoteId]);

  const checkAuth = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        alert('로그인이 필요합니다.');
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

  const handleReservation = async () => {
    try {
      if (!quote) {
        alert('견적 정보를 찾을 수 없습니다.');
        return;
      }

      // 견적 데이터 조회 - 실제 테이블 컬럼명 사용
      const { data: quoteData, error } = await supabase
        .from('quote')
        .select(`
          id,
          title,
          cruise_name,
          departure_date,
          return_date,
          total_price,
          quote_item (
            service_type,
            service_ref_id,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq('id', quoteId)
        .single();

      if (error) {
        console.error('견적 조회 오류:', error);
        alert('견적 데이터를 가져올 수 없습니다.');
        return;
      }

      if (!quoteData) {
        alert('견적을 찾을 수 없습니다.');
        return;
      }

      // 견적 데이터를 URL 파라미터로 전달하여 예약 페이지로 이동
      const reservationData = {
        quoteId: quoteData.id,
        title: quoteData.title,
        cruiseCode: quoteData.cruise_name,
        scheduleCode: quoteData.cruise_name, // cruise_name을 schedule로도 사용
        checkin: quoteData.departure_date,
        checkout: quoteData.return_date,
        totalPrice: quoteData.total_price,
        services: (quoteData.quote_item || []).map((item: any) => ({
          type: item.service_type,
          code: item.service_ref_id, // service_ref_id를 code로 사용
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.total_price
        }))
      };

      // 데이터를 Base64로 인코딩하여 URL에 전달
      const encodedData = btoa(JSON.stringify(reservationData));
      router.push(`/mypage/reservations/cruise-new?data=${encodedData}`);
    } catch (error) {
      console.error('예약 처리 오류:', error);
      alert('예약 처리 중 오류가 발생했습니다.');
    }
  };

  const loadQuoteDetail = async () => {
    try {
      console.log('📋 견적 상세 정보 로딩 시작...', quoteId);

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

      console.log('✅ 견적 기본 정보:', quoteData);

      // 사용자 정보 조회 (안전한 방식)
      let userData = null;
      try {
        const { data: userResult, error: userError } = await supabase
          .from('users')
          .select('id, name, email, phone_number')
          .eq('id', quoteData.user_id)
          .single();

        if (userError) {
          console.warn('⚠️ 사용자 정보 조회 실패:', userError);
        } else {
          userData = userResult;
        }
      } catch (userErr) {
        console.warn('⚠️ 사용자 정보 조회 예외:', userErr);
      }

      console.log('👤 사용자 정보:', userData);

      const detailedQuote: QuoteDetail = {
        ...quoteData,
        users: userData || { name: '알 수 없음', email: '미확인', phone_number: '미확인' }
      };

      console.log('✅ 견적 상세 정보 로드 완료:', detailedQuote);
      setQuote(detailedQuote);

    } catch (error) {
      console.error('❌ 견적 상세 정보 로드 실패:', error);
      alert('견적 정보를 불러오는데 실패했습니다.');
      router.push('/mypage/quotes');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-50 text-yellow-600',
      submitted: 'bg-yellow-50 text-yellow-600',
      draft: 'bg-gray-50 text-gray-600',
      confirmed: 'bg-blue-50 text-blue-600',
      approved: 'bg-blue-50 text-blue-600',
      rejected: 'bg-red-50 text-red-600'
    };
    const labels = {
      pending: '검토 대기',
      submitted: '제출됨',
      draft: '임시저장',
      confirmed: '확정됨 (예약)',
      approved: '승인됨',
      rejected: '거절됨'
    };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badges[status as keyof typeof badges] || 'bg-gray-50 text-gray-600'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  if (loading || !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">견적 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/mypage/quotes')}
                className="p-2 text-gray-300 hover:text-gray-500"
              >
                ← 목록으로
              </button>
              <h1 className="text-2xl font-bold text-gray-700">📋 {quote.cruise_name || '크루즈 견적'}</h1>
              {getStatusBadge(quote.status)}
            </div>
            <div className="text-sm text-gray-400">사용자: {user?.email}</div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-8">
          {/* 메인 콘텐츠 */}
          <div className="space-y-6">
            {/* 고객 정보 */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-600 mb-4">👤 고객 정보</h2>
              <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                <tbody>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25 w-32">닉네임</td>
                    <td className="px-2 py-1 border-blue-100 border">{quote.users?.name || '정보 없음'}</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">이메일</td>
                    <td className="px-2 py-1 border-blue-100 border">{quote.users?.email || '정보 없음'}</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">연락처</td>
                    <td className="px-2 py-1 border-blue-100 border">{quote.users?.phone_number || '정보 없음'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 견적 기본 정보 */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-600 mb-4">🚢 견적 정보</h2>
              <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                <tbody>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25 w-32">크루즈명</td>
                    <td className="px-2 py-1 border-blue-100 border">{quote.cruise_name || '미정'}</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">출발일</td>
                    <td className="px-2 py-1 border-blue-100 border">
                      {quote.departure_date ? new Date(quote.departure_date).toLocaleDateString() : '미정'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">귀항일</td>
                    <td className="px-2 py-1 border-blue-100 border">
                      {quote.return_date ? new Date(quote.return_date).toLocaleDateString() : '미정'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">성인</td>
                    <td className="px-2 py-1 border-blue-100 border">{quote.adult_count || 0}명</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">아동</td>
                    <td className="px-2 py-1 border-blue-100 border">{quote.child_count || 0}명</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">유아</td>
                    <td className="px-2 py-1 border-blue-100 border">{quote.infant_count || 0}명</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 전체 견적 금액 요약 */}
            <div className="bg-white shadow-sm rounded-lg p-6 border-2 border-blue-200">
              <h2 className="text-xl font-bold text-gray-800 mb-6">💰 견적 금액 요약</h2>

              {/* 총 합계 */}
              <div className="border-t-2 border-blue-200 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-800">총 견적 금액</span>
                  <span className="text-3xl font-bold text-blue-600">
                    {(quote.total_price || 0).toLocaleString()}원
                  </span>
                </div>
              </div>
            </div>

            {/* 매니저 노트 */}
            {quote.manager_note && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h2 className="text-lg font-medium text-yellow-800 mb-4">📝 매니저 노트</h2>
                <p className="text-sm text-yellow-700">{quote.manager_note}</p>
              </div>
            )}

            {/* 예약하기 버튼 - 페이지 하단 */}
            <div className="flex justify-center mt-10">
              <button
                onClick={handleReservation}
                className="bg-blue-300 text-white px-10 py-4 rounded-lg text-lg hover:bg-blue-400 transition-colors font-bold shadow-sm"
              >
                🚢 예약하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

    } catch (error) {
  console.error('❌ 견적 상세 정보 로드 실패:', error);
  alert('견적 정보를 불러오는데 실패했습니다.');
  router.push('/mypage/quotes');
}
  };

const getStatusBadge = (status: string) => {
  const badges = {
    pending: 'bg-yellow-50 text-yellow-600',
    submitted: 'bg-yellow-50 text-yellow-600',
    draft: 'bg-gray-50 text-gray-600',
    confirmed: 'bg-blue-50 text-blue-600',
    approved: 'bg-blue-50 text-blue-600',
    rejected: 'bg-red-50 text-red-600'
  };
  const labels = {
    pending: '검토 대기',
    submitted: '제출됨',
    draft: '임시저장',
    confirmed: '확정됨 (예약)',
    approved: '승인됨',
    rejected: '거절됨'
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badges[status as keyof typeof badges] || 'bg-gray-50 text-gray-600'}`}>
      {labels[status as keyof typeof labels] || status}
    </span>
  );
};

if (loading || !quote) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-600">견적 정보를 불러오는 중...</p>
      </div>
    </div>
  );
}

return (
  <div className="min-h-screen bg-gray-50">
    {/* 헤더 */}
    <div className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/mypage/quotes')}
              className="p-2 text-gray-300 hover:text-gray-500"
            >
              ← 목록으로
            </button>
            <h1 className="text-2xl font-bold text-gray-700">📋 {quote.cruise_name || '크루즈 견적'}</h1>
            {getStatusBadge(quote.status)}
          </div>
          <div className="text-sm text-gray-400">사용자: {user?.email}</div>
        </div>
      </div>
    </div>

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 gap-8">
        {/* 메인 콘텐츠 */}
        <div className="space-y-6">
          {/* 고객 정보 */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-600 mb-4">👤 고객 정보</h2>
            <table className="min-w-full text-sm text-gray-600 border border-blue-100">
              <tbody>
                <tr>
                  <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25 w-32">닉네임</td>
                  <td className="px-2 py-1 border-blue-100 border">{quote.users?.name || '정보 없음'}</td>
                </tr>
                <tr>
                  <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">이메일</td>
                  <td className="px-2 py-1 border-blue-100 border">{quote.users?.email || '정보 없음'}</td>
                </tr>
                <tr>
                  <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">연락처</td>
                  <td className="px-2 py-1 border-blue-100 border">{quote.users?.phone_number || '정보 없음'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 견적 기본 정보 */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-600 mb-4">🚢 견적 정보</h2>
            <table className="min-w-full text-sm text-gray-600 border border-blue-100">
              <tbody>
                <tr>
                  <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25 w-32">크루즈명</td>
                  <td className="px-2 py-1 border-blue-100 border">{quote.cruise_name || '미정'}</td>
                </tr>
                <tr>
                  <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">출발일</td>
                  <td className="px-2 py-1 border-blue-100 border">
                    {quote.departure_date ? new Date(quote.departure_date).toLocaleDateString() : '미정'}
                  </td>
                </tr>
                <tr>
                  <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">귀항일</td>
                  <td className="px-2 py-1 border-blue-100 border">
                    {quote.return_date ? new Date(quote.return_date).toLocaleDateString() : '미정'}
                  </td>
                </tr>
                <tr>
                  <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">성인</td>
                  <td className="px-2 py-1 border-blue-100 border">{quote.adult_count || 0}명</td>
                </tr>
                <tr>
                  <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">아동</td>
                  <td className="px-2 py-1 border-blue-100 border">{quote.child_count || 0}명</td>
                </tr>
                <tr>
                  <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">유아</td>
                  <td className="px-2 py-1 border-blue-100 border">{quote.infant_count || 0}명</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 전체 견적 금액 요약 */}
          <div className="bg-white shadow-sm rounded-lg p-6 border-2 border-blue-200">
            <h2 className="text-xl font-bold text-gray-800 mb-6">💰 견적 금액 요약</h2>

            {/* 총 합계 */}
            <div className="border-t-2 border-blue-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-gray-800">총 견적 금액</span>
                <span className="text-3xl font-bold text-blue-600">
                  {(quote.total_price || 0).toLocaleString()}원
                </span>
              </div>
            </div>
          </div>

          {/* 매니저 노트 */}
          {quote.manager_note && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-yellow-800 mb-4">📝 매니저 노트</h2>
              <p className="text-sm text-yellow-700">{quote.manager_note}</p>
            </div>
          )}

          {/* 예약하기 버튼 - 페이지 하단 */}
          <div className="flex justify-center mt-10">
            <button
              onClick={handleReservation}
              className="bg-blue-300 text-white px-10 py-4 rounded-lg text-lg hover:bg-blue-400 transition-colors font-bold shadow-sm"
            >
              🚢 예약하기
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
updated_at: string;
user_id: string;
departure_date: string;
return_date: string;
adult_count: number;
child_count: number;
infant_count: number;
cruise_name ?: string;
manager_note ?: string;
users ?: {
  name: string;
  email: string;
  phone_number?: string;
};
}

export default function QuoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<QuoteDetail | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && quoteId) {
      loadQuoteDetail();
    }
  }, [user, quoteId]);

  const checkAuth = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        alert('로그인이 필요합니다.');
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

  const handleReservation = async () => {
    try {
      if (!quote) {
        alert('견적 정보를 찾을 수 없습니다.');
        return;
      }

      // 견적 데이터 조회 - 실제 테이블 컬럼명 사용
      const { data: quoteData, error } = await supabase
        .from('quote')
        .select(`
          id,
          title,
          cruise_name,
          departure_date,
          return_date,
          total_price,
          quote_item (
            service_type,
            service_ref_id,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq('id', quoteId)
        .single();

      if (error) {
        console.error('견적 조회 오류:', error);
        alert('견적 데이터를 가져올 수 없습니다.');
        return;
      }

      if (!quoteData) {
        alert('견적을 찾을 수 없습니다.');
        return;
      }

      // 견적 데이터를 URL 파라미터로 전달하여 예약 페이지로 이동
      const reservationData = {
        quoteId: quoteData.id,
        title: quoteData.title,
        cruiseCode: quoteData.cruise_name,
        scheduleCode: quoteData.cruise_name, // cruise_name을 schedule로도 사용
        checkin: quoteData.departure_date,
        checkout: quoteData.return_date,
        totalPrice: quoteData.total_price,
        services: (quoteData.quote_item || []).map((item: any) => ({
          type: item.service_type,
          code: item.service_ref_id, // service_ref_id를 code로 사용
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.total_price
        }))
      };

      // 데이터를 Base64로 인코딩하여 URL에 전달
      const encodedData = btoa(JSON.stringify(reservationData));
      router.push(`/mypage/reservations/cruise-new?data=${encodedData}`);
    } catch (error) {
      console.error('예약 처리 오류:', error);
      alert('예약 처리 중 오류가 발생했습니다.');
    }
  };

  const loadQuoteDetail = async () => {
    try {
      console.log('📋 견적 상세 정보 로딩 시작...', quoteId);

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

      console.log('✅ 견적 기본 정보:', quoteData);

      // 사용자 정보 조회 (안전한 방식)
      let userData = null;
      try {
        const { data: userResult, error: userError } = await supabase
          .from('users')
          .select('id, name, email, phone_number')
          .eq('id', quoteData.user_id)
          .single();

        if (userError) {
          console.warn('⚠️ 사용자 정보 조회 실패:', userError);
        } else {
          userData = userResult;
        }
      } catch (userErr) {
        console.warn('⚠️ 사용자 정보 조회 예외:', userErr);
      }

      console.log('👤 사용자 정보:', userData);

      const detailedQuote: QuoteDetail = {
        ...quoteData,
        users: userData || { name: '알 수 없음', email: '미확인', phone_number: '미확인' }
      };

      console.log('✅ 견적 상세 정보 로드 완료:', detailedQuote);
      setQuote(detailedQuote);

    } catch (error) {
      console.error('❌ 견적 상세 정보 로드 실패:', error);
      alert('견적 정보를 불러오는데 실패했습니다.');
      router.push('/mypage/quotes');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-50 text-yellow-600',
      submitted: 'bg-yellow-50 text-yellow-600',
      draft: 'bg-gray-50 text-gray-600',
      confirmed: 'bg-blue-50 text-blue-600',
      approved: 'bg-blue-50 text-blue-600',
      rejected: 'bg-red-50 text-red-600'
    };
    const labels = {
      pending: '검토 대기',
      submitted: '제출됨',
      draft: '임시저장',
      confirmed: '확정됨 (예약)',
      approved: '승인됨',
      rejected: '거절됨'
    };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badges[status as keyof typeof badges] || 'bg-gray-50 text-gray-600'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  if (loading || !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">견적 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/mypage/quotes')}
                className="p-2 text-gray-300 hover:text-gray-500"
              >
                ← 목록으로
              </button>
              <h1 className="text-2xl font-bold text-gray-700">📋 {quote.cruise_name || '크루즈 견적'}</h1>
              {getStatusBadge(quote.status)}
            </div>
            <div className="text-sm text-gray-400">사용자: {user?.email}</div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-8">
          {/* 메인 콘텐츠 */}
          <div className="space-y-6">
            {/* 고객 정보 */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-600 mb-4">👤 고객 정보</h2>
              <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                <tbody>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25 w-32">닉네임</td>
                    <td className="px-2 py-1 border-blue-100 border">{quote.users?.name || '정보 없음'}</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">이메일</td>
                    <td className="px-2 py-1 border-blue-100 border">{quote.users?.email || '정보 없음'}</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">연락처</td>
                    <td className="px-2 py-1 border-blue-100 border">{quote.users?.phone_number || '정보 없음'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 견적 기본 정보 */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-600 mb-4">🚢 견적 정보</h2>
              <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                <tbody>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25 w-32">크루즈명</td>
                    <td className="px-2 py-1 border-blue-100 border">{quote.cruise_name || '미정'}</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">출발일</td>
                    <td className="px-2 py-1 border-blue-100 border">
                      {quote.departure_date ? new Date(quote.departure_date).toLocaleDateString() : '미정'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">귀항일</td>
                    <td className="px-2 py-1 border-blue-100 border">
                      {quote.return_date ? new Date(quote.return_date).toLocaleDateString() : '미정'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">성인</td>
                    <td className="px-2 py-1 border-blue-100 border">{quote.adult_count || 0}명</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">아동</td>
                    <td className="px-2 py-1 border-blue-100 border">{quote.child_count || 0}명</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">유아</td>
                    <td className="px-2 py-1 border-blue-100 border">{quote.infant_count || 0}명</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 전체 견적 금액 요약 */}
            <div className="bg-white shadow-sm rounded-lg p-6 border-2 border-blue-200">
              <h2 className="text-xl font-bold text-gray-800 mb-6">💰 견적 금액 요약</h2>

              {/* 총 합계 */}
              <div className="border-t-2 border-blue-200 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-800">총 견적 금액</span>
                  <span className="text-3xl font-bold text-blue-600">
                    {(quote.total_price || 0).toLocaleString()}원
                  </span>
                </div>
              </div>
            </div>

            {/* 매니저 노트 */}
            {quote.manager_note && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h2 className="text-lg font-medium text-yellow-800 mb-4">📝 매니저 노트</h2>
                <p className="text-sm text-yellow-700">{quote.manager_note}</p>
              </div>
            )}

            {/* 예약하기 버튼 - 페이지 하단 */}
            <div className="flex justify-center mt-10">
              <button
                onClick={handleReservation}
                className="bg-blue-300 text-white px-10 py-4 rounded-lg text-lg hover:bg-blue-400 transition-colors font-bold shadow-sm"
              >
                🚢 예약하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

if (quoteError) {
  console.error('❌ 견적 조회 실패:', quoteError);
  alert('견적을 찾을 수 없습니다.');
  router.push('/manager/quotes');
  return;
}

console.log('✅ 견적 기본 정보:', quoteData);

// 사용자 정보 조회 (안전한 방식)
let userData = null;
try {
  const { data: userResult, error: userError } = await supabase
    .from('users')
    .select('id, name, email, phone_number')
    .eq('id', quoteData.user_id)
    .single();

  if (userError) {
    console.warn('⚠️ 사용자 정보 조회 실패:', userError);
  } else {
    userData = userResult;
  }
} catch (userErr) {
  console.warn('⚠️ 사용자 정보 조회 예외:', userErr);
}

console.log('👤 사용자 정보:', userData);

// quote_item을 통해 서비스 데이터 조회 (올바른 스키마 구조)
const serviceQueries = await Promise.allSettled([
  // 객실 정보 (quote_room 테이블이 없을 수 있으므로 안전하게)
  supabase
    .from('quote_room')
    .select(`*`)
    .eq('quote_id', quoteId),

  // quote_item을 통한 각 서비스별 데이터 조회 (조인 없이 먼저 시도)
  supabase
    .from('quote_item')
    .select('*')
    .eq('quote_id', quoteId)
    .eq('service_type', 'rentcar'),

  supabase
    .from('quote_item')
    .select('*')
    .eq('quote_id', quoteId)
    .eq('service_type', 'cruise'),

  supabase
    .from('quote_item')
    .select('*')
    .eq('quote_id', quoteId)
    .eq('service_type', 'airport'),

  supabase
    .from('quote_item')
    .select('*')
    .eq('quote_id', quoteId)
    .eq('service_type', 'hotel'),

  supabase
    .from('quote_item')
    .select('*')
    .eq('quote_id', quoteId)
    .eq('service_type', 'tour')
]);

console.log('🔍 각 테이블별 조회 상태:');
serviceQueries.forEach((result, index) => {
  const tableNames = ['quote_room', 'rentcar(quote_item)', 'cruise(quote_item)', 'airport(quote_item)', 'hotel(quote_item)', 'tour(quote_item)'];
  console.log(`  ${tableNames[index]}: ${result.status}`);
  if (result.status === 'rejected') {
    console.log(`    에러:`, result.reason);
  }
});

// 결과 처리 및 상세 로깅 (견적 룸 테이블 제거됨)

// quote_item 데이터에서 서비스별로 분류
const carItems = serviceQueries[0].status === 'fulfilled' ? (serviceQueries[0].value.data || []) : [];
const cruiseItems = serviceQueries[1].status === 'fulfilled' ? (serviceQueries[1].value.data || []) : [];
const airportItems = serviceQueries[2].status === 'fulfilled' ? (serviceQueries[2].value.data || []) : [];
const hotelItems = serviceQueries[3].status === 'fulfilled' ? (serviceQueries[3].value.data || []) : [];
const tourItems = serviceQueries[4].status === 'fulfilled' ? (serviceQueries[4].value.data || []) : [];

// quote_item 데이터를 그대로 사용 (조인 없이)
const carData = carItems.map((item: any) => ({
  id: item.id,
  service_ref_id: item.service_ref_id,
  quantity: item.quantity,
  unit_price: item.unit_price,
  total_price: item.total_price,
  options: item.options,
  // 기본 필드들
  car_model: item.options?.car_model || '렌트카',
  pickup_date: item.options?.pickup_date || null,
  return_date: item.options?.return_date || null,
  pickup_location: item.options?.pickup_location || '미정',
  return_location: item.options?.return_location || '미정'
}));

const cruiseData = cruiseItems.map((item: any) => ({
  id: item.id,
  service_ref_id: item.service_ref_id,
  quantity: item.quantity,
  unit_price: item.unit_price,
  total_price: item.total_price,
  options: item.options,
  // 기본 필드들
  cruise_name: item.options?.cruise_name || '크루즈',
  departure_date: item.options?.departure_date || null,
  return_date: item.options?.return_date || null,
  departure_port: item.options?.departure_port || '미정'
}));

const airportData = airportItems.map((item: any) => ({
  id: item.id,
  service_ref_id: item.service_ref_id,
  quantity: item.quantity,
  unit_price: item.unit_price,
  total_price: item.total_price,
  options: item.options,
  // 기본 필드들
  service_type: item.options?.service_type || '공항 서비스',
  flight_number: item.options?.flight_number || '미정'
}));

const hotelData = hotelItems.map((item: any) => ({
  id: item.id,
  service_ref_id: item.service_ref_id,
  quantity: item.quantity,
  unit_price: item.unit_price,
  total_price: item.total_price,
  options: item.options,
  // 기본 필드들
  hotel_name: item.options?.hotel_name || '호텔',
  check_in_date: item.options?.check_in_date || null,
  check_out_date: item.options?.check_out_date || null
}));

const tourData = tourItems.map((item: any) => ({
  id: item.id,
  service_ref_id: item.service_ref_id,
  quantity: item.quantity,
  unit_price: item.unit_price,
  total_price: item.total_price,
  options: item.options,
  // 기본 필드들
  tour_name: item.options?.tour_name || '투어',
  tour_date: item.options?.tour_date || null,
  duration_hours: item.options?.duration_hours || null
}));

// 상세 에러 로깅 및 성공 여부 확인
serviceQueries.forEach((result, index) => {
  const names = ['객실(quote_room)', '렌트카(rentcar)', '크루즈(cruise)', '공항(airport)', '호텔(hotel)', '투어(tour)'];
  if (result.status === 'rejected') {
    console.warn(`❌ ${names[index]} 테이블 조회 실패:`, result.reason);
    console.warn(`   - 에러 코드:`, result.reason?.code);
    console.warn(`   - 에러 메시지:`, result.reason?.message);
  } else {
    console.log(`✅ ${names[index]} 테이블 조회 성공:`, result.value.data?.length || 0, '건');
  }
});

// 데이터 상세 로깅
console.log('📊 서비스별 데이터 요약:');
console.log('🚗 렌트카 데이터:', carData?.length || 0, '건', carData);
console.log('🚢 크루즈 데이터:', cruiseData?.length || 0, '건', cruiseData);
console.log('✈️ 공항 서비스 데이터:', airportData?.length || 0, '건', airportData);
console.log('🏨 호텔 데이터:', hotelData?.length || 0, '건', hotelData);
console.log('🎯 투어 데이터:', tourData?.length || 0, '건', tourData);

const detailedQuote: QuoteDetail = {
  ...quoteData,
  users: userData || { name: '알 수 없음', email: '미확인', phone_number: '미확인' },
  rentcar: carData || [],
  cruise: cruiseData || [],
  airport: airportData || [],
  hotel: hotelData || [],
  tour: tourData || []
};

console.log('✅ 견적 상세 정보 로드 완료:', detailedQuote);
setQuote(detailedQuote);

    } catch (error) {
  console.error('❌ 견적 상세 정보 로드 실패:', error);
  alert('견적 정보를 불러오는데 실패했습니다.');
  router.push('/manager/quotes');
}
  };

// 상세 서비스 정보 로드
const loadDetailedServices = async () => {
  try {
    console.log('🔍 상세 서비스 정보 로드 시작...', quoteId);

    const { data: quoteItems, error } = await supabase
      .from('quote_item')
      .select('*')
      .eq('quote_id', quoteId);

    if (error) throw error;

    console.log('📋 Quote Items 로드됨:', quoteItems);

    const detailed: any = {
      rooms: [],
      cars: [],
      airports: [],
      hotels: [],
      rentcars: [],
      tours: []
    };

    for (const item of quoteItems || []) {
      try {
        console.log(`🔍 처리 중: ${item.service_type} (ref_id: ${item.service_ref_id})`);

        if (item.service_type === 'room') {
          const { data: roomData } = await supabase
            .from('room')
            .select('*')
            .eq('id', item.service_ref_id)
            .single();

          if (roomData) {
            console.log('✅ 객실 정보:', roomData);
            // room_price 테이블에서 모든 가격 정보 조회
            const { data: priceData } = await supabase
              .from('room_price')
              .select('*')
              .eq('room_code', roomData.room_code);

            detailed.rooms.push({
              ...item,
              roomInfo: roomData,
              priceInfo: priceData || []
            });
          }
        } else if (item.service_type === 'car') {
          const { data: carData } = await supabase
            .from('car')
            .select('*')
            .eq('id', item.service_ref_id)
            .single();

          if (carData) {
            console.log('✅ 차량 정보:', carData);
            const { data: priceData } = await supabase
              .from('car_price')
              .select('*')
              .eq('car_code', carData.car_code);

            detailed.cars.push({
              ...item,
              carInfo: carData,
              priceInfo: priceData || []
            });
          }
        } else if (item.service_type === 'airport') {
          const { data: airportData } = await supabase
            .from('airport')
            .select('*')
            .eq('id', item.service_ref_id)
            .single();

          if (airportData) {
            console.log('✅ 공항 정보:', airportData);
            const { data: priceData } = await supabase
              .from('airport_price')
              .select('*')
              .eq('airport_code', airportData.airport_code);

            detailed.airports.push({
              ...item,
              airportInfo: airportData,
              priceInfo: priceData || []
            });
          }
        } else if (item.service_type === 'hotel') {
          const { data: hotelData } = await supabase
            .from('hotel')
            .select('*')
            .eq('id', item.service_ref_id)
            .single();

          if (hotelData) {
            console.log('✅ 호텔 정보:', hotelData);
            const { data: priceData } = await supabase
              .from('hotel_price')
              .select('*')
              .eq('hotel_code', hotelData.hotel_code);

            detailed.hotels.push({
              ...item,
              hotelInfo: hotelData,
              priceInfo: priceData || []
            });
          }
        } else if (item.service_type === 'rentcar') {
          const { data: rentcarData } = await supabase
            .from('rentcar')
            .select('*')
            .eq('id', item.service_ref_id)
            .single();

          if (rentcarData) {
            console.log('✅ 렌트카 정보:', rentcarData);
            const { data: priceData } = await supabase
              .from('rentcar_price')
              .select('*')
              .eq('rentcar_code', rentcarData.rentcar_code);

            detailed.rentcars.push({
              ...item,
              rentcarInfo: rentcarData,
              priceInfo: priceData || []
            });
          }
        } else if (item.service_type === 'tour') {
          const { data: tourData } = await supabase
            .from('tour')
            .select('*')
            .eq('id', item.service_ref_id)
            .single();

          if (tourData) {
            console.log('✅ 투어 정보:', tourData);
            const { data: priceData } = await supabase
              .from('tour_price')
              .select('*')
              .eq('tour_code', tourData.tour_code);

            detailed.tours.push({
              ...item,
              tourInfo: tourData,
              priceInfo: priceData || []
            });
          }
        }
      } catch (serviceError) {
        console.warn(`⚠️ ${item.service_type} 상세 정보 로드 실패:`, serviceError);
      }
    }

    setDetailedServices(detailed);
    console.log('✅ 상세 서비스 정보 로드 완료:', detailed);
  } catch (error) {
    console.error('❌ 상세 서비스 정보 로드 실패:', error);
  }
};

// 예약하기 함수 추가
const handleReservation = async () => {
  try {
    if (!quote) {
      alert('견적 정보를 찾을 수 없습니다.');
      return;
    }

    // 견적 데이터 조회 - service_ref_id를 service_code로 사용
    const { data: quoteData, error } = await supabase
      .from('quote')
      .select(`
          id,
          title,
          cruise_code,
          schedule_code,
          departure_date as checkin,
          return_date as checkout,
          total_price,
          quote_item (
            service_type,
            service_ref_id,
            quantity,
            unit_price,
            total_price
          )
        `)
      .eq('id', quoteId)
      .single();

    if (error) {
      console.error('견적 조회 오류:', error);
      alert('견적 데이터를 가져올 수 없습니다.');
      return;
    }

    if (!quoteData) {
      alert('견적을 찾을 수 없습니다.');
      return;
    }

    // 견적 데이터를 URL 파라미터로 전달하여 예약 페이지로 이동
    const reservationData = {
      quoteId: quoteData.id,
      title: quoteData.title,
      cruiseCode: quoteData.cruise_code,
      scheduleCode: quoteData.schedule_code,
      checkin: quoteData.checkin,
      checkout: quoteData.checkout,
      totalPrice: quoteData.total_price,
      services: quoteData.quote_item.map((item: any) => ({
        type: item.service_type,
        code: item.service_ref_id, // service_ref_id를 code로 사용
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price
      }))
    };

    // 데이터를 Base64로 인코딩하여 URL에 전달
    const encodedData = btoa(JSON.stringify(reservationData));
    router.push(`/mypage/reservations/cruise-new?data=${encodedData}`);
  } catch (error) {
    console.error('예약 처리 오류:', error);
    alert('예약 처리 중 오류가 발생했습니다.');
  }
};
const { data: priceData } = await supabase
  .from('hotel_price')
  .select('*')
  .eq('hotel_code', hotelData.hotel_code);

detailed.hotels.push({
  ...item,
  hotelInfo: hotelData,
  priceInfo: priceData || []
});
}
          } else if (item.service_type === 'rentcar') {
  const { data: rentcarData } = await supabase
    .from('rentcar')
    .select('*')
    .eq('id', item.service_ref_id)
    .single();

  if (rentcarData) {
    console.log('✅ 렌트카 정보:', rentcarData);
    const { data: priceData } = await supabase
      .from('rent_price')
      .select('*')
      .eq('rent_code', rentcarData.rentcar_code);

    detailed.rentcars.push({
      ...item,
      rentcarInfo: rentcarData,
      priceInfo: priceData || []
    });
  }
} else if (item.service_type === 'tour') {
  const { data: tourData } = await supabase
    .from('tour')
    .select('*')
    .eq('id', item.service_ref_id)
    .single();

  if (tourData) {
    console.log('✅ 투어 정보:', tourData);
    const { data: priceData } = await supabase
      .from('tour_price')
      .select('*')
      .eq('tour_code', tourData.tour_code);

    detailed.tours.push({
      ...item,
      tourInfo: tourData,
      priceInfo: priceData || []
    });
  }
}
        } catch (serviceError) {
  console.warn(`⚠️ ${item.service_type} 상세 정보 로드 실패:`, serviceError);
}
      }

setDetailedServices(detailed);
console.log('✅ 상세 서비스 정보 로드 완료:', detailed);
    } catch (error) {
  console.error('❌ 상세 서비스 정보 로드 실패:', error);
}
  };

const getStatusBadge = (status: string) => {
  const badges = {
    pending: 'bg-yellow-50 text-yellow-600',
    submitted: 'bg-yellow-50 text-yellow-600',
    draft: 'bg-gray-50 text-gray-600',
    confirmed: 'bg-blue-50 text-blue-600',
    approved: 'bg-blue-50 text-blue-600',
    rejected: 'bg-red-50 text-red-600'
  };
  const labels = {
    pending: '검토 대기',
    submitted: '제출됨',
    draft: '임시저장',
    confirmed: '확정됨 (예약)',
    approved: '승인됨',
    rejected: '거절됨'
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badges[status as keyof typeof badges] || 'bg-gray-50 text-gray-600'}`}>
      {labels[status as keyof typeof labels] || status}
    </span>
  );
};

if (loading || !quote) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-600">견적 정보를 불러오는 중...</p>
      </div>
    </div>
  );
}

return (
  <div className="min-h-screen bg-gray-50">
    {/* 헤더 */}
    <div className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/mypage/quotes')}
              className="p-2 text-gray-300 hover:text-gray-500"
            >
              ← 목록으로
            </button>
            <h1 className="text-2xl font-bold text-gray-700">📋 {quote.cruise_name || '크루즈 견적'}</h1>
            {getStatusBadge(quote.status)}
          </div>
          <div className="text-sm text-gray-400">사용자: {user?.email}</div>
        </div>
      </div>
    </div>

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 gap-8">
        {/* 메인 콘텐츠 */}
        <div className="space-y-6">
          {/* 고객 정보 */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-600 mb-4">👤 고객 정보</h2>
            <table className="min-w-full text-sm text-gray-600 border border-blue-100">
              <tbody>
                <tr>
                  <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25 w-32">닉네임</td>
                  <td className="px-2 py-1 border-blue-100 border">{quote.users?.name || '정보 없음'}</td>
                </tr>
                <tr>
                  <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">이메일</td>
                  <td className="px-2 py-1 border-blue-100 border">{quote.users?.email || '정보 없음'}</td>
                </tr>
                <tr>
                  <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">연락처</td>
                  <td className="px-2 py-1 border-blue-100 border">{quote.users?.phone_number || '정보 없음'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 상세 서비스 정보 섹션 */}
          {/* 객실 정보 */}
          {detailedServices.rooms && detailedServices.rooms.length > 0 && (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-600">🛏 객실 정보 (상세)</h2>
                <div className="text-right">
                  <span className="text-lg font-bold text-blue-600">
                    {detailedServices.rooms.reduce((total: number, room: any) => total + (room.total_price || 0), 0).toLocaleString()}원
                  </span>
                  <p className="text-sm text-gray-500">객실 합계</p>
                </div>
              </div>
              <div className="space-y-4">
                {detailedServices.rooms.map((room: any, index: number) => (
                  <div key={index} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium text-gray-700">객실 #{index + 1}</h3>
                      <div className="text-right">
                        <span className="text-base font-semibold text-blue-600">
                          {(room.total_price || 0).toLocaleString()}원
                        </span>
                        <p className="text-xs text-gray-500">단가: {(room.unit_price || 0).toLocaleString()}원 × {room.quantity || 1}</p>
                      </div>
                    </div>
                    <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                      <tbody>
                        {(room.priceInfo && room.priceInfo.length > 0 ? room.priceInfo : [{}]).map((price: any, priceIndex: number) => (
                          <React.Fragment key={priceIndex}>
                            <tr className="bg-gray-25">
                              <td className="px-2 py-1 font-medium border-blue-100 border">일정</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.schedule || '-'}</td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 font-medium border-blue-100 border">크루즈</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.cruise || '-'}</td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 font-medium border-blue-100 border">객실 타입</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.room_type || '-'}</td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 font-medium border-blue-100 border">카테고리</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.room_category || '-'}</td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 font-medium border-blue-100 border">베이스 가격</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.base_price ? price.base_price.toLocaleString() + '원' : '-'}</td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 font-medium border-blue-100 border">추가 요금</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.extra_charge ? price.extra_charge.toLocaleString() + '원' : '-'}</td>
                            </tr>
                            <tr className="bg-gray-50">
                              <td className="px-2 py-1 font-medium border-blue-100 border">인원수</td>
                              <td className="px-2 py-1 border-blue-100 border">{room.roomInfo?.adult_count}명</td>
                            </tr>

                            <tr className="bg-gray-50">
                              <td className="px-2 py-1 font-medium border-blue-100 border">추가수</td>
                              <td className="px-2 py-1 border-blue-100 border">{room.roomInfo?.extra_count || 0}명</td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 차량 정보 */}
          {detailedServices.cars && detailedServices.cars.length > 0 && (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-600">🚗 차량 정보 (상세)</h2>
                <div className="text-right">
                  <span className="text-lg font-bold text-green-600">
                    {detailedServices.cars.reduce((total: number, car: any) => total + (car.total_price || 0), 0).toLocaleString()}원
                  </span>
                  <p className="text-sm text-gray-500">차량 합계</p>
                </div>
              </div>
              <div className="space-y-4">
                {detailedServices.cars.map((car: any, index: number) => (
                  <div key={index} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium text-gray-700">차량 #{index + 1}</h3>
                      <div className="text-right">
                        <span className="text-base font-semibold text-green-600">
                          {(car.total_price || 0).toLocaleString()}원
                        </span>
                        <p className="text-xs text-gray-500">단가: {(car.unit_price || 0).toLocaleString()}원 × {car.quantity || 1}</p>
                      </div>
                    </div>
                    <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                      <tbody>
                        {(car.priceInfo && car.priceInfo.length > 0 ? car.priceInfo : [{}]).map((price: any, priceIndex: number) => (
                          <React.Fragment key={priceIndex}>
                            <tr className="bg-gray-25">
                              <td className="px-2 py-1 font-medium border-blue-100 border">일정</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.schedule || '-'}</td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 font-medium border-blue-100 border">크루즈</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.cruise || '-'}</td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 font-medium border-blue-100 border">차량 타입</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.car_type || '-'}</td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 font-medium border-blue-100 border">카테고리</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.car_category || '-'}</td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 font-medium border-blue-100 border">베이스 가격</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.base_price ? price.base_price.toLocaleString() + '원' : '-'}</td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 font-medium border-blue-100 border">추가 요금</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.extra_charge ? price.extra_charge.toLocaleString() + '원' : '-'}</td>
                            </tr>
                            <tr className="bg-gray-50">
                              <td className="px-2 py-1 font-medium border-blue-100 border">차량수</td>
                              <td className="px-2 py-1 border-blue-100 border">{car.carInfo?.car_count}대</td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 공항 서비스 정보 */}
          {detailedServices.airports && detailedServices.airports.length > 0 && (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-600">✈️ 공항 서비스 (상세)</h2>
                <div className="text-right">
                  <span className="text-lg font-bold text-yellow-600">
                    {detailedServices.airports.reduce((total: number, airport: any) => total + (airport.total_price || 0), 0).toLocaleString()}원
                  </span>
                  <p className="text-sm text-gray-500">공항 서비스 합계</p>
                </div>
              </div>
              <div className="space-y-4">
                {detailedServices.airports.map((airport: any, index: number) => (
                  <div key={index} className="border border-gray-100 rounded-lg p-4">
                    <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                      <tbody>
                        {(airport.priceInfo && airport.priceInfo.length > 0 ? airport.priceInfo : [{}]).map((price: any, priceIndex: number) => (
                          <React.Fragment key={priceIndex}>
                            <tr className="bg-gray-25">
                              <td className="px-2 py-1 font-medium border-blue-100 border">카테고리</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.airport_category || '-'}</td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 font-medium border-blue-100 border">경로</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.airport_route || '-'}</td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 font-medium border-blue-100 border">차량 타입</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.airport_car_type || '-'}</td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 font-medium border-blue-100 border">베이스 가격</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.base_price ? price.base_price.toLocaleString() + '원' : '-'}</td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 font-medium border-blue-100 border">추가 요금</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.extra_charge ? price.extra_charge.toLocaleString() + '원' : '-'}</td>
                            </tr>
                            <tr className="bg-gray-50">
                              <td className="px-2 py-1 font-medium border-blue-100 border">승객수</td>
                              <td className="px-2 py-1 border-blue-100 border">{airport.airportInfo?.passenger_count}명</td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 호텔 정보 */}
          {detailedServices.hotels && detailedServices.hotels.length > 0 && (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-600">🏨 호텔 정보 (상세)</h2>
                <div className="text-right">
                  <span className="text-lg font-bold text-pink-600">
                    {detailedServices.hotels.reduce((total: number, hotel: any) => total + (hotel.total_price || 0), 0).toLocaleString()}원
                  </span>
                  <p className="text-sm text-gray-500">호텔 합계</p>
                </div>
              </div>
              <div className="space-y-4">
                {detailedServices.hotels.map((hotel: any, index: number) => (
                  <div key={index} className="border border-gray-100 rounded-lg p-4">
                    <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                      <tbody>
                        {(hotel.priceInfo && hotel.priceInfo.length > 0 ? hotel.priceInfo : [{}]).map((price: any, priceIndex: number) => (
                          <React.Fragment key={priceIndex}>
                            <tr className="bg-gray-25">
                              <td className="px-2 py-1 font-medium border-blue-100 border">호텔명</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.hotel_name || '-'}</td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 font-medium border-blue-100 border">객실명</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.room_name || '-'}</td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 font-medium border-blue-100 border">객실 타입</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.room_type || '-'}</td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 font-medium border-blue-100 border">베이스 가격</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.base_price ? price.base_price.toLocaleString() + '원' : '-'}</td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 font-medium border-blue-100 border">추가 요금</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.extra_charge ? price.extra_charge.toLocaleString() + '원' : '-'}</td>
                            </tr>
                            <tr className="bg-gray-50">
                              <td className="px-2 py-1 font-medium border-blue-100 border">호텔명</td>
                              <td className="px-2 py-1 border-blue-100 border">{hotel.hotelInfo?.hotel_name || '호텔 정보 없음'}</td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 렌트카 정보 */}
          {detailedServices.rentcars && detailedServices.rentcars.length > 0 && (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-600">🚙 렌트카 정보 (상세)</h2>
                <div className="text-right">
                  <span className="text-lg font-bold text-green-600">
                    {detailedServices.rentcars.reduce((total: number, rentcar: any) => total + (rentcar.total_price || 0), 0).toLocaleString()}원
                  </span>
                  <p className="text-sm text-gray-500">렌트카 합계</p>
                </div>
              </div>
              <div className="space-y-4">
                {detailedServices.rentcars.map((rentcar: any, index: number) => (
                  <div key={index} className="border border-gray-100 rounded-lg p-4">
                    <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                      <tbody>
                        {(rentcar.priceInfo && rentcar.priceInfo.length > 0 ? rentcar.priceInfo : [{}]).map((price: any, priceIndex: number) => (
                          <React.Fragment key={priceIndex}>
                            <tr className="bg-gray-25">
                              <td className="px-2 py-1 font-medium border-blue-100 border">렌트 타입</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.rent_type || '-'}</td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 font-medium border-blue-100 border">카테고리</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.rent_category || '-'}</td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 font-medium border-blue-100 border">경로</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.rent_route || '-'}</td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 font-medium border-blue-100 border">베이스 가격</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.base_price ? price.base_price.toLocaleString() + '원' : '-'}</td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 font-medium border-blue-100 border">추가 요금</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.extra_charge ? price.extra_charge.toLocaleString() + '원' : '-'}</td>
                            </tr>
                            <tr className="bg-gray-50">
                              <td className="px-2 py-1 font-medium border-blue-100 border">렌트카명</td>
                              <td className="px-2 py-1 border-blue-100 border">{rentcar.rentcarInfo?.rentcar_name || '렌트카 정보 없음'}</td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 투어 정보 */}
          {detailedServices.tours && detailedServices.tours.length > 0 && (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-600">🎯 투어 정보 (상세)</h2>
                <div className="text-right">
                  <span className="text-lg font-bold text-purple-600">
                    {detailedServices.tours.reduce((total: number, tour: any) => total + (tour.total_price || 0), 0).toLocaleString()}원
                  </span>
                  <p className="text-sm text-gray-500">투어 합계</p>
                </div>
              </div>
              <div className="space-y-4">
                {detailedServices.tours.map((tour: any, index: number) => (
                  <div key={index} className="border border-gray-100 rounded-lg p-4">
                    <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                      <tbody>
                        {(tour.priceInfo && tour.priceInfo.length > 0 ? tour.priceInfo : [{}]).map((price: any, priceIndex: number) => (
                          <React.Fragment key={priceIndex}>
                            <tr className="bg-gray-25">
                              <td className="px-2 py-1 font-medium border-blue-100 border">투어명</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.tour_name || '-'}</td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 font-medium border-blue-100 border">정원</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.tour_capacity ? price.tour_capacity + '명' : '-'}</td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 font-medium border-blue-100 border">차량</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.tour_vehicle || '-'}</td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 font-medium border-blue-100 border">베이스 가격</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.base_price ? price.base_price.toLocaleString() + '원' : '-'}</td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 font-medium border-blue-100 border">추가 요금</td>
                              <td className="px-2 py-1 border-blue-100 border">{price.extra_charge ? price.extra_charge.toLocaleString() + '원' : '-'}</td>
                            </tr>
                            <tr className="bg-gray-50">
                              <td className="px-2 py-1 font-medium border-blue-100 border">투어명</td>
                              <td className="px-2 py-1 border-blue-100 border">{tour.tourInfo?.tour_name || '투어 정보 없음'}</td>
                            </tr>
                            <tr className="bg-gray-50">
                              <td className="px-2 py-1 font-medium border-blue-100 border">투어 날짜</td>
                              <td className="px-2 py-1 border-blue-100 border">{tour.tourInfo?.tour_date || '-'}</td>
                            </tr>
                            <tr className="bg-gray-50">
                              <td className="px-2 py-1 font-medium border-blue-100 border">참가자수</td>
                              <td className="px-2 py-1 border-blue-100 border">{tour.tourInfo?.participant_count || 0}명</td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          )}



          {/* 전체 견적 금액 요약 */}
          <div className="bg-white shadow-sm rounded-lg p-6 border-2 border-blue-200">
            <h2 className="text-xl font-bold text-gray-800 mb-6">💰 견적 금액 요약</h2>

            {/* 섹션별 금액 */}
            <div className="space-y-3 mb-6">
              {detailedServices.rooms && detailedServices.rooms.length > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">🛏 객실 서비스</span>
                  <span className="font-medium text-blue-600">
                    {detailedServices.rooms.reduce((total: number, room: any) => total + (room.total_price || 0), 0).toLocaleString()}원
                  </span>
                </div>
              )}

              {detailedServices.cars && detailedServices.cars.length > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">🚗 차량 서비스</span>
                  <span className="font-medium text-green-600">
                    {detailedServices.cars.reduce((total: number, car: any) => total + (car.total_price || 0), 0).toLocaleString()}원
                  </span>
                </div>
              )}

              {detailedServices.airports && detailedServices.airports.length > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">✈️ 공항 서비스</span>
                  <span className="font-medium text-yellow-600">
                    {detailedServices.airports.reduce((total: number, airport: any) => total + (airport.total_price || 0), 0).toLocaleString()}원
                  </span>
                </div>
              )}

              {detailedServices.hotels && detailedServices.hotels.length > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">🏨 호텔 서비스</span>
                  <span className="font-medium text-pink-600">
                    {detailedServices.hotels.reduce((total: number, hotel: any) => total + (hotel.total_price || 0), 0).toLocaleString()}원
                  </span>
                </div>
              )}

              {detailedServices.rentcars && detailedServices.rentcars.length > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">🚙 렌트카 서비스</span>
                  <span className="font-medium text-green-600">
                    {detailedServices.rentcars.reduce((total: number, rentcar: any) => total + (rentcar.total_price || 0), 0).toLocaleString()}원
                  </span>
                </div>
              )}

              {detailedServices.tours && detailedServices.tours.length > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">🎯 투어 서비스</span>
                  <span className="font-medium text-purple-600">
                    {detailedServices.tours.reduce((total: number, tour: any) => total + (tour.total_price || 0), 0).toLocaleString()}원
                  </span>
                </div>
              )}

              {quote.rentcar && quote.rentcar.length > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">🚗 기본 렌트카</span>
                  <span className="font-medium text-gray-600">
                    {quote.rentcar.reduce((total: number, car: any) => total + (car.total_price || 0), 0).toLocaleString()}원
                  </span>
                </div>
              )}
            </div>

            {/* 총 합계 */}
            <div className="border-t-2 border-blue-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-gray-800">총 견적 금액</span>
                <span className="text-3xl font-bold text-blue-600">
                  {(() => {
                    const detailedTotal =
                      (detailedServices.rooms?.reduce((total: number, room: any) => total + (room.total_price || 0), 0) || 0) +
                      (detailedServices.cars?.reduce((total: number, car: any) => total + (car.total_price || 0), 0) || 0) +
                      (detailedServices.airports?.reduce((total: number, airport: any) => total + (airport.total_price || 0), 0) || 0) +
                      (detailedServices.hotels?.reduce((total: number, hotel: any) => total + (hotel.total_price || 0), 0) || 0) +
                      (detailedServices.rentcars?.reduce((total: number, rentcar: any) => total + (rentcar.total_price || 0), 0) || 0) +
                      (detailedServices.tours?.reduce((total: number, tour: any) => total + (tour.total_price || 0), 0) || 0) +
                      (quote.rentcar?.reduce((total: number, car: any) => total + (car.total_price || 0), 0) || 0);

                    // 상세 서비스 총액과 견적 총액 중 더 큰 값을 사용
                    const finalTotal = Math.max(detailedTotal, quote.total_price || 0);
                    return finalTotal.toLocaleString();
                  })()}원
                </span>
              </div>
              {quote.total_price && quote.total_price > 0 && (
                <div className="mt-2 text-sm text-gray-500 text-right">
                  (시스템 견적액: {quote.total_price.toLocaleString()}원)
                </div>
              )}
            </div>
          </div>
          {quote.rentcar && quote.rentcar.length > 0 && (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-600">🚗 기본 렌트카 정보</h2>
                <div className="text-right">
                  <span className="text-lg font-bold text-gray-600">
                    {quote.rentcar.reduce((total: number, car: any) => total + (car.total_price || 0), 0).toLocaleString()}원
                  </span>
                  <p className="text-sm text-gray-500">기본 렌트카 합계</p>
                </div>
              </div>
              <div className="space-y-4">
                {quote.rentcar.map((car: any, index: number) => (
                  <div key={index} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-600">
                          {car.car_model || '차량 정보 없음'}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          픽업일: {car.pickup_date ? new Date(car.pickup_date).toLocaleDateString() : '미정'} |
                          반납일: {car.return_date ? new Date(car.return_date).toLocaleDateString() : '미정'}
                        </p>
                        <p className="text-sm text-gray-500">
                          픽업장소: {car.pickup_location || '미정'} |
                          반납장소: {car.return_location || '미정'}
                        </p>
                        <div className="mt-2">
                          <span className="text-sm text-gray-400">
                            수량: {car.quantity || 1}대
                          </span>
                        </div>
                        {car.options && (
                          <p className="text-sm text-gray-400 mt-1">
                            추가 옵션: {JSON.stringify(car.options)}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <span className="text-base font-semibold text-gray-600">
                          {(car.total_price || 0).toLocaleString()}원
                        </span>
                        <p className="text-xs text-gray-500">단가: {(car.unit_price || 0).toLocaleString()}원 × {car.quantity || 1}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 예약하기 버튼 - 페이지 하단 */}
          <div className="flex justify-center mt-10">
            <button
              onClick={handleReservation}
              className="bg-blue-300 text-white px-10 py-4 rounded-lg text-lg hover:bg-blue-400 transition-colors font-bold shadow-sm"
            >
              🚢 예약하기
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
