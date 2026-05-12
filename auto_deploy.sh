#!/bin/bash
# ═══════════════════════════════════════════════════════════
# 홍삼한방타운 ERP — 자동 배포 스크립트 (Phase D)
# Cron: 0 6 * * * /home/ubuntu/auto_deploy.sh >> /var/log/erp_deploy.log 2>&1
# ═══════════════════════════════════════════════════════════

REPO_DIR="/home/ubuntu/hongsam-erp-backend"
DEPLOY_DIR="/var/www/hongsam-erp"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"

cd "$REPO_DIR" || { echo "$LOG_PREFIX 리포지토리 디렉토리 없음: $REPO_DIR"; exit 1; }

# 원격 변경사항 확인
git fetch origin main 2>/dev/null

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "$LOG_PREFIX 새 커밋 감지. 자동 배포 시작..."
    echo "$LOG_PREFIX LOCAL:  $LOCAL"
    echo "$LOG_PREFIX REMOTE: $REMOTE"
    
    git pull origin main
    sudo cp -r * "$DEPLOY_DIR/"
    
    echo "$LOG_PREFIX ✅ 배포 완료. $(git log --oneline -1)"
else
    echo "$LOG_PREFIX 변경 없음. 스킵."
fi
