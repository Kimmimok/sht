// 전체 데이터베이스 구조와 샘플 데이터 조회
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jkhookaflhibrcafmlxn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpraG9va2FmbGhpYnJjYWZtbHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MzI4MzAsImV4cCI6MjA2NzQwODgzMH0.gyl-bSYT3VHSB-9T8yxMHrAIHaLg2KdbA2qCq6pMtWI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fullDBScan() {
  console.log('🔍 전체 데이터베이스 스캔...\n');

  // 발견된 테이블들의 전체 데이터 확인
  const foundTables = [
    'room_info', 'car_info', 'schedule_info', 'cruise_info', 'reservation'
  ];

  for (const table of foundTables) {
    console.log(`📊 ${table} 테이블 전체 데이터:`);
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(20); // 최대 20개만 조회

      if (!error && data) {
        data.forEach((row, idx) => {
          console.log(`   ${idx + 1}. ${JSON.stringify(row)}`);
        });
        console.log(`   총 ${data.length}개 레코드\n`);
      } else if (error) {
        console.log(`   ❌ 오류: ${error.message}\n`);
      }
    } catch (err) {
      console.log(`   ❌ 접근 실패: ${err.message}\n`);
    }
  }

  // 빈 테이블들의 구조 추정 (INSERT 시도로)
  console.log('🏗 빈 테이블 구조 추정...\n');
  
  const emptyTables = ['quote', 'quote_room', 'quote_car', 'users', 'room_price', 'car_price'];
  
  for (const table of emptyTables) {
    console.log(`📋 ${table} 테이블 구조 추정:`);
    try {
      // 빈 INSERT로 필수 컬럼 확인 시도 (실제로 삽입하지는 않음)
      const { error } = await supabase
        .from(table)
        .insert({}) // 빈 객체로 시도
        .select()
        .limit(0); // 실제로는 삽입하지 않음

      if (error) {
        // 오류 메시지에서 필수 컬럼 정보 추출
        const message = error.message;
        console.log(`   오류 메시지: ${message}`);
        
        if (message.includes('null value in column')) {
          const match = message.match(/null value in column "([^"]+)"/);
          if (match) {
            console.log(`   필수 컬럼: ${match[1]}`);
          }
        }
      }
    } catch (err) {
      console.log(`   스키마 추정 실패: ${err.message}`);
    }
    console.log('');
  }
}

fullDBScan().catch(console.error);
