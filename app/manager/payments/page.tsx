'use client';

import React, { useState, useEffect } from 'react';
import ManagerLayout from '@/components/ManagerLayout';
import { supabase } from '@/lib/supabase';
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  Search
} from 'lucide-react';

export default function ManagerPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      // 실제 결제 테이블이 있다고 가정하고 작성
      // 현재는 예약 데이터로 시뮬레이션
      const { data, error } = await supabase
        .from('reservation')
        .select(`
          re_id,
          re_type,
          re_status,
          re_created_at,
          users!reservation_re_user_id_fkey(name, email)
        `)
        .order('re_created_at', { ascending: false });

      if (error) {
        console.error('결제 정보 조회 실패:', error);
        return;
      }

      // 결제 정보로 변환 (시뮬레이션)
      const paymentData = (data || []).map(reservation => ({
        ...reservation,
        amount: Math.floor(Math.random() * 500000) + 100000, // 임시 금액
        payment_status: ['pending', 'completed', 'failed'][Math.floor(Math.random() * 3)],
        payment_method: ['card', 'bank', 'cash'][Math.floor(Math.random() * 3)]
      }));

      setPayments(paymentData);
    } catch (error) {
      console.error('결제 데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed': return <AlertCircle className="w-5 h-5 text-red-600" />;
      default: return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '결제 대기';
      case 'completed': return '결제 완료';
      case 'failed': return '결제 실패';
      default: return status;
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'card': return '신용카드';
      case 'bank': return '계좌이체';
      case 'cash': return '현금';
      default: return method;
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.re_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filter === 'all' || payment.payment_status === filter;
    
    return matchesSearch && matchesFilter;
  });

  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const completedAmount = payments.filter(p => p.payment_status === 'completed')
                                 .reduce((sum, payment) => sum + payment.amount, 0);

  if (loading) {
    return (
      <ManagerLayout title="결제 관리" activeTab="payments">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">결제 정보를 불러오는 중...</p>
          </div>
        </div>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout title="결제 관리" activeTab="payments">
      <div className="space-y-6">
        
        {/* 결제 통계 */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-full">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">총 결제 금액</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₩{totalAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">완료된 결제</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₩{completedAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">결제 건수</p>
                <p className="text-2xl font-bold text-gray-900">
                  {payments.length}건
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="고객명, 이메일, 예약ID로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-green-500"
              />
            </div>
            
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:border-green-500"
            >
              <option value="all">전체 상태</option>
              <option value="pending">결제 대기</option>
              <option value="completed">결제 완료</option>
              <option value="failed">결제 실패</option>
            </select>
          </div>
        </div>

        {/* 결제 목록 */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-green-600" />
              결제 목록 ({filteredPayments.length}건)
            </h3>
          </div>
          
          {filteredPayments.length === 0 ? (
            <div className="p-8 text-center">
              <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">결제 내역이 없습니다</h3>
            </div>
          ) : (
            <div className="divide-y">
              {filteredPayments.map((payment) => (
                <div key={payment.re_id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gray-100 rounded-full">
                        <CreditCard className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg">
                          {payment.users?.name || '고객명 없음'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          예약 ID: {payment.re_id.slice(0, 8)}...
                        </p>
                        <p className="text-sm text-gray-600">
                          이메일: {payment.users?.email}
                        </p>
                        <p className="text-sm text-gray-500">
                          결제일: {new Date(payment.re_created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-2">
                        {getPaymentStatusIcon(payment.payment_status)}
                        <span className="font-medium">
                          {getPaymentStatusText(payment.payment_status)}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        ₩{payment.amount.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        {getPaymentMethodText(payment.payment_method)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ManagerLayout>
  );
}