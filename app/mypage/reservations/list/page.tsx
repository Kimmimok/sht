'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

interface Reservation {
  id: string;
  quote_id: string;
  status: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  created_at: string;
  quote: {
    id: string;
    start_date: string;
    end_date: string;
    adult_count: number;
    child_count: number;
    total_amount: number;
  };
}

export default function MyReservationsListPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      
      // 사용자 인증 확인
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }

      // 예약 목록 조회
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservation')
        .select(`
          *,
          quote:quote_id(
            id,
            start_date,
            end_date,
            adult_count,
            child_count,
            total_amount
          )
        `)
        .eq('quote.user_id', user.id)
        .order('created_at', { ascending: false });

      if (reservationsError) throw reservationsError;

      setReservations(reservationsData || []);
    } catch (error) {
      console.error('예약 목록 조회 오류:', error);
      alert('예약 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '접수';
      case 'confirmed': return '확정';
      case 'cancelled': return '취소';
      case 'completed': return '완료';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'confirmed': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="ml-4 text-gray-600">예약 목록을 불러오는 중...</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-6">
        <SectionBox title="내 예약 목록">
          <div className="mb-4 flex justify-between items-center">
            <p className="text-gray-600">총 {reservations.length}건의 예약이 있습니다.</p>
            <button
              onClick={() => router.push('/mypage/quotes')}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              견적 목록으로
            </button>
          </div>

          {reservations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">예약 내역이 없습니다.</p>
              <button
                onClick={() => router.push('/mypage/quotes')}
                className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600"
              >
                견적 보러가기
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {reservations.map((reservation) => (
                <div key={reservation.id} className="bg-white border rounded-lg p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg">예약 #{reservation.id.slice(0, 8)}</h3>
                      <p className="text-gray-600">
                        {new Date(reservation.created_at).toLocaleDateString('ko-KR')} 접수
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(reservation.status)}`}>
                      {getStatusText(reservation.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">연락처</p>
                      <p className="font-medium">{reservation.contact_name}</p>
                      <p className="text-sm">{reservation.contact_phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">여행 일정</p>
                      <p className="font-medium">
                        {reservation.quote?.start_date} ~ {reservation.quote?.end_date}
                      </p>
                      <p className="text-sm">
                        성인 {reservation.quote?.adult_count}명, 아동 {reservation.quote?.child_count}명
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t">
                    <div>
                      <p className="text-sm text-gray-600">총 금액</p>
                      <p className="font-bold text-lg text-orange-600">
                        {reservation.quote?.total_amount?.toLocaleString()}원
                      </p>
                    </div>
                    <div className="space-x-2">
                      <button
                        onClick={() => router.push(`/mypage/reservations/${reservation.id}/view`)}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                      >
                        상세보기
                      </button>
                      <button
                        onClick={() => router.push(`/mypage/quotes/${reservation.quote_id}/view`)}
                        className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                      >
                        원 견적보기
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionBox>
      </div>
    </PageWrapper>
  );
}
