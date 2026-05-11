# 홍삼한방타운 ERP - 원클릭 자동 배포
$projectDir = "c:\Users\회사\Documents\HONGSAM SPA ERP(전)"
$pemKey = "$projectDir\halouniverse-new.pem"

Set-Location $projectDir
Write-Host "서버에 올리는 중..." -ForegroundColor Yellow

git add -A
git commit --amend -m "update" 2>$null
git commit -m "update" 2>$null
git push origin main --force 2>&1

Write-Host "서버에서 받는 중..." -ForegroundColor Yellow
ssh -i $pemKey -o StrictHostKeyChecking=no ubuntu@43.203.237.63 "cd /var/www/hongsam-erp && git pull origin main"

Write-Host ""
Write-Host "완료! http://43.203.237.63 에서 확인하세요" -ForegroundColor Green
