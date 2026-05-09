# ═══════════════════════════════════════════════════════
#  홍삼한방타운 ERP - 원클릭 자동 배포 스크립트
#  사용법: 터미널에서  .\deploy.ps1  실행
# ═══════════════════════════════════════════════════════

$ErrorActionPreference = "Continue"
$projectDir = "c:\Users\회사\Documents\HONGSAM SPA ERP(전)"
$pemKey = "$projectDir\halouniverse-new.pem"
$serverIP = "43.203.237.63"
$serverUser = "ubuntu"
$serverPath = "/var/www/hongsam-erp"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  홍삼한방타운 ERP - 원클릭 자동 배포" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Git 커밋 & 푸시 ──
Write-Host "[1/3] Git 변경사항 커밋 중..." -ForegroundColor Yellow
Set-Location $projectDir
git add -A
$commitMsg = "deploy: " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
git commit -m $commitMsg 2>&1 | Out-Null

Write-Host "[2/3] GitHub에 푸시 중..." -ForegroundColor Yellow
git push origin main 2>&1

# ── Step 2: 서버에서 Pull ──
Write-Host "[3/3] 서버에서 최신 코드 Pull 중..." -ForegroundColor Yellow
ssh -i $pemKey -o StrictHostKeyChecking=no "$serverUser@$serverIP" "cd $serverPath && git pull origin main"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  배포 완료! http://$serverIP/ 에서 확인하세요" -ForegroundColor Green
Write-Host "  (Ctrl+Shift+R 로 강력 새로고침)" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
