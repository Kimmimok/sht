const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dkhqznovavnpmexktmzr.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRraHF6bm92YXZucG1leGt0bXpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIyNTkzNTMsImV4cCI6MjA0NzgzNTM1M30.fvCvDHkWHY6O6FjJSLnrYCYY1w7jCUG-Xjw1SIB2qhs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQuoteData() {
  try {
    const { data, error } = await supabase
      .from('quote')
      .select(`
        id,
        title,
        cruise_code,
        schedule_code,
        status,
        checkin,
        checkout,
        total_price,
        quote_item (
          id,
          service_type,
          service_ref_id,
          quantity,
          unit_price,
          total_price
        )
      `)
      .eq('id', '8895a2d4-43d0-4295-ae4d-d3651ae70d73')
      .single();

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Quote Data:', JSON.stringify(data, null, 2));

    // quote_item 테이블의 컬럼 구조 확인
    console.log('\n=== Checking quote_item table structure ===');
    const { data: itemStructure, error: structError } = await supabase
      .from('quote_item')
      .select('*')
      .limit(1);

    if (structError) {
      console.error('Structure Error:', structError);
    } else {
      console.log('quote_item structure:', itemStructure);
    }

  } catch (error) {
    console.error('Exception:', error);
  }
}

checkQuoteData();
