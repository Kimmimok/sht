'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

interface VehicleReservationForm {
  vehicle_number: string;
  seat_number: string;
  color_label: string;
}

function VehicleReservationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get('quoteId');
  
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState<VehicleReservationForm>({
    vehicle_number: '',
    seat_number: '',
    color_label: ''
  });

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !authUser) {
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }
      setUser(authUser);
    } catch (error) {
      console.error('인증 확인 오류:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // 1. 메인 예약 레코드 생성
      const { data: reservationData, error: reservationError } = await supabase
        .from('reservation')
        .insert({
          re_user_id: user.id,
          re_quote_id: quoteId,
          re_type: 'vehicle',
          re_status: 'pending'
        })
        .select()
        .single();

      if (reservationError) throw reservationError;

      // 2. 차량 예약 상세 정보 저장
      const { error: vehicleError } = await supabase
        .from('reservation_vehicle_sht')
        .insert({
          reservation_id: reservationData.re_id,
          ...formData
        });

      if (vehicleError) throw vehicleError;

      alert('차량 예약이 성공적으로 등록되었습니다!');
      router.push('/mypage/reservations');
      
    } catch (error) {
      console.error('차량 예약 오류:', error);
      alert('예약 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof VehicleReservationForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 색상 라벨 옵션
  const colorOptions = [
    { value: '', label: '선택하세요' },
    { value: 'red', label: '🔴 빨간색' },
    { value: 'blue', label: '🔵 파란색' },
    { value: 'green', label: '🟢 초록색' },
    { value: 'yellow', label: '🟡 노란색' },
    { value: 'orange', label: '🟠 주황색' },
    { value: 'purple', label: '🟣 보라색' },
    { value: 'black', label: '⚫ 검은색' },
    { value: 'white', label: '⚪ 흰색' },
    { value: 'gray', label: '⚫ 회색' }
  ];

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto">
        <SectionBox title="🚌 차량 예약 (SHT)">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 차량 정보 섹션 */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-blue-900 mb-4">차량 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    차량 번호
                  </label>
                  <input
                    type="text"
                    value={formData.vehicle_number}
                    onChange={(e) => handleInputChange('vehicle_number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                    placeholder="예: 12가3456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    좌석 번호
                  </label>
                  <input
                    type="text"
                    value={formData.seat_number}
                    onChange={(e) => handleInputChange('seat_number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                    placeholder="예: A-12, 15번, 창가 등"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    색상 라벨
                  </label>
                  <select
                    value={formData.color_label}
                    onChange={(e) => handleInputChange('color_label', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {colorOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    차량이나 좌석 구분을 위한 색상 표시
                  </p>
                </div>
              </div>
            </div>

            {/* 예약 안내 정보 */}
            <div className="bg-yellow-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-yellow-900 mb-4">📋 차량 예약 안내</h3>
              <div className="space-y-2 text-sm text-yellow-800">
                <p>• <strong>SHT(Shuttle)</strong>는 크루즈 전용 셔틀 차량 서비스입니다.</p>
                <p>• 차량 번호와 좌석 번호는 크루즈 승선 시 확인해주세요.</p>
                <p>• 색상 라벨은 차량이나 좌석을 쉽게 찾기 위한 구분 표시입니다.</p>
                <p>• 예약 확정 후에는 변경이 어려우니 신중하게 선택해주세요.</p>
                <p>• 차량 이용 시간과 장소는 크루즈 일정에 따라 안내됩니다.</p>
              </div>
            </div>

            {/* 예약 정보 확인 */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">예약 정보 확인</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">견적 ID:</span>
                  <span className="text-sm text-gray-900">{quoteId || '없음'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">차량 번호:</span>
                  <span className="text-sm text-gray-900">{formData.vehicle_number || '미입력'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">좌석 번호:</span>
                  <span className="text-sm text-gray-900">{formData.seat_number || '미입력'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">색상 라벨:</span>
                  <span className="text-sm text-gray-900">
                    {formData.color_label ? 
                      colorOptions.find(opt => opt.value === formData.color_label)?.label : '미선택'}
                  </span>
                </div>
              </div>
            </div>

            {/* 제출 버튼 */}
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => router.push('/mypage/reservations')}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? '예약 처리 중...' : '차량 예약 완료'}
              </button>
            </div>
          </form>
        </SectionBox>
      </div>
    </PageWrapper>
  );
}

export default function VehicleReservationPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64">로딩 중...</div>}>
      <VehicleReservationContent />
    </Suspense>
  );
}
