// 데이터베이스 연결 테스트 및 테이블 확인 스크립트
// 매니저 시스템이 실제 DB에 연결되는지 확인

// dotenv 설정
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// 환경변수에서 Supabase 정보 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '설정됨' : '없음');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseConnection() {
  console.log('🔍 데이터베이스 연결 테스트 시작...\n');

  const tables = [
    'users',
    'quote', 
    'cruise_info',
    'schedule_info',
    'room_info',
    'car_info',
    'payment_info',
    'room_price_code',
    'car_price_code',
    'hotel_info',
    'tour_info'
  ];

  for (const table of tables) {
    try {
      console.log(`📋 ${table} 테이블 확인 중...`);
      
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: ${count || 0}개 레코드`);
        
        // 몇 개 샘플 데이터 조회
        if (count && count > 0) {
          const { data: sample } = await supabase
            .from(table)
            .select('*')
            .limit(3);
          console.log(`   샘플:`, sample?.map(item => Object.keys(item).slice(0, 3).join(', ')));
        }
      }
    } catch (err) {
      console.log(`❌ ${table}: 테이블 접근 실패 - ${err.message}`);
    }
    console.log('');
  }

  // 견적 데이터 특별 확인
  console.log('🎯 견적 데이터 상세 확인...');
  try {
    const { data: quotes, error: quoteError } = await supabase
      .from('quote')
      .select(`
        *,
        users:user_id(name, email)
      `)
      .limit(5);

    if (quoteError) {
      console.log('❌ 견적 조인 쿼리 실패:', quoteError.message);
    } else {
      console.log('✅ 견적 조인 쿼리 성공');
      console.log('📊 견적 데이터:', quotes?.map(q => ({
        id: q.id?.substring(0, 8),
        title: q.title,
        status: q.status,
        user: q.users?.name || q.users?.email
      })));
    }
  } catch (err) {
    console.log('❌ 견적 조인 테스트 실패:', err.message);
  }

  // 사용자 권한 확인
  console.log('\n👥 사용자 권한 확인...');
  try {
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, role, name')
      .limit(10);

    if (userError) {
      console.log('❌ 사용자 조회 실패:', userError.message);
    } else {
      console.log('✅ 사용자 조회 성공');
      console.log('👤 사용자 목록:');
      users?.forEach(user => {
        console.log(`   - ${user.email} (${user.role}) ${user.name || ''}`);
      });
    }
  } catch (err) {
    console.log('❌ 사용자 조회 실패:', err.message);
  }

  console.log('\n🏁 데이터베이스 연결 테스트 완료');
}

// Node.js에서 직접 실행할 수 있도록
if (require.main === module) {
  testDatabaseConnection().catch(console.error);
}

module.exports = { testDatabaseConnection };
