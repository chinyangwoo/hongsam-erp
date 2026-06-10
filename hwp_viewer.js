/**
 * hwp_viewer.js - REAL document preview engine (Item 4, replaces the fake hardcoded viewer)
 *
 * GET /api/doc/convert-hwp?file=<name>
 *  - Resolves the requested name against the docs/ folder (handles .hwp names in the
 *    UI list whose real file is .pdf / .docx / .xlsx).
 *  - PDF  -> streamed as-is (browser renders it natively in the iframe)
 *  - DOCX -> converted to HTML via mammoth
 *  - XLSX -> first sheet rendered as an HTML table via xlsx (SheetJS)
 *  - HWPX -> unzipped (adm-zip) and its XML text extracted to HTML
 *  - HWP  -> converted via pyhwp (hwp5html / hwp5txt) when installed, otherwise a clear notice
 *  - Conversion results are cached in memory by file mtime (performance).
 */
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const DOCS_DIR = path.join(__dirname, 'docs');
const cache = new Map(); // cacheKey -> html
const EXT_TRY = ['.pdf', '.docx', '.xlsx', '.xlsxx', '.xls', '.hwpx', '.hwp', '.txt'];

function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function shell(title, meta, bodyHtml) {
    return '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
        '<title>' + esc(title) + '</title><style>' +
        "body{margin:0;background:#1E293B;font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#0F172A;}" +
        '.page{max-width:860px;margin:24px auto;background:#fff;border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,.35);padding:48px 56px;min-height:80vh;}' +
        '.doc-head{border-bottom:3px solid #B91C1C;padding-bottom:14px;margin-bottom:24px;}' +
        '.doc-head h1{font-size:1.45rem;margin:0 0 8px;}' +
        '.doc-meta{font-size:.78rem;color:#64748B;display:flex;gap:18px;flex-wrap:wrap;}' +
        'h2,h3{margin:26px 0 10px;color:#1E293B;} p{line-height:1.85;margin:9px 0;font-size:.95rem;}' +
        'table{border-collapse:collapse;width:100%;margin:16px 0;font-size:.85rem;}' +
        'th,td{border:1px solid #CBD5E1;padding:8px 10px;text-align:left;} th{background:#F1F5F9;}' +
        'pre{white-space:pre-wrap;font-family:inherit;line-height:1.8;font-size:.93rem;}' +
        'img{max-width:100%;} .notice{background:#FEF3C7;border:1px solid #F59E0B;border-radius:8px;padding:18px;line-height:1.7;}' +
        '</style></head><body><div class="page">' +
        '<div class="doc-head"><h1>' + esc(title) + '</h1><div class="doc-meta">' + meta + '</div></div>' +
        bodyHtml + '</div></body></html>';
}

function metaOf(fp) {
    try {
        const st = fs.statSync(fp);
        return '<span>파일: ' + esc(path.basename(fp)) + '</span><span>크기: ' + (st.size / 1024).toFixed(1) + ' KB</span>' +
            '<span>수정일: ' + st.mtime.toISOString().slice(0, 10) + '</span><span>홍삼한방타운 문서관리시스템</span>';
    } catch (e) { return '<span>홍삼한방타운 문서관리시스템</span>'; }
}

// resolve UI name (may say .hwp) to a real file inside docs/
function resolveFile(requested) {
    const base = path.basename(String(requested || '')).replace(/[\\/]/g, '');
    if (!base) return null;
    let fp = path.join(DOCS_DIR, base);
    if (fs.existsSync(fp) && fs.statSync(fp).isFile()) return fp;
    const stem = base.replace(/\.[A-Za-z0-9]+$/, '');
    for (let i = 0; i < EXT_TRY.length; i++) {
        fp = path.join(DOCS_DIR, stem + EXT_TRY[i]);
        if (fs.existsSync(fp)) return fp;
    }
    try {
        const hit = fs.readdirSync(DOCS_DIR).find(function (f) {
            return f.replace(/\.[A-Za-z0-9]+$/, '') === stem || f.indexOf(stem) === 0;
        });
        if (hit) return path.join(DOCS_DIR, hit);
    } catch (e) {}
    return null;
}

function tryRequire(name) { try { return require(name); } catch (e) { return null; } }

function convertDocx(fp) {
    const mammoth = tryRequire('mammoth');
    if (!mammoth) return Promise.resolve(shell(path.basename(fp), metaOf(fp), '<div class="notice">서버에 mammoth 모듈이 설치되지 않았습니다. (npm install mammoth)</div>'));
    return mammoth.convertToHtml({ path: fp }).then(function (r) {
        return shell(path.basename(fp), metaOf(fp), r.value || '<p>(내용 없음)</p>');
    });
}

function convertXlsx(fp) {
    const XLSX = tryRequire('xlsx');
    if (!XLSX) return Promise.resolve(shell(path.basename(fp), metaOf(fp), '<div class="notice">서버에 xlsx 모듈이 설치되지 않았습니다. (npm install xlsx)</div>'));
    return new Promise(function (resolve) {
        try {
            const wb = XLSX.readFile(fp, { sheetRows: 300 });
            let body = '';
            wb.SheetNames.slice(0, 3).forEach(function (sn) {
                body += '<h3>시트: ' + esc(sn) + '</h3>' + XLSX.utils.sheet_to_html(wb.Sheets[sn], { header: '', footer: '' });
            });
            if (wb.SheetNames.length > 3) body += '<p style="color:#64748B">(이외 ' + (wb.SheetNames.length - 3) + '개 시트는 다운로드하여 확인하세요)</p>';
            resolve(shell(path.basename(fp), metaOf(fp), body || '<p>(내용 없음)</p>'));
        } catch (e) {
            resolve(shell(path.basename(fp), metaOf(fp), '<div class="notice">엑셀 변환 오류: ' + esc(e.message) + '</div>'));
        }
    });
}

function convertHwpx(fp) {
    const AdmZip = tryRequire('adm-zip');
    if (!AdmZip) return Promise.resolve(shell(path.basename(fp), metaOf(fp), '<div class="notice">서버에 adm-zip 모듈이 설치되지 않았습니다. (npm install adm-zip)</div>'));
    return new Promise(function (resolve) {
        try {
            const zip = new AdmZip(fp);
            const sections = zip.getEntries().filter(function (e) { return /Contents\/section\d+\.xml$/i.test(e.entryName); })
                .sort(function (a, b) { return a.entryName.localeCompare(b.entryName); });
            let body = '';
            sections.forEach(function (entry) {
                const xml = entry.getData().toString('utf8');
                const paras = xml.split(/<hp:p[\s>]/).slice(1);
                paras.forEach(function (pXml) {
                    const texts = [];
                    const re = /<hp:t[^>]*>([\s\S]*?)<\/hp:t>/g;
                    let m;
                    while ((m = re.exec(pXml)) !== null) texts.push(m[1]);
                    const t = texts.join('').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
                    if (t.trim()) body += '<p>' + esc(t) + '</p>';
                });
            });
            resolve(shell(path.basename(fp), metaOf(fp), body || '<p>(텍스트 내용을 찾지 못했습니다. 원본을 다운로드하세요.)</p>'));
        } catch (e) {
            resolve(shell(path.basename(fp), metaOf(fp), '<div class="notice">HWPX 변환 오류: ' + esc(e.message) + '</div>'));
        }
    });
}

function convertHwp(fp) {
    return new Promise(function (resolve) {
        execFile('hwp5txt', [fp], { timeout: 20000, maxBuffer: 8 * 1024 * 1024 }, function (err, stdout) {
            if (!err && stdout && stdout.trim()) {
                const paras = stdout.split(/\n{2,}/).map(function (s) { return '<p>' + esc(s.trim()) + '</p>'; }).join('');
                return resolve(shell(path.basename(fp), metaOf(fp), paras));
            }
            resolve(shell(path.basename(fp), metaOf(fp),
                '<div class="notice"><strong>HWP 원본 변환기가 서버에 설치되어 있지 않습니다.</strong><br>' +
                '관리자: 서버에서 <code>pip3 install pyhwp</code> 실행 후 다시 시도하세요.<br>' +
                '문서는 우측 다운로드 버튼으로 받아 한글 프로그램에서 열 수 있습니다.</div>'));
        });
    });
}

function setup(app) {
    app.get('/api/doc/convert-hwp', function (req, res) {
        const fp = resolveFile(decodeURIComponent(String(req.query.file || '')));
        if (!fp) {
            return res.status(404).send(shell('문서를 찾을 수 없음', '<span>홍삼한방타운 문서관리시스템</span>',
                '<div class="notice">요청한 문서가 서버 docs 폴더에 없습니다: ' + esc(req.query.file || '') + '</div>'));
        }
        const ext = path.extname(fp).toLowerCase();
        if (ext === '.pdf') {
            res.type('application/pdf');
            return fs.createReadStream(fp).pipe(res);
        }
        let key;
        try { key = fp + '|' + fs.statSync(fp).mtimeMs; } catch (e) { key = fp; }
        if (cache.has(key)) return res.type('html').send(cache.get(key));

        let job;
        if (ext === '.docx') job = convertDocx(fp);
        else if (ext === '.xlsx' || ext === '.xls' || ext === '.xlsxx') job = convertXlsx(fp);
        else if (ext === '.hwpx') job = convertHwpx(fp);
        else if (ext === '.hwp') job = convertHwp(fp);
        else if (ext === '.txt') job = Promise.resolve(shell(path.basename(fp), metaOf(fp), '<pre>' + esc(fs.readFileSync(fp, 'utf8').slice(0, 200000)) + '</pre>'));
        else job = Promise.resolve(shell(path.basename(fp), metaOf(fp), '<div class="notice">이 형식(' + esc(ext) + ')은 미리보기를 지원하지 않습니다. 다운로드하여 확인하세요.</div>'));

        job.then(function (html) {
            if (cache.size > 100) cache.clear();
            cache.set(key, html);
            res.type('html').send(html);
        }).catch(function (e) {
            res.status(500).send(shell('변환 오류', '', '<div class="notice">' + esc(e.message) + '</div>'));
        });
    });
    console.log('[DOC] real document preview engine ready (pdf/docx/xlsx/hwpx/hwp)');
}

module.exports = { setup: setup };
