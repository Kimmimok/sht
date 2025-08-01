// updateQuoteItemPrices 함수 테스트
require('dotenv').config({ path: '.env.local' });

// updateQuoteItemPrices 함수 import (Node.js에서 TypeScript import 처리)
async function importUpdateFunction() {
  try {
    // TypeScript 파일을 동적으로 import
    const { updateQuoteItemPrices } = await import('./lib/updateQuoteItemPrices.ts');
    return updateQuoteItemPrices;
  } catch (error) {
    console.error('❌ updateQuoteItemPrices 함수 import 실패:', error.message);
    console.log('💡 TypeScript 파일을 직접 실행할 수 없습니다.');
    console.log('💡 대신 JavaScript 버전을 만들어서 테스트하겠습니다.');
    
    // JavaScript 버전으로 함수 재정의
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    return async function updateQuoteItemPrices(quoteId) {
      console.log('💰 견적 가격 계산 시작:', quoteId);

      try {
        // quote_item 조회
        const { data: quoteItems, error: itemsError } = await supabase
          .from('quote_item')
          .select('*')
          .eq('quote_id', quoteId);

        if (itemsError) {
          console.error('❌ quote_item 조회 실패:', itemsError);
          return false;
        }

        if (!quoteItems || quoteItems.length === 0) {
          console.warn('⚠️ quote_item이 비어있습니다.');
          return false;
        }

        console.log(`📋 처리할 아이템 수: ${quoteItems.length}`);

        let totalQuotePrice = 0;

        // 각 아이템별로 가격 계산
        for (const item of quoteItems) {
          console.log(`🔍 처리 중: ${item.service_type} (ref_id: ${item.service_ref_id})`);
          
          let unitPrice = 0;

          if (item.service_type === 'room') {
            // 객실 가격 계산
            const { data: roomData, error: roomError } = await supabase
              .from('room')
              .select('room_code, adult_count, child_count')
              .eq('id', item.service_ref_id)
              .single();

            if (roomError || !roomData) {
              console.warn(`⚠️ room 데이터 조회 실패 (id: ${item.service_ref_id})`);
              continue;
            }

            const { data: priceData, error: priceError } = await supabase
              .from('room_price')
              .select('price')
              .eq('room_code', roomData.room_code)
              .limit(1);

            if (priceError || !priceData || priceData.length === 0) {
              console.warn(`⚠️ room_price 조회 실패 (room_code: ${roomData.room_code})`);
              continue;
            }

            unitPrice = (priceData[0].price || 0) * (roomData.adult_count || 1);
            console.log(`  💰 객실 가격: ${unitPrice}`);

          } else if (item.service_type === 'car') {
            // 차량 가격 계산
            const { data: carData, error: carError } = await supabase
              .from('car')
              .select('car_code, car_count')
              .eq('id', item.service_ref_id)
              .single();

            if (carError || !carData) {
              console.warn(`⚠️ car 데이터 조회 실패 (id: ${item.service_ref_id})`);
              continue;
            }

            const { data: priceData, error: priceError } = await supabase
              .from('car_price')
              .select('price')
              .eq('car_code', carData.car_code)
              .limit(1);

            if (priceError || !priceData || priceData.length === 0) {
              console.warn(`⚠️ car_price 조회 실패 (car_code: ${carData.car_code})`);
              continue;
            }

            unitPrice = (priceData[0].price || 0) * (carData.car_count || 1);
            console.log(`  💰 차량 가격: ${unitPrice}`);
          }

          const totalPrice = unitPrice * (item.quantity || 1);
          totalQuotePrice += totalPrice;

          // quote_item 업데이트
          const { error: updateError } = await supabase
            .from('quote_item')
            .update({
              unit_price: unitPrice,
              total_price: totalPrice,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id);

          if (updateError) {
            console.error(`❌ quote_item 업데이트 실패 (id: ${item.id}):`, updateError);
          } else {
            console.log(`  ✅ 업데이트 완료: ${unitPrice} x ${item.quantity} = ${totalPrice}`);
          }
        }

        // 견적 총액 업데이트
        const { error: quoteUpdateError } = await supabase
          .from('quote')
          .update({
            total_price: totalQuotePrice,
            updated_at: new Date().toISOString()
          })
          .eq('id', quoteId);

        if (quoteUpdateError) {
          console.error('❌ 견적 총액 업데이트 실패:', quoteUpdateError);
          return false;
        }

        console.log('✅ 가격 계산 완료. 총액:', totalQuotePrice.toLocaleString(), '동');
        return true;

      } catch (error) {
        console.error('❌ 가격 계산 중 전체 오류:', error);
        return false;
      }
    };
  }
}

async function testPriceCalculation() {
  console.log('🧪 updateQuoteItemPrices 함수 테스트\n');

  try {
    const updateQuoteItemPrices = await importUpdateFunction();
    
    // 테스트할 견적 ID (기존 견적 사용)
    const testQuoteIds = [
      'dc9b728f-8a8e-43e9-9a90-8d2d885b18ae',
      '8895a2d4-0cd9-4ffa-8b12-a9fb4fad7851',
      'f1dd5187-2fad-4a19-a3c5-2955347b2a33'
    ];

    for (const quoteId of testQuoteIds) {
      console.log(`\n🎯 견적 ${quoteId.substring(0, 8)}... 테스트:`);
      const result = await updateQuoteItemPrices(quoteId);
      
      if (result) {
        console.log(`✅ 견적 ${quoteId.substring(0, 8)}... 가격 계산 성공`);
      } else {
        console.log(`❌ 견적 ${quoteId.substring(0, 8)}... 가격 계산 실패 (데이터 부족)`);
      }
    }

    console.log('\n🏁 테스트 완료');

  } catch (error) {
    console.error('❌ 테스트 중 오류:', error);
  }
}

testPriceCalculation();

