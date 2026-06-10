/**
 * document.js  ─  홍삼한방타운 ERP 문서관리 모듈 (v3)
 * document_data.js의 DOC_CATEGORIES / DOC_TEMPLATES 참조
 *
 * 기능:
 *  - 카테고리 폴더 동적 생성 (건수 표시)
 *  - ★ 즐겨찾기 (localStorage 기반)
 *  - 파일 리스트 렌더링 + 페이징 (20건/페이지)
 *  - 체크박스 다중 선택 + 일괄 다운로드
 *  - 보안등급 뱃지 (전사공개/부서공개/대외비)
 *  - 실시간 검색 (파일명)
 *  - 관리자 전용 UI 제어 (업로드/삭제/새폴더)
 *  - 드래그 앤 드롭 업로드 모달
 *  - HWP 뷰어 경고 모달
 */

document.addEventListener('DOMContentLoaded', () => {

    // ── 전역 상태 ──────────────────────────────────────────
    let currentCat   = 'all';
    let currentPage  = 1;
    let searchQuery  = '';
    const PAGE_SIZE  = 20;

    // ── 관리자 권한 ──────────────────────────────────────
    const currentUser = localStorage.getItem('currentUser') || '';
    const curNum = parseInt(currentUser, 10);
    const isAdmin = currentUser === '001' || (curNum >= 1 && curNum <= 9) || (curNum >= 10 && curNum <= 19);

    // 관리자 전용 UI 숨기기
    if (!isAdmin) {
        document.querySelectorAll('.doc-admin-only').forEach(el => el.style.display = 'none');
    }

    // ── 즐겨찾기 ─────────────────────────────────────────
    const FAV_KEY = 'erp_doc_favorites';
    function getFavorites() {
        try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch(e) { return []; }
    }
    function toggleFavorite(fileName) {
        let favs = getFavorites();
        if (favs.includes(fileName)) {
            favs = favs.filter(f => f !== fileName);
        } else {
            favs.push(fileName);
        }
        localStorage.setItem(FAV_KEY, JSON.stringify(favs));
        renderFolders();
        renderFiles();
    }

    // ── DOM 참조 ───────────────────────────────────────────
    const folderList   = document.querySelector('.folder-list');
    const fileBody     = document.getElementById('fileListBody');
    const breadActive  = document.querySelector('.breadcrumb span.active');
    const searchInput  = document.getElementById('docSearchInput');
    const storageUsage = document.getElementById('storageUsage');
    const checkAllBox  = document.getElementById('checkAll');
    const batchActions = document.getElementById('batchActions');
    const batchCount   = document.getElementById('batchCount');

    // ── 1. 카테고리 폴더 렌더링 ───────────────────────────
    function renderFolders() {
        if (!folderList) return;

        // 건수 계산
        const counts = {};
        DOC_TEMPLATES.forEach(d => {
            counts[d.cat] = (counts[d.cat] || 0) + 1;
        });
        const favCount = getFavorites().filter(f => DOC_TEMPLATES.some(d => d.name === f)).length;

        folderList.innerHTML = '';
        DOC_CATEGORIES.forEach(cat => {
            let cnt;
            if (cat.id === 'all') cnt = DOC_TEMPLATES.length;
            else if (cat.id === 'favorites') cnt = favCount;
            else cnt = counts[cat.id] || 0;

            const li = document.createElement('li');
            let cls = 'folder-item';
            if (cat.restricted) cls += ' restricted';
            if (cat.id === 'favorites') cls += ' fav-folder';
            if (cat.id === currentCat) cls += ' active';
            li.className = cls;
            if (cat.restricted) li.title = '보안 폴더 (팀장급 이상)';

            li.innerHTML = `<i class="fa-solid ${cat.id === currentCat && !cat.restricted && cat.id !== 'favorites' ? 'fa-folder-open' : cat.icon}"></i> ${cat.label} <span class="folder-cnt">(${cnt})</span>`;
            li.addEventListener('click', () => {
                if (cat.restricted) {
                    const isAllowed = currentUser === '001' || (curNum >= 1 && curNum <= 9) || (curNum >= 10 && curNum <= 19);
                    if (!isAllowed) {
                        alert('해당 폴더는 팀장급 이상만 열람 가능한 보안 폴더입니다.\n접근 권한이 없습니다.');
                        return;
                    }
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
        if (storageUsage) storageUsage.textContent = `${DOC_TEMPLATES.length}건`;
    }

    // ── 2. 파일 리스트 렌더링 ─────────────────────────────
    function getFilteredDocs() {
        let docs = DOC_TEMPLATES;
        if (currentCat === 'favorites') {
            const favs = getFavorites();
            docs = docs.filter(d => favs.includes(d.name));
        } else if (currentCat !== 'all') {
            docs = docs.filter(d => d.cat === currentCat);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            docs = docs.filter(d => d.name.toLowerCase().includes(q) || d.ext.toLowerCase().includes(q));
        }
        return docs;
    }

    function getSecBadge(secLevel) {
        const map = {
            public: { label: '전사공개', cls: 'public', icon: 'fa-globe' },
            dept:   { label: '부서공개', cls: 'dept',   icon: 'fa-users' },
            conf:   { label: '대외비',   cls: 'conf',   icon: 'fa-lock' },
        };
        const s = map[secLevel] || map.public;
        return `<span class="sec-badge ${s.cls}"><i class="fa-solid ${s.icon}"></i> ${s.label}</span>`;
    }

    function renderFiles() {
        if (!fileBody) return;
        const docs = getFilteredDocs();
        const totalPages = Math.ceil(docs.length / PAGE_SIZE) || 1;
        if (currentPage > totalPages) currentPage = totalPages;

        const start = (currentPage - 1) * PAGE_SIZE;
        const pageDocs = docs.slice(start, start + PAGE_SIZE);

        // 전체 선택 해제
        if (checkAllBox) checkAllBox.checked = false;
        updateBatchBar();

        fileBody.innerHTML = '';
        if (pageDocs.length === 0) {
            fileBody.innerHTML = '<div style="text-align:center; padding:60px 20px; color:var(--text-secondary); font-size:0.9rem;"><i class="fa-solid fa-folder-open" style="font-size:2rem; margin-bottom:12px; display:block; opacity:0.3;"></i>검색 결과가 없습니다.</div>';
            renderPagination(0, 0);
            return;
        }

        const favs = getFavorites();

        pageDocs.forEach(doc => {
            const { iconClass, typeClass } = getFileIcon(doc.ext);
            const isFav = favs.includes(doc.name);
            const div = document.createElement('div');
            div.className = `file-item ${typeClass}`;
            div.innerHTML = `
                <div class="col-check"><input type="checkbox" class="file-check" data-filename="${doc.name}"></div>
                <div class="col-name">
                    <button class="btn-fav ${isFav ? 'active' : ''}" data-filename="${doc.name}" title="${isFav ? '즐겨찾기 해제' : '즐겨찾기 등록'}">
                        <i class="fa-${isFav ? 'solid' : 'regular'} fa-star"></i>
                    </button>
                    <i class="${iconClass}"></i>
                    <span class="f-name">${doc.name}</span>
                </div>
                <div class="col-sec">${getSecBadge(doc.secLevel)}</div>
                <div class="col-date">${doc.date}</div>
                <div class="col-user">${doc.user}</div>
                <div class="col-size text-right">${doc.size}</div>
                <div class="col-actions text-right">
                    ${doc.ext === 'hwp'
                        ? `<button class="btn-action btn-preview" data-type="hwp" data-filename="${doc.name}" title="실시간 HWP 뷰어 확인"><i class="fa-solid fa-eye"></i></button>`
                        : `<button class="btn-action btn-preview" data-filename="${doc.name}" title="미리보기"><i class="fa-solid fa-eye"></i></button>`}
                    <button class="btn-action btn-download" title="다운로드" data-filename="${doc.name}"><i class="fa-solid fa-download"></i></button>
                    ${isAdmin ? `<button class="btn-action text-danger btn-delete" title="삭제" data-filename="${doc.name}"><i class="fa-regular fa-trash-can"></i></button>` : ''}
                </div>
            `;
            fileBody.appendChild(div);
        });

        // ── 이벤트 바인딩 ──

        // 즐겨찾기 토글
        fileBody.querySelectorAll('.btn-fav').forEach(btn => {
            btn.addEventListener('click', () => toggleFavorite(btn.getAttribute('data-filename')));
        });

        // 체크박스 변경
        fileBody.querySelectorAll('.file-check').forEach(cb => {
            cb.addEventListener('change', () => {
                const row = cb.closest('.file-item');
                if (row) row.classList.toggle('selected', cb.checked);
                updateBatchBar();
            });
        });

        // 미리보기 버튼
        fileBody.querySelectorAll('.btn-preview').forEach(btn => {
            btn.addEventListener('click', () => {
                const fname = btn.getAttribute('data-filename');
                const isHwp = btn.getAttribute('data-type') === 'hwp';
                
                const previewModal = document.getElementById('previewModal');
                const previewModalTitle = document.getElementById('previewModalTitle');
                const previewIframe = document.getElementById('previewIframe');
                
                if (previewModal && previewModalTitle && previewIframe) {
                    previewModalTitle.textContent = `${fname} - ${isHwp ? 'HWP 실시간 변환 뷰어' : '문서 미리보기'}`;
                    previewIframe.src = ((window.ERP_CONFIG && window.ERP_CONFIG.origin) || 'http://43.203.237.63:3001') + `/api/doc/convert-hwp?file=${encodeURIComponent(fname)}`;
                    previewModal.classList.add('show');
                }
            });
        });

        // 다운로드 버튼
        fileBody.querySelectorAll('.btn-download').forEach(btn => {
            btn.addEventListener('click', () => {
                const fname = btn.getAttribute('data-filename');
                let downloadName = fname;
                if (fname.endsWith('.hwp')) downloadName = fname.replace('.hwp', '.docx');
                else if (fname.endsWith('.xls') && !fname.endsWith('.xlsx')) downloadName = fname.replace('.xls', '.xlsx');
                const link = document.createElement('a');
                link.href = 'docs/' + encodeURIComponent(downloadName);
                link.download = downloadName;
                link.click();
            });
        });

        // 삭제 버튼 (관리자만)
        fileBody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const fname = btn.getAttribute('data-filename');
                if (confirm(`"${fname}" 문서를 삭제하시겠습니까?`)) {
                    alert('삭제 기능은 백엔드 연동 후 사용 가능합니다.');
                }
            });
        });

        // HWP 뷰어 경고
        bindHwpBtns();

        renderPagination(docs.length, totalPages);
    }

    // ── 전체 선택 & 일괄 다운로드 ─────────────────────────
    if (checkAllBox) {
        checkAllBox.addEventListener('change', () => {
            const allCbs = fileBody.querySelectorAll('.file-check');
            allCbs.forEach(cb => {
                cb.checked = checkAllBox.checked;
                const row = cb.closest('.file-item');
                if (row) row.classList.toggle('selected', cb.checked);
            });
            updateBatchBar();
        });
    }

    function updateBatchBar() {
        const checked = fileBody ? fileBody.querySelectorAll('.file-check:checked') : [];
        if (batchActions) batchActions.style.display = checked.length > 0 ? 'flex' : 'none';
        if (batchCount) batchCount.textContent = `${checked.length}건 선택`;
    }

    const btnBatchDownload = document.getElementById('btnBatchDownload');
    if (btnBatchDownload) {
        btnBatchDownload.addEventListener('click', () => {
            const checked = fileBody.querySelectorAll('.file-check:checked');
            if (checked.length === 0) return;
            checked.forEach(cb => {
                const fname = cb.getAttribute('data-filename');
                let downloadName = fname;
                if (fname.endsWith('.hwp')) downloadName = fname.replace('.hwp', '.docx');
                const link = document.createElement('a');
                link.href = 'docs/' + encodeURIComponent(downloadName);
                link.download = downloadName;
                link.click();
            });
        });
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

    const hideHwpModal = () => { if (hwpAlertModal) hwpAlertModal.classList.remove('show'); };
    if (closeHwpAlert) closeHwpAlert.addEventListener('click', hideHwpModal);
    if (btnHwpDownload) btnHwpDownload.addEventListener('click', () => {
        alert('한글 문서가 로컬 PC로 즉시 다운로드 됩니다.');
        hideHwpModal();
    });
    if (hwpAlertModal) hwpAlertModal.addEventListener('click', (e) => {
        if (e.target === hwpAlertModal) hideHwpModal();
    });

    // ── 6. 업로드 모달 ────────────────────────────────────
    const uploadModal     = document.getElementById('uploadModal');
    const closeUploadBtn  = document.getElementById('closeUploadModal');
    const cancelUploadBtn = document.getElementById('cancelUploadBtn');
    const saveUploadBtn   = document.getElementById('saveUploadBtn');
    const uploadDropzone  = document.getElementById('uploadDropzone');
    const uploadFileInput = document.getElementById('uploadFileInput');
    const btnSelectFile   = document.getElementById('btnSelectFile');
    const uploadFileList  = document.getElementById('uploadFileList');
    const uploadFileItems = document.getElementById('uploadFileListItems');
    const btnUploadDoc    = document.getElementById('btnUploadDoc');

    let selectedFiles = [];

    function showUploadModal() { if (uploadModal) uploadModal.classList.add('show'); }
    function hideUploadModal() {
        if (uploadModal) uploadModal.classList.remove('show');
        selectedFiles = [];
        renderSelectedFiles();
    }

    if (btnUploadDoc) btnUploadDoc.addEventListener('click', showUploadModal);
    if (closeUploadBtn) closeUploadBtn.addEventListener('click', hideUploadModal);
    if (cancelUploadBtn) cancelUploadBtn.addEventListener('click', hideUploadModal);
    if (uploadModal) uploadModal.addEventListener('click', (e) => { if (e.target === uploadModal) hideUploadModal(); });

    // 파일 선택 버튼
    if (btnSelectFile) {
        btnSelectFile.addEventListener('click', (e) => {
            e.stopPropagation();
            if (uploadFileInput) uploadFileInput.click();
        });
    }

    // 드롭존 클릭 → 파일 선택
    if (uploadDropzone) {
        uploadDropzone.addEventListener('click', () => { if (uploadFileInput) uploadFileInput.click(); });

        // 드래그 앤 드롭
        uploadDropzone.addEventListener('dragover', (e) => { e.preventDefault(); uploadDropzone.classList.add('dragover'); });
        uploadDropzone.addEventListener('dragleave', () => { uploadDropzone.classList.remove('dragover'); });
        uploadDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadDropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                selectedFiles = [...selectedFiles, ...Array.from(e.dataTransfer.files)];
                renderSelectedFiles();
            }
        });
    }

    if (uploadFileInput) {
        uploadFileInput.addEventListener('change', () => {
            selectedFiles = [...selectedFiles, ...Array.from(uploadFileInput.files)];
            renderSelectedFiles();
            uploadFileInput.value = ''; // reset
        });
    }

    function renderSelectedFiles() {
        if (!uploadFileItems || !uploadFileList) return;
        if (selectedFiles.length === 0) {
            uploadFileList.style.display = 'none';
            return;
        }
        uploadFileList.style.display = 'block';
        uploadFileItems.innerHTML = '';
        selectedFiles.forEach((file, idx) => {
            const div = document.createElement('div');
            div.className = 'upload-file-chip';
            const sizeKB = (file.size / 1024).toFixed(0);
            div.innerHTML = `
                <span><i class="fa-solid fa-file" style="margin-right:8px; color:var(--accent-blue);"></i>${file.name} <small style="color:var(--text-secondary);">(${sizeKB} KB)</small></span>
                <button class="chip-remove" data-idx="${idx}" title="제거"><i class="fa-solid fa-xmark"></i></button>
            `;
            uploadFileItems.appendChild(div);
        });
        // 제거 버튼
        uploadFileItems.querySelectorAll('.chip-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-idx'));
                selectedFiles.splice(idx, 1);
                renderSelectedFiles();
            });
        });
    }

    if (saveUploadBtn) {
        saveUploadBtn.addEventListener('click', () => {
            if (selectedFiles.length === 0) {
                alert('업로드할 파일을 선택해 주세요.');
                return;
            }
            const cat = document.getElementById('uploadCategory')?.value || 'general';
            const sec = document.getElementById('uploadSecLevel')?.value || 'public';
            alert(`${selectedFiles.length}개 파일이 [${cat}] 카테고리에 [${sec}] 등급으로 업로드 요청되었습니다.\n\n(실제 업로드는 백엔드 API 연동 후 활성화됩니다.)`);
            hideUploadModal();
        });
    }

    // ── 7. 새 폴더 버튼 ────────────────────────────────────
    const btnNewFolder = document.getElementById('btnNewFolder');
    if (btnNewFolder) {
        btnNewFolder.addEventListener('click', () => {
            const name = prompt('새 폴더 이름을 입력하세요:');
            if (name && name.trim()) {
                alert(`"${name.trim()}" 폴더 생성은 백엔드 연동 후 활성화됩니다.`);
            }
        });
    }

    // ── 8. 미리보기 모달 인터랙션 ─────────────────────────────────
    const previewModal = document.getElementById('previewModal');
    const closePreviewModal = document.getElementById('closePreviewModal');
    const previewIframe = document.getElementById('previewIframe');
    
    if (closePreviewModal && previewModal) {
        closePreviewModal.addEventListener('click', () => {
            previewModal.classList.remove('show');
            if (previewIframe) previewIframe.src = '';
        });
        previewModal.addEventListener('click', (e) => {
            if (e.target === previewModal) {
                previewModal.classList.remove('show');
                if (previewIframe) previewIframe.src = '';
            }
        });
    }
    
    // 미리보기 인쇄 기능
    const btnPreviewPrint = document.getElementById('btnPreviewPrint');
    if (btnPreviewPrint) {
        btnPreviewPrint.addEventListener('click', () => {
            if (previewIframe && previewIframe.contentWindow) {
                previewIframe.contentWindow.focus();
                previewIframe.contentWindow.print();
            }
        });
    }

    // ── 초기 렌더링 ───────────────────────────────────────
    renderFolders();
    renderFiles();
});
