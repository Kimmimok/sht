// 간단한 테스트 데이터 생성 스크립트
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// UUID 생성 함수
function generateUUID() {
  return crypto.randomUUID();
}

async function createTestData() {
  console.log('🔧 테스트 데이터 생성 시작...\n');

  try {
    // 1. 기존 사용자 확인
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(1);

    if (usersError) {
      console.error('❌ 사용자 조회 실패:', usersError);
      return;
    }

    if (!users || users.length === 0) {
      console.error('❌ 테스트를 위한 사용자가 없습니다.');
      return;
    }

    const testUser = users[0];
    console.log(`👤 테스트 사용자: ${testUser.email} (${testUser.role})`);

    // 2. 테스트 견적 생성
    const quoteId = generateUUID();
    
    const { data: quote, error: quoteError } = await supabase
      .from('quote')
      .insert({
        id: quoteId,
        user_id: testUser.id,
        status: 'draft',
        title: '테스트 견적',
        description: '가격 계산 테스트용 견적',
        total_price: 0
      })
      .select()
      .single();

    if (quoteError) {
      console.error('❌ 견적 생성 실패:', quoteError);
      return;
    }

    console.log(`✅ 견적 생성 성공: ${quote.id}`);

    // 3. 객실 서비스 생성
    const { data: room, error: roomError } = await supabase
      .from('room')
      .insert({
        room_code: 'TEST_ROOM_' + Date.now(),
        adult_count: 2,
        child_count: 1,
        extra_count: 0
      })
      .select()
      .single();

    if (roomError) {
      console.error('❌ 객실 생성 실패:', roomError);
      return;
    }

    console.log(`✅ 객실 생성 성공: ${room.room_code}`);

    // 4. quote_item에 객실 연결
    const { data: roomItem, error: roomItemError } = await supabase
      .from('quote_item')
      .insert({
        quote_id: quoteId,
        service_type: 'room',
        service_ref_id: room.id,
        quantity: 1,
        unit_price: 0,
        total_price: 0
      })
      .select()
      .single();

    if (roomItemError) {
      console.error('❌ 객실 quote_item 생성 실패:', roomItemError);
      return;
    }

    console.log(`✅ 객실 quote_item 생성 성공`);

    // 5. 차량 서비스 생성
    const { data: car, error: carError } = await supabase
      .from('car')
      .insert({
        car_code: 'TEST_CAR_' + Date.now(),
        car_count: 1
      })
      .select()
      .single();

    if (carError) {
      console.error('❌ 차량 생성 실패:', carError);
      return;
    }

    console.log(`✅ 차량 생성 성공: ${car.car_code}`);

    // 6. quote_item에 차량 연결
    const { data: carItem, error: carItemError } = await supabase
      .from('quote_item')
      .insert({
        quote_id: quoteId,
        service_type: 'car',
        service_ref_id: car.id,
        quantity: 1,
        unit_price: 0,
        total_price: 0
      })
      .select()
      .single();

    if (carItemError) {
      console.error('❌ 차량 quote_item 생성 실패:', carItemError);
      return;
    }

    console.log(`✅ 차량 quote_item 생성 성공`);

    // 7. 가격 데이터 생성 (room_price)
    const { data: roomPrice, error: roomPriceError } = await supabase
      .from('room_price')
      .insert({
        room_code: room.room_code,
        schedule: 'TEST_SCHEDULE',
        cruise: 'TEST_CRUISE',
        room_type: 'BALCONY',
        room_category: 'STANDARD',
        price: 500000
      })
      .select()
      .single();

    if (roomPriceError) {
      console.error('❌ 객실 가격 생성 실패:', roomPriceError);
    } else {
      console.log(`✅ 객실 가격 생성 성공: ${roomPrice.price}동`);
    }

    // 8. 가격 데이터 생성 (car_price)
    const { data: carPrice, error: carPriceError } = await supabase
      .from('car_price')
      .insert({
        car_code: car.car_code,
        schedule: 'TEST_SCHEDULE',
        cruise: 'TEST_CRUISE',
        car_type: 'VAN',
        car_category: 'STANDARD',
        price: 100000
      })
      .select()
      .single();

    if (carPriceError) {
      console.error('❌ 차량 가격 생성 실패:', carPriceError);
    } else {
      console.log(`✅ 차량 가격 생성 성공: ${carPrice.price}동`);
    }

    console.log('\n🎉 테스트 데이터 생성 완료!');
    console.log(`📋 생성된 견적 ID: ${quoteId}`);
    console.log(`🏠 객실 코드: ${room.room_code}`);
    console.log(`🚗 차량 코드: ${car.car_code}`);

    // 9. 가격 계산 함수 테스트 준비
    console.log('\n💰 가격 계산 함수 테스트 가능 상태입니다.');
    console.log('다음 명령어로 가격 계산을 테스트할 수 있습니다:');
    console.log(`updateQuoteItemPrices('${quoteId}')`);

  } catch (error) {
    console.error('❌ 테스트 데이터 생성 중 오류:', error);
  }
}

createTestData();

