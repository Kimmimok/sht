const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://jkhookaflhibrcafmlxn.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpraG9va2FmbGhpYnJjYWZtbHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MzI4MzAsImV4cCI6MjA2NzQwODgzMH0.gyl-bSYT3VHSB-9T8yxMHrAIHaLg2KdbA2qCq6pMtWI'
);

async function checkReservationTables() {
    console.log('🔍 예약 관련 테이블 구조 확인...');

    const tables = [
        'reservation',
        'reservation_airport',
        'reservation_cruise',
        'reservation_hotel',
        'reservation_rentcar',
        'reservation_tour',
        'reservation_vehicle_sht'
    ];

    for (const tableName of tables) {
        try {
            console.log(`\n=== ${tableName} 테이블 확인 ===`);

            // 테이블 스키마 확인 (첫 번째 행으로 컬럼 파악)
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .limit(1);

            if (error) {
                console.log(`❌ [${tableName}] 오류:`, error.message);

                // RLS 정책 때문인지 확인
                if (error.code === 'PGRST106') {
                    console.log(`   → RLS 정책 문제 가능성`);
                }
            } else {
                console.log(`✅ [${tableName}] 접근 성공`);
                if (data && data.length > 0) {
                    console.log(`   컬럼: ${Object.keys(data[0]).join(', ')}`);
                } else {
                    console.log(`   데이터 없음 - 빈 테이블`);
                }
            }
        } catch (err) {
            console.log(`❌ [${tableName}] 예외:`, err.message);
        }
    }

    // 인증 상태 확인
    console.log('\n=== 인증 상태 확인 ===');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
        console.log('❌ 인증 오류:', userError.message);
    } else if (user) {
        console.log('✅ 인증된 사용자:', user.email);
    } else {
        console.log('❌ 인증되지 않은 사용자');
    }

    // RLS 정책 우회 시도 (service_role 키 사용)
    console.log('\n=== Service Role로 테이블 확인 ===');
    const supabaseAdmin = createClient(
        'https://jkhookaflhibrcafmlxn.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpraG9va2FmbGhpYnJjYWZtbHhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjA5MTQwOCwiZXhwIjoyMDQ3NjY3NDA4fQ.A6eUCQWAEBSoYgUGgCNY6QJ_-UgabseLCq-FWWU4vxI'
    );

    for (const tableName of ['reservation', 'reservation_airport']) {
        try {
            const { data, error } = await supabaseAdmin
                .from(tableName)
                .select('*')
                .limit(1);

            if (error) {
                console.log(`❌ [Admin-${tableName}] 오류:`, error.message);
            } else {
                console.log(`✅ [Admin-${tableName}] 접근 성공`);
                if (data && data.length > 0) {
                    console.log(`   컬럼: ${Object.keys(data[0]).join(', ')}`);
                }
            }
        } catch (err) {
            console.log(`❌ [Admin-${tableName}] 예외:`, err.message);
        }
    }
}

checkReservationTables().catch(console.error);
