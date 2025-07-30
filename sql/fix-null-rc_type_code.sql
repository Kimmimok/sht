-- 렌트카 가격 테이블에서 rc_type_code가 NULL 또는 빈 문자열인 경우 '없음'으로 업데이트
UPDATE rentcar_price
SET rc_type_code = '없음'
WHERE rc_type_code IS NULL OR rc_type_code = '';
