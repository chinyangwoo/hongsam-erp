// Phase 2: Centralized Cloud Sync Protocol
// 이 스크립트는 기존의 Phase 1 (로컬 전용 동작)을 
// 백엔드 클라우드 데이터베이스(Node.js API)와 양방향 동기화하도록 만듭니다.

(function() {
    // AWS EC2에 띄워질 Node.js 백엔드 주소
    const API_BASE = 'http://43.203.237.63:3001/api';
    
    console.log("[Phase 2] Cloud Synchronization Engine Initialization...");

    // 1. localStorage.setItem을 가로채서(Hijacking) 서버로 자동 Push
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
        // 기존 1단계 방식대로 브라우저 로컬 스토리지에 즉각 저장 (체감속도 0초)
        originalSetItem.apply(this, arguments);

        // 우리가 중앙 DB에서 관리하는 핵심 키 목록
        const targetKeys = ['hongsam_employees', 'erp_users_db', 'erp_notices', 'board_posts'];
        
        // 데이터가 변경될 때마다 몰래(비동기로) 서버에 Push 백업
        if (targetKeys.includes(key)) {
            try {
                fetch(`${API_BASE}/db/${key}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: value
                }).then(res => {
                    if(res.ok) console.log(`[Cloud Sync] ${key} 데이터 서버 영구동기화 완료.`);
                }).catch(err => {
                    // 서버가 아직 안켜져 있을 경우 오프라인 대기
                    console.warn(`[Cloud Sync] 서버 오프라인. ${key}는 우선 로컬에만 보관됩니다.`);
                });
            } catch (e) {}
        }
    };
    
    // 2. 앱 구동 시 (새로고침) 서버로부터 최신 데이터를 중앙조회(Pull)
    window.initCloudSync = async function() {
        try {
            const res = await fetch(`${API_BASE}/db`);
            if (res.ok) {
                const cloudData = await res.json();
                const targetKeys = ['hongsam_employees', 'erp_users_db', 'erp_notices', 'board_posts'];
                let uiNeedsRefresh = false;

                targetKeys.forEach(key => {
                    const localDataStr = originalSetItem.call ? localStorage.getItem(key) : null;
                    let localData = [];
                    try { localData = JSON.parse(localDataStr || "[]"); } catch(e){}
                    
                    let remoteData = cloudData[key];
                    let isRemoteValid = Array.isArray(remoteData) ? remoteData.length > 0 : (remoteData && Object.keys(remoteData).length > 0);
                    let isLocalValid = Array.isArray(localData) ? localData.length > 0 : (localData && Object.keys(localData).length > 0);

                    // A. 서버는 텅 비었으나 대표님 PC에 데이터가 있다면 (무사 이관 프로세스)
                    if (!isRemoteValid && isLocalValid) {
                        console.log(`[Cloud Sync] 서버 ${key} 비어있음. 대표님 로컬 데이터를 서버로 밀어넣습니다.`);
                        fetch(`${API_BASE}/db/${key}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: localDataStr
                        }).catch(e=>e);
                    } 
                    // B. 서버에 정상적 데이터가 있다면 서버 데이터를 로컬로 강제 적용 (타 PC 사원들은 이것을 받아갑니다)
                    else if (isRemoteValid) {
                        const remoteDataStr = JSON.stringify(remoteData);
                        if (localDataStr !== remoteDataStr) {
                            // 서버 데이터 로컬에 덮어쓰기
                            originalSetItem.call(localStorage, key, remoteDataStr);
                            uiNeedsRefresh = true;
                        }
                    }
                });

                console.log("[Phase 2] Cloud Data Integration Complete.");
                if (uiNeedsRefresh) {
                    console.log("[Cloud Sync] 새 데이터 발견. 화면 업데이트를 위해 새로고침 합니다.");
                    window.location.reload();
                }
            }
        } catch(err) {
            console.warn("[Phase 2] 백엔드 서버가 아직 동작하지 않습니다. Phase 1 (오프라인 모드)로 구동합니다.", err);
        }
    };
    
    // 페이지 진입 즉시 동기화 검사 실행
    initCloudSync();
})();
