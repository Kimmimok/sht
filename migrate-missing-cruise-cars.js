require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');

// Supabase 클라이언트 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Google Sheets API 설정
const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

async function getGoogleSheetsClient() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            type: 'service_account',
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    return google.sheets({ version: 'v4', auth });
}

/**
 * 1단계: 차량 연결이 없는 크루즈 예약 283개 확인
 */
async function findMissingCruiseCarReservations() {
    console.log('🔍 차량 연결이 없는 크루즈 예약 조회 중...');

    try {
        // 차량 연결이 없는 크루즈 예약 조회 (올바른 방식)
        const { data: cruiseReservationsWithoutCars, error } = await supabase
            .from('reservation_cruise')
            .select('reservation_id, checkin, guest_count, room_total_price');

        if (error) {
            console.error('❌ 크루즈 예약 조회 실패:', error);
            return [];
        }

        // 차량 연결이 없는 크루즈 예약 필터링
        const cruiseWithoutCars = [];

        if (cruiseReservationsWithoutCars && cruiseReservationsWithoutCars.length > 0) {
            console.log(`📊 전체 크루즈 예약: ${cruiseReservationsWithoutCars.length}개`);

            for (const cruise of cruiseReservationsWithoutCars) {
                // 해당 크루즈 예약에 차량 데이터가 있는지 확인
                const { data: existingCar } = await supabase
                    .from('reservation_cruise_car')
                    .select('reservation_id')
                    .eq('reservation_id', cruise.reservation_id)
                    .single();

                if (!existingCar) {
                    cruiseWithoutCars.push(cruise);
                }
            }
        }

        console.log(`📊 차량 연결이 없는 크루즈 예약: ${cruiseWithoutCars.length}개`);

        // 각 크루즈 예약의 메인 예약 정보 조회
        if (cruiseWithoutCars && cruiseWithoutCars.length > 0) {
            console.log('\n📋 예약 정보 조회 중...');

            for (let i = 0; i < cruiseWithoutCars.length; i++) {
                const cruise = cruiseWithoutCars[i];

                // 메인 예약 정보 조회
                const { data: reservationData, error: reservationError } = await supabase
                    .from('reservation')
                    .select('re_id, re_user_id, applicant_email, applicant_name, application_datetime')
                    .eq('re_id', cruise.reservation_id)
                    .single();

                if (!reservationError && reservationData) {
                    cruise.reservation = reservationData;
                }
            }

            console.log('📋 차량 누락 크루즈 예약 샘플:');
            cruiseWithoutCars.slice(0, 5).forEach((cruise, index) => {
                console.log(`${index + 1}. 예약ID: ${cruise.reservation_id}`);
                console.log(`   이메일: ${cruise.reservation?.applicant_email || 'N/A'}`);
                console.log(`   체크인: ${cruise.checkin}, 인원: ${cruise.guest_count}명`);
                console.log(`   객실가격: ${cruise.room_total_price || 0}동\n`);
            });
        }

        return cruiseWithoutCars || [];

    } catch (error) {
        console.error('❌ 차량 없는 크루즈 예약 조회 중 오류:', error);
        return [];
    }
}

/**
 * 2단계: 구글 시트에서 차량 데이터 읽기
 */
async function readCruiseCarDataFromSheet() {
    console.log('📋 구글 시트에서 차량 데이터 읽기 중...');

    try {
        const sheets = await getGoogleSheetsClient();

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: '차량!A:Z',
        });

        const rows = response.data.values || [];
        if (rows.length < 2) {
            console.warn('⚠️ 차량 시트에 데이터가 없습니다.');
            return { header: [], dataRows: [] };
        }

        const header = rows[0];
        const dataRows = rows.slice(1);

        console.log(`📊 차량 시트 헤더:`, header);
        console.log(`📋 차량 시트에서 ${dataRows.length}개 행 발견`);

        return { header, dataRows };

    } catch (error) {
        console.error('❌ 차량 시트 읽기 실패:', error);
        return { header: [], dataRows: [] };
    }
}

/**
 * 3단계: 차량 데이터를 크루즈 예약과 매칭하여 reservation_cruise_car에 이관
 */
async function migrateCruiseCarData(missingReservations, carSheetData) {
    console.log('\n🔄 차량 데이터 이관 시작...');

    if (!missingReservations || missingReservations.length === 0) {
        console.log('⚠️ 이관할 크루즈 예약이 없습니다.');
        return;
    }

    if (!carSheetData.dataRows || carSheetData.dataRows.length === 0) {
        console.log('⚠️ 구글 시트에 차량 데이터가 없습니다.');
        return;
    }

    const { header, dataRows } = carSheetData;

    // 컬럼 인덱스 찾기
    const getColumnIndex = (columnName) => {
        const variations = {
            '주문ID': ['주문ID', '주문 ID', 'OrderID', 'order_id'],
            '이메일': ['이메일', 'Email', 'EMAIL', 'email'],
            '차량코드': ['차량코드', '차량 코드', '가격코드', 'CarCode'],
            '차량번호': ['차량번호', '차량 번호', 'CarNumber', '번호'],
            '좌석': ['좌석', '좌석수', 'Seat', 'SeatCount'],
            '색상': ['색상', '컬러', 'Color', 'colour'],
            '픽업위치': ['픽업위치', '픽업 위치', 'PickupLocation', '출발지'],
            '목적지': ['목적지', '도착지', 'Destination', 'DropoffLocation'],
            '금액': ['금액', '가격', 'Price', 'Amount', '단가']
        };

        for (const variant of variations[columnName] || [columnName]) {
            const index = header.findIndex(h => h && h.toString().trim() === variant);
            if (index >= 0) return index;
        }
        return -1;
    };

    const emailIndex = getColumnIndex('이메일');
    const carCodeIndex = getColumnIndex('차량코드');
    const carNumberIndex = getColumnIndex('차량번호');
    const seatIndex = getColumnIndex('좌석');
    const colorIndex = getColumnIndex('색상');
    const pickupIndex = getColumnIndex('픽업위치');
    const destinationIndex = getColumnIndex('목적지');
    const priceIndex = getColumnIndex('금액');

    console.log('📊 컬럼 매핑 결과:');
    console.log(`   이메일: ${emailIndex >= 0 ? header[emailIndex] : '❌ 없음'}`);
    console.log(`   차량코드: ${carCodeIndex >= 0 ? header[carCodeIndex] : '❌ 없음'}`);
    console.log(`   차량번호: ${carNumberIndex >= 0 ? header[carNumberIndex] : '❌ 없음'}`);

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    // 이메일 기반으로 크루즈 예약과 차량 데이터 매칭
    for (const cruise of missingReservations) {
        const cruiseEmail = cruise.reservation?.applicant_email;
        if (!cruiseEmail) {
            console.warn(`⚠️ 크루즈 예약 ${cruise.reservation_id}: 이메일 정보 없음`);
            skipCount++;
            continue;
        }

        // 해당 이메일의 차량 데이터 찾기
        const matchingCarRows = dataRows.filter(row => {
            if (emailIndex < 0 || !row[emailIndex]) return false;
            return row[emailIndex].toString().trim().toLowerCase() === cruiseEmail.toLowerCase();
        });

        if (matchingCarRows.length === 0) {
            console.warn(`⚠️ 크루즈 예약 ${cruise.reservation_id}: 차량 데이터 없음 (${cruiseEmail})`);
            skipCount++;
            continue;
        }

        // 첫 번째 매칭되는 차량 데이터 사용
        const carRow = matchingCarRows[0];

        try {
            // reservation_cruise_car 데이터 준비
            const carReservationData = {
                reservation_id: cruise.reservation_id,
                car_price_code: carCodeIndex >= 0 ? (carRow[carCodeIndex] || 'C001') : 'C001',
                vehicle_number: carNumberIndex >= 0 ? carRow[carNumberIndex] : null,
                seat_number: seatIndex >= 0 ? parseInt(carRow[seatIndex]) || null : null,
                color_label: colorIndex >= 0 ? carRow[colorIndex] : null,
                pickup_location: pickupIndex >= 0 ? carRow[pickupIndex] : null,
                dropoff_location: destinationIndex >= 0 ? carRow[destinationIndex] : null,
                unit_price: priceIndex >= 0 ? parseFloat(String(carRow[priceIndex]).replace(/[,\s]/g, '')) || 0 : 0,
                total_price: priceIndex >= 0 ? parseFloat(String(carRow[priceIndex]).replace(/[,\s]/g, '')) || 0 : 0,
                request_note: `구글 시트에서 이관됨 - ${new Date().toISOString()}`
            };

            // 중복 체크: 같은 reservation_id에 이미 차량 데이터가 있는지 확인
            const { data: existingCar } = await supabase
                .from('reservation_cruise_car')
                .select('reservation_id')
                .eq('reservation_id', cruise.reservation_id)
                .single();

            if (existingCar) {
                console.warn(`⚠️ 이미 차량 데이터가 있음: ${cruise.reservation_id}`);
                skipCount++;
                continue;
            }

            // reservation_cruise_car에 삽입
            const { error: insertError } = await supabase
                .from('reservation_cruise_car')
                .insert(carReservationData);

            if (insertError) {
                console.error(`❌ 차량 예약 생성 실패 (${cruise.reservation_id}):`, insertError.message);
                failCount++;
                continue;
            }

            console.log(`✅ 차량 이관 성공: ${cruise.reservation_id} → ${carReservationData.car_price_code}`);
            successCount++;

        } catch (error) {
            console.error(`❌ 차량 이관 중 오류 (${cruise.reservation_id}):`, error.message);
            failCount++;
        }
    }

    // 결과 요약
    console.log('\n🎉 차량 데이터 이관 완료!');
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`❌ 실패: ${failCount}개`);
    console.log(`⚠️ 건너뜀: ${skipCount}개`);
    console.log(`📊 총 처리: ${successCount + failCount + skipCount}개`);
}

/**
 * 4단계: 이관 결과 검증
 */
async function verifyMigrationResults() {
    console.log('\n📊 이관 결과 검증 중...');

    try {
        // 1. 전체 크루즈 예약 수
        const { data: totalCruise, error: totalError } = await supabase
            .from('reservation_cruise')
            .select('reservation_id', { count: 'exact' });

        // 2. 차량이 연결된 크루즈 예약 수 (reservation_cruise_car 테이블 기준)
        const { data: cruiseCarReservations, error: carError } = await supabase
            .from('reservation_cruise_car')
            .select('reservation_id', { count: 'exact' });

        // 3. 차량이 없는 크루즈 예약 수 계산
        const totalCruiseCount = totalCruise?.length || 0;
        const carConnectedCount = cruiseCarReservations?.length || 0;
        const missingCarCount = totalCruiseCount - carConnectedCount;

        // 4. 총 차량 예약 수
        const { data: totalCarReservations, error: carReservationError } = await supabase
            .from('reservation_cruise_car')
            .select('reservation_id', { count: 'exact' });

        if (totalError || carError || carReservationError) {
            console.error('❌ 검증 쿼리 실패');
            return;
        }

        console.log('📈 크루즈 예약과의 연결 상태:');
        console.log(`   총 크루즈 예약: ${totalCruiseCount}`);
        console.log(`   차량 연결된 크루즈: ${carConnectedCount}`);
        console.log(`   차량 연결 없는 크루즈: ${missingCarCount}`);
        console.log(`   총 차량 예약: ${totalCarReservations?.length || 0}`);

        if (missingCarCount === 0) {
            console.log('🎉 모든 크루즈 예약에 차량이 연결되었습니다!');
        } else {
            console.log(`⚠️ 아직 ${missingCarCount}개의 크루즈 예약에 차량이 연결되지 않았습니다.`);
        }

    } catch (error) {
        console.error('❌ 이관 결과 검증 중 오류:', error);
    }
}

/**
 * 메인 실행 함수
 */
async function migrateMissingCruiseCarReservations() {
    try {
        console.log('🚗 차량 연결이 없는 크루즈 예약 이관 시작...\n');

        // 1단계: 차량 연결이 없는 크루즈 예약 조회
        const missingReservations = await findMissingCruiseCarReservations();

        if (!missingReservations || missingReservations.length === 0) {
            console.log('🎉 모든 크루즈 예약에 이미 차량이 연결되어 있습니다!');
            return;
        }

        // 2단계: 구글 시트에서 차량 데이터 읽기
        const carSheetData = await readCruiseCarDataFromSheet();

        // 3단계: 차량 데이터 이관
        await migrateCruiseCarData(missingReservations, carSheetData);

        // 4단계: 결과 검증
        await verifyMigrationResults();

    } catch (error) {
        console.error('❌ 차량 이관 작업 실패:', error);
        process.exit(1);
    }
}

// 스크립트 실행
if (require.main === module) {
    migrateMissingCruiseCarReservations();
}

module.exports = {
    migrateMissingCruiseCarReservations,
    findMissingCruiseCarReservations,
    migrateCruiseCarData
};
