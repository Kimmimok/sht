// 서비스 테이블 확인 스크립트
const { createClient } = require('@supabase/supabase-js');

// Supabase 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkServiceTables() {
  console.log('🔍 서비스 테이블 확인 시작...\n');
  
  const serviceTables = [
    'quote_cruise',
    'quote_airport', 
    'quote_hotel',
    'quote_tour',
    'quote_car',
    'quote_room'
  ];
  
  for (const table of serviceTables) {
    try {
      console.log(`📊 ${table} 테이블 확인...`);
      
      // 테이블 구조 확인
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(5);
      
      if (error) {
        console.error(`❌ ${table} 테이블 오류:`, error.message);
      } else {
        console.log(`✅ ${table} 테이블 확인됨 - 데이터 ${data.length}개`);
        if (data.length > 0) {
          console.log(`   컬럼:`, Object.keys(data[0]).join(', '));
          console.log(`   샘플 데이터:`, data[0]);
        }
      }
    } catch (err) {
      console.error(`💥 ${table} 테이블 확인 중 예외:`, err.message);
    }
    console.log('');
  }
  
  // 견적 ID별 서비스 데이터 확인
  console.log('📋 견적별 서비스 데이터 확인...\n');
  
  try {
    const { data: quotes, error: quotesError } = await supabase
      .from('quote')
      .select('id, status, created_at')
      .limit(5);
    
    if (quotesError) {
      console.error('❌ 견적 조회 실패:', quotesError);
      return;
    }
    
    for (const quote of quotes) {
      console.log(`\n🎯 견적 ID: ${quote.id} (상태: ${quote.status})`);
      
      for (const table of serviceTables) {
        try {
          const { data: serviceData, error: serviceError } = await supabase
            .from(table)
            .select('*')
            .eq('quote_id', quote.id);
          
          if (!serviceError && serviceData) {
            console.log(`   ${table}: ${serviceData.length}개 데이터`);
          }
        } catch (err) {
          // 테이블이 없을 수 있으므로 무시
        }
      }
    }
    
  } catch (err) {
    console.error('💥 견적 데이터 확인 중 예외:', err.message);
  }
}

checkServiceTables();
