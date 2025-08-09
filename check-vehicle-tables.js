const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://jkhookaflhibrcafmlxn.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpraG9va2FmbGhpYnJjYWZtbHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MzI4MzAsImV4cCI6MjA2NzQwODgzMH0.gyl-bSYT3VHSB-9T8yxMHrAIHaLg2KdbA2qCq6pMtWI'
);

async function checkVehicleTables() {
    console.log('차량 관련 테이블 확인...');
    const vehicleTables = ['reservation_vehicle', 'reservation_car', 'vehicle'];

    for (const table of vehicleTables) {
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error) {
                console.log('❌', table, ':', error.message);
            } else {
                console.log('✅', table, ': 접근 성공');
                if (data && data.length > 0) {
                    console.log('   컬럼:', Object.keys(data[0]).join(', '));
                } else {
                    console.log('   데이터 없음 - 빈 테이블');
                }
            }
        } catch (err) {
            console.log('❌', table, ':', err.message);
        }
    }
}

checkVehicleTables().catch(console.error);
