const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testJoinQueries() {
    const quoteId = 'a98e1c30-bce0-4a18-8f12-df9ad8baa973';

    try {
        console.log('🔍 조인 쿼리 테스트...');

        // 1. 표준 조인 테스트 (users 테이블)
        console.log('1️⃣ users 테이블 표준 조인 시도...');
        const { data: joinTest1, error: joinError1 } = await supabase
            .from('quote')
            .select('*, users(name, email, phone)')
            .eq('id', quoteId)
            .single();

        if (joinError1) {
            console.log('❌ 표준 조인 실패:', joinError1.message);
        } else {
            console.log('✅ 표준 조인 성공:', joinTest1?.users?.name);
        }

        // 2. 외래키 명시 조인 테스트
        console.log('2️⃣ 외래키 명시 조인 시도...');
        const { data: joinTest2, error: joinError2 } = await supabase
            .from('quote')
            .select('*, users!user_id(name, email, phone)')
            .eq('id', quoteId)
            .single();

        if (joinError2) {
            console.log('❌ 외래키 명시 조인 실패:', joinError2.message);
        } else {
            console.log('✅ 외래키 명시 조인 성공:', joinTest2?.users?.name);
        }

        // 3. 다른 조인 방식 시도
        console.log('3️⃣ 별칭 조인 방식 시도...');
        const { data: joinTest3, error: joinError3 } = await supabase
            .from('quote')
            .select(`
        *,
        user:users!quote_user_id_fkey(name, email, phone)
      `)
            .eq('id', quoteId)
            .single();

        if (joinError3) {
            console.log('❌ 별칭 조인 실패:', joinError3.message);
        } else {
            console.log('✅ 별칭 조인 성공:', joinTest3?.user?.name);
        }

        // 4. 간단한 조인 테스트
        console.log('4️⃣ 간단한 조인 시도...');
        const { data: joinTest4, error: joinError4 } = await supabase
            .from('quote')
            .select(`
        id,
        title,
        total_price,
        payment_status,
        created_at,
        confirmed_at,
        users!inner(name, email, phone)
      `)
            .eq('id', quoteId)
            .single();

        if (joinError4) {
            console.log('❌ 간단한 조인 실패:', joinError4.message);
        } else {
            console.log('✅ 간단한 조인 성공:', joinTest4?.users?.name);
        }

        // 5. SQL 직접 실행 방식 테스트
        console.log('5️⃣ SQL 직접 실행 방식...');
        const { data: sqlTest, error: sqlError } = await supabase
            .rpc('get_quote_with_user', { quote_id_param: quoteId });

        if (sqlError) {
            console.log('❌ SQL 함수 실행 실패:', sqlError.message);
        } else {
            console.log('✅ SQL 함수 실행 성공:', sqlTest?.length);
        }

        console.log('\n🎯 테스트 완료');

    } catch (error) {
        console.error('❌ 전체 오류:', error);
    }
}

testJoinQueries();
