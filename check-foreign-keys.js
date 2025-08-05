const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkForeignKeys() {
    console.log('=== 현재 외래키 제약 조건 확인 ===');

    // quote 테이블을 참조하는 외래키들 조회
    const { data, error } = await supabase.rpc('exec_sql', {
        sql: `
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name,
        rc.delete_rule
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints AS rc
          ON tc.constraint_name = rc.constraint_name
      WHERE 
        tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'quote'
      ORDER BY tc.table_name, kcu.column_name;
    `
    });

    if (error) {
        console.error('외래키 조회 오류:', error);
        return;
    }

    console.log('Quote 테이블을 참조하는 외래키들:');
    if (data && data.length > 0) {
        data.forEach(fk => {
            console.log(`${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name} (DELETE: ${fk.delete_rule})`);
        });
    } else {
        console.log('Quote 테이블을 참조하는 외래키가 없습니다.');
    }

    // quote_item 테이블의 외래키도 확인
    console.log('\n=== quote_item 테이블의 외래키 확인 ===');
    const { data: quoteItemFks, error: quoteItemError } = await supabase.rpc('exec_sql', {
        sql: `
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name,
        rc.delete_rule
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints AS rc
          ON tc.constraint_name = rc.constraint_name
      WHERE 
        tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'quote_item'
      ORDER BY kcu.column_name;
    `
    });

    if (quoteItemError) {
        console.error('quote_item 외래키 조회 오류:', quoteItemError);
        return;
    }

    if (quoteItemFks && quoteItemFks.length > 0) {
        quoteItemFks.forEach(fk => {
            console.log(`${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name} (DELETE: ${fk.delete_rule})`);
        });
    } else {
        console.log('quote_item 테이블의 외래키가 없습니다.');
    }

    // reservation 테이블의 외래키도 확인
    console.log('\n=== reservation 테이블의 외래키 확인 ===');
    const { data: reservationFks, error: reservationError } = await supabase.rpc('exec_sql', {
        sql: `
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name,
        rc.delete_rule
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints AS rc
          ON tc.constraint_name = rc.constraint_name
      WHERE 
        tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'reservation'
      ORDER BY kcu.column_name;
    `
    });

    if (reservationError) {
        console.error('reservation 외래키 조회 오류:', reservationError);
        return;
    }

    if (reservationFks && reservationFks.length > 0) {
        reservationFks.forEach(fk => {
            console.log(`${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name} (DELETE: ${fk.delete_rule})`);
        });
    } else {
        console.log('reservation 테이블의 외래키가 없습니다.');
    }
}

checkForeignKeys().catch(console.error);
