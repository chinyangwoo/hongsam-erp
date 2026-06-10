/**
 * database.js v2 - SQLite storage with optimistic concurrency (Item 2) + payload optimization (Item 5)
 *
 * v2 changes:
 *  - Per-collection version number. Writers send X-Collection-Version; mismatch -> 409 + server data (client merges & retries)
 *  - GET /api/db/bundle?keys=a,b : fetch only needed collections (cuts the 2.5MB full pull)
 *  - GET /api/crud/:collection supports ?limit=&offset= server-side pagination
 *  - Keeps v1 exports/routes so server.js needs no changes: loadDB, saveDB, setupCrudRoutes, getCollection, setCollection
 */
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'erp_data.db');
const LEGACY_JSON = path.join(__dirname, 'db_storage.json');
const BACKUP_DIR = path.join(__dirname, 'backups');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec('CREATE TABLE IF NOT EXISTS collections (key TEXT PRIMARY KEY, data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated_at TEXT)');
try { db.exec('ALTER TABLE collections ADD COLUMN version INTEGER NOT NULL DEFAULT 1'); } catch (e) { /* column exists */ }

const stGet = db.prepare('SELECT data, version FROM collections WHERE key = ?');
const stAll = db.prepare('SELECT key, data, version FROM collections');
const stSet = db.prepare(
    'INSERT INTO collections (key, data, version, updated_at) VALUES (?, ?, 1, ?) ' +
    'ON CONFLICT(key) DO UPDATE SET data = excluded.data, version = collections.version + 1, updated_at = excluded.updated_at'
);

function parseSafe(t) { try { return JSON.parse(t); } catch (e) { return null; } }

function getCollection(key) {
    const row = stGet.get(String(key));
    return row ? parseSafe(row.data) : null;
}
function getVersion(key) {
    const row = stGet.get(String(key));
    return row ? row.version : 0;
}
function setCollection(key, value) {
    stSet.run(String(key), JSON.stringify(value === undefined ? null : value), new Date().toISOString());
    return getVersion(key);
}
function loadDB() {
    const out = {};
    stAll.all().forEach(function (r) { out[r.key] = parseSafe(r.data); });
    return out;
}
const saveAllTx = db.transaction(function (obj) {
    Object.keys(obj).forEach(function (k) { setCollection(k, obj[k]); });
});
function saveDB(obj) { if (obj && typeof obj === 'object') saveAllTx(obj); }

// ---- one-time migration from db_storage.json ----
(function migrateLegacy() {
    try {
        const count = db.prepare('SELECT COUNT(*) AS c FROM collections').get().c;
        if (count > 0 || !fs.existsSync(LEGACY_JSON)) return;
        const legacy = parseSafe(fs.readFileSync(LEGACY_JSON, 'utf8'));
        if (!legacy || typeof legacy !== 'object') return;
        saveDB(legacy);
        if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
        const moved = path.join(BACKUP_DIR, 'db_storage_migrated_' + Date.now() + '.json');
        fs.renameSync(LEGACY_JSON, moved);
        console.log('[DB] db_storage.json -> SQLite migration done. Original moved to', moved);
    } catch (e) { console.error('[DB] legacy migration error:', e.message); }
})();

// ---- daily backup (30-day retention) ----
function dailyBackup() {
    try {
        if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
        const stamp = new Date().toISOString().slice(0, 10);
        const target = path.join(BACKUP_DIR, 'erp_data_' + stamp + '.db');
        if (!fs.existsSync(target)) {
            db.backup(target).then(function () { console.log('[DB] daily backup:', target); }).catch(function (e) { console.error('[DB] backup error:', e.message); });
        }
        fs.readdirSync(BACKUP_DIR).forEach(function (f) {
            if (!/^erp_data_\d{4}-\d{2}-\d{2}\.db$/.test(f)) return;
            const d = new Date(f.slice(9, 19));
            if (Date.now() - d.getTime() > 30 * 24 * 3600 * 1000) {
                try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch (e) {}
            }
        });
    } catch (e) { console.error('[DB] backup routine error:', e.message); }
}
dailyBackup();
setInterval(dailyBackup, 6 * 3600 * 1000);

// ---- HTTP routes ----
function setupCrudRoutes(app) {
    // Full DB (legacy compatibility - prefer /api/db/bundle)
    app.get('/api/db', function (req, res) {
        res.json(loadDB());
    });

    // Optimized bundle pull: only requested collections + their versions
    app.get('/api/db/bundle', function (req, res) {
        const keys = String(req.query.keys || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        const data = {}, versions = {};
        keys.forEach(function (k) {
            data[k] = getCollection(k);
            versions[k] = getVersion(k);
        });
        res.json({ success: true, data: data, versions: versions });
    });

    app.get('/api/db/:key', function (req, res) {
        const key = req.params.key;
        res.set('X-Collection-Version', String(getVersion(key)));
        res.json(getCollection(key));
    });

    // Whole-collection save with optimistic concurrency check
    app.post('/api/db/:key', function (req, res) {
        const key = req.params.key;
        const clientVer = req.get('X-Collection-Version');
        if (clientVer !== undefined && clientVer !== null && clientVer !== '') {
            const cur = getVersion(key);
            if (parseInt(clientVer, 10) !== cur) {
                return res.status(409).json({ success: false, conflict: true, version: cur, data: getCollection(key) });
            }
        }
        const newVer = setCollection(key, req.body);
        res.set('X-Collection-Version', String(newVer));
        res.json({ success: true, version: newVer });
    });

    // Item-level CRUD with server-side pagination
    app.get('/api/crud/:collection', function (req, res) {
        const col = getCollection(req.params.collection);
        const arr = Array.isArray(col) ? col : (col ? [col] : []);
        const total = arr.length;
        let items = arr;
        const limit = parseInt(req.query.limit, 10);
        const offset = parseInt(req.query.offset, 10) || 0;
        if (!isNaN(limit) && limit > 0) items = arr.slice(offset, offset + limit);
        res.set('X-Collection-Version', String(getVersion(req.params.collection)));
        res.json({ success: true, total: total, items: items });
    });

    app.post('/api/crud/:collection', function (req, res) {
        const key = req.params.collection;
        const idField = req.query.idField || 'id';
        const item = req.body;
        if (!item || typeof item !== 'object' || item[idField] === undefined) {
            return res.status(400).json({ success: false, error: 'item must contain field: ' + idField });
        }
        let col = getCollection(key);
        if (!Array.isArray(col)) col = [];
        const idx = col.findIndex(function (x) { return x && String(x[idField]) === String(item[idField]); });
        if (idx >= 0) col[idx] = Object.assign({}, col[idx], item); else col.push(item);
        const v = setCollection(key, col);
        res.json({ success: true, version: v, total: col.length });
    });

    app.delete('/api/crud/:collection/:id', function (req, res) {
        const key = req.params.collection;
        const idField = req.query.idField || 'id';
        let col = getCollection(key);
        if (!Array.isArray(col)) col = [];
        const before = col.length;
        col = col.filter(function (x) { return !x || String(x[idField]) !== String(req.params.id); });
        const v = setCollection(key, col);
        res.json({ success: true, version: v, removed: before - col.length, total: col.length });
    });

    console.log('[DB] CRUD API routes ready (v2: versioned writes + bundle + pagination)');
}

module.exports = { loadDB: loadDB, saveDB: saveDB, setupCrudRoutes: setupCrudRoutes, getCollection: getCollection, setCollection: setCollection, getVersion: getVersion };
