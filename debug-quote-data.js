const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkData() {
  console.log('=== 견적 및 견적 아이템 데이터 확인 ===');
  
  try {
    // 견적 목록 확인
    const { data: quotes, error: quotesError } = await supabase
      .from('quote')
      .select('*')
      .limit(5);
    
    if (quotesError) {
      console.error('❌ 견적 조회 실패:', quotesError);
      return;
    }
    
    console.log('📋 견적 데이터 (최근 5개):', quotes?.length || 0, '건');
    if (quotes && quotes.length > 0) {
      quotes.forEach((quote, index) => {
        console.log(`  ${index + 1}. ID: ${quote.id}, 상태: ${quote.status}, 총액: ${quote.total_price}`);
      });
    }
    
    if (quotes && quotes.length > 0) {
      const quoteId = quotes[0].id;
      console.log(`\n=== 견적 ID ${quoteId}의 상세 정보 ===`);
      
      // quote_item 확인
      const { data: items, error: itemsError } = await supabase
        .from('quote_item')
        .select('*')
        .eq('quote_id', quoteId);
      
      if (itemsError) {
        console.error('❌ quote_item 조회 실패:', itemsError);
        return;
      }
      
      console.log('📋 Quote Items:', items?.length || 0, '건');
      
      if (items && items.length > 0) {
        for (const item of items) {
          console.log(`\n🔍 서비스 타입: ${item.service_type} | ref_id: ${item.service_ref_id}`);
          console.log(`   수량: ${item.quantity}, 단가: ${item.unit_price}, 총액: ${item.total_price}`);
          
          // 각 서비스별 데이터 확인
          if (item.service_type === 'room') {
            const { data: roomData, error: roomError } = await supabase
              .from('room')
              .select('*')
              .eq('id', item.service_ref_id);
            
            if (roomError) {
              console.log('   ❌ 객실 데이터 조회 실패:', roomError.message);
            } else {
              console.log('   ✅ 객실 데이터:', roomData);
              if (roomData && roomData[0]) {
                const { data: priceData } = await supabase
                  .from('room_price')
                  .select('*')
                  .eq('room_code', roomData[0].room_code);
                console.log('   💰 객실 가격 데이터:', priceData?.length || 0, '건');
              }
            }
          } else if (item.service_type === 'car') {
            const { data: carData, error: carError } = await supabase
              .from('car')
              .select('*')
              .eq('id', item.service_ref_id);
            
            if (carError) {
              console.log('   ❌ 차량 데이터 조회 실패:', carError.message);
            } else {
              console.log('   ✅ 차량 데이터:', carData);
              if (carData && carData[0]) {
                const { data: priceData } = await supabase
                  .from('car_price')
                  .select('*')
                  .eq('car_code', carData[0].car_code);
                console.log('   💰 차량 가격 데이터:', priceData?.length || 0, '건');
              }
            }
          } else if (item.service_type === 'airport') {
            const { data: airportData, error: airportError } = await supabase
              .from('airport')
              .select('*')
              .eq('id', item.service_ref_id);
            
            if (airportError) {
              console.log('   ❌ 공항 데이터 조회 실패:', airportError.message);
            } else {
              console.log('   ✅ 공항 데이터:', airportData);
              if (airportData && airportData[0]) {
                const { data: priceData } = await supabase
                  .from('airport_price')
                  .select('*')
                  .eq('airport_code', airportData[0].airport_code);
                console.log('   💰 공항 가격 데이터:', priceData?.length || 0, '건');
              }
            }
          }
        }
      } else {
        console.log('❌ quote_item이 비어있습니다!');
      }
    } else {
      console.log('❌ 견적 데이터가 없습니다!');
    }
  } catch (error) {
    console.error('❌ 전체 오류:', error);
  }
}

checkData();
