'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import ManagerLayout from '@/components/ManagerLayout';
import {
  BarChart3,
  FileText,
  Calendar,
  CreditCard,
  CheckSquare,
  TrendingUp,
  Users,
  DollarSign,
  Ship,
  Plane,
  Building,
  MapPin,
  Car,
  RefreshCw
} from 'lucide-react';

type TabType = 'quotes' | 'reservations' | 'payments' | 'confirmations';

interface AnalyticsData {
  quotes?: any;
  reservations?: any;
  payments?: any;
  confirmations?: any;
}

export default function ManagerAnalyticsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('quotes');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const tabs = [
    { id: 'quotes' as TabType, label: '견적 분석', icon: <FileText className="w-4 h-4" />, color: 'blue' },
    { id: 'reservations' as TabType, label: '예약 분석', icon: <Calendar className="w-4 h-4" />, color: 'green' },
    { id: 'payments' as TabType, label: '결제 분석', icon: <CreditCard className="w-4 h-4" />, color: 'purple' },
    { id: 'confirmations' as TabType, label: '확인서 분석', icon: <CheckSquare className="w-4 h-4" />, color: 'orange' }
  ];

  useEffect(() => {
    checkAuth();
    loadAnalyticsData();
  }, [activeTab]);

  const checkAuth = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('🚨 인증 오류:', userError);
        router.push('/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userData && !['manager', 'admin'].includes(userData.role)) {
        alert('매니저 권한이 필요합니다.');
        router.push('/');
        return;
      }
    } catch (error) {
      console.error('🚨 권한 확인 중 오류:', error);
    }
  };

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      console.log('📊 분석 데이터 조회 시작:', activeTab);

      // 날짜 범위 설정 (최근 30일)
      const now = new Date();
      const last30Days = new Date();
      last30Days.setDate(now.getDate() - 30);

      const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (6 - i));
        const key = d.toISOString().slice(0, 10);
        return { key, date: new Date(key), count: 0 };
      });

      let tabData: any = {};

      switch (activeTab) {
        case 'quotes':
          // 견적 데이터 조회
          const { data: quotes, error: quotesError } = await supabase
            .from('quote')
            .select('id, status, total_price, created_at');

          if (quotesError) {
            console.error('견적 데이터 조회 오류:', quotesError);
          } else {
            const recentQuotes = quotes?.filter(q => new Date(q.created_at) >= last30Days) || [];

            // 견적 7일 트렌드
            const quoteTrend = [...last7Days];
            for (const q of recentQuotes) {
              const key = new Date(q.created_at).toISOString().slice(0, 10);
              const bucket = quoteTrend.find(b => b.key === key);
              if (bucket) bucket.count += 1;
            }

            tabData = {
              total: quotes?.length || 0,
              recent30: recentQuotes.length,
              byStatus: {
                approved: quotes?.filter(q => q.status === 'approved').length || 0,
                pending: quotes?.filter(q => q.status === 'pending').length || 0,
                draft: quotes?.filter(q => q.status === 'draft').length || 0,
                rejected: quotes?.filter(q => q.status === 'rejected').length || 0,
              },
              totalValue: quotes?.reduce((sum, q) => sum + (q.total_price || 0), 0) || 0,
              avgValue: quotes?.length ? (quotes.reduce((sum, q) => sum + (q.total_price || 0), 0) / quotes.length) : 0,
              trend7d: quoteTrend
            };
          }
          break;

        case 'reservations':
          // 예약 데이터 조회
          const { data: reservations, error: reservationsError } = await supabase
            .from('reservation')
            .select('re_id, re_status, re_type, re_created_at, re_user_id');

          if (reservationsError) {
            console.error('예약 데이터 조회 오류:', reservationsError);
          } else {
            const recentReservations = reservations?.filter(r => new Date(r.re_created_at) >= last30Days) || [];
            const uniqueCustomers = new Set(reservations?.map(r => r.re_user_id) || []).size;

            // 예약 7일 트렌드
            const reservationTrend = [...last7Days];
            for (const r of recentReservations) {
              const key = new Date(r.re_created_at).toISOString().slice(0, 10);
              const bucket = reservationTrend.find(b => b.key === key);
              if (bucket) bucket.count += 1;
            }

            // 타입별 분류
            const byType = reservations?.reduce((acc: Record<string, number>, r) => {
              const key = r.re_type || 'unknown';
              acc[key] = (acc[key] || 0) + 1;
              return acc;
            }, {}) || {};

            tabData = {
              total: reservations?.length || 0,
              recent30: recentReservations.length,
              customers: uniqueCustomers,
              byStatus: {
                confirmed: reservations?.filter(r => r.re_status === 'confirmed').length || 0,
                pending: reservations?.filter(r => r.re_status === 'pending').length || 0,
                cancelled: reservations?.filter(r => r.re_status === 'cancelled').length || 0,
              },
              byType,
              trend7d: reservationTrend
            };
          }
          break;

        case 'payments':
          // 결제 데이터 - 테스트 데이터로 구성
          tabData = {
            total: 142,
            recent30: 28,
            totalAmount: 85400000,
            avgAmount: 601408,
            byStatus: {
              completed: 120,
              pending: 15,
              failed: 7,
            },
            byMethod: {
              card: 98,
              transfer: 32,
              cash: 12,
            },
            trend7d: [
              { key: '2025-08-07', date: new Date('2025-08-07'), count: 3 },
              { key: '2025-08-08', date: new Date('2025-08-08'), count: 5 },
              { key: '2025-08-09', date: new Date('2025-08-09'), count: 2 },
              { key: '2025-08-10', date: new Date('2025-08-10'), count: 4 },
              { key: '2025-08-11', date: new Date('2025-08-11'), count: 6 },
              { key: '2025-08-12', date: new Date('2025-08-12'), count: 3 },
              { key: '2025-08-13', date: new Date('2025-08-13'), count: 2 }
            ]
          };
          break;

        case 'confirmations':
          // 확인서 데이터 - 테스트 데이터로 구성
          tabData = {
            total: 98,
            recent30: 22,
            byType: {
              booking: 45,
              payment: 32,
              cancellation: 21,
            },
            byStatus: {
              sent: 88,
              pending: 10,
            },
            trend7d: [
              { key: '2025-08-07', date: new Date('2025-08-07'), count: 2 },
              { key: '2025-08-08', date: new Date('2025-08-08'), count: 4 },
              { key: '2025-08-09', date: new Date('2025-08-09'), count: 1 },
              { key: '2025-08-10', date: new Date('2025-08-10'), count: 3 },
              { key: '2025-08-11', date: new Date('2025-08-11'), count: 5 },
              { key: '2025-08-12', date: new Date('2025-08-12'), count: 4 },
              { key: '2025-08-13', date: new Date('2025-08-13'), count: 3 }
            ]
          };
          break;
      }

      setAnalyticsData(prev => ({
        quotes: undefined,
        reservations: undefined,
        payments: undefined,
        confirmations: undefined,
        ...prev,
        [activeTab]: tabData
      }));

    } catch (error) {
      console.error('🚨 분석 데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'cruise': return <Ship className="w-4 h-4 text-blue-600" />;
      case 'airport': return <Plane className="w-4 h-4 text-green-600" />;
      case 'hotel': return <Building className="w-4 h-4 text-purple-600" />;
      case 'tour': return <MapPin className="w-4 h-4 text-orange-600" />;
      case 'rentcar': return <Car className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  const renderQuotesAnalytics = () => {
    const data = analyticsData?.quotes;
    if (!data) return null;

    return (
      <div className="space-y-6">
        {/* 주요 지표 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">총 견적</p>
                <p className="text-2xl font-bold text-gray-800">{data.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">최근 30일</p>
                <p className="text-2xl font-bold text-gray-800">{data.recent30}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">총 견적가</p>
                <p className="text-2xl font-bold text-gray-800">{(data.totalValue / 10000).toFixed(0)}만원</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">평균 견적가</p>
                <p className="text-2xl font-bold text-gray-800">{(data.avgValue / 10000).toFixed(0)}만원</p>
              </div>
            </div>
          </div>
        </div>

        {/* 차트 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 견적 상태 분포 */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">견적 상태 분포</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>승인됨</span>
                </div>
                <span className="font-medium">{data.byStatus.approved}건</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span>검토 대기</span>
                </div>
                <span className="font-medium">{data.byStatus.pending}건</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-500 rounded"></div>
                  <span>작성 중</span>
                </div>
                <span className="font-medium">{data.byStatus.draft}건</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span>거부됨</span>
                </div>
                <span className="font-medium">{data.byStatus.rejected}건</span>
              </div>
            </div>
          </div>

          {/* 최근 7일 트렌드 */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">최근 7일 견적 생성</h3>
            <div className="space-y-3">
              {data.trend7d?.map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-12 text-sm text-gray-600">{new Date(item.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${Math.max(5, (item.count / Math.max(...data.trend7d.map((t: any) => t.count))) * 100)}%`
                      }}
                    ></div>
                  </div>
                  <div className="w-8 text-sm font-medium text-right">{item.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReservationsAnalytics = () => {
    const data = analyticsData?.reservations;
    if (!data) return null;

    return (
      <div className="space-y-6">
        {/* 주요 지표 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">총 예약</p>
                <p className="text-2xl font-bold text-gray-800">{data.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">고객 수</p>
                <p className="text-2xl font-bold text-gray-800">{data.customers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">최근 30일</p>
                <p className="text-2xl font-bold text-gray-800">{data.recent30}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckSquare className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">확정</p>
                <p className="text-2xl font-bold text-gray-800">{data.byStatus.confirmed}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 차트 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 예약 상태 분포 */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">예약 상태 분포</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>확정</span>
                </div>
                <span className="font-medium">{data.byStatus.confirmed}건</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span>대기 중</span>
                </div>
                <span className="font-medium">{data.byStatus.pending}건</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span>취소됨</span>
                </div>
                <span className="font-medium">{data.byStatus.cancelled}건</span>
              </div>
            </div>
          </div>

          {/* 서비스 타입별 분포 */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">서비스 타입별 예약</h3>
            <div className="space-y-3">
              {Object.entries(data.byType || {}).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getServiceIcon(type)}
                    <span>{type}</span>
                  </div>
                  <span className="font-medium">{count as number}건</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 최근 7일 트렌드 */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">최근 7일 예약 활동</h3>
          <div className="space-y-3">
            {data.trend7d?.map((item: any, index: number) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-12 text-sm text-gray-600">{new Date(item.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</div>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${Math.max(5, (item.count / Math.max(...data.trend7d.map((t: any) => t.count))) * 100)}%`
                    }}
                  ></div>
                </div>
                <div className="w-8 text-sm font-medium text-right">{item.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderPaymentsAnalytics = () => {
    const data = analyticsData?.payments;
    if (!data) return null;

    return (
      <div className="space-y-6">
        {/* 주요 지표 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <CreditCard className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">총 결제</p>
                <p className="text-2xl font-bold text-gray-800">{data.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">총 결제액</p>
                <p className="text-2xl font-bold text-gray-800">{(data.totalAmount / 100000000).toFixed(1)}억원</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">평균 결제액</p>
                <p className="text-2xl font-bold text-gray-800">{(data.avgAmount / 10000).toFixed(0)}만원</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">최근 30일</p>
                <p className="text-2xl font-bold text-gray-800">{data.recent30}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 차트 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 결제 상태 분포 */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">결제 상태 분포</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>완료</span>
                </div>
                <span className="font-medium">{data.byStatus.completed}건</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span>대기 중</span>
                </div>
                <span className="font-medium">{data.byStatus.pending}건</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span>실패</span>
                </div>
                <span className="font-medium">{data.byStatus.failed}건</span>
              </div>
            </div>
          </div>

          {/* 결제 방법별 분포 */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">결제 방법별 분포</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>카드 결제</span>
                <span className="font-medium">{data.byMethod.card}건</span>
              </div>
              <div className="flex items-center justify-between">
                <span>계좌 이체</span>
                <span className="font-medium">{data.byMethod.transfer}건</span>
              </div>
              <div className="flex items-center justify-between">
                <span>현금</span>
                <span className="font-medium">{data.byMethod.cash}건</span>
              </div>
            </div>
          </div>
        </div>

        {/* 최근 7일 트렌드 */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">최근 7일 결제 활동</h3>
          <div className="space-y-3">
            {data.trend7d?.map((item: any, index: number) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-12 text-sm text-gray-600">{new Date(item.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</div>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full"
                    style={{
                      width: `${Math.max(5, (item.count / Math.max(...data.trend7d.map((t: any) => t.count))) * 100)}%`
                    }}
                  ></div>
                </div>
                <div className="w-8 text-sm font-medium text-right">{item.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderConfirmationsAnalytics = () => {
    const data = analyticsData?.confirmations;
    if (!data) return null;

    return (
      <div className="space-y-6">
        {/* 주요 지표 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <CheckSquare className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">총 확인서</p>
                <p className="text-2xl font-bold text-gray-800">{data.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">최근 30일</p>
                <p className="text-2xl font-bold text-gray-800">{data.recent30}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">발송 완료</p>
                <p className="text-2xl font-bold text-gray-800">{data.byStatus.sent}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Calendar className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">발송 대기</p>
                <p className="text-2xl font-bold text-gray-800">{data.byStatus.pending}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 차트 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 확인서 타입별 분포 */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">확인서 타입별 분포</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>예약 확인서</span>
                <span className="font-medium">{data.byType.booking}건</span>
              </div>
              <div className="flex items-center justify-between">
                <span>결제 확인서</span>
                <span className="font-medium">{data.byType.payment}건</span>
              </div>
              <div className="flex items-center justify-between">
                <span>취소 확인서</span>
                <span className="font-medium">{data.byType.cancellation}건</span>
              </div>
            </div>
          </div>

          {/* 발송 상태 분포 */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">발송 상태 분포</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>발송 완료</span>
                </div>
                <span className="font-medium">{data.byStatus.sent}건</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span>발송 대기</span>
                </div>
                <span className="font-medium">{data.byStatus.pending}건</span>
              </div>
            </div>
          </div>
        </div>

        {/* 최근 7일 트렌드 */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">최근 7일 확인서 발송</h3>
          <div className="space-y-3">
            {data.trend7d?.map((item: any, index: number) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-12 text-sm text-gray-600">{new Date(item.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</div>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{
                      width: `${Math.max(5, (item.count / Math.max(...data.trend7d.map((t: any) => t.count))) * 100)}%`
                    }}
                  ></div>
                </div>
                <div className="w-8 text-sm font-medium text-right">{item.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <ManagerLayout title="분석 대시보드" activeTab="analytics">
        <div className="flex flex-col justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout title="분석 대시보드" activeTab="analytics">
      <div className="space-y-6">
        {/* 탭 메뉴 */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.id
                    ? `bg-${tab.color}-600 text-white shadow-md`
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                  }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            <p className="text-gray-600 mt-1">
              {activeTab === 'quotes' && '견적 현황과 트렌드를 분석합니다.'}
              {activeTab === 'reservations' && '예약 현황과 고객 분석을 제공합니다.'}
              {activeTab === 'payments' && '결제 현황과 수익 분석을 확인합니다.'}
              {activeTab === 'confirmations' && '확인서 발송 현황을 분석합니다.'}
            </p>
          </div>

          <button
            onClick={loadAnalyticsData}
            disabled={loading}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            title="새로고침"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* 탭별 컨텐츠 */}
        {activeTab === 'quotes' && renderQuotesAnalytics()}
        {activeTab === 'reservations' && renderReservationsAnalytics()}
        {activeTab === 'payments' && renderPaymentsAnalytics()}
        {activeTab === 'confirmations' && renderConfirmationsAnalytics()}
      </div>
    </ManagerLayout>
  );
}
