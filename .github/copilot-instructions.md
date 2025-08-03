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

### 데이터베이스 구조 (중요!)
- **중앙 집중식 견적 모델**: `quote` → `quote_item` → 서비스 테이블들
- **quote_item 구조**: 모든 서비스(객실, 차량, 공항, 호텔 등)는 quote_item을 통해 관리
- **서비스 관계**: `quote_item(service_type, service_ref_id)` → `airport`, `hotel`, `rentcar`, `quote_room`, `quote_car`
- **가격 코드 시스템**: `*_price_code` 테이블들이 동적 가격 계산의 핵심
- **관계**: `room_price_code(room_info:room_code)`, `car_price_code(car_info:car_code)` 등 중첩 조인 활용
- **예약 시스템**: `reservation` → `reservation_room`, `reservation_car` 테이블 구조
- **역할 기반 권한**: `users.role` → 'guest', 'member'(customer), 'manager', 'admin' 4단계

### 서비스 생성 패턴 (quote_item 구조)
```tsx
// ✅ 표준 서비스 생성 패턴
// 1. 서비스 테이블에 데이터 삽입
const { data: serviceData, error: serviceError } = await supabase
  .from('airport') // 또는 hotel, rentcar 등
  .insert(serviceFormData)
  .select()
  .single();

// 2. quote_item에 연결 정보 생성
const { data: itemData, error: itemError } = await supabase
  .from('quote_item')
  .insert({
    quote_id: quoteId,
    service_type: 'airport', // 'hotel', 'rentcar', 'quote_room', 'quote_car'
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

## 필수 개발 패턴 요약 (2025.07.30 업데이트)
1. **데이터 조회**: quote_item 중심, 중첩 조인 활용
2. **인증**: 견적자(Supabase 인증만) → 예약자(users 테이블 등록) → 매니저 → 관리자
3. **UI**: PageWrapper + SectionBox 조합, 로딩 상태 표준화
4. **폼**: 배열 상태 관리, TypeScript 타입 안전성
5. **가격**: 비동기 가격 코드 업데이트 분리
6. **라우팅**: 동적 라우팅, 역할별 레이아웃 사용
7. **권한 관리**: 역할별 자동 리다이렉트, RLS 정책으로 데이터 보안
8. **사용자 플로우**: 견적자 → 예약시 자동 회원 등록 → 역할별 대시보드 이동
