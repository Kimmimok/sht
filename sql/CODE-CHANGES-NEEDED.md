# 데이터베이스 수정 후 코드 변경 사항

## 🔧 수정해야 할 코드 파일들

### 1. lib/getRoomPriceCode.ts
- `room_price_code` 테이블명을 `room_price`로 수정
- `code` 컬럼을 `id` 또는 적절한 컬럼명으로 수정

### 2. lib/getCarPriceCode.ts  
- `car_price_code` 테이블명을 `car_price`로 수정
- `code` 컬럼을 `id` 또는 적절한 컬럼명으로 수정

### 3. 조인 쿼리 수정 필요
현재 코드에서 사용하는 조인 패턴:
```tsx
// ❌ 잘못된 조인 (테이블명 불일치)
.select('quote_id, room_price:room_price_code(room_info:room_code(name))')

// ✅ 올바른 조인 
.select('quote_id, room_price_info:room_price(room_info:room_code(name))')
```

### 4. 환경변수 설정
`.env.local` 파일에 추가:
```env
NEXT_PUBLIC_SUPABASE_URL=https://jkhookaflhibrcafmlxn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5. TypeScript 타입 정의 수정
- `room_price_code`, `car_price_code` 참조를 수정
- 새로 추가된 컬럼들에 대한 타입 추가

## 🚨 우선순위 높은 수정사항

1. **데이터베이스 스키마 적용** (database-schema-fix.sql)
2. **RLS 정책 적용** (database-security-policies.sql) 
3. **테이블명 참조 수정** (코드 전체)
4. **필수 컬럼 추가 반영** (TypeScript 타입)

## 📋 적용 순서

1. Supabase 대시보드에서 SQL 스크립트 실행
2. 코드의 테이블명 참조 수정
3. 타입 정의 업데이트
4. 테스트 및 검증

이 수정사항들을 적용하면 코드와 DB 스키마 간의 불일치가 해결되고, 
회원가입 후 리다이렉트 문제도 함께 해결될 것입니다.
