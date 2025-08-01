// app/admin/quotes/page.tsx
'use client';
import React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminQuoteListPage() {
  const [quotes, setQuotes] = useState([]);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('quote')
        .select('id, korean_name, checkin, created_at')
        .eq('is_confirmed', false)
        .order('created_at', { ascending: false });
      setQuotes(data || []);
    })();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">📝 미확정 견적 목록</h1>
      <ul className="space-y-2">
        {quotes.map((q) => (
          <li key={q.id} className="border rounded p-3 shadow-sm">
            <p>예약자: {q.korean_name}</p>
            <p>체크인: {q.checkin}</p>
            <button
              onClick={() => router.push(`/admin/quotes/${q.id}`)}
              className="mt-2 px-3 py-1 bg-blue-500 text-white rounded"
            >
              상세보기
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// app/admin/quotes/[id]/page.tsx
('use client');
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminQuoteDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [quote, setQuote] = useState(null);
  const [details, setDetails] = useState([]);

  useEffect(() => {
    (async () => {
      const { data: q } = await supabase.from('quote').select('*').eq('id', id).single();
      const { data: d } = await supabase.from('estimate_detail').select('*').eq('quote_id', id);
      setQuote(q);
      setDetails(d || []);
    })();
  }, [id]);

  const handleConfirm = async () => {
    const res = await fetch(`/api/quotes/${id}/confirm`, { method: 'POST' });
    if (res.ok) {
      alert('견적이 확정되었습니다.');
      router.push('/admin/quotes');
    } else {
      alert('확정 실패');
    }
  };

  if (!quote) return <div className="p-4">불러오는 중...</div>;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">📄 견적 상세</h1>
      <p>예약자: {quote.korean_name}</p>
      <p>체크인: {quote.checkin}</p>
      <p>할인율: {quote.discount_rate}%</p>
      <hr />
      <h2 className="font-semibold">📌 인동/금액</h2>
      <ul className="space-y-1">
        {details.map((d) => (
          <li key={d.id} className="text-sm">
            ▪ {d.category} {d.person_count}명 – 객실금액 {d.room_total_price?.toLocaleString()} /
            차량금액 {d.car_total_price?.toLocaleString()}
          </li>
        ))}
      </ul>
      <button
        onClick={handleConfirm}
        className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        ✅ 견적 확정하기
      </button>
    </div>
  );
}

