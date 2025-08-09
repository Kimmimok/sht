# Supabase 데이터베이스 설정 가이드

## 📋 실행 순서

### 1단계: 기본 스키마 수정 (필수)
```sql
-- execute-schema-fix.sql 실행
-- users 테이블에 updated_at 컬럼 추가
-- reservation 테이블에 연락처 정보 컬럼 추가
```

### 2단계: 인증 시스템 설정 (필수)
```sql
-- supabase-auth-simple.sql 실행
-- Supabase 인증과 users 테이블 연결
-- 기본 RLS 정책 설정
-- 견적자/예약자 권한 설정
```

### 3단계: 서비스 테이블 권한 설정 (선택사항)
```sql
-- supabase-service-tables.sql 실행
-- 각 서비스 테이블별 접근 권한 설정
-- 존재하지 않는 테이블은 자동으로 스킵
```

## 🚨 오류 발생시 대처법

### "column does not exist" 오류
- 해당 컬럼명을 실제 데이터베이스 구조에 맞게 수정
- 예: `user_id` → `re_user_id`, `quote_user_id` 등

### "relation does not exist" 오류
- 해당 테이블이 존재하지 않음
- 해당 정책을 주석 처리하거나 제거

### "trigger already exists" 오류
- 무시해도 됨 (이미 존재하는 트리거)
- 또는 `DROP TRIGGER IF EXISTS` 먼저 실행

## ✅ 성공 확인 방법

### 1. 사용자 등록 테스트
1. 새로운 계정으로 회원가입
2. users 테이블에 자동으로 레코드 생성 확인
3. role이 'guest'로 설정되어 있는지 확인

### 2. 견적 조회 테스트
1. 견적 생성 후 조회 가능한지 확인
2. 다른 사용자의 견적은 조회 불가능한지 확인

### 3. 예약 권한 테스트
1. guest 사용자는 예약 생성 불가
2. member 역할로 변경 후 예약 생성 가능

## 📝 중요 참고사항

- **견적자(Guest)**: Supabase 인증만, users 테이블 미등록
- **예약자(Member)**: 예약시 users 테이블에 자동 등록
- **매니저/관리자**: 모든 데이터 접근 가능

## 🔧 수동 설정

필요시 Supabase 대시보드에서 직접 설정:

1. **Authentication → Settings → User Management**
   - Enable email confirmations: false (개발시에만)
   - Enable phone confirmations: false

2. **Database → RLS**
   - 각 테이블의 RLS 정책 확인
   - 문제 발생시 수동으로 정책 수정

3. **API → Settings**
   - service_role key로 관리자 작업 수행시 사용

## 💳 Payments & 📄 Confirmation 동기화 지침 (2025-08-09)

프로덕션/스테이징 모두 아래 스키마를 반영해야 결제 완료 → 견적 paid 동기화, 확인서 발송 → 완료 표기가 정상 동작합니다.

1) 스키마 마이그레이션 실행
- 실행 파일: `sql/2025-08-09-payments-confirmation-sync.sql`
- 포함 내용:
   - `quote.payment_status` (default 'pending') 추가 및 상태 제약/인덱스
   - `quote.confirmed_at` (선택) 추가
   - `reservation (re_quote_id)` 인덱스 추가
   - (선택) `reservation_confirmation` 발송 로그 테이블 생성 및 FK/인덱스

2) 앱 동작 규칙
- 결제 완료 시: `reservation_payment.payment_status = 'completed'` → 연결된 `quote.payment_status = 'paid'`로 자동 동기화
- 견적별 한번에 결제 시: 동일하게 해당 견적을 `paid`로 동기화
- 확인서 발송 시: `quote.status = 'confirmed'`, `quote.confirmed_at = now()`, `reservation.re_status = 'confirmed'`
- (선택) 발송 로그: `reservation_confirmation`에 발송 이력 기록 (존재 시)

3) 화면 반영
- 매니저/관리자 확인서 목록에서 `paid` 또는 개별결제 완료가 존재하는 견적이 노출되며, 발송 완료 시 ‘발송완료’ 배지와 발송일이 표시됩니다.

4) 트러블슈팅
- 확인서 목록에 안 보일 때: 개별결제라면 `reservation_payment`에 'completed'가 존재하는지 확인
- 스키마 미적용: 위 SQL을 먼저 실행하고, `sql/db.csv` 스냅샷 업데이트를 확인
