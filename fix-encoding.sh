#!/bin/bash

# 전체 프로젝트 UTF-8 인코딩 재설정 스크립트

echo "🔧 Next.js 프로젝트 인코딩 문제 해결 중..."

# 1. node_modules 및 빌드 파일 정리
echo "📁 임시 파일 정리 중..."
rm -rf node_modules
rm -rf .next
rm -f package-lock.json

# 2. 의존성 재설치
echo "📦 의존성 재설치 중..."
npm install

# 3. Git 인코딩 설정
echo "⚙️ Git 인코딩 설정 중..."
git config core.autocrlf false
git config core.safecrlf true
git config core.precomposeunicode true
git config core.quotepath false
git config i18n.filesEncoding utf-8
git config i18n.logOutputEncoding utf-8

# 4. TypeScript/JavaScript 파일들의 BOM 제거 및 UTF-8 변환
echo "🔄 파일 인코딩 변환 중..."
find . -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" | grep -v node_modules | while read file; do
    # BOM 제거 (Windows에서 발생할 수 있음)
    sed -i '1s/^\xEF\xBB\xBF//' "$file" 2>/dev/null || true
done

# 5. 개발 서버 시작
echo "🚀 개발 서버 시작..."
npm run dev

echo "✅ 인코딩 문제 해결 완료!"
echo "브라우저에서 http://localhost:3000 으로 접속하세요."
