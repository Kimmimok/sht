'use client';
import React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { upsertUserProfile } from '@/lib/userUtils';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        alert('❌ 로그인 실패: ' + error.message);
        setLoading(false);
        return;
      }

      // ✅ 로그인 후 세션 재확인
      const { data: { user } } = await supabase.auth.getUser();
      console.log('✅ 로그인된 유저:', user);

      if (user) {
        // 사용자 프로필 자동 생성/업데이트 (guest 역할로)
        await upsertUserProfile(user.id, user.email || '', {
          role: 'guest'
        });
      }

      alert('✅ 로그인 성공!');
      router.push('/'); // 홈 메뉴 페이지로 이동
      router.refresh(); // 세션 반영

    } catch (error) {
      console.error('로그인 처리 오류:', error);
      alert('로그인 처리 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const getDashboardPath = (role: string | null) => {
    switch (role) {
      case 'member': return '/customer/dashboard';
      case 'manager': return '/manager/dashboard';
      case 'admin': return '/admin/dashboard';
      default: return '/user/dashboard';
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-16 p-4 bg-white shadow rounded">
      <h2 className="text-2xl font-bold mb-6 text-center">🔐 로그인</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          placeholder="이메일"
          className="w-full border p-2 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <p className="text-sm text-gray-500 mt-1">
          견적 신청시 입력하신 이메일과 비밀번호를 입력해주세요.
        </p>
        <input
          type="password"
          placeholder="비밀번호"
          className="w-full border p-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <p className="text-sm text-gray-500 mt-1">비밀번호는 6자 이상 입력해주세요.</p>
        <button
          type="submit"
          className="bg-blue-500 text-white w-full py-2 rounded hover:bg-blue-600 transition disabled:opacity-50"
          disabled={loading}
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  );
}
