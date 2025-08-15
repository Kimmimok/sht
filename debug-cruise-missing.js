const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jzdwnfkjlwmqonwsqgzf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6ZHduZmtqbHdtcW9ud3NxZ3pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE0NDczNjQsImV4cCI6MjA0NzAyMzM2NH0.KXVkiCtdlBfNTbwHmJLzJh_lQdNsF5vXJpPQrV-X0_k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugCruiseMissing() {
    console.log('🔍 크루즈 예약 상세 정보 누락 문제 디버깅 시작\n');

    try {
        // 1. 크루즈 타입 예약 조회
        console.log('📋 1단계: 크루즈 타입 예약 조회');
        const { data: cruiseReservations, error: cruiseReservationsError } = await supabase
            .from('reservation')
            .select('re_id, re_user_id, re_quote_id, re_type, re_status, re_created_at')
            .eq('re_type', 'cruise')
            .order('re_created_at', { ascending: false });

        if (cruiseReservationsError) {
            console.error('❌ 크루즈 예약 조회 실패:', cruiseReservationsError);
            return;
        }

        console.log(`✅ 총 ${cruiseReservations.length}개의 크루즈 예약 발견`);
        console.log('샘플 예약 데이터:', cruiseReservations.slice(0, 3));

        // 2. 각 크루즈 예약의 상세 정보 확인
        console.log('\n📋 2단계: 각 예약의 reservation_cruise 상세 정보 확인');

        let foundDetails = 0;
        let missingDetails = 0;
        const problemReservations = [];

        for (const reservation of cruiseReservations) {
            const { data: cruiseDetails, error: cruiseDetailsError } = await supabase
                .from('reservation_cruise')
                .select('*')
                .eq('reservation_id', reservation.re_id)
                .maybeSingle();

            if (cruiseDetailsError) {
                console.error(`❌ 예약 ${reservation.re_id.slice(0, 8)} 상세 조회 실패:`, cruiseDetailsError);
                continue;
            }

            if (cruiseDetails) {
                foundDetails++;
                console.log(`✅ ${reservation.re_id.slice(0, 8)}: 상세 정보 존재 (${cruiseDetails.room_price_code || '가격코드없음'})`);
            } else {
                missingDetails++;
                problemReservations.push(reservation);
                console.log(`❌ ${reservation.re_id.slice(0, 8)}: 상세 정보 누락!`);
            }
        }

        console.log(`\n📊 결과 요약:`);
        console.log(`✅ 상세 정보 존재: ${foundDetails}개`);
        console.log(`❌ 상세 정보 누락: ${missingDetails}개`);

        // 3. 누락된 예약의 상세 분석
        if (problemReservations.length > 0) {
            console.log('\n🔍 3단계: 누락된 예약들의 상세 분석');

            for (const reservation of problemReservations.slice(0, 5)) { // 최대 5개만 분석
                console.log(`\n📋 예약 ID: ${reservation.re_id}`);
                console.log(`   - 사용자 ID: ${reservation.re_user_id}`);
                console.log(`   - 견적 ID: ${reservation.re_quote_id}`);
                console.log(`   - 생성일: ${reservation.re_created_at}`);
                console.log(`   - 상태: ${reservation.re_status}`);

                // 관련 견적 정보 확인
                if (reservation.re_quote_id) {
                    const { data: quoteData, error: quoteError } = await supabase
                        .from('quote')
                        .select('quote_id, title, user_id, quote_status')
                        .eq('quote_id', reservation.re_quote_id)
                        .single();

                    if (quoteData) {
                        console.log(`   - 견적 제목: ${quoteData.title}`);
                        console.log(`   - 견적 상태: ${quoteData.quote_status}`);
                    } else {
                        console.log(`   - 견적 조회 실패:`, quoteError);
                    }
                }

                // reservation_cruise 테이블에서 다른 필드로 검색해보기
                const { data: allCruiseData, error: allCruiseError } = await supabase
                    .from('reservation_cruise')
                    .select('*')
                    .limit(1000);

                if (allCruiseData) {
                    const matchingCruise = allCruiseData.find(c =>
                        c.reservation_id === reservation.re_id ||
                        c.re_id === reservation.re_id ||
                        JSON.stringify(c).includes(reservation.re_id.slice(0, 8))
                    );

                    if (matchingCruise) {
                        console.log(`   🎯 다른 필드에서 발견:`, matchingCruise);
                    } else {
                        console.log(`   ❌ reservation_cruise 테이블에서 완전히 누락됨`);
                    }
                }
            }
        }

        // 4. reservation_cruise 테이블 전체 구조 확인
        console.log('\n🔍 4단계: reservation_cruise 테이블 구조 및 샘플 데이터');

        const { data: allCruiseData, error: allCruiseError } = await supabase
            .from('reservation_cruise')
            .select('*')
            .limit(10);

        if (allCruiseData && allCruiseData.length > 0) {
            console.log('✅ reservation_cruise 샘플 데이터:');
            console.log('컬럼명:', Object.keys(allCruiseData[0]));
            console.log('샘플 행:', allCruiseData.slice(0, 3));
        } else {
            console.log('❌ reservation_cruise 테이블이 비어있거나 접근 불가:', allCruiseError);
        }

        // 5. 데이터 불일치 패턴 찾기
        console.log('\n🔍 5단계: 데이터 불일치 패턴 분석');

        if (allCruiseData) {
            console.log(`reservation_cruise 테이블 총 행 수: ${allCruiseData.length}`);

            // reservation_id 필드 패턴 확인
            const reservationIds = allCruiseData.map(c => c.reservation_id).filter(Boolean);
            console.log(`reservation_id가 있는 행: ${reservationIds.length}개`);

            if (reservationIds.length > 0) {
                console.log('reservation_id 샘플:', reservationIds.slice(0, 5));

                // 실제 reservation 테이블의 ID와 매칭되는지 확인
                const { data: matchingReservations } = await supabase
                    .from('reservation')
                    .select('re_id')
                    .in('re_id', reservationIds.slice(0, 10));

                console.log(`매칭되는 예약 ID: ${matchingReservations?.length || 0}개`);
            }
        }

    } catch (error) {
        console.error('❌ 전체 디버깅 프로세스 실패:', error);
    }
}

debugCruiseMissing();
