// Check Auth Status (Mock Session)
if (localStorage.getItem('isLoggedIn') !== 'true') {
    // Not logged in -> Redirect immediately
    window.location.replace('login.html');
}

document.addEventListener('DOMContentLoaded', () => {

    // Update userName and Avatar if saved
    const currentUser = localStorage.getItem('currentUser');
    const currentUserName = localStorage.getItem('currentUserName');
    if (currentUser) {
        // Sync name
        const nameSpans = document.querySelectorAll('.user-info .name');
        nameSpans.forEach(span => {
            span.innerText = currentUserName ? `${currentUserName} (${currentUser})` : `사번: ${currentUser}`;
        });

        // Sync photo from HR DB (if exists)
        let employees = [];
        try { employees = JSON.parse(localStorage.getItem('hongsam_employees') || '[]'); } catch (_) {}
        const empRecord = employees.find(e => e.emp_id === currentUser);
        
        const avatars = document.querySelectorAll('.user-info .avatar');
        avatars.forEach(img => {
            if (empRecord && empRecord.photo) {
                img.src = empRecord.photo;
            } else if (currentUserName) {
                // If no uploaded photo, show their name initial instead of "CE"
                img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserName)}&background=0D8ABC&color=fff&rounded=true&bold=true`;
            }
        });
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
            if (originalDb[currentUser]) {
                originalDb[currentUser].password = newPwd;
                localStorage.setItem('erp_users_db', JSON.stringify(originalDb));
            }
            
            // Check if user is in hrEmployees
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
            
            if (!originalDb[currentUser] && !foundInHr) {
                // edge case
                originalDb[currentUser] = { password: newPwd, name: users[currentUser].name };
                localStorage.setItem('erp_users_db', JSON.stringify(originalDb));
            }

            alert('비밀번호가 성공적으로 변경되었습니다.\n다음에 로그인할 때 새 비밀번호를 사용하세요.');
            pwdModal.style.display = 'none';
        } else {
            alert('사용자 정보를 찾을 수 없습니다.');
        }
    });

    // Logout Logic
    const logoutBtns = document.querySelectorAll('.logout-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if(confirm('안전하게 로그아웃 하시겠습니까?')) {
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('currentUser');
                window.location.replace('login.html');
            }
        });
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

    // Chart.js Default styling
    Chart.defaults.color = body.classList.contains('dark-theme') ? '#94A3B8' : '#6B7280';
    Chart.defaults.font.family = "'Inter', sans-serif";
    
    // 1. Revenue Bar Chart
    const ctxRevenue = document.getElementById('revenueChart').getContext('2d');
    const revenueChart = new Chart(ctxRevenue, {
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

    // 2. Expense Doughnut Chart
    const ctxExpense = document.getElementById('expenseChart').getContext('2d');
    const expenseChart = new Chart(ctxExpense, {
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

    const elecChart = new Chart(document.getElementById('elecChart').getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{ label: '전기 (kWh)', data: [420, 450, 480, 410, 400, 430, 415], borderColor: '#F59E0B', tension: 0.4, borderWidth: 2, pointRadius: 2 }]
        },
        options: chartOptions
    });

    const gasChart = new Chart(document.getElementById('gasChart').getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{ label: '가스 (m3)', data: [150, 160, 180, 140, 135, 145, 140], borderColor: '#EF4444', tension: 0.4, borderWidth: 2, pointRadius: 2 }]
        },
        options: chartOptions
    });

    const waterChart = new Chart(document.getElementById('waterChart').getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{ label: '수도 (ton)', data: [200, 220, 250, 190, 180, 195, 185], borderColor: '#3B82F6', tension: 0.4, borderWidth: 2, pointRadius: 2 }]
        },
        options: chartOptions
    });

    // POS & Accounting Logic Mock Update
    function updateKPIs() {
        // [POS 매출 연동 로직 설명]
        // 1. POS 시스템의 API(예: OKPOS)를 호출하여 금일(today) 및 월간(month) 누적 매출 데이터를 가져옵니다.
        // 2. Fetch API나 Axios 등을 사용하여 백엔드(서버)에서 POS연동 데이터를 가져오고 HTML에 렌더링합니다.
        
        // [지출결의 연동 로직 설명]
        // 1. 회계 담당자가 시스템에 입력한 지출 데이터베이스(erp_cashflow_db)를 조회.
        // 2. 전일 날짜에 해당하는 지출을 합산하여 '전일 지출'에 반영.
        // 3. 매달 1일부터 전일까지 해당하는 지출을 합산하여 '월간 누적 지출'에 반영.
        
        let yesterdayTotal = 350000;
        let monthTotal = 18300400;
        
        // 실제 데이터가 있다고 가정할 때의 업데이트
        const kpiYestExp = document.getElementById('kpi-yesterday-exp');
        const kpiMonthExp = document.getElementById('kpi-month-exp');
        if (kpiYestExp) kpiYestExp.innerText = yesterdayTotal.toLocaleString();
        if (kpiMonthExp) kpiMonthExp.innerText = monthTotal.toLocaleString();
    }
    updateKPIs();

    function updateChartsTheme() {
        const textColor = body.classList.contains('dark-theme') ? '#94A3B8' : '#6B7280';
        const gridColor = body.classList.contains('dark-theme') ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
        
        [revenueChart, expenseChart, elecChart, gasChart, waterChart].forEach(chart => {
            if(chart.options.scales && chart.options.scales.y) {
                chart.options.scales.y.grid.color = gridColor;
            }
            chart.update();
        });
        Chart.defaults.color = textColor;
    }
});
