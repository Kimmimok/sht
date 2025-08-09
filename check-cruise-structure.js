const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jkhookaflhibrcafmlxn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpraG9va2FmbGhpYnJjYWZtbHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MzI4MzAsImV4cCI6MjA2NzQwODgzMH0.gyl-bSYT3VHSB-9T8yxMHrAIHaLg2KdbA2qCq6pMtWI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCruiseDataStructure() {
    console.log('🔍 크루즈 및 서비스 데이터 구조 분석...\n');

    try {
        // 1. reservation_cruise 테이블 샘플 데이터
        console.log('📋 reservation_cruise 테이블:');
        const { data: cruiseReservations, error: cruiseError } = await supabase
            .from('reservation_cruise')
            .select('*')
            .limit(2);

        if (cruiseError) {
            console.error('❌ reservation_cruise 조회 실패:', cruiseError.message);
        } else {
            console.log(`✅ ${cruiseReservations?.length || 0}개 레코드 발견`);
            if (cruiseReservations && cruiseReservations.length > 0) {
                console.log('샘플:', JSON.stringify(cruiseReservations[0], null, 2));
            }
        }

        // 2. room_price 테이블 - 객실 카테고리별 행 구조
        console.log('\n📋 room_price 테이블 - 카테고리별 가격 행:');
        const { data: roomPrices, error: roomPriceError } = await supabase
            .from('room_price')
            .select('room_code, cruise, room_type, schedule, room_category, price')
            .limit(10);

        if (roomPriceError) {
            console.error('❌ room_price 조회 실패:', roomPriceError.message);
        } else {
            console.log(`✅ ${roomPrices?.length || 0}개 가격 코드 발견`);
            roomPrices?.forEach((price, idx) => {
                console.log(`${idx + 1}. 코드: ${price.room_code} | 크루즈: ${price.cruise} | 타입: ${price.room_type} | 카테고리: ${price.room_category} | 가격: ${price.price}`);
            });
        }

        // 3. car_price 테이블 - 차량 서비스별 행 구조
        console.log('\n📋 car_price 테이블 - 차량 서비스별 가격 행:');
        const { data: carPrices, error: carPriceError } = await supabase
            .from('car_price')
            .select('car_code, cruise, car_type, car_category, price')
            .limit(5);

        if (carPriceError) {
            console.error('❌ car_price 조회 실패:', carPriceError.message);
        } else {
            console.log(`✅ ${carPrices?.length || 0}개 가격 코드 발견`);
            carPrices?.forEach((price, idx) => {
                console.log(`${idx + 1}. 코드: ${price.car_code} | 크루즈: ${price.cruise} | 타입: ${price.car_type} | 카테고리: ${price.car_category} | 가격: ${price.price}`);
            });
        }

        // 4. airport_price 테이블 - 공항 서비스별 행 구조
        console.log('\n📋 airport_price 테이블 - 공항 서비스별 가격 행:');
        const { data: airportPrices, error: airportPriceError } = await supabase
            .from('airport_price')
            .select('airport_code, airport_category, airport_route, airport_car_type, price')
            .limit(10);

        if (airportPriceError) {
            console.error('❌ airport_price 조회 실패:', airportPriceError.message);
        } else {
            console.log(`✅ ${airportPrices?.length || 0}개 가격 코드 발견`);
            airportPrices?.forEach((price, idx) => {
                console.log(`${idx + 1}. 코드: ${price.airport_code} | 카테고리: ${price.airport_category} | 경로: ${price.airport_route} | 차량: ${price.airport_car_type} | 가격: ${price.price}`);
            });
        }

        // 5. reservation_airport 테이블 구조 확인 
        console.log('\n📋 reservation_airport 테이블 구조:');
        const { data: airportReservations, error: airportResError } = await supabase
            .from('reservation_airport')
            .select('*')
            .limit(3);

        if (airportResError) {
            console.error('❌ reservation_airport 조회 실패:', airportResError.message);
        } else {
            console.log(`✅ ${airportReservations?.length || 0}개 예약 레코드 발견`);
            if (airportReservations && airportReservations.length > 0) {
                console.log('샘플:', JSON.stringify(airportReservations[0], null, 2));
            }
        }

        console.log('\n🔍 데이터 패턴 분석 결과:');
        console.log('1. 크루즈: reservation_cruise 테이블에 단일 행으로 저장');
        console.log('2. 객실: room_price 테이블에서 카테고리별로 여러 행 존재');
        console.log('3. 차량: car_price 테이블에서 타입별로 여러 행 존재');
        console.log('4. 공항: airport_price 테이블에서 카테고리별로 여러 행 존재');
        console.log('5. 모든 서비스는 *_price 테이블에서 코드별/카테고리별로 가격이 다름');

    } catch (error) {
        console.error('❌ 데이터 구조 분석 중 오류:', error);
    }
}

checkCruiseDataStructure();
