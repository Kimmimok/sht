// 기존 데이터를 이용한 가격 계산 테스트
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPriceCalculation() {
  console.log('🔍 기존 견적 데이터 확인...\n');

  try {
    // 1. 견적 목록 조회
    const { data: quotes, error: quotesError } = await supabase
      .from('quote')
      .select('id, status, title, total_price')
      .limit(5);

    if (quotesError) {
      console.error('❌ 견적 조회 실패:', quotesError);
      return;
    }

    if (!quotes || quotes.length === 0) {
      console.log('📝 견적이 없습니다.');
      return;
    }

    console.log('📋 기존 견적 목록:');
    quotes.forEach((quote, index) => {
      console.log(`  ${index + 1}. ${quote.id.substring(0, 8)}... (${quote.status}) - ${quote.title || '제목 없음'} - ${quote.total_price || 0}동`);
    });

    // 2. 첫 번째 견적의 아이템 확인
    const firstQuote = quotes[0];
    const { data: quoteItems, error: itemsError } = await supabase
      .from('quote_item')
      .select('*')
      .eq('quote_id', firstQuote.id);

    console.log(`\n🔍 견적 ${firstQuote.id.substring(0, 8)}... 의 아이템 확인:`);
    
    if (itemsError) {
      console.error('❌ quote_item 조회 실패:', itemsError);
      return;
    }

    if (!quoteItems || quoteItems.length === 0) {
      console.log('📝 quote_item이 없습니다.');
      console.log('💡 가격 계산을 테스트하려면 quote_item 데이터가 필요합니다.');
      return;
    }

    console.log(`📦 총 ${quoteItems.length}개 아이템:`);
    quoteItems.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.service_type} (ref_id: ${item.service_ref_id}) - 수량: ${item.quantity}, 단가: ${item.unit_price || 0}, 총액: ${item.total_price || 0}`);
    });

    // 3. 각 서비스별 데이터 확인
    console.log('\n🔍 서비스별 데이터 확인:');
    
    for (const item of quoteItems) {
      console.log(`\n📋 ${item.service_type} 서비스 (ref_id: ${item.service_ref_id})`);
      
      try {
        if (item.service_type === 'room') {
          const { data: roomData, error: roomError } = await supabase
            .from('room')
            .select('*')
            .eq('id', item.service_ref_id)
            .single();

          if (roomError || !roomData) {
            console.log(`  ❌ room 데이터 없음`);
          } else {
            console.log(`  ✅ room: ${roomData.room_code}, 성인: ${roomData.adult_count}, 아동: ${roomData.child_count}`);
            
            // 가격 데이터 확인
            const { data: priceData, error: priceError } = await supabase
              .from('room_price')
              .select('*')
              .eq('room_code', roomData.room_code)
              .limit(1);

            if (priceError || !priceData || priceData.length === 0) {
              console.log(`  ❌ room_price 데이터 없음`);
            } else {
              console.log(`  💰 가격: ${priceData[0].price}동`);
            }
          }
          
        } else if (item.service_type === 'car') {
          const { data: carData, error: carError } = await supabase
            .from('car')
            .select('*')
            .eq('id', item.service_ref_id)
            .single();

          if (carError || !carData) {
            console.log(`  ❌ car 데이터 없음`);
          } else {
            console.log(`  ✅ car: ${carData.car_code}, 수량: ${carData.car_count}`);
            
            // 가격 데이터 확인
            const { data: priceData, error: priceError } = await supabase
              .from('car_price')
              .select('*')
              .eq('car_code', carData.car_code)
              .limit(1);

            if (priceError || !priceData || priceData.length === 0) {
              console.log(`  ❌ car_price 데이터 없음`);
            } else {
              console.log(`  💰 가격: ${priceData[0].price}동`);
            }
          }
        }
      } catch (serviceError) {
        console.log(`  ❌ ${item.service_type} 조회 중 오류:`, serviceError.message);
      }
    }

    console.log('\n💰 가격 계산 함수를 테스트하려면:');
    console.log('1. 적절한 서비스 데이터와 가격 데이터가 있는지 확인');
    console.log('2. updateQuoteItemPrices() 함수 호출');
    console.log(`   예: updateQuoteItemPrices('${firstQuote.id}')`);

  } catch (error) {
    console.error('❌ 테스트 중 오류:', error);
  }
}

testPriceCalculation();

