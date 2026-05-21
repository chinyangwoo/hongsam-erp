document.addEventListener('DOMContentLoaded', () => {

    // --- 보안: 이미 로그인된 상태이면 중복 로그인 방지 ---
    if (localStorage.getItem('isLoggedIn') === 'true') {
        alert('이미 로그인되어 있습니다. 다른 아이디로 접속하려면 먼저 로그아웃 해주세요.');
        window.location.replace('index.html');
        return; // 즉시 종료
    }

    const API_BASE = 'http://43.203.237.63:3001/api';

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
            // Master account (대표이사)
            users['001'] = { password: '1234', name: '진양우 (대표이사)' };
            
            localStorage.setItem('erp_users_db', JSON.stringify(users));
        }
    }
    initMockDB();

    // --- 서버 DB에서 비밀번호 동기화 ---
    // localStorage가 초기화되어도 서버에 저장된 비밀번호는 유지됨
    function syncPasswordsFromServer() {
        // 1. erp_users_db 동기화
        fetch(`${API_BASE}/db/erp_users_db`)
            .then(res => res.json())
            .then(serverUsers => {
                if (serverUsers && typeof serverUsers === 'object' && Object.keys(serverUsers).length > 0) {
                    let localUsers = JSON.parse(localStorage.getItem('erp_users_db') || '{}');
                    Object.keys(serverUsers).forEach(empId => {
                        if (serverUsers[empId] && serverUsers[empId].password) {
                            localUsers[empId] = { ...localUsers[empId], ...serverUsers[empId] };
                        }
                    });
                    localStorage.setItem('erp_users_db', JSON.stringify(localUsers));
                }
            })
            .catch(err => console.warn('[Sync] 서버 비밀번호 동기화 실패 (오프라인 모드):', err));

        // 2. hongsam_employees 동기화 (인사모듈에서 추가/변경된 사원 정보 및 비밀번호 동기화)
        return fetch(`${API_BASE}/db/hongsam_employees`)
            .then(res => res.json())
            .then(serverEmployees => {
                if (serverEmployees && Array.isArray(serverEmployees) && serverEmployees.length > 0) {
                    localStorage.setItem('hongsam_employees', JSON.stringify(serverEmployees));
                }
            })
            .catch(err => console.warn('[Sync] 인사데이터 동기화 실패 (오프라인 모드):', err));
    }

    // 서버에서 비밀번호 동기화 시도 (비동기 - 실패해도 로컬 DB로 진행)
    syncPasswordsFromServer();

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

        // --- 보안: 로그인 잠금 점검 ---
        const lockKey = `login_lock_${empIdStr}`;
        const failKey = `login_failures_${empIdStr}`;
        const lockTime = localStorage.getItem(lockKey);
        if (lockTime) {
            const timeLeft = parseInt(lockTime, 10) - Date.now();
            if (timeLeft > 0) {
                const minutes = Math.ceil(timeLeft / 60000);
                alert(`잦은 로그인 실패로 인해 계정이 잠겼습니다. ${minutes}분 후 다시 시도해 주세요.`);
                return;
            } else {
                localStorage.removeItem(lockKey);
                localStorage.removeItem(failKey);
            }
        }

        // --- DB Verification ---
        const dbStr = localStorage.getItem('erp_users_db');
        const users = JSON.parse(dbStr || '{}');

        // Retrieve employees created via HR module
        const hrEmployeesStr = localStorage.getItem('hongsam_employees');
        let hrEmployees = [];
        try { hrEmployees = JSON.parse(hrEmployeesStr || '[]'); } catch (_) {}
        
        hrEmployees.forEach(emp => {
            // If the user already exists in erp_users_db with a changed password, keep that password.
            // Otherwise, use the HR module's password.
            if (users[emp.emp_id] && users[emp.emp_id].password !== '0000') {
                users[emp.emp_id].name = emp.name;
            } else {
                users[emp.emp_id] = { password: emp.login_pw || '0000', name: emp.name };
            }
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
            
            // 로그인 실패 횟수 증가 및 5분간 잠금 처리
            let failures = parseInt(localStorage.getItem(failKey) || '0', 10);
            failures += 1;
            localStorage.setItem(failKey, failures.toString());
            
            if (failures >= 5) {
                const lockoutUntil = Date.now() + 300000; // 5분 잠금
                localStorage.setItem(lockKey, lockoutUntil.toString());
                alert('비밀번호를 5회 연속 잘못 입력하여 계정이 5분간 잠깁니다.');
            } else {
                alert(`비밀번호가 일치하지 않습니다. (실패 횟수: ${failures}/5)`);
            }
            return;
        }

        // UI Feedback: Loading Spinner
        btnLogin.disabled = true;
        btnLogin.querySelector('.btn-text').innerText = '인증 중...';
        btnLogin.querySelector('.spinner').style.display = 'inline-block';

        // 성공 로그 기록
        logLoginEvent(empIdStr, users[empIdStr].name, 'success');

        // 비밀번호 데이터를 서버에도 저장 (다른 기기/세션에서도 유지)
        const currentUsers = JSON.parse(localStorage.getItem('erp_users_db') || '{}');
        fetch(`${API_BASE}/db/erp_users_db`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentUsers)
        }).catch(err => console.warn('[Sync] 서버 저장 실패:', err));

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
            localStorage.removeItem(lockKey);
            localStorage.removeItem(failKey);

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
