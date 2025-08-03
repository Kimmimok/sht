const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkDatabaseStructure() {
  try {
    console.log('📋 데이터베이스 테이블 구조 확인 중...\n');
    
    // 주요 테이블들 확인
    const tables = ['quote', 'quote_item', 'reservation', 'users', 'cruise', 'airport', 'hotel', 'tour', 'rentcar'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          console.log(`❌ ${table} 테이블: ${error.message}`);
        } else {
          console.log(`✅ ${table} 테이블: 존재함`);
          if (data && data.length > 0) {
            console.log(`   컬럼: ${Object.keys(data[0]).join(', ')}`);
          }
        }
      } catch (err) {
        console.log(`❌ ${table} 테이블 확인 실패: ${err.message}`);
      }
      console.log('');
    }

    // quote 테이블 상세 확인
    console.log('🔍 quote 테이블 상세 확인...');
    const { data: quoteData } = await supabase.from('quote').select('*').limit(3);
    if (quoteData && quoteData.length > 0) {
      console.log('quote 샘플 데이터:', JSON.stringify(quoteData, null, 2));
    }

    // quote_item 테이블 상세 확인
    console.log('\n🔍 quote_item 테이블 상세 확인...');
    const { data: itemData } = await supabase.from('quote_item').select('*').limit(3);
    if (itemData && itemData.length > 0) {
      console.log('quote_item 샘플 데이터:', JSON.stringify(itemData, null, 2));
    }

    // reservation 테이블 확인
    console.log('\n🔍 reservation 테이블 상세 확인...');
    const { data: reservationData } = await supabase.from('reservation').select('*').limit(3);
    if (reservationData && reservationData.length > 0) {
      console.log('reservation 샘플 데이터:', JSON.stringify(reservationData, null, 2));
    }

  } catch (error) {
    console.error('데이터베이스 확인 오류:', error);
  }
}

checkDatabaseStructure();
