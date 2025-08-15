require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupAirportData() {
    try {
        console.log('🧹 기존 공항 예약 데이터 정리 시작...');

        // 1. 공항 예약 상세 데이터 삭제
        console.log('📋 공항 예약 상세 데이터 삭제 중...');
        const { error: airportError } = await supabase
            .from('reservation_airport')
            .delete()
            .neq('reservation_id', '00000000-0000-0000-0000-000000000000'); // 모든 데이터 삭제

        if (airportError) {
            console.error('❌ 공항 예약 상세 삭제 실패:', airportError);
        } else {
            console.log('✅ 공항 예약 상세 데이터 삭제 완료');
        }

        // 2. 공항 타입 메인 예약 데이터 삭제
        console.log('📋 공항 메인 예약 데이터 삭제 중...');
        const { error: reservationError } = await supabase
            .from('reservation')
            .delete()
            .eq('re_type', 'airport');

        if (reservationError) {
            console.error('❌ 공항 메인 예약 삭제 실패:', reservationError);
        } else {
            console.log('✅ 공항 메인 예약 데이터 삭제 완료');
        }

        // 3. 결과 확인
        const { data: remainingReservations } = await supabase
            .from('reservation')
            .select('re_id', { count: 'exact' })
            .eq('re_type', 'airport');

        const { data: remainingAirport } = await supabase
            .from('reservation_airport')
            .select('reservation_id', { count: 'exact' });

        console.log('\n📊 정리 결과:');
        console.log(`   남은 공항 메인 예약: ${remainingReservations?.length || 0}개`);
        console.log(`   남은 공항 상세 예약: ${remainingAirport?.length || 0}개`);
        console.log('🎉 공항 데이터 정리 완료!');

    } catch (error) {
        console.error('❌ 공항 데이터 정리 실패:', error);
    }
}

if (require.main === module) {
    cleanupAirportData();
}

module.exports = { cleanupAirportData };
