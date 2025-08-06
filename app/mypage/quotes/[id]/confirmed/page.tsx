'use client';

import { useState, useEffect, Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

interface QuoteDetail {
  id: string;
  status: string;
  total_price: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  departure_date: string;
  return_date: string;
  adult_count: number;
  child_count: number;
  infant_count: number;
  cruise_name?: string;
  manager_note?: string;
  title?: string;
  users?: {
    name: string;
    email: string;
    phone_number?: string;
  };
  rentcar?: any[];
  cruise?: any[];
  airport?: any[];
  hotel?: any[];
  tour?: any[];
}

const getStatusBadge = (status: string) => {
  const badges: { [key: string]: string } = {
    pending: 'bg-yellow-50 text-yellow-600',
    submitted: 'bg-yellow-50 text-yellow-600',
    draft: 'bg-gray-50 text-gray-600',
    confirmed: 'bg-blue-50 text-blue-600',
    approved: 'bg-blue-50 text-blue-600',
    rejected: 'bg-red-50 text-red-600'
  };
  const labels: { [key: string]: string } = {
    pending: '검토 대기',
    submitted: '제출됨',
    draft: '임시저장',
    confirmed: '확정됨 (예약)',
    approved: '승인됨',
    rejected: '거절됨'
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badges[status] || 'bg-gray-50 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  );
};

export default function ConfirmedQuoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [detailedServices, setDetailedServices] = useState<any>({
    rooms: [],
    cars: [],
    airports: [],
    hotels: [],
    rentcars: [],
    tours: []
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && quoteId) {
      loadQuoteDetail();
      loadDetailedServices();
    }
  }, [user, quoteId]);

  const checkAuth = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }

      console.log('✅ 사용자 인증 성공:', user.id);
      setUser(user);
    } catch (error) {
      console.error('❌ 인증 확인 오류:', error);
      router.push('/login');
    }
  };

  const handleReservation = async () => {
    try {
      if (!quote || !quote.id) {
        alert('견적 정보를 찾을 수 없습니다.');
        return;
      }
      // 견적 ID를 가지고 예약 생성 페이지로 바로 이동
      router.push(`/mypage/reservations/?quoteId=${quote.id}`);
    } catch (error) {
      console.error('예약 페이지 이동 오류:', error);
      alert('예약 페이지로 이동하는 중 오류가 발생했습니다.');
    }
  };

  const loadQuoteDetail = async () => {
    try {
      console.log('📋 견적 상세 정보 로딩 시작...', quoteId);

      // 견적 기본 정보 조회
      const { data: quoteData, error: quoteError } = await supabase
        .from('quote')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (quoteError) {
        console.error('❌ 견적 조회 실패:', quoteError);
        alert('견적을 찾을 수 없습니다.');
        router.push('/mypage/quotes');
        return;
      }

      console.log('✅ 견적 기본 정보:', quoteData);

      // 사용자 정보 조회 (안전한 방식)
      let userData = null;
      try {
        const { data: userResult, error: userError } = await supabase
          .from('users')
          .select('id, name, email, phone_number')
          .eq('id', quoteData.user_id)
          .single();

        if (userError) {
          console.warn('⚠️ 사용자 정보 조회 실패:', userError);
        } else {
          userData = userResult;
        }
      } catch (userErr) {
        console.warn('⚠️ 사용자 정보 조회 예외:', userErr);
      }

      console.log('👤 사용자 정보:', userData);

      const detailedQuote: QuoteDetail = {
        ...quoteData,
        users: userData || { name: '알 수 없음', email: '미확인', phone_number: '미확인' },
      };

      console.log('✅ 견적 상세 정보 로드 완료:', detailedQuote);
      setQuote(detailedQuote);

    } catch (error) {
      console.error('❌ 견적 상세 정보 로드 실패:', error);
      alert('견적 정보를 불러오는데 실패했습니다.');
      router.push('/mypage/quotes');
    }
  };

  // 상세 서비스 정보 로드
  const loadDetailedServices = async () => {
    setLoading(true);
    try {
      console.log('🔍 상세 서비스 정보 로드 시작...', quoteId);

      const { data: quoteItems, error } = await supabase
        .from('quote_item')
        .select('*')
        .eq('quote_id', quoteId);

      if (error) throw error;

      console.log('📋 Quote Items 로드됨:', quoteItems);

      const detailed: any = {
        rooms: [],
        cars: [],
        airports: [],
        hotels: [],
        rentcars: [],
        tours: []
      };

      for (const item of quoteItems || []) {
        try {
          console.log(`🔍 처리 중: ${item.service_type} (ref_id: ${item.service_ref_id})`);

          if (item.service_type === 'room') {
            const { data: roomData } = await supabase
              .from('room')
              .select('*')
              .eq('id', item.service_ref_id)
              .single();

            if (roomData) {
              console.log('✅ 객실 정보:', roomData);
              // room_price 테이블에서 모든 가격 정보 조회
              const { data: priceData } = await supabase
                .from('room_price')
                .select('*')
                .eq('room_code', roomData.room_code);

              detailed.rooms.push({
                ...item,
                roomInfo: roomData,
                priceInfo: priceData || []
              });
            }
          } else if (item.service_type === 'car') {
            const { data: carData } = await supabase
              .from('car')
              .select('*')
              .eq('id', item.service_ref_id)
              .single();

            if (carData) {
              console.log('✅ 차량 정보:', carData);
              const { data: priceData } = await supabase
                .from('car_price')
                .select('*')
                .eq('car_code', carData.car_code);

              detailed.cars.push({
                ...item,
                carInfo: carData,
                priceInfo: priceData || []
              });
            }
          } else if (item.service_type === 'airport') {
            const { data: airportData } = await supabase
              .from('airport')
              .select('*')
              .eq('id', item.service_ref_id)
              .single();

            if (airportData) {
              console.log('✅ 공항 정보:', airportData);
              const { data: priceData } = await supabase
                .from('airport_price')
                .select('*')
                .eq('airport_code', airportData.airport_code);

              detailed.airports.push({
                ...item,
                airportInfo: airportData,
                priceInfo: priceData || []
              });
            }
          } else if (item.service_type === 'hotel') {
            const { data: hotelData } = await supabase
              .from('hotel')
              .select('*')
              .eq('id', item.service_ref_id)
              .single();

            if (hotelData) {
              console.log('✅ 호텔 정보:', hotelData);
              const { data: priceData } = await supabase
                .from('hotel_price')
                .select('*')
                .eq('hotel_code', hotelData.hotel_code);

              detailed.hotels.push({
                ...item,
                hotelInfo: hotelData,
                priceInfo: priceData || []
              });
            }
          } else if (item.service_type === 'rentcar') {
            const { data: rentcarData } = await supabase
              .from('rentcar')
              .select('*')
              .eq('id', item.service_ref_id)
              .single();

            if (rentcarData) {
              console.log('✅ 렌트카 정보:', rentcarData);
              const { data: priceData } = await supabase
                .from('rent_price')
                .select('*')
                .eq('rent_code', rentcarData.rentcar_code);

              detailed.rentcars.push({
                ...item,
                rentcarInfo: rentcarData,
                priceInfo: priceData || []
              });
            }
          } else if (item.service_type === 'tour') {
            const { data: tourData } = await supabase
              .from('tour')
              .select('*')
              .eq('id', item.service_ref_id)
              .single();

            if (tourData) {
              console.log('✅ 투어 정보:', tourData);
              const { data: priceData } = await supabase
                .from('tour_price')
                .select('*')
                .eq('tour_code', tourData.tour_code);

              detailed.tours.push({
                ...item,
                tourInfo: tourData,
                priceInfo: priceData || []
              });
            }
          }
        } catch (serviceError) {
          console.warn(`⚠️ ${item.service_type} 상세 정보 로드 실패:`, serviceError);
        }
      }

      setDetailedServices(detailed);
      console.log('✅ 상세 서비스 정보 로드 완료:', detailed);
    } catch (error) {
      console.error('❌ 상세 서비스 정보 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">견적 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <PageWrapper>
      <div className="min-h-screen bg-gray-50">
        {/* 헤더 */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/mypage/quotes')}
                  className="p-2 text-gray-300 hover:text-gray-500"
                >
                  ← 목록
                </button>
                <h1 className="text-2xl font-bold text-gray-700">📋 {quote.title || '크루즈 견적'}</h1>
                {getStatusBadge(quote.status)}
              </div>

            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 gap-8">
            {/* 메인 콘텐츠 */}
            <div className="space-y-6">
              {/* 고객 정보 */}
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-600 mb-4">👤 고객 정보</h2>
                <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                  <tbody>
                    <tr>
                      <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25 w-32">닉네임</td>
                      <td className="px-2 py-1 border-blue-100 border">{quote.users?.name || '정보 없음'}</td>
                    </tr>
                    <tr>
                      <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">이메일</td>
                      <td className="px-2 py-1 border-blue-100 border">{quote.users?.email || '정보 없음'}</td>
                    </tr>
                    <tr>
                      <td className="px-2 py-1 font-medium border-blue-100 border bg-gray-25">연락처</td>
                      <td className="px-2 py-1 border-blue-100 border">{quote.users?.phone_number || '정보 없음'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 상세 서비스 정보 섹션 */}
              {/* 객실 정보 */}
              {detailedServices.rooms && detailedServices.rooms.length > 0 && (
                <div className="bg-white shadow-sm rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium text-gray-600">🛏 객실 정보 (상세)</h2>
                    <div className="text-right">
                      <span className="text-lg font-bold text-blue-600">
                        {detailedServices.rooms.reduce((total: number, room: any) => total + (room.total_price || 0), 0).toLocaleString()}동
                      </span>
                      <p className="text-sm text-gray-500">객실 합계</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {detailedServices.rooms.map((room: any, index: number) => (
                      <div key={index} className="border border-gray-100 rounded-lg p-4">
                        <div className="flex justify-end items-center mb-3">
                          <div className="text-right">
                            <span className="text-base font-semibold text-blue-600">
                              {(room.total_price || 0).toLocaleString()}동
                            </span>
                          </div>
                        </div>
                        <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                          <tbody>
                            {(room.priceInfo && room.priceInfo.length > 0 ? room.priceInfo : [{}]).map((price: any, priceIndex: number) => (
                              <Fragment key={priceIndex}>
                                <tr className="bg-gray-25">
                                  <td className="px-2 py-1 font-medium border-blue-100 border">일정</td>
                                  <td className="px-2 py-1 border-blue-100 border">{price.schedule || '-'}</td>
                                </tr>
                                <tr>
                                  <td className="px-2 py-1 font-medium border-blue-100 border">크루즈</td>
                                  <td className="px-2 py-1 border-blue-100 border">{price.cruise || '-'}</td>
                                </tr>
                                <tr>
                                  <td className="px-2 py-1 font-medium border-blue-100 border">객실 타입</td>
                                  <td className="px-2 py-1 border-blue-100 border">{price.room_type || '-'}</td>
                                </tr>
                                <tr>
                                  <td className="px-2 py-1 font-medium border-blue-100 border">카테고리</td>
                                  <td className="px-2 py-1 border-blue-100 border">{price.room_category || '-'}</td>
                                </tr>
                                <tr>
                                  <td className="px-2 py-1 font-medium border-blue-100 border">단가</td>
                                  <td className="px-2 py-1 border-blue-100 border">{room.unit_price ? room.unit_price.toLocaleString() + '동' : '-'}</td>
                                </tr>
                                <tr className="bg-gray-50">
                                  <td className="px-2 py-1 font-medium border-blue-100 border">인원수</td>
                                  <td className="px-2 py-1 border-blue-100 border">{room.roomInfo?.adult_count}명</td>
                                </tr>

                                <tr className="bg-gray-50">
                                  <td className="px-2 py-1 font-medium border-blue-100 border">추가수</td>
                                  <td className="px-2 py-1 border-blue-100 border">{room.roomInfo?.extra_count || 0}명</td>
                                </tr>
                              </Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 차량 정보 */}
              {detailedServices.cars && detailedServices.cars.length > 0 && (
                <div className="bg-white shadow-sm rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium text-gray-600">🚗 차량 정보 (상세)</h2>
                    <div className="text-right">
                      <span className="text-lg font-bold text-green-600">
                        {detailedServices.cars.reduce((total: number, car: any) => total + (car.total_price || 0), 0).toLocaleString()}동
                      </span>
                      <p className="text-sm text-gray-500">차량 합계</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {detailedServices.cars.map((car: any, index: number) => (
                      <div key={index} className="border border-gray-100 rounded-lg p-4">
                        <div className="flex justify-end items-center mb-3">
                          <div className="text-right">
                            <span className="text-base font-semibold text-green-600">
                              {(car.total_price || 0).toLocaleString()}동
                            </span>
                          </div>
                        </div>
                        <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                          <tbody>
                            {(car.priceInfo && car.priceInfo.length > 0 ? car.priceInfo : [{}]).map((price: any, priceIndex: number) => (
                              <Fragment key={priceIndex}>
                                <tr className="bg-gray-25">
                                  <td className="px-2 py-1 font-medium border-blue-100 border">일정</td>
                                  <td className="px-2 py-1 border-blue-100 border">{price.schedule || '-'}</td>
                                </tr>
                                <tr>
                                  <td className="px-2 py-1 font-medium border-blue-100 border">크루즈</td>
                                  <td className="px-2 py-1 border-blue-100 border">{price.cruise || '-'}</td>
                                </tr>
                                <tr>
                                  <td className="px-2 py-1 font-medium border-blue-100 border">차량 타입</td>
                                  <td className="px-2 py-1 border-blue-100 border">{price.car_type || '-'}</td>
                                </tr>
                                <tr>
                                  <td className="px-2 py-1 font-medium border-blue-100 border">카테고리</td>
                                  <td className="px-2 py-1 border-blue-100 border">{price.car_category || '-'}</td>
                                </tr>
                                <tr>
                                  <td className="px-2 py-1 font-medium border-blue-100 border">단가</td>
                                  <td className="px-2 py-1 border-blue-100 border">{car.unit_price ? car.unit_price.toLocaleString() + '동' : '-'}</td>
                                </tr>
                                <tr className="bg-gray-50">
                                  <td className="px-2 py-1 font-medium border-blue-100 border">차량수</td>
                                  <td className="px-2 py-1 border-blue-100 border">{car.carInfo?.car_count}대</td>
                                </tr>
                              </Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}

                  </div>
                </div>
              )}

              {/* 공항 서비스 정보 */}
              {detailedServices.airports && detailedServices.airports.length > 0 && (
                <div className="bg-white shadow-sm rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium text-gray-600">✈️ 공항 서비스 (상세)</h2>
                    <div className="text-right">
                      <span className="text-lg font-bold text-yellow-600">
                        {detailedServices.airports.reduce((total: number, airport: any) => total + (airport.total_price || 0), 0).toLocaleString()}동
                      </span>
                      <p className="text-sm text-gray-500">공항 서비스 합계</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {detailedServices.airports.map((airport: any, index: number) => (
                      <div key={index} className="border border-gray-100 rounded-lg p-4">
                        <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                          <tbody>
                            {(airport.priceInfo && airport.priceInfo.length > 0 ? airport.priceInfo : [{}]).map((price: any, priceIndex: number) => (
                              <Fragment key={priceIndex}>
                                <tr className="bg-gray-25">
                                  <td className="px-2 py-1 font-medium border-blue-100 border">카테고리</td>
                                  <td className="px-2 py-1 border-blue-100 border">{price.airport_category || '-'}</td>
                                </tr>
                                <tr>
                                  <td className="px-2 py-1 font-medium border-blue-100 border">경로</td>
                                  <td className="px-2 py-1 border-blue-100 border">{price.airport_route || '-'}</td>
                                </tr>
                                <tr>
                                  <td className="px-2 py-1 font-medium border-blue-100 border">차량 타입</td>
                                  <td className="px-2 py-1 border-blue-100 border">{price.airport_car_type || '-'}</td>
                                </tr>
                                <tr>
                                  <td className="px-2 py-1 font-medium border-blue-100 border">단가</td>
                                  <td className="px-2 py-1 border-blue-100 border">{airport.unit_price ? airport.unit_price.toLocaleString() + '동' : '-'}</td>
                                </tr>
                                <tr className="bg-gray-50">
                                  <td className="px-2 py-1 font-medium border-blue-100 border">승객수</td>
                                  <td className="px-2 py-1 border-blue-100 border">
                                    {airport.quantity || airport.airportInfo?.passenger_count || 1}명
                                  </td>
                                </tr>
                              </Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 호텔 정보 */}
              {detailedServices.hotels && detailedServices.hotels.length > 0 && (
                <div className="bg-white shadow-sm rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium text-gray-600">🏨 호텔 정보 (상세)</h2>
                    <div className="text-right">
                      <span className="text-lg font-bold text-pink-600">
                        {detailedServices.hotels.reduce((total: number, hotel: any) => total + (hotel.total_price || 0), 0).toLocaleString()}동
                      </span>
                      <p className="text-sm text-gray-500">호텔 합계</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {detailedServices.hotels.map((hotel: any, index: number) => (
                      <div key={index} className="border border-gray-100 rounded-lg p-4">
                        <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                          <tbody>
                            {(hotel.priceInfo && hotel.priceInfo.length > 0 ? hotel.priceInfo : [{}]).map((price: any, priceIndex: number) => (
                              <Fragment key={priceIndex}>
                                <tr className="bg-gray-25">
                                  <td className="px-2 py-1 font-medium border-blue-100 border">호텔명</td>
                                  <td className="px-2 py-1 border-blue-100 border">{price.hotel_name || '-'}</td>
                                </tr>
                                <tr>
                                  <td className="px-2 py-1 font-medium border-blue-100 border">객실명</td>
                                  <td className="px-2 py-1 border-blue-100 border">{price.room_name || '-'}</td>
                                </tr>
                                <tr>
                                  <td className="px-2 py-1 font-medium border-blue-100 border">객실 타입</td>
                                  <td className="px-2 py-1 border-blue-100 border">{price.room_type || '-'}</td>
                                </tr>
                                <tr>
                                  <td className="px-2 py-1 font-medium border-blue-100 border">단가</td>
                                  <td className="px-2 py-1 border-blue-100 border">{hotel.unit_price ? hotel.unit_price.toLocaleString() + '동' : '-'}</td>
                                </tr>
                                <tr className="bg-gray-50">
                                  <td className="px-2 py-1 font-medium border-blue-100 border">호텔명</td>
                                  <td className="px-2 py-1 border-blue-100 border">{hotel.hotelInfo?.hotel_name || '호텔 정보 없음'}</td>
                                </tr>
                              </Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 렌트카 정보 */}
              {detailedServices.rentcars && detailedServices.rentcars.length > 0 && (
                <div className="bg-white shadow-sm rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium text-gray-600">🚙 렌트카 정보 (상세)</h2>
                    <div className="text-right">
                      <span className="text-lg font-bold text-green-600">
                        {detailedServices.rentcars.reduce((total: number, rentcar: any) => total + (rentcar.total_price || 0), 0).toLocaleString()}동
                      </span>
                      <p className="text-sm text-gray-500">렌트카 합계</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {detailedServices.rentcars.map((rentcar: any, index: number) => (
                      <div key={index} className="border border-gray-100 rounded-lg p-4">
                        <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                          <tbody>
                            {(rentcar.priceInfo && rentcar.priceInfo.length > 0 ? rentcar.priceInfo : [{}]).map((price: any, priceIndex: number) => (
                              <Fragment key={priceIndex}>
                                <tr className="bg-gray-25">
                                  <td className="px-2 py-1 font-medium border-blue-100 border">렌트 타입</td>
                                  <td className="px-2 py-1 border-blue-100 border">{price.rent_type || '-'}</td>
                                </tr>
                                <tr>
                                  <td className="px-2 py-1 font-medium border-blue-100 border">카테고리</td>
                                  <td className="px-2 py-1 border-blue-100 border">{price.rent_category || '-'}</td>
                                </tr>
                                <tr>
                                  <td className="px-2 py-1 font-medium border-blue-100 border">경로</td>
                                  <td className="px-2 py-1 border-blue-100 border">{price.rent_route || '-'}</td>
                                </tr>
                                <tr>
                                  <td className="px-2 py-1 font-medium border-blue-100 border">단가</td>
                                  <td className="px-2 py-1 border-blue-100 border">{rentcar.unit_price ? rentcar.unit_price.toLocaleString() + '동' : '-'}</td>
                                </tr>
                                <tr className="bg-gray-50">
                                  <td className="px-2 py-1 font-medium border-blue-100 border">렌트카명</td>
                                  <td className="px-2 py-1 border-blue-100 border">{(rentcar.priceInfo && rentcar.priceInfo[0]?.rent_car_type) ? rentcar.priceInfo[0].rent_car_type : (rentcar.rentcarInfo?.rentcar_name || '렌트카 정보 없음')}</td>
                                </tr>
                              </Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}

                  </div>
                </div>
              )}

              {/* 투어 정보 */}
              {detailedServices.tours && detailedServices.tours.length > 0 && (
                <div className="bg-white shadow-sm rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium text-gray-600">🎯 투어 정보 (상세)</h2>
                    <div className="text-right">
                      <span className="text-lg font-bold text-purple-600">
                        {detailedServices.tours.reduce((total: number, tour: any) => total + (tour.total_price || 0), 0).toLocaleString()}동
                      </span>
                      <p className="text-sm text-gray-500">투어 합계</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {detailedServices.tours.map((tour: any, index: number) => (
                      <div key={index} className="border border-gray-100 rounded-lg p-4">
                        <table className="min-w-full text-sm text-gray-600 border border-blue-100">
                          <tbody>
                            {(tour.priceInfo && tour.priceInfo.length > 0 ? tour.priceInfo : [{}]).map((price: any, priceIndex: number) => (
                              <Fragment key={priceIndex}>
                                <tr className="bg-gray-25">
                                  <td className="px-2 py-1 font-medium border-blue-100 border">투어명</td>
                                  <td className="px-2 py-1 border-blue-100 border">{price.tour_name || '-'}</td>
                                </tr>
                                <tr>
                                  <td className="px-2 py-1 font-medium border-blue-100 border">투어 인원</td>
                                  <td className="px-2 py-1 border-blue-100 border">{price.tour_capacity ? price.tour_capacity + '명' : '-'}</td>
                                </tr>
                                <tr>
                                  <td className="px-2 py-1 font-medium border-blue-100 border">차량</td>
                                  <td className="px-2 py-1 border-blue-100 border">{price.tour_vehicle || '-'}</td>
                                </tr>
                                <tr>
                                  <td className="px-2 py-1 font-medium border-blue-100 border">단가</td>
                                  <td className="px-2 py-1 border-blue-100 border">{tour.unit_price ? tour.unit_price.toLocaleString() + '동' : '-'}</td>
                                </tr>
                                <tr className="bg-gray-50">
                                  <td className="px-2 py-1 font-medium border-blue-100 border">투어 날짜</td>
                                  <td className="px-2 py-1 border-blue-100 border">{tour.tourInfo?.tour_date || '-'}</td>
                                </tr>
                                <tr className="bg-gray-50">
                                  <td className="px-2 py-1 font-medium border-blue-100 border">차량수</td>
                                  <td className="px-2 py-1 border-blue-100 border">{tour.tourInfo?.participant_count || 0}대</td>
                                </tr>
                              </Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 전체 견적 금액 요약 */}
              <div className="bg-white shadow-sm rounded-lg p-6 border-2 border-blue-200">
                <h2 className="text-xl font-bold text-gray-800 mb-6">💰 견적 금액 요약</h2>

                {/* 섹션별 금액 */}
                <div className="space-y-3 mb-6">
                  {detailedServices.rooms && detailedServices.rooms.length > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">🛏 객실 서비스</span>
                      <span className="font-medium text-blue-600">
                        {detailedServices.rooms.reduce((total: number, room: any) => total + (room.total_price || 0), 0).toLocaleString()}동
                      </span>
                    </div>
                  )}

                  {detailedServices.cars && detailedServices.cars.length > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">🚗 차량 서비스</span>
                      <span className="font-medium text-green-600">
                        {detailedServices.cars.reduce((total: number, car: any) => total + (car.total_price || 0), 0).toLocaleString()}동
                      </span>
                    </div>
                  )}

                  {detailedServices.airports && detailedServices.airports.length > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">✈️ 공항 서비스</span>
                      <span className="font-medium text-yellow-600">
                        {detailedServices.airports.reduce((total: number, airport: any) => total + (airport.total_price || 0), 0).toLocaleString()}동
                      </span>
                    </div>
                  )}

                  {detailedServices.hotels && detailedServices.hotels.length > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">🏨 호텔 서비스</span>
                      <span className="font-medium text-pink-600">
                        {detailedServices.hotels.reduce((total: number, hotel: any) => total + (hotel.total_price || 0), 0).toLocaleString()}동
                      </span>
                    </div>
                  )}

                  {detailedServices.rentcars && detailedServices.rentcars.length > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">🚙 렌트카 서비스</span>
                      <span className="font-medium text-green-600">
                        {detailedServices.rentcars.reduce((total: number, rentcar: any) => total + (rentcar.total_price || 0), 0).toLocaleString()}동
                      </span>
                    </div>
                  )}

                  {detailedServices.tours && detailedServices.tours.length > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">🎯 투어 서비스</span>
                      <span className="font-medium text-purple-600">
                        {detailedServices.tours.reduce((total: number, tour: any) => total + (tour.total_price || 0), 0).toLocaleString()}동
                      </span>
                    </div>
                  )}

                  {quote.rentcar && quote.rentcar.length > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">🚗 기본 렌트카</span>
                      <span className="font-medium text-gray-600">
                        {quote.rentcar.reduce((total: number, car: any) => total + (car.total_price || 0), 0).toLocaleString()}동
                      </span>
                    </div>
                  )}
                </div>

                {/* 총 합계 */}
                <div className="border-t-2 border-blue-200 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-800">총 견적 금액</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {(() => {
                        const detailedTotal =
                          (detailedServices.rooms?.reduce((total: number, room: any) => total + (room.total_price || 0), 0) || 0) +
                          (detailedServices.cars?.reduce((total: number, car: any) => total + (car.total_price || 0), 0) || 0) +
                          (detailedServices.airports?.reduce((total: number, airport: any) => total + (airport.total_price || 0), 0) || 0) +
                          (detailedServices.hotels?.reduce((total: number, hotel: any) => total + (hotel.total_price || 0), 0) || 0) +
                          (detailedServices.rentcars?.reduce((total: number, rentcar: any) => total + (rentcar.total_price || 0), 0) || 0) +
                          (detailedServices.tours?.reduce((total: number, tour: any) => total + (tour.total_price || 0), 0) || 0) +
                          (quote.rentcar?.reduce((total: number, car: any) => total + (car.total_price || 0), 0) || 0);

                        // 상세 서비스 총액과 견적 총액 중 더 큰 값을 사용
                        const finalTotal = Math.max(detailedTotal, quote.total_price || 0);
                        return finalTotal.toLocaleString();
                      })()}동
                    </span>
                  </div>
                  {quote.total_price && quote.total_price > 0 && (
                    <div className="mt-2 text-sm text-gray-500 text-right">

                    </div>
                  )}
                </div>
              </div>
              {quote.rentcar && quote.rentcar.length > 0 && (
                <div className="bg-white shadow-sm rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium text-gray-600">🚗 기본 렌트카 정보</h2>
                    <div className="text-right">
                      <span className="text-lg font-bold text-gray-600">
                        {quote.rentcar.reduce((total: number, car: any) => total + (car.total_price || 0), 0).toLocaleString()}동
                      </span>
                      <p className="text-sm text-gray-500">기본 렌트카 합계</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {quote.rentcar.map((car: any, index: number) => (
                      <div key={index} className="border border-gray-100 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-gray-600">
                              {car.car_model || '차량 정보 없음'}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                              픽업일: {car.pickup_date ? new Date(car.pickup_date).toLocaleDateString() : '미정'} |
                              반납일: {car.return_date ? new Date(car.return_date).toLocaleDateString() : '미정'}
                            </p>
                            <p className="text-sm text-gray-500">
                              픽업장소: {car.pickup_location || '미정'} |
                              반납장소: {car.return_location || '미정'}
                            </p>
                            <div className="mt-2">
                              <span className="text-sm text-gray-400">
                                수량: {car.quantity || 1}대
                              </span>
                            </div>
                            {car.options && (
                              <p className="text-sm text-gray-400 mt-1">
                                추가 옵션: {JSON.stringify(car.options)}
                              </p>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <span className="text-base font-semibold text-gray-600">
                              {(car.total_price || 0).toLocaleString()}동
                            </span>

                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 예약하기 버튼 - 페이지 하단 */}
              <div className="flex justify-center mt-10">
                <button
                  onClick={handleReservation}
                  className="btn bg-blue-300 text-black text-xs px-2 py-2 rounded w-40 font-bold shadow-sm hover:bg-blue-400 transition-colors"
                >
                  🚢 예약
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
