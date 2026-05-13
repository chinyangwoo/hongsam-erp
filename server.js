const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // allow all origins
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 3001;
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

// ═══════════════════════════════════════════════════════════
// SMS/LMS 발송 API (알리고 중계 플랫폼 연동)
// 환경변수: ALIGO_API_KEY, ALIGO_USER_ID, ALIGO_SENDER
// ═══════════════════════════════════════════════════════════
const ALIGO_API_KEY = process.env.ALIGO_API_KEY || '';
const ALIGO_USER_ID = process.env.ALIGO_USER_ID || '';
const ALIGO_SENDER = process.env.ALIGO_SENDER || '0634330000';

app.post('/api/sms/send', async (req, res) => {
    const { receivers, message, title } = req.body;

    if (!receivers || !Array.isArray(receivers) || receivers.length === 0) {
        return res.status(400).json({ success: false, error: '수신자 목록이 비어 있습니다.' });
    }
    if (!message) {
        return res.status(400).json({ success: false, error: '메시지 내용이 없습니다.' });
    }

    // API Key 미설정 시 시뮬레이션 모드
    if (!ALIGO_API_KEY || !ALIGO_USER_ID) {
        console.log(`[SMS 시뮬레이션] ${receivers.length}명에게 발송 시뮬레이션:`, message.substring(0, 50) + '...');
        // 발송 이력 저장
        const db = loadDB();
        if (!db.sms_history) db.sms_history = [];
        db.sms_history.push({
            id: 'SMS-' + Date.now(),
            timestamp: new Date().toISOString(),
            receivers: receivers.length,
            message: message,
            title: title || '',
            mode: 'simulation',
            status: 'simulated'
        });
        saveDB(db);
        return res.json({
            success: true,
            mode: 'simulation',
            sentCount: receivers.length,
            message: `시뮬레이션 모드: ${receivers.length}명 발송 처리됨 (실제 발송 아님). 알리고 API Key를 설정하면 실제 발송됩니다.`
        });
    }

    // 실제 알리고 API 발송
    try {
        const axios = require('axios');
        const FormData = require('form-data');
        const form = new FormData();
        form.append('key', ALIGO_API_KEY);
        form.append('user_id', ALIGO_USER_ID);
        form.append('sender', ALIGO_SENDER);
        form.append('receiver', receivers.map(r => r.replace(/-/g, '')).join(','));
        form.append('msg', message);
        form.append('msg_type', message.length > 90 ? 'LMS' : 'SMS');
        if (title) form.append('title', title);

        const response = await axios.post('https://apis.aligo.in/send/', form, {
            headers: form.getHeaders()
        });

        // 발송 이력 저장
        const db = loadDB();
        if (!db.sms_history) db.sms_history = [];
        db.sms_history.push({
            id: 'SMS-' + Date.now(),
            timestamp: new Date().toISOString(),
            receivers: receivers.length,
            message: message,
            title: title || '',
            mode: 'live',
            status: response.data.result_code === '1' ? 'success' : 'failed',
            apiResponse: response.data
        });
        saveDB(db);

        res.json({
            success: response.data.result_code === '1',
            mode: 'live',
            sentCount: receivers.length,
            apiResult: response.data
        });
    } catch (error) {
        console.error('[SMS 발송 오류]', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// SMS 발송 이력 조회
app.get('/api/sms/history', (req, res) => {
    const db = loadDB();
    res.json(db.sms_history || []);
});

// --- Socket.io 실시간 통신 (Phase 3) ---
// 접속 중인 사용자 (emp_id를 키값으로 관리)
const onlineUsers = new Map();

io.on('connection', (socket) => {
    console.log(`[Socket] A user connected: ${socket.id}`);

    // 사용자 로그인 및 접속 알림
    socket.on('user_login', (empData) => {
        if(!empData || !empData.emp_id) return;
        
        // 메모리에 세션 등록
        socket.emp_id = empData.emp_id;
        onlineUsers.set(empData.emp_id, {
            socketId: socket.id,
            name: empData.name,
            lastActivity: Date.now()
        });

        console.log(`[Socket] User ${empData.name} (${empData.emp_id}) logged in`);
        
        // 전체 사용자에게 접속 상태 브로드캐스트 (내 자신 포함)
        io.emit('online_users_update', Array.from(onlineUsers.keys()));
    });

    // 사내 메신저 기능 (1:1 메시지 등)
    socket.on('send_message', (msgBody) => {
        // 모든 접속된 클라이언트에게 메시지 발송 (실제 운영 시에는 수신자 타겟팅 필요)
        io.emit('receive_message', msgBody);
    });

    // 전사 공지 푸시 (Broadcast)
    socket.on('send_broadcast', (msgBody) => {
        io.emit('receive_broadcast', msgBody);
    });

    // 클라이언트 종료 시
    socket.on('disconnect', () => {
        console.log(`[Socket] User disconnected: ${socket.id}`);
        if(socket.emp_id) {
            onlineUsers.delete(socket.emp_id);
            // 오프라인 상태 브로드캐스트
            io.emit('online_users_update', Array.from(onlineUsers.keys()));
        }
    });
});

// 백엔드 서버 시작 (app.listen -> server.listen으로 변경)
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Hongsam SPA ERP Backend API with WebSocket is running on http://0.0.0.0:${PORT}`);
});
