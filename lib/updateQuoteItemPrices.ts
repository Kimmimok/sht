import supabase from './supabase';

/**
 * 견적의 모든 아이템에 대해 가격을 계산하고 업데이트하는 함수
 * @param quoteId - 견적 ID
 * @returns 성공 여부
 */
export async function updateQuoteItemPrices(quoteId: string): Promise<boolean> {
  try {
    console.log('💰 견적 가격 계산 시작:', quoteId);

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
      try {
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

          // room_price에서 가격 조회 (실제 컬럼 구조에 맞춤)
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

        } else if (item.service_type === 'airport') {
          // 공항 서비스 가격 계산
          const { data: airportData, error: airportError } = await supabase
            .from('airport')
            .select('airport_code, passenger_count')
            .eq('id', item.service_ref_id)
            .single();

          if (airportError || !airportData) {
            console.warn(`⚠️ airport 데이터 조회 실패 (id: ${item.service_ref_id})`);
            continue;
          }

          const { data: priceData, error: priceError } = await supabase
            .from('airport_price')
            .select('price')
            .eq('airport_code', airportData.airport_code)
            .limit(1);

          if (priceError || !priceData || priceData.length === 0) {
            console.warn(`⚠️ airport_price 조회 실패 (airport_code: ${airportData.airport_code})`);
            continue;
          }

          unitPrice = (priceData[0].price || 0) * (airportData.passenger_count || 1);
          console.log(`  💰 공항 가격: ${unitPrice}`);

        } else if (item.service_type === 'hotel') {
          // 호텔 가격 계산
          const { data: hotelData, error: hotelError } = await supabase
            .from('hotel')
            .select('hotel_code')
            .eq('id', item.service_ref_id)
            .single();

          if (hotelError || !hotelData) {
            console.warn(`⚠️ hotel 데이터 조회 실패 (id: ${item.service_ref_id})`);
            continue;
          }

          const { data: priceData, error: priceError } = await supabase
            .from('hotel_price')
            .select('price')
            .eq('hotel_code', hotelData.hotel_code)
            .limit(1);

          if (priceError || !priceData || priceData.length === 0) {
            console.warn(`⚠️ hotel_price 조회 실패 (hotel_code: ${hotelData.hotel_code})`);
            continue;
          }

          unitPrice = priceData[0].price || 0;
          console.log(`  💰 호텔 가격: ${unitPrice}`);

        } else if (item.service_type === 'rentcar') {
          // 렌트카 가격 계산
          const { data: rentcarData, error: rentcarError } = await supabase
            .from('rentcar')
            .select('rentcar_code')
            .eq('id', item.service_ref_id)
            .single();

          if (rentcarError || !rentcarData) {
            console.warn(`⚠️ rentcar 데이터 조회 실패 (id: ${item.service_ref_id})`);
            continue;
          }

          const { data: priceData, error: priceError } = await supabase
            .from('rent_price')
            .select('price')
            .eq('rent_code', rentcarData.rentcar_code)
            .limit(1);

          if (priceError || !priceData || priceData.length === 0) {
            console.warn(`⚠️ rent_price 조회 실패 (rent_code: ${rentcarData.rentcar_code})`);
            continue;
          }

          unitPrice = priceData[0].price || 0;
          console.log(`  💰 렌트카 가격: ${unitPrice}`);

        } else if (item.service_type === 'tour') {
          // 투어 가격 계산
          const { data: tourData, error: tourError } = await supabase
            .from('tour')
            .select('tour_code, participant_count')
            .eq('id', item.service_ref_id)
            .single();

          if (tourError || !tourData) {
            console.warn(`⚠️ tour 데이터 조회 실패 (id: ${item.service_ref_id})`);
            continue;
          }

          const { data: priceData, error: priceError } = await supabase
            .from('tour_price')
            .select('price')
            .eq('tour_code', tourData.tour_code)
            .limit(1);

          if (priceError || !priceData || priceData.length === 0) {
            console.warn(`⚠️ tour_price 조회 실패 (tour_code: ${tourData.tour_code})`);
            continue;
          }

          unitPrice = (priceData[0].price || 0) * (tourData.participant_count || 1);
          console.log(`  💰 투어 가격: ${unitPrice}`);

        } else {
          console.log(`  ⚠️ 지원하지 않는 서비스 타입: ${item.service_type}`);
          continue;
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

      } catch (itemError) {
        console.error(`❌ ${item.service_type} 가격 계산 중 오류:`, itemError);
        continue;
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

    console.log('✅ 가격 계산 완료. 총액:', totalQuotePrice.toLocaleString(), '원');
    return true;

  } catch (error) {
    console.error('❌ 가격 계산 중 전체 오류:', error);
    return false;
  }
}

export default updateQuoteItemPrices;
