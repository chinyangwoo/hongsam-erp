// 홍삼스파 ERP — 프런트엔드 인증 클라이언트 (Phase 2)
// 다른 모든 스크립트보다 "먼저" 로드해야 합니다.
// index.html: cloud_sync.js 위에 추가 / login.html: login.js 위에 추가
(function () {
    'use strict';

    var TOKEN_KEY = 'erp_auth_token';
    var page = (location.pathname.split('/').pop() || '').toLowerCase();
    var isLoginPage = /login\.html$/.test(page);

    var API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'http://localhost:3001/api'
        : 'http://43.203.237.63:3001/api';

    function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }

    function setSession(token, user) {
        localStorage.setItem(TOKEN_KEY, token);
        if (user) {
            localStorage.setItem('currentUser', user.empId);
            localStorage.setItem('currentUserName', user.name);
            localStorage.setItem('currentUserRole', user.role || 'user');
            localStorage.setItem('isLoggedIn', 'true');
        }
    }

    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('isLoggedIn');
    }

    function redirectToLogin() {
        if (!isLoginPage) location.replace('login.html');
    }

    if (!isLoginPage && !getToken()) { redirectToLogin(); }

    var _fetch = window.fetch ? window.fetch.bind(window) : null;
    if (_fetch) {
        window.fetch = function (input, init) {
            init = init || {};
            var url = (typeof input === 'string') ? input : (input && input.url) || '';
            var isApi = url.indexOf('/api/') !== -1;
            var isLoginCall = url.indexOf('/api/login') !== -1;

            if (isApi && !isLoginCall) {
                var token = getToken();
                if (token) {
                    var headers = new Headers(init.headers || (typeof input !== 'string' && input.headers) || {});
                    if (!headers.has('Authorization')) headers.set('Authorization', 'Bearer ' + token);
                    init.headers = headers;
                }
            }
            return _fetch(input, init).then(function (res) {
                if (res.status === 401 && isApi && !isLoginCall) {
                    clearSession();
                    redirectToLogin();
                }
                return res;
            });
        };
    }

    window.AuthClient = {
        API_BASE: API_BASE,
        getToken: getToken,
        getRole: function () { return localStorage.getItem('currentUserRole') || 'user'; },
        isAdmin: function () { return (localStorage.getItem('currentUserRole') || '') === 'admin'; },
        login: function (empId, password) {
            var call = _fetch || window.fetch;
            return call(API_BASE + '/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ empId: empId, password: password })
            }).then(function (r) { return r.json(); })
              .then(function (data) {
                  if (data && data.success && data.token) setSession(data.token, data.user);
                  return data;
              });
        },
        changePassword: function (currentPassword, newPassword) {
            return window.fetch(API_BASE + '/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword: currentPassword, newPassword: newPassword })
            }).then(function (r) { return r.json(); });
        },
        logout: function () { clearSession(); location.replace('login.html'); }
    };
})();
