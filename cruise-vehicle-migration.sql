-- 크루즈 차량 이관 작업 스크립트
-- 목적: reservation_cruise_car 테이블의 데이터를 정리하고 필요시 다른 테이블로 이관
-- 작성일: 2025-08-15
-- 주의: 실행 전 반드시 백업 수행 필요

-- =============================================
-- 1. 현재 상태 분석 쿼리
-- =============================================

-- 1-1. 크루즈 차량 예약 현황 조회
SELECT 
    COUNT(*) as total_cruise_car_reservations,
    COUNT(DISTINCT reservation_id) as unique_reservations,
    COUNT(CASE WHEN car_price_code IS NOT NULL THEN 1 END) as with_price_code,
    COUNT(CASE WHEN car_count > 0 THEN 1 END) as with_car_count,
    COUNT(CASE WHEN pickup_datetime IS NOT NULL THEN 1 END) as with_pickup_date,
    MIN(created_at) as earliest_record,
    MAX(created_at) as latest_record
FROM reservation_cruise_car;

-- 1-2. 크루즈 예약과 차량 예약 연결 상태 확인
SELECT 
    rc.reservation_id,
    rc.checkin,
    rc.guest_count,
    rcc.id as car_reservation_id,
    rcc.car_count,
    rcc.passenger_count,
    rcc.pickup_datetime,
    rcc.pickup_location,
    rcc.car_total_price
FROM reservation_cruise rc
LEFT JOIN reservation_cruise_car rcc ON rc.reservation_id = rcc.reservation_id
ORDER BY rc.created_at DESC
LIMIT 20;

-- 1-3. 중복 차량 예약 확인 (같은 reservation_id에 여러 차량 예약)
SELECT 
    reservation_id,
    COUNT(*) as car_reservation_count,
    STRING_AGG(id::text, ', ') as car_reservation_ids
FROM reservation_cruise_car
GROUP BY reservation_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- =============================================
-- 2. 백업 테이블 생성
-- =============================================

-- 2-1. 크루즈 차량 예약 백업 테이블 생성
CREATE TABLE IF NOT EXISTS reservation_cruise_car_backup_20250815 AS
SELECT * FROM reservation_cruise_car;

-- 2-2. 백업 확인
SELECT 
    'original' as table_type, COUNT(*) as record_count FROM reservation_cruise_car
UNION ALL
SELECT 
    'backup' as table_type, COUNT(*) as record_count FROM reservation_cruise_car_backup_20250815;

-- =============================================
-- 3. 데이터 정리 작업
-- =============================================

-- 3-1. 빈 차량 예약 데이터 제거 (모든 주요 필드가 NULL이거나 0인 경우)
-- 주의: 실제 실행 전 검토 필요
/*
DELETE FROM reservation_cruise_car 
WHERE (car_price_code IS NULL OR car_price_code = '')
  AND (car_count IS NULL OR car_count = 0)
  AND (passenger_count IS NULL OR passenger_count = 0)
  AND (pickup_datetime IS NULL)
  AND (pickup_location IS NULL OR pickup_location = '')
  AND (dropoff_location IS NULL OR dropoff_location = '')
  AND (car_total_price IS NULL OR car_total_price = 0)
  AND (request_note IS NULL OR request_note = '');
*/

-- 3-2. 중복 차량 예약 정리 (최신 것만 남기기)
-- 주의: 실제 실행 전 비즈니스 로직 확인 필요
/*
WITH ranked_cars AS (
    SELECT *,
           ROW_NUMBER() OVER (
               PARTITION BY reservation_id 
               ORDER BY created_at DESC, id DESC
           ) as rn
    FROM reservation_cruise_car
)
DELETE FROM reservation_cruise_car 
WHERE id IN (
    SELECT id FROM ranked_cars WHERE rn > 1
);
*/

-- =============================================
-- 4. 차량 정보를 reservation_car_sht로 이관
-- =============================================

-- 4-1. reservation_car_sht 테이블에 크루즈 차량 정보 이관
-- 주의: reservation_car_sht 테이블 구조 확인 후 실행
/*
INSERT INTO reservation_car_sht (
    reservation_id,
    vehicle_number,
    seat_number,
    sht_category,
    created_at
)
SELECT 
    rcc.reservation_id,
    COALESCE(rcc.car_price_code, 'CRUISE-' || rcc.id::text) as vehicle_number,
    COALESCE(rcc.passenger_count::text, rcc.car_count::text) as seat_number,
    'cruise_transfer' as sht_category,
    rcc.created_at
FROM reservation_cruise_car rcc
WHERE rcc.car_count > 0 OR rcc.passenger_count > 0
ON CONFLICT (reservation_id) DO NOTHING;
*/

-- =============================================
-- 5. 이관 후 검증 쿼리
-- =============================================

-- 5-1. 이관 결과 확인
SELECT 
    'cruise_car_before' as stage,
    COUNT(*) as count
FROM reservation_cruise_car_backup_20250815
UNION ALL
SELECT 
    'cruise_car_after' as stage,
    COUNT(*) as count
FROM reservation_cruise_car
UNION ALL
SELECT 
    'car_sht_migrated' as stage,
    COUNT(*) as count
FROM reservation_car_sht 
WHERE sht_category = 'cruise_transfer';

-- 5-2. 이관된 데이터 샘플 확인
SELECT 
    rcs.reservation_id,
    rcs.vehicle_number,
    rcs.seat_number,
    rcs.sht_category,
    rc.checkin,
    rc.guest_count
FROM reservation_car_sht rcs
JOIN reservation_cruise rc ON rcs.reservation_id = rc.reservation_id
WHERE rcs.sht_category = 'cruise_transfer'
LIMIT 10;

-- =============================================
-- 6. 최종 정리 (선택사항)
-- =============================================

-- 6-1. 이관 완료 후 빈 크루즈 차량 예약 제거
-- 주의: 이관이 성공적으로 완료된 후에만 실행
/*
DELETE FROM reservation_cruise_car 
WHERE id NOT IN (
    SELECT DISTINCT rcc.id
    FROM reservation_cruise_car rcc
    WHERE rcc.car_count > 0 
       OR rcc.passenger_count > 0
       OR rcc.car_total_price > 0
       OR rcc.pickup_datetime IS NOT NULL
);
*/

-- 6-2. 백업 테이블 정리 (30일 후 실행 권장)
-- DROP TABLE IF EXISTS reservation_cruise_car_backup_20250815;

-- =============================================
-- 실행 순서 가이드
-- =============================================
/*
1. 현재 상태 분석 쿼리 실행 (섹션 1)
2. 백업 테이블 생성 (섹션 2)
3. 데이터 정리 작업 검토 후 실행 (섹션 3)
4. 필요시 다른 테이블로 이관 (섹션 4)
5. 이관 후 검증 (섹션 5)
6. 최종 정리 (섹션 6) - 신중히 실행
*/
