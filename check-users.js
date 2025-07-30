const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wfwemvpfnuwqymmxnsuu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indmd2VtdnBmbnV3cXltbXhuc3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU3OTQyMzYsImV4cCI6MjA1MTM3MDIzNn0.LHfRZ-l4aEUFGLhNQAq-Z6iKEFFFzVnz64YH9qCcJJI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  console.log('데이터베이스 users 테이블 조회 중...');
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(10);
  
  if (error) {
    console.log('Error:', error);
    return;
  }
  
  console.log('조회된 사용자 수:', data?.length || 0);
  
  if (data && data.length > 0) {
    console.log('\n=== 사용자 목록 ===');
    data.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Name: ${user.name}`);
      console.log('   ---');
    });
  } else {
    console.log('사용자가 없습니다.');
  }
}

checkUsers().catch(console.error);
