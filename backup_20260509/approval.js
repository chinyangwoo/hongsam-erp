// ═══════════════════════════════════════════════════════════════
// 홍삼스파 ERP — 전자결재 모듈 (approval.js v2)
// LNB 문서함 전환 + 데이터 기반 CRUD + 승인/반려 상태관리
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

    const DB_KEY = 'erp_approvals';
    let currentView = 'pending';
    let viewingDocId = null;

    // ── 현재 로그인 유저 ──
    function getCurrentUser() {
        try {
            const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
            return { name: u.name || '진양우', dept: u.department || '대표', id: u.id || '001' };
        } catch { return { name: '진양우', dept: '대표', id: '001' }; }
    }

    // ── 시드 데이터 ──
    function getDefaultDocs() {
        return [
            {
                id: 1, docNum: 'HS-20260417-001', type: '비품발주서',
                title: '루프탑 수영장 어메니티 긴급 발주 요청건',
                content: '1. 발주 목적\n재고 관리 자동 알람에 의거, 루프탑 사우나 수건 및 대용량 바디워시 재고가 안전 임계치 미만으로 도달하여 주말 영업 대비 긴급 발주를 상신합니다.\n\n2. 발주 상세 내역\n- 대형 비치타월 (호텔용 70수) : 12,500원 x 100장 = 1,250,000원\n- 대용량 허브 바디워시 : 35,000원 x 10말 = 350,000원\n\n총 청구 금액: 1,600,000원\n\n위와 같이 물품 대금 지출을 결의하오니 승인하여 주시기 바랍니다.',
                author: '이영희', authorDept: '루프탑',
                reviewer: '김지원', reviewerDept: '지원팀장',
                approver: '진양우', approverDept: '대표',
                date: '2026-04-17',
                status: 'pending',  // pending | approved | rejected
                reviewDate: '2026-04-17', approveDate: null,
                rejectReason: null
            },
            {
                id: 2, docNum: 'HS-20260416-002', type: '지출결의서',
                title: '1층 카페 신규 디저트 초도 물량 매입 대금 결제',
                content: '1. 지출 목적\n비건 고객 증가에 따른 신규 디저트 라인업 도입을 위한 초도 물량 매입비를 결의합니다.\n\n2. 지출 상세\n- 오트밀 쿠키 원재료 세트 : 45,000원 x 5세트 = 225,000원\n- 코코넛밀크 (벌크) : 28,000원 x 10박스 = 280,000원\n- 아보카도 브라우니 키트 : 52,000원 x 5세트 = 260,000원\n\n총 청구 금액: 765,000원',
                author: '박영수', authorDept: '식음료팀',
                reviewer: '김지원', reviewerDept: '지원팀장',
                approver: '진양우', approverDept: '대표',
                date: '2026-04-16',
                status: 'pending',
                reviewDate: '2026-04-16', approveDate: null,
                rejectReason: null
            },
            {
                id: 3, docNum: 'HS-20260410-003', type: '기안서(일반)',
                title: '2026 하계 직원 유니폼 교체 기안',
                content: '1. 기안 배경\n현 동계 유니폼 착용 기간이 5월 말 종료 예정이며, 하계 유니폼 사전 발주가 필요합니다.\n\n2. 예산 산정\n- 1인당 유니폼 세트: 85,000원\n- 대상 인원: 전 직원 12명\n- 총 예산: 1,020,000원\n\n3. 일정\n- 디자인 확정: 4/20\n- 발주: 4/25\n- 납품: 5/20',
                author: '김지원', authorDept: '지원팀',
                reviewer: '진양우', reviewerDept: '대표',
                approver: '진양우', approverDept: '대표',
                date: '2026-04-10',
                status: 'approved',
                reviewDate: '2026-04-10', approveDate: '2026-04-11',
                rejectReason: null
            },
            {
                id: 4, docNum: 'HS-20260408-004', type: '휴가계',
                title: '연차 휴가 신청 (4/20~4/21, 2일)',
                content: '사유: 개인 사유 (가족 행사)\n기간: 2026-04-20 ~ 2026-04-21 (2일간)\n업무 대행: 이영희 크루\n\n위와 같이 연차 휴가를 신청합니다.',
                author: '최민기', authorDept: '운영팀',
                reviewer: '김지원', reviewerDept: '지원팀장',
                approver: '진양우', approverDept: '대표',
                date: '2026-04-08',
                status: 'rejected',
                reviewDate: '2026-04-08', approveDate: null,
                rejectReason: '해당 기간 루프탑 정기점검 일정과 겹칩니다. 일정 조율 후 재기안 바랍니다.'
            }
        ];
    }

    // ── DB 로드/저장 ──
    function loadDocs() {
        try {
            const raw = localStorage.getItem(DB_KEY);
            if (raw) { const arr = JSON.parse(raw); if (arr.length) return arr; }
        } catch {}
        const seed = getDefaultDocs();
        saveDocs(seed);
        return seed;
    }
    function saveDocs(docs) {
        localStorage.setItem(DB_KEY, JSON.stringify(docs));
    }

    // ── 뷰별 필터 ──
    function getFilteredDocs() {
        const docs = loadDocs();
        const kw = (document.getElementById('apSearchInput').value || '').toLowerCase().trim();
        let filtered;
        switch (currentView) {
            case 'pending':     filtered = docs.filter(d => d.status === 'pending'); break;
            case 'approved-in': filtered = docs.filter(d => d.status === 'approved'); break;
            case 'in-progress': filtered = docs.filter(d => d.status === 'pending'); break;
            case 'rejected':    filtered = docs.filter(d => d.status === 'rejected'); break;
            case 'completed':   filtered = docs.filter(d => d.status === 'approved'); break;
            default:            filtered = docs;
        }
        if (kw) {
            filtered = filtered.filter(d =>
                d.title.toLowerCase().includes(kw) ||
                d.author.toLowerCase().includes(kw) ||
                d.type.toLowerCase().includes(kw)
            );
        }
        return filtered.sort((a, b) => b.id - a.id);
    }

    // ── 상태 배지 ──
    function statusBadge(doc) {
        if (doc.status === 'pending') return '<span class="status status-pending">내 결재 대기중</span>';
        if (doc.status === 'approved') return '<span class="status status-approved">결재 완료</span>';
        if (doc.status === 'rejected') return '<span class="status status-rejected">반려</span>';
        return '';
    }

    function escapeHtml(s) {
        if (!s) return '';
        return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    // ══════════════════════════════════════════
    //  문서 리스트 렌더링
    // ══════════════════════════════════════════
    function renderDocList() {
        const body = document.getElementById('apDocListBody');
        const filtered = getFilteredDocs();

        // 뱃지 업데이트
        const allDocs = loadDocs();
        const pendingCount = allDocs.filter(d => d.status === 'pending').length;
        document.getElementById('badgePending').textContent = pendingCount;

        if (!filtered.length) {
            body.innerHTML = `<div style="padding:60px; text-align:center; color:var(--text-secondary);">
                <i class="fa-regular fa-folder-open" style="font-size:2rem; margin-bottom:10px; display:block; opacity:0.4;"></i>
                해당 문서함에 문서가 없습니다.</div>`;
            return;
        }

        body.innerHTML = filtered.map(d => `
            <div class="ap-item doc-actionable" data-doc-id="${d.id}">
                <div class="c-date">${d.date}</div>
                <div class="c-form"><span class="tag-outline">${escapeHtml(d.type)}</span></div>
                <div class="c-title highlight">${escapeHtml(d.title)}</div>
                <div class="c-author">${escapeHtml(d.author)} (${escapeHtml(d.authorDept)})</div>
                <div class="c-status">${statusBadge(d)}</div>
            </div>
        `).join('');

        // 클릭 이벤트 바인딩
        body.querySelectorAll('.doc-actionable').forEach(el => {
            el.addEventListener('click', () => {
                openDocViewer(parseInt(el.dataset.docId));
            });
        });
    }

    // ══════════════════════════════════════════
    //  LNB 탭 전환
    // ══════════════════════════════════════════
    const viewTitles = {
        'pending':     '<i class="fa-solid fa-inbox"></i> 결재 할 문서 (대기함)',
        'approved-in': '<i class="fa-solid fa-check-double"></i> 결재 내역 (완료)',
        'in-progress': '<i class="fa-regular fa-paper-plane"></i> 결재 진행 중 문서',
        'rejected':    '<i class="fa-solid fa-rotate-left"></i> 반려 / 보류 문서',
        'completed':   '<i class="fa-solid fa-file-circle-check"></i> 결재 완료 문서'
    };

    document.querySelectorAll('.ap-nav-list li[data-view]').forEach(li => {
        li.addEventListener('click', function () {
            document.querySelectorAll('.ap-nav-list li').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            currentView = this.dataset.view;
            document.getElementById('apViewTitle').innerHTML = viewTitles[currentView] || '';
            document.getElementById('docViewer').style.display = 'none';
            renderDocList();
        });
    });

    // ══════════════════════════════════════════
    //  문서 뷰어 열기
    // ══════════════════════════════════════════
    function openDocViewer(id) {
        const docs = loadDocs();
        const doc = docs.find(d => d.id === id);
        if (!doc) return;
        viewingDocId = id;

        document.getElementById('dvDocNum').textContent = '문서번호: ' + doc.docNum;
        document.getElementById('dvDocTitle').textContent = doc.title;

        // 액션바 설정
        const actionBar = document.getElementById('dvActionBar');
        const guideText = document.getElementById('dvGuideText');
        const actionsDiv = document.getElementById('dvActions');

        if (doc.status === 'pending') {
            guideText.textContent = '귀하의 결재가 필요한 문서입니다.';
            actionsDiv.style.display = 'flex';
        } else if (doc.status === 'approved') {
            guideText.textContent = '이 문서는 결재가 완료되었습니다. (승인일: ' + (doc.approveDate || '-') + ')';
            actionsDiv.style.display = 'none';
        } else if (doc.status === 'rejected') {
            guideText.textContent = '이 문서는 반려되었습니다. 사유: ' + (doc.rejectReason || '-');
            actionsDiv.style.display = 'none';
        }

        // 결재선 상태
        const signDraft = doc.status !== 'rejected' ? '<span style="color:#10B981;">✓ 기안</span>' : '<span style="color:#10B981;">✓ 기안</span>';
        const signReview = doc.reviewDate ? '<span style="color:#10B981;">✓ 검토</span>' : '<span style="color:var(--text-secondary);">대기</span>';
        let signApprove;
        if (doc.status === 'approved') signApprove = '<span style="color:#10B981;">✓ 승인</span>';
        else if (doc.status === 'rejected') signApprove = '<span style="color:#EF4444;">✗ 반려</span>';
        else signApprove = '<span class="pending-sign">결재 대기</span>';

        // 결재 용지 렌더링
        document.getElementById('dvPaperContent').innerHTML = `
            <div class="paper-header">
                <h1>${escapeHtml(doc.type).split('').join(' ')}</h1>
                <table class="approval-line-table">
                    <tr><th rowspan="4">결<br>재<br>선</th><td>기 안</td><td>검 토</td><td>승 인</td></tr>
                    <tr><td>${escapeHtml(doc.author)}(${escapeHtml(doc.authorDept)})</td><td>${escapeHtml(doc.reviewer)}(${escapeHtml(doc.reviewerDept)})</td><td>${escapeHtml(doc.approver)}(${escapeHtml(doc.approverDept)})</td></tr>
                    <tr class="sign-row"><td>${signDraft}</td><td>${signReview}</td><td>${signApprove}</td></tr>
                    <tr><td>${doc.date ? doc.date.substring(5).replace('-','/') : '-'}</td><td>${doc.reviewDate ? doc.reviewDate.substring(5).replace('-','/') : '-'}</td><td>${doc.approveDate ? doc.approveDate.substring(5).replace('-','/') : '-'}</td></tr>
                </table>
            </div>
            <table class="paper-meta-table">
                <tr><th>기안부서</th><td>${escapeHtml(doc.authorDept)}</td><th>기안일자</th><td>${doc.date}</td></tr>
                <tr><th>양식</th><td>${escapeHtml(doc.type)}</td><th>결재상태</th><td>${doc.status === 'approved' ? '승인 완료' : doc.status === 'rejected' ? '반려' : '결재 대기'}</td></tr>
            </table>
            <div class="paper-content-area">
                ${escapeHtml(doc.content).replace(/\n/g, '<br>')}
            </div>
        `;

        document.getElementById('docViewer').style.display = 'flex';
    }

    // ── 뷰어 닫기 ──
    document.getElementById('btnCloseViewer').addEventListener('click', () => {
        document.getElementById('docViewer').style.display = 'none';
        viewingDocId = null;
    });

    // ══════════════════════════════════════════
    //  결재 승인 / 반려
    // ══════════════════════════════════════════
    document.getElementById('btnApproveDoc').addEventListener('click', () => {
        if (!viewingDocId) return;
        const docs = loadDocs();
        const doc = docs.find(d => d.id === viewingDocId);
        if (!doc || doc.status !== 'pending') return;

        doc.status = 'approved';
        const now = new Date();
        doc.approveDate = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
        saveDocs(docs);

        alert('✅ 결재가 승인되었습니다.\n문서번호: ' + doc.docNum);
        document.getElementById('docViewer').style.display = 'none';
        viewingDocId = null;
        renderDocList();
    });

    document.getElementById('btnRejectDoc').addEventListener('click', () => {
        if (!viewingDocId) return;
        const docs = loadDocs();
        const doc = docs.find(d => d.id === viewingDocId);
        if (!doc || doc.status !== 'pending') return;

        const reason = prompt('반려 사유를 입력하세요:');
        if (!reason) return;

        doc.status = 'rejected';
        doc.rejectReason = reason;
        saveDocs(docs);

        alert('문서가 반려 처리되었습니다.\n사유: ' + reason);
        document.getElementById('docViewer').style.display = 'none';
        viewingDocId = null;
        renderDocList();
    });

    // ══════════════════════════════════════════
    //  새 기안 상신
    // ══════════════════════════════════════════
    const draftModal = document.getElementById('draftEditModal');
    const drafterRole = document.getElementById('drafterRole');
    const approver1 = document.getElementById('approver1');
    const approver2 = document.getElementById('approver2');

    function showDraftModal() {
        document.getElementById('draftSubject').value = '';
        document.getElementById('draftContent').value = '';
        document.getElementById('draftType').value = '지출결의서';
        drafterRole.value = 'crew';
        approver1.value = '큐레이터 (팀장)';
        approver2.value = '호스트 (지배인)';
        draftModal.classList.add('show');
    }
    function hideDraftModal() { draftModal.classList.remove('show'); }

    document.getElementById('btnNewDraft').addEventListener('click', showDraftModal);
    document.getElementById('closeDraftEditModal').addEventListener('click', hideDraftModal);
    document.getElementById('btnCancelDraftBtn').addEventListener('click', hideDraftModal);
    draftModal.addEventListener('click', e => { if (e.target === draftModal) hideDraftModal(); });

    // 결재선 자동 업데이트
    if (drafterRole) {
        drafterRole.addEventListener('change', () => {
            const role = drafterRole.value;
            if (role === 'crew') { approver1.value = '큐레이터 (팀장)'; approver2.value = '호스트 (지배인)'; }
            else if (role === 'curator') { approver1.value = '호스트 (지배인)'; approver2.value = '진양우 (대표이사)'; }
            else if (role === 'host') { approver1.value = '- (생략)'; approver2.value = '진양우 (대표이사)'; }
        });
    }

    // 기안 제출
    document.getElementById('btnSubmitDraft').addEventListener('click', () => {
        const subject = document.getElementById('draftSubject').value.trim();
        const content = document.getElementById('draftContent').value.trim();
        const draftType = document.getElementById('draftType').value;

        if (!subject) { alert('문서 제목을 입력해주세요.'); return; }
        if (!content) { alert('문서 내용을 입력해주세요.'); return; }

        const docs = loadDocs();
        const user = getCurrentUser();
        const now = new Date();
        const dateStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
        const maxId = docs.reduce((m, d) => Math.max(m, d.id), 0);
        const newDocNum = 'HS-' + dateStr.replace(/-/g, '') + '-' + String(maxId + 1).padStart(3, '0');

        docs.push({
            id: maxId + 1,
            docNum: newDocNum,
            type: draftType,
            title: subject,
            content: content,
            author: user.name,
            authorDept: user.dept,
            reviewer: approver1.value.replace(/ \(.*\)/, ''),
            reviewerDept: approver1.value.replace(/.*\(/, '').replace(/\)/, ''),
            approver: approver2.value.replace(/ \(.*\)/, ''),
            approverDept: approver2.value.replace(/.*\(/, '').replace(/\)/, ''),
            date: dateStr,
            status: 'pending',
            reviewDate: null,
            approveDate: null,
            rejectReason: null
        });

        saveDocs(docs);
        hideDraftModal();
        alert('기안이 성공적으로 상신되었습니다.\n문서번호: ' + newDocNum);
        renderDocList();
    });

    // ── 검색 ──
    const searchInput = document.getElementById('apSearchInput');
    let searchTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(renderDocList, 300);
    });

    // ── 초기 렌더링 ──
    renderDocList();
});
