// 크루즈 차량 이관 작업 - 데이터 분석 및 검증 스크립트
// Node.js 실행용 - Supabase 연결을 통한 안전한 분석

const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 설정 (실제 환경변수 사용 권장)
const supabaseUrl = 'https://jkhookaflhibrcafmlxn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpraG9va2FmbGhpYnJjYWZtbHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MzI4MzAsImV4cCI6MjA2NzQwODgzMH0.gyl-bSYT3VHSB-9T8yxMHrAIHaLg2KdbA2qCq6pMtWI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeCruiseVehicleData() {
    console.log('🚗 크루즈 차량 데이터 분석 시작...\n');

    try {
        // 1. 크루즈 차량 예약 전체 현황
        console.log('📊 1. 크루즈 차량 예약 전체 현황');
        const { data: cruiseCarStats, error: statsError } = await supabase
            .from('reservation_cruise_car')
            .select('*');

        if (statsError) {
            console.error('❌ 통계 조회 오류:', statsError);
            return;
        }

        const stats = {
            total: cruiseCarStats.length,
            withPriceCode: cruiseCarStats.filter(r => r.car_price_code).length,
            withCarCount: cruiseCarStats.filter(r => r.car_count > 0).length,
            withPassengerCount: cruiseCarStats.filter(r => r.passenger_count > 0).length,
            withPickupDate: cruiseCarStats.filter(r => r.pickup_datetime).length,
            withPickupLocation: cruiseCarStats.filter(r => r.pickup_location).length,
            withTotalPrice: cruiseCarStats.filter(r => r.car_total_price > 0).length,
            withRequestNote: cruiseCarStats.filter(r => r.request_note).length,
        };

        console.log(`   총 차량 예약 수: ${stats.total}`);
        console.log(`   가격 코드 있음: ${stats.withPriceCode}`);
        console.log(`   차량 수 설정: ${stats.withCarCount}`);
        console.log(`   승객 수 설정: ${stats.withPassengerCount}`);
        console.log(`   픽업 일시 설정: ${stats.withPickupDate}`);
        console.log(`   픽업 장소 설정: ${stats.withPickupLocation}`);
        console.log(`   총 금액 설정: ${stats.withTotalPrice}`);
        console.log(`   요청사항 있음: ${stats.withRequestNote}\n`);

        // 2. 중복 차량 예약 확인
        console.log('🔍 2. 중복 차량 예약 확인');
        const duplicates = {};
        cruiseCarStats.forEach(car => {
            if (!duplicates[car.reservation_id]) {
                duplicates[car.reservation_id] = [];
            }
            duplicates[car.reservation_id].push(car);
        });

        const duplicateReservations = Object.entries(duplicates)
            .filter(([_, cars]) => cars.length > 1)
            .map(([reservationId, cars]) => ({
                reservationId,
                count: cars.length,
                cars: cars.map(c => ({
                    id: c.id,
                    carCount: c.car_count,
                    passengerCount: c.passenger_count,
                    createdAt: c.created_at
                }))
            }));

        if (duplicateReservations.length > 0) {
            console.log(`   ⚠️ 중복 발견: ${duplicateReservations.length}개 예약에 여러 차량 기록`);
            duplicateReservations.slice(0, 5).forEach(dup => {
                console.log(`   - 예약 ${dup.reservationId.slice(0, 8)}: ${dup.count}개 차량`);
            });
        } else {
            console.log('   ✅ 중복 차량 예약 없음');
        }
        console.log('');

        // 3. 빈 데이터 확인
        console.log('📝 3. 빈 차량 데이터 확인');
        const emptyRecords = cruiseCarStats.filter(car =>
            (!car.car_price_code || car.car_price_code.trim() === '') &&
            (!car.car_count || car.car_count === 0) &&
            (!car.passenger_count || car.passenger_count === 0) &&
            !car.pickup_datetime &&
            (!car.pickup_location || car.pickup_location.trim() === '') &&
            (!car.dropoff_location || car.dropoff_location.trim() === '') &&
            (!car.car_total_price || car.car_total_price === 0) &&
            (!car.request_note || car.request_note.trim() === '')
        );

        console.log(`   빈 데이터 레코드: ${emptyRecords.length}개`);
        if (emptyRecords.length > 0) {
            console.log('   ⚠️ 정리 가능한 빈 레코드들이 있습니다.');
        }
        console.log('');

        // 4. 크루즈 예약과의 연결 상태 확인
        console.log('🔗 4. 크루즈 예약과의 연결 상태');
        const { data: cruiseReservations, error: cruiseError } = await supabase
            .from('reservation_cruise')
            .select('reservation_id');

        if (cruiseError) {
            console.error('❌ 크루즈 예약 조회 오류:', cruiseError);
        } else {
            const cruiseReservationIds = new Set(cruiseReservations.map(r => r.reservation_id));
            const carReservationIds = new Set(cruiseCarStats.map(r => r.reservation_id));

            const orphanedCars = [...carReservationIds].filter(id => !cruiseReservationIds.has(id));
            const cruiseWithoutCars = [...cruiseReservationIds].filter(id => !carReservationIds.has(id));

            console.log(`   총 크루즈 예약: ${cruiseReservations.length}`);
            console.log(`   차량 연결 없는 크루즈: ${cruiseWithoutCars.length}`);
            console.log(`   크루즈 연결 없는 차량: ${orphanedCars.length}`);
        }
        console.log('');

        // 5. reservation_car_sht 테이블 현황
        console.log('🚛 5. reservation_car_sht 테이블 현황');
        const { data: carShtData, error: carShtError } = await supabase
            .from('reservation_car_sht')
            .select('*');

        if (carShtError) {
            console.error('❌ car_sht 테이블 조회 오류:', carShtError);
        } else {
            console.log(`   총 차량 배정 레코드: ${carShtData.length}`);
            const cruiseCategories = carShtData.filter(r =>
                r.sht_category && r.sht_category.includes('cruise')
            );
            console.log(`   크루즈 관련 차량: ${cruiseCategories.length}`);
        }
        console.log('');

        // 6. 이관 권장 사항
        console.log('📋 6. 이관 작업 권장 사항');
        console.log('   ✅ 실행 전 백업 필수');
        console.log('   ✅ 빈 데이터 정리 권장');
        if (duplicateReservations.length > 0) {
            console.log('   ⚠️ 중복 차량 예약 정리 필요');
        }
        console.log('   ✅ 유효한 차량 데이터를 reservation_car_sht로 이관 검토');
        console.log('   ✅ 이관 후 검증 단계 필수');

    } catch (error) {
        console.error('❌ 분석 중 오류 발생:', error);
    }
}

// 실행
if (require.main === module) {
    analyzeCruiseVehicleData()
        .then(() => console.log('🎉 크루즈 차량 데이터 분석 완료'))
        .catch(console.error);
}

module.exports = { analyzeCruiseVehicleData };
