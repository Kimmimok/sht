// 데이터베이스 스키마 조회 스크립트
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jkhookaflhibrcafmlxn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpraG9va2FmbGhpYnJjYWZtbHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MzI4MzAsImV4cCI6MjA2NzQwODgzMH0.gyl-bSYT3VHSB-9T8yxMHrAIHaLg2KdbA2qCq6pMtWI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDBSchema() {
  console.log('📊 데이터베이스 스키마 조회 중...\n');

  // 주요 테이블들의 구조 확인
  const tables = [
    'quote', 
    'quote_room', 
    'quote_car', 
    'quote_room_detail',
    'room_price_code',
    'car_price_code',
    'room_info',
    'car_info',
    'users'
  ];

  for (const table of tables) {
    try {
      console.log(`🔍 ${table} 테이블:`);
      
      // 테이블 샘플 데이터 1개 조회 (구조 확인용)
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`   ❌ 오류: ${error.message}`);
      } else if (data && data.length > 0) {
        console.log(`   ✅ 컬럼: ${Object.keys(data[0]).join(', ')}`);
      } else {
        console.log(`   📭 데이터 없음 (테이블 존재함)`);
      }
    } catch (err) {
      console.log(`   ❌ 접근 불가: ${err.message}`);
    }
    console.log('');
  }

  // PostgreSQL 시스템 테이블로 스키마 정보 조회 시도
  console.log('📋 PostgreSQL 스키마 정보 조회 시도...\n');
  
  try {
    const { data: schemaData, error: schemaError } = await supabase
      .rpc('get_schema_info'); // 이 함수가 없을 수 있음
    
    if (schemaError) {
      console.log('❌ 스키마 함수 없음:', schemaError.message);
    }
  } catch (err) {
    console.log('❌ 스키마 조회 실패:', err.message);
  }
}

checkDBSchema().catch(console.error);
