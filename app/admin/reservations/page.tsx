'use client';
import React from 'react';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';

interface Reservation {
  re_id: number;
  re_user_id: string;
  re_type: string;
  re_status: string;
  re_created_at: string;
  users?: { email: string };
}

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        // 관리자 권한 확인
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          alert('로그인이 필요합니다.');
          router.push('/login');
          return;
        }

        const { data: userInfo } = await supabase
          .from('users')
          .select('role')
          .eq('id', userData.user.id)
          .single();

        // 관리자 권한 엄격 검증
        if (!userInfo || userInfo.role !== 'admin') {
          console.error('권한 확인 실패:', { userInfo, userId: userData.user.id });
          alert('관리자 권한이 필요합니다. 현재 권한: ' + (userInfo?.role || '없음'));
          router.push('/');
          return;
        }

        console.log('✅ 관리자 권한 확인됨:', userInfo.role);

        // 모든 예약 조회
        const { data: reservationsData, error } = await supabase
          .from('reservation')
          .select(
            `
            re_id,
            re_user_id,
            re_type,
            re_status,
            re_created_at,
            users!inner(email)
          `
          )
          .order('re_created_at', { ascending: false });

        if (error) {
          console.error('예약 데이터 조회 실패:', error);
          // 예약 테이블이 없을 수 있으므로 빈 배열로 설정
          setReservations([]);
          setFilteredReservations([]);
          return;
        }

        // users 필드가 배열일 경우 첫 번째 객체로 변환
        const normalizedReservations = (reservationsData || []).map((r: any) => ({
          ...r,
          users: Array.isArray(r.users) ? r.users[0] : r.users,
        }));
        setReservations(normalizedReservations);
        setFilteredReservations(normalizedReservations);
      } catch (error) {
        console.error('예약 조회 오류:', error);
        setReservations([]);
        setFilteredReservations([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReservations();
  }, [router]);

  useEffect(() => {
    let filtered = reservations;

    // 상태 필터링
    if (statusFilter !== 'all') {
      filtered = filtered.filter((reservation) => reservation.re_status === statusFilter);
    }

    // 타입 필터링
    if (typeFilter !== 'all') {
      filtered = filtered.filter((reservation) => reservation.re_type === typeFilter);
    }

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(
        (reservation) =>
          reservation.users?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          reservation.re_id.toString().includes(searchTerm)
      );
    }

    setFilteredReservations(filtered);
  }, [reservations, statusFilter, typeFilter, searchTerm]);

  const updateReservationStatus = async (reservationId: number, newStatus: string) => {
    const { error } = await supabase
      .from('reservation')
      .update({ re_status: newStatus })
      .eq('re_id', reservationId);

    if (error) {
      alert('상태 업데이트 실패: ' + error.message);
      return;
    }

    // 로컬 상태 업데이트
    setReservations((prev) =>
      prev.map((reservation) =>
        reservation.re_id === reservationId ? { ...reservation, re_status: newStatus } : reservation
      )
    );

    alert('예약 상태가 업데이트되었습니다.');
  };

  const deleteReservation = async (reservationId: number) => {
    if (!confirm('정말로 이 예약을 삭제하시겠습니까?')) return;

    const { error } = await supabase.from('reservation').delete().eq('re_id', reservationId);

    if (error) {
      alert('예약 삭제 실패: ' + error.message);
      return;
    }

    setReservations((prev) => prev.filter((reservation) => reservation.re_id !== reservationId));
    alert('예약이 삭제되었습니다.');
  };

  if (isLoading) {
    return (
      <AdminLayout title="예약 관리" activeTab="reservations">
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🎫</div>
          <p>예약 데이터 로딩 중...</p>
        </div>
      </AdminLayout>
    );
  }

  const statusCounts = {
    all: reservations.length,
    pending: reservations.filter((r) => r.re_status === 'pending').length,
    confirmed: reservations.filter((r) => r.re_status === 'confirmed').length,
    cancelled: reservations.filter((r) => r.re_status === 'cancelled').length,
  };

  return (
    <AdminLayout title="예약 관리" activeTab="reservations">
      <div className="space-y-6">
        {/* 통계 요약 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">{statusCounts.all}</div>
            <div className="text-sm text-gray-600">전체 예약</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</div>
            <div className="text-sm text-gray-600">대기중</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">{statusCounts.confirmed}</div>
            <div className="text-sm text-gray-600">확정</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-red-600">{statusCounts.cancelled}</div>
            <div className="text-sm text-gray-600">취소</div>
          </div>
        </div>

        {/* 필터 및 검색 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="이메일, 예약번호로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="all">모든 상태</option>
                <option value="pending">대기중</option>
                <option value="confirmed">확정</option>
                <option value="cancelled">취소</option>
              </select>
            </div>
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="all">모든 타입</option>
                <option value="cruise">크루즈</option>
                <option value="hotel">호텔</option>
                <option value="tour">투어</option>
              </select>
            </div>
          </div>
        </div>

        {/* 예약 목록 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredReservations.length > 0 ? (
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="sticky top-0 z-10 bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      예약 정보
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      사용자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      타입
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReservations.map((reservation) => (
                    <tr key={reservation.re_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            #{reservation.re_id}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(reservation.re_created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{reservation.users?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className={`px-2 py-1 text-xs rounded ${reservation.re_type === 'cruise'
                              ? 'bg-blue-100 text-blue-800'
                              : reservation.re_type === 'hotel'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                        >
                          {reservation.re_type === 'cruise'
                            ? '크루즈'
                            : reservation.re_type === 'hotel'
                              ? '호텔'
                              : reservation.re_type === 'tour'
                                ? '투어'
                                : reservation.re_type}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={reservation.re_status}
                          onChange={(e) =>
                            updateReservationStatus(reservation.re_id, e.target.value)
                          }
                          className={`px-2 py-1 text-xs rounded ${reservation.re_status === 'confirmed'
                              ? 'bg-green-100 text-green-800'
                              : reservation.re_status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                        >
                          <option value="pending">대기중</option>
                          <option value="confirmed">확정</option>
                          <option value="cancelled">취소</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => router.push(`/reservation/view/${reservation.re_id}`)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          보기
                        </button>
                        <button
                          onClick={() => deleteReservation(reservation.re_id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🎫</div>
              <p className="text-gray-500">
                {reservations.length === 0
                  ? '예약 데이터가 없습니다. 예약 테이블이 생성되지 않았을 수 있습니다.'
                  : '조건에 맞는 예약이 없습니다.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
