'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AnalyticsManagement() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7'); // 7, 30, 90, 365
  const [stats, setStats] = useState({
    overview: {
      totalQuotes: 0,
      confirmedReservations: 0,
      totalRevenue: 0,
      conversionRate: 0
    },
    trends: {
      quoteTrend: [],
      revenueTrend: [],
      popularCruises: [],
      popularRooms: []
    },
    performance: {
      avgResponseTime: 0,
      customerSatisfaction: 0,
      repeatCustomers: 0
    }
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user, dateRange]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!userData || (userData.role !== 'manager' && userData.role !== 'admin')) {
        alert('매니저 권한이 필요합니다.');
        router.push('/');
        return;
      }

      setUser(session.user);
    } catch (error) {
      console.error('인증 오류:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      // 전체 통계
      const { count: totalQuotes } = await supabase
        .from('quote')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      const { count: confirmedReservations } = await supabase
        .from('quote')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'confirmed')
        .gte('created_at', startDate.toISOString());

      // 인기 크루즈
      const { data: popularCruisesData } = await supabase
        .from('quote')
        .select(`
          cruise_code,
          cruise_info!quote_cruise_code_fkey(name),
          count(*)
        `)
        .gte('created_at', startDate.toISOString())
        .group('cruise_code, cruise_info.name')
        .order('count', { ascending: false })
        .limit(5);

      // 인기 객실
      const { data: popularRoomsData } = await supabase
        .from('quote_room')
        .select(`
          room_code,
          room_info!quote_room_room_code_fkey(name),
          count(*)
        `)
        .gte('created_at', startDate.toISOString())
        .group('room_code, room_info.name')
        .order('count', { ascending: false })
        .limit(5);

      // 일별 견적 추이
      const quoteTrendData = [];
      for (let i = parseInt(dateRange); i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const { count } = await supabase
          .from('quote')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', dateStr)
          .lt('created_at', new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

        quoteTrendData.push({
          date: dateStr,
          count: count || 0
        });
      }

      // 재방문 고객 수
      const { data: repeatCustomersData } = await supabase
        .from('quote')
        .select('user_id, count(*)')
        .gte('created_at', startDate.toISOString())
        .group('user_id')
        .having('count(*)', 'gt', 1);

      const conversionRate = totalQuotes > 0 ? (confirmedReservations / totalQuotes * 100) : 0;

      setStats({
        overview: {
          totalQuotes: totalQuotes || 0,
          confirmedReservations: confirmedReservations || 0,
          totalRevenue: 0, // TODO: 실제 매출 계산
          conversionRate: Math.round(conversionRate * 100) / 100
        },
        trends: {
          quoteTrend: quoteTrendData,
          revenueTrend: [], // TODO: 매출 추이
          popularCruises: popularCruisesData?.map(item => ({
            name: item.cruise_info?.name || item.cruise_code,
            count: item.count
          })) || [],
          popularRooms: popularRoomsData?.map(item => ({
            name: item.room_info?.name || item.room_code,
            count: item.count
          })) || []
        },
        performance: {
          avgResponseTime: 0, // TODO: 평균 응답 시간
          customerSatisfaction: 0, // TODO: 고객 만족도
          repeatCustomers: repeatCustomersData?.length || 0
        }
      });
    } catch (error) {
      console.error('분석 데이터 로드 실패:', error);
    }
  };

  const exportData = async () => {
    try {
      // CSV 형태로 데이터 내보내기
      const csvData = [
        ['날짜', '견적수', '확정수', '전환율'],
        ...stats.trends.quoteTrend.map(item => [
          item.date,
          item.count,
          '', // TODO: 일별 확정수
          ''  // TODO: 일별 전환율
        ])
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `analytics_${dateRange}days.csv`;
      link.click();
    } catch (error) {
      console.error('데이터 내보내기 실패:', error);
      alert('데이터 내보내기에 실패했습니다.');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('로그아웃 오류:', error);
      alert('로그아웃에 실패했습니다.');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-lg text-black">로딩 중...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <div className="bg-gray-50 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-black">📊 통계 분석</h1>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm text-black bg-white focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
              >
                <option value="7">최근 7일</option>
                <option value="30">최근 30일</option>
                <option value="90">최근 90일</option>
                <option value="365">최근 1년</option>
              </select>
              <button
                onClick={exportData}
                className="bg-green-200 hover:bg-green-300 text-black px-4 py-2 rounded-md text-sm font-medium"
              >
                파일
              </button>
              <button
                onClick={() => router.push('/manager/dashboard')}
                className="p-2 bg-blue-100 text-black rounded-full hover:bg-blue-200 transition-colors"
                title="대시보드로 이동"
              >
                📊
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-100 hover:bg-red-200 text-black px-4 py-2 rounded-md text-sm font-medium"
                title="로그아웃"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 주요 지표 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                    <span className="text-black text-sm font-bold">📋</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-600 truncate">총 견적 수</dt>
                    <dd className="text-lg font-medium text-black">{stats.overview.totalQuotes}건</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center">
                    <span className="text-black text-sm font-bold">✅</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-600 truncate">확정 예약</dt>
                    <dd className="text-lg font-medium text-black">{stats.overview.confirmedReservations}건</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
                    <span className="text-black text-sm font-bold">📈</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-600 truncate">전환율</dt>
                    <dd className="text-lg font-medium text-black">{stats.overview.conversionRate}%</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-200 rounded-full flex items-center justify-center">
                    <span className="text-black text-sm font-bold">🔄</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-600 truncate">재방문 고객</dt>
                    <dd className="text-lg font-medium text-black">{stats.performance.repeatCustomers}명</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* 견적 추이 차트 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-black mb-4">견적 요청 추이</h3>
            <div className="h-64 flex items-end space-x-2">
              {stats.trends.quoteTrend.map((item, index) => {
                const maxCount = Math.max(...stats.trends.quoteTrend.map(t => t.count));
                const height = maxCount > 0 ? (item.count / maxCount) * 200 : 0;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-blue-300 rounded-t"
                      style={{ height: `${height}px` }}
                      title={`${item.date}: ${item.count}건`}
                    />
                    <div className="text-xs text-gray-600 mt-2">
                      {new Date(item.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 인기 크루즈 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-black mb-4">인기 크루즈</h3>
            <div className="space-y-3">
              {stats.trends.popularCruises.slice(0, 5).map((cruise, index) => {
                const maxCount = Math.max(...stats.trends.popularCruises.map(c => c.count));
                const percentage = maxCount > 0 ? (cruise.count / maxCount) * 100 : 0;
                
                return (
                  <div key={index} className="flex items-center">
                    <div className="w-32 text-sm text-black truncate">
                      {cruise.name}
                    </div>
                    <div className="flex-1 mx-3">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-300 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-sm text-black font-medium">
                      {cruise.count}건
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 인기 객실 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-black mb-4">인기 객실</h3>
            <div className="space-y-3">
              {stats.trends.popularRooms.slice(0, 5).map((room, index) => {
                const maxCount = Math.max(...stats.trends.popularRooms.map(r => r.count));
                const percentage = maxCount > 0 ? (room.count / maxCount) * 100 : 0;
                
                return (
                  <div key={index} className="flex items-center">
                    <div className="w-32 text-sm text-black truncate">
                      {room.name}
                    </div>
                    <div className="flex-1 mx-3">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-300 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-sm text-black font-medium">
                      {room.count}건
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 성과 지표 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-black mb-4">성과 지표</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">견적 → 예약 전환율</span>
                <span className="text-lg font-semibold text-black">
                  {stats.overview.conversionRate}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">재방문 고객 비율</span>
                <span className="text-lg font-semibold text-black">
                  {stats.overview.totalQuotes > 0 
                    ? Math.round((stats.performance.repeatCustomers / stats.overview.totalQuotes) * 100 * 100) / 100
                    : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">평균 응답 시간</span>
                <span className="text-lg font-semibold text-black">
                  {stats.performance.avgResponseTime || 0}시간
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">고객 만족도</span>
                <span className="text-lg font-semibold text-black">
                  {stats.performance.customerSatisfaction || 0}/5
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
