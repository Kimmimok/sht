const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkManagerAccess() {
    console.log('🔍 매니저 예약 관리 접근 권한 테스트...');
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) + '...');

    try {
        // 1. 예약 테이블 기본 접근 테스트
        console.log('\n1. 예약 테이블 기본 접근 테스트...');
        const { data: reservations, error: resError } = await supabase
            .from('reservation')
            .select('re_id, re_type, re_status, re_created_at, re_user_id')
            .limit(5);

        if (resError) {
            console.log('❌ 기본 접근 실패:', resError.message);
        } else {
            console.log('✅ 기본 접근 성공:', reservations?.length || 0, '건');
            if (reservations?.length > 0) {
                console.log('첫 번째 예약:', reservations[0]);
            }
        }

        // 2. 사용자 정보 조인 테스트
        console.log('\n2. 사용자 정보 조인 테스트...');
        const { data: joinData, error: joinError } = await supabase
            .from('reservation')
            .select(`
        re_id,
        re_type,
        re_status,
        re_created_at,
        users (
          name,
          email,
          phone
        )
      `)
            .limit(3);

        if (joinError) {
            console.log('❌ 조인 실패:', joinError.message);
        } else {
            console.log('✅ 조인 성공:', joinData?.length || 0, '건');
            if (joinData?.length > 0) {
                console.log('첫 번째 조인 데이터:', JSON.stringify(joinData[0], null, 2));
            }
        }

        // 3. 서비스별 예약 테이블들 확인
        console.log('\n3. 서비스별 예약 테이블 확인...');
        const serviceTypes = ['cruise', 'airport', 'hotel', 'tour', 'rentcar'];

        for (const serviceType of serviceTypes) {
            const tableName = `reservation_${serviceType}`;
            console.log(`\n${tableName} 테이블 조회...`);

            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .limit(2);

            if (error) {
                console.log(`❌ ${tableName} 접근 실패:`, error.message);
            } else {
                console.log(`✅ ${tableName} 성공:`, data?.length || 0, '건');
            }
        }

    } catch (error) {
        console.error('❌ 전체 테스트 실패:', error.message);
    }
}

checkManagerAccess().then(() => process.exit(0));
