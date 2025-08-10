const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function simulatePageLoad() {
    const quoteId = 'a98e1c30-bce0-4a18-8f12-df9ad8baa973';

    try {
        console.log('🔍 페이지 로드 시뮬레이션:', quoteId);

        // 견적 조회
        const { data: quote, error: quoteError } = await supabase
            .from('quote')
            .select('*')
            .eq('id', quoteId)
            .single();

        if (quoteError || !quote) {
            console.error('❌ 견적 조회 실패:', quoteError);
            return;
        }

        // 사용자 조회
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('name, email, phone')
            .eq('id', quote.user_id)
            .single();

        console.log('✅ 기본 정보:');
        console.log('   제목:', quote.title);
        console.log('   사용자:', user?.name || '알 수 없음');
        console.log('   총액:', quote.total_price?.toLocaleString() || '0', '동');
        console.log('   결제상태:', quote.payment_status);

        // 예약 조회
        const { data: resList, error: resError } = await supabase
            .from('reservation')
            .select('*')
            .eq('re_quote_id', quoteId);

        if (resError) {
            console.error('❌ 예약 조회 실패:', resError);
            return;
        }

        console.log('✅ 예약 정보:', resList?.length || 0, '개');

        if (resList && resList.length > 0) {
            // 서비스별 상세 조회
            const reservationIds = resList.map(r => r.re_id);

            const [cruiseRes, airportRes] = await Promise.all([
                supabase.from('reservation_cruise').select('*').in('reservation_id', reservationIds),
                supabase.from('reservation_airport').select('*').in('reservation_id', reservationIds)
            ]);

            // 결과 매핑
            const serviceMap = new Map();
            cruiseRes.data?.forEach(item => serviceMap.set(item.reservation_id, item));
            airportRes.data?.forEach(item => serviceMap.set(item.reservation_id, item));

            console.log('\n📋 예약 상세:');
            resList.forEach((res, index) => {
                const serviceDetail = serviceMap.get(res.re_id);
                const amount = serviceDetail ?
                    (serviceDetail.room_total_price || serviceDetail.total_price || serviceDetail.unit_price || 0) : 0;

                console.log(`   ${index + 1}. ${res.re_type} - ${amount.toLocaleString()}동 (${res.re_status})`);

                if (serviceDetail && res.re_type === 'cruise') {
                    console.log(`      크루즈: 체크인 ${serviceDetail.checkin}, ${serviceDetail.guest_count}명`);
                }
                if (serviceDetail && res.re_type === 'airport') {
                    console.log(`      공항: ${serviceDetail.ra_airport_location}, ${serviceDetail.ra_passenger_count}명`);
                }
            });
        }

        console.log('\n🎯 페이지 로드 시뮬레이션 완료 - 데이터가 정상적으로 로드됩니다!');

    } catch (error) {
        console.error('❌ 오류:', error);
    }
}

simulatePageLoad();
