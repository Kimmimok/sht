// 더 정교한 데이터베이스 스키마 조회
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jkhookaflhibrcafmlxn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpraG9va2FmbGhpYnJjYWZtbHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MzI4MzAsImV4cCI6MjA2NzQwODgzMH0.gyl-bSYT3VHSB-9T8yxMHrAIHaLg2KdbA2qCq6pMtWI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function discoverDBStructure() {
  console.log('🔍 실제 데이터베이스 구조 탐색...\n');

  // 코드에서 사용되는 테이블명들을 다시 확인
  const possibleTables = [
    'quote', 'quote_room', 'quote_car',
    'room_info', 'car_info', 'users',
    // 가격 관련 테이블들 (다른 이름일 수 있음)
    'room_price', 'car_price',
    'room_price_code', 'car_price_code',
    'quote_room_detail',
    // 코드, 일정 관련
    'schedule_code', 'cruise_code', 'payment_code',
    'room_code', 'car_code',
    'schedule_info', 'cruise_info',
    // 예약 관련
    'reservation', 'reservation_room', 'reservation_car'
  ];

  console.log('📋 존재하는 테이블들:\n');

  for (const table of possibleTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (!error) {
        if (data && data.length > 0) {
          console.log(`✅ ${table}: ${Object.keys(data[0]).join(', ')}`);
        } else {
          console.log(`📭 ${table}: (빈 테이블, 구조 확인 필요)`);
        }
      }
    } catch (err) {
      // 조용히 넘어감 (테이블 없음)
    }
  }

  console.log('\n🏗 테이블별 상세 구조 확인:\n');

  // 주요 테이블들의 샘플 데이터로 관계 확인
  const mainTables = ['quote', 'quote_room', 'quote_car', 'room_info', 'car_info', 'users'];
  
  for (const table of mainTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (!error && data) {
        console.log(`📊 ${table}:`);
        if (data.length > 0) {
          const sample = data[0];
          Object.keys(sample).forEach(key => {
            const value = sample[key];
            const type = typeof value;
            console.log(`   ${key}: ${type} (${value})`);
          });
        } else {
          console.log('   (데이터 없음 - 빈 테이블)');
        }
        console.log('');
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}\n`);
    }
  }
}

discoverDBStructure().catch(console.error);
