const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jkhookaflhibrcafmlxn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpraG9va2FmbGhpYnJjYWZtbHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MzI4MzAsImV4cCI6MjA2NzQwODgzMH0.gyl-bSYT3VHSB-9T8yxMHrAIHaLg2KdbA2qCq6pMtWI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAirportServices() {
    console.log('🔍 공항 서비스 데이터 분석...\n');

    try {
        // airport_price 테이블에서 픽업/샌딩 서비스 구분 확인
        console.log('📋 airport_price 테이블 - 픽업/샌딩 분류:');
        const { data: allAirportPrices, error } = await supabase
            .from('airport_price')
            .select('airport_code, airport_category, airport_route, price')
            .order('airport_code');

        if (error) {
            console.error('❌ airport_price 조회 실패:', error.message);
            return;
        }

        console.log(`✅ ${allAirportPrices?.length || 0}개 공항 서비스 발견\n`);

        // 픽업 서비스들
        const pickupServices = allAirportPrices?.filter(service =>
            service.airport_category?.toLowerCase().includes('픽업')
        ) || [];

        // 샌딩 서비스들  
        const sendingServices = allAirportPrices?.filter(service =>
            service.airport_category?.toLowerCase().includes('샌딩')
        ) || [];

        console.log('🚗 픽업 서비스들:');
        pickupServices.forEach((service, idx) => {
            console.log(`${idx + 1}. [${service.airport_code}] ${service.airport_category} - ${service.airport_route} (${service.price?.toLocaleString()}동)`);
        });

        console.log('\n✈️ 샌딩 서비스들:');
        sendingServices.forEach((service, idx) => {
            console.log(`${idx + 1}. [${service.airport_code}] ${service.airport_category} - ${service.airport_route} (${service.price?.toLocaleString()}동)`);
        });

        console.log(`\n📊 요약:`);
        console.log(`- 픽업 서비스: ${pickupServices.length}개`);
        console.log(`- 샌딩 서비스: ${sendingServices.length}개`);
        console.log(`- 전체 서비스: ${allAirportPrices?.length}개`);

        // 코드 중복 확인
        const allCodes = allAirportPrices?.map(s => s.airport_code) || [];
        const uniqueCodes = [...new Set(allCodes)];
        if (allCodes.length !== uniqueCodes.length) {
            console.log('\n⚠️  중복된 코드 발견!');
            const duplicates = allCodes.filter((code, index) => allCodes.indexOf(code) !== index);
            console.log('중복 코드들:', [...new Set(duplicates)]);
        } else {
            console.log('\n✅ 모든 코드가 고유함');
        }

    } catch (error) {
        console.error('❌ 분석 중 오류:', error);
    }
}

checkAirportServices();
