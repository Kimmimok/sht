# 크루즈 차량 이관 작업 가이드

## 📋 작업 개요
크루즈 예약 시스템에서 차량 관련 데이터를 정리하고 필요시 다른 테이블로 이관하는 작업입니다.

## 🎯 작업 목적
1. `reservation_cruise_car` 테이블의 중복/빈 데이터 정리
2. 유효한 차량 데이터를 `reservation_car_sht` 테이블로 이관
3. 데이터 일관성 및 성능 향상

## 📊 관련 테이블 구조
- **reservation_cruise_car**: 크루즈 차량 예약 상세 정보
- **reservation_car_sht**: 차량 배정 통합 테이블
- **reservation_cruise**: 크루즈 예약 기본 정보

## 🔧 작성된 스크립트 구성

### 1. SQL 스크립트 (`cruise-vehicle-migration.sql`)
```sql
-- 6개 섹션으로 구성
1. 현재 상태 분석 쿼리
2. 백업 테이블 생성
3. 데이터 정리 작업
4. 차량 정보 이관
5. 이관 후 검증
6. 최종 정리
```

### 2. Node.js 분석 스크립트 (`analyze-cruise-vehicle-data.js`)
- Supabase API를 통한 안전한 데이터 분석
- 실행 전 현황 파악 및 문제점 식별
- 이관 작업 필요성 판단 지원

## 🚀 실행 순서

### Step 1: 사전 분석
```bash
node analyze-cruise-vehicle-data.js
```

### Step 2: SQL 스크립트 단계별 실행
```sql
-- 1. 현재 상태 확인
SELECT COUNT(*) FROM reservation_cruise_car;

-- 2. 백업 생성
CREATE TABLE reservation_cruise_car_backup_20250815 AS
SELECT * FROM reservation_cruise_car;

-- 3-6. 이후 단계는 분석 결과에 따라 선택적 실행
```

## ⚠️ 주의사항 및 수정 가능 항목

### 🔍 검토 필요 사항
1. **비즈니스 로직 확인**
   - 중복 차량 예약의 의미 (여러 차량 vs 데이터 오류)
   - 빈 데이터 제거 기준의 적절성

2. **테이블 구조 호환성**
   - `reservation_car_sht.sht_category` 필드 값 정의
   - `vehicle_number`, `seat_number` 매핑 로직 검증

3. **데이터 무결성**
   - Foreign Key 제약 조건 확인
   - 참조 관계 유지 보장

### 🛠️ 수정 가능한 부분

#### 1. 빈 데이터 제거 조건 수정
```sql
-- 현재 조건을 더 엄격하게 또는 완화하여 조정 가능
WHERE (car_price_code IS NULL OR car_price_code = '')
  AND (car_count IS NULL OR car_count = 0)
  -- 추가 조건이나 OR 조건으로 변경 가능
```

#### 2. 이관 매핑 로직 수정
```sql
-- vehicle_number 생성 방식 변경
COALESCE(rcc.car_price_code, 'CRUISE-' || rcc.id::text) as vehicle_number
-- → 다른 패턴으로 변경 가능

-- seat_number 계산 방식 변경
COALESCE(rcc.passenger_count::text, rcc.car_count::text) as seat_number
-- → 다른 우선순위나 계산식 적용 가능
```

#### 3. 카테고리 분류 변경
```sql
'cruise_transfer' as sht_category
-- → 'cruise_vehicle', 'cruise_transport' 등으로 변경 가능
```

#### 4. 이관 조건 세분화
```sql
-- 현재: 차량 수나 승객 수가 0보다 큰 경우만 이관
WHERE rcc.car_count > 0 OR rcc.passenger_count > 0
-- → 추가 조건 설정 가능 (가격, 날짜, 장소 등)
```

## 🔄 롤백 계획
```sql
-- 문제 발생 시 복구 방법
-- 1. 백업에서 복원
DROP TABLE reservation_cruise_car;
ALTER TABLE reservation_cruise_car_backup_20250815 
RENAME TO reservation_cruise_car;

-- 2. 이관된 데이터 제거
DELETE FROM reservation_car_sht 
WHERE sht_category = 'cruise_transfer';
```

## ✅ 성공 기준
1. 백업 테이블 정상 생성
2. 중복 데이터 정리 완료
3. 유효 데이터 이관 성공
4. 검증 쿼리 통과
5. 애플리케이션 정상 동작

## 📞 지원 요청 시 제공 정보
1. 분석 스크립트 실행 결과
2. 현재 데이터 현황 (테이블별 레코드 수)
3. 특별한 비즈니스 요구사항
4. 원하는 이관 방식 또는 수정사항

---
**⚡ 다음 단계**: 분석 스크립트를 먼저 실행하여 현재 상황을 파악한 후, 필요한 수정사항을 알려주세요!
