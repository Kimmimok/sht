# PowerShell 인코딩 문제 해결 스크립트
Write-Host "🔧 Next.js 프로젝트 인코딩 문제 해결 중..." -ForegroundColor Yellow

# 1. 임시 파일 정리
Write-Host "📁 임시 파일 정리 중..." -ForegroundColor Cyan
if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
if (Test-Path ".next") { Remove-Item -Recurse -Force ".next" }
if (Test-Path "package-lock.json") { Remove-Item -Force "package-lock.json" }

# 2. Git 인코딩 설정
Write-Host "⚙️ Git 인코딩 설정 중..." -ForegroundColor Cyan
git config core.autocrlf false
git config core.safecrlf true
git config core.precomposeunicode true
git config core.quotepath false
git config i18n.filesEncoding utf-8
git config i18n.logOutputEncoding utf-8

# 3. 의존성 재설치
Write-Host "📦 의존성 재설치 중..." -ForegroundColor Cyan
npm install

# 4. 파일 인코딩 정보 확인
Write-Host "🔍 주요 파일 인코딩 확인..." -ForegroundColor Cyan
$files = @(
    "app\layout.tsx",
    "app\page.tsx", 
    "app\login\page.tsx",
    "components\Header.tsx",
    "styles\globals.css"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw -Encoding UTF8
        $content | Set-Content $file -Encoding UTF8 -NoNewline
        Write-Host "✅ $file - UTF8 인코딩 적용" -ForegroundColor Green
    }
}

Write-Host "✅ 인코딩 문제 해결 완료!" -ForegroundColor Green
Write-Host "이제 'npm run dev'로 개발 서버를 시작하세요." -ForegroundColor Yellow
