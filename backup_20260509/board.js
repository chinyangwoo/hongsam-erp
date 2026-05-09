// ═══════════════════════════════════════════════════════════════
// 홍삼스파 ERP — 전사 게시판 모듈 (board.js v2)
// CRUD + 검색 + 페이지네이션 + 댓글 + localStorage/서버 동기화
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

    const DB_KEY = 'board_posts';
    const PER_PAGE = 10;
    let currentPage = 1;
    let currentCategory = '전체';
    let searchKeyword = '';
    let editingPostId = null;   // null = 새 글, 숫자 = 수정모드
    let viewingPostId = null;

    // ── 현재 로그인 유저 ──
    function getCurrentUser() {
        try {
            const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
            return { name: u.name || '익명', dept: u.department || '', id: u.id || '000' };
        } catch { return { name: '익명', dept: '', id: '000' }; }
    }

    // ── DB 초기 시드 (최초 1회) ──
    function getDefaultPosts() {
        return [
            { id:1001, cat:'공지사항', title:'[필독] 2026년 하계 유니폼 디자인 투표 안내', content:'전 직원 대상 하계 유니폼 디자인 투표를 실시합니다.\n\n후보 A : 네이비 블루 폴로\n후보 B : 차콜 그레이 카라티\n후보 C : 화이트 린넨 셔츠\n\n투표 기간 : 4/10 ~ 4/20\n투표 방법 : 사내 메신저 「전체공지방」에 A/B/C 중 택 1 기재\n\n많은 참여 부탁드립니다.', author:'진양우', dept:'대표', date:'2026-04-10', views:50, pinned:true, comments:[
                {id:1,author:'김지원',dept:'지원팀',text:'저는 B안에 한표!',date:'2026-04-10 14:30'},
                {id:2,author:'이영희',dept:'루프탑',text:'C안이 시원해 보여서 좋네요',date:'2026-04-11 09:15'}
            ]},
            { id:1002, cat:'공지사항', title:'4월 우수사원 포상식 결과 발표 및 커피차 안내', content:'4월 우수사원으로 운영팀 최민기 크루가 선정되었습니다.\n축하합니다! 🎉\n\n포상 내역 : 상장 + 상품권 10만원\n커피차 일정 : 4/16(수) 오후 2시, 1층 로비', author:'김지원', dept:'지원팀', date:'2026-04-15', views:48, pinned:true, comments:[
                {id:1,author:'최민기',dept:'운영팀',text:'감사합니다! 열심히 하겠습니다 😊',date:'2026-04-15 18:00'}
            ]},
            { id:1042, cat:'업무자료', title:'루프탑 수질 관리 및 약품 투입 매뉴얼 핵심 요약판', content:'1. 수질 검사 주기 : 매일 오전 9시, 오후 3시 (2회)\n2. pH 유지 범위 : 7.2 ~ 7.6\n3. 잔류 염소 농도 : 0.4 ~ 1.0 ppm\n4. 약품 투입 시 반드시 보호 장갑 착용\n5. 이상 수치 발견 시 즉시 공무팀장에게 보고\n\n상세 매뉴얼은 문서관리 > 시설 폴더를 참고하세요.', author:'박철수', dept:'공무팀', date:'2026-04-17', views:8, pinned:false, comments:[
                {id:1,author:'이영희',dept:'루프탑',text:'요약 감사합니다. 출력해서 현장에 비치할게요.',date:'2026-04-17 11:00'}
            ]},
            { id:1041, cat:'자유게시판', title:'혹시 어제 1층 직원휴게실에 안경 두고 가신 분? 찾아가세요~', content:'어제 오후 교대시간 즈음에 휴게실 소파 구석에 보니까\n은색 메탈테 도수 있는 안경 하나가 떨어져 있네요.\n\n분실물 센터로 넘길까 하다가 직원 물건인 것 같아서 일단 제 캐비넷에 넣어두었습니다.\n\n주인 분 계시면 내선 번호 204 로 연락 주시거나 메신저 주세요~', author:'이영희', dept:'루프탑', date:'2026-04-16', views:21, pinned:false, comments:[]},
            { id:1040, cat:'자유게시판', title:'아이패드 프로 M4 11인치 스그 미개봉 팝니다. (사내할인가)', content:'아이패드 프로 M4 11인치 스페이스 그레이\n미개봉 새제품입니다.\n\n정가 1,499,000원 → 사내 할인가 1,300,000원\n\n관심 있으신 분 메신저로 연락 주세요.\n선착순 1명!', author:'최민기', dept:'운영팀', date:'2026-04-16', views:45, pinned:false, comments:[
                {id:1,author:'박영수',dept:'식음료팀',text:'혹시 256기가인가요?',date:'2026-04-16 15:30'},
                {id:2,author:'최민기',dept:'운영팀',text:'네 256기가 맞습니다!',date:'2026-04-16 15:45'}
            ]},
            { id:1039, cat:'업무자료', title:'이번 주간 식음료 트렌드: 비건을 위한 디저트 도입 제안서', content:'최근 스파 방문 고객 중 비건/채식 고객 비중이 증가하고 있습니다.\n\n제안 메뉴:\n1. 오트밀 쿠키 (유제품 Free)\n2. 코코넛 밀크 라떼\n3. 아보카도 브라우니\n\n원가 분석 및 시식 일정은 별도 공유드리겠습니다.', author:'박영수', dept:'식음료팀', date:'2026-04-14', views:15, pinned:false, comments:[]},
        ];
    }

    // ── 데이터 로드/저장 ──
    function loadPosts() {
        try {
            const raw = localStorage.getItem(DB_KEY);
            if (raw) { const arr = JSON.parse(raw); if (arr.length) return arr; }
        } catch {}
        const seed = getDefaultPosts();
        savePosts(seed);
        return seed;
    }
    function savePosts(posts) {
        localStorage.setItem(DB_KEY, JSON.stringify(posts));
    }

    // ── 필터링 ──
    function getFilteredPosts() {
        let posts = loadPosts();
        if (currentCategory !== '전체') {
            posts = posts.filter(p => p.cat === currentCategory);
        }
        if (searchKeyword) {
            const kw = searchKeyword.toLowerCase();
            posts = posts.filter(p => p.title.toLowerCase().includes(kw) || p.content.toLowerCase().includes(kw));
        }
        // 고정글 먼저, 나머지는 id 역순
        const pinned = posts.filter(p => p.pinned).sort((a,b) => b.id - a.id);
        const normal = posts.filter(p => !p.pinned).sort((a,b) => b.id - a.id);
        return [...pinned, ...normal];
    }

    // ── 카테고리 CSS 클래스 ──
    function catClass(cat) {
        if (cat === '공지사항') return 'important';
        if (cat === '업무자료') return 'study';
        return 'free';
    }
    function catLabel(cat) {
        if (cat === '공지사항') return '공지';
        if (cat === '업무자료') return '업무자료';
        return '자유게시판';
    }

    // ── 날짜 포맷 ──
    function shortDate(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return String(d.getMonth()+1).padStart(2,'0') + '.' + String(d.getDate()).padStart(2,'0');
    }
    function fullDate(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.getFullYear() + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + String(d.getDate()).padStart(2,'0');
    }
    function isNew(dateStr) {
        if (!dateStr) return false;
        const diff = (Date.now() - new Date(dateStr).getTime()) / 86400000;
        return diff <= 3;
    }

    // ══════════════════════════════════════════
    //  테이블 렌더링
    // ══════════════════════════════════════════
    function renderTable() {
        const tbody = document.getElementById('boardTableBody');
        const filtered = getFilteredPosts();
        const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
        if (currentPage > totalPages) currentPage = totalPages;

        const start = (currentPage - 1) * PER_PAGE;
        const pageItems = filtered.slice(start, start + PER_PAGE);

        if (!pageItems.length) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:60px; color:var(--text-secondary);">
                <i class="fa-regular fa-folder-open" style="font-size:2rem; margin-bottom:10px; display:block; opacity:0.4;"></i>
                게시글이 없습니다.</td></tr>`;
            renderPagination(0, 0);
            return;
        }

        let html = '';
        pageItems.forEach(p => {
            const isPinned = p.pinned;
            const commentCnt = (p.comments || []).length;
            const newBadge = isNew(p.date) ? ' <span class="b-new">N</span>' : '';
            const commentBadge = commentCnt > 0 ? ` <span class="reply-cnt">[${commentCnt}]</span>` : '';

            html += `<tr class="${isPinned ? 'pinned ' : ''}clickable-row" data-id="${p.id}">
                <td class="text-center">${isPinned ? '<i class="fa-solid fa-thumbtack" style="color:var(--accent-blue)"></i>' : p.id}</td>
                <td class="text-center"><span class="tag-cat ${catClass(p.cat)}">${catLabel(p.cat)}</span></td>
                <td class="b-title">${isPinned ? '<strong>' : ''}${escapeHtml(p.title)}${isPinned ? '</strong>' : ''}${commentBadge}${newBadge}</td>
                <td class="text-center">${escapeHtml(p.author)}${p.dept ? ' (' + escapeHtml(p.dept) + ')' : ''}</td>
                <td class="text-center">${shortDate(p.date)}</td>
                <td class="text-center">${p.views || 0}</td>
            </tr>`;
        });
        tbody.innerHTML = html;
        renderPagination(filtered.length, totalPages);
        bindRowClicks();
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ══════════════════════════════════════════
    //  페이지네이션
    // ══════════════════════════════════════════
    function renderPagination(total, totalPages) {
        const container = document.getElementById('boardPagination');
        if (totalPages <= 1) { container.innerHTML = ''; return; }

        let html = `<button class="pg-btn ${currentPage === 1 ? 'disabled' : ''}" data-pg="prev"><i class="fa-solid fa-chevron-left"></i></button>`;
        const maxShow = 5;
        let startPg = Math.max(1, currentPage - Math.floor(maxShow/2));
        let endPg = Math.min(totalPages, startPg + maxShow - 1);
        if (endPg - startPg < maxShow - 1) startPg = Math.max(1, endPg - maxShow + 1);

        for (let i = startPg; i <= endPg; i++) {
            html += `<button class="pg-btn ${i === currentPage ? 'active' : ''}" data-pg="${i}">${i}</button>`;
        }
        html += `<button class="pg-btn ${currentPage === totalPages ? 'disabled' : ''}" data-pg="next"><i class="fa-solid fa-chevron-right"></i></button>`;
        container.innerHTML = html;

        container.querySelectorAll('.pg-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                if (this.classList.contains('disabled')) return;
                const pg = this.dataset.pg;
                if (pg === 'prev') currentPage = Math.max(1, currentPage - 1);
                else if (pg === 'next') currentPage++;
                else currentPage = parseInt(pg);
                renderTable();
            });
        });
    }

    // ══════════════════════════════════════════
    //  행 클릭 → 상세 보기
    // ══════════════════════════════════════════
    function bindRowClicks() {
        document.querySelectorAll('#boardTableBody .clickable-row').forEach(row => {
            row.addEventListener('click', () => {
                const id = parseInt(row.dataset.id);
                openPostView(id);
            });
        });
    }

    function openPostView(id) {
        const posts = loadPosts();
        const post = posts.find(p => p.id === id);
        if (!post) return;

        // 조회수 증가
        post.views = (post.views || 0) + 1;
        savePosts(posts);
        renderTable();

        viewingPostId = id;

        document.getElementById('postModalCategory').textContent = post.cat + ' (글번호 ' + post.id + ')';
        document.getElementById('postViewTitle').textContent = post.title;
        document.getElementById('postViewAuthor').innerHTML = `<img src="https://ui-avatars.com/api/?name=${encodeURIComponent(post.author)}&background=0D8ABC&color=fff&rounded=true&size=28" class="p-avatar"> ${escapeHtml(post.author)}${post.dept ? ' (' + escapeHtml(post.dept) + ')' : ''}`;
        document.getElementById('postViewMeta').innerHTML = `<span><i class="fa-regular fa-clock"></i> ${fullDate(post.date)}</span><span style="margin-left:10px;"><i class="fa-regular fa-eye"></i> 조회 ${post.views}</span>`;
        document.getElementById('postViewContent').innerHTML = escapeHtml(post.content).replace(/\n/g, '<br>');

        // 수정/삭제 버튼 — 본인 글 또는 001(대표) 만 표시
        const user = getCurrentUser();
        const isOwner = (user.name === post.author) || (user.id === '001');
        document.getElementById('btnEditPost').style.display = isOwner ? 'flex' : 'none';
        document.getElementById('btnDeletePost').style.display = isOwner ? 'flex' : 'none';

        renderComments(post);
        document.getElementById('postModal').classList.add('show');
    }

    // ══════════════════════════════════════════
    //  댓글
    // ══════════════════════════════════════════
    function renderComments(post) {
        const comments = post.comments || [];
        document.getElementById('commentCount').textContent = `댓글 (${comments.length})`;
        const list = document.getElementById('commentList');

        if (!comments.length) {
            list.innerHTML = '<p style="color:var(--text-secondary); font-size:0.88rem; padding:10px 0;">아직 댓글이 없습니다.</p>';
            return;
        }

        list.innerHTML = comments.map(c => `
            <div class="comment-item">
                <div class="comment-header">
                    <span class="comment-author"><img src="https://ui-avatars.com/api/?name=${encodeURIComponent(c.author)}&size=22&background=334155&color=E2E8F0&rounded=true" class="comment-avatar"> ${escapeHtml(c.author)}${c.dept ? ' (' + escapeHtml(c.dept) + ')' : ''}</span>
                    <span class="comment-date">${c.date || ''}</span>
                </div>
                <div class="comment-text">${escapeHtml(c.text)}</div>
            </div>
        `).join('');
    }

    // 댓글 등록
    document.getElementById('btnAddComment').addEventListener('click', addComment);
    document.getElementById('commentInput').addEventListener('keydown', e => { if (e.key === 'Enter') addComment(); });

    function addComment() {
        const input = document.getElementById('commentInput');
        const text = input.value.trim();
        if (!text) { input.focus(); return; }
        if (viewingPostId === null) return;

        const posts = loadPosts();
        const post = posts.find(p => p.id === viewingPostId);
        if (!post) return;

        if (!post.comments) post.comments = [];
        const user = getCurrentUser();
        const now = new Date();
        const dateStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0') + ' ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');

        post.comments.push({
            id: Date.now(),
            author: user.name,
            dept: user.dept,
            text: text,
            date: dateStr
        });

        savePosts(posts);
        input.value = '';
        renderComments(post);
        renderTable();
    }

    // ══════════════════════════════════════════
    //  글쓰기 / 수정 모달
    // ══════════════════════════════════════════
    const writeModal = document.getElementById('writeModal');
    const postModal = document.getElementById('postModal');

    function openWriteModal(editPost) {
        editingPostId = editPost ? editPost.id : null;
        document.getElementById('writeModalTitle').innerHTML = editPost
            ? '<i class="fa-solid fa-pen-to-square"></i> 글 수정'
            : '<i class="fa-solid fa-pen-nib"></i> 새 글 쓰기';
        document.getElementById('writeCategory').value = editPost ? editPost.cat : '자유게시판';
        document.getElementById('writePinned').value = editPost ? String(!!editPost.pinned) : 'false';
        document.getElementById('writeTitle').value = editPost ? editPost.title : '';
        document.getElementById('writeContent').value = editPost ? editPost.content : '';
        document.getElementById('submitWriteBtn').innerHTML = editPost
            ? '<i class="fa-solid fa-check"></i> 수정 완료'
            : '<i class="fa-solid fa-paper-plane"></i> 등록';
        writeModal.classList.add('show');
        setTimeout(() => document.getElementById('writeTitle').focus(), 200);
    }

    function closeWriteModalFn() { writeModal.classList.remove('show'); editingPostId = null; }
    function closePostModalFn() { postModal.classList.remove('show'); viewingPostId = null; }

    document.getElementById('btnWritePost').addEventListener('click', () => openWriteModal(null));
    document.getElementById('closeWriteModal').addEventListener('click', closeWriteModalFn);
    document.getElementById('cancelWriteBtn').addEventListener('click', closeWriteModalFn);
    document.getElementById('closePostModal').addEventListener('click', closePostModalFn);

    writeModal.addEventListener('click', e => { if (e.target === writeModal) closeWriteModalFn(); });
    postModal.addEventListener('click', e => { if (e.target === postModal) closePostModalFn(); });

    // 등록 / 수정 저장
    document.getElementById('submitWriteBtn').addEventListener('click', () => {
        const title = document.getElementById('writeTitle').value.trim();
        const content = document.getElementById('writeContent').value.trim();
        const cat = document.getElementById('writeCategory').value;
        const pinned = document.getElementById('writePinned').value === 'true';

        if (!title) { alert('제목을 입력하세요.'); document.getElementById('writeTitle').focus(); return; }
        if (!content) { alert('내용을 입력하세요.'); document.getElementById('writeContent').focus(); return; }

        const posts = loadPosts();
        const user = getCurrentUser();
        const today = new Date();
        const dateStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');

        if (editingPostId) {
            // 수정
            const idx = posts.findIndex(p => p.id === editingPostId);
            if (idx !== -1) {
                posts[idx].title = title;
                posts[idx].content = content;
                posts[idx].cat = cat;
                posts[idx].pinned = pinned;
            }
        } else {
            // 새 글
            const maxId = posts.reduce((m, p) => Math.max(m, p.id), 1000);
            posts.push({
                id: maxId + 1,
                cat, title, content,
                author: user.name,
                dept: user.dept,
                date: dateStr,
                views: 0,
                pinned,
                comments: []
            });
        }

        savePosts(posts);
        closeWriteModalFn();
        currentPage = 1;
        renderTable();
    });

    // ── 수정 버튼 (상세 모달 내) ──
    document.getElementById('btnEditPost').addEventListener('click', () => {
        if (!viewingPostId) return;
        const posts = loadPosts();
        const post = posts.find(p => p.id === viewingPostId);
        if (!post) return;
        closePostModalFn();
        setTimeout(() => openWriteModal(post), 200);
    });

    // ── 삭제 버튼 ──
    document.getElementById('btnDeletePost').addEventListener('click', () => {
        if (!viewingPostId) return;
        if (!confirm('정말로 이 게시글을 삭제하시겠습니까?\n삭제된 글은 복구할 수 없습니다.')) return;
        let posts = loadPosts();
        posts = posts.filter(p => p.id !== viewingPostId);
        savePosts(posts);
        closePostModalFn();
        renderTable();
    });

    // ══════════════════════════════════════════
    //  카테고리 탭
    // ══════════════════════════════════════════
    document.querySelectorAll('.b-cat-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.b-cat-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentCategory = this.dataset.cat || '전체';
            currentPage = 1;
            renderTable();
        });
    });

    // ══════════════════════════════════════════
    //  검색
    // ══════════════════════════════════════════
    const searchInput = document.getElementById('boardSearchInput');
    let searchTimer = null;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            searchKeyword = this.value.trim();
            currentPage = 1;
            renderTable();
        }, 300);
    });
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            clearTimeout(searchTimer);
            searchKeyword = this.value.trim();
            currentPage = 1;
            renderTable();
        }
    });

    // ── 초기 렌더링 ──
    renderTable();
});
