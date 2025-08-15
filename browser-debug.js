// 브라우저 콘솔에서 실행할 수 있는 디버깅 코드
async function debugReservationCruise() {
    console.log('🔍 크루즈 예약 상세 정보 디버깅 시작');

    try {
        // 1. 크루즈 타입 예약 조회
        const { data: cruiseReservations, error: reservationError } = await supabase
            .from('reservation')
            .select('re_id, re_user_id, re_quote_id, re_type, re_status')
            .eq('re_type', 'cruise')
            .limit(10);

        console.log('📋 크루즈 예약 목록:', cruiseReservations);
        if (reservationError) {
            console.error('❌ 예약 조회 오류:', reservationError);
            return;
        }

        if (!cruiseReservations || cruiseReservations.length === 0) {
            console.log('❌ 크루즈 예약이 없습니다.');
            return;
        }

        // 2. reservation_cruise 테이블 전체 조회
        const { data: allCruiseDetails, error: cruiseError } = await supabase
            .from('reservation_cruise')
            .select('*')
            .limit(20);

        console.log('📋 reservation_cruise 전체 데이터:', allCruiseDetails);
        if (cruiseError) {
            console.error('❌ 크루즈 상세 조회 오류:', cruiseError);
        }

        // 3. 각 예약별로 상세 정보 확인
        for (const reservation of cruiseReservations) {
            console.log(`\n🚢 예약 ${reservation.re_id.slice(0, 8)} 분석:`);

            const matchingDetails = allCruiseDetails?.find(detail =>
                detail.reservation_id === reservation.re_id
            );

            if (matchingDetails) {
                console.log('✅ 상세 정보 발견:', matchingDetails);
            } else {
                console.log('❌ 상세 정보 누락');

                // 부분 매칭 시도
                const partialMatch = allCruiseDetails?.find(detail =>
                    detail.reservation_id?.includes(reservation.re_id.slice(0, 8)) ||
                    reservation.re_id.includes(detail.reservation_id?.slice(0, 8))
                );

                if (partialMatch) {
                    console.log('🔍 부분 매칭 발견:', partialMatch);
                }
            }
        }

        // 4. 데이터 매칭 분석
        console.log('\n📊 매칭 분석:');
        const reservationIds = cruiseReservations.map(r => r.re_id);
        const cruiseDetailIds = allCruiseDetails?.map(c => c.reservation_id) || [];

        console.log('예약 ID 목록:', reservationIds);
        console.log('크루즈 상세 reservation_id 목록:', cruiseDetailIds);

        const matched = reservationIds.filter(id => cruiseDetailIds.includes(id));
        const unmatched = reservationIds.filter(id => !cruiseDetailIds.includes(id));

        console.log(`✅ 매칭됨: ${matched.length}개`, matched);
        console.log(`❌ 매칭 안됨: ${unmatched.length}개`, unmatched);

    } catch (error) {
        console.error('❌ 디버깅 중 오류:', error);
    }
}

// 실행
debugReservationCruise();
