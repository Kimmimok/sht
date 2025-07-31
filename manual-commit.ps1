# ============================
# manual-commit.ps1
# ============================

# Git 저장소 경로
$repoPath = "C:\Users\saint\cruise"
# 브랜치 이름
$branch = "main"

# 저장소 경로로 이동
Set-Location $repoPath

Write-Host "🚀 Git 수동 업로드 시작 (경로: $repoPath)"

# 변경된 파일 목록 가져오기
$changedFiles = git status --porcelain | ForEach-Object { $_.Substring(3) } | Select-Object -Unique

if ($changedFiles.Count -eq 0) {
    Write-Host "ℹ️ 변경된 파일이 없습니다. 업로드 중단."
    exit
}

# 커밋 메시지 생성 (시간 + 파일명)
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$commitMessage = "Manual commit ($timestamp): " + ($changedFiles -join ", ")

# Git add → commit → push
git add .
git commit -m $commitMessage
git push origin $branch

Write-Host "✅ 업로드 완료: $commitMessage"
