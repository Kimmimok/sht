'use client';
import React from 'react';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';

interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
  last_sign_in_at?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUsers = async () => {
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

        if (userInfo?.role !== 'admin') {
          alert('관리자 권한이 필요합니다.');
          router.push('/');
          return;
        }

        // 모든 사용자 조회
        const { data: usersData, error } = await supabase
          .from('users')
          .select('id, email, role, created_at, last_sign_in_at')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('사용자 데이터 조회 실패:', error);
          alert('사용자 데이터를 불러올 수 없습니다.');
          return;
        }

        setUsers(usersData || []);
        setFilteredUsers(usersData || []);
      } catch (error) {
        console.error('사용자 조회 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [router]);

  useEffect(() => {
    let filtered = users;

    // 역할 필터링
    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter((user) =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  }, [users, roleFilter, searchTerm]);

  const updateUserRole = async (userId: string, newRole: string) => {
    if (!confirm(`사용자의 역할을 ${newRole}로 변경하시겠습니까?`)) return;

    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);

    if (error) {
      alert('역할 업데이트 실패: ' + error.message);
      return;
    }

    // 로컬 상태 업데이트
    setUsers((prev) =>
      prev.map((user) => (user.id === userId ? { ...user, role: newRole } : user))
    );

    alert('사용자 역할이 업데이트되었습니다.');
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('정말로 이 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

    const { error } = await supabase.from('users').delete().eq('id', userId);

    if (error) {
      alert('사용자 삭제 실패: ' + error.message);
      return;
    }

    setUsers((prev) => prev.filter((user) => user.id !== userId));
    alert('사용자가 삭제되었습니다.');
  };

  if (isLoading) {
    return (
      <AdminLayout title="사용자 관리" activeTab="users">
        <div className="text-center py-12">
          <div className="text-4xl mb-4">👥</div>
          <p>사용자 데이터 로딩 중...</p>
        </div>
      </AdminLayout>
    );
  }

  const roleCounts = {
    all: users.length,
    user: users.filter((u) => u.role === 'user').length,
    admin: users.filter((u) => u.role === 'admin').length,
  };

  return (
    <AdminLayout title="사용자 관리" activeTab="users">
      <div className="space-y-6">
        {/* 통계 요약 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">{roleCounts.all}</div>
            <div className="text-sm text-gray-600">전체 사용자</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">{roleCounts.user}</div>
            <div className="text-sm text-gray-600">일반 사용자</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-red-600">{roleCounts.admin}</div>
            <div className="text-sm text-gray-600">관리자</div>
          </div>
        </div>

        {/* 필터 및 검색 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="이메일로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="all">모든 역할</option>
                <option value="user">일반 사용자</option>
                <option value="admin">관리자</option>
              </select>
            </div>
          </div>
        </div>

        {/* 사용자 목록 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      사용자 정보
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      역할
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      가입일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      최근 로그인
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.email}</div>
                          <div className="text-sm text-gray-500">{user.id.substring(0, 8)}...</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={user.role}
                          onChange={(e) => updateUserRole(user.id, e.target.value)}
                          className={`px-2 py-1 text-xs rounded ${
                            user.role === 'admin'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          <option value="user">사용자</option>
                          <option value="admin">관리자</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.last_sign_in_at
                            ? new Date(user.last_sign_in_at).toLocaleDateString()
                            : '없음'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => deleteUser(user.id)}
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
              <div className="text-4xl mb-4">👥</div>
              <p className="text-gray-500">조건에 맞는 사용자가 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
