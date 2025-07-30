// 테스트 사용자 생성
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function createTestUser() {
  console.log('👤 테스트 사용자 생성 중...');
  
  try {
    // 먼저 기존 사용자 확인
    const { data: existing } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'test@example.com');
    
    if (existing && existing.length > 0) {
      console.log('✅ 기존 사용자 확인:', existing[0]);
      return existing[0].id;
    }

    // 새 사용자 생성 (기본 컬럼만 사용)
    const { data, error } = await supabase
      .from('users')
      .insert({
        email: 'test@example.com',
        name: '테스트 사용자'
      })
      .select();
    
    if (error) {
      console.error('❌ 사용자 생성 실패:', error);
      return null;
    }
    
    console.log('✅ 사용자 생성 완료:', data[0]);
    return data[0].id;
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    return null;
  }
}

createTestUser().then(() => {
  console.log('🎯 사용자 생성 스크립트 완료');
  process.exit(0);
});
