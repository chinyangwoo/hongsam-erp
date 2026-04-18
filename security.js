// Security Module JS - 로그인 감사 로그 및 실시간 접속자 모니터링
document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = 'http://43.203.237.63:3001/api';
    const loginLogBody = document.getElementById('loginLogBody');
    const btnRefresh = document.getElementById('btnRefreshLogs');

    // KPI Elements
    const kpiTotal = document.getElementById('kpiTotalLogins');
    const kpiUnique = document.getElementById('kpiUniqueUsers');
    const kpiFailed = document.getElementById('kpiFailedLogins');
    const kpiLast = document.getElementById('kpiLastLogin');
    const secOnline = document.getElementById('secOnlineCount');
    const onlineGrid = document.getElementById('onlineUsersGrid');

    // 로그인 로그 불러오기
    async function loadLoginLogs() {
        try {
            const res = await fetch(`${API_BASE}/db/login_logs`);
            let logs = await res.json();

            if (!Array.isArray(logs)) logs = [];

            // 최신순 정렬
            logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            // KPI 업데이트
            const today = new Date().toISOString().split('T')[0];
            const todayLogs = logs.filter(l => l.timestamp && l.timestamp.startsWith(today));
            const successLogs = todayLogs.filter(l => l.result === 'success');
            const failLogs = todayLogs.filter(l => l.result === 'fail');
            const uniqueIds = [...new Set(successLogs.map(l => l.emp_id))];

            if (kpiTotal) kpiTotal.textContent = todayLogs.length;
            if (kpiUnique) kpiUnique.textContent = uniqueIds.length;
            if (kpiFailed) kpiFailed.textContent = failLogs.length;
            if (kpiLast && logs.length > 0) {
                const last = new Date(logs[0].timestamp);
                kpiLast.textContent = `${last.getHours()}:${String(last.getMinutes()).padStart(2,'0')}`;
            }

            // 테이블 렌더링
            if (logs.length === 0) {
                loginLogBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px; color: var(--text-secondary);">기록된 로그인 이력이 없습니다.</td></tr>`;
                return;
            }

            loginLogBody.innerHTML = '';
            logs.forEach((log, idx) => {
                const tr = document.createElement('tr');
                const dt = new Date(log.timestamp);
                const timeStr = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}:${String(dt.getSeconds()).padStart(2,'0')}`;
                
                const resultBadge = log.result === 'success' 
                    ? '<span class="badge-success">성공</span>' 
                    : '<span class="badge-fail">실패</span>';

                const deviceIcon = (log.device || '').includes('Mobile') 
                    ? '<i class="fa-solid fa-mobile-screen-button"></i>' 
                    : '<i class="fa-solid fa-desktop"></i>';

                tr.innerHTML = `
                    <td>${idx + 1}</td>
                    <td>${timeStr}</td>
                    <td>${log.emp_id || '-'}</td>
                    <td>${log.name || '-'}</td>
                    <td>${resultBadge}</td>
                    <td style="font-family: monospace; font-size:0.8rem;">${log.ip || '-'}</td>
                    <td>${deviceIcon} ${log.device || '-'}</td>
                `;
                loginLogBody.appendChild(tr);
            });

        } catch (err) {
            console.warn('[Security] 로그 로드 실패:', err);
            loginLogBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px; color: var(--text-secondary);">서버 연결 실패. 잠시 후 다시 시도해주세요.</td></tr>`;
        }
    }

    // 실시간 접속자 표시
    function renderOnlineUsers() {
        const onlineIds = window.activeOnlineUsers || [];
        if (secOnline) secOnline.textContent = onlineIds.length;
        if (!onlineGrid) return;

        let employees = [];
        try { employees = JSON.parse(localStorage.getItem('hongsam_employees') || '[]'); } catch(e) {}

        if (onlineIds.length === 0) {
            onlineGrid.innerHTML = '<p style="padding: 20px; color: var(--text-secondary);">현재 접속 중인 사용자가 없습니다.</p>';
            return;
        }

        onlineGrid.innerHTML = '';
        onlineIds.forEach(empId => {
            const emp = employees.find(e => e.emp_id === String(empId)) || {};
            const photoSrc = emp.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name || empId)}&background=random`;
            
            const card = document.createElement('div');
            card.className = 'online-user-card';
            card.innerHTML = `
                <img src="${photoSrc}" alt="user">
                <div class="ou-info">
                    <span class="ou-name">${emp.name || '사번 ' + empId}</span>
                    <span class="ou-since">${emp.department || ''} · 접속 중</span>
                </div>
                <div class="pulse-dot"></div>
            `;
            onlineGrid.appendChild(card);
        });
    }

    // 소켓으로 온라인 업데이트 수신 시 자동 갱신
    const origRefresh = window.refreshMessengerOnlineStatus;
    window.refreshMessengerOnlineStatus = function(ids) {
        if (origRefresh) origRefresh(ids);
        window.activeOnlineUsers = ids;
        renderOnlineUsers();
    };

    // 초기 로드
    loadLoginLogs();
    setTimeout(renderOnlineUsers, 600);

    // 새로고침 버튼
    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            loadLoginLogs();
            renderOnlineUsers();
        });
    }

    // 30초마다 자동 갱신
    setInterval(() => {
        loadLoginLogs();
        renderOnlineUsers();
    }, 30000);
});
