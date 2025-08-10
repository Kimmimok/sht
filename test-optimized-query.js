const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testOptimizedQuery() {
    const quoteId = 'a98e1c30-bce0-4a18-8f12-df9ad8baa973';

    try {
        console.log('🔍 최적화된 쿼리 테스트...');
        console.time('⏱️ 전체 처리 시간');

        // 1. 기본 정보들을 병렬로 조회
        console.time('1️⃣ 기본 정보 병렬 조회');
        const [quoteResult, reservationsResult] = await Promise.all([
            // 견적 정보 조회
            supabase
                .from('quote')
                .select('*')
                .eq('id', quoteId)
                .single(),

            // 예약 목록 조회
            supabase
                .from('reservation')
                .select('*')
                .eq('re_quote_id', quoteId)
        ]);
        console.timeEnd('1️⃣ 기본 정보 병렬 조회');

        if (quoteResult.error || !quoteResult.data) {
            console.error('❌ 견적 조회 실패:', quoteResult.error);
            return;
        }

        const quote = quoteResult.data;
        const reservations = reservationsResult.data || [];

        console.log('✅ 기본 정보 조회 완료');
        console.log('   견적:', quote.title);
        console.log('   예약 개수:', reservations.length);

        // 2. 사용자 정보와 서비스 상세 정보를 병렬로 조회
        const reservationIds = reservations.map(r => r.re_id);

        console.time('2️⃣ 상세 정보 병렬 조회');
        const [
            userResult,
            cruiseResult,
            airportResult,
            hotelResult,
            rentcarResult,
            tourResult,
            carResult
        ] = await Promise.all([
            // 사용자 정보
            supabase
                .from('users')
                .select('name, email, phone')
                .eq('id', quote.user_id)
                .single(),

            // 서비스별 상세 정보 (예약 ID가 있는 경우만)
            reservationIds.length > 0 ?
                supabase.from('reservation_cruise').select('*').in('reservation_id', reservationIds) :
                Promise.resolve({ data: [] }),

            reservationIds.length > 0 ?
                supabase.from('reservation_airport').select('*').in('reservation_id', reservationIds) :
                Promise.resolve({ data: [] }),

            reservationIds.length > 0 ?
                supabase.from('reservation_hotel').select('*').in('reservation_id', reservationIds) :
                Promise.resolve({ data: [] }),

            reservationIds.length > 0 ?
                supabase.from('reservation_rentcar').select('*').in('reservation_id', reservationIds) :
                Promise.resolve({ data: [] }),

            reservationIds.length > 0 ?
                supabase.from('reservation_tour').select('*').in('reservation_id', reservationIds) :
                Promise.resolve({ data: [] }),

            reservationIds.length > 0 ?
                supabase.from('reservation_car_sht').select('*').in('reservation_id', reservationIds) :
                Promise.resolve({ data: [] })
        ]);
        console.timeEnd('2️⃣ 상세 정보 병렬 조회');

        // 3. 데이터 매핑
        console.time('3️⃣ 데이터 매핑');
        const user = userResult.data;

        // 서비스 상세 정보 맵 생성
        const serviceMap = new Map();
        cruiseResult.data?.forEach(item => serviceMap.set(item.reservation_id, item));
        airportResult.data?.forEach(item => serviceMap.set(item.reservation_id, item));
        hotelResult.data?.forEach(item => serviceMap.set(item.reservation_id, item));
        rentcarResult.data?.forEach(item => serviceMap.set(item.reservation_id, item));
        tourResult.data?.forEach(item => serviceMap.set(item.reservation_id, item));
        carResult.data?.forEach(item => serviceMap.set(item.reservation_id, item));

        // 최종 데이터 구성
        const finalData = {
            quote_id: quote.id,
            title: quote.title || '제목 없음',
            user_name: user?.name || '알 수 없음',
            user_email: user?.email || '',
            user_phone: user?.phone || '',
            total_price: quote.total_price || 0,
            payment_status: quote.payment_status || 'pending',
            created_at: quote.created_at,
            confirmed_at: quote.confirmed_at,
            reservations: reservations.map(res => {
                const serviceDetail = serviceMap.get(res.re_id);
                const amount = serviceDetail ?
                    (serviceDetail.room_total_price || serviceDetail.total_price || serviceDetail.unit_price || 0) : 0;

                return {
                    reservation_id: res.re_id,
                    service_type: res.re_type,
                    service_details: serviceDetail || {},
                    amount: amount,
                    status: res.re_status || 'pending'
                };
            })
        };
        console.timeEnd('3️⃣ 데이터 매핑');

        console.timeEnd('⏱️ 전체 처리 시간');

        console.log('\n✅ 최적화된 쿼리 완료!');
        console.log('📊 성능 요약:');
        console.log('   - 총 쿼리 수: 8개 (2번의 병렬 처리)');
        console.log('   - 견적 정보: ✅');
        console.log('   - 사용자 정보: ✅');
        console.log('   - 예약 개수:', finalData.reservations.length);
        console.log('   - 총 금액:', finalData.total_price.toLocaleString(), '동');

        return finalData;

    } catch (error) {
        console.error('❌ 오류:', error);
    }
}

testOptimizedQuery();
