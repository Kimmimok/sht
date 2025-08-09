'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import ManagerLayout from '@/components/ManagerLayout';
import {
    CheckSquare,
    Square,
    ArrowLeft,
    RefreshCw,
    CheckCircle,
    XCircle,
    Clock,
    Edit,
    Trash2,
    AlertTriangle,
    Users
} from 'lucide-react';

interface ReservationItem {
    re_id: string;
    re_type: string;
    re_status: string;
    re_created_at: string;
    re_quote_id: string | null;
    users: {
        id: string;
        name: string;
        email: string;
        phone: string;
    } | null;
    quote: {
        title: string;
    } | null;
}

type BulkAction = 'confirm' | 'cancel' | 'delete' | 'status_update';

export default function BulkReservationPage() {
    const router = useRouter();
    const [reservations, setReservations] = useState<ReservationItem[]>([]);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('pending');
    const [bulkAction, setBulkAction] = useState<BulkAction>('confirm');
    const [newStatus, setNewStatus] = useState<string>('confirmed');

    useEffect(() => {
        loadReservations();
    }, [filter]);

    const loadReservations = async () => {
        try {
            setLoading(true);

            // 매니저 권한 확인
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            const { data: userData } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();

            if (!userData || !['manager', 'admin'].includes(userData.role)) {
                alert('매니저 권한이 필요합니다.');
                router.push('/');
                return;
            }

            // 1) 예약 데이터 조회 (기본 컬럼만)
            let baseQuery = supabase
                .from('reservation')
                .select('re_id, re_type, re_status, re_created_at, re_quote_id, re_user_id')
                .order('re_created_at', { ascending: false });

            if (filter !== 'all') {
                baseQuery = baseQuery.eq('re_status', filter);
            }

            const { data: reservationsRows, error: reservationsError } = await baseQuery;
            if (reservationsError) throw reservationsError;

            const rows = reservationsRows || [];

            // 2) 관련 사용자 / 견적 일괄 조회
            const userIds = Array.from(new Set(rows.map((r: any) => r.re_user_id).filter(Boolean)));
            const quoteIds = Array.from(new Set(rows.map((r: any) => r.re_quote_id).filter(Boolean)));

            let usersById: Record<string, any> = {};
            let quotesById: Record<string, any> = {};

            if (userIds.length > 0) {
                const { data: usersData } = await supabase
                    .from('users')
                    .select('id, name, email, phone')
                    .in('id', userIds);
                (usersData || []).forEach((u: any) => { usersById[u.id] = u; });
            }

            if (quoteIds.length > 0) {
                const { data: quotesData } = await supabase
                    .from('quote')
                    .select('id, title')
                    .in('id', quoteIds);
                (quotesData || []).forEach((q: any) => { quotesById[q.id] = q; });
            }

            // 3) 최종 목록 구성
            const list: ReservationItem[] = rows.map((r: any) => ({
                re_id: r.re_id,
                re_type: r.re_type,
                re_status: r.re_status,
                re_created_at: r.re_created_at,
                re_quote_id: r.re_quote_id,
                users: r.re_user_id ? (usersById[r.re_user_id] || null) : null,
                quote: r.re_quote_id ? (quotesById[r.re_quote_id] || null) : null,
            }));

            setReservations(list);
            setSelectedItems(new Set()); // 선택 초기화
            setError(null);

        } catch (error) {
            console.error('예약 목록 로드 실패:', error);
            setError('예약 목록을 불러오는 중 오류가 발생했습니다.');
            setReservations([]);
            setSelectedItems(new Set());
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = () => {
        if (selectedItems.size === reservations.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(reservations.map(r => r.re_id)));
        }
    };

    const handleSelectItem = (id: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedItems(newSelected);
    };

    const handleBulkAction = async () => {
        if (selectedItems.size === 0) {
            alert('처리할 항목을 선택해주세요.');
            return;
        }

        const actionText = {
            confirm: '확정',
            cancel: '취소',
            delete: '삭제',
            status_update: '상태 변경'
        }[bulkAction];

        if (!confirm(`선택한 ${selectedItems.size}건의 예약을 ${actionText} 처리하시겠습니까?`)) {
            return;
        }

        setProcessing(true);

        try {
            const selectedIds = Array.from(selectedItems);

            switch (bulkAction) {
                case 'confirm':
                    await supabase
                        .from('reservation')
                        .update({ re_status: 'confirmed' })
                        .in('re_id', selectedIds);
                    break;

                case 'cancel':
                    await supabase
                        .from('reservation')
                        .update({ re_status: 'cancelled' })
                        .in('re_id', selectedIds);
                    break;

                case 'delete':
                    await supabase
                        .from('reservation')
                        .delete()
                        .in('re_id', selectedIds);
                    break;

                case 'status_update':
                    await supabase
                        .from('reservation')
                        .update({ re_status: newStatus })
                        .in('re_id', selectedIds);
                    break;
            }

            alert(`${selectedItems.size}건의 예약이 성공적으로 ${actionText} 처리되었습니다.`);
            setSelectedItems(new Set());
            loadReservations(); // 목록 새로고침

        } catch (error) {
            console.error('일괄 처리 실패:', error);
            alert('일괄 처리 중 오류가 발생했습니다.');
        } finally {
            setProcessing(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'confirmed': return <CheckCircle className="w-4 h-4 text-green-600" />;
            case 'cancelled': return <XCircle className="w-4 h-4 text-red-600" />;
            default: return <Clock className="w-4 h-4 text-yellow-600" />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending': return '대기중';
            case 'confirmed': return '확정';
            case 'cancelled': return '취소됨';
            default: return status;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-yellow-100 text-yellow-800';
        }
    };

    const getTypeName = (type: string) => {
        switch (type) {
            case 'cruise': return '크루즈';
            case 'airport': return '공항';
            case 'hotel': return '호텔';
            case 'tour': return '투어';
            case 'rentcar': return '렌터카';
            default: return type;
        }
    };

    if (loading) {
        return (
            <ManagerLayout title="일괄 처리" activeTab="reservations">
                <div className="flex justify-center items-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="mt-4 text-gray-600">예약 목록을 불러오는 중...</p>
                    </div>
                </div>
            </ManagerLayout>
        );
    }

    return (
        <ManagerLayout title="예약 일괄 처리" activeTab="reservations">
            <div className="space-y-6">

                {/* 헤더 */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/manager/reservations')}
                            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <Edit className="w-7 h-7 text-green-600" />
                                예약 일괄 처리
                            </h1>
                            <p className="text-gray-600 mt-1">여러 예약을 한 번에 처리합니다.</p>
                        </div>
                    </div>

                    <button
                        onClick={loadReservations}
                        className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        title="새로고림"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        ⚠️ {error}
                    </div>
                )}

                {/* 필터 및 일괄 작업 컨트롤 */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">필터 및 작업 선택</h3>
                            <div className="flex gap-4 mb-4">
                                <select
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value as any)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg"
                                >
                                    <option value="all">전체 예약</option>
                                    <option value="pending">대기중</option>
                                    <option value="confirmed">확정</option>
                                    <option value="cancelled">취소</option>
                                </select>
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="text-sm text-gray-600">
                                총 {reservations.length}건 / 선택 {selectedItems.size}건
                            </p>
                        </div>
                    </div>

                    {/* 일괄 작업 설정 */}
                    <div className="border-t pt-4">
                        <div className="flex items-center gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    일괄 작업
                                </label>
                                <select
                                    value={bulkAction}
                                    onChange={(e) => setBulkAction(e.target.value as BulkAction)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg"
                                >
                                    <option value="confirm">일괄 확정</option>
                                    <option value="cancel">일괄 취소</option>
                                    <option value="status_update">상태 변경</option>
                                    <option value="delete">일괄 삭제</option>
                                </select>
                            </div>

                            {bulkAction === 'status_update' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        새 상태
                                    </label>
                                    <select
                                        value={newStatus}
                                        onChange={(e) => setNewStatus(e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-lg"
                                    >
                                        <option value="pending">대기중</option>
                                        <option value="confirmed">확정</option>
                                        <option value="cancelled">취소</option>
                                    </select>
                                </div>
                            )}

                            <div className="flex items-end">
                                <button
                                    onClick={handleBulkAction}
                                    disabled={selectedItems.size === 0 || processing}
                                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${selectedItems.size === 0
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : bulkAction === 'delete'
                                            ? 'bg-red-500 hover:bg-red-600 text-white'
                                            : 'bg-green-500 hover:bg-green-600 text-white'
                                        }`}
                                >
                                    {processing ? '처리 중...' :
                                        selectedItems.size === 0 ? '항목 선택 필요' :
                                            `${selectedItems.size}건 처리`}
                                </button>
                            </div>
                        </div>

                        {bulkAction === 'delete' && selectedItems.size > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-red-700">
                                    <AlertTriangle className="w-5 h-5" />
                                    <span className="font-medium">주의:</span>
                                    <span>삭제된 예약은 복구할 수 없습니다.</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 예약 목록 */}
                <div className="bg-white rounded-lg shadow-md">
                    <div className="p-6 border-b">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">예약 목록</h3>
                            <button
                                onClick={handleSelectAll}
                                className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                {selectedItems.size === reservations.length ? (
                                    <CheckSquare className="w-4 h-4" />
                                ) : (
                                    <Square className="w-4 h-4" />
                                )}
                                전체 선택
                            </button>
                        </div>
                    </div>

                    {reservations.length === 0 ? (
                        <div className="p-8 text-center">
                            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-600 mb-2">
                                {filter === 'all' ? '예약이 없습니다' : `${getStatusText(filter)} 예약이 없습니다`}
                            </h3>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {reservations.map((reservation) => (
                                <div
                                    key={reservation.re_id}
                                    className={`p-6 hover:bg-gray-50 transition-colors ${selectedItems.has(reservation.re_id) ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => handleSelectItem(reservation.re_id)}
                                            className="p-1 hover:bg-gray-200 rounded"
                                        >
                                            {selectedItems.has(reservation.re_id) ? (
                                                <CheckSquare className="w-5 h-5 text-blue-600" />
                                            ) : (
                                                <Square className="w-5 h-5 text-gray-400" />
                                            )}
                                        </button>

                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h4 className="font-medium text-gray-800">
                                                    {getTypeName(reservation.re_type)} 예약
                                                </h4>
                                                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(reservation.re_status)}`}>
                                                    {getStatusText(reservation.re_status)}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                                                <div>
                                                    <strong>고객:</strong> {reservation.users?.name || 'N/A'}
                                                </div>
                                                <div>
                                                    <strong>견적:</strong> {reservation.quote?.title || 'N/A'}
                                                </div>
                                                <div>
                                                    <strong>예약일:</strong> {new Date(reservation.re_created_at).toLocaleDateString('ko-KR')}
                                                </div>
                                                <div>
                                                    <strong>이메일:</strong> {reservation.users?.email || 'N/A'}
                                                </div>
                                                <div>
                                                    <strong>전화:</strong> {reservation.users?.phone || 'N/A'}
                                                </div>
                                                <div>
                                                    <strong>ID:</strong> {reservation.re_id.slice(0, 8)}...
                                                </div>
                                            </div>
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
