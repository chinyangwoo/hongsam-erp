// 홍삼스파 ERP — 인증/보안 모듈 (Phase 2)
// server.js 의  app.use(express.json({ limit: '50mb' }));  바로 아래에
// 다음 한 줄을 추가하세요:
//     require('./auth').setupAuth(app, { loadDB, saveDB });
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

function isBcryptHash(s) { return typeof s === 'string' && /^\$2[aby]\$/.test(s); }

function setupAuth(app, deps) {
    const loadDB = deps.loadDB;
    const saveDB = deps.saveDB;

    const JWT_SECRET = process.env.JWT_SECRET || '';
    const TOKEN_TTL  = process.env.TOKEN_TTL  || '8h';
    const IS_PROD    = process.env.NODE_ENV === 'production';
    if (IS_PROD && !JWT_SECRET) {
        console.error('[치명적] 운영(production) 환경에서는 JWT_SECRET 환경변수가 반드시 필요합니다.');
        process.exit(1);
    }
    const SECRET = JWT_SECRET || 'dev-only-insecure-secret-change-me';

    app.use(helmet({ contentSecurityPolicy: false }));

    function requireAuth(req, res, next) {
        const h = req.headers['authorization'] || '';
        const token = h.indexOf('Bearer ') === 0 ? h.slice(7) : (req.query.token || '');
        if (!token) return res.status(401).json({ success: false, error: '인증 토큰이 필요합니다.' });
        try { req.user = jwt.verify(token, SECRET); next(); }
        catch (e) { return res.status(401).json({ success: false, error: '유효하지 않거나 만료된 토큰입니다.' }); }
    }

    function requireRole() {
        const roles = Array.prototype.slice.call(arguments);
        return function (req, res, next) {
            if (!req.user) return res.status(401).json({ success: false, error: '인증이 필요합니다.' });
            if (roles.length && roles.indexOf(req.user.role) === -1)
                return res.status(403).json({ success: false, error: '접근 권한이 없습니다.' });
            next();
        };
    }

    app.use(function (req, res, next) {
        if (req.path === '/api/login' || req.path === '/api/ping') return next();
        if (req.path.indexOf('/api/db')  === 0 || req.path.indexOf('/api/ai')  === 0 ||
            req.path.indexOf('/api/sms') === 0 || req.path.indexOf('/api/rcs') === 0 ||
            req.path.indexOf('/api/crud') === 0) {
            return requireAuth(req, res, next);
        }
        next();
    });

    const loginLimiter = rateLimit({
        windowMs: 5 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false,
        message: { success: false, error: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도하세요.' }
    });

    function findUserRecord(db, empId) {
        const usersObj = db.erp_users_db || {};
        const employees = Array.isArray(db.hongsam_employees) ? db.hongsam_employees : [];
        const emp = employees.find(function (e) { return String(e.emp_id) === String(empId); });
        const base = usersObj[empId] || null;
        if (!base && !emp) return null;
        return {
            empId: String(empId),
            name: (base && base.name) || (emp && emp.name) || ('사원 ' + empId),
            password: (base && base.password) || (emp && emp.login_pw) || null,
            role: (base && base.role) || (emp && emp.role) || (String(empId) === '001' ? 'admin' : 'user')
        };
    }

    app.post('/api/login', loginLimiter, async function (req, res) {
        try {
            const empId = String(req.body.empId || req.body.id || '').trim();
            const password = String(req.body.password || '');
            if (!empId || !password)
                return res.status(400).json({ success: false, error: '사원번호와 비밀번호를 입력하세요.' });

            const db = loadDB();
            const rec = findUserRecord(db, empId);
            if (!rec || !rec.password)
                return res.status(401).json({ success: false, error: '사원번호 또는 비밀번호가 올바르지 않습니다.' });

            let ok = false;
            if (isBcryptHash(rec.password)) {
                ok = await bcrypt.compare(password, rec.password);
            } else {
                ok = (password === rec.password);
                if (ok) {
                    const hash = await bcrypt.hash(password, 10);
                    if (!db.erp_users_db) db.erp_users_db = {};
                    db.erp_users_db[empId] = Object.assign({}, db.erp_users_db[empId] || {},
                        { name: rec.name, role: rec.role, password: hash });
                    saveDB(db);
                }
            }
            if (!ok) return res.status(401).json({ success: false, error: '사원번호 또는 비밀번호가 올바르지 않습니다.' });

            const token = jwt.sign({ empId: rec.empId, name: rec.name, role: rec.role }, SECRET, { expiresIn: TOKEN_TTL });

            try {
                const db2 = loadDB();
                if (!db2.login_logs) db2.login_logs = [];
                db2.login_logs.push({ emp_id: rec.empId, name: rec.name, result: 'success',
                    timestamp: new Date().toISOString(), ip: req.ip, device: req.headers['user-agent'] || '-' });
                if (db2.login_logs.length > 500) db2.login_logs = db2.login_logs.slice(-500);
                saveDB(db2);
            } catch (e) {}

            res.json({ success: true, token: token, user: { empId: rec.empId, name: rec.name, role: rec.role } });
        } catch (e) {
            console.error('[Login] Error:', e.message);
            res.status(500).json({ success: false, error: '로그인 처리 중 오류가 발생했습니다.' });
        }
    });

    app.post('/api/change-password', requireAuth, async function (req, res) {
        try {
            const empId = req.user.empId;
            const currentPassword = req.body.currentPassword;
            const newPassword = req.body.newPassword;
            if (!newPassword || String(newPassword).length < 6)
                return res.status(400).json({ success: false, error: '새 비밀번호는 6자 이상이어야 합니다.' });

            const db = loadDB();
            const rec = findUserRecord(db, empId);
            if (!rec) return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });

            const ok = isBcryptHash(rec.password)
                ? await bcrypt.compare(String(currentPassword || ''), rec.password)
                : (String(currentPassword || '') === rec.password);
            if (!ok) return res.status(401).json({ success: false, error: '현재 비밀번호가 일치하지 않습니다.' });

            const hash = await bcrypt.hash(String(newPassword), 10);
            if (!db.erp_users_db) db.erp_users_db = {};
            db.erp_users_db[empId] = Object.assign({}, db.erp_users_db[empId] || {},
                { name: rec.name, role: rec.role, password: hash });
            saveDB(db);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    });

    app.set('requireAuth', requireAuth);
    app.set('requireRole', requireRole);
    console.log('[Auth] 보안 모듈 로드 완료 — helmet + JWT(' + TOKEN_TTL + ') + bcrypt + 로그인 rate-limit');
}

module.exports = { setupAuth: setupAuth, isBcryptHash: isBcryptHash };
