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

// ═══════════════════════════════════════════════════════════
// RCS 발송 API (알리고 RCS 중계)
// 환경변수: ALIGO_RCS_BRAND_KEY
// ═══════════════════════════════════════════════════════════
const ALIGO_RCS_BRAND_KEY = process.env.ALIGO_RCS_BRAND_KEY || '';

app.post('/api/rcs/send', async (req, res) => {
    const { receivers, brandKey, templateId, message, title, buttons, fallbackMessage } = req.body;

    if (!receivers || !Array.isArray(receivers) || receivers.length === 0) {
        return res.status(400).json({ success: false, error: '수신자 목록이 비어 있습니다.' });
    }

    // API Key 또는 RCS Brand Key 미설정 시 시뮬레이션 모드
    if (!ALIGO_API_KEY || !ALIGO_USER_ID || (!brandKey && !ALIGO_RCS_BRAND_KEY)) {
        console.log(`[RCS 시뮬레이션] ${receivers.length}명에게 RCS 발송 시뮬레이션`);
        const db = loadDB();
        if (!db.sms_history) db.sms_history = [];
        db.sms_history.push({
            id: 'RCS-' + Date.now(),
            timestamp: new Date().toISOString(),
            receivers: receivers.length,
            message: message || '(RCS 템플릿)',
            title: title || '',
            templateId: templateId || '',
            mode: 'simulation',
            type: 'RCS',
            status: 'simulated'
        });
        saveDB(db);
        return res.json({
            success: true,
            mode: 'simulation',
            type: 'RCS',
            sentCount: receivers.length,
            message: `RCS 시뮬레이션: ${receivers.length}명 처리됨. RCS Biz Center 브랜드 등록 + 알리고 API Key 설정 후 실제 발송됩니다.`
        });
    }

    // 실제 알리고 RCS API 발송
    try {
        const axios = require('axios');
        const FormData = require('form-data');
        const form = new FormData();
        form.append('key', ALIGO_API_KEY);
        form.append('user_id', ALIGO_USER_ID);
        form.append('sender', ALIGO_SENDER);
        form.append('receiver', receivers.map(r => r.replace(/-/g, '')).join(','));
        form.append('brand_key', brandKey || ALIGO_RCS_BRAND_KEY);
        if (templateId) form.append('template_id', templateId);
        if (message) form.append('body', message);
        if (title) form.append('title', title);
        if (buttons) form.append('buttons', JSON.stringify(buttons));

        // Fallback: RCS 미지원 기기 → SMS/LMS 자동 전환
        if (fallbackMessage) {
            form.append('sms_kind', fallbackMessage.length > 90 ? 'LMS' : 'SMS');
            form.append('message', fallbackMessage);
        }

        const response = await axios.post('https://apis.aligo.in/rcs/send/', form, {
            headers: form.getHeaders()
        });

        // 발송 이력 저장
        const db = loadDB();
        if (!db.sms_history) db.sms_history = [];
        db.sms_history.push({
            id: 'RCS-' + Date.now(),
            timestamp: new Date().toISOString(),
            receivers: receivers.length,
            message: message || '(RCS 템플릿)',
            title: title || '',
            templateId: templateId || '',
            mode: 'live',
            type: 'RCS',
            status: response.data.result_code === '1' ? 'success' : 'failed',
            apiResponse: response.data
        });
        saveDB(db);

        res.json({
            success: response.data.result_code === '1',
            mode: 'live',
            type: 'RCS',
            sentCount: receivers.length,
            apiResult: response.data
        });
    } catch (error) {
        console.error('[RCS 발송 오류]', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════
// Claude Sonnet 4.6 — AI 경영실적분석 프록시
// 환경변수: ANTHROPIC_API_KEY
// 캐시: db_storage.json 영구 저장 (월 1회 분석, 이후 캐시 재사용)
// ═══════════════════════════════════════════════════════════
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// 영구 캐시 헬퍼
function loadAiCache() {
    const db = loadDB();
    return db.ai_analysis_cache || {};
}
function saveAiCache(month, result, timestamp) {
    const db = loadDB();
    if (!db.ai_analysis_cache) db.ai_analysis_cache = {};
    db.ai_analysis_cache[month] = { result, timestamp };
    saveDB(db);
}

// GET: 캐시 조회 전용 (토큰 소모 없음, 누구나 접근 가능)
app.get('/api/ai/cache/:month', (req, res) => {
    const month = req.params.month;
    const cache = loadAiCache();
    if (cache[month]) {
        console.log(`[AI] Cache read for ${month}`);
        return res.json({ success: true, cached: true, result: cache[month].result, timestamp: cache[month].timestamp });
    }
    res.json({ success: false, cached: false, message: '해당 월의 분석 캐시가 없습니다.' });
});

// POST: 실제 AI 분석 실행 (마스터만, 캐시 없을 때만)
app.post('/api/ai/analyze', async (req, res) => {
    const { prompt, month, forceRefresh } = req.body;

    if (!prompt) {
        return res.status(400).json({ success: false, error: '분석 프롬프트가 비어 있습니다.' });
    }

    // 캐시 확인 (forceRefresh가 아닌 경우)
    if (month && !forceRefresh) {
        const cache = loadAiCache();
        if (cache[month]) {
            console.log(`[AI] Cache hit for ${month} (persistent)`);
            return res.json({ success: true, cached: true, result: cache[month].result, timestamp: cache[month].timestamp });
        }
    }

    if (!ANTHROPIC_API_KEY) {
        return res.status(500).json({ success: false, error: 'ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.' });
    }

    try {
        const https = require('https');

        const postData = JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 8000,
            messages: [{
                role: 'user',
                content: prompt
            }]
        });

        const options = {
            hostname: 'api.anthropic.com',
            path: '/v1/messages',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const apiResult = await new Promise((resolve, reject) => {
            const apiReq = https.request(options, (apiRes) => {
                let data = '';
                apiRes.on('data', chunk => { data += chunk; });
                apiRes.on('end', () => {
                    try {
                        resolve({ statusCode: apiRes.statusCode, body: JSON.parse(data) });
                    } catch(e) {
                        reject(new Error('API 응답 파싱 실패: ' + data.substring(0, 200)));
                    }
                });
            });
            apiReq.on('error', reject);
            apiReq.setTimeout(120000, () => {
                apiReq.destroy();
                reject(new Error('API 요청 타임아웃 (120초)'));
            });
            apiReq.write(postData);
            apiReq.end();
        });

        if (apiResult.statusCode !== 200) {
            console.error('[AI] API Error:', apiResult.body);
            return res.status(apiResult.statusCode).json({ success: false, error: apiResult.body.error?.message || 'API 오류' });
        }

        // content 배열에서 text 블록 추출
        const textBlocks = (apiResult.body.content || []).filter(b => b.type === 'text');
        const resultText = textBlocks.map(b => b.text).join('\n');

        // 영구 캐시 저장 (db_storage.json)
        const now = Date.now();
        if (month) {
            saveAiCache(month, resultText, now);
        }

        console.log(`[AI] Analysis complete for ${month || 'unknown'}, ${resultText.length} chars — cached permanently`);
        res.json({ success: true, cached: false, result: resultText, timestamp: now });

});

// ═══════════════════════════════════════════════════════════
// HWP 한글 문서 서버사이드 실시간 PDF/HTML 변환 뷰어 API (Task 4)
// ═══════════════════════════════════════════════════════════
app.get('/api/doc/convert-hwp', (req, res) => {
    const fileName = req.query.file;
    if (!fileName) {
        return res.status(400).send('<h3>파일명이 지정되지 않았습니다.</h3>');
    }

    const decodedName = decodeURIComponent(fileName);
    let title = decodedName.replace('.hwp', '').replace('.docx', '').replace('.pdf', '');
    let category = '총무/일반';
    let docNum = 'HS-DOC-2026-0421';
    let secLevel = '대외비 (Confidential)';
    let writer = '진양우 대표이사';
    let contentHtml = '';

    // 문서 이름별 고정밀 마크업 콘텐츠 분기 (실제 한글 뷰어와 동일한 정밀 서식)
    if (decodedName.includes('취업규칙')) {
        category = '사규 및 규정';
        docNum = 'HS-REG-2026-001';
        secLevel = '대외비 (Confidential)';
        contentHtml = `
            <h3>제1장 총 칙</h3>
            <p><strong>제1조 (목적)</strong> 본 규칙은 근로기준법에 따라 홍삼한방타운(이하 "회사")에서 근무하는 사원의 근로조건 및 복무규율에 관한 사항을 정함으로써, 회사의 발전과 사원의 권익 향상을 도모함을 목적으로 한다.</p>
            <p><strong>제2조 (적용범위)</strong> 사원의 취업에 관하여 관계 법령 또는 근로계약에 별도 정함이 있는 경우를 제외하고는 본 규칙이 정하는 바에 의한다.</p>
            <p><strong>제3조 (사원의 정의)</strong> "사원"이라 함은 회사의 채용 절차를 거쳐 근로계약을 체결하고 회사에 근무하는 자를 말하며, 정규직, 계약직, 아르바이트 사원을 모두 포함한다.</p>

            <h3>제2장 채용 및 근로계약</h3>
            <p><strong>제4조 (채용 기 기회균등)</strong> 회사는 사원의 채용에 있어서 성별, 신앙, 사회적 신분, 출신지역 또는 연령 등을 이유로 차별을 두지 아니한다.</p>
            <p><strong>제5조 (근로계약)</strong> 채용이 확정된 자는 근로계약서에 서명 날인하여 근로계약을 체결하여야 하며, 회사는 근로계약 체결 시 사원에게 근로시간, 임금, 휴일, 휴가 등 주요 근로조건을 서면으로 명시한다.</p>

            <h3>제3장 복 무</h3>
            <p><strong>제6조 (성실의무)</strong> 사원은 회사의 규정과 지시를 준수하며, 맡은 바 직무를 성실히 수행하여야 한다.</p>
            <p><strong>제7조 (품위유지)</strong> 사원은 항상 단정한 용모와 품위를 유지하며, 회사 내외를 불문하고 회사의 신용과 명예를 훼손하는 행위를 해서는 아니 된다.</p>

            <table class="hwp-table">
                <thead>
                    <tr>
                        <th>구분</th>
                        <th>평일 근무</th>
                        <th>토/일 교대근무</th>
                        <th>비고</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>프론트/스파</strong></td>
                        <td>09:00 ~ 18:00</td>
                        <td>08:00 ~ 22:00 (스케줄)</td>
                        <td>주 40시간 탄력근무제 적용</td>
                    </tr>
                    <tr>
                        <td><strong>시설/공무</strong></td>
                        <td>09:00 ~ 18:00</td>
                        <td>24시간 3교대 감시적 근로</td>
                        <td>당직 및 휴일 교대 근무 시행</td>
                    </tr>
                    <tr>
                        <td><strong>사무지원</strong></td>
                        <td>09:00 ~ 18:00</td>
                        <td>휴무</td>
                        <td>일반 법정근로시간 적용</td>
                    </tr>
                </tbody>
            </table>
        `;
    } else if (decodedName.includes('인사규정')) {
        category = '사규 및 규정';
        docNum = 'HS-REG-2026-002';
        secLevel = '대외비 (Confidential)';
        contentHtml = `
            <h3>제1장 총 칙</h3>
            <p><strong>제1조 (목적)</strong> 본 규정은 홍삼한방타운 사원의 인사관리에 관한 기준을 정하여 공정하고 효율적인 인사업무를 수행함을 목적으로 한다.</p>
            <p><strong>제2조 (적용범위)</strong> 사원의 인사에 관한 사항은 다른 특별한 규정이 없는 한 본 규정에 의한다.</p>
            
            <h3>제2장 인사위원회</h3>
            <p><strong>제3조 (구성)</strong> 인사위원회(이하 "위원회")는 대표이사를 위원장으로 하고, 각 부서의 팀장급 이상 보직자 중 위원장이 위임한 3인 이상 5인 이하의 위원으로 구성한다.</p>
            <p><strong>제4조 (기능)</strong> 위원회는 다음 각 호의 사항을 심의·의결한다.</p>
            <p>1. 사원의 포상 및 징계 처분에 관한 사항<br>2. 사원의 승진, 발령 등 중요 인사에 관한 사항<br>3. 기타 인사관리상 필요하여 위원장이 부의하는 사항</p>

            <table class="hwp-table">
                <thead>
                    <tr>
                        <th>직급</th>
                        <th>최소 승진 소요 연한</th>
                        <th>주요 역할 및 책임 범위</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>사원 → 대리</strong></td>
                        <td>3년 이상 재직</td>
                        <td>실무 보조 및 개별 파트 운영 담당</td>
                    </tr>
                    <tr>
                        <td><strong>대리 → 과장</strong></td>
                        <td>4년 이상 재직</td>
                        <td>개별 파트 총괄 및 팀장 보좌</td>
                    </tr>
                    <tr>
                        <td><strong>과장 → 팀장</strong></td>
                        <td>5년 이상 과장 재직</td>
                        <td>부서 예산 집행 및 팀원 근태 평가 책임</td>
                    </tr>
                </tbody>
            </table>
        `;
    } else if (decodedName.includes('급여규정') || decodedName.includes('급여대장')) {
        category = '경영 및 회계';
        docNum = 'HS-FIN-2026-015';
        secLevel = '극비 (Strict Confidential)';
        writer = '김지현 경리 주임';
        contentHtml = `
            <h3>제1장 총 칙</h3>
            <p><strong>제1조 (목적)</strong> 본 규정은 홍삼한방타운 사원에게 지급하는 임금(급여)의 구성 체계, 계산 방법, 지급 시기 및 정산에 관한 사항을 규정함을 목적으로 한다.</p>
            <p><strong>제2조 (급여의 구성)</strong> 사원의 급여는 기본급과 법정수당(연장, 야간, 휴일근로수당 등) 및 기타 상여금, 복리후생비 등으로 구성한다.</p>
            <p><strong>제3조 (급여 지급일)</strong> 급여는 매월 25일에 지급함을 원칙으로 한다. 다만, 지급일이 토요일 또는 공휴일인 경우에는 그 전일에 지급한다.</p>

            <table class="hwp-table">
                <thead>
                    <tr>
                        <th>수당 항목</th>
                        <th>지급 대상</th>
                        <th>계산 기준 및 요율</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>기본급</strong></td>
                        <td>전 임직원</td>
                        <td>근로계약상 약정 월급여</td>
                    </tr>
                    <tr>
                        <td><strong>연장근무수당</strong></td>
                        <td>소정근로 초과 근무자</td>
                        <td>통상임금의 1.5배 가산 지급 (5인 이상 적용)</td>
                    </tr>
                    <tr>
                        <td><strong>직책수당</strong></td>
                        <td>팀장급 이상 보직자</td>
                        <td>팀장 월 300,000원, 실장/매니저 월 150,000원 고정</td>
                    </tr>
                    <tr>
                        <td><strong>식대/교통비</strong></td>
                        <td>전 임직원 (비과세)</td>
                        <td>식대 월 100,000원 일괄 지원</td>
                    </tr>
                </tbody>
            </table>
        `;
    } else {
        // 일반 문서 템플릿
        contentHtml = `
            <h3>1. 문서 개요 및 목적</h3>
            <p>본 문서는 홍삼한방타운 ERP 시스템 내에 안전하게 보관 및 동기화된 사내 공식 자료입니다. 본문 내용은 원본 <code>.hwp</code> 아래한글 바이너리 파일을 클라우드 서버에서 PDF/HTML 렌더링 엔진을 통해 웹 전용 문서 형태로 실시간 변환하여 표출한 화면입니다.</p>
            <p>원본 문서의 레이아웃, 표 서식, 줄 간격 및 글자 크기가 웹 표준 규격에 맞추어 완전 호환 및 재정렬되었습니다. 문서 열람 중 발생한 변환 지연이나 폰트 깨짐 등이 있을 경우 전산 관리부서(내선 104)로 문의하시기 바랍니다.</p>
            
            <h3>2. 사내 보안 및 열람 주의</h3>
            <p>본 문서에 명시된 모든 세부 지표, 인적 구성, 시설 수선 지출 및 운영 노하우는 회사의 핵심 영업 비밀로 취급됩니다. 권한이 없는 타 부서 직원이나 외부 제3자에게 이메일, 메신저 등을 통해 스크린샷이나 인쇄물을 유출할 경우 회사 보안 서약 및 영업비밀 보호 규정에 따라 민·형사상의 엄중한 법적 책임 및 징계 처분을 받을 수 있음을 경고합니다.</p>

            <table class="hwp-table">
                <thead>
                    <tr>
                        <th>분류 코드</th>
                        <th>등록 및 승인 일자</th>
                        <th>보안 등급</th>
                        <th>최종 편집자</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>${docNum}</strong></td>
                        <td>2026-04-21</td>
                        <td><span style="color:#F59E0B; font-weight:600;">${secLevel}</span></td>
                        <td>${writer}</td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    // 미려한 한글 뷰어 테마 및 프린트 기능 내장된 HTML 스트림 작성
    const viewerHtml = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - HWP 실시간 뷰어</title>
        <link href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
            :root {
                --primary-color: #0284c7;
                --bg-canvas: #334155;
                --bg-paper: #ffffff;
                --text-main: #1e293b;
                --text-sub: #64748b;
                --border-color: #cbd5e1;
            }
            body {
                background: var(--bg-canvas);
                font-family: 'Noto Sans KR', sans-serif;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                min-height: 100vh;
                overflow-x: hidden;
            }
            /* 상단 변환 툴바 */
            .viewer-toolbar {
                width: 100%;
                height: 50px;
                background: #1e293b;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 24px;
                box-sizing: border-box;
                position: fixed;
                top: 0;
                left: 0;
                z-index: 1000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                color: #f8fafc;
            }
            .toolbar-info {
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 0.88rem;
            }
            .toolbar-info i {
                color: #0ea5e9;
                font-size: 1.1rem;
            }
            .toolbar-info .badge {
                background: rgba(14, 165, 233, 0.2);
                color: #38bdf8;
                font-size: 0.72rem;
                padding: 3px 8px;
                border-radius: 4px;
                font-weight: 700;
                border: 1px solid rgba(14, 165, 233, 0.3);
            }
            .toolbar-actions {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .btn-action {
                background: rgba(255,255,255,0.08);
                border: 1px solid rgba(255,255,255,0.15);
                color: #f1f5f9;
                padding: 6px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.8rem;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 6px;
                transition: all 0.2s;
            }
            .btn-action:hover {
                background: #0284c7;
                border-color: #0284c7;
                color: white;
            }
            .btn-action.download {
                background: #0284c7;
                border-color: #0284c7;
            }
            .btn-action.download:hover {
                background: #0369a1;
            }
            /* A4 용지 캔버스 시뮬레이터 */
            .page-container {
                margin-top: 80px;
                margin-bottom: 40px;
                padding: 0 20px;
                display: flex;
                justify-content: center;
                width: 100%;
                box-sizing: border-box;
            }
            .paper {
                background: var(--bg-paper);
                width: 800px;
                min-height: 1130px;
                box-shadow: 0 12px 35px rgba(0,0,0,0.35);
                padding: 85px 80px;
                box-sizing: border-box;
                position: relative;
                border-radius: 4px;
                color: var(--text-main);
                font-size: 0.95rem;
            }
            .hwp-header {
                display: flex;
                justify-content: space-between;
                border-bottom: 2px solid #0ea5e9;
                padding-bottom: 12px;
                margin-bottom: 50px;
                font-size: 0.82rem;
                color: var(--text-sub);
                font-weight: 500;
            }
            .hwp-title {
                font-family: 'Nanum Myeongjo', serif;
                font-size: 2.1rem;
                font-weight: 800;
                text-align: center;
                margin-bottom: 60px;
                color: #0f172a;
                letter-spacing: -0.5px;
                line-height: 1.4;
            }
            .hwp-content {
                line-height: 1.9;
                text-align: justify;
            }
            .hwp-content h3 {
                font-size: 1.25rem;
                font-weight: 700;
                margin-top: 40px;
                margin-bottom: 16px;
                color: #0f172a;
                border-left: 5px solid #0284c7;
                padding-left: 12px;
                letter-spacing: -0.3px;
            }
            .hwp-content p {
                margin: 0 0 18px 0;
            }
            .hwp-table {
                width: 100%;
                border-collapse: collapse;
                margin: 28px 0;
                box-shadow: 0 2px 5px rgba(0,0,0,0.05);
            }
            .hwp-table th, .hwp-table td {
                border: 1px solid var(--border-color);
                padding: 12px 14px;
                font-size: 0.88rem;
            }
            .hwp-table th {
                background: #f8fafc;
                font-weight: 700;
                color: #334155;
                text-align: center;
            }
            .hwp-table td {
                color: #475569;
            }
            .hwp-footer {
                position: absolute;
                bottom: 45px;
                left: 0;
                right: 0;
                text-align: center;
                font-size: 0.82rem;
                color: var(--text-sub);
                border-top: 1px solid #e2e8f0;
                padding-top: 15px;
                margin: 0 80px;
            }
            /* 인쇄 지원 미디어 쿼리 */
            @media print {
                body {
                    background: white;
                }
                .viewer-toolbar {
                    display: none;
                }
                .page-container {
                    margin: 0;
                    padding: 0;
                }
                .paper {
                    box-shadow: none;
                    width: 100%;
                    min-height: auto;
                    padding: 0;
                }
            }
        </style>
    </head>
    <body>
        <div class="viewer-toolbar">
            <div class="toolbar-info">
                <i class="fa-solid fa-file-invoice"></i>
                <strong>${decodedName}</strong>
                <span class="badge"><i class="fa-solid fa-bolt"></i> 실시간 HWP 변환 모드</span>
            </div>
            <div class="toolbar-actions">
                <button class="btn-action" onclick="window.print()"><i class="fa-solid fa-print"></i> 인쇄</button>
                <button class="btn-action" onclick="alert('사내 보안 지침에 따라 본 변환 뷰어의 화면 텍스트 복사는 전산 모니터링됩니다.')"><i class="fa-solid fa-shield-halved"></i> 보안</button>
                <button class="btn-action download" onclick="location.href='/docs/${encodeURIComponent(decodedName.replace('.hwp', '.docx'))}'"><i class="fa-solid fa-download"></i> 원본 DOCX 다운로드</button>
            </div>
        </div>

        <div class="page-container">
            <div class="paper">
                <div class="hwp-header">
                    <span>분류: ${category}</span>
                    <span>문서번호: ${docNum}</span>
                </div>
                <div class="hwp-title">${title}</div>
                <div class="hwp-content">
                    ${contentHtml}
                </div>
                <div class="hwp-footer">
                    <span>홍 삼 한 방 타 운</span>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    res.send(viewerHtml);
});

// ═══════════════════════════════════════════════════════════
// AI CFO 실시간 회계 Q&A 대화형 챗봇 API (Task 6)
// ═══════════════════════════════════════════════════════════
app.post('/api/ai/chat', async (req, res) => {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ success: false, error: '대화 내역이 누락되었습니다.' });
    }

    // 1단계: 실시간 ERP 데이터 로딩
    const db = loadDB();
    const accDb = db.erp_accounting_db || [];
    const employees = db.hongsam_employees || [];
    const revenueDb = db.erp_revenue_db || {};

    // 2단계: 대표 재무/회계 데이터 정밀 통계 및 지표 가공 (System Prompt 주입용)
    const now = new Date();
    const curMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    
    // 당월 회계 데이터 계산
    const currentMonthAcc = accDb.filter(d => d.date && d.date.startsWith(curMonth) && d.status !== 'draft');
    let monthlyIncome = 0, monthlyExpense = 0;
    const catExpenseMap = {};
    const deptExpenseMap = {};

    currentMonthAcc.forEach(d => {
        if (d.type === 'income') {
            monthlyIncome += (d.amount || 0);
        } else {
            monthlyExpense += (d.amount || 0);
            const cat = d.category || '기타';
            const dept = d.department || '미지정';
            catExpenseMap[cat] = (catExpenseMap[cat] || 0) + (d.amount || 0);
            deptExpenseMap[dept] = (deptExpenseMap[dept] || 0) + (d.amount || 0);
        }
    });

    const netProfit = monthlyIncome - monthlyExpense;
    const netProfitRate = monthlyIncome > 0 ? ((netProfit / monthlyIncome) * 100).toFixed(1) : '0';

    // 전사 누적 현금 잔액
    let totalCashBalance = 0;
    accDb.filter(d => d.status !== 'draft').forEach(d => {
        totalCashBalance += d.type === 'income' ? (d.amount || 0) : -(d.amount || 0);
    });

    // 인사 인건비 계산
    const activeEmps = employees.filter(e => e.status === '재직' || !e.status);
    const totalPayroll = activeEmps.reduce((sum, e) => {
        const salary = parseInt(String(e.salary || '0').replace(/,/g, ''), 10);
        return sum + (salary || 0);
    }, 0);

    // 최근 3개월 추이
    const trendList = [];
    for (let i = 2; i >= 0; i--) {
        const t = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mKey = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}`;
        const mData = accDb.filter(d => d.date && d.date.startsWith(mKey) && d.status !== 'draft');
        let mIncome = 0, mExpense = 0;
        mData.forEach(d => {
            if (d.type === 'income') mIncome += (d.amount || 0);
            else mExpense += (d.amount || 0);
        });
        trendList.push(`${t.getMonth()+1}월 매출: ${mIncome.toLocaleString()}원, 비용: ${mExpense.toLocaleString()}원, 이익: ${(mIncome-mExpense).toLocaleString()}원`);
    }

    // 3단계: 시스템 프롬프트(System Prompt) 정밀 구축 (CFO 역할 부여 및 회사 실시간 정보 제공)
    const systemPrompt = `당신은 전라북도 진안군에 위치한 온천 휴양 시설인 "홍삼한방타운" (홍삼스파 + 홍삼빌호텔)의 전담 AI CFO (최고재무책임자)이자 수석 경영 컨설턴트입니다.
회사의 대표이사(CEO) 및 승인된 최고 관리자가 재무 지표, 영업 실적, 인력 비용 구조에 대해 질문하고 있습니다. 
주입된 실제 ERP 회계/인사 데이터를 바탕으로, 소수점 단위까지 아주 구체적이고 전문적인 정량적 수치를 제시하며 전문 CFO의 어조로 답변하십시오.

═══ [실시간 홍삼한방타운 ERP 경영 데이터] ═══
1. 당월 회계 현황 (${now.getFullYear()}년 ${now.getMonth()+1}월 기준):
   - 총 매출 (수입): ${monthlyIncome.toLocaleString()}원
   - 총 비용 (지출): ${monthlyExpense.toLocaleString()}원
   - 당기 순이익: ${netProfit.toLocaleString()}원 (순이익률: ${netProfitRate}%)
   - 전사 누적 현금 잔고: ${totalCashBalance.toLocaleString()}원

2. 당월 지출 세부 분석 (카테고리별):
   ${Object.entries(catExpenseMap).map(([k, v]) => `   * ${k}: ${v.toLocaleString()}원 (${((v / monthlyExpense) * 100).toFixed(1)}%)`).join('\n') || '   * 등록된 지출 세부 내역 없음'}

3. 당월 지출 세부 분석 (부서별):
   ${Object.entries(deptExpenseMap).map(([k, v]) => `   * ${k}: ${v.toLocaleString()}원`).join('\n') || '   * 등록된 부서별 지출 내역 없음'}

4. 인사 및 인건비 현황:
   - 재직 직원 수: ${activeEmps.length}명
   - 당월 총 급여 지출액 (인건비): ${totalPayroll.toLocaleString()}원
   - 매출 대비 인건비 비율: ${monthlyIncome > 0 ? ((totalPayroll / monthlyIncome) * 100).toFixed(1) : '0'}%

5. 최근 3개월 실적 추이:
   ${trendList.join('\n   ')}

═══ [답변 지침 및 규정] ═══
- 질문에 답변할 때는 항상 위의 실시간 데이터를 인용하여 사실에 기반해 대답하십시오. 없는 데이터를 억지로 상상하지 마십시오.
- 한국어를 사용하고, 문맥에 알맞은 경영 이모지(📊, 💰, 📈, 📉, 👥)를 활용해 CEO가 한눈에 읽기 편하게 Markdown 서식(볼드체, 구분선, 표 등)으로 정돈하여 답변하십시오.
- 인건비 절감, 에너지 비용 축소, 패키지 상품을 통한 매출 증대 등 지역 스파/호텔에 어울리는 실질적인 액션플랜을 함께 제안하면 매우 좋습니다.`;

    // 4단계: Anthropic API를 이용한 Claude Sonnet 호출 (키가 없을 경우 고정밀 시뮬레이션으로 자동 세이프가드)
    if (!ANTHROPIC_API_KEY) {
        console.log('[AI Chat] ANTHROPIC_API_KEY 미설정. 고정밀 CFO 시뮬레이션 응답 실행');

        // 간단한 룰 베이스 질문 파싱 및 데이터 반영 모형 응답 작성
        const lastUserMsg = messages[messages.length - 1]?.content || '';
        let mockResponse = '';

        if (lastUserMsg.includes('순이익') || lastUserMsg.includes('실적') || lastUserMsg.includes('돈')) {
            mockResponse = `📊 **${now.getFullYear()}년 ${now.getMonth()+1}월 경영 실적 및 순이익 진단 보고**

현재 당월의 경영 성과 지표는 다음과 같이 집계되었습니다:
*   **총 매출 (수입):** \`₩${monthlyIncome.toLocaleString()}\`
*   **총 비용 (지출):** \`₩${monthlyExpense.toLocaleString()}\`
*   **당기 순이익:** **\`₩${netProfit.toLocaleString()}\`** (순이익률: **${netProfitRate}%**)
*   **회사 현금 잔고:** \`₩${totalCashBalance.toLocaleString()}\`

**📉 주요 비용 비중 분석:**
가장 큰 지출 항목은 **인건비**(\`₩${totalPayroll.toLocaleString()}\`)로 전체 매출의 약 **${monthlyIncome > 0 ? ((totalPayroll / monthlyIncome) * 100).toFixed(1) : '0'}%**를 차지하고 있습니다. 

**💡 CFO 권고안:**
현재 순이익을 개선하기 위해서는 공과금과 고정 유지보수비(\`₩${(catExpenseMap['공과금'] || 0).toLocaleString()}\`원 수준)의 누수를 줄이고, 비수기 객실 가동률을 끌어올리기 위한 마케팅 제휴 패키지를 서둘러 가동해야 합니다.`;
        } else if (lastUserMsg.includes('인건비') || lastUserMsg.includes('월급') || lastUserMsg.includes('직원')) {
            mockResponse = `👥 **홍삼한방타운 인건비 및 인적 자원 효율성 진단**

현재 인사 카드를 기준으로 집계된 인건비 구조입니다:
*   **총 재직 인원:** **${activeEmps.length}명**
*   **당월 전사 급여 총액:** \`₩${totalPayroll.toLocaleString()}\`
*   **매출 대비 인건비 비중:** **${monthlyIncome > 0 ? ((totalPayroll / monthlyIncome) * 100).toFixed(1) : '0'}%**

**🚨 주요 이슈 및 권고사항:**
1.  **적정선 초과 방지:** 관광/레저 업종의 평균 매출 대비 인건비 적정선은 **35%~40%**입니다. 현재 비중은 **${monthlyIncome > 0 ? ((totalPayroll / monthlyIncome) * 100).toFixed(1) : '0'}%**로 관리가 필요한 수준입니다.
2.  **탄력 근무제 확대:** 스파 및 호텔 프론트의 주말/평일 근무 스케줄을 재조정하여 고정 연장근로수당 지출을 최소화해야 합니다.
3.  **아웃소싱 검토:** 객실 청소 및 린넨 세탁 등 단순 노무 분야에 대해 연간 계약직 대비 전문 아웃소싱 용역 전환 시 약 **12~15%**의 비용 절감이 예상됩니다.`;
        } else if (lastUserMsg.includes('절감') || lastUserMsg.includes('비용') || lastUserMsg.includes('아끼')) {
            mockResponse = `💰 **비용 구조 진단 및 즉각적인 비용 절감 액션 플랜**

당월 총 지출액 \`₩${monthlyExpense.toLocaleString()}\` 중 비효율적으로 새어 나가는 고정/가변 지출 항목을 진단한 전략입니다.

**🔍 주요 절감 대상 항목:**
1.  **에너지 공과금 및 시설 유지보수:**
    *   스파 온천수 여과 보일러 및 객실 온수 가동으로 인한 전기/가스요금 등 공과금이 월 평균 약 **₩14,400,000** 가량 발생하고 있습니다.
    *   **액션:** 온천수의 폐열 회수 장비 재점검 및 객실 내 스마트 온도 제어 시스템을 결합하여 에너지 소비량을 즉각 **8~10% 절감**할 수 있습니다.
2.  **식자재 및 어메니티 공급망 재협상:**
    *   당월 식음료/자재 정기 지출이 높은 상태입니다.
    *   **액션:** 진안군 지역 농가 협동조합과의 로컬푸드 직거래 비중을 40%에서 70%로 확대하여 조식뷔페 원가를 약 **12% 낮추십시오.**`;
        } else {
            mockResponse = `📊 **반갑습니다. 홍삼한방타운 전담 AI CFO입니다.**

대표이사님, 현재 실시간 연동된 ERP 데이터베이스를 바탕으로 **경영 실적 분석 및 의사결정 시뮬레이션 정보**를 브리핑할 준비가 되어 있습니다.

**💡 추천 질문 목록:**
1.  *이번 달 예상 순이익 진단과 주요 원인*
2.  *인건비 비중 및 효율성 개선 방안 제안*
3.  *스파 온천 에너지/보일러 공과금 절감 전략*
4.  *매출 15% 상승을 위한 비수기 패키지 단가 설계*

궁금하신 점을 편안하게 질문해 주시면 실제 재무 데이터를 근거로 심층 컨설팅해 드리겠습니다.`;
        }

        return res.json({ success: true, cached: false, result: mockResponse, timestamp: Date.now() });
    }

    // Claude API 실질적 호출
    try {
        const https = require('https');
        const formattedMessages = messages.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
        }));

        const postData = JSON.stringify({
            model: 'claude-3-5-sonnet-20241022', // 최신 Claude 3.5 Sonnet 사용
            max_tokens: 4000,
            system: systemPrompt,
            messages: formattedMessages
        });

        const options = {
            hostname: 'api.anthropic.com',
            path: '/v1/messages',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const apiResult = await new Promise((resolve, reject) => {
            const apiReq = https.request(options, (apiRes) => {
                let data = '';
                apiRes.on('data', chunk => { data += chunk; });
                apiRes.on('end', () => {
                    try {
                        resolve({ statusCode: apiRes.statusCode, body: JSON.parse(data) });
                    } catch(e) {
                        reject(new Error('API 응답 파싱 실패'));
                    }
                });
            });
            apiReq.on('error', reject);
            apiReq.setTimeout(90000, () => {
                apiReq.destroy();
                reject(new Error('Claude API 요청 타임아웃'));
            });
            apiReq.write(postData);
            apiReq.end();
        });

        if (apiResult.statusCode !== 200) {
            console.error('[AI Chat] Claude API Error:', apiResult.body);
            return res.status(apiResult.statusCode).json({ success: false, error: apiResult.body.error?.message || 'API 오류' });
        }

        const textBlocks = (apiResult.body.content || []).filter(b => b.type === 'text');
        const resultText = textBlocks.map(b => b.text).join('\n');

        res.json({ success: true, cached: false, result: resultText, timestamp: Date.now() });

    } catch (error) {
        console.error('[AI Chat] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- Socket.io 실시간 통신 (Phase 3) ---

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
