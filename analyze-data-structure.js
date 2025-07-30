// 실제 프로젝트 데이터 구조 분석
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeDataStructure() {
  console.log('🔍 실제 프로젝트 데이터 구조 분석\n');

  try {
    // 1. cruise 테이블 확인
    console.log('📋 cruise 테이블 확인:');
    const { data: cruises, error: cruiseError } = await supabase
      .from('cruise')
      .select('*')
      .limit(3);

    if (cruiseError) {
      console.error('❌ cruise 조회 실패:', cruiseError);
    } else {
      console.log(`✅ cruise 테이블: ${cruises?.length || 0}개 레코드`);
      if (cruises && cruises.length > 0) {
        const sample = cruises[0];
        console.log('📄 샘플 데이터:');
        console.log(`  - ID: ${sample.id?.substring(0, 8)}...`);
        console.log(`  - 크루즈명: ${sample.cruise_name}`);
        console.log(`  - 기본가격: ${sample.base_price}`);
        console.log(`  - 성인수: ${sample.adult_count}`);
        console.log(`  - 아동수: ${sample.child_count}`);
        console.log(`  - 객실상세: ${sample.rooms_detail ? 'JSONB 데이터 있음' : '없음'}`);
        if (sample.rooms_detail) {
          console.log(`  - 객실상세 내용:`, JSON.stringify(sample.rooms_detail, null, 2));
        }
      }
    }

    // 2. quote와 cruise 관계 확인
    console.log('\n📋 quote와 cruise 관계 확인:');
    const { data: quotes, error: quoteError } = await supabase
      .from('quote')
      .select('*')
      .limit(3);

    if (quoteError) {
      console.error('❌ quote 조회 실패:', quoteError);
    } else {
      console.log(`✅ quote 테이블: ${quotes?.length || 0}개 레코드`);
      if (quotes && quotes.length > 0) {
        for (const quote of quotes) {
          console.log(`\n📄 견적 ${quote.id?.substring(0, 8)}...:`);
          console.log(`  - 제목: ${quote.title}`);
          console.log(`  - 상태: ${quote.status}`);
          console.log(`  - 총가격: ${quote.total_price}`);
          
          // 해당 견적과 연결된 cruise 찾기
          const { data: relatedCruises, error: cruiseRelError } = await supabase
            .from('cruise')
            .select('*')
            .eq('user_id', quote.user_id)
            .limit(1);
            
          if (relatedCruises && relatedCruises.length > 0) {
            console.log(`  - 연결된 cruise: ${relatedCruises[0].cruise_name}`);
            console.log(`  - cruise 가격: ${relatedCruises[0].base_price}`);
          }
        }
      }
    }

    // 3. room, car 등 개별 서비스 테이블 확인
    console.log('\n📋 개별 서비스 테이블 확인:');
    
    const serviceTables = ['room', 'car', 'airport', 'hotel', 'rentcar', 'tour'];
    
    for (const table of serviceTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
          
        if (error) {
          console.log(`❌ ${table}: 조회 실패 - ${error.message}`);
        } else {
          console.log(`✅ ${table}: ${data?.length || 0}개 레코드`);
          if (data && data.length > 0) {
            console.log(`  샘플:`, Object.keys(data[0]).slice(0, 5).join(', '));
          }
        }
      } catch (err) {
        console.log(`❌ ${table}: 테이블 없음`);
      }
    }

    console.log('\n💡 분석 결과:');
    console.log('- 이 프로젝트는 quote_item 기반이 아닌 cruise 테이블 중심의 구조');
    console.log('- cruise 테이블에 직접 견적 정보와 가격이 저장됨');
    console.log('- rooms_detail을 JSONB로 관리');
    console.log('- updateQuoteItemPrices 함수보다는 cruise 기반 가격 계산이 필요');

  } catch (error) {
    console.error('❌ 분석 중 오류:', error);
  }
}

analyzeDataStructure();
