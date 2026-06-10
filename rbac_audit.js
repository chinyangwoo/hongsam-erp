// 홍삼스파 ERP — RBAC 권한 정책 + 감사 로그 + 소켓 인증 (Phase 4)
//
// [연결] server.js 에서:
//   require('./rbac_audit').setup(app, io, { getCollection, setCollection });
const jwt = require("jsonwebtoken");

// === 컬렉션별 권한 정책 ===
// write: 해당 컬렉션에 쓸 수 있는 역할 목록. 비어있으면 인증만 되면 누구나 가능.
// admin_only_delete: true면 삭제는 관리자만
var POLICIES = {
    erp_users_db:      { write: ["admin"], admin_only_delete: true },
    hongsam_employees: { write: ["admin"], admin_only_delete: true },
    login_logs:        { write: ["admin"], admin_only_delete: true },
    erp_accounting_db: { write: ["admin", "user"], admin_only_delete: true },
    erp_revenue_db:    { write: ["admin", "user"], admin_only_delete: true },
    erp_notices:       { write: ["admin"], admin_only_delete: false },
    board_posts:       { write: [], admin_only_delete: false }
};

function canWrite(collection, role) {
    var p = POLICIES[collection];
    if (!p || !p.write || p.write.length === 0) return true; // 정책 없으면 인증만 확인
    return p.write.indexOf(role) !== -1;
}

function canDelete(collection, role) {
    var p = POLICIES[collection];
    if (p && p.admin_only_delete && role !== "admin") return false;
    return canWrite(collection, role);
}

// === 감사 로그 ===
function writeAuditLog(deps, entry) {
    try {
        var logs = deps.getCollection("audit_logs") || [];
        logs.push(entry);
        if (logs.length > 2000) logs = logs.slice(-2000);
        deps.setCollection("audit_logs", logs);
    } catch (e) { console.warn("[Audit] 로그 기록 실패:", e.message); }
}

function setup(app, io, deps) {
    var SECRET = process.env.JWT_SECRET || "dev-only-insecure-secret-change-me";

    // === RBAC 미들웨어: /api/crud, /api/db 쓰기 작업에 권한 검사 추가 ===
    app.use(function (req, res, next) {
        // 읽기(GET)는 통과
        if (req.method === "GET" || req.method === "OPTIONS" || req.method === "HEAD") return next();
        // 로그인/ping/비번변경은 통과
        if (req.path === "/api/login" || req.path === "/api/ping" || req.path === "/api/change-password") return next();

        var collection = null;
        if (req.path.indexOf("/api/crud/") === 0) {
            collection = req.path.split("/")[3]; // /api/crud/:collection/...
        } else if (req.path.indexOf("/api/db/") === 0) {
            collection = req.path.split("/")[3]; // /api/db/:collection
        }

        if (collection && req.user) {
            var role = req.user.role || "user";
            if (req.method === "DELETE") {
                if (!canDelete(collection, role)) {
                    return res.status(403).json({ success: false, error: "이 데이터의 삭제 권한이 없습니다." });
                }
            } else {
                if (!canWrite(collection, role)) {
                    return res.status(403).json({ success: false, error: "이 데이터의 수정 권한이 없습니다." });
                }
            }

            // 감사 로그 기록
            writeAuditLog(deps, {
                timestamp: new Date().toISOString(),
                emp_id: req.user.empId,
                name: req.user.name,
                action: req.method,
                collection: collection,
                path: req.path,
                ip: req.ip
            });
        }

        next();
    });

    // === 감사 로그 조회 API (관리자 전용) ===
    app.get("/api/audit-logs", function (req, res) {
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({ success: false, error: "관리자만 조회 가능합니다." });
        }
        var logs = deps.getCollection("audit_logs") || [];
        var limit = parseInt(req.query.limit) || 100;
        res.json(logs.slice(-limit));
    });

    // === Socket.IO 인증 ===
    if (io) {
        io.use(function (socket, next) {
            var token = socket.handshake.auth && socket.handshake.auth.token;
            if (!token) token = socket.handshake.query && socket.handshake.query.token;
            if (!token) {
                return next(new Error("소켓 인증 토큰이 필요합니다."));
            }
            try {
                socket.user = jwt.verify(token, SECRET);
                next();
            } catch (e) {
                return next(new Error("유효하지 않은 토큰입니다."));
            }
        });

        // 소켓 연결 시 사용자 정보 로그
        io.on("connection", function (socket) {
            console.log("[Socket] 인증됨:", socket.user.name, "(" + socket.user.empId + ")");
            socket.on("disconnect", function () {
                console.log("[Socket] 연결 해제:", socket.user.name);
            });
        });
    }

    console.log("[RBAC] 권한 정책 + 감사 로그 + 소켓 인증 설정 완료.");
}

module.exports = { setup: setup, POLICIES: POLICIES };
