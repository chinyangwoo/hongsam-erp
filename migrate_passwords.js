// 홍삼스파 ERP — 비밀번호 일괄 마이그레이션 (평문 -> bcrypt)
// [실행 위치] 실제 db_storage.json 이 있는 "서버(AWS)"에서 실행하세요.
//   node migrate_passwords.js
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_FILE = path.join(__dirname, 'db_storage.json');
function isBcryptHash(s) { return typeof s === 'string' && /^\$2[aby]\$/.test(s); }

(async function () {
    if (!fs.existsSync(DB_FILE)) {
        console.error('[오류] db_storage.json 을 찾을 수 없습니다:', DB_FILE);
        console.error('       이 스크립트는 실제 데이터가 있는 서버에서 실행해야 합니다.');
        process.exit(1);
    }

    const raw = fs.readFileSync(DB_FILE, 'utf8');
    let db;
    try { db = JSON.parse(raw); }
    catch (e) { console.error('[오류] db_storage.json 파싱 실패:', e.message); process.exit(1); }

    // 1) 백업
    const backup = DB_FILE + '.bak_' + Date.now();
    fs.writeFileSync(backup, raw, 'utf8');
    console.log('백업 생성:', backup);

    db.erp_users_db = db.erp_users_db || {};
    let merged = 0, hashed = 0;

    // 2) hongsam_employees(login_pw) -> erp_users_db 통합 + 평문 제거
    if (Array.isArray(db.hongsam_employees)) {
        for (const emp of db.hongsam_employees) {
            if (!emp || !emp.emp_id) continue;
            const id = String(emp.emp_id);
            if (!db.erp_users_db[id] && emp.login_pw) {
                db.erp_users_db[id] = {
                    name: emp.name || ('사원 ' + id),
                    role: emp.role || (id === '001' ? 'admin' : 'user'),
                    password: emp.login_pw
                };
                merged++;
            }
            if (typeof emp.login_pw !== 'undefined') delete emp.login_pw;
        }
    }

    // 3) 평문 -> bcrypt 해시
    for (const id of Object.keys(db.erp_users_db)) {
        const u = db.erp_users_db[id];
        if (!u) continue;
        if (!u.role) u.role = (id === '001' ? 'admin' : 'user');
        if (u.password && !isBcryptHash(u.password)) {
            u.password = await bcrypt.hash(String(u.password), 10);
            hashed++;
        }
    }

    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    console.log('완료 - 통합 ' + merged + '명, 해시 변환 ' + hashed + '건.');
    console.log('문제가 있으면 백업 파일을 db_storage.json 으로 되돌리세요.');
})();
