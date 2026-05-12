// ═══════════════════════════════════════════════════════════════
// 홍삼한방타운 ERP — 회계/재무 관리 모듈 (accounting.js v1)
// 현금출납부 · 지출결의/수입결의 · 손익계산서
// ═══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

    // ── 권한 체크 ────────────────────────────────────────────
    const currentUser = localStorage.getItem('currentUser') || '';
    const empNum = parseInt(currentUser, 10);
    const isAdmin = currentUser === '001';
    // 팀장급(010~019) 이상만 편집 가능, 크루는 열람불가 (app.js에서 차단)
    const canEdit = isAdmin || (empNum >= 2 && empNum <= 19);

    if (!canEdit) {
        document.querySelectorAll('.acc-admin-only').forEach(el => el.style.display = 'none');
    }

    // ── localStorage Keys ──────────────────────────────────
    const DB_KEY = 'erp_accounting_db';
    const API_BASE = 'http://43.203.237.63:3001/api';

    function loadData() {
        try { return JSON.parse(localStorage.getItem(DB_KEY) || '[]'); } catch(e) { return []; }
    }
    function saveData(data) {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
        // 서버 동기화
        fetch(`${API_BASE}/db/erp_accounting_db`, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify(data)
        }).catch(() => {});
    }

    // ── Tab 전환 ──────────────────────────────────────────
    const tabs = document.querySelectorAll('.acc-tab');
    const panels = document.querySelectorAll('.acc-panel');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const target = document.getElementById(tab.dataset.target);
            if (target) target.classList.add('active');
            if (tab.dataset.target === 'panelCashbook') renderCashbook();
            if (tab.dataset.target === 'panelVoucher') renderVouchers();
            if (tab.dataset.target === 'panelPnL') renderPnL();
        });
    });

    // ══════════════════════════════════════════════════════════
    // 1) 현금출납부 (Cash Book)
    // ══════════════════════════════════════════════════════════
    function renderCashbook() {
        const data = loadData();
        const monthFilter = document.getElementById('cbMonthFilter');
        const month = monthFilter ? monthFilter.value : '';
        const typeFilter = document.getElementById('cbTypeFilter');
        const type = typeFilter ? typeFilter.value : 'all';

        let filtered = data.filter(d => d.status !== 'draft');
        if (month) filtered = filtered.filter(d => d.date && d.date.startsWith(month));
        if (type !== 'all') filtered = filtered.filter(d => d.type === type);
        filtered.sort((a,b) => (b.date||'').localeCompare(a.date||''));

        const tbody = document.getElementById('cbTableBody');
        if (!tbody) return;

        let balance = 0;
        // 역순 정렬 후 잔액 누적을 위해 다시 날짜순
        const ordered = [...filtered].sort((a,b) => (a.date||'').localeCompare(b.date||''));
        ordered.forEach(d => {
            if (d.type === 'income') balance += (d.amount || 0);
            else balance -= (d.amount || 0);
            d._balance = balance;
        });

        // 최신순으로 표시
        const display = [...ordered].reverse();

        if (display.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="acc-empty"><i class="fa-solid fa-receipt"></i>등록된 내역이 없습니다.</td></tr>`;
            return;
        }

        tbody.innerHTML = display.map(d => `
            <tr data-id="${d.id}" style="cursor:pointer;">
                <td>${d.date || '-'}</td>
                <td><span class="acc-tag ${d.type}">${d.type === 'income' ? '수입' : '지출'}</span></td>
                <td>${escapeHtml(d.category || '-')}</td>
                <td>${escapeHtml(d.description || '-')}</td>
                <td>${escapeHtml(d.department || '-')}</td>
                <td class="text-right ${d.type === 'income' ? 'acc-amount-positive' : 'acc-amount-negative'}">
                    ${d.type === 'income' ? '+' : '-'}${(d.amount||0).toLocaleString()}
                </td>
                <td class="text-right acc-amount-neutral">${(d._balance||0).toLocaleString()}</td>
            </tr>
        `).join('');

        // 클릭시 상세 보기
        tbody.querySelectorAll('tr[data-id]').forEach(tr => {
            tr.addEventListener('click', () => openViewModal(tr.dataset.id));
        });

        // KPI 업데이트
        updateKPIs(data, month);
    }

    function updateKPIs(data, month) {
        const now = new Date();
        const curMonth = month || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
        const monthData = data.filter(d => d.date && d.date.startsWith(curMonth) && d.status !== 'draft');

        let totalIncome = 0, totalExpense = 0;
        monthData.forEach(d => {
            if (d.type === 'income') totalIncome += (d.amount || 0);
            else totalExpense += (d.amount || 0);
        });

        const profit = totalIncome - totalExpense;
        const el = (id) => document.getElementById(id);

        if (el('kpiIncome')) el('kpiIncome').textContent = '₩' + totalIncome.toLocaleString();
        if (el('kpiExpense')) el('kpiExpense').textContent = '₩' + totalExpense.toLocaleString();
        if (el('kpiProfit')) {
            el('kpiProfit').textContent = '₩' + profit.toLocaleString();
            el('kpiProfit').style.color = profit >= 0 ? '#10B981' : '#EF4444';
        }
        // 현금잔액: 전체 누적
        let cashBal = 0;
        const allSorted = [...data].filter(d => d.status !== 'draft').sort((a,b) => (a.date||'').localeCompare(b.date||''));
        allSorted.forEach(d => { cashBal += d.type === 'income' ? (d.amount||0) : -(d.amount||0); });
        if (el('kpiCash')) el('kpiCash').textContent = '₩' + cashBal.toLocaleString();

        // 미결 건수
        const pendingCount = data.filter(d => d.status === 'pending').length;
        const badge = document.querySelector('.acc-tab[data-target="panelVoucher"] .tab-badge');
        if (badge) badge.textContent = pendingCount || '';
        if (badge && pendingCount === 0) badge.style.display = 'none';
    }

    // ══════════════════════════════════════════════════════════
    // 2) 수입/지출 결의서 (Vouchers)
    // ══════════════════════════════════════════════════════════
    function renderVouchers() {
        const data = loadData();
        const statusFilter = document.getElementById('vcStatusFilter');
        const status = statusFilter ? statusFilter.value : 'all';
        const typeFilter = document.getElementById('vcTypeFilter');
        const type = typeFilter ? typeFilter.value : 'all';

        let filtered = [...data];
        if (status !== 'all') filtered = filtered.filter(d => d.status === status);
        if (type !== 'all') filtered = filtered.filter(d => d.type === type);
        filtered.sort((a,b) => (b.created||'').localeCompare(a.created||''));

        const tbody = document.getElementById('vcTableBody');
        if (!tbody) return;

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="acc-empty"><i class="fa-solid fa-file-invoice"></i>결의서가 없습니다.</td></tr>`;
            return;
        }

        const statusMap = {approved:'승인완료', pending:'결재대기', rejected:'반려', draft:'임시저장'};
        tbody.innerHTML = filtered.map(d => `
            <tr data-id="${d.id}" style="cursor:pointer;">
                <td style="font-size:.8rem;color:var(--text-secondary);">${(d.id||'').substring(0,8)}</td>
                <td>${d.date || '-'}</td>
                <td><span class="acc-tag ${d.type}">${d.type === 'income' ? '수입결의' : '지출결의'}</span></td>
                <td>${escapeHtml(d.description || '-')}</td>
                <td>${escapeHtml(d.department || '-')}</td>
                <td class="text-right acc-amount-neutral">${(d.amount||0).toLocaleString()}</td>
                <td class="text-center"><span class="acc-tag ${d.status}">${statusMap[d.status]||d.status}</span></td>
                <td>${escapeHtml(d.writer || '-')}</td>
            </tr>
        `).join('');

        tbody.querySelectorAll('tr[data-id]').forEach(tr => {
            tr.addEventListener('click', () => openViewModal(tr.dataset.id));
        });
    }

    // ══════════════════════════════════════════════════════════
    // 3) 손익계산서 (P&L Statement)
    // ══════════════════════════════════════════════════════════
    function renderPnL() {
        const data = loadData();
        const pnlMonth = document.getElementById('pnlMonthFilter');
        const month = pnlMonth ? pnlMonth.value : '';
        const now = new Date();
        const curMonth = month || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
        const monthData = data.filter(d => d.date && d.date.startsWith(curMonth) && d.status !== 'draft');

        // 카테고리별 집계
        const incomeCats = {};
        const expenseCats = {};
        monthData.forEach(d => {
            const cat = d.category || '기타';
            if (d.type === 'income') {
                incomeCats[cat] = (incomeCats[cat]||0) + (d.amount||0);
            } else {
                expenseCats[cat] = (expenseCats[cat]||0) + (d.amount||0);
            }
        });

        let totalIncome = Object.values(incomeCats).reduce((s,v)=>s+v, 0);
        let totalExpense = Object.values(expenseCats).reduce((s,v)=>s+v, 0);
        let netProfit = totalIncome - totalExpense;

        // Summary cards
        const el = id => document.getElementById(id);
        if (el('pnlTotalIncome')) {
            el('pnlTotalIncome').textContent = '₩' + totalIncome.toLocaleString();
            el('pnlTotalIncome').style.color = '#10B981';
        }
        if (el('pnlTotalExpense')) {
            el('pnlTotalExpense').textContent = '₩' + totalExpense.toLocaleString();
            el('pnlTotalExpense').style.color = '#EF4444';
        }
        if (el('pnlNetProfit')) {
            el('pnlNetProfit').textContent = '₩' + netProfit.toLocaleString();
            el('pnlNetProfit').style.color = netProfit >= 0 ? '#10B981' : '#EF4444';
        }

        // Income rows
        const incomeBody = document.getElementById('pnlIncomeBody');
        if (incomeBody) {
            if (Object.keys(incomeCats).length === 0) {
                incomeBody.innerHTML = '<div class="acc-pnl-row"><span class="label">내역 없음</span><span class="value">₩0</span></div>';
            } else {
                incomeBody.innerHTML = Object.entries(incomeCats).map(([k,v]) =>
                    `<div class="acc-pnl-row"><span class="label">${escapeHtml(k)}</span><span class="value acc-amount-positive">₩${v.toLocaleString()}</span></div>`
                ).join('');
            }
        }
        const incomeTotalEl = document.getElementById('pnlIncomeTotal');
        if (incomeTotalEl) incomeTotalEl.innerHTML = `<span>매출 합계</span><span class="acc-amount-positive">₩${totalIncome.toLocaleString()}</span>`;

        // Expense rows
        const expenseBody = document.getElementById('pnlExpenseBody');
        if (expenseBody) {
            if (Object.keys(expenseCats).length === 0) {
                expenseBody.innerHTML = '<div class="acc-pnl-row"><span class="label">내역 없음</span><span class="value">₩0</span></div>';
            } else {
                expenseBody.innerHTML = Object.entries(expenseCats).map(([k,v]) =>
                    `<div class="acc-pnl-row"><span class="label">${escapeHtml(k)}</span><span class="value acc-amount-negative">₩${v.toLocaleString()}</span></div>`
                ).join('');
            }
        }
        const expenseTotalEl = document.getElementById('pnlExpenseTotal');
        if (expenseTotalEl) expenseTotalEl.innerHTML = `<span>비용 합계</span><span class="acc-amount-negative">₩${totalExpense.toLocaleString()}</span>`;

        // Net Profit
        const profitEl = document.getElementById('pnlProfitTotal');
        if (profitEl) profitEl.innerHTML = `<span>당기순이익</span><span class="${netProfit>=0?'acc-amount-positive':'acc-amount-negative'}">₩${netProfit.toLocaleString()}</span>`;

        // Chart
        renderPnLChart(incomeCats, expenseCats);
    }

    function renderPnLChart(incomeCats, expenseCats) {
        const canvas = document.getElementById('pnlChart');
        if (!canvas || typeof Chart === 'undefined') return;

        if (window._accPnlChart) window._accPnlChart.destroy();

        const allCats = [...new Set([...Object.keys(incomeCats), ...Object.keys(expenseCats)])];
        const incomeData = allCats.map(c => incomeCats[c] || 0);
        const expenseData = allCats.map(c => -(expenseCats[c] || 0));

        window._accPnlChart = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: allCats.length ? allCats : ['데이터 없음'],
                datasets: [
                    { label: '수입', data: incomeData.length ? incomeData : [0], backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 4 },
                    { label: '지출', data: expenseData.length ? expenseData : [0], backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { color: '#94A3B8', usePointStyle: true } } },
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94A3B8' } },
                    x: { grid: { display: false }, ticks: { color: '#94A3B8' } }
                }
            }
        });
    }

    // ══════════════════════════════════════════════════════════
    // Modal: 상세 보기
    // ══════════════════════════════════════════════════════════
    let currentViewId = null;

    function openViewModal(id) {
        const data = loadData();
        const item = data.find(d => d.id === id);
        if (!item) return;
        currentViewId = id;

        const el = id => document.getElementById(id);
        el('viewDate').textContent = item.date || '-';
        el('viewType').innerHTML = `<span class="acc-tag ${item.type}">${item.type === 'income' ? '수입' : '지출'}</span>`;
        el('viewCategory').textContent = item.category || '-';
        el('viewDesc').textContent = item.description || '-';
        el('viewDept').textContent = item.department || '-';
        el('viewAmount').textContent = '₩' + (item.amount||0).toLocaleString();
        el('viewAmount').className = item.type === 'income' ? 'acc-amount-positive' : 'acc-amount-negative';
        el('viewStatus').innerHTML = `<span class="acc-tag ${item.status}">${{approved:'승인완료',pending:'결재대기',rejected:'반려',draft:'임시저장'}[item.status]||item.status}</span>`;
        el('viewWriter').textContent = item.writer || '-';
        el('viewMemo').textContent = item.memo || '-';

        // 관리 버튼 표시
        const editBtn = document.getElementById('btnEditAcc');
        const delBtn = document.getElementById('btnDeleteAcc');
        if (editBtn) editBtn.style.display = canEdit ? '' : 'none';
        if (delBtn) delBtn.style.display = isAdmin ? '' : 'none';

        showModal('viewAccModal');
    }

    // ══════════════════════════════════════════════════════════
    // Modal: 신규 등록 / 수정
    // ══════════════════════════════════════════════════════════
    let editMode = false;
    let editId = null;

    const btnNew = document.getElementById('btnNewAcc');
    if (btnNew) {
        btnNew.addEventListener('click', () => {
            editMode = false; editId = null;
            document.getElementById('formAccTitle').innerHTML = '<i class="fa-solid fa-file-circle-plus" style="color:#3B82F6;"></i> 새 결의서 작성';
            clearForm();
            document.getElementById('btnDeleteInForm').style.display = 'none';
            showModal('formAccModal');
        });
    }

    const btnEdit = document.getElementById('btnEditAcc');
    if (btnEdit) {
        btnEdit.addEventListener('click', () => {
            const data = loadData();
            const item = data.find(d => d.id === currentViewId);
            if (!item) return;
            editMode = true; editId = currentViewId;
            document.getElementById('formAccTitle').innerHTML = '<i class="fa-solid fa-pen" style="color:#F59E0B;"></i> 결의서 수정';
            fillForm(item);
            document.getElementById('btnDeleteInForm').style.display = isAdmin ? '' : 'none';
            closeModal('viewAccModal');
            showModal('formAccModal');
        });
    }

    // Save
    const btnSave = document.getElementById('btnSaveAcc');
    if (btnSave) {
        btnSave.addEventListener('click', () => {
            const formData = getFormData();
            if (!formData.date || !formData.description || !formData.amount) {
                alert('날짜, 적요, 금액은 필수 입력입니다.');
                return;
            }
            let data = loadData();
            if (editMode && editId) {
                const idx = data.findIndex(d => d.id === editId);
                if (idx >= 0) {
                    data[idx] = { ...data[idx], ...formData, updated: new Date().toISOString() };
                }
            } else {
                formData.id = 'ACC-' + Date.now().toString(36).toUpperCase();
                formData.created = new Date().toISOString();
                formData.writer = localStorage.getItem('currentUserName') || currentUser;
                data.push(formData);
            }
            saveData(data);
            closeModal('formAccModal');
            showToast(editMode ? '결의서가 수정되었습니다.' : '결의서가 등록되었습니다.');
            renderCashbook();
            renderVouchers();
        });
    }

    // Delete
    function deleteItem(id) {
        if (!confirm('이 결의서를 삭제하시겠습니까?')) return;
        let data = loadData();
        data = data.filter(d => d.id !== id);
        saveData(data);
        closeModal('viewAccModal');
        closeModal('formAccModal');
        showToast('삭제되었습니다.');
        renderCashbook();
        renderVouchers();
    }

    const btnDel = document.getElementById('btnDeleteAcc');
    if (btnDel) btnDel.addEventListener('click', () => deleteItem(currentViewId));
    const btnDelInForm = document.getElementById('btnDeleteInForm');
    if (btnDelInForm) btnDelInForm.addEventListener('click', () => deleteItem(editId));

    // CSV 내보내기
    const btnExport = document.getElementById('btnExportCsv');
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            const data = loadData().filter(d => d.status !== 'draft');
            if (data.length === 0) { alert('내보낼 데이터가 없습니다.'); return; }
            const header = '날짜,구분,카테고리,적요,부서,금액,상태,작성자\n';
            const rows = data.map(d =>
                `${d.date},${d.type==='income'?'수입':'지출'},${d.category||''},${(d.description||'').replace(/,/g,' ')},${d.department||''},${d.amount||0},${d.status||''},${d.writer||''}`
            ).join('\n');
            const blob = new Blob(['\uFEFF'+header+rows], {type:'text/csv;charset=utf-8;'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `현금출납부_${new Date().toISOString().slice(0,10)}.csv`;
            a.click(); URL.revokeObjectURL(url);
        });
    }

    // ── Form helpers ──
    function clearForm() {
        ['fAccType','fAccStatus','fAccDate','fAccCategory','fAccDesc','fAccDept','fAccAmount','fAccMemo'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = el.tagName === 'SELECT' ? el.options[0].value : '';
        });
    }
    function fillForm(item) {
        const el = id => document.getElementById(id);
        if (el('fAccType')) el('fAccType').value = item.type || 'expense';
        if (el('fAccStatus')) el('fAccStatus').value = item.status || 'pending';
        if (el('fAccDate')) el('fAccDate').value = item.date || '';
        if (el('fAccCategory')) el('fAccCategory').value = item.category || '';
        if (el('fAccDesc')) el('fAccDesc').value = item.description || '';
        if (el('fAccDept')) el('fAccDept').value = item.department || '';
        if (el('fAccAmount')) el('fAccAmount').value = item.amount || '';
        if (el('fAccMemo')) el('fAccMemo').value = item.memo || '';
    }
    function getFormData() {
        const el = id => document.getElementById(id);
        return {
            type: el('fAccType') ? el('fAccType').value : 'expense',
            status: el('fAccStatus') ? el('fAccStatus').value : 'pending',
            date: el('fAccDate') ? el('fAccDate').value : '',
            category: el('fAccCategory') ? el('fAccCategory').value : '',
            description: el('fAccDesc') ? el('fAccDesc').value : '',
            department: el('fAccDept') ? el('fAccDept').value : '',
            amount: el('fAccAmount') ? parseInt(el('fAccAmount').value, 10) || 0 : 0,
            memo: el('fAccMemo') ? el('fAccMemo').value : ''
        };
    }

    // ── Modal helpers ──
    function showModal(id) { document.getElementById(id)?.classList.add('show'); }
    function closeModal(id) { document.getElementById(id)?.classList.remove('show'); }

    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
    });
    document.querySelectorAll('.acc-modal-overlay').forEach(ov => {
        ov.addEventListener('click', e => { if (e.target === ov) closeModal(ov.id); });
    });

    // ── Toast ──
    function showToast(msg) {
        const t = document.getElementById('accToast');
        if (!t) return;
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 2500);
    }

    // ── XSS Prevention ──
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ── Filter 이벤트 ──
    ['cbMonthFilter','cbTypeFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', renderCashbook);
    });
    ['vcStatusFilter','vcTypeFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', renderVouchers);
    });
    const pnlFilter = document.getElementById('pnlMonthFilter');
    if (pnlFilter) pnlFilter.addEventListener('change', renderPnL);

    // ── 초기 로드 ──
    // 서버에서 데이터 복원
    fetch(`${API_BASE}/db/erp_accounting_db`)
        .then(r => r.json())
        .then(d => { if (d && Array.isArray(d) && d.length > 0) localStorage.setItem(DB_KEY, JSON.stringify(d)); })
        .catch(() => {})
        .finally(() => {
            renderCashbook();
            updateKPIs(loadData(), '');
        });
});
