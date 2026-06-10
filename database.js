// 홍삼스파 ERP — SQLite 데이터베이스 레이어 (Phase 3)
// 기존 db_storage.json (전체 읽기/쓰기)을 SQLite로 교체.
// loadDB/saveDB 호환 유지 + 컬렉션/항목 단위 CRUD 추가.
//
// [연결] server.js 에서:
//   const { loadDB, saveDB, db } = require('./database');
//   (기존 loadDB/saveDB 함수 정의를 삭제)
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "erp_data.db");
const JSON_PATH = path.join(__dirname, "db_storage.json");
const BACKUP_DIR = path.join(__dirname, "backups");

// 백업 폴더 생성
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

// SQLite 초기화
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("busy_timeout = 5000");

sqlite.exec(
    "CREATE TABLE IF NOT EXISTS collections (" +
    "  key TEXT PRIMARY KEY," +
    "  data TEXT NOT NULL DEFAULT '{}'," +
    "  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))" +
    ")"
);

// === 하위 호환: loadDB / saveDB ===
// 기존 코드는 loadDB()로 전체 DB 객체를 받아 쓰고, saveDB(obj)로 전체를 저장했습니다.
// 이 함수들은 그 패턴을 유지하되, 내부적으로 SQLite를 사용합니다.
function loadDB() {
    var rows = sqlite.prepare("SELECT key, data FROM collections").all();
    var obj = {};
    rows.forEach(function (r) {
        try { obj[r.key] = JSON.parse(r.data); } catch (e) { obj[r.key] = r.data; }
    });
    return obj;
}

function saveDB(obj) {
    var upsert = sqlite.prepare(
        "INSERT INTO collections (key, data, updated_at) VALUES (?, ?, datetime('now','localtime')) " +
        "ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at"
    );
    var tx = sqlite.transaction(function (data) {
        Object.keys(data).forEach(function (k) {
            upsert.run(k, JSON.stringify(data[k]));
        });
    });
    tx(obj);
}

// === 컬렉션 단위 CRUD ===
function getCollection(key) {
    var row = sqlite.prepare("SELECT data FROM collections WHERE key = ?").get(key);
    if (!row) return null;
    try { return JSON.parse(row.data); } catch (e) { return null; }
}

function setCollection(key, data) {
    sqlite.prepare(
        "INSERT INTO collections (key, data, updated_at) VALUES (?, ?, datetime('now','localtime')) " +
        "ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at"
    ).run(key, JSON.stringify(data));
}

// === 항목 단위 CRUD (배열 컬렉션용) ===
// 배열 컬렉션에서 id 필드로 개별 항목을 찾아 조작합니다.
function getItem(collectionKey, itemId, idField) {
    idField = idField || "id";
    var arr = getCollection(collectionKey);
    if (!Array.isArray(arr)) return null;
    return arr.find(function (item) { return String(item[idField]) === String(itemId); }) || null;
}

function upsertItem(collectionKey, item, idField) {
    idField = idField || "id";
    var arr = getCollection(collectionKey);
    if (!Array.isArray(arr)) arr = [];
    var idx = arr.findIndex(function (x) { return String(x[idField]) === String(item[idField]); });
    if (idx >= 0) {
        arr[idx] = Object.assign({}, arr[idx], item);
    } else {
        arr.push(item);
    }
    setCollection(collectionKey, arr);
    return arr[idx >= 0 ? idx : arr.length - 1];
}

function deleteItem(collectionKey, itemId, idField) {
    idField = idField || "id";
    var arr = getCollection(collectionKey);
    if (!Array.isArray(arr)) return false;
    var before = arr.length;
    arr = arr.filter(function (x) { return String(x[idField]) !== String(itemId); });
    if (arr.length === before) return false;
    setCollection(collectionKey, arr);
    return true;
}

// === JSON -> SQLite 자동 마이그레이션 ===
// 서버 시작 시 db_storage.json이 있고 SQLite가 비어있으면 자동 이관.
function migrateFromJSON() {
    var count = sqlite.prepare("SELECT COUNT(*) AS c FROM collections").get().c;
    if (count > 0) return; // 이미 데이터 있으면 건너뜀

    if (!fs.existsSync(JSON_PATH)) {
        console.log("[DB] db_storage.json 없음, SQLite 빈 상태로 시작.");
        return;
    }

    console.log("[DB] db_storage.json -> SQLite 자동 마이그레이션 시작...");
    try {
        var raw = fs.readFileSync(JSON_PATH, "utf8");
        var data = JSON.parse(raw);
        saveDB(data);
        // JSON 파일을 백업 폴더로 이동
        var bakName = "db_storage_migrated_" + Date.now() + ".json";
        fs.renameSync(JSON_PATH, path.join(BACKUP_DIR, bakName));
        console.log("[DB] 마이그레이션 완료. 원본 -> backups/" + bakName);
    } catch (e) {
        console.error("[DB] 마이그레이션 실패:", e.message);
    }
}

// === 자동 백업 (하루 1회) ===
function autoBackup() {
    try {
        var today = new Date().toISOString().slice(0, 10);
        var bakPath = path.join(BACKUP_DIR, "erp_data_" + today + ".db");
        if (!fs.existsSync(bakPath)) {
            sqlite.backup(bakPath);
            console.log("[DB] 일일 백업: " + bakPath);
            // 30일 이전 백업 삭제
            var files = fs.readdirSync(BACKUP_DIR).filter(function (f) { return f.startsWith("erp_data_") && f.endsWith(".db"); });
            files.sort();
            while (files.length > 30) {
                var old = files.shift();
                try { fs.unlinkSync(path.join(BACKUP_DIR, old)); } catch (e) {}
            }
        }
    } catch (e) { console.warn("[DB] 백업 실패:", e.message); }
}

// 서버 시작 시 실행
migrateFromJSON();
autoBackup();
// 24시간마다 백업
setInterval(autoBackup, 24 * 60 * 60 * 1000);

// === CRUD API 라우트 설정 ===
function setupCrudRoutes(app) {
    var requireAuth = app.get("requireAuth");

    // 전체 DB (하위 호환 — 기존 cloud_sync 등)
    app.get("/api/db", function (req, res) {
        res.json(loadDB());
    });

    app.get("/api/db/:key", function (req, res) {
        var data = getCollection(req.params.key);
        if (data === null) return res.status(404).json({ error: "컬렉션 없음" });
        res.json(data);
    });

    app.post("/api/db/:key", function (req, res) {
        setCollection(req.params.key, req.body);
        res.json({ success: true });
    });

    // 항목 단위 CRUD (신규 API)
    app.get("/api/crud/:collection", function (req, res) {
        var data = getCollection(req.params.collection);
        res.json(data || []);
    });

    app.get("/api/crud/:collection/:id", function (req, res) {
        var idField = req.query.idField || "id";
        var item = getItem(req.params.collection, req.params.id, idField);
        if (!item) return res.status(404).json({ error: "항목 없음" });
        res.json(item);
    });

    app.post("/api/crud/:collection", function (req, res) {
        var idField = req.query.idField || "id";
        var saved = upsertItem(req.params.collection, req.body, idField);
        res.json({ success: true, item: saved });
    });

    app.put("/api/crud/:collection/:id", function (req, res) {
        var idField = req.query.idField || "id";
        req.body[idField] = req.params.id;
        var saved = upsertItem(req.params.collection, req.body, idField);
        res.json({ success: true, item: saved });
    });

    app.delete("/api/crud/:collection/:id", function (req, res) {
        var idField = req.query.idField || "id";
        var ok = deleteItem(req.params.collection, req.params.id, idField);
        if (!ok) return res.status(404).json({ error: "항목 없음" });
        res.json({ success: true });
    });

    console.log("[DB] CRUD API 라우트 등록 완료.");
}

module.exports = {
    sqlite: sqlite,
    loadDB: loadDB,
    saveDB: saveDB,
    getCollection: getCollection,
    setCollection: setCollection,
    getItem: getItem,
    upsertItem: upsertItem,
    deleteItem: deleteItem,
    setupCrudRoutes: setupCrudRoutes
};
