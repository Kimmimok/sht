// Supabase 연결 및 reservation_airport 테이블 구조 확인
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testAirportTableStructure() {
    try {
        console.log('🔍 reservation_airport 테이블 구조 테스트...');

        // 테스트 1: reservation_id로 조회 시도
        console.log('\n1. reservation_id 컬럼 존재 여부 확인:');
        const { data: test1, error: error1 } = await supabase
            .from('reservation_airport')
            .select('reservation_id')
            .limit(1);

        if (error1) {
            console.log('❌ reservation_id 컬럼 없음:', error1.message);
        } else {
            console.log('✅ reservation_id 컬럼 존재');
        }

        // 테스트 2: ra_reservation_id로 조회 시도  
        console.log('\n2. ra_reservation_id 컬럼 존재 여부 확인:');
        const { data: test2, error: error2 } = await supabase
            .from('reservation_airport')
            .select('ra_reservation_id')
            .limit(1);

        if (error2) {
            console.log('❌ ra_reservation_id 컬럼 없음:', error2.message);
        } else {
            console.log('✅ ra_reservation_id 컬럼 존재');
        }

        // 테스트 3: 전체 컬럼 구조 확인
        console.log('\n3. 사용 가능한 모든 컬럼 확인:');
        const { data: allColumns, error: error3 } = await supabase
            .from('reservation_airport')
            .select('*')
            .limit(1);

        if (allColumns && allColumns.length > 0) {
            console.log('📋 테이블 컬럼 목록:', Object.keys(allColumns[0]));
        } else if (error3) {
            console.log('❌ 테이블 조회 실패:', error3.message);
        } else {
            console.log('📋 테이블이 비어있음');
        }

    } catch (error) {
        console.error('테스트 실행 오류:', error);
    }
}

testAirportTableStructure();
