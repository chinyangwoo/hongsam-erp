/**
 * document.js  ─  홍삼스파 ERP 문서관리 모듈 (동적 렌더링)
 * document_data.js의 DOC_CATEGORIES / DOC_TEMPLATES 참조
 *
 * 기능:
 *  - 카테고리 폴더 동적 생성 (건수 표시)
 *  - 파일 리스트 렌더링 + 페이징 (20건/페이지)
 *  - 실시간 검색 (파일명)
 *  - HWP 뷰어 경고 모달 유지
 */

document.addEventListener('DOMContentLoaded', () => {

    // ── 전역 상태 ──────────────────────────────────────────
    let currentCat   = 'all';
    let currentPage  = 1;
    let searchQuery  = '';
    const PAGE_SIZE  = 20;

    // ── DOM 참조 ───────────────────────────────────────────
    const folderList  = document.querySelector('.folder-list');
    const fileBody    = document.querySelector('.file-list-body');
    const breadActive = document.querySelector('.breadcrumb span.active');
    const searchInput = document.querySelector('.explorer-toolbar .search-box input');
    const storageText = document.querySelector('.storage-info .s-text span:last-child');

    // ── 1. 카테고리 폴더 렌더링 ───────────────────────────
    function renderFolders() {
        if (!folderList) return;

        // 건수 계산
        const counts = {};
        DOC_TEMPLATES.forEach(d => {
            counts[d.cat] = (counts[d.cat] || 0) + 1;
        });

        folderList.innerHTML = '';
        DOC_CATEGORIES.forEach(cat => {
            const cnt = cat.id === 'all' ? DOC_TEMPLATES.length : (counts[cat.id] || 0);
            const li = document.createElement('li');
            li.className = 'folder-item' + (cat.restricted ? ' restricted' : '') + (cat.id === currentCat ? ' active' : '');
            if (cat.restricted) li.title = '보안 폴더';
            li.innerHTML = `<i class="fa-solid ${cat.id === currentCat && !cat.restricted ? 'fa-folder-open' : cat.icon}"></i> ${cat.label} <span class="folder-cnt">(${cnt})</span>`;
            li.addEventListener('click', () => {
                if (cat.restricted) {
                    const ok = confirm('해당 폴더는 최고관리자(마스터/호스트) 전용 보안 폴더입니다.\n열람하시겠습니까?');
                    if (!ok) return;
                }
                currentCat  = cat.id;
                currentPage = 1;
                renderFolders();
                renderFiles();
                if (breadActive) breadActive.textContent = cat.label;
            });
            folderList.appendChild(li);
        });

        // 스토리지 업데이트
        if (storageText) storageText.textContent = `${DOC_TEMPLATES.length}건 / 50 GB`;
    }

    // ── 2. 파일 리스트 렌더링 ─────────────────────────────
    function getFilteredDocs() {
        let docs = DOC_TEMPLATES;
        if (currentCat !== 'all') docs = docs.filter(d => d.cat === currentCat);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            docs = docs.filter(d => d.name.toLowerCase().includes(q));
        }
        return docs;
    }

    function renderFiles() {
        if (!fileBody) return;
        const docs = getFilteredDocs();
        const totalPages = Math.ceil(docs.length / PAGE_SIZE) || 1;
        if (currentPage > totalPages) currentPage = totalPages;

        const start = (currentPage - 1) * PAGE_SIZE;
        const pageDocs = docs.slice(start, start + PAGE_SIZE);

        fileBody.innerHTML = '';
        if (pageDocs.length === 0) {
            fileBody.innerHTML = '<div style="text-align:center; padding:60px 20px; color:var(--text-secondary); font-size:0.9rem;"><i class="fa-solid fa-folder-open" style="font-size:2rem; margin-bottom:12px; display:block; opacity:0.3;"></i>검색 결과가 없습니다.</div>';
            renderPagination(0, 0);
            return;
        }

        pageDocs.forEach(doc => {
            const { iconClass, typeClass } = getFileIcon(doc.ext);
            const div = document.createElement('div');
            div.className = `file-item ${typeClass}`;
            div.innerHTML = `
                <div class="col-name">
                    <i class="${iconClass}"></i>
                    <span class="f-name">${doc.name}</span>
                </div>
                <div class="col-date">${doc.date}</div>
                <div class="col-user">${doc.user}</div>
                <div class="col-size text-right">${doc.size}</div>
                <div class="col-actions text-right">
                    ${doc.ext === 'hwp'
                        ? '<button class="btn-action restricted-view" data-type="hwp" title="뷰어 확인"><i class="fa-solid fa-eye"></i></button>'
                        : '<button class="btn-action" title="미리보기"><i class="fa-solid fa-eye"></i></button>'}
                    <button class="btn-action" title="다운로드"><i class="fa-solid fa-download"></i></button>
                    <button class="btn-action text-danger" title="삭제"><i class="fa-regular fa-trash-can"></i></button>
                </div>
            `;
            fileBody.appendChild(div);
        });

        // HWP 뷰어 경고 재바인드
        bindHwpBtns();

        renderPagination(docs.length, totalPages);
    }

    function getFileIcon(ext) {
        const map = {
            pdf:  { iconClass: 'fa-solid fa-file-pdf icon-pdf',   typeClass: 'pdf-type'   },
            xlsx: { iconClass: 'fa-solid fa-file-excel icon-excel', typeClass: 'excel-type' },
            xls:  { iconClass: 'fa-solid fa-file-excel icon-excel', typeClass: 'excel-type' },
            hwp:  { iconClass: 'fa-solid fa-file-word icon-hwp',  typeClass: 'hwp-type'   },
            docx: { iconClass: 'fa-solid fa-file-word icon-word', typeClass: 'word-type'  },
            doc:  { iconClass: 'fa-solid fa-file-word icon-word', typeClass: 'word-type'  },
            pptx: { iconClass: 'fa-solid fa-file-powerpoint icon-ppt', typeClass: 'ppt-type' },
            jpg:  { iconClass: 'fa-solid fa-file-image icon-img', typeClass: 'img-type'   },
            png:  { iconClass: 'fa-solid fa-file-image icon-img', typeClass: 'img-type'   },
        };
        return map[ext] || { iconClass: 'fa-solid fa-file icon-pdf', typeClass: '' };
    }

    // ── 3. 페이징 ─────────────────────────────────────────
    function renderPagination(totalDocs, totalPages) {
        let pag = document.querySelector('.doc-pagination');
        if (!pag) {
            pag = document.createElement('div');
            pag.className = 'doc-pagination';
            const explorer = document.querySelector('.doc-explorer');
            if (explorer) explorer.appendChild(pag);
        }

        if (totalPages <= 1) {
            pag.innerHTML = `<span class="pg-info">${totalDocs}건</span>`;
            return;
        }

        let html = `<span class="pg-info">${totalDocs}건 (${currentPage}/${totalPages})</span>`;
        html += `<button class="pg-btn${currentPage <= 1 ? ' disabled' : ''}" data-pg="${currentPage - 1}"><i class="fa-solid fa-chevron-left"></i></button>`;

        const maxVisible = 7;
        let startP = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endP = Math.min(totalPages, startP + maxVisible - 1);
        if (endP - startP < maxVisible - 1) startP = Math.max(1, endP - maxVisible + 1);

        if (startP > 1) html += '<button class="pg-btn" data-pg="1">1</button><span class="pg-dots">…</span>';
        for (let p = startP; p <= endP; p++) {
            html += `<button class="pg-btn${p === currentPage ? ' active' : ''}" data-pg="${p}">${p}</button>`;
        }
        if (endP < totalPages) html += `<span class="pg-dots">…</span><button class="pg-btn" data-pg="${totalPages}">${totalPages}</button>`;

        html += `<button class="pg-btn${currentPage >= totalPages ? ' disabled' : ''}" data-pg="${currentPage + 1}"><i class="fa-solid fa-chevron-right"></i></button>`;

        pag.innerHTML = html;

        pag.querySelectorAll('.pg-btn:not(.disabled)').forEach(btn => {
            btn.addEventListener('click', () => {
                currentPage = parseInt(btn.dataset.pg);
                renderFiles();
                // scroll to top of explorer
                const exp = document.querySelector('.doc-explorer');
                if (exp) exp.scrollTop = 0;
            });
        });
    }

    // ── 4. 검색 ───────────────────────────────────────────
    if (searchInput) {
        let debounce;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounce);
            debounce = setTimeout(() => {
                searchQuery = e.target.value.trim();
                currentPage = 1;
                renderFiles();
            }, 250);
        });
    }

    // ── 5. HWP 경고 모달 ──────────────────────────────────
    const hwpAlertModal  = document.getElementById('hwpAlertModal');
    const closeHwpAlert  = document.getElementById('closeHwpAlert');
    const btnHwpDownload = document.getElementById('btnHwpDownload');

    function bindHwpBtns() {
        document.querySelectorAll('.restricted-view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (btn.getAttribute('data-type') === 'hwp') {
                    e.preventDefault();
                    if (hwpAlertModal) hwpAlertModal.classList.add('show');
                }
            });
        });
    }

    const hideModal = () => { if (hwpAlertModal) hwpAlertModal.classList.remove('show'); };
    if (closeHwpAlert) closeHwpAlert.addEventListener('click', hideModal);
    if (btnHwpDownload) btnHwpDownload.addEventListener('click', () => {
        alert('한글 문서가 로컬 PC로 즉시 다운로드 됩니다.');
        hideModal();
    });
    if (hwpAlertModal) hwpAlertModal.addEventListener('click', (e) => {
        if (e.target === hwpAlertModal) hideModal();
    });

    // ── 6. 업로드 버튼 ────────────────────────────────────
    const btnUploadDoc = document.getElementById('btnUploadDoc');
    if (btnUploadDoc) {
        btnUploadDoc.addEventListener('click', () => {
            alert('파일 업로드 창(모달)이 열립니다. (드래그 앤 드롭 지원 영역)');
        });
    }

    // ── 초기 렌더링 ───────────────────────────────────────
    renderFolders();
    renderFiles();
});
