// 실제 데이터베이스 연결 테스트
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testRealData() {
  console.log('🔍 실제 데이터베이스 연결 테스트 시작...');
  console.log('🌐 URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('🔑 Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '설정됨' : '설정안됨');
  
  try {
    // 견적 데이터 조회
    const { data: quotes, error: quotesError } = await supabase
      .from('quote')
      .select('id, status, total_price, created_at, title, description')
      .limit(10);
    
    console.log('\n📋 견적 테이블 결과:');
    console.log('데이터 수:', quotes?.length || 0);
    console.log('오류:', quotesError?.message || '없음');
    if (quotes && quotes.length > 0) {
      console.log('샘플 데이터:', quotes[0]);
    }

    // 사용자 데이터 조회
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, role, created_at')
      .limit(10);
    
    console.log('\n👥 사용자 테이블 결과:');
    console.log('데이터 수:', users?.length || 0);
    console.log('오류:', usersError?.message || '없음');
    if (users && users.length > 0) {
      console.log('샘플 데이터:', users[0]);
    }

    // 크루즈 정보 조회
    const { data: cruises, error: cruisesError } = await supabase
      .from('cruise_info')
      .select('*')
      .limit(5);
    
    console.log('\n🚢 크루즈 정보 테이블 결과:');
    console.log('데이터 수:', cruises?.length || 0);
    console.log('오류:', cruisesError?.message || '없음');

    // 객실 정보 조회
    const { data: rooms, error: roomsError } = await supabase
      .from('room_info')
      .select('*')
      .limit(5);
    
    console.log('\n🏨 객실 정보 테이블 결과:');
    console.log('데이터 수:', rooms?.length || 0);
    console.log('오류:', roomsError?.message || '없음');

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }
}

testRealData();
