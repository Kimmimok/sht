'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

interface QuoteData {
  id: string;
  user_id: string;
  cruise_name: string;
  departure_date: string;
  return_date: string;
  total_price: number;
  status: string;
  users?: {
    id: string;
    name: string;
    email: string;
    phone_number: string;
  };
}

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [quoteId, setQuoteId] = useState<string>('');

  useEffect(() => {
    const initPage = async () => {
      const resolvedParams = await params;
      setQuoteId(resolvedParams.id);
      checkAuthAndLoadData(resolvedParams.id);
    };
    initPage();
  }, []);

  // 사용자가 users 테이블에 존재하는지 확인하고, 없으면 생성
  const ensureUserExists = async (authUser: any) => {
    try {
      console.log('🔍 [Quote Detail] 사용자 등록 상태 확인:', authUser.id);
      
      // users 테이블에서 사용자 조회
      const { data: existingUser, error: userSelectError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (userSelectError && userSelectError.code !== 'PGRST116') {
        console.error('❌ [Quote Detail] 사용자 조회 오류:', userSelectError);
        throw userSelectError;
      }

      if (!existingUser) {
        console.log('👤 [Quote Detail] 사용자가 users 테이블에 없음. 새로 생성합니다.');
        
        // 새 사용자 생성
        const newUser = {
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || '사용자',
          role: 'member', // 기본값: member (고객)
          phone_number: authUser.user_metadata?.phone || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: newUserData, error: insertError } = await supabase
          .from('users')
          .insert(newUser)
          .select()
          .single();

        if (insertError) {
          console.error('❌ [Quote Detail] 사용자 생성 실패:', insertError);
          throw insertError;
        }

        console.log('✅ [Quote Detail] 새 사용자 생성 완료:', newUserData);
        return newUserData;
      } else {
        console.log('✅ [Quote Detail] 기존 사용자 확인:', existingUser);
        return existingUser;
      }
    } catch (error) {
      console.error('❌ [Quote Detail] 사용자 등록 처리 실패:', error);
      throw error;
    }
  };

  const checkAuthAndLoadData = async (id: string) => {
    try {
      console.log('🔑 인증 및 데이터 로딩 시작, Quote ID:', id);
      
      // 1. 인증 확인
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }
      
      console.log('✅ 인증 성공, User ID:', user.id);
      
      // 2. users 테이블에 사용자 등록 확인 및 생성
      await ensureUserExists(user);
      setUser(user);

      // 3. 견적 데이터 로드
      await loadQuoteDetail(id);
    } catch (error) {
      console.error('❌ 데이터 로드 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      alert('데이터 로드 중 오류가 발생했습니다: ' + errorMessage);
      setLoading(false);
    }
  };

  const loadQuoteDetail = async (quoteId: string) => {
    try {
      console.log('📋 견적 상세 정보 로딩 시작...', quoteId);
      
      // 현재 사용자 확인
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        console.error('❌ 사용자 인증 실패');
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }
      
      console.log('✅ 현재 사용자:', currentUser.id);
      
      // 먼저 기본 견적 정보만 조회 (users 조인 없이)
      const { data: basicQuoteData, error: basicError } = await supabase
        .from('quote')
        .select('*')
        .eq('id', quoteId)
        .eq('user_id', currentUser.id)  // 본인 견적만 조회
        .single();

      if (basicError) {
        console.error('❌ 견적 조회 실패:', basicError);
        if (basicError.code === 'PGRST116') {
          alert('해당 견적을 찾을 수 없거나 접근 권한이 없습니다.');
        } else {
          alert('견적 조회 중 오류가 발생했습니다: ' + basicError.message);
        }
        router.push('/mypage/quotes');
        return;
      }

      // 별도로 사용자 정보 조회 시도
      let userData = null;
      try {
        const { data: userInfo } = await supabase
          .from('users')
          .select('id, name, email, phone_number')
          .eq('id', basicQuoteData.user_id)
          .single();
        userData = userInfo;
      } catch (userError) {
        console.warn('⚠️ 사용자 정보 조회 실패, 기본값 사용:', userError);
        userData = {
          id: basicQuoteData.user_id,
          name: '사용자',
          email: currentUser.email || '',
          phone_number: ''
        };
      }

      // 데이터 결합
      const finalQuoteData = {
        ...basicQuoteData,
        users: userData
      };

      console.log('✅ 견적 조회 성공:', finalQuoteData);
      setQuote(finalQuoteData);
      setLoading(false);
    } catch (error) {
      console.error('❌ 견적 로드 실패:', error);
      setError('견적 정보를 불러올 수 없습니다.');
      setLoading(false);
    }
  };

  const handleReservation = () => {
    if (!quote) return;
    router.push(`/reservation/new?quoteId=${quote.id}`);
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <SectionBox title="오류">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => router.push('/mypage/quotes')}
            className="mt-4 btn btn-secondary"
          >
            목록으로 돌아가기
          </button>
        </SectionBox>
      </PageWrapper>
    );
  }

  if (!quote) {
    return (
      <PageWrapper>
        <SectionBox title="견적 없음">
          <p>견적 정보를 찾을 수 없습니다.</p>
          <button 
            onClick={() => router.push('/mypage/quotes')}
            className="mt-4 btn btn-secondary"
          >
            목록으로 돌아가기
          </button>
        </SectionBox>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 견적 기본 정보 */}
        <SectionBox title="견적 상세 정보">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-lg mb-4">크루즈 정보</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">크루즈명:</span> {quote.cruise_name}</p>
                <p><span className="font-medium">출발일:</span> {quote.departure_date}</p>
                <p><span className="font-medium">복귀일:</span> {quote.return_date}</p>
                <p><span className="font-medium">상태:</span> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    quote.status === 'approved' ? 'bg-green-100 text-green-800' :
                    quote.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {quote.status === 'approved' ? '승인됨' : 
                     quote.status === 'pending' ? '승인 대기' : quote.status}
                  </span>
                </p>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-4">고객 정보</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">이름:</span> {quote.users?.name || '정보 없음'}</p>
                <p><span className="font-medium">이메일:</span> {quote.users?.email || '정보 없음'}</p>
                <p><span className="font-medium">전화번호:</span> {quote.users?.phone_number || '정보 없음'}</p>
              </div>
            </div>
          </div>
        </SectionBox>

        {/* 가격 정보 */}
        <SectionBox title="가격 정보">
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">
              총 금액: {quote.total_price?.toLocaleString() || 0}원
            </p>
          </div>
        </SectionBox>

        {/* 액션 버튼 */}
        <div className="flex justify-between">
          <button 
            onClick={() => router.push('/mypage/quotes')}
            className="btn btn-secondary"
          >
            목록으로 돌아가기
          </button>
          
          {quote.status === 'approved' && (
            <button 
              onClick={handleReservation}
              className="btn btn-primary"
            >
              예약하기
            </button>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
