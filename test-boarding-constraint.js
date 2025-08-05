const supabase = require('./lib/supabase.js').default;

async function checkConstraint() {
    try {
        // 직접 reservation_cruise 테이블 구조 확인
        const { data, error } = await supabase
            .from('reservation_cruise')
            .select('*')
            .limit(1);

        console.log('Sample data:', data);
        console.log('Error:', error);

        // 테스트 insert로 제약조건 확인
        console.log('Testing boarding_assist values...');

        // 기존 견적 ID 조회
        const { data: quotes, error: quoteError } = await supabase
            .from('quote')
            .select('id')
            .limit(1);

        if (quoteError || !quotes || quotes.length === 0) {
            console.log('No quotes found:', quoteError);
            return;
        }

        const quoteId = quotes[0].id;
        console.log('Using quote ID:', quoteId);

        // 기존 사용자 ID 조회
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('id')
            .limit(1);

        if (userError || !users || users.length === 0) {
            console.log('No users found:', userError);
            return;
        }

        const userId = users[0].id;
        console.log('Using user ID:', userId);

        // 테스트용 reservation 생성
        const { data: testReservation, error: resError } = await supabase
            .from('reservation')
            .insert({
                re_user_id: userId,
                re_quote_id: quoteId,
                re_type: 'cruise',
                re_status: 'pending',
                re_created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (resError) {
            console.log('Test reservation creation failed:', resError);
            return;
        }

        console.log('Test reservation created:', testReservation.re_id);

        // 'y' 값 테스트
        const { data: test1, error: err1 } = await supabase
            .from('reservation_cruise')
            .insert({
                reservation_id: testReservation.re_id,
                room_price_code: 'TEST',
                checkin: '2025-08-08',
                guest_count: 1,
                unit_price: 1000,
                boarding_assist: 'y',
                car_price_code: 'TEST',
                car_count: 1,
                passenger_count: 1,
                room_total_price: 1000,
                car_total_price: 1000
            })
            .select();

        console.log('Test with y:', test1, err1);

        // 테스트 데이터 삭제
        if (test1 && test1.length > 0) {
            await supabase.from('reservation_cruise').delete().eq('id', test1[0].id);
        }

        // 'n' 값 테스트
        const { data: test2, error: err2 } = await supabase
            .from('reservation_cruise')
            .insert({
                reservation_id: testReservation.re_id,
                room_price_code: 'TEST',
                checkin: '2025-08-08',
                guest_count: 1,
                unit_price: 1000,
                boarding_assist: 'n',
                car_price_code: 'TEST',
                car_count: 1,
                passenger_count: 1,
                room_total_price: 1000,
                car_total_price: 1000
            })
            .select();

        console.log('Test with n:', test2, err2);

        // 테스트 데이터 삭제
        if (test2 && test2.length > 0) {
            await supabase.from('reservation_cruise').delete().eq('id', test2[0].id);
        }

        // 테스트 reservation 삭제
        await supabase.from('reservation').delete().eq('re_id', testReservation.re_id);

    } catch (e) {
        console.error('Error:', e);
    }
}

checkConstraint();
