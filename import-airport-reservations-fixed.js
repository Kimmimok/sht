require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');

// Supabase 클라이언트 설정 (Service Role Key 사용)
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

// 헬퍼 함수들
const toNull = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : v);
const parseNumber = (v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(String(v).replace(/[\,\s]/g, ''));
    return Number.isNaN(n) ? null : n;
};

/**
 * 일자와 시간을 결합하여 ISO DateTime 생성
 */
const combineDateAndTime = (dateStr, timeStr) => {
    if (!dateStr && !timeStr) return null;

    try {
        // 날짜 파싱 (예: "2024.12.25" 또는 "2024-12-25")
        let date = null;
        if (dateStr) {
            const cleanDate = String(dateStr).replace(/[.]/g, '-').trim();
            date = new Date(cleanDate);
            if (isNaN(date.getTime())) {
                // 날짜 형식이 다른 경우 다시 시도
                const parts = cleanDate.split(/[-./]/);
                if (parts.length >= 3) {
                    date = new Date(parts[0], parts[1] - 1, parts[2]); // year, month-1, day
                }
            }
        }

        // 시간 파싱 (예: "14:30" 또는 "2:30 PM")
        let time = { hours: 0, minutes: 0 };
        if (timeStr) {
            const timeString = String(timeStr).trim();

            // 24시간 형식 (예: "14:30")
            if (timeString.includes(':')) {
                const [hours, minutes] = timeString.split(':');
                time.hours = parseInt(hours) || 0;
                time.minutes = parseInt(minutes) || 0;
            }
            // 12시간 형식 처리 가능 (필요시 확장)
        }

        // 날짜가 없으면 현재 날짜 사용
        if (!date || isNaN(date.getTime())) {
            date = new Date();
        }

        // 시간 설정
        date.setHours(time.hours, time.minutes, 0, 0);

        return date.toISOString();
    } catch (error) {
        console.warn(`⚠️ 날짜/시간 파싱 실패: "${dateStr}" + "${timeStr}"`, error.message);
        return new Date().toISOString(); // 기본값으로 현재 시간 반환
    }
};

/**
 * 사용자 이메일로 user_id 조회
 */
async function getUserIdByEmail(email) {
    if (!email) return null;

    const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.trim())
        .single();

    if (error || !data) {
        console.warn(`⚠️ 사용자를 찾을 수 없습니다: ${email}`);
        return null;
    }

    return data.id;
}

/**
 * 구글 시트에서 공항 데이터 읽기
 */
async function readAirportSheet(sheets, sheetName = '공항') {
    try {
        console.log(`📋 ${sheetName} 시트에서 데이터 읽기 중...`);

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A:Z`,
        });

        const rows = response.data.values || [];
        if (rows.length < 2) {
            console.warn(`⚠️ ${sheetName} 시트에 데이터가 없습니다.`);
            return { header: [], dataRows: [] };
        }

        const header = rows[0];
        const dataRows = rows.slice(1);

        console.log(`📊 ${sheetName} 시트 헤더:`, header);
        console.log(`📋 총 ${dataRows.length}개 행 발견`);

        return { header, dataRows };
    } catch (error) {
        console.error(`❌ ${sheetName} 시트 읽기 실패:`, error.message);
        return { header: [], dataRows: [] };
    }
}

/**
 * 시트 데이터를 DB 컬럼으로 매핑
 */
function mapAirportData(row, header) {
    const columnMap = {
        '주문ID': 'order_id',
        '차량코드': 'airport_price_code',
        '가격코드': 'airport_price_code',
        '공항명': 'ra_airport_location',
        '공항위치': 'ra_airport_location',
        '항공편': 'ra_flight_number',
        '경유지': 'ra_stopover_location',
        '경유지대기시간': 'ra_stopover_wait_minutes',
        '차량수': 'ra_car_count',
        '승차인원': 'ra_passenger_count',
        '승객수': 'ra_passenger_count',
        '캐리어수량': 'ra_luggage_count',
        '수하물': 'ra_luggage_count',
        '일자': 'ra_date',
        '시간': 'ra_time',
        '금액': 'unit_price',
        '단가': 'unit_price',
        '합계': 'total_price',
        '총액': 'total_price',
        '요청사항': 'request_note',
        '처리': 'ra_is_processed',
        '구분': 'service_category',
        '분류': 'service_type',
        'Email': 'user_email',
        '연락처': 'contact_phone',
        '고객명': 'customer_name'
    };

    const mapped = {};

    // 기본 매핑
    for (const [sheetCol, dbCol] of Object.entries(columnMap)) {
        const index = header.indexOf(sheetCol);
        if (index >= 0 && row[index] !== undefined) {
            let value = row[index];

            // 타입별 변환
            if (dbCol === 'unit_price' || dbCol === 'total_price' ||
                dbCol === 'ra_car_count' || dbCol === 'ra_passenger_count' ||
                dbCol === 'ra_luggage_count' || dbCol === 'ra_stopover_wait_minutes') {
                value = parseNumber(value);
            } else if (dbCol === 'request_note') {
                value = toNull(value);
            } else {
                value = toNull(value);
            }

            mapped[dbCol] = value;
        }
    }

    // 일시 조합 (일자 + 시간)
    if (mapped.ra_date || mapped.ra_time) {
        mapped.ra_datetime = combineDateAndTime(mapped.ra_date, mapped.ra_time);
    }

    return mapped;
}

/**
 * 사용자별로 그룹화하고 중복 제거
 */
function groupByUserAndDeduplicateAirportCodes(processedData) {
    console.log('\n📊 사용자별 그룹화 및 공항 코드 중복 제거 중...');

    const userGroups = new Map();

    // 사용자별로 그룹화
    for (const data of processedData) {
        const { userEmail } = data;
        if (!userGroups.has(userEmail)) {
            userGroups.set(userEmail, []);
        }
        userGroups.get(userEmail).push(data);
    }

    const finalData = [];

    // 각 사용자별로 공항 코드 중복 제거
    for (const [userEmail, userAirportData] of userGroups) {
        console.log(`📋 사용자 ${userEmail}: ${userAirportData.length}개 공항 예약`);

        const seenAirportCodes = new Set();
        const userUniqueData = [];

        for (const data of userAirportData) {
            const airportCode = data.airportData.airport_price_code || 'DEFAULT';

            if (!seenAirportCodes.has(airportCode)) {
                seenAirportCodes.add(airportCode);
                userUniqueData.push(data);
                console.log(`   ✅ 공항코드 ${airportCode} 추가`);
            } else {
                console.log(`   ⚠️ 공항코드 ${airportCode} 중복 제거`);
            }
        }

        finalData.push({
            userEmail,
            airportReservations: userUniqueData
        });

        console.log(`   📊 최종: ${userUniqueData.length}개 고유 공항 예약\n`);
    }

    return finalData;
}

/**
 * 메인 예약 생성 (사용자별 하나)
 */
async function createMainReservation(userEmail, airportDataList) {
    try {
        // 사용자 ID 조회
        const userId = await getUserIdByEmail(userEmail);
        if (!userId) {
            console.error(`❌ 사용자 ID를 찾을 수 없습니다: ${userEmail}`);
            return null;
        }

        // 기존 공항 예약이 있는지 확인
        const { data: existingReservation } = await supabase
            .from('reservation')
            .select('re_id')
            .eq('re_user_id', userId)
            .eq('re_type', 'airport')
            .single();

        if (existingReservation) {
            console.log(`✅ 기존 공항 예약 사용: ${existingReservation.re_id} (사용자 ${userEmail})`);
            return existingReservation.re_id;
        }

        // 첫 번째 공항 데이터에서 기본 정보 가져오기
        const firstAirport = airportDataList[0].airportData;

        // 메인 예약 생성
        const reservationData = {
            re_user_id: userId,
            re_quote_id: null,
            re_type: 'airport',
            re_status: 'pending',
            contact_name: firstAirport.customer_name || firstAirport.contact_name,
            contact_phone: firstAirport.contact_phone,
            contact_email: userEmail,
            applicant_name: firstAirport.customer_name,
            applicant_email: userEmail,
            applicant_phone: firstAirport.contact_phone,
            application_datetime: new Date().toISOString(),
        };

        const { data: reservation, error: reservationError } = await supabase
            .from('reservation')
            .insert(reservationData)
            .select()
            .single();

        if (reservationError) {
            console.error(`❌ 메인 예약 생성 실패 (사용자 ${userEmail}):`, reservationError.message);
            return null;
        }

        console.log(`✅ 메인 예약 생성 성공: ${reservation.re_id} (사용자 ${userEmail})`);
        return reservation.re_id;

    } catch (error) {
        console.error(`❌ 메인 예약 생성 중 오류 (사용자 ${userEmail}):`, error.message);
        return null;
    }
}

/**
 * 공항 예약 상세 생성 (공항 코드별)
 */
async function createAirportReservations(reservationId, userEmail, airportDataList) {
    try {
        console.log(`📋 공항 상세 예약 생성: ${airportDataList.length}개`);

        let successCount = 0;

        for (const { orderId, airportData } of airportDataList) {
            // 공항 예약 상세 데이터 준비
            const airportReservationData = {
                reservation_id: reservationId,
                airport_price_code: airportData.airport_price_code || 'A001',
                ra_airport_location: airportData.ra_airport_location || '하노이 공항',
                ra_flight_number: airportData.ra_flight_number,
                ra_stopover_location: airportData.ra_stopover_location,
                ra_stopover_wait_minutes: airportData.ra_stopover_wait_minutes,
                ra_car_count: airportData.ra_car_count || 1,
                ra_passenger_count: airportData.ra_passenger_count || 1,
                ra_luggage_count: airportData.ra_luggage_count || 1,
                ra_datetime: airportData.ra_datetime || new Date().toISOString(),
                unit_price: airportData.unit_price,
                total_price: airportData.total_price || airportData.unit_price,
                request_note: airportData.request_note || '',
                ra_is_processed: false
            };

            const { error: airportError } = await supabase
                .from('reservation_airport')
                .insert(airportReservationData);

            if (airportError) {
                console.error(`❌ 공항 예약 생성 실패 (주문 ${orderId}):`, airportError.message);
            } else {
                console.log(`   ✅ 공항코드 ${airportData.airport_price_code} 예약 생성 성공`);
                successCount++;
            }
        }

        console.log(`📊 사용자 ${userEmail}: ${successCount}/${airportDataList.length}개 공항 예약 생성 완료`);
        return successCount;

    } catch (error) {
        console.error(`❌ 공항 예약 생성 중 오류 (사용자 ${userEmail}):`, error.message);
        return 0;
    }
}

/**
 * 메인 실행 함수
 */
async function importAirportReservationsFromGoogleSheet() {
    try {
        console.log('✈️ 구글 시트에서 공항 예약 데이터 가져오기 시작...\n');

        // 1. Google Sheets 클라이언트 생성
        const sheets = await getGoogleSheetsClient();

        // 2. 공항 시트에서 데이터 읽기
        const { header, dataRows } = await readAirportSheet(sheets, '공항');
        if (header.length === 0 || dataRows.length === 0) {
            console.error('❌ 공항 시트에 데이터가 없습니다.');
            return;
        }

        // 3. 시트 데이터 매핑
        console.log('\n📊 시트 데이터 매핑 중...');
        const processedData = [];

        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            if (!row || row.length === 0) continue;

            const mapped = mapAirportData(row, header);

            // 주문ID가 없으면 행 번호 기반 임시 ID 생성
            if (!mapped.order_id) {
                mapped.order_id = `ROW_${i + 2}`;
            }

            // 사용자 이메일 확인
            if (!mapped.user_email) {
                console.warn(`⚠️ 행 ${i + 2}: 사용자 이메일이 없습니다. 건너뛰기`);
                continue;
            }

            processedData.push({
                rowIndex: i + 2,
                orderId: mapped.order_id,
                airportData: mapped,
                userEmail: mapped.user_email
            });
        }

        console.log(`📋 시트에서 ${processedData.length}개 공항 예약 데이터 매핑 완료`);

        // 4. 사용자별 그룹화 및 공항 코드 중복 제거
        const groupedData = groupByUserAndDeduplicateAirportCodes(processedData);

        // 5. 예약 생성 실행
        console.log('\n🔄 공항 예약 생성 실행...');

        let totalUsers = 0;
        let totalAirportReservations = 0;
        let failedUsers = 0;

        for (const { userEmail, airportReservations } of groupedData) {
            console.log(`\n🔄 사용자 ${userEmail} 처리 중...`);
            totalUsers++;

            try {
                // 1단계: 메인 예약 생성 (사용자별 하나)
                const reservationId = await createMainReservation(userEmail, airportReservations);

                if (!reservationId) {
                    failedUsers++;
                    continue;
                }

                // 2단계: 공항 예약 상세 생성 (공항 코드별)
                const createdCount = await createAirportReservations(
                    reservationId,
                    userEmail,
                    airportReservations
                );

                totalAirportReservations += createdCount;
                console.log(`✅ 사용자 ${userEmail} → 예약 ${reservationId} 완료 (${createdCount}개 공항)`);

            } catch (error) {
                console.error(`❌ 사용자 ${userEmail} 처리 중 오류:`, error.message);
                failedUsers++;
            }
        }

        // 6. 결과 요약
        console.log('\n🎉 공항 예약 가져오기 완료!');
        console.log(`✅ 성공한 사용자: ${totalUsers - failedUsers}명`);
        console.log(`❌ 실패한 사용자: ${failedUsers}명`);
        console.log(`📊 총 공항 예약: ${totalAirportReservations}개`);
        console.log(`👥 총 처리 사용자: ${totalUsers}명`);

        // 7. 생성된 데이터 검증
        await verifyAirportImport();

    } catch (error) {
        console.error('❌ 공항 예약 가져오기 실패:', error.message);
        process.exit(1);
    }
}

/**
 * 생성된 공항 예약 데이터 검증
 */
async function verifyAirportImport() {
    console.log('\n📊 생성된 공항 예약 데이터 검증...');

    try {
        // 1. 공항 타입 예약 수 확인
        const { data: airportReservations, error: reservationError } = await supabase
            .from('reservation')
            .select('re_id, re_type, re_status, applicant_name')
            .eq('re_type', 'airport')
            .order('re_created_at', { ascending: false });

        if (reservationError) {
            console.error('❌ 공항 예약 조회 실패:', reservationError);
            return;
        }

        console.log(`   생성된 공항 메인 예약: ${airportReservations.length}개`);

        // 2. 공항 예약 상세 데이터 확인
        const { data: airportDetails, error: detailError } = await supabase
            .from('reservation_airport')
            .select('reservation_id, airport_price_code, ra_airport_location, ra_passenger_count, unit_price, ra_datetime')
            .order('created_at', { ascending: false })
            .limit(10);

        if (detailError) {
            console.error('❌ 공항 예약 상세 조회 실패:', detailError);
            return;
        }

        console.log(`   생성된 공항 상세 예약: ${airportDetails.length}개`);
        console.log('\n   공항 예약 상세 데이터 샘플:');
        airportDetails.slice(0, 5).forEach((detail, index) => {
            console.log(`   ${index + 1}. 예약ID: ${detail.reservation_id}`);
            console.log(`      공항코드: ${detail.airport_price_code}`);
            console.log(`      공항위치: ${detail.ra_airport_location}`);
            console.log(`      승객수: ${detail.ra_passenger_count}명`);
            console.log(`      일시: ${detail.ra_datetime}`);
            console.log(`      금액: ${detail.unit_price?.toLocaleString() || '0'}동\n`);
        });

        // 3. 중복 확인
        console.log('🔍 중복 데이터 확인...');

        // 사용자별 예약 중복 확인
        const { data: duplicateUsers, error: dupUserError } = await supabase
            .rpc('check_duplicate_airport_reservations_by_user');

        // 공항코드별 중복 확인 (같은 예약 내에서)
        const { data: duplicateAirportCodes, error: dupAirportError } = await supabase
            .from('reservation_airport')
            .select('reservation_id, airport_price_code, count(*)')
            .group('reservation_id, airport_price_code')
            .having('count', 'gt', 1);

        if (!dupAirportError && duplicateAirportCodes?.length > 0) {
            console.log(`⚠️ 동일 예약 내 공항코드 중복: ${duplicateAirportCodes.length}건`);
        } else {
            console.log('✅ 공항코드 중복 없음');
        }

    } catch (error) {
        console.error('❌ 공항 예약 검증 중 오류:', error);
    }
}

// 스크립트 실행
if (require.main === module) {
    importAirportReservationsFromGoogleSheet();
}

module.exports = {
    importAirportReservationsFromGoogleSheet,
    createMainReservation,
    createAirportReservations,
    combineDateAndTime
};
