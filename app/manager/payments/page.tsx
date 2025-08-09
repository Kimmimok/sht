'use client';

import React, { useState, useEffect } from 'react';
import ManagerLayout from '@/components/ManagerLayout';
import supabase from '@/lib/supabase';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  Plus
} from 'lucide-react';

export default function ManagerPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [methods, setMethods] = useState<{ code: string; name: string }[]>([]);

  // create payment modal state
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [form, setForm] = useState<{
    reservation_id: string;
    user_id?: string;
    amount: number | '';
    payment_method: string;
    payment_status: 'pending' | 'completed' | 'failed';
    memo: string;
  }>({ reservation_id: '', user_id: undefined, amount: '', payment_method: '', payment_status: 'pending', memo: '' });
  const [resSearch, setResSearch] = useState('');
  const [resOptions, setResOptions] = useState<any[]>([]);

  // 견적ID 별 일괄 결제 상태
  const [showQuotePay, setShowQuotePay] = useState(false);
  const [quoteId, setQuoteId] = useState('');
  const [quoteReservations, setQuoteReservations] = useState<any[]>([]);
  const [quoteAmountsByRes, setQuoteAmountsByRes] = useState<Record<string, number>>({});
  const [quoteSelections, setQuoteSelections] = useState<Record<string, boolean>>({});
  const [quoteMethod, setQuoteMethod] = useState('');
  const [savingQuote, setSavingQuote] = useState(false);
  const [quoteSearch, setQuoteSearch] = useState('');
  const [quoteOptions, setQuoteOptions] = useState<any[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null);

  useEffect(() => {
    // 병렬 로드: 결제 목록 + 결제 수단
    loadInitial();
  }, []);

  const loadInitial = async () => {
    try {
      const [{ data: paymentRows, error: payErr }, { data: methodRows, error: methodErr }] = await Promise.all([
        supabase
          .from('reservation_payment')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.from('payment_info').select('code, name').order('name')
      ]);

      if (methodErr) {
        console.error('결제 수단 조회 실패:', methodErr);
      }
      setMethods((methodRows as any[])?.map((m: any) => ({ code: m.code, name: m.name })) || []);

      if (payErr) {
        console.error('결제 정보 조회 실패:', payErr);
        setPayments([]);
        return;
      }

      const rows = (paymentRows as any[]) || [];
      // 관련 사용자/예약을 IN 조회 후 매핑
      const userIds = Array.from(new Set(rows.map(r => r.user_id).filter(Boolean)));
      const resIds = Array.from(new Set(rows.map(r => r.reservation_id).filter(Boolean)));

      const [{ data: users }, { data: reservations }] = await Promise.all([
        userIds.length
          ? supabase.from('users').select('id, name, email').in('id', userIds as string[])
          : Promise.resolve({ data: [] as any[] }),
        resIds.length
          ? supabase.from('reservation').select('re_id, re_status, re_type').in('re_id', resIds as string[])
          : Promise.resolve({ data: [] as any[] })
      ]);

      const usersMap = new Map((users || []).map((u: any) => [u.id, u]));
      const resMap = new Map((reservations || []).map((r: any) => [r.re_id, r]));

      const enriched = rows.map((r: any) => ({
        ...r,
        users: r.user_id ? usersMap.get(r.user_id) : undefined,
        reservation: r.reservation_id ? resMap.get(r.reservation_id) : undefined
      }));

      setPayments(enriched);
    } catch (error) {
      console.error('결제 데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 견적 검색 (제목/ID)
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!showQuotePay) return;
      const term = quoteSearch.trim();
      if (!term) { setQuoteOptions([]); return; }
      try {
        const { data: byTitle } = await supabase
          .from('quote')
          .select('id, title')
          .ilike('title', `%${term}%`)
          .limit(20);
        let options = (byTitle as any[]) || [];
        // UUID 정확 일치 추가
        const isMaybeUuid = /^[0-9a-fA-F-]{8,}$/.test(term);
        if (isMaybeUuid) {
          const { data: byId } = await supabase
            .from('quote')
            .select('id, title')
            .eq('id', term)
            .limit(1);
          if (byId && byId.length) {
            const map = new Map([...options, ...byId].map((q: any) => [q.id, q]));
            options = Array.from(map.values());
          }
        }
        setQuoteOptions(options);
      } catch (e) {
        console.error('견적 검색 실패:', e);
        setQuoteOptions([]);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [quoteSearch, showQuotePay]);

  // 모달 오픈 시 최근 견적 목록 미리 로드
  useEffect(() => {
    (async () => {
      if (!showQuotePay) return;
      try {
        const { data } = await supabase
          .from('quote')
          .select('id, title')
          .order('created_at', { ascending: false })
          .limit(30);
        setQuoteOptions((data as any[]) || []);
      } catch (e) {
        console.error('최근 견적 로드 실패:', e);
        setQuoteOptions([]);
      }
    })();
  }, [showQuotePay]);

  // 견적ID로 예약 및 금액 불러오기
  const loadQuoteReservations = async (qid: string) => {
    if (!qid) { setQuoteReservations([]); setQuoteAmountsByRes({}); setQuoteSelections({}); return; }
    try {
      const { data: resRows } = await supabase
        .from('reservation')
        .select('re_id, re_user_id, re_status, re_type')
        .eq('re_quote_id', qid)
        .order('re_created_at', { ascending: false });
      const rows = (resRows as any[]) || [];
      setQuoteReservations(rows);
      const ids = rows.map(r => r.re_id);
      if (!ids.length) {
        setQuoteAmountsByRes({}); setQuoteSelections({});
        return;
      }
      const [cruiseRes, cruiseCarRes, airportRes, hotelRes, rentRes, tourRes] = await Promise.all([
        supabase.from('reservation_cruise').select('reservation_id, room_total_price').in('reservation_id', ids),
        supabase.from('reservation_cruise_car').select('reservation_id, car_total_price').in('reservation_id', ids),
        supabase.from('reservation_airport').select('reservation_id, total_price').in('reservation_id', ids),
        supabase.from('reservation_hotel').select('reservation_id, total_price').in('reservation_id', ids),
        supabase.from('reservation_rentcar').select('reservation_id, total_price').in('reservation_id', ids),
        supabase.from('reservation_tour').select('reservation_id, total_price').in('reservation_id', ids)
      ]);
      const amounts: Record<string, number> = {};
      for (const c of ((cruiseRes.data as any[]) || [])) { const rid = c.reservation_id; amounts[rid] = (amounts[rid] || 0) + Number(c.room_total_price || 0); }
      for (const cc of ((cruiseCarRes.data as any[]) || [])) { const rid = cc.reservation_id; amounts[rid] = (amounts[rid] || 0) + Number(cc.car_total_price || 0); }
      // 공항 상세에 total_price 컬럼이 없을 수 있어 0으로 취급
      for (const a of ((airportRes.data as any[]) || [])) { const rid = a.reservation_id; amounts[rid] = (amounts[rid] || 0) + Number(a.total_price || 0); }
      for (const h of ((hotelRes.data as any[]) || [])) { const rid = h.reservation_id; amounts[rid] = (amounts[rid] || 0) + Number(h.total_price || 0); }
      for (const r of ((rentRes.data as any[]) || [])) { const rid = r.reservation_id; amounts[rid] = (amounts[rid] || 0) + Number(r.total_price || 0); }
      for (const t of ((tourRes.data as any[]) || [])) { const rid = t.reservation_id; amounts[rid] = (amounts[rid] || 0) + Number(t.total_price || 0); }
      setQuoteAmountsByRes(amounts);
      const defaults: Record<string, boolean> = {};
      for (const r of rows) { if (r.re_status === 'confirmed' && (amounts[r.re_id] || 0) > 0) defaults[r.re_id] = true; }
      setQuoteSelections(defaults);
    } catch (e) {
      console.error('견적 예약 로드 실패:', e);
      setQuoteReservations([]); setQuoteAmountsByRes({}); setQuoteSelections({});
    }
  };

  // 간단한 예약 검색: 이메일로 사용자 찾고 해당 예약 가져오기
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!resSearch || resSearch.trim().length < 2) {
        setResOptions([]);
        return;
      }
      try {
        const { data: foundUsers } = await supabase
          .from('users')
          .select('id, name, email')
          .ilike('email', `%${resSearch}%`);
        const uids = (foundUsers || []).map(u => u.id);
        if (!uids.length) {
          setResOptions([]);
          return;
        }
        const { data: foundRes } = await supabase
          .from('reservation')
          .select('re_id, re_status, re_type, re_user_id')
          .in('re_user_id', uids as string[])
          .order('re_created_at', { ascending: false })
          .limit(20);
        const userMap = new Map((foundUsers || []).map(u => [u.id, u]));
        const options = (foundRes || []).map((r: any) => ({
          re_id: r.re_id,
          re_status: r.re_status,
          re_type: r.re_type,
          user: userMap.get(r.re_user_id)
        }));
        setResOptions(options);
      } catch (e) {
        console.error('예약 검색 실패', e);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [resSearch]);

  const handleCreatePayment = async () => {
    if (!form.reservation_id || !form.amount || !form.payment_method) return;
    setCreateLoading(true);
    try {
      // reservation에서 user_id 자동 찾기
      let userId = form.user_id;
      if (!userId) {
        const { data: r } = await supabase
          .from('reservation')
          .select('re_user_id')
          .eq('re_id', form.reservation_id)
          .maybeSingle();
        userId = r?.re_user_id;
      }

      const { error: insErr } = await supabase
        .from('reservation_payment')
        .insert({
          reservation_id: form.reservation_id,
          user_id: userId,
          amount: Number(form.amount),
          payment_method: form.payment_method,
          payment_status: form.payment_status,
          memo: form.memo || null
        });
      if (insErr) {
        console.error('결제 생성 실패:', insErr);
        return;
      }
      // 리프레시
      setShowCreate(false);
      setForm({ reservation_id: '', user_id: undefined, amount: '', payment_method: '', payment_status: 'pending', memo: '' });
      await loadInitial();
    } catch (e) {
      console.error('결제 생성 처리 실패:', e);
    } finally {
      setCreateLoading(false);
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
    const m = methods.find(x => x.code === method);
    if (m) return m.name;
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
      String(payment.reservation_id || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filter === 'all' || payment.payment_status === filter;

    return matchesSearch && matchesFilter;
  });

  const totalAmount = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const completedAmount = payments.filter(p => p.payment_status === 'completed')
    .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

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

        {/* 검색 및 필터 + 결제 생성 */}
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

            <button
              className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="w-5 h-5" /> 결제 생성
            </button>
            <button
              className="px-4 py-2 bg-orange-600 text-white rounded-lg flex items-center gap-2 hover:bg-orange-700"
              onClick={() => { setShowQuotePay(true); setQuoteId(''); setQuoteReservations([]); setQuoteSelections({}); setQuoteAmountsByRes({}); setQuoteMethod(''); }}
            >
              <Plus className="w-5 h-5" /> 견적 결제
            </button>
          </div>

          {showCreate && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
                <h3 className="text-lg font-semibold mb-4">새 결제 생성</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">예약 검색 (이메일)</label>
                    <input
                      type="text"
                      value={resSearch}
                      onChange={(e) => setResSearch(e.target.value)}
                      placeholder="고객 이메일로 검색"
                      className="w-full px-3 py-2 border rounded"
                    />
                    {resOptions.length > 0 && (
                      <div className="mt-2 max-h-40 overflow-auto border rounded">
                        {resOptions.map((opt) => (
                          <button
                            type="button"
                            key={opt.re_id}
                            onClick={() => {
                              setForm(f => ({ ...f, reservation_id: opt.re_id, user_id: opt.user?.id }));
                              setResOptions([]);
                            }}
                            className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${form.reservation_id === opt.re_id ? 'bg-blue-50' : ''}`}
                          >
                            <div className="text-sm font-medium">{opt.user?.name || '이름 없음'} ({opt.user?.email})</div>
                            <div className="text-xs text-gray-600">예약: {opt.re_id.slice(0, 8)}... • {opt.re_type} • {opt.re_status}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">예약 ID</label>
                    <input
                      type="text"
                      value={form.reservation_id}
                      onChange={(e) => setForm({ ...form, reservation_id: e.target.value })}
                      placeholder="예약 UUID"
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">금액</label>
                      <input
                        type="number"
                        value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: e.target.value === '' ? '' : Number(e.target.value) })}
                        placeholder="0"
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">상태</label>
                      <select
                        value={form.payment_status}
                        onChange={(e) => setForm({ ...form, payment_status: e.target.value as any })}
                        className="w-full px-3 py-2 border rounded"
                      >
                        <option value="pending">결제 대기</option>
                        <option value="completed">결제 완료</option>
                        <option value="failed">결제 실패</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">결제 수단</label>
                      <select
                        value={form.payment_method}
                        onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                        className="w-full px-3 py-2 border rounded"
                      >
                        <option value="">선택</option>
                        {methods.map(m => (
                          <option key={m.code} value={m.code}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">비고</label>
                      <input
                        type="text"
                        value={form.memo}
                        onChange={(e) => setForm({ ...form, memo: e.target.value })}
                        placeholder="메모"
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <button className="px-4 py-2 rounded border" onClick={() => setShowCreate(false)} disabled={createLoading}>취소</button>
                  <button
                    className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50"
                    onClick={handleCreatePayment}
                    disabled={createLoading || !form.reservation_id || !form.amount || !form.payment_method}
                  >{createLoading ? '저장 중...' : '생성'}</button>
                </div>
              </div>
            </div>
          )}
          {showQuotePay && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
                <h3 className="text-lg font-semibold mb-2">
                  {selectedQuote ? (
                    <span>
                      견적 결제: <span className="text-green-700">{selectedQuote.title || '제목 없음'}</span>
                      <span className="text-gray-500"> ({String(selectedQuote.id).slice(0, 8)}...)</span>
                    </span>
                  ) : '견적ID로 일괄 결제 생성'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">견적 검색 (제목/ID)</label>
                    <input
                      type="text"
                      value={quoteSearch}
                      onChange={(e) => setQuoteSearch(e.target.value)}
                      placeholder="견적 제목 또는 ID로 검색"
                      className="w-full px-3 py-2 border rounded"
                    />
                    <div className="mt-2 max-h-48 overflow-auto border rounded">
                      {quoteOptions.length === 0 ? (
                        <div className="px-3 py-3 text-sm text-gray-500">표시할 견적이 없습니다.</div>
                      ) : (
                        quoteOptions.map((opt: any) => (
                          <button
                            type="button"
                            key={opt.id}
                            onClick={() => {
                              setSelectedQuote(opt);
                              setQuoteId(opt.id);
                              loadQuoteReservations(opt.id);
                            }}
                            className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${selectedQuote?.id === opt.id ? 'bg-blue-50' : ''}`}
                          >
                            <div className="text-sm font-medium">{opt.title || '제목 없음'}</div>
                            <div className="text-xs text-gray-600">{String(opt.id).slice(0, 8)}...</div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                  {/* 선택된 견적 요약 */}
                  {selectedQuote && (
                    <div className="bg-gray-50 border rounded p-3 text-sm text-gray-700">
                      선택된 견적: <span className="font-medium">{selectedQuote.title || '제목 없음'}</span>
                      <span className="text-gray-500"> ({String(selectedQuote.id).slice(0, 8)}...)</span>
                    </div>
                  )}
                  <div className="max-h-64 overflow-auto border rounded">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600">
                          <th className="px-3 py-2 text-left">선택</th>
                          <th className="px-3 py-2 text-left">예약 ID</th>
                          <th className="px-3 py-2 text-left">상태</th>
                          <th className="px-3 py-2 text-right">금액</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quoteReservations.length === 0 ? (
                          <tr><td className="px-3 py-4 text-center text-gray-500" colSpan={4}>예약 없음</td></tr>
                        ) : (
                          quoteReservations.map((r) => (
                            <tr key={r.re_id} className="border-t">
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={!!quoteSelections[r.re_id]}
                                  onChange={(e) => setQuoteSelections(s => ({ ...s, [r.re_id]: e.target.checked }))}
                                />
                              </td>
                              <td className="px-3 py-2">{String(r.re_id).slice(0, 8)}...</td>
                              <td className="px-3 py-2">{r.re_status}</td>
                              <td className="px-3 py-2 text-right">{Number(quoteAmountsByRes[r.re_id] || 0).toLocaleString()}동</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="grid grid-cols-2 gap-4 items-end">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">결제 수단</label>
                      <select
                        value={quoteMethod}
                        onChange={(e) => setQuoteMethod(e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                      >
                        <option value="">선택</option>
                        {methods.map(m => (
                          <option key={m.code} value={m.code}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">총 결제 금액</div>
                      <div className="text-xl font-bold text-orange-600">
                        {Object.entries(quoteSelections).filter(([, v]) => v).reduce((sum, [rid]) => sum + (quoteAmountsByRes[rid] || 0), 0).toLocaleString()}동
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <button className="px-4 py-2 rounded border" onClick={() => setShowQuotePay(false)} disabled={savingQuote}>취소</button>
                  <button
                    className="px-4 py-2 rounded bg-orange-600 text-white disabled:opacity-50"
                    disabled={savingQuote || !quoteMethod || Object.values(quoteSelections).every(v => !v)}
                    onClick={async () => {
                      setSavingQuote(true);
                      try {
                        // 일괄 payload 구성: 각 예약의 user_id 포함
                        const selected = quoteReservations.filter(r => quoteSelections[r.re_id]);
                        if (!selected.length) { setSavingQuote(false); return; }
                        // 예약→사용자ID 매핑 확보(필요시 조회)
                        const needUserIds = selected.filter(r => !r.re_user_id).map(r => r.re_id);
                        let userMap: Record<string, string> = {};
                        if (needUserIds.length) {
                          const { data: list } = await supabase
                            .from('reservation')
                            .select('re_id, re_user_id')
                            .in('re_id', needUserIds);
                          for (const row of (list as any[]) || []) userMap[row.re_id] = row.re_user_id;
                        }
                        const payload = selected.map(r => ({
                          reservation_id: r.re_id,
                          user_id: r.re_user_id || userMap[r.re_id] || null,
                          amount: Number(quoteAmountsByRes[r.re_id] || 0),
                          payment_method: quoteMethod,
                          payment_status: 'pending' as const
                        }));
                        const { error } = await supabase.from('reservation_payment').insert(payload);
                        if (error) throw error;
                        setShowQuotePay(false);
                        await loadInitial();
                      } catch (e) {
                        console.error('견적 일괄 결제 생성 실패', e);
                        alert('결제 생성에 실패했습니다.');
                      } finally {
                        setSavingQuote(false);
                      }
                    }}
                  >{savingQuote ? '생성 중...' : '결제 생성'}</button>
                </div>
              </div>
            </div>
          )}
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
                <div key={payment.id} className="p-6 hover:bg-gray-50">
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
                          예약 ID: {payment.reservation_id ? String(payment.reservation_id).slice(0, 8) + '...' : '-'}
                        </p>
                        <p className="text-sm text-gray-600">
                          이메일: {payment.users?.email}
                        </p>
                        <p className="text-sm text-gray-500">
                          결제일: {payment.created_at ? new Date(payment.created_at).toLocaleDateString() : '-'}
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
                        ₩{Number(payment.amount || 0).toLocaleString()}
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
