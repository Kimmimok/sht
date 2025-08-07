'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import ManagerLayout from '@/components/ManagerLayout';
import { cancelQuoteApproval, reapproveQuote } from '@/lib/quoteActions';

interface Quote {
  id: string;
  title: string;
  status: string;
  user_id: string;
  created_at: string;
  approved_at?: string;
  total_price?: number;
  user_nickname?: string;
}

function ManagerQuotesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>(searchParams?.get('filter') || 'all');
  const [managerId, setManagerId] = useState<string>('');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (managerId) {
      loadQuotes();
    }
  }, [filter, managerId]);

  const checkAuth = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('🚨 인증 오류:', userError);
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }

      console.log('✅ 인증된 사용자:', user.email);

      // 매니저/관리자 권한 확인
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userDataError) {
        console.error('🚨 사용자 데이터 조회 오류:', userDataError);
        console.warn('⚠️ users 테이블에서 사용자 정보를 찾을 수 없습니다. 관리자 권한으로 진행합니다.');
        setManagerId(user.id);
        return;
      }

      if (!userData || !['manager', 'admin'].includes(userData.role)) {
        alert('매니저 권한이 필요합니다.');
        router.push('/');
        return;
      }

      console.log('✅ 권한 확인 완료:', userData.role);
      setManagerId(user.id);
    } catch (error) {
      console.error('🚨 권한 확인 중 오류:', error);
      alert('권한 확인 중 오류가 발생했습니다.');
      router.push('/');
    }
  };

  const loadQuotes = async () => {
    setLoading(true);
    try {
      console.log('📋 견적 목록 조회 시작...');

      // 견적 데이터와 사용자 닉네임 조회
      let query = supabase
        .from('quote')
        .select(`
          id, 
          title, 
          status, 
          user_id, 
          created_at, 
          approved_at, 
          total_price
        `)
        .order('created_at', { ascending: false });

      // 필터 적용
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data: quotesData, error } = await query;

      if (error) {
        console.error('🚨 견적 목록 조회 오류:', error);
        alert(`견적 목록을 불러오는 중 오류가 발생했습니다: ${error.message}`);
        return;
      }

      // 사용자 닉네임 정보 추가
      const quotesWithNickname = await Promise.all(
        (quotesData || []).map(async (quote) => {
          // 사용자 ID로 닉네임 생성 (이메일 앞부분 또는 ID 앞 8자리)
          let nickname = quote.user_id.slice(0, 8) + '...';

          try {
            // users 테이블에서 실제 사용자 정보 조회 시도
            const { data: userData } = await supabase
              .from('users')
              .select('email, name')
              .eq('id', quote.user_id)
              .single();

            if (userData) {
              // 사용자가 등록되어 있는 경우
              if (userData.name) {
                nickname = userData.name;
              } else if (userData.email) {
                nickname = userData.email.split('@')[0];
              }
            }
          } catch (error) {
            // users 테이블에 없는 경우 (견적자) - 기본 닉네임 사용
            console.log('👁️ 견적자(미등록 사용자):', quote.user_id.slice(0, 8));
          }

          return {
            ...quote,
            user_nickname: nickname
          };
        })
      );

      console.log('✅ 조회된 견적 수:', quotesWithNickname.length);
      setQuotes(quotesWithNickname);

    } catch (error) {
      console.error('🚨 견적 로드 오류:', error);
      alert('견적 로드 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 승인 취소 처리
  const handleCancelApproval = async (quoteId: string, quoteTitle: string) => {
    const confirmed = confirm(
      `"${quoteTitle}" 견적의 승인을 취소하시겠습니까?\n\n` +
      '승인 취소 후:\n' +
      '• 견적 상태가 "작성 중"으로 변경됩니다\n' +
      '• 고객이 다시 견적을 수정할 수 있습니다\n' +
      '• 예약 진행이 불가능해집니다'
    );

    if (!confirmed) return;

    const reason = prompt('승인 취소 사유를 입력해주세요 (선택사항):');

    setActionLoading(quoteId);
    try {
      const result = await cancelQuoteApproval(quoteId, managerId, reason || undefined);

      if (result.success) {
        alert(result.message);
        loadQuotes(); // 목록 새로고침
      } else {
        alert(`승인 취소 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('🚨 승인 취소 오류:', error);
      alert('승인 취소 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  // 재승인 처리
  const handleReapprove = async (quoteId: string, quoteTitle: string) => {
    const confirmed = confirm(`"${quoteTitle}" 견적을 승인하시겠습니까?`);
    if (!confirmed) return;

    setActionLoading(quoteId);
    try {
      const result = await reapproveQuote(quoteId, managerId);

      if (result.success) {
        alert(result.message);
        loadQuotes(); // 목록 새로고침
      } else {
        alert(`승인 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('🚨 재승인 오류:', error);
      alert('재승인 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  // 상태별 스타일
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-50 text-gray-600';
      case 'pending':
        return 'bg-yellow-50 text-yellow-600';
      case 'approved':
        return 'bg-green-50 text-green-600';
      case 'rejected':
        return 'bg-red-50 text-red-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return '작성 중';
      case 'pending':
        return '검토 대기';
      case 'approved':
        return '승인됨';
      case 'rejected':
        return '거부됨';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <ManagerLayout title="견적 관리" activeTab="quotes">
        <div className="flex flex-col justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">견적을 불러오는 중...</p>
        </div>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout title="견적 관리" activeTab="quotes">
      <div className="space-y-6">
        {/* 통계 요약 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded border border-gray-200 p-4">
            <div className="text-lg font-medium text-gray-800">
              {quotes.length}
            </div>
            <div className="text-xs text-gray-600">전체 견적</div>
          </div>
          <div className="bg-white rounded border border-gray-200 p-4">
            <div className="text-lg font-medium text-yellow-600">
              {quotes.filter(q => q.status === 'pending').length}
            </div>
            <div className="text-xs text-gray-600">검토 대기</div>
          </div>
          <div className="bg-white rounded border border-gray-200 p-4">
            <div className="text-lg font-medium text-green-600">
              {quotes.filter(q => q.status === 'approved').length}
            </div>
            <div className="text-xs text-gray-600">승인됨</div>
          </div>
          <div className="bg-white rounded border border-gray-200 p-4">
            <div className="text-lg font-medium text-gray-600">
              {quotes.filter(q => q.status === 'draft').length}
            </div>
            <div className="text-xs text-gray-600">작성 중</div>
          </div>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded border border-gray-200 p-4">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: '전체' },
              { key: 'draft', label: '작성 중' },
              { key: 'pending', label: '검토 대기' },
              { key: 'approved', label: '승인됨' },
              { key: 'rejected', label: '거부됨' }
            ].map((filterOption) => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key)}
                className={`px-3 py-1 rounded border text-sm ${filter === filterOption.key
                  ? 'bg-blue-50 text-blue-600 border-blue-200'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
              >
                {filterOption.label}
              </button>
            ))}
          </div>
        </div>

        {/* 견적 목록 */}
        <div className="space-y-3">
          {quotes.length === 0 ? (
            <div className="bg-white rounded border border-gray-200 p-8 text-center">
              <div className="text-4xl mb-4">📋</div>
              <p className="text-gray-500 mb-2">조건에 맞는 견적이 없습니다.</p>
              <p className="text-xs text-gray-400">
                {filter === 'all' ? '전체' : getStatusText(filter)} 견적이 없습니다.
              </p>
              <button
                onClick={loadQuotes}
                className="mt-4 bg-blue-50 text-blue-600 px-4 py-2 rounded border text-sm hover:bg-blue-100"
              >
                다시 조회
              </button>
            </div>
          ) : (
            quotes.map((quote) => (
              <div key={quote.id} className="bg-white rounded border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-medium text-gray-800">{quote.title}</h3>
                      <span className={`px-2 py-1 rounded text-xs ${getStatusStyle(quote.status)}`}>
                        {getStatusText(quote.status)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex items-center gap-4">
                        <span>💼 주문 제목: <strong>{quote.title}</strong></span>
                        <span>👤 고객 닉네임: <strong>{quote.user_nickname}</strong></span>
                      </div>
                      <div>📅 생성일: {new Date(quote.created_at).toLocaleDateString('ko-KR')}</div>
                      {quote.approved_at && (
                        <div>✅ 승인일: {new Date(quote.approved_at).toLocaleDateString('ko-KR')}</div>
                      )}
                      {quote.total_price && (
                        <div>💰 총 금액: <strong>{quote.total_price.toLocaleString()}원</strong></div>
                      )}
                      <div className="text-xs text-gray-400">
                        🆔 견적 ID: {quote.id.slice(0, 8)}...
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* 상세보기 버튼 - 매니저 전용 경로 */}
                    <button
                      onClick={() => router.push(`/manager/quotes/${quote.id}/view`)}
                      className="bg-gray-50 text-gray-600 px-3 py-1 rounded border text-xs hover:bg-gray-100"
                    >
                      👁️ 상세보기
                    </button>

                    {/* 승인된 견적 - 승인 취소 버튼 */}
                    {quote.status === 'approved' && (
                      <button
                        onClick={() => handleCancelApproval(quote.id, quote.title)}
                        disabled={actionLoading === quote.id}
                        className="bg-red-50 text-red-600 px-3 py-1 rounded border text-xs hover:bg-red-100 disabled:opacity-50"
                      >
                        {actionLoading === quote.id ? '처리 중...' : '❌ 승인 취소'}
                      </button>
                    )}

                    {/* 작성 중/대기 중 견적 - 승인 버튼 */}
                    {(['draft', 'pending'].includes(quote.status)) && (
                      <button
                        onClick={() => handleReapprove(quote.id, quote.title)}
                        disabled={actionLoading === quote.id}
                        className="bg-green-50 text-green-600 px-3 py-1 rounded border text-xs hover:bg-green-100 disabled:opacity-50"
                      >
                        {actionLoading === quote.id ? '처리 중...' : '✅ 승인'}
                      </button>
                    )}

                    {/* 작성 중 견적 - 수정 버튼 */}
                    {quote.status === 'draft' && (
                      <button
                        onClick={() => router.push(`/quote/${quote.id}/edit`)}
                        className="bg-blue-50 text-blue-600 px-3 py-1 rounded border text-xs hover:bg-blue-100"
                      >
                        ✏️ 수정
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 새로고침 버튼 */}
        <div className="flex justify-center">
          <button
            onClick={loadQuotes}
            disabled={loading}
            className="bg-blue-50 text-blue-600 px-4 py-2 rounded border hover:bg-blue-100 disabled:opacity-50"
          >
            {loading ? '새로고침 중...' : '📋 목록 새로고침'}
          </button>
        </div>

        {/* 안내 메시지 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">📋 견적 승인 관리 안내</h4>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>• <strong>주문 제목</strong>: 고객이 입력한 견적 제목입니다</li>
            <li>• <strong>고객 닉네임</strong>: 등록된 고객은 이름/이메일, 견적자는 ID 앞 8자리로 표시</li>
            <li>• <strong>승인 취소</strong>: 승인된 견적을 다시 "작성 중" 상태로 되돌립니다</li>
            <li>• 승인 취소 후 고객이 견적을 다시 수정할 수 있습니다</li>
            <li>• 모든 승인 취소 내역은 기록됩니다</li>
          </ul>
        </div>
      </div>
    </ManagerLayout>
  );
}

export default function ManagerQuotesPage() {
  return (
    <Suspense fallback={
      <ManagerLayout title="견적 관리" activeTab="quotes">
        <div className="flex flex-col justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">견적을 불러오는 중...</p>
        </div>
      </ManagerLayout>
    }>
      <ManagerQuotesContent />
    </Suspense>
  );
}

