'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import { getQuoteWithItems } from '@/lib/quoteUtils';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';
import { 
  User, 
  Phone, 
  MapPin, 
  CreditCard, 
  Calendar,
  Ship,
  CheckCircle
} from 'lucide-react';

interface UserProfile {
  name: string;
  phone: string;
  birth_date: string;
  address: string;
  emergency_contact: string;
  emergency_phone: string;
  passport_number: string;
  passport_expiry: string;
}

export default function QuoteReservePage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    phone: '',
    birth_date: '',
    address: '',
    emergency_contact: '',
    emergency_phone: '',
    passport_number: '',
    passport_expiry: ''
  });

  useEffect(() => {
    if (quoteId && quoteId !== 'undefined') {
      loadQuoteAndUser();
    } else {
      console.error('올바르지 않은 견적 ID:', quoteId);
      alert('올바르지 않은 견적 정보입니다.');
      router.push('/mypage/quotes');
    }
  }, [quoteId]);

  const loadQuoteAndUser = async () => {
    try {
      setLoading(true);
      
      // 표준 인증 체크 패턴
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }
      setUser(user);

      // 계층적 견적 모델을 사용한 견적 조회
      const quoteData = await getQuoteWithItems(quoteId);
      
      if (!quoteData) {
        alert('견적을 찾을 수 없습니다.');
        router.push('/mypage/quotes');
        return;
      }

      setQuote(quoteData);

      // 기존 사용자 정보 조회
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(); // single() 대신 maybeSingle() 사용

      if (userData) {
        setProfile({
          name: userData.name || '',
          phone: userData.phone || '',
          birth_date: userData.birth_date || '',
          address: userData.address || '',
          emergency_contact: userData.emergency_contact || '',
          emergency_phone: userData.emergency_phone || '',
          passport_number: userData.passport_number || '',
          passport_expiry: userData.passport_expiry || ''
        });
      }
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
      alert('데이터 로딩 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (!user || !quote) return;

      // 1. users 테이블에 상세 정보 업데이트 (회원 승인)
      const { error: userUpdateError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          role: 'user', // 회원 권한 부여
          status: 'active', // 활성 상태
          ...profile,
          updated_at: new Date().toISOString()
        });

      if (userUpdateError) {
        throw userUpdateError;
      }

      // 2. 예약 데이터 생성
      const reservationData = {
        re_user_id: user.id,
        re_quote_id: quote.quote_id,
        re_type: 'cruise',
        re_status: 'pending',
        re_total_amount: quote.total_price || 0,
        re_created_at: new Date().toISOString(),
        re_updated_at: new Date().toISOString()
      };

      const { data: reservationResult, error: reservationError } = await supabase
        .from('reservation')
        .insert(reservationData)
        .select()
        .single();

      if (reservationError) {
        throw reservationError;
      }

      // 3. 견적 상태를 '예약됨'으로 변경
      const { error: quoteUpdateError } = await supabase
        .from('quote')
        .update({ 
          status: 'reserved',
          updated_at: new Date().toISOString()
        })
        .eq('quote_id', quote.quote_id);

      if (quoteUpdateError) {
        console.error('⚠️ 견적 상태 업데이트 실패:', quoteUpdateError);
      }

      alert('🎉 예약이 완료되었습니다! 회원으로 승인되었습니다.');
      
      // 회원 권한 페이지(마이페이지)로 이동
      router.push('/mypage');

    } catch (error: any) {
      console.error('예약 처리 실패:', error);
      alert('예약 처리 실패: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">견적 정보를 불러오는 중...</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!quote) {
    return (
      <PageWrapper>
        <div className="text-center py-12">
          <p className="text-gray-600">견적을 찾을 수 없습니다.</p>
          <button
            onClick={() => router.push('/mypage/quotes')}
            className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            견적 목록으로 돌아가기
          </button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* 페이지 헤더 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🎫 예약하기</h1>
          <p className="text-gray-600">견적을 바탕으로 예약을 진행하고 회원으로 가입됩니다</p>
        </div>

        {/* 견적 요약 */}
        <SectionBox title="📋 선택한 견적 정보" icon={<Ship className="w-6 h-6" />}>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">견적명</p>
                <p className="font-semibold">{quote.title || '크루즈 견적'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">총 예상 금액</p>
                <p className="font-semibold text-lg text-blue-600">
                  ₩{(quote.total_price || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">서비스 항목</p>
                <p className="font-semibold">
                  {quote.items?.length || 0}개 서비스
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">견적 상태</p>
                <p className="font-semibold text-green-600">
                  {quote.status === 'draft' ? '작성중' : 
                   quote.status === 'submitted' ? '제출됨' : '처리중'}
                </p>
              </div>
            </div>
          </div>
        </SectionBox>

        {/* 개인정보 입력 폼 */}
        <SectionBox title="👤 회원 정보 입력" icon={<User className="w-6 h-6" />}>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* 기본 정보 */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  성명 *
                </label>
                <input
                  type="text"
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                  required
                  placeholder="실명을 입력하세요"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  연락처 *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  required
                  placeholder="010-0000-0000"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  생년월일 *
                </label>
                <input
                  type="date"
                  name="birth_date"
                  value={profile.birth_date}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CreditCard className="w-4 h-4 inline mr-2" />
                  여권번호
                </label>
                <input
                  type="text"
                  name="passport_number"
                  value={profile.passport_number}
                  onChange={handleChange}
                  placeholder="여권번호 (선택사항)"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                주소 *
              </label>
              <textarea
                name="address"
                value={profile.address}
                onChange={handleChange}
                required
                rows={2}
                placeholder="상세 주소를 입력하세요"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* 비상연락처 */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">🚨 비상연락처</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    비상연락처 이름
                  </label>
                  <input
                    type="text"
                    name="emergency_contact"
                    value={profile.emergency_contact}
                    onChange={handleChange}
                    placeholder="가족, 친구 등"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    비상연락처 번호
                  </label>
                  <input
                    type="tel"
                    name="emergency_phone"
                    value={profile.emergency_phone}
                    onChange={handleChange}
                    placeholder="010-0000-0000"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 제출 버튼 */}
            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition-colors"
              >
                취소
              </button>
              
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    예약 처리 중...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    예약하고 회원가입 완료
                  </>
                )}
              </button>
            </div>
          </form>
        </SectionBox>

        {/* 안내사항 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 mb-2">📌 예약 안내사항</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• 예약 완료 후 회원으로 자동 승인됩니다</li>
            <li>• 입력하신 정보는 여행 및 예약 관리에만 사용됩니다</li>
            <li>• 예약 확정 후 담당자가 연락드립니다</li>
            <li>• 여권 정보는 해외여행 시에만 필요합니다</li>
          </ul>
        </div>
      </div>
    </PageWrapper>
  );
}