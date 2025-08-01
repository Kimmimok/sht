// 견적 상태 확인 스크립트
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://brlbhzllgagwojkayqnt.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJybGJoemxsZ2Fnd29qa2F5cW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzI3MzUsImV4cCI6MjA1MjQwODczNX0.BQEZApbDn4CzM1kO4bWp_d4bYvOz5qrcKWCStf1oCJQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQuoteStatus() {
  console.log('🔍 견적 상태 확인 시작...\n');
  
  try {
    // 모든 견적의 상태 확인
    const { data: quotes, error } = await supabase
      .from('quote')
      .select('id, status, created_at, total_price')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('❌ 견적 조회 실패:', error);
      return;
    }
    
    console.log(`📋 최근 견적 ${quotes.length}건:`);
    quotes.forEach((quote, index) => {
      console.log(`${index + 1}. ID: ${quote.id.slice(0, 8)}... | 상태: ${quote.status} | 가격: ${quote.total_price?.toLocaleString() || 0}동 | 생성일: ${new Date(quote.created_at).toLocaleDateString()}`);
    });
    
    // 상태별 통계
    const statusCounts = quotes.reduce((acc, quote) => {
      acc[quote.status] = (acc[quote.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📊 상태별 통계:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}건`);
    });
    
    // pending 상태 견적이 있는지 확인
    const pendingQuotes = quotes.filter(q => q.status === 'pending');
    if (pendingQuotes.length > 0) {
      console.log('\n✅ pending 상태 견적이 있습니다. 승인 버튼이 표시되어야 합니다.');
      console.log('승인 대기 견적:', pendingQuotes.map(q => q.id.slice(0, 8)).join(', '));
    } else {
      console.log('\n⚠️ pending 상태 견적이 없습니다.');
      console.log('승인 버튼을 보려면 상태가 "pending"인 견적이 필요합니다.');
    }
    
  } catch (error) {
    console.error('💥 오류:', error);
  }
}

checkQuoteStatus();

