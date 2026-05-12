// Check Auth Status (Mock Session)
if (localStorage.getItem('isLoggedIn') !== 'true') {
    // Not logged in -> Redirect immediately
    window.location.replace('login.html');
}

document.addEventListener('DOMContentLoaded', () => {

    // Update userName and Avatar if saved
    const currentUser = localStorage.getItem('currentUser');
    let currentUserName = localStorage.getItem('currentUserName');
    if (currentUser) {
        // HR DB에서 최신 사원 이름 확인 및 보정
        let employees = [];
        try { employees = JSON.parse(localStorage.getItem('hongsam_employees') || '[]'); } catch (_) {}
        const empRecord = employees.find(e => e.emp_id === currentUser);
        if (empRecord && empRecord.name && currentUserName !== empRecord.name) {
            currentUserName = empRecord.name;
            localStorage.setItem('currentUserName', currentUserName);
        }

        // Sync name
        const nameSpans = document.querySelectorAll('.user-info .name');
        nameSpans.forEach(span => {
            span.innerText = currentUserName ? `${currentUserName} (${currentUser})` : `사번: ${currentUser}`;
        });

        // Sync photo from HR DB (if exists - empRecord already loaded above)
        
        const avatars = document.querySelectorAll('.user-info .avatar');
        avatars.forEach(img => {
            if (empRecord && empRecord.photo) {
                img.src = empRecord.photo;
            } else if (currentUserName) {
                // If no uploaded photo, show their name initial instead of "CE"
                img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserName)}&background=0D8ABC&color=fff&rounded=true&bold=true`;
            }
        });

        // --- 직급 표시 동적 업데이트 ---
        // 하드코딩된 "대표이사 (마스터)" 대신 로그인한 사원의 실제 직급/부서 표시
        const roleSpans = document.querySelectorAll('.user-info .role');
        if (roleSpans.length > 0) {
            const rankLabelMap = {
                '마스터': '대표(마스터)',
                '호스트': '총지배인(호스트)',
                '큐레이터': '팀장(큐레이터)',
                '크루': '팀원(크루)',
                '알바': '알바',
                '계약직': '계약직'
            };
            let roleText = '사원'; // 기본값
            if (empRecord) {
                const rankLabel = rankLabelMap[empRecord.rank] || empRecord.rank || '사원';
                const deptLabel = empRecord.department || '';
                roleText = deptLabel ? `${deptLabel} / ${rankLabel}` : rankLabel;
            }
            roleSpans.forEach(span => {
                span.innerText = roleText;
            });
        }

        // ══════════════════════════════════════════════════════
        // 역할 기반 권한 제어 (ID 범위별)
        // ══════════════════════════════════════════════════════
        // ADMIN    : 001 — 모든 권한 (편집/삭제 포함)
        // 임원급   : 001~009 (마스터/호스트) — 전 메뉴 열람, 편집/삭제 불가
        // 팀장급   : 010~019 (큐레이터) — HR 제외 전 메뉴 열람, 편집/삭제 불가
        // 팀원급   : 020~099 (크루) — 트래픽/재고/시설만 열람
        // ══════════════════════════════════════════════════════

        const empNum = parseInt(currentUser, 10);
        const ADMIN_IDS = ['001'];
        let isAdmin = ADMIN_IDS.includes(currentUser);
        if (empRecord && empRecord.is_admin) isAdmin = true;

        // 역할 결정
        let userRole = 'crew'; // 기본값: 팀원급
        if (isAdmin) {
            userRole = 'admin';
        } else if (empNum >= 1 && empNum <= 9) {
            userRole = 'executive'; // 임원급
        } else if (empNum >= 10 && empNum <= 19) {
            userRole = 'leader'; // 팀장급
        } else {
            userRole = 'crew'; // 팀원급 (020~099)
        }

        // 역할별 접근 가능 메뉴 정의
        const roleMenuAccess = {
            admin: 'all', // 모든 메뉴 + 편집/삭제
            executive: [ // 임원급: 모든 메뉴 열람 (편집/삭제 불가)
                'index.html', 'traffic.html', 'hr.html', 'sales.html', 'reservation.html',
                'inventory.html', 'facility.html', 'simulation.html',
                'board.html', 'messenger.html', 'document.html', 'approval.html'
            ],
            leader: [ // 팀장급: 모든 메뉴 열람 (본인 인사정보 포함)
                'index.html', 'traffic.html', 'hr.html', 'sales.html', 'reservation.html',
                'inventory.html', 'facility.html', 'simulation.html',
                'board.html', 'messenger.html', 'document.html', 'approval.html'
            ],
            crew: [ // 팀원급: 트래픽, 재고, 시설, 전자결재, 인사(본인) — 예약관리 불가
                'traffic.html', 'hr.html', 'inventory.html', 'facility.html',
                'board.html', 'messenger.html', 'approval.html'
            ]
        };

        // 전체 메뉴 목록 (사이드바 nav-item에 해당하는 페이지들)
        const allMenuPages = [
            { url: 'index.html', name: '통합 대시보드' },
            { url: 'traffic.html', name: '트래픽 모니터링' },
            { url: 'hr.html', name: 'HR/근태 관리' },
            { url: 'sales.html', name: '영업관리' },
            { url: 'reservation.html', name: '예약/대관 관리' },
            { url: 'inventory.html', name: '재고관리' },
            { url: 'facility.html', name: '시설현황' },
            { url: 'simulation.html', name: '경영시뮬레이션' },
            { url: 'board.html', name: '전사 게시판' },
            { url: 'messenger.html', name: '사내 메신저' },
            { url: 'document.html', name: '문서 관리' },
            { url: 'approval.html', name: '전자결재' }
        ];

        // --- 1) 시스템 보안: ADMIN 전용 ---
        document.querySelectorAll('.nav-admin-only').forEach(el => {
            el.style.display = isAdmin ? '' : 'none';
        });
        if (!isAdmin && window.location.pathname.includes('security.html')) {
            alert('접근 권한이 없습니다. 관리자(ADMIN)만 접근할 수 있는 메뉴입니다.');
            window.location.replace('index.html');
        }

        // --- 2) 역할 기반 메뉴 접근 제어 ---
        if (userRole !== 'admin') {
            const allowedPages = roleMenuAccess[userRole];

            allMenuPages.forEach(menu => {
                if (!allowedPages.includes(menu.url)) {
                    // 사이드바 메뉴 숨기기
                    const navItem = document.querySelector(`.nav-item[href="${menu.url}"]`);
                    if (navItem) navItem.style.display = 'none';

                    // URL 직접 접속 차단
                    if (window.location.pathname.includes(menu.url)) {
                        alert(`[${menu.name}] 접근 권한이 없습니다.\n귀하의 권한 등급: ${userRole === 'executive' ? '임원급' : userRole === 'leader' ? '팀장급' : '팀원급'}`);
                        // 팀원급은 대시보드 접근 불가 → 트래픽으로 리다이렉트
                        const fallback = allowedPages.includes('index.html') ? 'index.html' : allowedPages[0];
                        window.location.replace(fallback);
                    }
                }
            });
        }

        // --- 3) 편집/삭제 권한 제어 (임원급, 팀장급) ---
        if (userRole === 'executive' || userRole === 'leader') {
            // 편집/삭제 버튼을 전역적으로 비활성화 (페이지 로드 후)
            document.querySelectorAll('.btn-edit, .btn-delete, [data-action="edit"], [data-action="delete"]').forEach(btn => {
                btn.style.display = 'none';
            });
            // 읽기전용 뱃지 표시 추가
            const headerTitle = document.querySelector('.header-title');
            if (headerTitle && !headerTitle.querySelector('.readonly-badge')) {
                const badge = document.createElement('span');
                badge.className = 'readonly-badge';
                badge.innerHTML = '<i class="fa-solid fa-eye"></i> 열람전용';
                badge.style.cssText = 'display:inline-flex;align-items:center;gap:4px;background:rgba(245,158,11,0.15);color:#F59E0B;font-size:0.72rem;font-weight:700;padding:3px 10px;border-radius:6px;border:1px solid rgba(245,158,11,0.3);margin-left:12px;vertical-align:middle;';
                const h1 = headerTitle.querySelector('h1');
                if (h1) h1.appendChild(badge);
            }
        }

        // 전역 변수로 역할 노출 (다른 모듈에서 참조 가능)
        window.erpUserRole = userRole;
        window.erpIsAdmin = isAdmin;
    }

    // Inject Password Change Button & Modal dynamically
    const sidebarFooters = document.querySelectorAll('.sidebar-footer');
    sidebarFooters.forEach(footer => {
        if(!footer.querySelector('.change-pwd-btn')) {
            const pwdBtn = document.createElement('button');
            pwdBtn.className = 'change-pwd-btn';
            pwdBtn.innerHTML = '<i class="fa-solid fa-key"></i>';
            pwdBtn.title = '비밀번호 변경';
            pwdBtn.style.background = 'none';
            pwdBtn.style.border = 'none';
            pwdBtn.style.color = 'var(--text-secondary)';
            pwdBtn.style.cursor = 'pointer';
            pwdBtn.style.marginLeft = '10px';
            pwdBtn.style.fontSize = '1.1rem';
            
            // Insert before logout button
            const logoutBtn = footer.querySelector('.logout-btn');
            if(logoutBtn) {
                footer.insertBefore(pwdBtn, logoutBtn);
                pwdBtn.style.marginRight = '10px';
                logoutBtn.style.marginLeft = '0';
            }
        }
    });

    // Create Modal HTML
    if(!document.getElementById('pwdModal')) {
        const modalHtml = `
            <div class="modal-overlay" id="pwdModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); backdrop-filter:blur(5px); z-index:9999; align-items:center; justify-content:center;">
                <div class="modal-content glassmorphism" style="width:400px; padding:30px; background:var(--bg-sidebar); border-radius:var(--radius-lg); border:1px solid rgba(255,255,255,0.1);">
                    <div style="display:flex; justify-content:space-between; margin-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:15px;">
                        <h2 style="font-size:1.3rem;">비밀번호 변경</h2>
                        <button id="closePwdModal" style="background:none; border:none; color:#fff; cursor:pointer; font-size:1.2rem;"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div>
                        <div style="margin-bottom:15px;">
                            <label style="display:block; margin-bottom:8px; font-size:0.9rem; color:#ccc;">현재 비밀번호</label>
                            <input type="password" id="currentPwd" style="width:100%; padding:10px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:5px;" placeholder="입력하세요">
                        </div>
                        <div style="margin-bottom:25px;">
                            <label style="display:block; margin-bottom:8px; font-size:0.9rem; color:#ccc;">새 비밀번호</label>
                            <input type="password" id="newPwd" style="width:100%; padding:10px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:5px;" placeholder="입력하세요">
                        </div>
                        <button id="btnSavePwd" style="width:100%; padding:12px; background:#3B82F6; color:#fff; border:none; border-radius:5px; font-weight:bold; cursor:pointer;">변경 저장</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // Modal Logic
    const pwdModal = document.getElementById('pwdModal');
    const closePwdModal = document.getElementById('closePwdModal');
    const btnSavePwd = document.getElementById('btnSavePwd');
    const changePwdBtns = document.querySelectorAll('.change-pwd-btn');

    changePwdBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('currentPwd').value = '';
            document.getElementById('newPwd').value = '';
            pwdModal.style.display = 'flex';
        });
    });

    closePwdModal.addEventListener('click', () => {
        pwdModal.style.display = 'none';
    });

    btnSavePwd.addEventListener('click', () => {
        const currentPwd = document.getElementById('currentPwd').value.trim();
        const newPwd = document.getElementById('newPwd').value.trim();
        
        if(!currentPwd || !newPwd) {
            alert('모든 필드를 입력해주세요.');
            return;
        }

        const dbStr = localStorage.getItem('erp_users_db');
        let users = dbStr ? JSON.parse(dbStr) : {};
        
        // Also load from hr module
        const hrEmployeesStr = localStorage.getItem('hongsam_employees');
        let hrEmployees = [];
        try { hrEmployees = JSON.parse(hrEmployeesStr || '[]'); } catch (_) {}
        
        hrEmployees.forEach(emp => {
            if (!users[emp.emp_id]) {
                users[emp.emp_id] = { password: emp.login_pw || '0000', name: emp.name };
            }
        });

        if (users[currentUser]) {
            if(users[currentUser].password !== currentPwd) {
                alert('현재 비밀번호가 일치하지 않습니다.');
                return;
            }
            // Success: update password
            users[currentUser].password = newPwd;
            
            // Check if user is in erp_users_db natively
            let originalDb = dbStr ? JSON.parse(dbStr) : {};
            if (!originalDb[currentUser]) {
                originalDb[currentUser] = { password: newPwd, name: users[currentUser].name };
            } else {
                originalDb[currentUser].password = newPwd;
            }
            localStorage.setItem('erp_users_db', JSON.stringify(originalDb));
            
            // Check if user is in hrEmployees and update them locally too for consistency
            let foundInHr = false;
            hrEmployees.forEach(emp => {
                if (emp.emp_id === currentUser) {
                    emp.login_pw = newPwd;
                    foundInHr = true;
                }
            });
            if (foundInHr) {
                localStorage.setItem('hongsam_employees', JSON.stringify(hrEmployees));
            }

            // --- 서버에 저장하여 변경된 비밀번호 유지 ---
            const API_BASE = 'http://43.203.237.63:3001/api';
            const updatedDb = JSON.parse(localStorage.getItem('erp_users_db') || '{}');
            fetch(`${API_BASE}/db/erp_users_db`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedDb)
            }).then(() => console.log('비밀번호 서버 동기화 완료'))
              .catch(err => console.warn('서버 저장 실패:', err));

            alert('비밀번호가 성공적으로 변경되었습니다.\n다음에 로그인할 때 새 비밀번호를 사용하세요.');
            pwdModal.style.display = 'none';
        } else {
            alert('사용자 정보를 찾을 수 없습니다.');
        }
    });

    // Logout Logic (Event Delegation to guarantee it works dynamically and perfectly)
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.logout-btn');
        if (btn) {
            e.preventDefault();
            // confirm() 제거: 일부 앱 환경이나 브라우저에서 대화상자 차단을 선택했을 때, 
            // 리턴값이 먹통이 되거나 에러가 발생해 로그아웃이 진행되지 않는 것을 구조적으로 방지함.
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('currentUser');
            
            // Remove socket login state if exists
            if (window.erpSocket) {
                try { window.erpSocket.disconnect(); } catch(e) {}
            }
            
            window.location.href = 'login.html';
        }
    });
    // Theme Toggle
    const themeToggleBtn = document.getElementById('themeToggle');
    const body = document.body;

    themeToggleBtn.addEventListener('click', () => {
        if (body.classList.contains('dark-theme')) {
            body.classList.remove('dark-theme');
            body.classList.add('light-theme');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        } else {
            body.classList.remove('light-theme');
            body.classList.add('dark-theme');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        }
        // Redraw charts with new colors if needed
        updateChartsTheme();
    });

    // Alert Banner Dismiss
    const alertCloseBtn = document.querySelector('.alert-close');
    const alertBanner = document.getElementById('inventoryAlert');
    if(alertCloseBtn && alertBanner) {
        alertCloseBtn.addEventListener('click', () => {
            alertBanner.style.display = 'none';
        });
    }

    // Chart.js Default styling (Safeguard for non-dashboard pages)
    if (typeof Chart !== 'undefined') {
        Chart.defaults.color = body.classList.contains('dark-theme') ? '#94A3B8' : '#6B7280';
        Chart.defaults.font.family = "'Inter', sans-serif";
    }
    
    // 1. Revenue Bar Chart
    const revCanvas = document.getElementById('revenueChart');
    let revenueChart = null;
    if (revCanvas && typeof Chart !== 'undefined') {
        revenueChart = new Chart(revCanvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['04.11', '04.12', '04.13', '04.14', '04.15', '04.16', '오늘'],
                datasets: [{
                    label: '일일 매출 (천원)',
                    data: [3200, 4500, 5200, 1800, 2100, 3100, 1250],
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderRadius: 4,
                    barPercentage: 0.6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // 2. Expense Doughnut Chart
    const expCanvas = document.getElementById('expenseChart');
    let expenseChart = null;
    if (expCanvas && typeof Chart !== 'undefined') {
        expenseChart = new Chart(expCanvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['인건비', '식음료/자재', '공과금', '마케팅', '기타'],
                datasets: [{
                    data: [45, 25, 15, 10, 5],
                    backgroundColor: [
                        '#3B82F6', // Blue
                        '#10B981', // Green
                        '#F59E0B', // Orange
                        '#8B5CF6', // Purple
                        '#EF4444'  // Red
                    ],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 20, usePointStyle: true }
                    }
                }
            }
        });
    }

    // 3. Infrastructure Charts (Elec, Gas, Water)
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
            x: { grid: { display: false } }
        }
    };
    const labels = ['04.11', '04.12', '04.13', '04.14', '04.15', '04.16', '오늘'];

    let elecChart, gasChart, waterChart;
    const elecCanvas = document.getElementById('elecChart');
    if (elecCanvas && typeof Chart !== 'undefined') {
        elecChart = new Chart(elecCanvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{ label: '전기 (kWh)', data: [420, 450, 480, 410, 400, 430, 415], borderColor: '#F59E0B', tension: 0.4, borderWidth: 2, pointRadius: 2 }]
            },
            options: chartOptions
        });
    }

    const gasCanvas = document.getElementById('gasChart');
    if (gasCanvas && typeof Chart !== 'undefined') {
        gasChart = new Chart(gasCanvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{ label: '가스 (m3)', data: [150, 160, 180, 140, 135, 145, 140], borderColor: '#EF4444', tension: 0.4, borderWidth: 2, pointRadius: 2 }]
            },
            options: chartOptions
        });
    }

    const waterCanvas = document.getElementById('waterChart');
    if (waterCanvas && typeof Chart !== 'undefined') {
        waterChart = new Chart(waterCanvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{ label: '수도 (ton)', data: [200, 220, 250, 190, 180, 195, 185], borderColor: '#3B82F6', tension: 0.4, borderWidth: 2, pointRadius: 2 }]
            },
            options: chartOptions
        });
    }

    // ══════════════════════════════════════════
    // 통합 대시보드 매출 KPI 자동 연동
    // ══════════════════════════════════════════
    async function fetchDashboardData() {
        // 1. 호텔 데이터 로드
        let hotelApiData = [];
        const HOTEL_API = 'https://hongsam.dothome.co.kr/api.php?action=load';
        const HOTEL_CACHE_KEY = 'erp_hotel_api_cache';
        try {
            const cached = JSON.parse(localStorage.getItem(HOTEL_CACHE_KEY) || '{}');
            if (cached.ts && (Date.now() - cached.ts < 30 * 60 * 1000) && cached.data) {
                hotelApiData = cached.data;
            } else {
                const res = await fetch(HOTEL_API);
                if (res.ok) {
                    hotelApiData = await res.json();
                    localStorage.setItem(HOTEL_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: hotelApiData }));
                }
            }
        } catch(e) {
            try { hotelApiData = JSON.parse(localStorage.getItem(HOTEL_CACHE_KEY) || '{}').data || []; } catch(e2) {}
        }

        // 2. 스파 데이터 로드 (로컬 DB)
        let revDb = {};
        try { revDb = JSON.parse(localStorage.getItem('erp_revenue_db') || '{}'); } catch(e) {}

        // 날짜 헬퍼
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        const todayKey = `${y}-${m}-${d}`;

        const yest = new Date(today); yest.setDate(yest.getDate() - 1);
        const yestY = yest.getFullYear();
        const yestM = String(yest.getMonth() + 1).padStart(2, '0');
        const yestD = String(yest.getDate()).padStart(2, '0');
        const yestKey = `${yestY}-${yestM}-${yestD}`;

        // -- 호텔 KPI 계산 --
        let hotelLatestRec = null;
        if (hotelApiData.length > 0) {
            const sorted = hotelApiData.sort((a, b) => b.date.localeCompare(a.date));
            hotelLatestRec = sorted[0]; // 가장 최근일자 (보통 전일 또는 오늘)
        }

        let hotelTodayRev = 0;
        let hotelMonthRev = 0;
        if (hotelLatestRec) hotelTodayRev = hotelLatestRec.revenue.total || 0;
        
        hotelApiData.forEach(r => {
            if (r.date.startsWith(`${y}-${m}`)) hotelMonthRev += (r.revenue.total || 0);
        });

        const elHotelToday = document.getElementById('kpi-hotel-today-rev');
        const elHotelTodayTrend = document.getElementById('kpi-hotel-today-trend');
        const elHotelMonth = document.getElementById('kpi-hotel-month-rev');
        const elHotelMonthTrend = document.getElementById('kpi-hotel-month-trend');
        const elHotelOcc = document.getElementById('kpi-hotel-occupancy');
        const elHotelAdr = document.getElementById('kpi-hotel-adr');

        if (elHotelToday) {
            elHotelToday.innerText = hotelTodayRev.toLocaleString();
            if (elHotelTodayTrend && hotelLatestRec) {
                const lrD = new Date(hotelLatestRec.date);
                elHotelTodayTrend.innerHTML = `<i class="fa-solid fa-check"></i> ${lrD.getMonth()+1}/${lrD.getDate()} 기준`;
                elHotelTodayTrend.className = 'trend neutral';
            }
        }
        if (elHotelMonth) {
            elHotelMonth.innerText = hotelMonthRev.toLocaleString();
            if (elHotelMonthTrend) {
                elHotelMonthTrend.innerHTML = `<i class="fa-solid fa-calendar-check"></i> 이번달 합계`;
                elHotelMonthTrend.className = 'trend neutral';
            }
        }
        if (elHotelOcc && hotelLatestRec) elHotelOcc.innerText = (hotelLatestRec.metrics.occRate || 0) + '%';
        if (elHotelAdr && hotelLatestRec) elHotelAdr.innerText = (hotelLatestRec.metrics.adr || 0).toLocaleString();

        // -- 스파 KPI 계산 --
        let spaTodayRev = 0;
        let spaMonthRev = 0;
        let spaYestExp = 0;
        let spaMonthExp = 0;

        // 가장 최근 스파 데이터 (todayKey부터 과거로 탐색)
        let spaLatestDate = todayKey;
        if (!revDb[spaLatestDate]) spaLatestDate = yestKey;

        if (revDb[spaLatestDate]) {
            spaTodayRev = ((revDb[spaLatestDate].spaTickRev || 0) + (revDb[spaLatestDate].spaFbRev || 0)) * 10000;
        }
        if (revDb[yestKey]) {
            spaYestExp = (revDb[yestKey].spaExpTotal || 0) * 10000;
        }

        Object.keys(revDb).forEach(k => {
            if (k.startsWith(`${y}-${m}`)) {
                const r = revDb[k];
                spaMonthRev += ((r.spaTickRev || 0) + (r.spaFbRev || 0)) * 10000;
                spaMonthExp += (r.spaExpTotal || 0) * 10000;
            }
        });

        const elSpaToday = document.getElementById('kpi-spa-today-rev');
        const elSpaTodayTrend = document.getElementById('kpi-spa-today-trend');
        const elSpaMonth = document.getElementById('kpi-spa-month-rev');
        const elSpaMonthTrend = document.getElementById('kpi-spa-month-trend');
        const elSpaYestExp = document.getElementById('kpi-spa-yesterday-exp');
        const elSpaMonthExp = document.getElementById('kpi-spa-month-exp');

        if (elSpaToday) {
            elSpaToday.innerText = spaTodayRev.toLocaleString();
            if (elSpaTodayTrend) {
                const dpt = spaLatestDate.split('-');
                elSpaTodayTrend.innerHTML = `<i class="fa-solid fa-check"></i> ${parseInt(dpt[1])}/${parseInt(dpt[2])} 기준`;
                elSpaTodayTrend.className = 'trend neutral';
            }
        }
        if (elSpaMonth) {
            elSpaMonth.innerText = spaMonthRev.toLocaleString();
            if (elSpaMonthTrend) {
                elSpaMonthTrend.innerHTML = `<i class="fa-solid fa-calendar-check"></i> 이번달 합계`;
                elSpaMonthTrend.className = 'trend neutral';
            }
        }
        if (elSpaYestExp) elSpaYestExp.innerText = spaYestExp.toLocaleString();
        if (elSpaMonthExp) elSpaMonthExp.innerText = spaMonthExp.toLocaleString();

        // -- 통합 요약 계산 --
        const totalToday = hotelTodayRev + spaTodayRev;
        const totalMonthRev = hotelMonthRev + spaMonthRev;
        const totalMonthExp = spaMonthExp; // 현재 지출은 스파 위주로 기록
        const totalProfit = totalMonthRev - totalMonthExp;

        const elTotToday = document.getElementById('kpi-total-today');
        const elTotMonth = document.getElementById('kpi-total-month');
        const elTotExp = document.getElementById('kpi-total-exp');
        const elTotProfit = document.getElementById('kpi-total-profit');

        if (elTotToday) elTotToday.innerText = '₩ ' + totalToday.toLocaleString();
        if (elTotMonth) elTotMonth.innerText = '₩ ' + totalMonthRev.toLocaleString();
        if (elTotExp) elTotExp.innerText = '₩ ' + totalMonthExp.toLocaleString();
        if (elTotProfit) elTotProfit.innerText = '₩ ' + totalProfit.toLocaleString();
        // -- 차트 업데이트 (최근 7일 매출) --
        if (typeof revenueChart !== 'undefined' && revenueChart) {
            const labels = [];
            const data = [];
            for (let i = 6; i >= 0; i--) {
                const dDate = new Date(today);
                dDate.setDate(dDate.getDate() - i);
                const cy = dDate.getFullYear();
                const cm = String(dDate.getMonth() + 1).padStart(2, '0');
                const cd = String(dDate.getDate()).padStart(2, '0');
                const cKey = `${cy}-${cm}-${cd}`;
                
                let hRev = 0, sRev = 0;
                const hRec = hotelApiData.find(x => x.date === cKey);
                if (hRec) hRev = hRec.revenue.total || 0;
                if (revDb[cKey]) sRev = ((revDb[cKey].spaTickRev||0) + (revDb[cKey].spaFbRev||0)) * 10000;
                
                labels.push(i === 0 ? '오늘' : `${dDate.getMonth()+1}.${dDate.getDate()}`);
                // 천원 단위 표시
                data.push(Math.round((hRev + sRev) / 1000));
            }
            
            revenueChart.data.labels = labels;
            revenueChart.data.datasets[0].data = data;
            revenueChart.update();
        }
    }
    
    // 호출
    fetchDashboardData();

    function updateChartsTheme() {
        if (typeof Chart === 'undefined') return;
        const textColor = body.classList.contains('dark-theme') ? '#94A3B8' : '#6B7280';
        const gridColor = body.classList.contains('dark-theme') ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
        
        [revenueChart, expenseChart, elecChart, gasChart, waterChart].forEach(chart => {
            if(chart && chart.options && chart.options.scales && chart.options.scales.y) {
                chart.options.scales.y.grid.color = gridColor;
                chart.update();
            }
        });
        Chart.defaults.color = textColor;
    }

    // ══════════════════════════════════════════
    // 진안군 진안읍 실시간 날씨 (Open-Meteo — 무료, API키 불필요)
    // ══════════════════════════════════════════
    (function loadJinanWeather() {
        const widget = document.getElementById('weatherWidget');
        if (!widget) return; // index.html 이외 페이지에서는 무시

        const LAT = 35.7914;  // 진안군 진안읍 위도
        const LON = 127.4242; // 진안군 진안읍 경도
        const CACHE_KEY = 'erp_weather_cache_v2';
        const CACHE_TTL = 30 * 60 * 1000; // 30분 캐시

        // WMO 날씨 코드 → 한국어 설명 + 아이콘 매핑
        const WMO_MAP = {
            0:  { desc: '맑음',        icon: 'fa-sun',              color: '#FBBF24' },
            1:  { desc: '대체로 맑음',  icon: 'fa-sun',              color: '#FBBF24' },
            2:  { desc: '구름 조금',    icon: 'fa-cloud-sun',        color: '#60A5FA' },
            3:  { desc: '흐림',        icon: 'fa-cloud',            color: '#94A3B8' },
            45: { desc: '안개',        icon: 'fa-smog',             color: '#9CA3AF' },
            48: { desc: '짙은 안개',    icon: 'fa-smog',             color: '#6B7280' },
            51: { desc: '가벼운 이슬비', icon: 'fa-cloud-rain',       color: '#60A5FA' },
            53: { desc: '이슬비',      icon: 'fa-cloud-rain',       color: '#3B82F6' },
            55: { desc: '짙은 이슬비',  icon: 'fa-cloud-rain',       color: '#2563EB' },
            61: { desc: '약한 비',     icon: 'fa-cloud-showers-heavy', color: '#3B82F6' },
            63: { desc: '비',         icon: 'fa-cloud-showers-heavy', color: '#2563EB' },
            65: { desc: '강한 비',     icon: 'fa-cloud-showers-heavy', color: '#1D4ED8' },
            66: { desc: '약한 빙우',   icon: 'fa-icicles',          color: '#93C5FD' },
            67: { desc: '강한 빙우',   icon: 'fa-icicles',          color: '#60A5FA' },
            71: { desc: '약한 눈',     icon: 'fa-snowflake',        color: '#BFDBFE' },
            73: { desc: '눈',         icon: 'fa-snowflake',        color: '#93C5FD' },
            75: { desc: '강한 눈',     icon: 'fa-snowflake',        color: '#60A5FA' },
            80: { desc: '소나기',      icon: 'fa-cloud-showers-heavy', color: '#3B82F6' },
            81: { desc: '소나기',      icon: 'fa-cloud-showers-heavy', color: '#2563EB' },
            82: { desc: '강한 소나기',  icon: 'fa-cloud-showers-heavy', color: '#1D4ED8' },
            95: { desc: '뇌우',       icon: 'fa-cloud-bolt',       color: '#F59E0B' },
            96: { desc: '우박 뇌우',   icon: 'fa-cloud-bolt',       color: '#EF4444' },
            99: { desc: '강한 우박 뇌우', icon: 'fa-cloud-bolt',     color: '#DC2626' }
        };

        function getWmo(code) {
            return WMO_MAP[code] || { desc: '알 수 없음', icon: 'fa-question', color: '#94A3B8' };
        }

        function renderWeather(data) {
            const c = data.current;
            const temp = Math.round(c.temperature_2m);
            const feelsLike = Math.round(c.apparent_temperature);
            const humidity = c.relative_humidity_2m;
            const wmo = getWmo(c.weather_code);

            document.getElementById('weatherTemp').textContent = `${temp}°`;
            document.getElementById('weatherDesc').textContent = wmo.desc;
            document.getElementById('weatherFeels').textContent = `체감 ${feelsLike}°`;
            document.getElementById('weatherHumid').innerHTML = `<i class="fa-solid fa-droplet" style="color:#3B82F6; margin-right:1px;"></i>${humidity}%`;
            
            // FontAwesome 아이콘 사용 (이미지 대신)
            const iconEl = document.getElementById('weatherIcon');
            iconEl.style.display = 'none'; // img 태그 숨김
            // 아이콘을 span으로 교체
            let faIcon = widget.querySelector('.weather-fa-icon');
            if (!faIcon) {
                faIcon = document.createElement('span');
                faIcon.className = 'weather-fa-icon';
                faIcon.style.cssText = 'font-size:2rem; line-height:1; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));';
                iconEl.parentNode.insertBefore(faIcon, iconEl);
            }
            faIcon.innerHTML = `<i class="fa-solid ${wmo.icon}" style="color:${wmo.color};"></i>`;
            
            widget.style.display = 'flex';
        }

        // 캐시 확인
        try {
            const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
            if (cached && (Date.now() - cached.ts < CACHE_TTL)) {
                renderWeather(cached.data);
                return;
            }
        } catch(e) {}

        // Open-Meteo API 호출 (API 키 불필요)
        const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=Asia/Seoul`;
        
        fetch(apiUrl)
            .then(res => { if (!res.ok) throw new Error(res.status); return res.json(); })
            .then(data => {
                renderWeather(data);
                localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
            })
            .catch(err => {
                console.warn('[날씨] 진안읍 날씨 정보를 불러올 수 없습니다:', err);
                // 캐시가 만료되었어도 이전 데이터 표시 시도
                try {
                    const stale = JSON.parse(localStorage.getItem(CACHE_KEY));
                    if (stale && stale.data) renderWeather(stale.data);
                } catch(e2) {}
            });
    })();

});
