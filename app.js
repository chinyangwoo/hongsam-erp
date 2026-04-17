// Check Auth Status (Mock Session)
if (localStorage.getItem('isLoggedIn') !== 'true') {
    // Not logged in -> Redirect immediately
    window.location.replace('login.html');
}

document.addEventListener('DOMContentLoaded', () => {

    // Update userName if saved
    const currentUser = localStorage.getItem('currentUser');
    const currentUserName = localStorage.getItem('currentUserName');
    if (currentUser) {
        const nameSpans = document.querySelectorAll('.user-info .name');
        nameSpans.forEach(span => {
            span.innerText = currentUserName ? `${currentUserName} (${currentUser})` : `사번: ${currentUser}`;
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
        if(dbStr) {
            let users = JSON.parse(dbStr);
            if(users[currentUser].password !== currentPwd) {
                alert('현재 비밀번호가 일치하지 않습니다.');
                return;
            }
            
            // Success: update password
            users[currentUser].password = newPwd;
            localStorage.setItem('erp_users_db', JSON.stringify(users));
            alert('비밀번호가 성공적으로 변경되었습니다.\n다음에 로그인할 때 새 비밀번호를 사용하세요.');
            pwdModal.style.display = 'none';
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

    // Sidebar Toggle for Mobile
    const sidebarToggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    
    sidebarToggleBtn.addEventListener('click', () => {
        const currentTransform = sidebar.style.transform;
        if (currentTransform === 'translateX(0px)') {
            sidebar.style.transform = 'translateX(-100%)';
        } else {
            sidebar.style.transform = 'translateX(0px)';
        }
    });

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

    // 3. Infrastructure Line Chart
    const ctxInfra = document.getElementById('infraChart').getContext('2d');
    const infraChart = new Chart(ctxInfra, {
        type: 'line',
        data: {
            labels: ['04.11', '04.12', '04.13', '04.14', '04.15', '04.16', '오늘'],
            datasets: [
                {
                    label: '전기 (kWh)',
                    data: [420, 450, 480, 410, 400, 430, 415],
                    borderColor: '#F59E0B', // Orange
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 0
                },
                {
                    label: '가스 (m3)',
                    data: [150, 160, 180, 140, 135, 145, 140],
                    borderColor: '#EF4444', // Red
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 0
                },
                {
                    label: '수도 (ton)',
                    data: [200, 220, 250, 190, 180, 195, 185],
                    borderColor: '#3B82F6', // Blue
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { usePointStyle: true, boxWidth: 8 }
                }
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

    function updateChartsTheme() {
        const textColor = body.classList.contains('dark-theme') ? '#94A3B8' : '#6B7280';
        const gridColor = body.classList.contains('dark-theme') ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
        
        [revenueChart, expenseChart, infraChart].forEach(chart => {
            if(chart.options.scales && chart.options.scales.y) {
                chart.options.scales.y.grid.color = gridColor;
            }
            chart.update();
        });
        Chart.defaults.color = textColor;
    }
});
