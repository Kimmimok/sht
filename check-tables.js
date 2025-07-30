// 데이터베이스 테이블 확인 스크립트
const { createClient } = require('@supabase/supabase-js');

// Supabase 설정 (실제 값으로 교체 필요)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('📋 데이터베이스 테이블 확인 시작...\n');
  
  const tables = ['quote', 'quote_item', 'cruise', 'airport', 'hotel', 'tour', 'rentcar'];
  
  for (const table of tables) {
    try {
      console.log(`🔍 ${table} 테이블 확인 중...`);
      
      // 테이블에서 데이터 조회 시도 (LIMIT 1)
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.error(`❌ ${table} 테이블 오류:`, error.message);
        console.error(`   상세:`, error);
      } else {
        console.log(`✅ ${table} 테이블 확인됨 (데이터 ${data.length}개)`);
      }
    } catch (err) {
      console.error(`💥 ${table} 테이블 확인 중 예외:`, err);
    }
    console.log('');
  }
  
  console.log('📋 테이블 확인 완료');
}

// 견적 생성 테스트
async function testQuoteCreation() {
  console.log('\n🧪 견적 생성 테스트 시작...\n');
  
  try {
    // 테스트용 사용자 ID (실제 환경에서는 인증된 사용자 ID 사용)
    const testUserId = '00000000-0000-0000-0000-000000000000';
    
    console.log('1. 견적 생성 테스트...');
    const { data: quote, error: quoteError } = await supabase
      .from('quote')
      .insert({
        user_id: testUserId,
        title: '테스트 견적',
        status: 'draft'
      })
      .select()
      .single();
    
    if (quoteError) {
      console.error('❌ 견적 생성 실패:', quoteError);
      return;
    }
    
    console.log('✅ 견적 생성 성공:', quote.id);
    
    console.log('\n2. 공항 서비스 생성 테스트...');
    const { data: airport, error: airportError } = await supabase
      .from('airport')
      .insert({
        service_type: 'pickup',
        passenger_count: 2,
        pickup_location: '인천국제공항',
        dropoff_location: '호텔',
        base_price: 0
      })
      .select()
      .single();
    
    if (airportError) {
      console.error('❌ 공항 서비스 생성 실패:', airportError);
      return;
    }
    
    console.log('✅ 공항 서비스 생성 성공:', airport.id);
    
    console.log('\n3. 견적 아이템 생성 테스트...');
    const { data: quoteItem, error: itemError } = await supabase
      .from('quote_item')
      .insert({
        quote_id: quote.id,
        service_type: 'airport',
        service_ref_id: airport.id,
        quantity: 1,
        unit_price: 0,
        total_price: 0
      })
      .select()
      .single();
    
    if (itemError) {
      console.error('❌ 견적 아이템 생성 실패:', itemError);
      return;
    }
    
    console.log('✅ 견적 아이템 생성 성공:', quoteItem.id);
    
    // 정리
    console.log('\n4. 테스트 데이터 정리...');
    await supabase.from('quote_item').delete().eq('id', quoteItem.id);
    await supabase.from('airport').delete().eq('id', airport.id);
    await supabase.from('quote').delete().eq('id', quote.id);
    console.log('✅ 테스트 데이터 정리 완료');
    
  } catch (err) {
    console.error('💥 테스트 중 예외:', err);
  }
}

async function main() {
  await checkTables();
  await testQuoteCreation();
}

main().catch(console.error);
