# ============================
# manual-commit-confirm.ps1
# ============================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Write-Host "🚀 Git 수동 업로드 시작"

# Git 저장소 경로
$repoPath = "C:\Users\saint\cruise"
# 브랜치 이름
$branch = "main"

# 저장소 경로로 이동
Set-Location $repoPath

Write-Host "🚀 Git 수동 업로드 시작 (경로: $repoPath)"

# 원격 저장소 확인
$remoteInfo = git remote -v
if ([string]::IsNullOrWhiteSpace($remoteInfo)) {
    Write-Host "⚠️ 원격 저장소가 설정되지 않았습니다. GitHub에 연결하려면 아래 명령을 실행하세요:"
    Write-Host "   git remote add origin <GitHub_Repo_URL>"
} else {
    Write-Host "`n🌐 현재 원격 저장소:"
    Write-Host $remoteInfo
}

# 변경된 파일 목록 가져오기
$changedFiles = git status --porcelain | ForEach-Object { $_.Substring(3) } | Select-Object -Unique

if ($changedFiles.Count -eq 0) {
    Write-Host "ℹ️ 변경된 파일이 없습니다. 업로드 중단."
    exit
}

# 변경된 파일 목록 출력
Write-Host "`n🔍 변경된 파일 목록:"
$changedFiles | ForEach-Object { Write-Host "- $_" }

# 사용자에게 업로드 여부 확인
$response = Read-Host "`n이 변경사항을 커밋/업로드 하시겠습니까? (Y/N)"

if ($response -ne "Y" -and $response -ne "y") {
    Write-Host "🚫 업로드를 취소했습니다."
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

chcp 65001 > $null

