'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

interface Notification {
  id: string;
  type: 'quote_request' | 'reservation_reminder' | 'payment_due' | 'system_alert' | 'customer_inquiry';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  created_at: string;
  related_id?: string;
  user_id?: string;
}

export default function NotificationManagement() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState('all'); // all, unread, urgent, system
  const [showModal, setShowModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user, filter]);

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

  const loadNotifications = async () => {
    try {
      console.log('🔔 알림 데이터 로딩 시작...');

      // 실제 구현에서는 notifications 테이블에서 조회
      // const { data, error } = await supabase
      //   .from('notifications')
      //   .select('*')
      //   .order('created_at', { ascending: false });

      // 데모 데이터
      const demoNotifications: Notification[] = [
        {
          id: '1',
          type: 'quote_request',
          title: '새로운 견적 요청',
          message: '김고객님이 하롱베이 크루즈 견적을 요청하셨습니다.',
          priority: 'high',
          read: false,
          created_at: new Date().toISOString(),
          related_id: 'quote-123',
          user_id: 'user-123'
        },
        {
          id: '2',
          type: 'reservation_reminder',
          title: '예약 확인 필요',
          message: '3일 후 출발 예정인 예약 건이 있습니다.',
          priority: 'medium',
          read: false,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          related_id: 'reservation-456'
        },
        {
          id: '3',
          type: 'payment_due',
          title: '결제 완료 확인',
          message: '이여행님의 결제가 완료되어 예약이 확정되었습니다.',
          priority: 'low',
          read: true,
          created_at: new Date(Date.now() - 7200000).toISOString(),
          related_id: 'payment-789'
        },
        {
          id: '4',
          type: 'system_alert',
          title: '시스템 점검 예정',
          message: '내일 새벽 2시부터 4시까지 시스템 점검이 예정되어 있습니다.',
          priority: 'urgent',
          read: false,
          created_at: new Date(Date.now() - 10800000).toISOString()
        },
        {
          id: '5',
          type: 'customer_inquiry',
          title: '고객 문의',
          message: '박여행님이 크루즈 일정 변경을 문의하셨습니다.',
          priority: 'medium',
          read: true,
          created_at: new Date(Date.now() - 14400000).toISOString(),
          user_id: 'user-456'
        }
      ];

      let filteredNotifications = demoNotifications;

      switch (filter) {
        case 'unread':
          filteredNotifications = demoNotifications.filter(n => !n.read);
          break;
        case 'urgent':
          filteredNotifications = demoNotifications.filter(n => n.priority === 'urgent' || n.priority === 'high');
          break;
        case 'system':
          filteredNotifications = demoNotifications.filter(n => n.type === 'system_alert');
          break;
      }

      setNotifications(filteredNotifications);

    } catch (error) {
      console.error('알림 로드 실패:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // 실제 구현
      // const { error } = await supabase
      //   .from('notifications')
      //   .update({ read: true })
      //   .eq('id', notificationId);

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('읽음 처리 실패:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // 실제 구현
      // const { error } = await supabase
      //   .from('notifications')
      //   .update({ read: true })
      //   .eq('read', false);

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      alert('모든 알림을 읽음 처리했습니다.');
    } catch (error) {
      console.error('전체 읽음 처리 실패:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      if (!confirm('이 알림을 삭제하시겠습니까?')) return;

      // 실제 구현
      // const { error } = await supabase
      //   .from('notifications')
      //   .delete()
      //   .eq('id', notificationId);

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      alert('알림이 삭제되었습니다.');
    } catch (error) {
      console.error('알림 삭제 실패:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
    setShowModal(true);
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      quote_request: '📋',
      reservation_reminder: '📅',
      payment_due: '💳',
      system_alert: '⚠️',
      customer_inquiry: '💬'
    };
    return icons[type as keyof typeof icons] || '📢';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-gray-500 bg-gray-100',
      medium: 'text-blue-500 bg-blue-100',
      high: 'text-orange-500 bg-orange-100',
      urgent: 'text-red-500 bg-red-100'
    };
    return colors[priority as keyof typeof colors] || 'text-gray-500 bg-gray-100';
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">🔔 알림 관리</h1>
            <p className="text-gray-600">
              시스템 알림 및 고객 소통 관리 
              {unreadCount > 0 && (
                <span className="ml-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                  {unreadCount}개 읽지 않음
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={markAllAsRead}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              📖 모두 읽음
            </button>
            <button
              onClick={loadNotifications}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              🔄 새로고침
            </button>
            <button
              onClick={() => router.push('/manager/dashboard')}
              className="p-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
              title="대시보드로 이동"
            >
              📊
            </button>
          </div>
        </div>
      </div>

      {/* 필터 섹션 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex gap-4">
          {[
            { key: 'all', label: '전체', icon: '📋' },
            { key: 'unread', label: '읽지 않음', icon: '🔴' },
            { key: 'urgent', label: '긴급', icon: '🚨' },
            { key: 'system', label: '시스템', icon: '⚙️' }
          ].map(option => (
            <button
              key={option.key}
              onClick={() => setFilter(option.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                filter === option.key 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 알림 목록 */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-800">알림 목록</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              📭 알림이 없습니다.
            </div>
          ) : (
            notifications.map(notification => (
              <div
                key={notification.id}
                className={`p-6 cursor-pointer hover:bg-gray-50 transition-colors ${
                  !notification.read ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <span className="text-2xl">{getTypeIcon(notification.type)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className={`font-semibold ${!notification.read ? 'text-blue-900' : 'text-gray-800'}`}>
                          {notification.title}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(notification.priority)}`}>
                          {notification.priority.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">{notification.message}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(notification.created_at).toLocaleString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="text-blue-500 hover:text-blue-700 p-1"
                        title="읽음 처리"
                      >
                        📖
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="삭제"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 알림 상세 모달 */}
      {showModal && selectedNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">알림 상세</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getTypeIcon(selectedNotification.type)}</span>
                    <span>{selectedNotification.type.replace('_', ' ')}</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                  <p className="text-gray-900">{selectedNotification.title}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
                  <p className="text-gray-700">{selectedNotification.message}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">우선순위</label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedNotification.priority)}`}>
                    {selectedNotification.priority.toUpperCase()}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">생성일시</label>
                  <p className="text-gray-700">
                    {new Date(selectedNotification.created_at).toLocaleString('ko-KR')}
                  </p>
                </div>
                
                {selectedNotification.related_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">관련 ID</label>
                    <p className="text-gray-700 font-mono text-sm">{selectedNotification.related_id}</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  닫기
                </button>
                {selectedNotification.related_id && (
                  <button
                    onClick={() => {
                      // 관련 페이지로 이동
                      if (selectedNotification.type === 'quote_request') {
                        router.push(`/manager/quotes/${selectedNotification.related_id}`);
                      } else if (selectedNotification.type === 'reservation_reminder') {
                        router.push(`/manager/reservations/${selectedNotification.related_id}`);
                      }
                      setShowModal(false);
                    }}
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    🔗 관련 페이지로
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
