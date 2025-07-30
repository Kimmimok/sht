'use client';
import React from 'react';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { useRouter } from 'next/navigation';

export default function SqlRunnerPage() {
  const [sqlQuery, setSqlQuery] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
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

      setIsAdmin(true);
    };

    checkAdmin();
  }, [router]);

  const testConnection = async () => {
    setLoading(true);
    setOutput('데이터베이스 연결 테스트 중...\n');

    try {
      const { data, error } = await supabase.from('users').select('count').limit(1);

      if (error) {
        setOutput((prev) => prev + `연결 실패: ${error.message}\n`);
      } else {
        setOutput((prev) => prev + '✅ 데이터베이스 연결 성공!\n');
      }
    } catch (error: any) {
      setOutput((prev) => prev + `연결 오류: ${error.message}\n`);
    } finally {
      setLoading(false);
    }
  };

  const showSecurityPoliciesSQL = () => {
    const policies = `-- RLS 보안 정책 설정
-- 다음 SQL을 Supabase 대시보드 > SQL Editor에서 실행하세요

-- 기존 정책 삭제
DROP POLICY IF EXISTS quote_user_policy ON quote;
DROP POLICY IF EXISTS quote_admin_policy ON quote;

-- quote 테이블 RLS 설정
ALTER TABLE quote ENABLE ROW LEVEL SECURITY;

CREATE POLICY quote_user_policy ON quote
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY quote_admin_policy ON quote
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );`;

    setOutput(policies);
  };

  const sampleQueries = [
    {
      name: '전체 견적 수 조회',
      query: 'SELECT COUNT(*) as total_quotes FROM quote;',
    },
    {
      name: '상태별 견적 통계',
      query: 'SELECT status, COUNT(*) as count FROM quote GROUP BY status;',
    },
    {
      name: '사용자 목록',
      query: 'SELECT email, role, created_at FROM users LIMIT 10;',
    },
  ];

  if (!isAdmin) {
    return (
      <AdminLayout title="데이터베이스 관리" activeTab="database">
        <div className="text-center py-12">
          <div className="text-4xl mb-4">⚠️</div>
          <p>권한 확인 중...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="데이터베이스 관리" activeTab="database">
      <div className="space-y-6">
        {/* 빠른 작업 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">빠른 작업</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={testConnection}
              disabled={loading}
              className="flex items-center justify-center px-4 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              🔌 연결 테스트
            </button>
            <button
              onClick={showSecurityPoliciesSQL}
              className="flex items-center justify-center px-4 py-3 bg-green-500 text-white rounded hover:bg-green-600"
            >
              🔒 보안 정책 SQL
            </button>
            <button
              onClick={() => window.open('https://app.supabase.io', '_blank')}
              className="flex items-center justify-center px-4 py-3 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              🔗 Supabase 대시보드
            </button>
          </div>
        </div>

        {/* 샘플 쿼리 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">샘플 쿼리</h3>
          <div className="grid grid-cols-1 gap-4">
            {sampleQueries.map((sample, index) => (
              <button
                key={index}
                onClick={() => setSqlQuery(sample.query)}
                className="p-3 text-left bg-gray-50 hover:bg-gray-100 rounded border"
              >
                <div className="font-medium text-gray-900">{sample.name}</div>
                <div className="text-sm text-gray-500 mt-1 font-mono">{sample.query}</div>
              </button>
            ))}
          </div>
        </div>

        {/* SQL 쿼리 실행 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">SQL 쿼리</h3>
          <div className="space-y-4">
            <textarea
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              placeholder="SELECT * FROM users LIMIT 10;"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
            />
            <p className="text-sm text-red-600">
              ⚠️ 보안상 이 도구에서는 SELECT 쿼리만 실행 가능합니다. 다른 SQL 명령은 Supabase
              대시보드에서 직접 실행하세요.
            </p>
          </div>
        </div>

        {/* 출력 결과 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">실행 결과</h3>
          <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-96 overflow-auto">
            <pre>{output || '결과가 여기에 표시됩니다...'}</pre>
          </div>
          <div className="mt-2 flex space-x-2">
            <button
              onClick={() => setOutput('')}
              className="text-sm px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              지우기
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(output)}
              className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              복사
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
