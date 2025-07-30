const { createClient } = require('@supabase/supabase-js');

// Supabase 설정 (하드코딩)
const supabaseUrl = 'https://jkhookaflhibrcafmlxn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpraG9va2FmbGhpYnJjYWZtbHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MzI4MzAsImV4cCI6MjA2NzQwODgzMH0.gyl-bSYT3VHSB-9T8yxMHrAIHaLg2KdbA2qCq6pMtWI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAirportConstraints() {
  console.log('🔍 Airport 테이블 제약 조건 확인 중...\n');

  try {
    // 1. 테이블 구조 확인
    const { data: columns, error: colError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'airport')
      .eq('table_schema', 'public');

    if (colError) {
      console.error('컬럼 정보 조회 실패:', colError);
    } else {
      console.log('📋 Airport 테이블 컬럼:');
      columns.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
      });
      console.log('');
    }

    // 2. 제약 조건 확인
    const { data: constraints, error: constError } = await supabase.rpc('check_table_constraints', {
      table_name: 'airport'
    });

    if (constError) {
      console.log('⚠️ RPC 함수가 없어서 직접 쿼리로 확인합니다...\n');
      
      // 직접 SQL 쿼리 실행
      const { data: constraintData, error: sqlError } = await supabase
        .from('pg_constraint')
        .select(`
          conname,
          contype,
          consrc
        `)
        .eq('conrelid', '(SELECT oid FROM pg_class WHERE relname = \'airport\')');

      if (sqlError) {
        console.error('제약 조건 쿼리 실패:', sqlError);
      } else {
        console.log('🔒 제약 조건:', constraintData);
      }
    }

    // 3. 실제 데이터 샘플 확인
    console.log('📊 Airport 테이블 데이터 샘플:');
    const { data: sampleData, error: dataError } = await supabase
      .from('airport')
      .select('*')
      .limit(3);

    if (dataError) {
      console.error('데이터 조회 실패:', dataError);
    } else {
      console.log('샘플 데이터:', sampleData);
    }

    // 4. 테스트 삽입 시도
    console.log('\n🧪 테스트 삽입 시도...');
    const testData = {
      airport_code: 'TEST001',
      passenger_count: 2,
      special_requests: 'Test request'
    };

    const { data: insertResult, error: insertError } = await supabase
      .from('airport')
      .insert(testData)
      .select();

    if (insertError) {
      console.error('❌ 삽입 실패:', insertError.message);
      console.error('상세 오류:', insertError);
    } else {
      console.log('✅ 삽입 성공:', insertResult);
      
      // 테스트 데이터 삭제
      await supabase
        .from('airport')
        .delete()
        .eq('id', insertResult[0].id);
      console.log('🗑️ 테스트 데이터 삭제됨');
    }

  } catch (error) {
    console.error('전체 프로세스 오류:', error);
  }
}

checkAirportConstraints();
