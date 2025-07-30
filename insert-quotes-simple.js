// 실제 데이터베이스에 테스트 견적 데이터 삽입
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function insertTestQuotes() {
  console.log('📝 실제 데이터베이스에 테스트 견적 데이터 삽입 시작...');
  
  try {
    // 기본 사용자 ID (UUID 형식)
    const defaultUserId = '550e8400-e29b-41d4-a716-446655440000';
    
    // 먼저 기본 사용자 생성 시도
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: defaultUserId,
        email: 'admin@cruise.com',
        name: '시스템 관리자'
      })
      .select();
    
    if (insertError) {
      console.log('⚠️ 기본 사용자 생성 실패 (이미 존재할 수 있음)');
    } else {
      console.log('✅ 기본 사용자 생성 완료:', newUser[0]);
    }
    
    // 테스트 견적 데이터 생성
    const testQuotes = [
      {
        user_id: defaultUserId,
        title: '하롱베이 크루즈 3박4일 가족여행',
        description: '부모님 2명 + 자녀 2명 가족 여행을 위한 하롱베이 크루즈 견적 요청. VIP룸 희망, 식사 포함.',
        status: 'pending',
        total_price: 1850000
      },
      {
        user_id: defaultUserId,
        title: '코타키나발루 휴양 5박6일 신혼여행',
        description: '신혼여행을 위한 코타키나발루 리조트 패키지. 허니문 스위트룸, 커플 스파 포함.',
        status: 'approved',
        total_price: 3200000
      },
      {
        user_id: defaultUserId,
        title: '제주도 크루즈 2박3일 커플여행',
        description: '연인과 함께하는 제주도 크루즈 여행. 발코니 객실, 저녁 만찬 코스 포함.',
        status: 'rejected',
        total_price: 980000
      }
    ];

    // 견적 데이터 삽입
    const { data, error } = await supabase
      .from('quote')
      .insert(testQuotes)
      .select();

    if (error) {
      console.error('❌ 견적 삽입 실패:', error);
      return;
    }

    console.log('✅ 견적 데이터 삽입 완료!');
    console.log('📊 삽입된 견적 수:', data.length);
    data.forEach((quote, index) => {
      console.log(`${index + 1}. ${quote.title} (${quote.status}) - ₩${quote.total_price.toLocaleString()}`);
    });

    // 전체 견적 확인
    const { data: allQuotes } = await supabase.from('quote').select('*');
    console.log('🔍 데이터베이스 전체 견적:', allQuotes?.length || 0, '건');

  } catch (error) {
    console.error('❌ 전체 오류:', error);
  }
}

insertTestQuotes().then(() => {
  console.log('🎯 견적 데이터 삽입 스크립트 완료');
  process.exit(0);
}).catch(error => {
  console.error('💥 스크립트 실행 실패:', error);
  process.exit(1);
});
