$userFolders = @("app", "components", "pages", "src")
$patterns = "보기", "하기", "작성"

foreach ($folder in $userFolders) {
    $path = "C:\Users\saint\cruise\$folder"

    if (Test-Path $path) {
        Get-ChildItem -Path $path -Recurse -Include *.tsx, *.ts, *.js, *.jsx, *.html |
        ForEach-Object {
            $content = Get-Content $_.FullName -Raw

            foreach ($pattern in $patterns) {
                # 일반 문자열로 치환 (정규식 사용 안 함)
                $content = $content.Replace($pattern, "")
            }

            Set-Content -Path $_.FullName -Value $content -Encoding UTF8
            Write-Host "✅ Updated:" $_.FullName
        }
    } else {
        Write-Host "⚠️ 폴더 없음: $folder"
    }
}
