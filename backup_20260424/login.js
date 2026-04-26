document.addEventListener('DOMContentLoaded', () => {

    // --- 보안: 이미 로그인된 상태이면 중복 로그인 방지 ---
    if (localStorage.getItem('isLoggedIn') === 'true') {
        alert('이미 로그인되어 있습니다. 다른 아이디로 접속하려면 먼저 로그아웃 해주세요.');
        window.location.replace('index.html');
        return; // 즉시 종료
    }

    // --- Mock DB Initialization ---
    // User IDs 001 to 099, initial password "0000"
    function initMockDB() {
        let dbStr = localStorage.getItem('erp_users_db');
        if (!dbStr) {
            let users = {};
            for(let i = 1; i <= 99; i++) {
                let idStr = i.toString().padStart(3, '0');
                users[idStr] = { password: '0000', name: '사원 ' + idStr };
            }
            // Master account override for the demo
            users['001'] = { password: '0000', name: '진양우 (대표이사)' };
            
            localStorage.setItem('erp_users_db', JSON.stringify(users));
        }
    }
    initMockDB();

    const loginForm = document.getElementById('loginForm');
    const btnLogin = document.getElementById('btnLogin');
    const empIdInput = document.getElementById('empId');
    const passwordInput = document.getElementById('password');
    const rememberMe = document.getElementById('rememberMe');

    // Load saved empId if exists
    const savedId = localStorage.getItem('savedEmpId');
    if (savedId) {
        empIdInput.value = savedId;
        rememberMe.checked = true;
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent standard form submission

        const empIdStr = empIdInput.value.trim();
        const pwdStr = passwordInput.value.trim();

        if (empIdStr === '' || pwdStr === '') {
            alert('사원번호와 비밀번호를 모두 입력해주세요.');
            return;
        }

        // --- Mock DB Verification ---
        const dbStr = localStorage.getItem('erp_users_db');
        const users = JSON.parse(dbStr || '{}');

        // Retrieve employees created via HR module
        const hrEmployeesStr = localStorage.getItem('hongsam_employees');
        let hrEmployees = [];
        try { hrEmployees = JSON.parse(hrEmployeesStr || '[]'); } catch (_) {}
        
        hrEmployees.forEach(emp => {
            users[emp.emp_id] = { password: emp.login_pw || '0000', name: emp.name };
        });

        if (!users[empIdStr]) {
            // 실패 로그 기록
            logLoginEvent(empIdStr, '알 수 없음', 'fail');
            alert('존재하지 않는 사원번호입니다. (인사기록 확인 요망)');
            return;
        }

        if (users[empIdStr].password !== pwdStr) {
            // 실패 로그 기록
            logLoginEvent(empIdStr, users[empIdStr].name, 'fail');
            alert('비밀번호가 일치하지 않습니다.');
            return;
        }

        // UI Feedback: Loading Spinner
        btnLogin.disabled = true;
        btnLogin.querySelector('.btn-text').innerText = '인증 중...';
        btnLogin.querySelector('.spinner').style.display = 'inline-block';

        // 성공 로그 기록
        logLoginEvent(empIdStr, users[empIdStr].name, 'success');

        // Mock Loading Delay for UX
        setTimeout(() => {
            // "Save ID" functionality
            if (rememberMe.checked) {
                localStorage.setItem('savedEmpId', empIdStr);
            } else {
                localStorage.removeItem('savedEmpId');
            }

            // Session Setup
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('currentUser', empIdStr);
            localStorage.setItem('currentUserName', users[empIdStr].name);

            // Redirect to dashboard
            window.location.href = 'index.html';

        }, 1500); 
    });

    // 로그인 감사 로그 기록 함수
    function logLoginEvent(empId, name, result) {
        const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
        const device = isMobile ? 'Mobile' : 'Desktop';
        
        const logEntry = {
            emp_id: empId,
            name: name,
            result: result,
            timestamp: new Date().toISOString(),
            device: device,
            ip: '-' // 클라이언트에서는 IP 직접 확인 불가, 서버에서 추후 기록
        };

        const API_BASE = 'http://43.203.237.63:3001/api';
        
        // 기존 로그를 가져와서 새 항목 추가
        fetch(`${API_BASE}/db/login_logs`)
            .then(res => res.json())
            .then(logs => {
                if (!Array.isArray(logs)) logs = [];
                logs.push(logEntry);
                // 최근 500건만 보관
                if (logs.length > 500) logs = logs.slice(-500);
                return fetch(`${API_BASE}/db/login_logs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(logs)
                });
            })
            .catch(err => console.warn('[Audit] 로그 기록 실패:', err));
    }

    // Mock Forgot Password
    const forgotLink = document.querySelector('.forgot-link');
    if(forgotLink) {
        forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            alert('비밀번호 초기화는 인사팀(내선 101)으로 문의바랍니다.');
        });
    }
});
