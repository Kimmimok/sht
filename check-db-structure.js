const { createClient } = require('@supabase/supabase-js');

async function checkTables() {
  console.log('🔍 데이터베이스 테이블 구조 확인...');
  
  // Supabase 클라이언트 초기화
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // 1. 먼저 어떤 테이블들이 존재하는지 확인
  const tables = ['quote', 'quote_item', 'quote_room', 'quote_room_detail', 'rentcar', 'cruise', 'airport', 'hotel', 'tour'];
  
  console.log('\n📋 테이블 존재 여부 확인:');
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ [${table}] 테이블 없음 또는 오류: ${error.message}`);
      } else {
        console.log(`✅ [${table}] 테이블 존재`);
        if (data && data.length > 0) {
          console.log(`   필드: ${Object.keys(data[0]).join(', ')}`);
        } else {
          console.log(`   데이터 없음`);
        }
      }
    } catch (e) {
      console.log(`❌ [${table}] 접근 불가: ${e.message}`);
    }
  }
  
  // 2. quote_item 테이블 상세 확인
  try {
    console.log('\n📋 quote_item 테이블 데이터 샘플:');
    const { data: quoteItems, error } = await supabase
      .from('quote_item')
      .select('*')
      .limit(5);
    
    if (error) {
      console.log('❌ quote_item 조회 실패:', error.message);
    } else {
      console.log('quote_item 데이터:');
      console.log(JSON.stringify(quoteItems, null, 2));
    }
  } catch (e) {
    console.log('❌ quote_item 확인 오류:', e.message);
  }
  
  // 3. quote 테이블 샘플도 확인
  try {
    console.log('\n📋 quote 테이블 데이터 샘플:');
    const { data: quotes, error } = await supabase
      .from('quote')
      .select('*')
      .limit(2);
    
    if (error) {
      console.log('❌ quote 조회 실패:', error.message);
    } else {
      console.log('quote 데이터:');
      console.log(JSON.stringify(quotes, null, 2));
    }
  } catch (e) {
    console.log('❌ quote 확인 오류:', e.message);
  }
}

checkTables().catch(console.error);
