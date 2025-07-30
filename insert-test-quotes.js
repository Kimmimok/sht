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
    // 먼저 users 테이블에서 실제 사용자 ID 확인
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);
    
    console.log('📊 사용자 확인 결과:', users);
    
    if (usersError || !users || users.length === 0) {
      console.log('❌ 사용자 데이터가 없습니다. 기본 사용자 ID를 사용합니다.');
      // 기본 사용자 ID 사용 (UUID 형식)
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
        console.log('⚠️ 기본 사용자 생성 실패, 견적만 생성합니다.');
      } else {
        console.log('✅ 기본 사용자 생성 완료:', newUser[0]);
      }
      
      const userId = defaultUserId;
      console.log('✅ 사용자 ID 설정:', userId);
      
      // 견적 데이터 삽입 시도
      await insertQuotesWithUserId(userId);
      return;
    }
    
    const userId = users[0].id;
    console.log('✅ 기존 사용자 ID 확인:', userId);
    
    // 견적 데이터 삽입
    await insertQuotesWithUserId(userId);
  } catch (error) {
    console.error('❌ 전체 오류:', error);
  }
}

async function insertQuotesWithUserId(userId) {
    console.log('💫 견적 데이터 삽입 시작, 사용자 ID:', userId);
    
    // 테스트 견적 데이터 생성 (updated_at 제거)
    const testQuotes = [
      {
        user_id: userId,
        title: '하롱베이 크루즈 3박4일 가족여행',
        description: '부모님 2명 + 자녀 2명 가족 여행을 위한 하롱베이 크루즈 견적 요청. VIP룸 희망, 식사 포함.',
        status: 'pending',
        total_price: 1850000
      },
      {
        user_id: userId,
        title: '코타키나발루 휴양 5박6일 신혼여행',
        description: '신혼여행을 위한 코타키나발루 리조트 패키지. 허니문 스위트룸, 커플 스파 포함.',
        status: 'approved',
        total_price: 3200000
      },
      {
        user_id: userId,
        title: '제주도 크루즈 2박3일 커플여행',
        description: '연인과 함께하는 제주도 크루즈 여행. 발코니 객실, 저녁 만찬 코스 포함.',
        status: 'rejected',
        total_price: 980000
      }
    ];

    try {
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
    } catch (error) {
      console.error('❌ 견적 삽입 중 오류:', error);
    }
        description: '연인과 함께하는 제주도 크루즈 여행. 발코니 객실, 저녁 만찬 코스 포함.',
        status: 'confirmed',
        total_price: 1280000,
        created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2일 전
        updated_at: new Date(Date.now() - 44 * 60 * 60 * 1000).toISOString()
      }
    ];

    // 데이터 삽입
    const { data: insertedQuotes, error: insertError } = await supabase
      .from('quote')
      .insert(testQuotes)
      .select();

    if (insertError) {
      console.error('❌ 견적 데이터 삽입 실패:', insertError);
      return;
    }

    console.log('✅ 테스트 견적 데이터 삽입 성공:', insertedQuotes.length, '건');
    console.log('📋 삽입된 견적 데이터:', insertedQuotes);

    // 삽입 후 확인
    const { data: allQuotes, error: selectError } = await supabase
      .from('quote')
      .select('*');
    
    console.log('🔍 전체 견적 데이터 확인:', allQuotes?.length || 0, '건');

  } catch (error) {
    console.error('❌ 전체 프로세스 실패:', error);
  }
}

insertTestQuotes();
