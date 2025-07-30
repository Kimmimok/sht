# 매니저 관리 시스템 - 테이블 연결 정보

## 📊 각 페이지별 연결 테이블 정보

| 경로 | 페이지명 | 주요 테이블 | 기능 | 설명 |
|------|----------|-------------|------|------|
| `/manager/quotes` | 견적 관리 | `quote`, `users`, `schedule_info`, `cruise_info`, `payment_info` | 견적 승인/거부, 상태 관리 | 고객의 견적 요청을 검토하고 승인 처리 |
| `/manager/reservations` | 예약 관리 | `quote` (confirmed/completed), `quote_room`, `quote_car` | 예약 확정, 체크인 관리 | 승인된 견적의 예약 진행 상황 관리 |
| `/manager/customers` | 고객 관리 | `users`, `quote` | 고객 정보, 견적 히스토리 | 고객 정보 및 서비스 이용 이력 관리 |
| `/manager/analytics` | 통계 분석 | `quote`, `users`, `cruise_info`, `room_info` | 비즈니스 분석, 트렌드 | 매출, 인기 서비스, 고객 분석 |
| `/manager/services` | 서비스 관리 | `cruise_info`, `schedule_info`, `room_info`, `car_info` | 서비스 카탈로그 관리 | 크루즈, 스케줄, 객실, 차량 정보 관리 |
| `/manager/pricing` | 가격 관리 | `room_price_code`, `car_price_code`, `hotel_price_code`, `tour_price_code` | 가격 설정, 날짜별 관리 | 서비스별 가격 및 기간 설정 |
| `/manager/reports` | 리포트 관리 | `quote`, `users`, 모든 통계 테이블 | 보고서 생성, 데이터 분석 | 비즈니스 성과 보고서 생성 및 내보내기 |
| `/manager/notifications` | 알림 관리 | `notifications` (가상), `quote`, `users` | 시스템 알림, 고객 소통 | 시스템 메시지 및 고객 알림 관리 |

## 🗄️ 가격 관리에 사용되는 테이블들

### 1. 객실 가격 테이블
```sql
-- room_price_code 테이블
CREATE TABLE room_price_code (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT REFERENCES room_info(code),
  category TEXT, -- adult, child, infant
  price INTEGER,
  start_date DATE,
  end_date DATE,
  schedule_code TEXT REFERENCES schedule_info(code),
  cruise_code TEXT REFERENCES cruise_info(code),
  payment_code TEXT REFERENCES payment_info(code),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. 차량 가격 테이블
```sql
-- car_price_code 테이블
CREATE TABLE car_price_code (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_code TEXT REFERENCES car_info(code),
  price INTEGER,
  start_date DATE,
  end_date DATE,
  schedule_code TEXT REFERENCES schedule_info(code),
  cruise_code TEXT REFERENCES cruise_info(code),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. 호텔 가격 테이블 (새로 추가)
```sql
-- hotel_price_code 테이블
CREATE TABLE hotel_price_code (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_code TEXT REFERENCES hotel_info(code),
  room_type TEXT, -- standard, deluxe, suite
  price INTEGER,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. 투어 가격 테이블 (새로 추가)
```sql
-- tour_price_code 테이블
CREATE TABLE tour_price_code (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_code TEXT REFERENCES tour_info(code),
  participant_type TEXT, -- adult, child, infant
  price INTEGER,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 📋 주요 마스터 테이블들

### 서비스 정보 테이블들
- `cruise_info`: 크루즈 정보 (code, name, description)
- `schedule_info`: 일정 정보 (code, name, duration)
- `room_info`: 객실 정보 (code, name, capacity, description)
- `car_info`: 차량 정보 (code, name, type, description)
- `hotel_info`: 호텔 정보 (code, name, location, star_rating)
- `tour_info`: 투어 정보 (code, name, type, duration)
- `payment_info`: 결제 방식 (code, name, description)

### 견적 관련 테이블들
- `quote`: 견적 마스터 (id, user_id, status, total_price, created_at)
- `cruise`: 견적 크루즈 (quote_id, cruise_code, room_type, passenger_count, price)
- `rentcar`: 견적 렌트카 (quote_id, car_code, pickup_date, return_date, price)
- `hotel`: 견적 호텔 (quote_id, hotel_code, room_type, check_in, check_out, price)
- `tour`: 견적 투어 (quote_id, tour_code, participant_count, tour_date, price)
- `airport`: 견적 공항 (quote_id, service_type, flight_info, pickup_time, price)

### 사용자 관리 테이블
- `users`: 사용자 정보 (id, email, role, name, created_at)

## 🔄 데이터 흐름 및 관계

1. **견적 생성 흐름**
   - 고객이 견적 요청 → `quote` 테이블에 저장
   - 선택한 서비스들 → `cruise`, `rentcar`, `hotel`, `tour`,'airport'에 상세 저장
   - 가격 정보는 해당 `*_price_code` 테이블에서 조회

2. **예약 확정 흐름**
   - 견적 승인 → `quote.status = 'approved'`
   - 고객 확정 → `quote.status = 'confirmed'`
   - 여행 완료 → `quote.status = 'completed'`

3. **가격 관리 흐름**
   - 매니저가 가격 설정 → `*_price_code` 테이블에 저장
   - 기간별 가격 적용 → 견적 생성 시 해당 날짜의 가격 자동 적용

## 📈 통계 및 분석에 사용되는 집계 데이터

- 월별 매출: `quote` 테이블의 `total_price` 집계
- 인기 서비스: `quote_*` 테이블들의 서비스별 선택 횟수
- 고객 분석: `users`와 `quote` 테이블 조인 분석
- 승인률: `quote.status` 컬럼 기반 계산

## 🚨 주의사항

1. **데이터 정합성**: 가격 테이블의 날짜 범위가 겹치지 않도록 관리 필요
2. **권한 관리**: RLS(Row Level Security) 정책으로 매니저/관리자만 접근 가능
3. **성능 최적화**: 자주 조회되는 컬럼들에 인덱스 설정 필요
4. **백업**: 가격 정보 변경 시 이력 관리 고려

## 🛠️ 개발 상태

✅ **완료된 기능**
- 견적 관리 (데이터 연결 수정 완료)
- 예약 관리
- 고객 관리  
- 통계 분석
- 서비스 관리
- 가격 관리 (호텔, 투어 가격 추가 완료)
- 리포트 관리 (신규 생성)
- 알림 관리 (신규 생성)

⚠️ **주의사항**
- 현재 일부 테이블이 실제 데이터베이스에 존재하지 않아 데모 데이터로 동작
- 실제 운영 전 데이터베이스 스키마 완전 구축 필요
