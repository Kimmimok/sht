# Copilot Instructions for AI Agents

## 프로젝트 개요
**스테이하롱 크루즈 예약 시스템** - Next.js 15.3.5 App Router + Supabase PostgreSQL로 구축된 견적/예약 관리 웹앱. 네이버 자유여행 카페 회원을 위한 크루즈 여행 견적 생성, 승인, 예약 처리 및 관리자/매니저 대시보드 시스템.

## 핵심 아키텍처 패턴
### 사용자 구분 및 인증 시스템 (2025.07.30 업데이트)
- **견적자 (Guest)**: Supabase 인증만, users 테이블 등록 없음
  - 견적 생성, 조회, 상세보기 가능
  - `auth.uid()`만으로 견적 소유권 확인
  - 예약하기 클릭 시 users 테이블에 자동 등록되어 예약자로 전환
- **예약자 (Member)**: 예약 시점에 users 테이블에 등록
  - 예약 생성, 관리 권한
  - `users.role = 'member'`로 설정
  - 예약 관련 모든 기능 접근 가능
- **매니저 (Manager)**: 실무진, 견적/예약 처리 담당
  - `users.role = 'manager'`
  - 견적 승인, 예약 관리, 결제 처리 등
- **관리자 (Admin)**: 시스템 전체 관리
  - `users.role = 'admin'`
  - 모든 데이터 접근, 사용자 관리, 시스템 설정

### 역할별 자동 리다이렉트 시스템
```tsx
// ✅ 메인 페이지 권한별 자동 이동 (app/page.tsx)
if (userRole === 'admin') {
  router.push('/admin/quotes');     // 관리자 → 견적 관리
} else if (userRole === 'manager') {
  router.push('/manager/analytics'); // 매니저 → 분석 대시보드
} else if (userRole === 'member') {
  router.push('/mypage');          // 예약자 → 마이페이지
} else {
  router.push('/mypage/quotes');   // 견적자 → 견적 목록
}
```

### 데이터베이스 구조 (중요!) - 2025.08.08 업데이트
#### **핵심 테이블 구조**
- **중앙 집중식 견적 모델**: `quote` → `quote_item` → 서비스 테이블들
- **quote_item 구조**: 모든 서비스(객실, 차량, 공항, 호텔 등)는 quote_item을 통해 관리
- **서비스 관계**: `quote_item(service_type, service_ref_id)` → `airport`, `hotel`, `rentcar`, `room`, `car`, `tour`
- **서비스 타입 매핑**: 
  - `room` → 크루즈 객실 (기존 quote_room에서 변경)
  - `car` → 크루즈 차량 (기존 quote_car에서 변경)
  - `airport` → 공항 서비스
  - `hotel` → 호텔 서비스
  - `tour` → 투어 서비스
  - `rentcar` → 렌터카 서비스
- **가격 코드 시스템**: `*_price` 테이블들이 동적 가격 계산의 핵심
- **관계**: `room_price(room_code)`, `car_price(car_code)` 등 중첩 조인 활용
- **역할 기반 권한**: `users.role` → 'guest', 'member'(customer), 'manager', 'admin' 4단계

#### **예약 시스템 테이블 구조 (실제 DB 기준)**
- **메인 예약**: `reservation` 테이블
  - `re_id`: 예약 ID (uuid)
  - `re_user_id`: 사용자 ID (uuid)
  - `re_quote_id`: 견적 ID (uuid)
  - `re_type`: 서비스 타입 ('airport', 'cruise', 'hotel', 'rentcar', 'tour')
  - `re_status`: 예약 상태 (text)
  - `re_created_at`: 생성일시

- **서비스별 상세 예약 테이블**:
  - `reservation_airport`: 공항 서비스 (`reservation_id` → `reservation.re_id`)
  - `reservation_cruise`: 크루즈 서비스 (`reservation_id` → `reservation.re_id`)
  - `reservation_hotel`: 호텔 서비스 (`reservation_id` → `reservation.re_id`)
  - `reservation_rentcar`: 렌터카 서비스 (`reservation_id` → `reservation.re_id`)
  - `reservation_tour`: 투어 서비스 (`reservation_id` → `reservation.re_id`)
  - `reservation_car_sht`: 차량 서비스 (`reservation_id` → `reservation.re_id`)

#### **중요 컬럼명 규칙 (통일된 구조)**
- **모든 예약 테이블**: `reservation_id` (외래키) → `reservation.re_id`
- **공항**: `ra_*` 접두사 (ra_airport_location, ra_flight_number, ra_datetime 등)
- **크루즈**: 접두사 없음 (room_price_code, car_price_code, checkin 등)
- **호텔**: 접두사 없음 (hotel_price_code, checkin_date, guest_count 등)
- **렌터카**: 접두사 없음 (rentcar_price_code, pickup_datetime, destination 등)
- **투어**: 접두사 없음 (tour_price_code, tour_capacity, pickup_location 등)
- **차량**: 접두사 없음 (vehicle_number, seat_number, color_label)

### 🎯 표준 예약 저장 패턴 (2025.08.08 업데이트) - 모든 서비스 필수 적용
#### **크루즈 기반 통합 저장 모델**
모든 서비스는 크루즈와 동일한 패턴으로 저장: **카테고리별 가격 옵션 선택 → 단일 행 저장**

```tsx
// ✅ 표준 예약 저장 패턴 - 모든 서비스 적용
// 1. 가격 옵션 로드 (크루즈의 room_price 방식)
const { data: priceOptions } = await supabase
  .from('service_price') // room_price, car_price, airport_price, hotel_price 등
  .select('*')
  .eq('service_code', serviceCode);

// 2. 카테고리별 서비스 분류 및 선택 UI 제공
const pickupServices = priceOptions.filter(p => p.category?.includes('픽업'));
const sendingServices = priceOptions.filter(p => p.category?.includes('샌딩'));
const roomTypeServices = priceOptions.filter(p => p.room_type);

// 3. 메인 예약 생성 (모든 서비스 공통)
const { data: reservationData } = await supabase
  .from('reservation')
  .insert({
    re_user_id: user.id,
    re_quote_id: quoteId,
    re_type: 'service_type', // 'cruise', 'airport', 'hotel', 'rentcar'
    re_status: 'pending'
  })
  .select()
  .single();

// 4. 서비스별 상세 예약 저장 (단일 행)
const serviceReservationData = {
  reservation_id: reservationData.re_id,
  service_price_code: selectedPrimaryService.service_code,
  // 메인 서비스 데이터
  main_location: primaryServiceData.location,
  main_datetime: primaryServiceData.datetime,
  // 추가 서비스는 request_note에 기록 (크루즈 방식)
  request_note: [
    baseRequestNote,
    ...additionalServices.map(service => 
      `추가 서비스: ${service.category} - ${service.route} (${service.price?.toLocaleString()}동)`
    )
  ].filter(Boolean).join('\n')
};
```

#### **서비스별 구체적 적용 패턴**
```tsx
// ✅ 크루즈 (기준 모델)
// room_price: 객실 타입별 여러 행 → reservation_cruise: 단일 행 저장
room_price_code, guest_count, room_total_price + request_note(추가 서비스)

// ✅ 공항 서비스 (크루즈 패턴 적용)  
// airport_price: 카테고리별 여러 행 → reservation_airport: 단일 행 저장
airport_price_code, ra_airport_location, ra_datetime + request_note(샌딩/픽업 추가 서비스)

// ✅ 호텔 서비스 (크루즈 패턴 적용)
// hotel_price: 호텔별/룸타입별 여러 행 → reservation_hotel: 단일 행 저장  
hotel_price_code, checkin_date, nights, guest_count + request_note(추가 옵션)

// ✅ 렌터카 서비스 (크루즈 패턴 적용)
// rentcar_price: 차량타입별 여러 행 → reservation_rentcar: 단일 행 저장
rentcar_price_code, pickup_date, rental_days, driver_count + request_note(추가 차량)

// ✅ 투어 서비스 (크루즈 패턴 적용)  
// tour_price: 투어별/옵션별 여러 행 → reservation_tour: 단일 행 저장
tour_price_code, tour_date, participant_count + request_note(추가 옵션)
```

#### **UI 패턴 (모든 서비스 공통)**
```tsx
// ✅ 카테고리별 서비스 선택 UI (크루즈 객실 선택과 동일)
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {priceOptions.map((option) => (
    <div
      key={option.service_code}
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
        selectedServices.includes(option.service_code)
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-blue-300'
      }`}
      onClick={() => toggleService(option)}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="font-medium">{option.category || option.service_type}</span>
        <span className="text-blue-600 font-bold">{option.price?.toLocaleString()}동</span>
      </div>
      <div className="text-sm text-gray-600">
        <div>상세: {option.route || option.description}</div>
        <div>조건: {option.conditions || option.vehicle_type}</div>
      </div>
    </div>
  ))}
</div>

// ✅ 총 금액 표시 (크루즈와 동일)
<div className="bg-yellow-50 rounded-lg p-4">
  <h4 className="text-md font-medium text-yellow-800 mb-2">💰 예상 총 금액</h4>
  <div className="text-lg font-bold text-red-600">
    {selectedServices.reduce((sum, service) => sum + (service.price || 0), 0).toLocaleString()}동
  </div>
</div>
```

#### **데이터베이스 설계 원칙**
1. **가격 테이블**: `*_price` (복수 행) - 서비스별/카테고리별/옵션별 가격 정의
2. **예약 테이블**: `reservation_*` (단일 행) - 선택된 메인 서비스 + 추가 서비스는 request_note
3. **관계 설정**: `reservation.re_id` ← `reservation_service.reservation_id` (1:1)
4. **가격 코드**: 선택된 메인 서비스의 `service_code`를 `*_price_code` 필드에 저장
5. **확장성**: 새로운 서비스 추가시 동일한 패턴으로 `*_price`, `reservation_*` 테이블 생성

### 서비스 생성 패턴 (quote_item 구조)
```tsx
// ✅ 표준 서비스 생성 패턴
// 1. 서비스 테이블에 데이터 삽입
const { data: serviceData, error: serviceError } = await supabase
  .from('airport') // 또는 hotel, rentcar, room, car 등
  .insert(serviceFormData)
  .select()
  .single();

// 2. quote_item에 연결 정보 생성
const { data: itemData, error: itemError } = await supabase
  .from('quote_item')
  .insert({
    quote_id: quoteId,
    service_type: 'airport', // 'hotel', 'rentcar', 'room', 'car', 'tour'
    service_ref_id: serviceData.id,
    quantity: 1,
    unit_price: 0,
    total_price: 0
  })
  .select()
  .single();
```

### 가격 계산 로직
- `lib/getRoomPriceCode.ts`, `lib/getCarPriceCode.ts`: 날짜/조건 기반 동적 가격 코드 조회
- `lib/updateQuote*Prices.ts`: 견적 저장 후 별도로 가격 코드 업데이트 (비동기)
- **패턴**: 먼저 기본 데이터 저장 → 별도로 `*_price_code` 업데이트
- **Price Chain**: `*_price` → `base_price` → `quote_item.unit_price` → `total_price` 계산 흐름

## 중요 개발 관례
### 데이터 조회 패턴
```tsx
// ✅ quote_item을 통한 서비스 조회
.select(`
  *,
  quote_items:quote_item(
    service_type,
    service_ref_id,
    quantity,
    unit_price,
    total_price
  )
`)

// ✅ 중첩 조인 패턴 (가격 코드 포함)
.select('quote_id, room_price:room_price_code(room_info:room_code(name))')
// Promise.all로 병렬 조회
const [roomsRes, carsRes] = await Promise.all([...]);
```

### 인증 및 권한 시스템 (2025.07.30 업데이트)
```tsx
// ✅ 견적자 (Guest) 인증 - Supabase 인증만
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) {
  alert('로그인이 필요합니다.');
  router.push('/login');
  return;
}
// 견적자는 users 테이블 등록 없이 견적 조회 가능

// ✅ 예약자 등록 - 예약 시점에만 users 테이블에 등록
const registerUserForReservation = async (authUser: any, additionalData: any) => {
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', authUser.id)
    .single();

  if (!existingUser) {
    await supabase.from('users').insert({
      id: authUser.id,
      email: authUser.email,
      role: 'member',
      name: additionalData.name,
      phone: additionalData.phone,
      created_at: new Date().toISOString()
    });
  }
};

// ✅ 역할 기반 권한 검사 (예약자/매니저/관리자만)
const { data: userData } = await supabase
  .from('users')
  .select('role')
  .eq('id', user.id)
  .single();

if (!userData?.role || !['member', 'manager', 'admin'].includes(userData.role)) {
  alert('접근 권한이 없습니다.');
  router.push('/');
  return;
}
```

### RLS 정책 및 데이터베이스 접근 (2025.07.30 업데이트)
```sql
-- ✅ 견적자(Guest) 접근을 위한 RLS 정책
-- 인증된 모든 사용자가 견적 테이블 조회 가능
CREATE POLICY quote_authenticated_access ON quote
  FOR SELECT 
  TO authenticated
  USING (true);

-- ✅ 예약 테이블은 소유자만 접근
CREATE POLICY reservation_owner_access ON reservation
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

-- ✅ Users 테이블은 예약자만 접근 (견적자는 등록되지 않음)
-- 기존 RLS 정책 유지
```

### 컴포넌트 패턴 (UI Layer)
```tsx
// ✅ 페이지 래퍼 패턴
<PageWrapper>
  <SectionBox title="섹션 제목">
    <div>내용</div>
  </SectionBox>
</PageWrapper>

// ✅ 로딩 상태 표준 패턴
if (loading) {
  return (
    <PageWrapper>
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
      </div>
    </PageWrapper>
  );
}

// ✅ AdminLayout/ManagerLayout 사용
<AdminLayout title="페이지 제목" activeTab="menu-key">
  {/* 컨텐츠 */}
</AdminLayout>
```

### 폼 상태 관리
- 객실/차량은 배열로 관리: `[{room_code, categoryCounts: {성인: 2, 아동: 1}}]`
- `categoryCounts` 객체로 인원 구성 추적
- 동적 추가/제거: `handleAddRoom()`, 최대 3개 제한
- TypeScript 인터페이스 활용: `QuoteFormData`, `UserProfile` 등 타입 안전성

### 스타일링 패턴 (Tailwind CSS)
```tsx
// ✅ 표준 스타일 클래스 - 옅은 색상 사용
className="bg-gray-50 text-gray-600"        // 라이트 모드 배경 (더 연하게)
className="bg-white rounded-lg shadow-sm p-6" // 카드 스타일 (shadow 연하게)
className="btn"                           // 전역 버튼 스타일 (옅은 색상)
className="w-full px-2 py-1 rounded border border-gray-200" // 입력 필드 (작은 크기)

// ✅ 옅은 색상 가이드라인
className="bg-blue-50 text-blue-500"      // 파란색 (500 → 50/500으로 연하게)
className="bg-green-50 text-green-500"    // 초록색 (연한 배경 + 중간 텍스트)
className="bg-red-50 text-red-500"        // 빨간색 (경고 색상도 연하게)
className="bg-yellow-50 text-yellow-600"  // 노란색 (배경 매우 연하게)
className="text-gray-600"                 // 텍스트 (900 → 600으로 연하게)
className="border-gray-200"               // 테두리 (300 → 200으로 연하게)

// ✅ 크기 축소 패턴
className="text-xs px-2 py-1"             // 모든 버튼 기본 크기
className="text-lg"                       // 제목 (2xl → lg로 축소)
className="text-base"                     // 부제목 (xl → base로 축소)
className="text-sm"                       // 소제목 (lg → sm으로 축소)
```

## 개발 워크플로우
- **개발**: `npm run dev` (표준 Next.js)
- **린팅**: `npm run lint:fix`, Prettier 자동 포맷팅
- **빌드**: `npm run build && npm start`

## 파일 구조 핵심 포인트
- `components/`: 재사용 컴포넌트 (`QuoteForm`, `PageWrapper`, `SectionBox`)
- `lib/`: Supabase 연동 및 비즈니스 로직 (`supabase.ts`, `*Price*.ts`)
- `app/[feature]/`: 기능별 라우팅 (`quote/`, `admin/`, `mypage/`)
- **동적 라우팅**: `[id]/view`, `[id]/edit`, `[new_id]/view` 등
- **Manager/Admin 페이지**: `app/manager/`, `app/admin/` - 역할별 대시보드
- **컴포넌트 레이아웃**: `AdminLayout.tsx`, `ManagerLayout.tsx`, `PageWrapper.tsx`

## 주요 라우팅 구조
```
app/
├── page.tsx                    # 메인 대시보드 (역할별 메뉴)
├── login/page.tsx              # 로그인
├── mypage/                     # 사용자 페이지
│   ├── page.tsx               # 마이페이지 대시보드
│   ├── quotes/                # 견적 관리
│   └── reservations/          # 예약 관리
├── manager/                    # 매니저 전용
│   ├── analytics/             # 통계 분석
│   ├── reservations/          # 예약 관리
│   ├── payments/              # 결제 관리
│   └── schedule/              # 일정 관리
└── admin/                      # 관리자 전용
    ├── quotes/                # 견적 관리
    ├── users/                 # 사용자 관리
    └── sql-runner/            # SQL 실행도구
```

## 디버깅 팁 (2025.07.30 업데이트)
- **Quote_item 연결 확인**: `quote_item` 테이블에서 `service_type`과 `service_ref_id` 관계 검증
- **가격 코드 문제**: 콘솔에서 `⚠️ *_price_code 조회 실패` 메시지 확인
- **데이터 누락**: 테이블 조인 체인 확인 (`room_price` → `room_info` → `room_code`)
- **권한 문제**: 견적자는 users 테이블 미등록 상태, 예약자만 users.role 확인
- **RLS 접근 오류**: 견적 테이블은 인증된 모든 사용자 접근 가능, 예약 테이블은 소유자만
- **사용자 등록 타이밍**: 견적 조회시 등록 안함, 예약시에만 users 테이블 등록
- **권한별 리다이렉트**: 메인 페이지에서 역할별 자동 이동 확인
- **제약 조건 위반**: 서비스 테이블에 `service_type` 필드 삽입 금지 (quote_item에서만 관리)
- **인증 에러**: `supabase.auth.getUser()` null 체크, 로그인 상태 확인
- **TypeScript 에러**: 인터페이스 정의 확인 (`QuoteFormData`, `UserProfile`)
- **배열 상태 관리**: `rooms.map()` 업데이트 시 불변성 유지
- **비동기 처리**: `Promise.all()` 병렬 조회, `try-catch` 에러 핸들링
- **테이블 구조 문제**: sql/db.csv 파일의 실제 컬럼명 확인, API 호출 대신 파일 참조
- **컬럼명 불일치**: `reservation_car_sht` (차량), `ra_reservation_id` (공항) 등 실제 DB 구조 준수

## 필수 개발 패턴 요약 (2025.08.08 업데이트)
1. **데이터 조회**: quote_item 중심, 중첩 조인 활용
2. **인증**: 견적자(Supabase 인증만) → 예약자(users 테이블 등록) → 매니저 → 관리자
3. **UI**: PageWrapper + SectionBox 조합, 로딩 상태 표준화
4. **폼**: 배열 상태 관리, TypeScript 타입 안전성
5. **가격**: 비동기 가격 코드 업데이트 분리
6. **라우팅**: 동적 라우팅, 역할별 레이아웃 사용
7. **권한 관리**: 역할별 자동 리다이렉트, RLS 정책으로 데이터 보안
8. **사용자 플로우**: 견적자 → 예약시 자동 회원 등록 → 역할별 대시보드 이동
9. **🎯 예약 저장 (필수)**: 크루즈 패턴 - 카테고리별 서비스 선택 → 단일 행 저장 → 추가 서비스는 request_note

## 표준 명령어 및 네이밍 (2025.08.10 추가)
### ✅ “행복여행 이름 가져오기” 표준 정의
- 의미: 견적(quote)의 title 값을 조회하여 모든 흐름에서 표시할 “행복여행 이름”을 일관되게 반환
- 소스: quote.title (단일 진실의 근원)
- 식별자 연결 규칙:
  - 우선 순위 1: quote_id (안정적 공개 식별자)
  - 우선 순위 2: id (DB 내부 기본키)
  - 예약에서 참조: reservation.re_quote_id → quote.quote_id

### 사용 지침
- 공용 헬퍼를 통해 안전하게 타이틀 확보: `lib/getQuoteTitle.ts`
  - `resolveLocalQuoteTitle(q)`: 전달 객체 내에서 즉시 추출 (title/quote.title/quote_info.title)
  - `fetchQuoteTitle({ quote_id?, id? })`: Supabase에서 조회, quote_id 우선, 캐시 활용
  - `ensureQuoteTitle(input)`: 로컬 → 원격 순서로 타이틀 확보 (권장)

### 간단 계약
- 입력: { quote_id?: string; id?: string } 또는 타이틀/참조를 가진 객체
- 출력: Promise<string | undefined> (타이틀)
- 실패: 식별자 불충분 또는 접근 오류 시 undefined

### 예시 (React 컴포넌트 내부)
```ts
import { ensureQuoteTitle } from '@/lib/getQuoteTitle';

// q: { title?, quote_id?, id?, reservation? } 형태
const title = await ensureQuoteTitle({ quote_id: q.quote_id, id: q.id });
console.log('행복여행 이름:', title);
```

### UI 표준 표기
- 라벨: `행복여행 이름: {title}`
- 폴백 금지: title은 반드시 존재한다는 전제. 부득이할 경우 헬퍼로 보정 후 표시.

## 🚫 절대 금지 사항
### 폴더 구조 변경 절대 금지
- **기존 폴더 구조를 임의로 변경하거나 새로운 폴더를 생성하지 말 것**
- **예시**: `airport/`, `cruise/`, `hotel/`, `rentcar/`, `tour/`, `vehicle/` 등의 서비스 폴더
- **예외**: 명시적으로 폴더 구조 변경을 요청받은 경우에만 수행
- **이유**: 프로젝트 구조의 일관성 유지 및 혼란 방지를 위함
- **원칙**: 기존 파일 편집은 허용, 새 폴더 생성은 금지

### 데이터베이스 구조 확인 금지
- **매번 데이터베이스 테이블 구조를 확인하지 말 것**
- **sql/db.csv 파일에 정의된 구조를 참조할 것**
- **실제 DB와 코드 불일치시에만 구조 확인 수행**
- **이유**: 불필요한 API 호출 방지 및 개발 효율성 향상
- **원칙**: 위 데이터베이스 구조 섹션의 정보를 우선 사용

## 🎯 크루즈 패턴 적용 체크리스트 (모든 서비스 필수)
### ✅ 데이터베이스 구조
- [ ] `*_price` 테이블: 서비스별/카테고리별 여러 행으로 가격 옵션 정의
- [ ] `reservation_*` 테이블: 단일 행으로 선택된 메인 서비스 저장
- [ ] `*_price_code` 필드: 선택된 주요 서비스의 코드 저장
- [ ] `request_note` 필드: 추가 선택된 서비스들의 상세 정보 기록

### ✅ 예약 중복 방지 원칙 (모든 서비스 필수)
- [ ] **하나의 견적 ID당 하나의 예약만 허용**: `re_quote_id`별로 중복 예약 방지
- [ ] **기존 예약 확인**: 예약 생성 전 해당 견적의 기존 예약 존재 여부 검사
- [ ] **수정 모드 지원**: 기존 예약이 있으면 새로 생성하지 않고 수정 페이지로 리다이렉트
- [ ] **UI 상태 표시**: 기존 예약이 있으면 "수정하기" 버튼으로 변경
- [ ] **데이터 무결성**: `reservation` 테이블에서 `(re_user_id, re_quote_id, re_type)` 유니크 제약 조건 권장

### ✅ UI 구현
- [ ] 카테고리별 서비스 선택 카드 UI (크루즈 객실 선택과 동일)
- [ ] 다중 선택 가능한 토글 방식 인터페이스
- [ ] 실시간 총 금액 계산 및 표시
- [ ] 선택된 서비스 개수 및 상세 정보 표시

### ✅ 데이터 처리
- [ ] 가격 옵션 로드: `*_price` 테이블에서 카테고리별 조회
- [ ] 서비스 분류: 카테고리별로 필터링 및 그룹화
- [ ] 메인 예약 생성: `reservation` 테이블에 기본 예약 정보
- [ ] 서비스 예약 저장: 선택된 메인 서비스 + 추가 서비스 요청사항

### ✅ 코드 검증 포인트
```tsx
// 1. 가격 옵션 로드 확인
const priceOptions = await loadServicePriceOptions(serviceCode);
console.log('📋 로드된 가격 옵션:', priceOptions.length, '개');

// 2. 선택된 서비스 확인  
console.log('🎯 선택된 서비스:', selectedServices.map(s => s.service_code));

// 3. 저장 데이터 확인
console.log('💾 예약 데이터:', reservationServiceData);

// 4. request_note 내용 확인
console.log('📝 요청사항:', reservationServiceData.request_note);
```
