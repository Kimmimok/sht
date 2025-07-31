'use client';
import React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import { upsertUserProfile } from '@/lib/userUtils';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: '',
    password: '',
    displayName: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Supabase Auth 회원가입
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            display_name: form.displayName,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      // 2. users 테이블에 기본 정보 저장 (프로젝트 패턴 준수)
      if (authData.user) {
        const result = await upsertUserProfile(authData.user.id, form.email, {
          name: form.displayName,
          role: 'guest'  // 기본 게스트 역할 (견적만 가능)
        });

        if (!result.success) {
          console.error('⚠️ users 테이블 저장 실패:', result.error);
          // Auth는 성공했지만 user 테이블 저장 실패 시에도 진행
        }
      }

      alert('회원가입이 완료되었습니다. 이메일 인증 후 로그인하세요.');
      router.push('/login');
    } catch (error: any) {
      console.error('회원가입 실패:', error);
      alert('회원가입 실패: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">회원가입</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="displayName"
          placeholder="닉네임을 입력하세요"
          value={form.displayName}
          onChange={handleChange}
          required
          className="w-full border rounded px-3 py-2"
        />
        <input
          type="email"
          name="email"
          placeholder="이메일을 입력하세요"
          value={form.email}
          onChange={handleChange}
          required
          className="w-full border rounded px-3 py-2"
        />
        <input
          type="password"
          name="password"
          placeholder="비밀번호는 6자리 이상 입력"
          value={form.password}
          onChange={handleChange}
          required
          minLength={6}
          className="w-full border rounded px-3 py-2"
        />
      
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? '가입 중...' : '회원가입'}
        </button>
      </form>
      
      <div className="text-center mt-4">
        <button
          onClick={() => router.push('/login')}
          className="text-blue-500 hover:text-blue-700"
        >
          이미 계정이 있으신가요? 로그인하기
        </button>
      </div>
      
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          💡 가입 후 견적 작성이 가능합니다. 예약 완료 시 정회원으로 승급됩니다.
        </p>
      </div>
    </div>
  );
}
