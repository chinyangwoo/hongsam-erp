// 홍삼스파 ERP — 로그인 (Phase 2: 서버 인증 사용)
// 기존 클라이언트측 비밀번호 비교 / 평문 DB 동기화 로직을 모두 제거하고
// 서버 POST /api/login (bcrypt + JWT) 결과로만 인증합니다.
document.addEventListener('DOMContentLoaded', function () {
    if (localStorage.getItem('isLoggedIn') === 'true' && localStorage.getItem('erp_auth_token')) {
        window.location.replace('index.html');
        return;
    }

    var loginForm   = document.getElementById('loginForm');
    var btnLogin    = document.getElementById('btnLogin');
    var empIdInput  = document.getElementById('empId');
    var passwordInput = document.getElementById('password');
    var rememberMe  = document.getElementById('rememberMe');

    var savedId = localStorage.getItem('savedEmpId');
    if (savedId && empIdInput) { empIdInput.value = savedId; if (rememberMe) rememberMe.checked = true; }

    if (!loginForm) return;

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        var empIdStr = (empIdInput.value || '').trim();
        var pwdStr   = (passwordInput.value || '').trim();
        if (!empIdStr || !pwdStr) { alert('사원번호와 비밀번호를 모두 입력해주세요.'); return; }

        var txt = btnLogin ? btnLogin.querySelector('.btn-text') : null;
        var spinner = btnLogin ? btnLogin.querySelector('.spinner') : null;
        if (btnLogin) btnLogin.disabled = true;
        if (txt) txt.innerText = '인증 중...';
        if (spinner) spinner.style.display = 'inline-block';

        try {
            if (!window.AuthClient) { alert('인증 모듈(auth_client.js)이 로드되지 않았습니다.'); return; }
            var data = await window.AuthClient.login(empIdStr, pwdStr);
            if (data && data.success) {
                if (rememberMe && rememberMe.checked) localStorage.setItem('savedEmpId', empIdStr);
                else localStorage.removeItem('savedEmpId');
                window.location.href = 'index.html';
                return;
            }
            alert((data && data.error) || '로그인에 실패했습니다.');
        } catch (err) {
            console.error('[Login] error', err);
            alert('서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.');
        } finally {
            if (btnLogin) btnLogin.disabled = false;
            if (txt) txt.innerText = '로그인';
            if (spinner) spinner.style.display = 'none';
        }
    });

    var forgotLink = document.querySelector('.forgot-link');
    if (forgotLink) {
        forgotLink.addEventListener('click', function (e) {
            e.preventDefault();
            alert('비밀번호 초기화는 인사팀(내선 101)으로 문의바랍니다.');
        });
    }
});
