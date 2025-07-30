-- 객실 카테고리 정보 추가
INSERT INTO category_info (code, name) VALUES
  ('C1', '성인'),
  ('C2', '아동'),
  ('C3', '유아'),
  ('C4', '시니어'),
  ('C8', '학생'),
  ('C9', '특가')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name;
