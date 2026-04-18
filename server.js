const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db_storage.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 로컬 파일에서 DB 데이터 로드
function loadDB() {
    try {
        if (fs.existsSync(DB_FILE)) {
            return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('DB Load Error:', e);
    }
    return {};
}

// 파일에 DB 데이터 저장
function saveDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// 1. 전체 DB 조회 (백업 및 클라이언트 동기화용)
app.get('/api/db', (req, res) => {
    const db = loadDB();
    res.json(db);
});

// 2. 특정 컬렉션(테이블) 조회
app.get('/api/db/:collection', (req, res) => {
    const db = loadDB();
    res.json(db[req.params.collection] || []);
});

// 3. 특정 컬렉션(테이블) 저장/덮어쓰기
app.post('/api/db/:collection', (req, res) => {
    const db = loadDB();
    db[req.params.collection] = req.body;
    saveDB(db);
    res.json({ success: true, count: Array.isArray(req.body) ? req.body.length : 1 });
});

// 테스트용 Ping
app.get('/api/ping', (req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// 백엔드 서버 시작
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hongsam SPA ERP Backend API is running on http://0.0.0.0:${PORT}`);
});
