// 사용자 스키마 확인
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSchema() {
  try {
    console.log('📋 users 테이블 스키마 확인 중...');
    const { data } = await supabase.from('users').select('*').limit(1);
    console.log('users 테이블 데이터:', data);
  } catch (error) {
    console.error('users 오류:', error);
  }
}

checkSchema();
