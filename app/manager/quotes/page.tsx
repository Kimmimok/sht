'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

export default function QuoteManagement() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected
  const [searchTerm, setSearchTerm] = useState('');
  const [showQuickActionModal, setShowQuickActionModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [actionNote, setActionNote] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadQuotes();
    }
  }, [user, filter, searchTerm]);

  const checkAuth = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.log('❌ 사용자 인증 실패:', userError?.message);
        router.push('/login');
        return;
      }

      // 매니저 권한 확인
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('❌ 프로필 조회 실패:', profileError);
        alert('사용자 정보를 확인할 수 없습니다.');
        router.push('/login');
        return;
      }

      if (!profile || (profile.role !== 'manager' && profile.role !== 'admin')) {
        console.log('❌ 권한 부족:', profile?.role);
        alert('매니저 권한이 필요합니다.');
        router.push('/');
        return;
      }

      console.log('✅ 매니저 권한 확인됨:', profile.role);
      setUser(user);
    } catch (error) {
      console.error('❌ 인증 확인 오류:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadQuotes = async () => {
    try {
      console.log('🔄 견적 데이터 로딩 시작...');
      console.log('📋 필터:', filter, '검색어:', searchTerm || '없음');
      
      // 기본 쿼리 - users 조인 제거하고 단순하게 시작
      let query = supabase
        .from('quote')
        .select('*')
        .order('created_at', { ascending: false });

      // 필터 적용
      if (filter !== 'all') {
        console.log('🔍 상태 필터 적용:', filter);
        // pending을 submitted로도 매칭하고, 다양한 상태 처리
        if (filter === 'pending') {
          query = query.in('status', ['pending', 'submitted', 'draft']);
        } else if (filter === 'approved') {
          query = query.eq('status', 'approved');
        } else if (filter === 'confirmed') {
          query = query.in('status', ['confirmed', 'reserved']);
        } else {
          query = query.eq('status', filter);
        }
      }

      // 검색어 적용 (존재하는 필드만 검색)
      if (searchTerm && searchTerm.trim()) {
        console.log('🔍 검색어 적용:', searchTerm);
        query = query.or(`id.ilike.%${searchTerm}%,user_id.ilike.%${searchTerm}%`);
      }

      const { data: quotesData, error: quotesError } = await query;
      
      console.log('� 견적 조회 결과:');
      console.log('  - 견적 수:', quotesData?.length || 0);
      console.log('  - 오류:', quotesError?.message || '없음');
      
      if (quotesError) {
        console.error('❌ 견적 데이터 조회 실패:', quotesError);
        setQuotes([]);
        return;
      }

      // 사용자 정보를 별도로 조회
      if (quotesData && quotesData.length > 0) {
        console.log('👥 사용자 정보 추가 조회...');
        const userIds = [...new Set(quotesData.map((q: any) => q.user_id))];
        
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, name, email, phone_number')
          .in('id', userIds);

        if (usersError) {
          console.warn('⚠️ 사용자 정보 조회 실패:', usersError.message);
        }

        // 견적 데이터에 사용자 정보 매핑
        const quotesWithUsers = quotesData.map((quote: any) => {
          const user = usersData?.find((u: any) => u.id === quote.user_id);
          return {
            ...quote,
            users: user || { name: '알 수 없음', email: '미확인', phone_number: '미확인' }
          };
        });

        console.log('✅ 견적 데이터 (사용자 정보 포함):', quotesWithUsers.length, '건');
        setQuotes(quotesWithUsers);
      } else {
        console.log('📭 견적 데이터 없음');
        setQuotes([]);
      }

    } catch (error) {
      console.error('❌ 견적 로드 완전 실패:', error);
      setQuotes([]);
    }
  };

  const updateQuoteStatus = async (quoteId: string, status: string) => {
    try {
      console.log('🔄 견적 상태 업데이트 시작...', { quoteId, status });
      
      const updateData: any = { 
        status, 
        updated_at: new Date().toISOString() 
      };

      // 노트가 있으면 추가
      if (actionNote.trim()) {
        updateData.manager_note = actionNote.trim();
      }

      console.log('📝 업데이트 데이터:', updateData);
      
      const { data, error } = await supabase
        .from('quote')
        .update(updateData)
        .eq('id', quoteId)
        .select(); // 업데이트된 데이터를 반환받음

      if (error) {
        console.error('❌ Supabase 에러 상세:', error);
        throw error;
      }

      console.log('✅ 상태 업데이트 성공:', data);

      const statusLabels: { [key: string]: string } = {
        approved: '승인',
        rejected: '거절'
      };

      alert(`견적이 ${statusLabels[status] || status}되었습니다.${status === 'approved' ? ' 고객이 예약 신청을 할 수 있습니다.' : ''}`);
      setShowQuickActionModal(false);
      setActionNote('');
      setSelectedQuote(null);
      await loadQuotes();
    } catch (error: any) {
      console.error('❌ 상태 업데이트 실패:', error);
      console.error('❌ 에러 메시지:', error?.message);
      console.error('❌ 에러 코드:', error?.code);
      alert(`상태 업데이트에 실패했습니다.\n에러: ${error?.message || '알 수 없는 오류'}`);
    }
  };

  const handleQuickAction = (quote: any, action: 'approve' | 'reject') => {
    setSelectedQuote(quote);
    setActionType(action);
    setActionNote('');
    setShowQuickActionModal(true);
  };

  const executeQuickAction = () => {
    if (!selectedQuote) return;
    
    // 거절의 경우 사유가 필수
    if (actionType === 'reject' && !actionNote.trim()) {
      alert('거절 사유를 입력해주세요.');
      return;
    }

    // 승인의 경우 approved 상태로 변경 (고객이 예약 신청할 수 있도록)
    const finalStatus = actionType === 'approve' ? 'approved' : 'rejected';
    updateQuoteStatus(selectedQuote.id, finalStatus);
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
      pending: '대기중',
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

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-lg text-gray-600">로딩 중...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">📋 견적 관리</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">매니저: {user?.email}</div>
              <button
                onClick={() => router.push('/manager/dashboard')}
                className="p-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                title="대시보드로 이동"
              >
                📊
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 필터 및 검색 */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              검토 대기
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'approved'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              승인됨
            </button>
            <button
              onClick={() => setFilter('confirmed')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'confirmed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              확정됨
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'rejected'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              거절됨
            </button>
          </div>
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="제목, 설명, 고객명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* 견적 목록 */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {quotes.length === 0 ? (
              <li className="px-6 py-8 text-center text-gray-500">
                검색 조건에 맞는 견적이 없습니다.
              </li>
            ) : (
              quotes.map((quote) => (
                <li key={quote.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {getStatusBadge(quote.status || 'pending')}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          견적 ID: {quote.id?.slice(0, 8)}...
                        </div>
                        <div className="text-sm text-gray-600">
                          고객: {quote.users?.name || quote.users?.email || '고객 정보 없음'}
                          {quote.users?.phone_number && (
                            <span className="ml-2 text-gray-500">
                              📞 {quote.users.phone_number}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          출발일: {quote.departure_date ? new Date(quote.departure_date).toLocaleDateString() : '미정'} • 
                          인동: 성인 {quote.adult_count || 0}명
                          {quote.child_count > 0 && `, 아동 ${quote.child_count}명`}
                          {quote.infant_count > 0 && `, 유아 ${quote.infant_count}명`}
                        </div>
                        <div className="text-xs text-gray-400 flex items-center space-x-4">
                          <span>견적가: {quote.total_price?.toLocaleString() || '0'}동</span>
                          <span>생성일: {new Date(quote.created_at).toLocaleDateString()}</span>
                          {quote.manager_note && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              📝 노트 있음
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => router.push(`/manager/quotes/${quote.id}`)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                      >
                        상세보기
                      </button>
                      {(quote.status === 'pending' || quote.status === 'submitted' || quote.status === 'draft') && (
                        <>
                          <button
                            onClick={() => handleQuickAction(quote, 'approve')}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => handleQuickAction(quote, 'reject')}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                          >
                            거절
                          </button>
                        </>
                      )}
                      {quote.status === 'approved' && (
                        <div className="text-sm text-green-600 font-medium">
                          ✅ 고객 예약 신청 대기중
                        </div>
                      )}
                      {(quote.status === 'confirmed' || quote.status === 'reserved') && (
                        <button
                          onClick={() => router.push('/manager/reservations')}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                        >
                          예약관리
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* 상태별 요약 */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {quotes.length}
              </div>
              <div className="text-sm text-gray-500">전체 견적</div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {quotes.filter(q => ['pending', 'submitted', 'draft'].includes(q.status)).length}
              </div>
              <div className="text-sm text-gray-500">검토 대기</div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {quotes.filter(q => q.status === 'approved').length}
              </div>
              <div className="text-sm text-gray-500">승인됨</div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {quotes.filter(q => ['confirmed', 'reserved'].includes(q.status)).length}
              </div>
              <div className="text-sm text-gray-500">확정됨</div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {quotes.filter(q => q.status === 'rejected').length}
              </div>
              <div className="text-sm text-gray-500">거절됨</div>
            </div>
          </div>
        </div>
      </div>

      {/* 빠른 액션 모달 */}
      {showQuickActionModal && selectedQuote && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                견적 {actionType === 'approve' ? '승인' : '거절'}
              </h3>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm font-medium text-gray-900">
                  고객: {selectedQuote.users?.name || selectedQuote.users?.email || '정보 없음'}
                </p>
                <p className="text-sm text-gray-600">
                  견적가: {selectedQuote.total_price?.toLocaleString() || '0'}동
                </p>
                <p className="text-xs text-gray-500">
                  ID: {selectedQuote.id}
                </p>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                {actionType === 'approve' && '이 견적을 승인하시겠습니까? 승인 후 고객이 예약 신청을 할 수 있습니다.'}
                {actionType === 'reject' && '이 견적을 거절하시겠습니까? 거절 사유를 반드시 입력해주세요.'}
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {actionType === 'approve' && '승인 메모 (선택사항)'}
                  {actionType === 'reject' && '거절 사유 (필수)'}
                </label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  rows={3}
                  placeholder={
                    actionType === 'approve' ? '고객에게 전달할 추가 안내사항을 입력하세요...' :
                    '거절 사유를 구체적으로 입력해주세요...'
                  }
                  required={actionType === 'reject'}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={executeQuickAction}
                  disabled={actionType === 'reject' && !actionNote.trim()}
                  className={`flex-1 font-medium py-2 px-4 rounded-md text-white ${
                    actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                    'bg-red-600 hover:bg-red-700'
                  } disabled:bg-gray-300`}
                >
                  {actionType === 'approve' ? '승인하기' : '거절하기'}
                </button>
                <button
                  onClick={() => setShowQuickActionModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-md"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

