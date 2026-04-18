document.addEventListener('DOMContentLoaded', () => {

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
            alert('존재하지 않는 사원번호입니다. (인사기록 확인 요망)');
            return;
        }

        if (users[empIdStr].password !== pwdStr) {
            alert('비밀번호가 일치하지 않습니다.');
            return;
        }

        // UI Feedback: Loading Spinner
        btnLogin.disabled = true;
        btnLogin.querySelector('.btn-text').innerText = '인증 중...';
        btnLogin.querySelector('.spinner').style.display = 'inline-block';

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

    // Mock Forgot Password
    const forgotLink = document.querySelector('.forgot-link');
    if(forgotLink) {
        forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            alert('비밀번호 초기화는 인사팀(내선 101)으로 문의바랍니다.');
        });
    }
});
