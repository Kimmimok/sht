'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import { AuthWrapper } from '@/components/AuthWrapper';

interface QuoteData {
  id: string;
  user_id: string;
  status: string;
  title: string;
  description: string | null;
  total_price: number;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  manager_note: string | null;
}

interface QuoteItemData {
  id: string;
  quote_id: string;
  service_type: string;
  service_ref_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  options: any;
  created_at: string;
  updated_at: string;
}

interface ReservationFormData {
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  emergency_contact: string;
  special_requests: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
}

export default function QuoteReservationPage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [quoteItems, setQuoteItems] = useState<QuoteItemData[]>([]);
  const [formData, setFormData] = useState<ReservationFormData>({
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    emergency_contact: '',
    special_requests: '',
    applicant_name: '',
    applicant_email: '',
    applicant_phone: ''
  });

  useEffect(() => {
    loadQuoteAndUserData();
  }, [quoteId]);

  const loadQuoteAndUserData = async () => {
    try {
      // 사용자 인증 확인
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }

      setUser(user);

      // 견적 정보 조회
      const { data: quoteData, error: quoteError } = await supabase
        .from('quote')
        .select('*')
        .eq('id', quoteId)
        .eq('user_id', user.id) // 본인의 견적만 조회
        .single();

      if (quoteError || !quoteData) {
        console.error('견적 조회 오류:', quoteError);
        alert('견적을 찾을 수 없습니다.');
        router.push('/mypage/quotes');
        return;
      }

      // 확정된 견적인지 확인
      if (!['approved', 'confirmed', 'completed'].includes(quoteData.status)) {
        alert('확정된 견적만 예약할 수 있습니다.');
        router.push('/mypage/quotes');
        return;
      }

      setQuote(quoteData);

      // 견적 항목들 조회
      const { data: itemsData, error: itemsError } = await supabase
        .from('quote_item')
        .select('*')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: true });

      if (itemsError) {
        console.error('견적 항목 조회 오류:', itemsError);
      } else {
        setQuoteItems(itemsData || []);
      }

      // 사용자 정보로 폼 초기화
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('name, email, phone, phone_number, emergency_contact, emergency_phone')
        .eq('id', user.id)
        .single();

      if (userData) {
        setFormData(prev => ({
          ...prev,
          contact_name: userData.name || '',
          contact_email: userData.email || '',
          contact_phone: userData.phone || userData.phone_number || '',
          emergency_contact: userData.emergency_contact || '',
          applicant_name: userData.name || '',
          applicant_email: userData.email || '',
          applicant_phone: userData.phone || userData.phone_number || ''
        }));
      }

    } catch (error) {
      console.error('데이터 로드 오류:', error);
      alert('데이터를 불러오는 중 오류가 발생했습니다.');
      router.push('/mypage/quotes');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quote || !user) return;

    // 필수 필드 검증
    if (!formData.contact_name || !formData.contact_phone || !formData.contact_email) {
      alert('연락처 정보를 모두 입력해주세요.');
      return;
    }

    if (!formData.applicant_name || !formData.applicant_phone || !formData.applicant_email) {
      alert('신청자 정보를 모두 입력해주세요.');
      return;
    }

    setSubmitting(true);

    try {
      // 예약 정보 생성
      const reservationData = {
        re_user_id: user.id,
        re_quote_id: quote.id,
        re_type: 'quote', // 견적 기반 예약
        re_status: 'pending',
        re_created_at: new Date().toISOString(),
        contact_name: formData.contact_name,
        contact_phone: formData.contact_phone,
        contact_email: formData.contact_email,
        emergency_contact: formData.emergency_contact,
        special_requests: formData.special_requests,
        applicant_name: formData.applicant_name,
        applicant_email: formData.applicant_email,
        applicant_phone: formData.applicant_phone,
        application_datetime: new Date().toISOString()
      };

      const { data: reservationResult, error: reservationError } = await supabase
        .from('reservation')
        .insert(reservationData)
        .select()
        .single();

      if (reservationError) {
        console.error('예약 생성 오류:', reservationError);
        alert('예약 생성 중 오류가 발생했습니다.');
        return;
      }

      // 견적 상태를 'reserved'로 업데이트 (선택사항)
      await supabase
        .from('quote')
        .update({ status: 'reserved', updated_at: new Date().toISOString() })
        .eq('id', quote.id);

      alert('예약이 성공적으로 신청되었습니다!');
      router.push(`/mypage/reservations/${reservationResult.re_id}/view`);

    } catch (error) {
      console.error('예약 신청 오류:', error);
      alert('예약 신청 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const getServiceIcon = (serviceType: string) => {
    const icons: { [key: string]: string } = {
      cruise: '🚢',
      airport: '✈️',
      hotel: '🏨',
      tour: '🗺️',
      rentcar: '🚗',
      room: '🛏️',
      car: '🚙'
    };
    return icons[serviceType] || '📋';
  };

  const getServiceName = (serviceType: string) => {
    const names: { [key: string]: string } = {
      cruise: '크루즈',
      airport: '공항 서비스',
      hotel: '호텔',
      tour: '투어',
      rentcar: '렌터카',
      room: '객실',
      car: '차량'
    };
    return names[serviceType] || serviceType;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">견적 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">견적을 찾을 수 없습니다</h2>
          <button
            onClick={() => router.push('/mypage/quotes')}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
          >
            견적 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        {/* 헤더 */}
        <div className="bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-50 text-gray-700">
          <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">🎫 견적 예약 신청</h1>
              <p className="text-lg opacity-80">
                확정된 견적을 기반으로 예약을 신청하세요.
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => router.push('/mypage/quotes')}
                  className="bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-500 transition-all"
                >
                  ← 견적 목록
                </button>
                <button
                  onClick={() => router.push(`/mypage/quotes/${quote.id}/confirmed`)}
                  className="bg-blue-400 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-500 transition-all"
                >
                  📋 견적 상세보기
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-8">

            {/* 견적 정보 요약 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">📋 견적 정보</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">견적 상세</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div><span className="font-medium">견적명:</span> {quote.title}</div>
                    <div><span className="font-medium">상태:</span>
                      <span className="ml-2 px-2 py-1 bg-green-100 text-green-600 rounded-full text-xs">
                        {quote.status === 'approved' ? '승인됨' :
                          quote.status === 'confirmed' ? '확정됨' :
                            quote.status === 'completed' ? '완료됨' : quote.status}
                      </span>
                    </div>
                    <div><span className="font-medium">생성일:</span> {new Date(quote.created_at).toLocaleDateString('ko-KR')}</div>
                    <div><span className="font-medium">총 금액:</span>
                      <span className="ml-2 font-bold text-blue-600 text-lg">
                        {quote.total_price.toLocaleString()}동
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">포함 서비스</h3>
                  <div className="space-y-2">
                    {quoteItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <span className="text-blue-600">{getServiceIcon(item.service_type)}</span>
                          <span className="text-blue-800 font-medium">{getServiceName(item.service_type)}</span>
                        </div>
                        <div className="text-sm text-blue-600">
                          {item.total_price.toLocaleString()}동
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {quote.description && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">📝 견적 설명</h4>
                  <p className="text-gray-600">{quote.description}</p>
                </div>
              )}
            </div>

            {/* 예약 신청 폼 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">✍️ 예약 신청 정보</h2>

              <form onSubmit={handleSubmit} className="space-y-6">

                {/* 연락처 정보 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">📞 연락처 정보</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        연락처 담당자명 *
                      </label>
                      <input
                        type="text"
                        name="contact_name"
                        value={formData.contact_name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="연락 받을 담당자명"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        연락처 전화번호 *
                      </label>
                      <input
                        type="tel"
                        name="contact_phone"
                        value={formData.contact_phone}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="010-0000-0000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        연락처 이메일 *
                      </label>
                      <input
                        type="email"
                        name="contact_email"
                        value={formData.contact_email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="contact@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        비상연락처
                      </label>
                      <input
                        type="tel"
                        name="emergency_contact"
                        value={formData.emergency_contact}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="비상시 연락할 번호"
                      />
                    </div>
                  </div>
                </div>

                {/* 신청자 정보 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">👤 신청자 정보</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        신청자명 *
                      </label>
                      <input
                        type="text"
                        name="applicant_name"
                        value={formData.applicant_name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="예약 신청자명"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        신청자 전화번호 *
                      </label>
                      <input
                        type="tel"
                        name="applicant_phone"
                        value={formData.applicant_phone}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="010-0000-0000"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        신청자 이메일 *
                      </label>
                      <input
                        type="email"
                        name="applicant_email"
                        value={formData.applicant_email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="applicant@example.com"
                      />
                    </div>
                  </div>
                </div>

                {/* 특별 요청사항 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">📝 특별 요청사항</h3>
                  <textarea
                    name="special_requests"
                    value={formData.special_requests}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="특별한 요청사항이나 문의사항을 입력해주세요..."
                  />
                </div>

                {/* 제출 버튼 */}
                <div className="flex gap-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => router.push('/mypage/quotes')}
                    className="flex-1 bg-gray-400 text-white py-3 rounded-lg font-medium hover:bg-gray-500 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? '예약 신청 중...' : '🎫 예약 신청하기'}
                  </button>
                </div>
              </form>
            </div>

            {/* 안내사항 */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-600 mb-3">💡 예약 신청 안내</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-600 text-sm">
                <div className="flex items-center space-x-2">
                  <span>✅</span>
                  <span>예약 신청 후 담당자가 연락드립니다</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>📞</span>
                  <span>정확한 연락처 정보를 입력해주세요</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>💰</span>
                  <span>결제 안내는 별도로 제공됩니다</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>🔄</span>
                  <span>예약 상태는 마이페이지에서 확인 가능</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}
