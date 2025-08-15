const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://izqoaowfvzllhkhgtzsm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6cW9hb3dmdnpsbGhraGd0enNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE2NjU0NzIsImV4cCI6MjAzNzI0MTQ3Mn0.s4zK8p3RJ1uHI5I5M8nqWYXhRkJTjNrG9PuV4z5hVZI';
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
    try {
        console.log('=== 크루즈 예약 데이터 확인 ===');

        // 크루즈 예약 조회
        const { data: reservations, error: reservationsError } = await supabase
            .from('reservation')
            .select('re_id, re_user_id, re_type, contact_name, contact_email, contact_phone, applicant_name, applicant_email, applicant_phone')
            .eq('re_type', 'cruise')
            .limit(5);

        if (reservationsError) {
            console.error('예약 조회 오류:', reservationsError);
            return;
        }

        console.log('크루즈 예약 데이터:', reservations);

        if (reservations?.length > 0) {
            // 해당 사용자 정보 조회
            const userIds = reservations.map(r => r.re_user_id).filter(Boolean);
            console.log('\n사용자 ID들:', userIds);

            if (userIds.length > 0) {
                const { data: users, error: usersError } = await supabase
                    .from('users')
                    .select('id, name, email, phone_number')
                    .in('id', userIds);

                if (usersError) {
                    console.error('사용자 조회 오류:', usersError);
                } else {
                    console.log('\n사용자 데이터:', users);

                    // 매칭 확인
                    console.log('\n=== 예약-사용자 매칭 결과 ===');
                    reservations.forEach(reservation => {
                        const user = users?.find(u => u.id === reservation.re_user_id);
                        console.log(`예약 ID: ${reservation.re_id.slice(0, 8)}...`);
                        console.log(`  - 사용자 ID: ${reservation.re_user_id}`);
                        console.log(`  - Users 테이블 이름: ${user?.name || '없음'}`);
                        console.log(`  - 예약 contact_name: ${reservation.contact_name || '없음'}`);
                        console.log(`  - 예약 applicant_name: ${reservation.applicant_name || '없음'}`);
                        console.log('  ---');
                    });
                }
            }
        }

    } catch (error) {
        console.error('전체 조회 오류:', error);
    }
})();
