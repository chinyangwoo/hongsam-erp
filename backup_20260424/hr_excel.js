/**
 * hr_excel.js  ─  홍삼스파 ERP  인사기록카드 엑셀 업로드 핸들러
 * SheetJS(XLSX) 라이브러리를 사용하여 엑셀 파일을 읽고
 * ERP의 localStorage 기반 직원 DB에 저장합니다.
 *
 * 엑셀 양식 규격 (Sheet 2  「일괄등록」):
 *   Row 1: 타이틀
 *   Row 2: 안내문구
 *   Row 3: 한글 컬럼명 (헤더)
 *   Row 4: 영문 필드키 (ERP 파싱 기준)
 *   Row 5~: 데이터 (샘플 포함)
 */

(function () {
    'use strict';

    // ── 필수 필드 목록 (영문 키, Row 4 기준) ──────────────────
    const REQUIRED_FIELDS = [
        'emp_id', 'name', 'birth_date', 'phone', 'address',
        'hire_date', 'department', 'rank', 'emp_type', 'status',
        'base_salary'
    ];

    // ── 영문키 → 한글 레이블 매핑 ─────────────────────────────
    const FIELD_LABELS = {
        emp_id:           '사번',
        name:             '성명',
        birth_date:       '생년월일',
        gender:           '성별',
        id_front:         '주민번호앞6자리',
        phone:            '연락처',
        emergency_phone:  '비상연락처',
        email:            '이메일',
        address:          '주소',
        hire_date:        '입사일',
        department:       '부서',
        team_detail:      '세부팀',
        rank:             '직급',
        emp_type:         '고용형태',
        status:           '재직상태',
        contract_end:     '계약만료일',
        annual_salary:    '계약연봉',
        base_salary:      '기본급',
        meal_allowance:   '식대',
        ot_allowance:     '연장/야간',
        national_pension: '국민연금',
        health_insurance: '건강보험',
        employment_ins:   '고용보험',
        income_tax:       '갑근세/주민세',
        family_info:      '가족사항',
        notes:            '특이사항',
        perm_read:        '열람권한',
        perm_write:       '수정권한',
    };

    // ── 파싱된 데이터 보관 ─────────────────────────────────────
    let parsedEmployees = [];

    // ── DOM 참조 ───────────────────────────────────────────────
    const modal          = document.getElementById('excelUploadModal');
    const btnOpen        = document.getElementById('btnImportExcel');
    const btnClose       = document.getElementById('closeExcelModal');
    const btnCancel      = document.getElementById('cancelExcelUpload');
    const btnConfirm     = document.getElementById('confirmExcelUpload');
    const fileInput      = document.getElementById('excelFileInput');
    const fileInfo       = document.getElementById('excelFileInfo');
    const fileNameEl     = document.getElementById('excelFileName');
    const rowCountEl     = document.getElementById('excelRowCount');
    const previewEmpty   = document.getElementById('excelPreviewEmpty');
    const previewWrap    = document.getElementById('excelPreviewWrap');
    const previewTable   = document.getElementById('excelPreviewTable');
    const previewStats   = document.getElementById('previewStats');
    const previewErrBadge = document.getElementById('previewErrBadge');

    // ── 모달 열기/닫기 ─────────────────────────────────────────
    function openModal() {
        modal.style.display = 'flex';
        resetState();
    }

    function closeModal() {
        modal.style.display = 'none';
        resetState();
    }

    function resetState() {
        parsedEmployees = [];
        if (fileInput) fileInput.value = '';
        if (fileInfo)  { fileInfo.style.display = 'none'; }
        if (previewEmpty) previewEmpty.style.display = 'block';
        if (previewWrap)  previewWrap.style.display  = 'none';
        if (previewTable) previewTable.innerHTML = '';
        if (btnConfirm)   {
            btnConfirm.disabled = true;
            btnConfirm.style.opacity = '0.4';
        }
        if (previewErrBadge) previewErrBadge.style.display = 'none';
    }

    if (btnOpen)   btnOpen.addEventListener('click', openModal);
    if (btnClose)  btnClose.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // ── 드래그앤드롭 ───────────────────────────────────────────
    window.handleExcelDrop = function (e) {
        e.preventDefault();
        const dropZone = document.getElementById('excelDropZone');
        if (dropZone) {
            dropZone.style.borderColor = 'rgba(59,130,246,0.4)';
            dropZone.style.background  = 'rgba(59,130,246,0.04)';
        }
        const file = e.dataTransfer?.files?.[0];
        if (file) handleExcelFile(file);
    };

    // ── 파일 처리 진입점 ───────────────────────────────────────
    window.handleExcelFile = function (file) {
        if (!file) return;
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            showToast('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const data     = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });

                // Sheet 2 우선, 없으면 첫 번째 시트
                const targetSheet = workbook.SheetNames[1] || workbook.SheetNames[0];
                const ws = workbook.Sheets[targetSheet];

                parseSheet(ws, file.name);
            } catch (err) {
                showToast('파일 읽기 오류: ' + err.message, 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // ── 시트 파싱 ──────────────────────────────────────────────
    function parseSheet(ws, fileName) {
        // raw 2D 배열로 변환 (날짜 자동 변환 포함)
        const rows = XLSX.utils.sheet_to_json(ws, {
            header: 1,
            raw: false,
            dateNF: 'yyyy-mm-dd',
            blankrows: false
        });

        // Row 4 (index 3)에 영문 필드키가 있음
        let fieldRow = -1;
        for (let i = 0; i < Math.min(rows.length, 8); i++) {
            if (rows[i] && rows[i].includes('emp_id')) { fieldRow = i; break; }
        }

        if (fieldRow === -1) {
            showToast('양식이 올바르지 않습니다. "일괄등록" 시트의 4행에 영문 필드명이 있어야 합니다.', 'error');
            return;
        }

        const fields = rows[fieldRow].map(v => (v || '').toString().trim());
        const dataRows = rows.slice(fieldRow + 1).filter(row =>
            row && row.some(cell => cell !== null && cell !== undefined && cell !== '')
        );

        if (dataRows.length === 0) {
            showToast('데이터 행이 없습니다. 5행부터 데이터를 입력해주세요.', 'warn');
            return;
        }

        // 데이터 행 → 객체 변환 + 유효성 검사
        parsedEmployees = [];
        const errors = [];

        dataRows.forEach((row, rowIdx) => {
            const emp = {};
            fields.forEach((key, colIdx) => {
                if (key) emp[key] = (row[colIdx] !== undefined && row[colIdx] !== null)
                    ? row[colIdx].toString().trim()
                    : '';
            });

            // 필수항목 검사
            const missing = REQUIRED_FIELDS.filter(f => !emp[f]);
            if (missing.length > 0) {
                errors.push(`행 ${fieldRow + rowIdx + 2}: [${missing.map(f => FIELD_LABELS[f] || f).join(', ')}] 누락`);
            }

            // 실수령액 자동 계산
            const base = parseFloat((emp.base_salary || '0').replace(/,/g, '')) || 0;
            const meal = parseFloat((emp.meal_allowance || '0').replace(/,/g, '')) || 0;
            const ot   = parseFloat((emp.ot_allowance || '0').replace(/,/g, '')) || 0;
            const np   = parseFloat((emp.national_pension || '0').replace(/,/g, '')) || 0;
            const hi   = parseFloat((emp.health_insurance || '0').replace(/,/g, '')) || 0;
            const ei   = parseFloat((emp.employment_ins || '0').replace(/,/g, '')) || 0;
            const tax  = parseFloat((emp.income_tax || '0').replace(/,/g, '')) || 0;
            emp.net_salary = (base + meal + ot - np - hi - ei - tax).toString();

            emp._rowErrors = missing;
            parsedEmployees.push(emp);
        });

        // 파일명 & 건수 표시
        if (fileInfo) fileInfo.style.display = 'flex';
        fileInfo.style.display = 'flex';
        if (fileNameEl) fileNameEl.textContent = fileName;
        if (rowCountEl) rowCountEl.textContent = `총 ${dataRows.length}건 감지`;

        renderPreview(errors);

        // 저장 버튼 활성화 (오류 있어도 가능하게)
        if (btnConfirm) {
            btnConfirm.disabled = false;
            btnConfirm.style.opacity = '1';
        }
    }

    // ── 미리보기 테이블 렌더링 ────────────────────────────────
    function renderPreview(errors) {
        if (!previewTable) return;

        // 통계
        const errCount = parsedEmployees.filter(e => e._rowErrors.length > 0).length;
        if (previewStats) previewStats.textContent = `${parsedEmployees.length}건 / 오류 ${errCount}건`;

        if (previewErrBadge) {
            if (errCount > 0) {
                previewErrBadge.textContent = `⚠ 필수항목 누락 ${errCount}건`;
                previewErrBadge.style.display = 'inline';
            } else {
                previewErrBadge.style.display = 'none';
            }
        }

        // 가시 컬럼 (핵심 정보만 표시)
        const visibleKeys = [
            'emp_id', 'name', 'birth_date', 'phone',
            'hire_date', 'department', 'rank', 'emp_type', 'status',
            'base_salary', 'net_salary'
        ];
        const visibleLabels = visibleKeys.map(k => FIELD_LABELS[k] || k);

        // 헤더
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th style="background:#0F172A; color:#94A3B8; padding:10px 12px; text-align:left; font-size:0.78rem; position:sticky; top:0; white-space:nowrap;">#</th>';
        visibleLabels.forEach(lbl => {
            headerRow.innerHTML += `<th style="background:#0F172A; color:#94A3B8; padding:10px 12px; text-align:left; font-size:0.78rem; position:sticky; top:0; white-space:nowrap;">${lbl}</th>`;
        });
        headerRow.innerHTML += '<th style="background:#0F172A; color:#94A3B8; padding:10px 12px; text-align:left; font-size:0.78rem; position:sticky; top:0;">상태</th>';
        thead.appendChild(headerRow);
        previewTable.innerHTML = '';
        previewTable.appendChild(thead);

        // 데이터 행
        const tbody = document.createElement('tbody');
        parsedEmployees.forEach((emp, idx) => {
            const tr = document.createElement('tr');
            const hasErr = emp._rowErrors.length > 0;
            tr.style.cssText = `background:${idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'}; ${hasErr ? 'background:rgba(239,68,68,0.06);' : ''}`;

            tr.innerHTML = `<td style="padding:9px 12px; color:#64748B; font-size:0.8rem;">${idx + 1}</td>`;
            visibleKeys.forEach(key => {
                let val = emp[key] || '-';
                if (['base_salary', 'net_salary'].includes(key) && val !== '-') {
                    val = parseInt(val.replace(/,/g, '')).toLocaleString('ko-KR') + '원';
                }
                tr.innerHTML += `<td style="padding:9px 12px; color:${hasErr && emp._rowErrors.some(e => e.includes(FIELD_LABELS[key])) ? '#EF4444' : '#CBD5E1'}; font-size:0.82rem; white-space:nowrap;">${val}</td>`;
            });

            const statusBadge = hasErr
                ? `<span style="background:rgba(239,68,68,0.15); color:#EF4444; padding:2px 8px; border-radius:6px; font-size:0.75rem;">오류</span>`
                : `<span style="background:rgba(16,185,129,0.15); color:#10B981; padding:2px 8px; border-radius:6px; font-size:0.75rem;">정상</span>`;
            tr.innerHTML += `<td style="padding:9px 12px;">${statusBadge}</td>`;
            tbody.appendChild(tr);
        });
        previewTable.appendChild(tbody);

        previewEmpty.style.display = 'none';
        previewWrap.style.display  = 'block';
    }

    // ── ERP 저장 (localStorage) ────────────────────────────────
    if (btnConfirm) {
        btnConfirm.addEventListener('click', () => {
            if (parsedEmployees.length === 0) return;

            const KEY = 'hongsam_employees';
            let existing = [];
            try { existing = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (_) {}

            let addedCount = 0;
            let updatedCount = 0;

            parsedEmployees.forEach(emp => {
                // _rowErrors 제거 (저장 시 불필요)
                const { _rowErrors, ...empData } = emp;

                // 타임스탬프 추가
                empData.updatedAt = new Date().toISOString();

                const idx = existing.findIndex(e => e.emp_id === empData.emp_id);
                if (idx >= 0) {
                    existing[idx] = { ...existing[idx], ...empData };
                    updatedCount++;
                } else {
                    empData.createdAt = new Date().toISOString();
                    existing.push(empData);
                    addedCount++;
                }
            });

            localStorage.setItem(KEY, JSON.stringify(existing));

            // 인사기록카드 그리드 갱신
            refreshPersonnelGrid(existing);

            closeModal();
            showToast(`ERP 저장 완료!  신규 ${addedCount}건 / 갱신 ${updatedCount}건`, 'success');
        });
    }

    // ── 인사기록카드 그리드 갱신 ───────────────────────────────
    function refreshPersonnelGrid(employees) {
        const grid = document.querySelector('.personnel-grid');
        if (!grid) return;

        // 기존 카드 중 동적 생성된 것만 제거
        grid.querySelectorAll('.employee-card.dynamic').forEach(c => c.remove());

        // 저장된 직원 카드 추가
        employees.forEach(emp => {
            // 이미 정적 카드가 있으면 스킵 (사번 기준)
            if (grid.querySelector(`[data-emp-id="${emp.emp_id}"]`)) return;

            const rankTag = getRankTag(emp.rank);
            const statusDot = emp.status === '재직' ? 'online' : 'offline';
            const statusText = emp.status === '재직' ? '정상근무' : (emp.status || '재직');

            const card = document.createElement('div');
            card.className = 'employee-card glassmorphism dynamic';
            card.setAttribute('data-emp-id', emp.emp_id);
            card.setAttribute('onclick', `openProfileModal('${emp.emp_id}')`);
            card.innerHTML = `
                <div class="emp-photo">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random" alt="Photo">
                </div>
                <div class="emp-info">
                    <h3 class="emp-name">${emp.name} <span class="emp-id">${emp.emp_id}</span></h3>
                    <p class="emp-dept">${emp.department || ''} ${emp.team_detail ? '(' + emp.team_detail + ')' : ''}</p>
                    <span class="emp-role ${rankTag.cls}">${rankTag.label}</span>
                </div>
                <div class="emp-status">
                    <div class="status-dot ${statusDot}"></div> ${statusText}
                </div>
            `;
            card.style.cursor = 'pointer';
            grid.appendChild(card);
        });
    }

    function getRankTag(rank) {
        const map = {
            '대표이사': { cls: 'tag-important', label: '대표이사' },
            '임원':     { cls: 'tag-important', label: '임원' },
            '부장':     { cls: 'tag-important', label: '부장 (큐레이터)' },
            '차장':     { cls: 'tag-important', label: '차장 (큐레이터)' },
            '과장':     { cls: 'tag-general',   label: '과장' },
            '대리':     { cls: 'tag-general',   label: '대리' },
            '주임':     { cls: 'tag-general',   label: '주임 (크루)' },
            '크루':     { cls: 'tag-general',   label: '팀원 (크루)' },
            '아르바이트': { cls: 'tag-hr',      label: '계약직 (알바)' },
            '인턴':     { cls: 'tag-hr',        label: '인턴' },
        };
        return map[rank] || { cls: 'tag-general', label: rank || '팀원' };
    }

    // ── 토스트 알림 ────────────────────────────────────────────
    function showToast(message, type = 'success') {
        const colors = {
            success: { bg: 'rgba(16,185,129,0.95)', icon: 'fa-circle-check' },
            error:   { bg: 'rgba(239,68,68,0.95)',  icon: 'fa-circle-xmark' },
            warn:    { bg: 'rgba(245,158,11,0.95)', icon: 'fa-triangle-exclamation' },
        };
        const { bg, icon } = colors[type] || colors.success;

        const toast = document.createElement('div');
        toast.style.cssText = `
            position:fixed; bottom:32px; right:32px; z-index:99999;
            background:${bg}; color:white; padding:14px 20px;
            border-radius:14px; display:flex; align-items:center; gap:10px;
            font-family:inherit; font-size:0.9rem; font-weight:600;
            box-shadow:0 10px 30px rgba(0,0,0,0.4);
            animation: slideInRight 0.3s ease;
        `;
        toast.innerHTML = `<i class="fa-solid ${icon}"></i> ${message}`;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // ── 애니메이션 CSS 주입 ────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100px); opacity: 0; }
            to   { transform: translateX(0);     opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0);     opacity: 1; }
            to   { transform: translateX(100px); opacity: 0; }
        }
        .btn-excel {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 9px 18px;
            background: linear-gradient(135deg, #059669, #10B981);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 0.88rem;
            font-weight: 600;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(16,185,129,0.3);
        }
        .btn-excel:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(16,185,129,0.4);
        }
    `;
    document.head.appendChild(style);

    // ── 페이지 로드 시 저장된 직원 복원 ──────────────────────
    window.addEventListener('load', () => {
        try {
            const KEY  = 'hongsam_employees';
            const data = JSON.parse(localStorage.getItem(KEY) || '[]');
            if (data.length > 0) refreshPersonnelGrid(data);
        } catch (_) {}
    });

})();
