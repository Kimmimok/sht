# 🚗 크루즈 차량 분리 시스템 구축 가이드

## 📋 작업 개요
크루즈 예약에서 차량을 별도 테이블(`reservation_cruise_car`)로 분리하여 관리하는 시스템을 구축합니다.

## 🎯 변경 사항 요약

### ✅ 데이터베이스 변경
- **새 테이블**: `reservation_cruise_car` (차량 전용)
- **기존 테이블**: `reservation_cruise` (차량 컬럼 삭제)
- **관계**: `1:N` (하나의 예약에 여러 차량 가능)

### ✅ 페이지 로직 변경
- **저장 방식**: 객실과 차량을 별도 테이블에 저장
- **조회 방식**: JOIN으로 통합 조회
- **수정 방식**: 두 테이블 모두 삭제 후 재생성

## 🔧 실행 단계

### 1단계: 데이터베이스 마이그레이션
```sql
-- Supabase SQL Editor에서 실행
\i create-cruise-car-separation.sql
```

**포함 내용:**
- `reservation_cruise_car` 테이블 생성
- 기존 차량 데이터 마이그레이션
- `reservation_cruise` 테이블에서 차량 컬럼 삭제
- RLS 정책 및 인덱스 설정

### 2단계: 페이지 코드 수정 ✅
- **파일**: `app/mypage/reservations/cruise/page.tsx`
- **변경**: 차량을 별도 테이블에 저장하도록 로직 수정
- **상태**: 완료됨

### 3단계: 시스템 검증
```sql
-- Supabase SQL Editor에서 실행
\i verify-cruise-car-separation.sql
```

### 4단계: DB 구조 문서 업데이트
- **파일**: `sql/db.csv`
- **작업**: 아래 내용으로 수동 업데이트

#### 추가할 내용 (reservation_cruise_car):
```csv
public,reservation_cruise_car,id,uuid
public,reservation_cruise_car,reservation_id,uuid
public,reservation_cruise_car,car_price_code,text
public,reservation_cruise_car,car_count,integer
public,reservation_cruise_car,passenger_count,integer
public,reservation_cruise_car,pickup_datetime,timestamp without time zone
public,reservation_cruise_car,pickup_location,text
public,reservation_cruise_car,dropoff_location,text
public,reservation_cruise_car,car_total_price,numeric
public,reservation_cruise_car,request_note,text
public,reservation_cruise_car,created_at,timestamp with time zone
public,reservation_cruise_car,updated_at,timestamp with time zone
```

#### 삭제할 내용 (reservation_cruise에서):
```csv
public,reservation_cruise,car_price_code,text
public,reservation_cruise,car_count,integer
public,reservation_cruise,passenger_count,integer
public,reservation_cruise,pickup_datetime,timestamp without time zone
public,reservation_cruise,pickup_location,text
public,reservation_cruise,dropoff_location,text
public,reservation_cruise,car_total_price,numeric
```

## 🏗️ 새로운 시스템 구조

### 예약 플로우
```
1. 사용자가 크루즈 예약 폼 작성
2. 객실 정보 → reservation_cruise 테이블
3. 차량 정보 → reservation_cruise_car 테이블
4. 두 테이블이 reservation.re_id로 연결
```

### 데이터 조회 패턴
```typescript
// 통합 조회 (크루즈 + 차량)
const { data } = await supabase
  .from('reservation')
  .select(`
    *,
    reservation_cruise (*),
    reservation_cruise_car (*)
  `)
  .eq('re_type', 'cruise');
```

### 저장 패턴
```typescript
// 1. 객실 저장
await supabase
  .from('reservation_cruise')
  .insert(roomData);

// 2. 차량 저장 (별도)
await supabase
  .from('reservation_cruise_car')
  .insert(carData);
```

## 🧪 테스트 체크리스트

### ✅ 데이터베이스 테스트
- [ ] `reservation_cruise_car` 테이블 생성 확인
- [ ] 기존 차량 데이터 마이그레이션 확인
- [ ] `reservation_cruise` 차량 컬럼 삭제 확인
- [ ] 외래키 제약조건 작동 확인
- [ ] RLS 정책 권한 확인

### ✅ 페이지 기능 테스트
- [ ] 크루즈 예약 생성 테스트
- [ ] 차량 포함 예약 생성 테스트
- [ ] 예약 수정 기능 테스트
- [ ] 기존 예약 조회 테스트
- [ ] 중복 방지 로직 테스트

### ✅ 통합 테스트
- [ ] 객실만 예약하는 경우
- [ ] 차량만 예약하는 경우
- [ ] 객실 + 차량 함께 예약하는 경우
- [ ] 예약 수정 시 차량 추가/제거
- [ ] 관리자 화면에서 통합 조회

## 🚨 주의사항

1. **데이터 백업**: 마이그레이션 전 반드시 백업
2. **순차 실행**: SQL 스크립트는 순서대로 실행
3. **권한 확인**: RLS 정책이 올바르게 작동하는지 확인
4. **성능 테스트**: 대용량 데이터에서 JOIN 성능 확인

## 📞 문제 해결

### 마이그레이션 실패 시
```sql
-- 롤백 명령
DROP TABLE IF EXISTS public.reservation_cruise_car;
-- 기존 백업에서 복원
```

### RLS 권한 문제 시
```sql
-- 정책 재설정
DROP POLICY IF EXISTS "cruise_car_owner_access" ON public.reservation_cruise_car;
-- 위 스크립트의 RLS 섹션 재실행
```

## ✅ 완료 상태

- [x] SQL 스크립트 작성 완료
- [x] 페이지 로직 수정 완료  
- [x] 검증 스크립트 작성 완료
- [x] 문서화 완료
- [ ] **실행 대기**: Supabase에서 SQL 실행 필요
- [ ] **테스트 대기**: 실제 예약 기능 테스트 필요

## 🎉 예상 효과

1. **데이터 정규화**: 객실과 차량 데이터 분리로 중복 제거
2. **확장성 향상**: 차량 서비스 독립 관리 가능
3. **성능 개선**: 불필요한 null 컬럼 제거
4. **유지보수성**: 각 서비스별 독립적 수정 가능
