// 구글시트 차량 데이터 이관 스크립트 - 1단계
// reservation_cruise_car 및 reservation_car_sht 테이블로 데이터 이관

const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 설정
const supabaseUrl = 'https://jkhookaflhibrcafmlxn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpraG9va2FmbGhpYnJjYWZtbHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MzI4MzAsImV4cCI6MjA2NzQwODgzMH0.gyl-bSYT3VHSB-9T8yxMHrAIHaLg2KdbA2qCq6pMtWI';

const supabase = createClient(supabaseUrl, supabaseKey);

// 구글시트 차량 데이터 샘플 (실제로는 Google Sheets API에서 가져와야 함)
// 실제 구글시트 URL과 범위를 설정해주세요
const GOOGLE_SHEET_VEHICLE_DATA = [
    // 차량 시트 예시 데이터
    {
        reservation_id: 'sample-cruise-reservation-1',
        car_price_code: 'SHT_VAN_01',
        car_count: 1,
        passenger_count: 4,
        pickup_datetime: '2025-08-20',
        pickup_location: '하노이 공항',
        dropoff_location: '하롱베이 크루즈 터미널',
        car_total_price: 150000,
        request_note: '4인승 밴 - 공항픽업'
    },
    // 추가 데이터...
];

const GOOGLE_SHEET_SHT_VEHICLE_DATA = [
    // 스하차량 시트 예시 데이터
    {
        reservation_id: 'sample-cruise-reservation-1',
        vehicle_number: 'SHT-VAN-001',
        seat_number: 'A1,A2,A3,A4',
        sht_category: 'cruise_pickup',
    },
    // 추가 데이터...
];

async function migrateVehicleDataFromGoogleSheets() {
    console.log('🚗 구글시트 차량 데이터 이관 시작...\n');

    try {
        // 1. 기존 크루즈 예약 ID 조회
        console.log('📋 1. 기존 크루즈 예약 확인');
        const { data: existingReservations, error: reservationError } = await supabase
            .from('reservation_cruise')
            .select('reservation_id')
            .limit(10); // 테스트용으로 10개만

        if (reservationError) {
            console.error('❌ 크루즈 예약 조회 오류:', reservationError);
            return;
        }

        console.log(`   기존 크루즈 예약: ${existingReservations.length}개`);

        // 2. 구글시트 데이터를 기존 예약에 매핑
        console.log('\n🔄 2. 구글시트 데이터 매핑');

        const vehicleDataToInsert = [];
        const shtDataToInsert = [];

        // 실제 예약 ID와 구글시트 데이터 매핑
        existingReservations.slice(0, Math.min(5, GOOGLE_SHEET_VEHICLE_DATA.length)).forEach((reservation, index) => {
            if (index < GOOGLE_SHEET_VEHICLE_DATA.length) {
                const vehicleData = {
                    ...GOOGLE_SHEET_VEHICLE_DATA[index],
                    reservation_id: reservation.reservation_id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                vehicleDataToInsert.push(vehicleData);

                if (index < GOOGLE_SHEET_SHT_VEHICLE_DATA.length) {
                    const shtData = {
                        ...GOOGLE_SHEET_SHT_VEHICLE_DATA[index],
                        reservation_id: reservation.reservation_id,
                        created_at: new Date().toISOString()
                    };
                    shtDataToInsert.push(shtData);
                }
            }
        });

        console.log(`   매핑된 차량 데이터: ${vehicleDataToInsert.length}개`);
        console.log(`   매핑된 SHT 데이터: ${shtDataToInsert.length}개`);

        // 3. reservation_cruise_car 테이블에 삽입
        console.log('\n📥 3. reservation_cruise_car 테이블 이관');
        if (vehicleDataToInsert.length > 0) {
            const { data: cruiseCarResult, error: cruiseCarError } = await supabase
                .from('reservation_cruise_car')
                .insert(vehicleDataToInsert)
                .select();

            if (cruiseCarError) {
                console.error('❌ cruise_car 삽입 오류:', cruiseCarError);
            } else {
                console.log(`   ✅ cruise_car 삽입 성공: ${cruiseCarResult.length}개`);

                // 삽입된 데이터 샘플 출력
                if (cruiseCarResult.length > 0) {
                    console.log('   샘플 데이터:');
                    console.log(`     - 예약ID: ${cruiseCarResult[0].reservation_id.slice(0, 8)}...`);
                    console.log(`     - 가격코드: ${cruiseCarResult[0].car_price_code}`);
                    console.log(`     - 차량수: ${cruiseCarResult[0].car_count}`);
                    console.log(`     - 승객수: ${cruiseCarResult[0].passenger_count}`);
                }
            }
        }

        // 4. reservation_car_sht 테이블에 삽입
        console.log('\n📥 4. reservation_car_sht 테이블 이관');
        if (shtDataToInsert.length > 0) {
            const { data: shtResult, error: shtError } = await supabase
                .from('reservation_car_sht')
                .insert(shtDataToInsert)
                .select();

            if (shtError) {
                console.error('❌ car_sht 삽입 오류:', shtError);
            } else {
                console.log(`   ✅ car_sht 삽입 성공: ${shtResult.length}개`);

                // 삽입된 데이터 샘플 출력
                if (shtResult.length > 0) {
                    console.log('   샘플 데이터:');
                    console.log(`     - 예약ID: ${shtResult[0].reservation_id.slice(0, 8)}...`);
                    console.log(`     - 차량번호: ${shtResult[0].vehicle_number}`);
                    console.log(`     - 좌석번호: ${shtResult[0].seat_number}`);
                    console.log(`     - 카테고리: ${shtResult[0].sht_category}`);
                }
            }
        }

        // 5. 이관 결과 검증
        console.log('\n✅ 5. 이관 결과 검증');

        const { data: finalCruiseCarCount } = await supabase
            .from('reservation_cruise_car')
            .select('id', { count: 'exact' });

        const { data: finalShtCount } = await supabase
            .from('reservation_car_sht')
            .select('id', { count: 'exact' });

        console.log(`   현재 cruise_car 레코드: ${finalCruiseCarCount?.length || 0}개`);
        console.log(`   현재 car_sht 레코드: ${finalShtCount?.length || 0}개`);

        console.log('\n📋 6. 다음 단계 안내');
        console.log('   ✅ 1단계 이관 완료');
        console.log('   📝 TODO: 실제 구글시트 URL과 데이터 범위 설정');
        console.log('   📝 TODO: Google Sheets API 연동');
        console.log('   📝 TODO: 대량 데이터 배치 처리');
        console.log('   📝 TODO: 오류 핸들링 및 롤백 기능');

    } catch (error) {
        console.error('❌ 이관 중 오류 발생:', error);
    }
}

// Google Sheets API 연동 함수 (구현 필요)
async function fetchDataFromGoogleSheets(sheetUrl, range) {
    // TODO: Google Sheets API를 사용하여 실제 데이터 가져오기
    // 예시: googleapis 라이브러리 사용
    /*
    const { google } = require('googleapis');
    const sheets = google.sheets('v4');
    
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: extractSpreadsheetId(sheetUrl),
        range: range,
        auth: credentials
    });
    
    return response.data.values;
    */

    console.log('⚠️ Google Sheets API 연동이 필요합니다.');
    return [];
}

// 실행
if (require.main === module) {
    migrateVehicleDataFromGoogleSheets()
        .then(() => console.log('\n🎉 구글시트 차량 데이터 이관 완료'))
        .catch(console.error);
}

module.exports = { migrateVehicleDataFromGoogleSheets, fetchDataFromGoogleSheets };
