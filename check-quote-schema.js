const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jkhookaflhibrcafmlxn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpraG9va2FmbGhpYnJjYWZtbHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MzI4MzAsImV4cCI6MjA2NzQwODgzMH0.gyl-bSYT3VHSB-9T8yxMHrAIHaLg2KdbA2qCq6pMtWI';

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
    try {
        console.log('🔍 quote 테이블 구조 확인...');
        const { data, error } = await supabase
            .from('quote')
            .select('*')
            .limit(1);

        if (error) {
            console.error('❌ 오류:', error);
        } else {
            console.log('✅ quote 테이블 첫 번째 행:', JSON.stringify(data[0], null, 2));
            if (data[0]) {
                console.log('📋 Available columns:', Object.keys(data[0]));
            }
        }
    } catch (err) {
        console.error('❌ 전체 오류:', err);
    }
})();
