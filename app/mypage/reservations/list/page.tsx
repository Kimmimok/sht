'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';
import Link from 'next/link';

interface Reservation {
  re_id: string;
  re_type: string;
  re_status: string;
  re_created_at: string;
  re_checkin: string;
  re_checkout: string;
  re_total_price: number;
  re_cruise_name: string;
  re_schedule_name: string;
  re_contact_name: string;
  re_contact_phone: string;
  re_contact_email: string;
  re_adult_count: number;
  re_child_count: number;
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

      // 예약 목록 조회 - 상세 정보 포함
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservation')
        .select(`
          re_id,
          re_type,
          re_status,
          re_created_at,
          re_checkin,
          re_checkout,
          re_total_price,
          re_cruise_name,
          re_schedule_name,
          re_contact_name,
          re_contact_phone,
          re_contact_email,
          re_adult_count,
          re_child_count
        `)
        .eq('re_user_id', user.id)
        .order('re_created_at', { ascending: false });

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
      case 'pending': return '대기중';
      case 'confirmed': return '확정됨';
      case 'processing': return '처리중';
      case 'cancelled': return '취소됨';
      case 'completed': return '완료됨';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-25';
      case 'confirmed': return 'text-green-600 bg-green-25';
      case 'processing': return 'text-blue-600 bg-blue-25';
      case 'cancelled': return 'text-red-600 bg-red-25';
      case 'completed': return 'text-purple-600 bg-purple-25';
      default: return 'text-gray-600 bg-gray-25';
    }
  };

  // 예약 제목 생성 함수
  const getReservationTitle = (reservation: Reservation) => {
    const checkIn = reservation.re_checkin ? new Date(reservation.re_checkin).toLocaleDateString() : '날짜 미정';
    const cruiseName = reservation.re_cruise_name || '크루즈 미정';
    return `${checkIn} | ${cruiseName}`;
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-300"></div>
          <p className="ml-4 text-gray-600">예약 목록을 불러오는 중...</p>
        </div>
      </PageWrapper>
    );
  }
  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-6">
        <SectionBox title="📂 내 예약 목록">
          <div className="mb-4 flex justify-between items-center">
            <p className="text-gray-600">총 {reservations.length}건의 예약이 있습니다.</p>
            <div className="space-x-2">
              <Link href="/mypage/quotes">
                <button className="bg-blue-300 text-white px-4 py-2 rounded-lg hover:bg-blue-400">
                  견적 목록으로
                </button>
              </Link>
              <Link href="/mypage/reservations/new">
                <button className="bg-green-300 text-white px-4 py-2 rounded-lg hover:bg-green-400">
                  새 예약 신청
                </button>
              </Link>
              <button 
                onClick={() => {
                  setLoading(true);
                  fetchReservations();
                }}
                className="bg-purple-300 text-white px-4 py-2 rounded-lg hover:bg-purple-400"
              >
                🔄 새로고침
              </button>
            </div>
          </div>

          {reservations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🎫</div>
              <p className="text-gray-500 mb-4">예약 내역이 없습니다.</p>
              <div className="space-x-2">
                <Link href="/mypage/quotes">
                  <button className="bg-orange-300 text-white px-6 py-3 rounded-lg hover:bg-orange-400">
                    견적 보러가기
                  </button>
                </Link>
                <Link href="/mypage/reservations/new">
                  <button className="bg-blue-300 text-white px-6 py-3 rounded-lg hover:bg-blue-400">
                    예약 신청하기
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {reservations.map((reservation) => (
                <div key={reservation.re_id} className="bg-white border border-gray-100 rounded-lg p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">{getReservationTitle(reservation)}</h3>
                      <p className="text-gray-500 text-sm">
                        예약일: {new Date(reservation.re_created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(reservation.re_status)}`}>
                      {getStatusText(reservation.re_status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">예약자 정보</p>
                      <p className="font-medium">{reservation.re_contact_name || '이름 없음'}</p>
                      <p className="text-sm text-gray-600">{reservation.re_contact_phone || '연락처 없음'}</p>
                      <p className="text-sm text-gray-600">{reservation.re_contact_email || '이메일 없음'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">여행 일정</p>
                      <p className="font-medium">
                        {reservation.re_checkin ? new Date(reservation.re_checkin).toLocaleDateString() : '날짜 미정'}
                        {reservation.re_checkout && ` ~ ${new Date(reservation.re_checkout).toLocaleDateString()}`}
                      </p>
                      <p className="text-sm text-gray-600">
                        성인 {reservation.re_adult_count || 0}명
                        {reservation.re_child_count > 0 && `, 아동 ${reservation.re_child_count}명`}
                      </p>
                      <p className="text-sm text-gray-600">{reservation.re_schedule_name || '일정명 없음'}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-sm text-gray-500">총 금액</p>
                      <p className="font-bold text-lg text-orange-600">
                        {reservation.re_total_price ? reservation.re_total_price.toLocaleString() : '미정'}동
                      </p>
                    </div>
                    <div className="space-x-2">
                      <Link href={`/mypage/reservations/${reservation.re_id}/view`}>
                        <button className="bg-blue-300 text-white px-4 py-2 rounded-lg hover:bg-blue-400">
                          상세보기
                        </button>
                      </Link>
                      {reservation.re_status === 'pending' && (
                        <Link href={`/mypage/reservations/${reservation.re_id}/edit`}>
                          <button className="bg-gray-300 text-white px-4 py-2 rounded-lg hover:bg-gray-400">
                            수정하기
                          </button>
                        </Link>
                      )}
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
