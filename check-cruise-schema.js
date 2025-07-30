const { createClient } = require('@supabase/supabase-js');

// Supabase 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-supabase-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCruiseSchema() {
  console.log('🔍 cruise 테이블 스키마 확인 중...\n');
  
  try {
    // 1. cruise 테이블 구조 확인
    const { data, error } = await supabase
      .from('cruise')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ cruise 테이블 조회 오류:', error.message);
      if (error.message.includes('relation "cruise" does not exist')) {
        console.log('\n📝 cruise 테이블이 존재하지 않습니다.');
        console.log('다음 SQL을 실행하여 테이블을 생성하세요:');
        console.log(`
-- cruise 테이블 생성
CREATE TABLE IF NOT EXISTS cruise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cruise_name VARCHAR(255) NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE NOT NULL,
  departure_port VARCHAR(100),
  room_type VARCHAR(50),
  adult_count INTEGER DEFAULT 0,
  child_count INTEGER DEFAULT 0,
  infant_count INTEGER DEFAULT 0,
  special_requests TEXT,
  base_price DECIMAL(10,2) DEFAULT 0,
  schedule_code TEXT,
  cruise_code TEXT,
  payment_code TEXT,
  discount_rate DECIMAL(5,2) DEFAULT 0,
  rooms_detail JSONB,
  vehicle_detail JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
        `);
        return;
      }
    }
    
    if (data && data.length > 0) {
      console.log('✅ cruise 테이블 존재 - 첫 번째 레코드 구조:');
      console.log(JSON.stringify(data[0], null, 2));
      
      // 컬럼 목록 출력
      const columns = Object.keys(data[0]);
      console.log('\n📋 사용 가능한 컬럼들:');
      columns.forEach(col => console.log(`  - ${col}`));
    } else {
      console.log('⚠️ cruise 테이블은 존재하지만 데이터가 없습니다.');
      
      // 빈 테이블에 대한 스키마 확인을 위해 INSERT 시도
      console.log('\n🧪 빈 테이블 스키마 테스트 중...');
      const testData = {
        cruise_name: 'TEST_CRUISE',
        departure_date: '2024-01-01',
        return_date: '2024-01-07',
        adult_count: 2,
        base_price: 0
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('cruise')
        .insert(testData)
        .select()
        .single();
        
      if (insertError) {
        console.error('❌ 테스트 INSERT 오류:', insertError.message);
        console.log('\n💡 누락된 컬럼이나 타입 불일치가 있을 수 있습니다.');
        
        if (insertError.message.includes('column') && insertError.message.includes('does not exist')) {
          console.log('\n📝 누락된 컬럼들을 추가하세요:');
          console.log(`
ALTER TABLE cruise ADD COLUMN IF NOT EXISTS schedule_code TEXT;
ALTER TABLE cruise ADD COLUMN IF NOT EXISTS cruise_code TEXT;
ALTER TABLE cruise ADD COLUMN IF NOT EXISTS payment_code TEXT;
ALTER TABLE cruise ADD COLUMN IF NOT EXISTS discount_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE cruise ADD COLUMN IF NOT EXISTS rooms_detail JSONB;
ALTER TABLE cruise ADD COLUMN IF NOT EXISTS vehicle_detail JSONB;
          `);
        }
      } else {
        console.log('✅ 테스트 INSERT 성공');
        console.log('📋 실제 컬럼 구조:');
        console.log(JSON.stringify(insertData, null, 2));
        
        // 테스트 데이터 삭제
        await supabase.from('cruise').delete().eq('id', insertData.id);
        console.log('🗑️ 테스트 데이터 삭제됨');
      }
    }
    
  } catch (error) {
    console.error('❌ 전체 오류:', error);
  }
}

checkCruiseSchema();
