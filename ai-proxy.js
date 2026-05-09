// ═══════════════════════════════════════════════════════
// 홍삼한방타운 ERP — Claude AI 분석 프록시 서버
// 실행: node ai-proxy.js  (포트 3001)
// ═══════════════════════════════════════════════════════
const http = require('http');
const https = require('https');

const PORT = 3001;
// API 키는 환경변수에서 읽음: export ANTHROPIC_API_KEY="sk-ant-..."
const API_KEY = process.env.ANTHROPIC_API_KEY || '';

const server = http.createServer((req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/api/ai-analyze') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            let parsed;
            try { parsed = JSON.parse(body); } catch(e) {
                res.writeHead(400, {'Content-Type':'application/json'});
                res.end(JSON.stringify({error:'Invalid JSON'}));
                return;
            }

            const prompt = parsed.prompt || '';

            const postData = JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 2048,
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
                    'x-api-key': API_KEY,
                    'anthropic-version': '2023-06-01',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const apiReq = https.request(options, (apiRes) => {
                let data = '';
                apiRes.on('data', chunk => { data += chunk; });
                apiRes.on('end', () => {
                    res.writeHead(apiRes.statusCode, {'Content-Type':'application/json'});
                    res.end(data);
                });
            });

            apiReq.on('error', (err) => {
                res.writeHead(500, {'Content-Type':'application/json'});
                res.end(JSON.stringify({error: err.message}));
            });

            apiReq.write(postData);
            apiReq.end();
        });
    } else {
        res.writeHead(404, {'Content-Type':'application/json'});
        res.end(JSON.stringify({error:'Not Found'}));
    }
});

server.listen(PORT, () => {
    console.log(`[AI Proxy] Claude AI 프록시 서버 가동 — http://localhost:${PORT}`);
});
