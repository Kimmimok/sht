'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

export default function CustomerManagement() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at'); // created_at, name, email, quote_count
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadCustomers();
    }
  }, [user, searchTerm, sortBy, sortOrder]);

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

  const loadCustomers = async () => {
    try {
      console.log('👥 고객 데이터 로딩 시작...');
      console.log('🔍 검색어:', searchTerm || '없음', '정렬:', sortBy, sortOrder);

      // 기본 고객 정보 조회
      let query = supabase
        .from('users')
        .select('*')
        .in('role', ['member', 'guest', 'user']); // 다양한 role 지동

      // 검색어 적용
      if (searchTerm && searchTerm.trim()) {
        console.log('🔍 검색어 적용:', searchTerm);
        query = query.or(`email.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`);
      }

      // 정렬 적용
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data: customerData, error } = await query;
      
      console.log('📊 고객 조회 결과:');
      console.log('  - 고객 수:', customerData?.length || 0);
      console.log('  - 오류:', error?.message || '없음');
      
      if (error) {
        console.error('❌ 고객 데이터 조회 실패:', error);
        setCustomers([]);
        return;
      }

      if (!customerData || customerData.length === 0) {
        console.log('📭 고객 데이터 없음');
        setCustomers([]);
        return;
      }

      console.log('✅ 고객 데이터 발견:', customerData.length, '명');

      // 각 고객의 견적 통계를 병렬로 조회
      const customersWithStats = await Promise.all(
        customerData.map(async (customer: any) => {
          try {
            // 견적 수 조회
            const { count: quoteCount } = await supabase
              .from('quote')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', customer.id);

            // 최근 견적 조회
            const { data: lastQuote } = await supabase
              .from('quote')
              .select('created_at, status')
              .eq('user_id', customer.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            return {
              ...customer,
              quote_count: quoteCount || 0,
              last_activity: lastQuote?.created_at || customer.created_at,
              last_quote_status: lastQuote?.status || '없음'
            };
          } catch (error) {
            console.warn(`⚠️ 고객 ${customer.id} 통계 조회 실패:`, error);
            return {
              ...customer,
              quote_count: 0,
              last_activity: customer.created_at,
              last_quote_status: '없음'
            };
          }
        })
      );

      console.log('✅ 고객 데이터 (통계 포함):', customersWithStats.length, '명');
      setCustomers(customersWithStats);

    } catch (error) {
      console.error('❌ 고객 로드 완전 실패:', error);
      setCustomers([]);
    }
  };

  const viewCustomerDetail = async (customerId: string) => {
    try {
      // 고객 상세 정보 조회
      const { data: customer } = await supabase
        .from('users')
        .select('*')
        .eq('id', customerId)
        .single();

      // 고객의 견적 목록 조회
      const { data: quotes } = await supabase
        .from('quote')
        .select(`
          *,
          schedule_info!quote_schedule_code_fkey(name),
          cruise_info!quote_cruise_code_fkey(name),
          payment_info!quote_payment_code_fkey(name)
        `)
        .eq('user_id', customerId)
        .order('created_at', { ascending: false });

      setSelectedCustomer({
        ...customer,
        quotes: quotes || []
      });
      setShowModal(true);
    } catch (error) {
      console.error('고객 상세 정보 로드 실패:', error);
    }
  };

  const updateCustomerInfo = async (customerId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', customerId);

      if (error) throw error;

      alert('고객 정보가 업데이트되었습니다.');
      loadCustomers();
      setShowModal(false);
    } catch (error) {
      console.error('고객 정보 업데이트 실패:', error);
      alert('업데이트에 실패했습니다.');
    }
  };

  const getActivityBadge = (lastStatus: string, lastActivity: string) => {
    const daysSince = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSince <= 7) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">활성</span>;
    } else if (daysSince <= 30) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">보통</span>;
    } else {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">비활성</span>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
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
              <h1 className="text-3xl font-bold text-gray-900">👥 고객 관리</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">매니저: {user?.email}</div>
              <button
                onClick={() => router.push('/manager/dashboard')}
                className="p-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                title="대시보드로 이동"
              >
                �
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 검색 및 정렬 */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="고객 이름 또는 이메일로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="created_at">가입일</option>
              <option value="name">이름</option>
              <option value="email">이메일</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="desc">내림차순</option>
              <option value="asc">오름차순</option>
            </select>
          </div>
        </div>

        {/* 고객 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">총 고객 수</div>
            <div className="text-2xl font-bold text-gray-900">{customers.length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">활성 고객</div>
            <div className="text-2xl font-bold text-green-600">
              {customers.filter(c => {
                const daysSince = Math.floor((Date.now() - new Date(c.last_activity).getTime()) / (1000 * 60 * 60 * 24));
                return daysSince <= 7;
              }).length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">예약 고객</div>
            <div className="text-2xl font-bold text-blue-600">
              {customers.filter(c => c.confirmed_count > 0).length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">신규 고객 (30일)</div>
            <div className="text-2xl font-bold text-purple-600">
              {customers.filter(c => {
                const daysSince = Math.floor((Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24));
                return daysSince <= 30;
              }).length}
            </div>
          </div>
        </div>

        {/* 고객 목록 */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {customers.length === 0 ? (
              <li className="px-6 py-8 text-center text-gray-500">
                고객이 없습니다.
              </li>
            ) : (
              customers.map((customer) => (
                <li key={customer.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                          {customer.name ? customer.name.charAt(0) : customer.email.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {customer.name || '이름 없음'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {customer.email}
                        </div>
                        <div className="text-xs text-gray-400">
                          가입일: {formatDate(customer.created_at)} • 
                          견적 {customer.quote_count}건 • 
                          예약 {customer.confirmed_count}건
                        </div>
                        <div className="mt-1">
                          {getActivityBadge(customer.last_status, customer.last_activity)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => viewCustomerDetail(customer.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                      >
                        상세보기
                      </button>
                      <button
                        onClick={() => router.push(`/manager/quotes?customer=${customer.id}`)}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                      >
                        견적 보기
                      </button>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {/* 고객 상세 모달 */}
      {showModal && selectedCustomer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">고객 상세 정보</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">이름</label>
                  <input
                    type="text"
                    defaultValue={selectedCustomer.name || ''}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    onBlur={(e) => {
                      if (e.target.value !== selectedCustomer.name) {
                        updateCustomerInfo(selectedCustomer.id, { name: e.target.value });
                      }
                    }}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">전화번호</label>
                  <input
                    type="text"
                    defaultValue={selectedCustomer.phone || ''}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    onBlur={(e) => {
                      if (e.target.value !== selectedCustomer.phone) {
                        updateCustomerInfo(selectedCustomer.id, { phone: e.target.value });
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">이메일</label>
                  <input
                    type="email"
                    value={selectedCustomer.email}
                    disabled
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">견적 이력</label>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                    {selectedCustomer.quotes?.length > 0 ? (
                      selectedCustomer.quotes.map((quote: any) => (
                        <div key={quote.id} className="p-3 border-b border-gray-100 last:border-b-0">
                          <div className="text-sm font-medium">
                            {quote.schedule_info?.name} • {quote.cruise_info?.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            체크인: {formatDate(quote.checkin)} • 상태: {quote.status}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-sm text-gray-500">견적 이력이 없습니다.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

