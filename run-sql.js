// SQL 파일 실행 스크립트
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSqlFile(filename) {
  try {
    console.log(`📄 ${filename} 파일 실행 중...`);
    
    const sqlContent = fs.readFileSync(filename, 'utf8');
    
    // SQL을 개별 명령문으로 분리
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));
    
    console.log(`📋 총 ${statements.length}개 명령문 실행 예정`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        console.log(`⚡ 명령문 ${i + 1}/${statements.length} 실행 중...`);
        
        const { data, error } = await supabase.rpc('execute_sql', {
          sql_query: statement
        });
        
        if (error) {
          console.error(`❌ 명령문 ${i + 1} 실행 실패:`, error.message);
          console.log(`실패한 명령문: ${statement.substring(0, 100)}...`);
        } else {
          console.log(`✅ 명령문 ${i + 1} 실행 성공`);
        }
      }
    }
    
    console.log('🎉 SQL 파일 실행 완료!');
    
  } catch (error) {
    console.error('❌ SQL 파일 실행 중 오류:', error);
  }
}

// 파일 실행
const filename = process.argv[2] || 'create-test-data.sql';
executeSqlFile(filename);
