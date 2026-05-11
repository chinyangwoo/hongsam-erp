#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# 홍삼빌호텔 영업데이터 자동 동기화 스크립트
# 매일 20:00 KST 실행 (crontab)
# 소스: hongsam.dothome.co.kr/api.php → /var/www/hongsam-erp/hotel_data_cache.json
# ═══════════════════════════════════════════════════════════════

HOTEL_API="https://hongsam.dothome.co.kr/api.php?action=load"
CACHE_FILE="/var/www/hongsam-erp/hotel_data_cache.json"
LOG_FILE="/var/log/hotel_sync.log"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 호텔 데이터 동기화 시작..." >> "$LOG_FILE"

# API에서 데이터 가져오기
HTTP_CODE=$(curl -s -o /tmp/hotel_data_tmp.json -w "%{http_code}" "$HOTEL_API" --max-time 15)

if [ "$HTTP_CODE" = "200" ]; then
    # JSON 유효성 검사
    if python3 -c "import json; json.load(open('/tmp/hotel_data_tmp.json'))" 2>/dev/null; then
        RECORD_COUNT=$(python3 -c "import json; print(len(json.load(open('/tmp/hotel_data_tmp.json'))))")
        cp /tmp/hotel_data_tmp.json "$CACHE_FILE"
        chmod 644 "$CACHE_FILE"
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ 성공: ${RECORD_COUNT}건 동기화 완료 → ${CACHE_FILE}" >> "$LOG_FILE"
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ 실패: JSON 파싱 오류" >> "$LOG_FILE"
    fi
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ 실패: HTTP ${HTTP_CODE}" >> "$LOG_FILE"
fi

rm -f /tmp/hotel_data_tmp.json
