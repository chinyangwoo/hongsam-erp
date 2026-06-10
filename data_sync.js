/**
 * data_sync.js v2 - replaces cloud_sync.js
 * Item 2: optimistic concurrency - every save carries the collection version;
 *         on conflict (409) the client merges server+local data and retries once,
 *         so two people saving at the same time no longer wipe each other's work.
 * Item 5: performance - initial pull fetches ONLY the needed collections via
 *         /api/db/bundle (instead of the whole DB), pushes are debounced,
 *         and a localStorage quota guard warns before silent data loss.
 */
(function () {
    var API_BASE = (window.ERP_CONFIG && window.ERP_CONFIG.apiBase) || 'http://43.203.237.63:3001/api';
    var TARGET_KEYS = ['hongsam_employees', 'erp_users_db', 'erp_notices', 'board_posts'];
    var DEBOUNCE_MS = 800;

    var versions = {};   // collection -> last known server version
    var timers = {};     // collection -> debounce timer
    var nativeSetItem = Storage.prototype.setItem;

    function authHeaders() {
        var h = { 'Content-Type': 'application/json' };
        try { var t = localStorage.getItem('erp_auth_token'); if (t) h['Authorization'] = 'Bearer ' + t; } catch (e) {}
        return h;
    }

    // ---------- merge helpers ----------
    var ID_CANDIDATES = ['id', '_id', 'uuid', 'key', 'res_id', 'emp_id', 'post_id', 'msg_id', 'timestamp'];
    function detectIdKey(arr) {
        for (var i = 0; i < ID_CANDIDATES.length; i++) {
            var k = ID_CANDIDATES[i], hits = 0, checked = 0;
            for (var j = 0; j < arr.length && j < 20; j++) {
                if (arr[j] && typeof arr[j] === 'object') { checked++; if (arr[j][k] !== undefined) hits++; }
            }
            if (checked > 0 && hits / checked >= 0.8) return k;
        }
        return null;
    }
    function mergeData(serverData, localData) {
        if (Array.isArray(serverData) && Array.isArray(localData)) {
            var idKey = detectIdKey(localData.length ? localData : serverData);
            if (!idKey) return localData;
            var map = new Map();
            serverData.forEach(function (it) { if (it && typeof it === 'object') map.set(String(it[idKey]), it); });
            localData.forEach(function (it) { if (it && typeof it === 'object') map.set(String(it[idKey]), it); });
            return Array.from(map.values());
        }
        if (serverData && localData && typeof serverData === 'object' && typeof localData === 'object'
            && !Array.isArray(serverData) && !Array.isArray(localData)) {
            return Object.assign({}, serverData, localData);
        }
        return localData !== undefined ? localData : serverData;
    }

    // ---------- versioned push with conflict merge ----------
    function pushCollection(key, retried) {
        var raw;
        try { raw = nativeSetItem ? localStorage.getItem(key) : null; } catch (e) { return; }
        if (raw === null) return;
        var value; try { value = JSON.parse(raw); } catch (e) { return; }

        var headers = authHeaders();
        if (versions[key] !== undefined) headers['X-Collection-Version'] = String(versions[key]);

        fetch(API_BASE + '/db/' + key, { method: 'POST', headers: headers, body: JSON.stringify(value) })
            .then(function (res) {
                if (res.status === 409 && !retried) {
                    return res.json().then(function (body) {
                        var merged = mergeData(body.data, value);
                        versions[key] = body.version;
                        nativeSetItem.call(localStorage, key, JSON.stringify(merged));
                        console.warn('[Sync] conflict on "' + key + '" - merged & retrying');
                        pushCollection(key, true);
                    });
                }
                if (res.ok) {
                    return res.json().then(function (body) {
                        if (body && body.version !== undefined) versions[key] = body.version;
                    }).catch(function () {});
                }
            })
            .catch(function () { /* offline: keep local, retry on next change */ });
    }
    function schedulePush(key) {
        clearTimeout(timers[key]);
        timers[key] = setTimeout(function () { pushCollection(key, false); }, DEBOUNCE_MS);
    }

    // ---------- localStorage hijack (sync + quota guard) ----------
    var quotaWarned = false;
    Storage.prototype.setItem = function (key, val) {
        try {
            nativeSetItem.call(this, key, val);
        } catch (e) {
            if (!quotaWarned && e && (e.name === 'QuotaExceededError' || e.code === 22)) {
                quotaWarned = true;
                alert('[ERP] 브라우저 저장공간이 가득 찼습니다.\n데이터가 더 이상 저장되지 않을 수 있으니 관리자에게 알려주세요.');
            }
            throw e;
        }
        if (this === window.localStorage && TARGET_KEYS.indexOf(key) !== -1) schedulePush(key);
    };

    // ---------- global fetch wrapper: version headers for ALL module saves ----------
    var nativeFetch = window.fetch;
    var DB_URL_RE = /\/api\/db\/([A-Za-z0-9_\-]+)(\?.*)?$/;
    window.fetch = function (input, init) {
        var url = (typeof input === 'string') ? input : (input && input.url) || '';
        var m = url.match(DB_URL_RE);
        if (!m || m[1] === 'bundle') return nativeFetch.apply(this, arguments);
        var key = m[1];
        var method = ((init && init.method) || (typeof input !== 'string' && input.method) || 'GET').toUpperCase();

        if (method === 'GET') {
            return nativeFetch.apply(this, arguments).then(function (res) {
                var v = res.headers.get('X-Collection-Version');
                if (v !== null) versions[key] = parseInt(v, 10);
                return res;
            });
        }
        if (method === 'POST' && init && typeof init.body === 'string') {
            init.headers = init.headers || {};
            var setH = function (n, v) {
                if (typeof init.headers.set === 'function') init.headers.set(n, v); else init.headers[n] = v;
            };
            if (versions[key] !== undefined) setH('X-Collection-Version', String(versions[key]));
            var localBody = init.body;
            return nativeFetch.call(this, input, init).then(function (res) {
                if (res.status === 409) {
                    return res.clone().json().then(function (body) {
                        var localVal; try { localVal = JSON.parse(localBody); } catch (e) { return res; }
                        var merged = mergeData(body.data, localVal);
                        versions[key] = body.version;
                        try { nativeSetItem.call(localStorage, key, JSON.stringify(merged)); } catch (e) {}
                        var retryInit = Object.assign({}, init, { body: JSON.stringify(merged) });
                        retryInit.headers = Object.assign({}, init.headers);
                        retryInit.headers['X-Collection-Version'] = String(body.version);
                        console.warn('[Sync] conflict on "' + key + '" - merged & retrying');
                        return nativeFetch.call(window, input, retryInit).then(function (res2) {
                            var v2 = res2.headers.get('X-Collection-Version');
                            if (v2 !== null) versions[key] = parseInt(v2, 10);
                            return res2;
                        });
                    }).catch(function () { return res; });
                }
                var v = res.headers.get('X-Collection-Version');
                if (v !== null) versions[key] = parseInt(v, 10);
                return res;
            });
        }
        return nativeFetch.apply(this, arguments);
    };

    // ---------- initial pull (bundle: only target keys) ----------
    function initialPull() {
        fetch(API_BASE + '/db/bundle?keys=' + TARGET_KEYS.join(','), { headers: authHeaders() })
            .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
            .then(function (body) {
                if (!body || !body.data) return;
                var changed = false;
                TARGET_KEYS.forEach(function (key) {
                    if (body.versions && body.versions[key] !== undefined) versions[key] = body.versions[key];
                    var serverVal = body.data[key];
                    if (serverVal === null || serverVal === undefined) return;
                    var serverStr = JSON.stringify(serverVal);
                    var localStr = null;
                    try { localStr = localStorage.getItem(key); } catch (e) {}
                    if (localStr !== serverStr) { nativeSetItem.call(localStorage, key, serverStr); changed = true; }
                });
                console.log('[Sync] initial pull done' + (changed ? ' (updated)' : ''));
                if (changed && !sessionStorage.getItem('erp_sync_reloaded')) {
                    sessionStorage.setItem('erp_sync_reloaded', '1');
                    location.reload();
                }
            })
            .catch(function (e) { console.warn('[Sync] initial pull skipped:', e.message); });
    }

    // back-compat with cloud_sync.js
    window.initCloudSync = initialPull;
    window.DataSync = { pull: initialPull, push: function (k) { pushCollection(k, false); }, merge: mergeData };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialPull);
    else initialPull();
})();
