# 홍삼한방타운 ERP - 원클릭 자동 배포 (자동 경로 인식 & 서버 자동 재기동 버전)
$projectDir = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
if (!$projectDir) { $projectDir = $PSScriptRoot }
if (!$projectDir) { $projectDir = "g:\다른 컴퓨터\노트북\Documents\HONGSAM SPA ERP(전)" }
$pemKey = "$projectDir\halouniverse-new.pem"

Set-Location $projectDir
Write-Host "서버에 올리는 중..." -ForegroundColor Yellow

git add -A
git commit --amend -m "update" 2>$null
git commit -m "update" 2>$null
git push origin main --force 2>&1

Write-Host "서버에서 받는 중 및 AI 서버 재기동 중..." -ForegroundColor Yellow
ssh -i "$pemKey" -o StrictHostKeyChecking=no ubuntu@43.203.237.63 "cd /var/www/hongsam-erp && git pull origin main && pm2 restart all"

Write-Host ""
Write-Host "완료! http://43.203.237.63 에서 확인하세요" -ForegroundColor Green
