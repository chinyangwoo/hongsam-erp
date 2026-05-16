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
    // 1) 현금출납부 (Cash Book) — 주간/월간 페이지네이션
    // ══════════════════════════════════════════════════════════
    let cbViewMode = 'week'; // 'week' or 'month'
    let cbCurrentWeekStart = getMonday(new Date()); // 현재 주의 월요일
    let cbCurrentMonth = new Date(); // 현재 월

    // 해당 날짜가 속한 주의 월요일을 반환
    function getMonday(d) {
        const dt = new Date(d);
        const day = dt.getDay();
        const diff = dt.getDate() - day + (day === 0 ? -6 : 1); // 일요일이면 전주 월요일
        return new Date(dt.setDate(diff));
    }

    // 날짜를 YYYY-MM-DD 문자열로
    function toDateStr(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
    }

    // 주차 계산 (해당 월의 몇째 주)
    function getWeekOfMonth(d) {
        const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
        const firstMonday = getMonday(firstDay);
        if (firstMonday.getMonth() < d.getMonth() || (firstMonday.getMonth() === 11 && d.getMonth() === 0)) {
            // 첫째 월요일이 전월이면 1일부터 시작
        }
        const diff = Math.floor((d - firstMonday) / (7 * 24 * 60 * 60 * 1000));
        return Math.max(1, diff + 1);
    }

    // 주간 네비 라벨 업데이트
    function updateWeekLabel() {
        const start = new Date(cbCurrentWeekStart);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);

        const weekNum = getWeekOfMonth(start);
        const labelEl = document.getElementById('cbWeekLabel');
        const rangeEl = document.getElementById('cbWeekRange');
        if (labelEl) labelEl.textContent = `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${weekNum}주차`;
        if (rangeEl) rangeEl.textContent = `${start.getMonth() + 1}/${start.getDate()}(${['일','월','화','수','목','금','토'][start.getDay()]}) ~ ${end.getMonth() + 1}/${end.getDate()}(${['일','월','화','수','목','금','토'][end.getDay()]})`;
    }

    // 월간 네비 라벨 업데이트
    function updateMonthLabel() {
        const labelEl = document.getElementById('cbMonthLabel');
        if (labelEl) labelEl.textContent = `${cbCurrentMonth.getFullYear()}년 ${cbCurrentMonth.getMonth() + 1}월`;
    }

    function renderCashbook() {
        const data = loadData();
        const typeFilter = document.getElementById('cbTypeFilter');
        const type = typeFilter ? typeFilter.value : 'all';

        let filtered = data.filter(d => d.status !== 'draft');
        if (type !== 'all') filtered = filtered.filter(d => d.type === type);

        // 기간 필터링
        if (cbViewMode === 'week') {
            const weekStart = toDateStr(cbCurrentWeekStart);
            const weekEnd = new Date(cbCurrentWeekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            const weekEndStr = toDateStr(weekEnd);
            filtered = filtered.filter(d => d.date && d.date >= weekStart && d.date <= weekEndStr);
            updateWeekLabel();
        } else {
            const monthStr = `${cbCurrentMonth.getFullYear()}-${String(cbCurrentMonth.getMonth() + 1).padStart(2, '0')}`;
            filtered = filtered.filter(d => d.date && d.date.startsWith(monthStr));
            updateMonthLabel();
        }

        filtered.sort((a,b) => (b.date||'').localeCompare(a.date||''));

        const tbody = document.getElementById('cbTableBody');
        if (!tbody) return;

        // 잔액 누적 계산 (전체 데이터 기준)
        let balance = 0;
        const allSorted = [...data].filter(d => d.status !== 'draft').sort((a,b) => (a.date||'').localeCompare(b.date||''));
        allSorted.forEach(d => {
            if (d.type === 'income') balance += (d.amount || 0);
            else balance -= (d.amount || 0);
            d._balance = balance;
        });

        // 현재 기간 내 항목만 최신순 표시
        const display = [...filtered].sort((a,b) => (b.date||'').localeCompare(a.date||''));

        if (display.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="acc-empty"><i class="fa-solid fa-receipt"></i>이 기간에 등록된 내역이 없습니다.</td></tr>`;
        } else {
            tbody.innerHTML = display.map(d => {
                const autoBadge = d.autoGenerated ? '<span style="background:rgba(59,130,246,0.15); color:#60A5FA; font-size:0.6rem; padding:2px 6px; border-radius:4px; margin-left:6px; font-weight:600;">자동</span>' : '';
                return `
                <tr data-id="${d.id}" style="cursor:pointer;${d.autoGenerated ? ' opacity:0.85;' : ''}">
                    <td>${d.date || '-'}</td>
                    <td><span class="acc-tag ${d.type}">${d.type === 'income' ? '수입' : '지출'}</span></td>
                    <td>${escapeHtml(d.category || '-')}</td>
                    <td>${escapeHtml(d.description || '-')}${autoBadge}</td>
                    <td>${escapeHtml(d.department || '-')}</td>
                    <td class="text-right ${d.type === 'income' ? 'acc-amount-positive' : 'acc-amount-negative'}">
                        ${d.type === 'income' ? '+' : '-'}${(d.amount||0).toLocaleString()}
                    </td>
                    <td class="text-right acc-amount-neutral">${(d._balance||0).toLocaleString()}</td>
                </tr>
            `;}).join('');

            // 클릭시 상세 보기
            tbody.querySelectorAll('tr[data-id]').forEach(tr => {
                tr.addEventListener('click', () => openViewModal(tr.dataset.id));
            });
        }

        // 주간/월간 소계 업데이트
        let sumIncome = 0, sumExpense = 0;
        display.forEach(d => {
            if (d.type === 'income') sumIncome += (d.amount || 0);
            else sumExpense += (d.amount || 0);
        });
        const net = sumIncome - sumExpense;
        const elSumIncome = document.getElementById('cbSumIncome');
        const elSumExpense = document.getElementById('cbSumExpense');
        const elSumNet = document.getElementById('cbSumNet');
        const elSumCount = document.getElementById('cbSumCount');
        if (elSumIncome) elSumIncome.textContent = '₩' + sumIncome.toLocaleString();
        if (elSumExpense) elSumExpense.textContent = '₩' + sumExpense.toLocaleString();
        if (elSumNet) {
            elSumNet.textContent = (net >= 0 ? '₩' : '-₩') + Math.abs(net).toLocaleString();
            elSumNet.style.color = net >= 0 ? '#10B981' : '#EF4444';
        }
        if (elSumCount) elSumCount.textContent = display.length + '건';

        // KPI 업데이트 (월 전체 기준)
        const now = new Date();
        const curMonthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
        updateKPIs(data, curMonthStr);
    }

    // 주간/월간 네비게이션 이벤트
    const cbPrevWeek = document.getElementById('cbPrevWeek');
    const cbNextWeek = document.getElementById('cbNextWeek');
    const cbToday = document.getElementById('cbToday');
    const cbPrevMonth = document.getElementById('cbPrevMonth');
    const cbNextMonth = document.getElementById('cbNextMonth');
    const cbThisMonth = document.getElementById('cbThisMonth');
    const cbViewWeek = document.getElementById('cbViewWeek');
    const cbViewMonth = document.getElementById('cbViewMonth');

    if (cbPrevWeek) cbPrevWeek.addEventListener('click', () => {
        cbCurrentWeekStart.setDate(cbCurrentWeekStart.getDate() - 7);
        renderCashbook();
    });
    if (cbNextWeek) cbNextWeek.addEventListener('click', () => {
        cbCurrentWeekStart.setDate(cbCurrentWeekStart.getDate() + 7);
        renderCashbook();
    });
    if (cbToday) cbToday.addEventListener('click', () => {
        cbCurrentWeekStart = getMonday(new Date());
        renderCashbook();
    });
    if (cbPrevMonth) cbPrevMonth.addEventListener('click', () => {
        cbCurrentMonth.setMonth(cbCurrentMonth.getMonth() - 1);
        renderCashbook();
    });
    if (cbNextMonth) cbNextMonth.addEventListener('click', () => {
        cbCurrentMonth.setMonth(cbCurrentMonth.getMonth() + 1);
        renderCashbook();
    });
    if (cbThisMonth) cbThisMonth.addEventListener('click', () => {
        cbCurrentMonth = new Date();
        renderCashbook();
    });

    // 뷰 토글 (주간 ↔ 월간)
    function switchView(mode) {
        cbViewMode = mode;
        const weekNav = document.getElementById('cbWeekNav');
        const monthNav = document.getElementById('cbMonthNav');
        if (mode === 'week') {
            if (weekNav) weekNav.style.display = 'flex';
            if (monthNav) monthNav.style.display = 'none';
            if (cbViewWeek) { cbViewWeek.style.background = 'rgba(59,130,246,0.2)'; cbViewWeek.style.color = '#60A5FA'; cbViewWeek.classList.add('active'); }
            if (cbViewMonth) { cbViewMonth.style.background = 'rgba(255,255,255,0.05)'; cbViewMonth.style.color = 'var(--text-secondary)'; cbViewMonth.classList.remove('active'); }
        } else {
            if (weekNav) weekNav.style.display = 'none';
            if (monthNav) monthNav.style.display = 'flex';
            if (cbViewMonth) { cbViewMonth.style.background = 'rgba(245,158,11,0.2)'; cbViewMonth.style.color = '#FBBF24'; cbViewMonth.classList.add('active'); }
            if (cbViewWeek) { cbViewWeek.style.background = 'rgba(255,255,255,0.05)'; cbViewWeek.style.color = 'var(--text-secondary)'; cbViewWeek.classList.remove('active'); }
        }
        renderCashbook();
    }

    if (cbViewWeek) cbViewWeek.addEventListener('click', () => switchView('week'));
    if (cbViewMonth) cbViewMonth.addEventListener('click', () => switchView('month'));

    // 키보드 화살표 단축키 (현금출납부 탭이 활성화된 경우)
    document.addEventListener('keydown', (e) => {
        const cashbookPanel = document.getElementById('panelCashbook');
        if (!cashbookPanel || !cashbookPanel.classList.contains('active')) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (cbViewMode === 'week') {
                cbCurrentWeekStart.setDate(cbCurrentWeekStart.getDate() - 7);
            } else {
                cbCurrentMonth.setMonth(cbCurrentMonth.getMonth() - 1);
            }
            renderCashbook();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            if (cbViewMode === 'week') {
                cbCurrentWeekStart.setDate(cbCurrentWeekStart.getDate() + 7);
            } else {
                cbCurrentMonth.setMonth(cbCurrentMonth.getMonth() + 1);
            }
            renderCashbook();
        }
    });

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
    ['cbTypeFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', renderCashbook);
    });
    ['vcStatusFilter','vcTypeFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', renderVouchers);
    });
    const pnlFilter = document.getElementById('pnlMonthFilter');
    if (pnlFilter) pnlFilter.addEventListener('change', renderPnL);

    // ══════════════════════════════════════════════════════════
    // Phase A: 영업매출 → 회계 자동 연동 (수입 자동화)
    // ══════════════════════════════════════════════════════════
    function autoSyncRevenueToAccounting() {
        const revDbStr = localStorage.getItem('erp_revenue_db');
        if (!revDbStr) return;
        let revDb;
        try { revDb = JSON.parse(revDbStr); } catch(e) { return; }

        let accDb = loadData();
        let added = 0;

        Object.keys(revDb).forEach(dateKey => {
            const rev = revDb[dateKey];
            const syncId = `AUTO-REV-${dateKey}`;
            if (accDb.some(d => d.id === syncId)) return; // 이미 등록됨

            // 호텔 매출 (원 단위) + 스파 매출 (만원 단위 → 원 변환)
            const hotelRoom = rev.hotelRoomRev || 0;
            const hotelFb   = rev.hotelFbRev || 0;
            const spaTick   = (rev.spaTickRev || 0) * 10000;
            const spaFb     = (rev.spaFbRev || 0) * 10000;
            const totalRevenue = hotelRoom + hotelFb + spaTick + spaFb;

            if (totalRevenue <= 0) return;

            // 세부 내역 설명 생성
            const details = [];
            if (hotelRoom > 0) details.push(`객실 ${hotelRoom.toLocaleString()}`);
            if (hotelFb > 0)   details.push(`호텔F&B ${hotelFb.toLocaleString()}`);
            if (spaTick > 0)   details.push(`스파입장 ${spaTick.toLocaleString()}`);
            if (spaFb > 0)     details.push(`스파F&B ${spaFb.toLocaleString()}`);

            accDb.push({
                id: syncId,
                type: 'income',
                status: 'approved',
                date: dateKey,
                category: '매출수입',
                description: `[자동] 통합 일매출 (${details.join(' + ')})`,
                department: '경영진',
                amount: totalRevenue,
                writer: 'SYSTEM',
                memo: '영업관리 모듈에서 자동 연동된 매출 데이터입니다.',
                created: new Date().toISOString(),
                autoGenerated: true
            });
            added++;
        });

        if (added > 0) {
            saveData(accDb);
            console.log(`[회계자동화] Phase A: ${added}건의 매출 결의서가 자동 등록되었습니다.`);
        }
    }

    // ══════════════════════════════════════════════════════════
    // Phase B: HR 급여 → 회계 인건비 자동 연동
    // ══════════════════════════════════════════════════════════
    function autoSyncPayrollToAccounting() {
        const employees = JSON.parse(localStorage.getItem('hongsam_employees') || '[]');
        if (employees.length === 0) return;

        let accDb = loadData();
        const now = new Date();

        // 지난 6개월 치를 체크 (누락분 자동 보정)
        for (let i = 1; i <= 6; i++) {
            const target = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${target.getFullYear()}-${String(target.getMonth()+1).padStart(2,'0')}`;
            const syncId = `AUTO-PAY-${monthKey}`;

            if (accDb.some(d => d.id === syncId)) continue;

            const activeEmps = employees.filter(e => e.status === '재직' || !e.status);
            const totalPayroll = activeEmps.reduce((sum, e) => {
                const salary = parseInt(String(e.salary || '0').replace(/,/g, ''), 10);
                return sum + (salary || 0);
            }, 0);

            if (totalPayroll <= 0) continue;

            accDb.push({
                id: syncId,
                type: 'expense',
                status: 'approved',
                date: `${monthKey}-25`,
                category: '인건비',
                description: `[자동] ${monthKey} 전사 급여 (재직자 ${activeEmps.length}명)`,
                department: '경영진',
                amount: totalPayroll,
                writer: 'SYSTEM',
                memo: 'HR 모듈 급여 데이터에서 자동 산출된 인건비입니다.',
                created: new Date().toISOString(),
                autoGenerated: true
            });
            console.log(`[회계자동화] Phase B: ${monthKey} 인건비 ${totalPayroll.toLocaleString()}원 자동 등록`);
        }
        saveData(accDb);
    }

    // ══════════════════════════════════════════════════════════
    // Phase C: 정기 고정 지출 자동 등록
    // ══════════════════════════════════════════════════════════
    function autoSyncFixedExpenses() {
        const FIXED_KEY = 'erp_fixed_expenses';
        let fixedExpenses = JSON.parse(localStorage.getItem(FIXED_KEY) || 'null');

        // 최초 1회: 기본 고정 지출 항목 세팅
        if (!fixedExpenses) {
            fixedExpenses = [
                { name: '전기요금',       category: '공과금',     amount: 8500000,  dept: '공무팀',   dayOfMonth: 20 },
                { name: '수도요금',       category: '공과금',     amount: 2100000,  dept: '공무팀',   dayOfMonth: 20 },
                { name: '가스요금',       category: '공과금',     amount: 3800000,  dept: '공무팀',   dayOfMonth: 20 },
                { name: '건물종합보험',   category: '보험/세금',  amount: 4200000,  dept: '지원팀',   dayOfMonth: 1 },
                { name: '시설유지보수',   category: '시설유지',   amount: 5000000,  dept: '공무팀',   dayOfMonth: 15 },
                { name: '식자재 월계약',  category: '식음료/자재', amount: 12000000, dept: '식음료팀', dayOfMonth: 1 },
                { name: '마케팅 월예산',  category: '마케팅',     amount: 3000000,  dept: '운영팀',   dayOfMonth: 1 }
            ];
            localStorage.setItem(FIXED_KEY, JSON.stringify(fixedExpenses));
        }

        let accDb = loadData();
        const now = new Date();

        // 지난 3개월 + 이번 달 자동 등록
        for (let i = 0; i <= 3; i++) {
            const target = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${target.getFullYear()}-${String(target.getMonth()+1).padStart(2,'0')}`;

            fixedExpenses.forEach(fe => {
                const syncId = `AUTO-FIX-${monthKey}-${fe.name.replace(/\s/g,'')}`;
                if (accDb.some(d => d.id === syncId)) return;

                const dateStr = `${monthKey}-${String(fe.dayOfMonth).padStart(2,'0')}`;

                accDb.push({
                    id: syncId,
                    type: 'expense',
                    status: 'approved',
                    date: dateStr,
                    category: fe.category,
                    description: `[자동] ${fe.name} (${monthKey})`,
                    department: fe.dept,
                    amount: fe.amount,
                    writer: 'SYSTEM',
                    memo: '정기 고정 지출 항목으로 자동 생성되었습니다.',
                    created: new Date().toISOString(),
                    autoGenerated: true
                });
            });
        }
        saveData(accDb);
        console.log('[회계자동화] Phase C: 정기 고정 지출 동기화 완료');
    }

    // ══════════════════════════════════════════════════════════
    // 경영 대시보드 (시뮬레이션 통합)
    // ══════════════════════════════════════════════════════════

    // Unit Toggle
    const unitBtns = document.querySelectorAll('.sim-unit-btn');
    unitBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            unitBtns.forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
        });
    });

    // Revenue Trend Chart (12개월)
    let revChart = null;
    const revCtx = document.getElementById('simRevenueChart');
    const isDark = document.body.classList.contains('dark-theme');
    if (revCtx && typeof Chart !== 'undefined') {
        revChart = new Chart(revCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    { label: '홍삼스파 매출', data: [], borderColor: '#8B5CF6', backgroundColor: 'rgba(139,92,246,0.1)', tension: 0.4, borderWidth: 2.5, pointRadius: 3, fill: true },
                    { label: '홍삼빌호텔 매출', data: [], borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.1)', tension: 0.4, borderWidth: 2.5, pointRadius: 3, fill: true }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { usePointStyle: true, padding: 20, color: isDark ? '#94A3B8' : '#6B7280' } },
                    tooltip: { callbacks: { label: function(ctx) { return ctx.dataset.label + ': ₩' + ctx.parsed.y.toLocaleString() + '천원'; } } }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, ticks: { callback: function(v) { return '₩' + (v/1000).toFixed(0) + 'M'; }, color: isDark ? '#94A3B8' : '#6B7280' } },
                    x: { grid: { display: false }, ticks: { color: isDark ? '#94A3B8' : '#6B7280' } }
                }
            }
        });
    }

    // 비용 도넛차트 (실제 회계 데이터 기반)
    let costDonutChart = null;
    function renderCostDonut(accData) {
        const costCtx = document.getElementById('simCostChart');
        if (!costCtx || typeof Chart === 'undefined') return;
        if (costDonutChart) costDonutChart.destroy();

        const now = new Date();
        const curMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
        const monthExpenses = (accData || loadData()).filter(d =>
            d.date && d.date.startsWith(curMonth) && d.type === 'expense' && d.status !== 'draft'
        );

        const catMap = {};
        monthExpenses.forEach(d => {
            const cat = d.category || '기타';
            catMap[cat] = (catMap[cat] || 0) + (d.amount || 0);
        });

        const labels = Object.keys(catMap).length > 0 ? Object.keys(catMap) : ['데이터 없음'];
        const data = Object.keys(catMap).length > 0 ? Object.values(catMap) : [1];
        const colors = ['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EC4899','#6B7280','#14B8A6','#F97316'];

        costDonutChart = new Chart(costCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{ data: data, backgroundColor: colors.slice(0, labels.length), borderWidth: 0, hoverOffset: 6 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '65%',
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16, font: { size: 11 }, color: isDark ? '#94A3B8' : '#6B7280' } } }
            }
        });
    }

    // 대시보드 KPI 로드 (회계 DB + 호텔 API 통합)
    async function loadDashboardKPIs() {
        // 회계 DB에서 당월 데이터
        const accData = loadData();
        const now = new Date();
        const curMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
        const monthData = accData.filter(d => d.date && d.date.startsWith(curMonth) && d.status !== 'draft');

        let accIncome = 0, accExpense = 0;
        monthData.forEach(d => {
            if (d.type === 'income') accIncome += (d.amount || 0);
            else accExpense += (d.amount || 0);
        });

        // 호텔 API에서 가동률 가져오기
        let hotelLatestOcc = 0;
        try {
            const cached = JSON.parse(localStorage.getItem('erp_hotel_api_cache') || '{}');
            let hotelApiData = [];
            if (cached.ts && (Date.now() - cached.ts < 30 * 60 * 1000) && cached.data) {
                hotelApiData = cached.data;
            } else {
                const res = await fetch('https://hongsam.dothome.co.kr/api.php?action=load');
                if (res.ok) hotelApiData = await res.json();
            }
            if (hotelApiData.length > 0) {
                const sorted = hotelApiData.sort((a, b) => b.date.localeCompare(a.date));
                hotelLatestOcc = sorted[0].metrics.occRate || 0;
            }
        } catch(e) {
            try { hotelLatestOcc = JSON.parse(localStorage.getItem('erp_hotel_api_cache') || '{}').data?.[0]?.metrics?.occRate || 0; } catch(e2) {}
        }

        const totalProfit = accIncome - accExpense;

        const elRev = document.getElementById('simRevenue');
        const elCost = document.getElementById('simCost');
        const elProfit = document.getElementById('simProfit');
        const elOcc = document.getElementById('simOccupancy');

        if (elRev) elRev.innerText = '₩ ' + accIncome.toLocaleString();
        if (elCost) elCost.innerText = '₩ ' + accExpense.toLocaleString();
        if (elProfit) {
            elProfit.innerText = '₩ ' + totalProfit.toLocaleString();
            elProfit.style.color = totalProfit >= 0 ? '#10B981' : '#EF4444';
        }
        if (elOcc) elOcc.innerText = hotelLatestOcc + '%';

        // 12개월 차트 데이터 (회계 DB 기반)
        const labels = [];
        const incomeData = [];
        const expenseData = [];

        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            labels.push(`${d.getMonth() + 1}월`);

            const mData = accData.filter(r => r.date && r.date.startsWith(prefix) && r.status !== 'draft');
            let mIncome = 0, mExpense = 0;
            mData.forEach(r => {
                if (r.type === 'income') mIncome += (r.amount || 0);
                else mExpense += (r.amount || 0);
            });
            incomeData.push(Math.round(mIncome / 1000)); // 천원 단위
            expenseData.push(Math.round(mExpense / 1000));
        }

        if (revChart) {
            revChart.data.labels = labels;
            revChart.data.datasets[0].data = incomeData;
            revChart.data.datasets[0].label = '매출 (수입)';
            revChart.data.datasets[0].borderColor = '#10B981';
            revChart.data.datasets[0].backgroundColor = 'rgba(16,185,129,0.1)';
            revChart.data.datasets[1].data = expenseData;
            revChart.data.datasets[1].label = '비용 (지출)';
            revChart.data.datasets[1].borderColor = '#EF4444';
            revChart.data.datasets[1].backgroundColor = 'rgba(239,68,68,0.1)';
            revChart.update();
        }

        // 비용 도넛 차트 (실제 데이터)
        renderCostDonut(accData);
    }

    // What-If Simulation Sliders
    const sliders = {
        spaVisitors: document.getElementById('sliderSpaVisitors'),
        occupancy: document.getElementById('sliderOccupancy'),
        avgSpend: document.getElementById('sliderAvgSpend'),
        adr: document.getElementById('sliderADR')
    };
    const vals = {
        spaVisitors: document.getElementById('valSpaVisitors'),
        occupancy: document.getElementById('valOccupancy'),
        avgSpend: document.getElementById('valAvgSpend'),
        adr: document.getElementById('valADR')
    };
    const results = {
        spa: document.getElementById('resultSpaMonthlySales'),
        hotel: document.getElementById('resultHotelMonthlySales'),
        total: document.getElementById('resultTotalMonthlySales')
    };

    function calculateSimulation() {
        if (!sliders.spaVisitors) return;
        const sv = parseInt(sliders.spaVisitors.value);
        const oc = parseInt(sliders.occupancy.value);
        const as2 = parseInt(sliders.avgSpend.value);
        const ad = parseInt(sliders.adr.value);
        if (vals.spaVisitors) vals.spaVisitors.textContent = sv + '명';
        if (vals.occupancy) vals.occupancy.textContent = oc + '%';
        if (vals.avgSpend) vals.avgSpend.textContent = '₩' + as2.toLocaleString();
        if (vals.adr) vals.adr.textContent = '₩' + ad.toLocaleString();
        const spa = sv * as2 * 30;
        const hotel = Math.floor(43 * (oc / 100) * ad * 30);
        const total = spa + hotel;
        if (results.spa) results.spa.textContent = '₩ ' + spa.toLocaleString();
        if (results.hotel) results.hotel.textContent = '₩ ' + hotel.toLocaleString();
        if (results.total) results.total.textContent = '₩ ' + total.toLocaleString();
    }

    Object.values(sliders).forEach(function(s) { if (s) s.addEventListener('input', calculateSimulation); });
    calculateSimulation();

    // ── 초기 로드 ──
    // 서버에서 데이터 복원 → 자동 동기화 실행 → UI 렌더링
    fetch(`${API_BASE}/db/erp_accounting_db`)
        .then(r => r.json())
        .then(d => { if (d && Array.isArray(d) && d.length > 0) localStorage.setItem(DB_KEY, JSON.stringify(d)); })
        .catch(() => {})
        .finally(() => {
            // Phase A~C 자동 동기화 실행
            autoSyncRevenueToAccounting();
            autoSyncPayrollToAccounting();
            autoSyncFixedExpenses();

            // UI 렌더링
            renderCashbook();
            updateKPIs(loadData(), '');

            // 경영 대시보드 KPI 로드
            loadDashboardKPIs();
        });

    // ══════════════════════════════════════════════════════════
    // 5) AI 경영실적 분석 — 영구 캐시 우선 (월 1회 분석, 이후 캐시 재사용)
    // ══════════════════════════════════════════════════════════
    const AI_LOCAL_CACHE_KEY = 'erp_ai_analysis_cache';

    function loadLocalAiCache() {
        try { return JSON.parse(localStorage.getItem(AI_LOCAL_CACHE_KEY) || '{}'); } catch(e) { return {}; }
    }
    function saveLocalAiCache(month, result, timestamp) {
        const c = loadLocalAiCache();
        c[month] = { result, timestamp };
        localStorage.setItem(AI_LOCAL_CACHE_KEY, JSON.stringify(c));
    }

    // 월 선택 드롭다운 초기화
    (function initAiMonthSelector() {
        const select = document.getElementById('aiAnalysisMonth');
        if (!select) return;
        const now = new Date();
        for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = label;
            select.appendChild(opt);
        }
    })();

    // 캐시된 분석 결과 표시 함수
    function displayAiResult(month, result, timestamp, fromCache) {
        const statusEl = document.getElementById('aiAnalysisStatus');
        const resultEl = document.getElementById('aiAnalysisResult');
        const guideEl = document.getElementById('aiAnalysisGuide');
        if (guideEl) guideEl.style.display = 'none';
        if (statusEl) statusEl.style.display = 'none';
        if (resultEl) resultEl.style.display = 'block';

        const [yyyy, mm] = month.split('-');
        const titleEl = document.getElementById('aiReportTitle');
        const tsEl = document.getElementById('aiReportTimestamp');
        const contentEl = document.getElementById('aiReportContent');

        if (titleEl) titleEl.textContent = `${yyyy}년 ${parseInt(mm)}월 AI 경영실적 분석 리포트`;
        if (tsEl) {
            const ts = new Date(timestamp);
            const cacheLabel = fromCache ? '📋 저장된 분석 결과' : '✨ 새로 생성됨';
            tsEl.textContent = `${cacheLabel} | 생성: ${ts.getFullYear()}.${ts.getMonth()+1}.${ts.getDate()} ${ts.getHours()}:${String(ts.getMinutes()).padStart(2,'0')}`;
        }
        if (contentEl) contentEl.textContent = result;

        // 로컬 캐시에도 저장
        saveLocalAiCache(month, result, timestamp);
    }

    // 월 변경 시 자동 캐시 로드
    const aiMonthSelect = document.getElementById('aiAnalysisMonth');
    if (aiMonthSelect) {
        aiMonthSelect.addEventListener('change', () => autoLoadAiCache(aiMonthSelect.value));
    }

    // 캐시 자동 로드 (탭 열릴 때 + 월 변경 시)
    async function autoLoadAiCache(month) {
        if (!month) return;
        const statusEl = document.getElementById('aiAnalysisStatus');
        const resultEl = document.getElementById('aiAnalysisResult');
        const guideEl = document.getElementById('aiAnalysisGuide');

        // 1단계: 로컬 캐시 먼저 확인 (즉시 표시)
        const localCache = loadLocalAiCache();
        if (localCache[month]) {
            displayAiResult(month, localCache[month].result, localCache[month].timestamp, true);
            return;
        }

        // 2단계: 서버 캐시 확인 (네트워크 요청, 토큰 소모 없음)
        try {
            const res = await fetch(`${API_BASE}/ai/cache/${month}`);
            const data = await res.json();
            if (data.success && data.cached) {
                displayAiResult(month, data.result, data.timestamp, true);
                return;
            }
        } catch(e) { console.log('[AI] 서버 캐시 조회 실패, 로컬만 사용'); }

        // 캐시 없음 → 가이드 표시
        if (guideEl) guideEl.style.display = 'block';
        if (resultEl) resultEl.style.display = 'none';
        if (statusEl) statusEl.style.display = 'none';
    }

    // AI 탭 열릴 때 자동 캐시 로드
    const aiTab = document.querySelector('.acc-tab[data-target="panelAiAnalysis"]');
    if (aiTab) {
        aiTab.addEventListener('click', () => {
            const month = aiMonthSelect ? aiMonthSelect.value : '';
            if (month) setTimeout(() => autoLoadAiCache(month), 100);
        });
    }

    // AI 분석 실행 버튼
    const btnRunAi = document.getElementById('btnRunAiAnalysis');
    if (btnRunAi) {
        if (!isAdmin) {
            // 마스터가 아닌 경우 버튼 숨김 (결과는 자동 로드됨)
            btnRunAi.style.display = 'none';
        } else {
            // 마스터: 실제 AI 분석 실행
            btnRunAi.addEventListener('click', async () => {
                const month = aiMonthSelect ? aiMonthSelect.value : '';
                if (!month) return alert('분석할 월을 선택하세요.');

                // 캐시 확인 → 있으면 재분석 여부 확인
                const localCache = loadLocalAiCache();
                if (localCache[month]) {
                    const ts = new Date(localCache[month].timestamp);
                    const dateStr = `${ts.getFullYear()}.${ts.getMonth()+1}.${ts.getDate()}`;
                    if (!confirm(`이미 ${dateStr}에 생성된 분석 결과가 있습니다.\n새로 분석하면 토큰이 소비됩니다.\n\n새로 분석하시겠습니까?`)) {
                        displayAiResult(month, localCache[month].result, localCache[month].timestamp, true);
                        return;
                    }
                }

                const statusEl = document.getElementById('aiAnalysisStatus');
                const resultEl = document.getElementById('aiAnalysisResult');
                const guideEl = document.getElementById('aiAnalysisGuide');
                if (guideEl) guideEl.style.display = 'none';
                if (resultEl) resultEl.style.display = 'none';
                if (statusEl) statusEl.style.display = 'block';
                btnRunAi.disabled = true;
                btnRunAi.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> AI 분석 중... (최대 2분)';

                try {
                    const allData = loadData();
                    const monthData = allData.filter(d => d.date && d.date.startsWith(month) && d.status !== 'draft');
                    let totalIncome = 0, totalExpense = 0;
                    const incomeCats = {}, expenseCats = {};
                    monthData.forEach(d => {
                        const cat = d.category || '기타';
                        if (d.type === 'income') { totalIncome += (d.amount||0); incomeCats[cat] = (incomeCats[cat]||0) + (d.amount||0); }
                        else { totalExpense += (d.amount||0); expenseCats[cat] = (expenseCats[cat]||0) + (d.amount||0); }
                    });
                    const prevDate = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]) - 2, 1);
                    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth()+1).padStart(2,'0')}`;
                    const prevData = allData.filter(d => d.date && d.date.startsWith(prevMonth) && d.status !== 'draft');
                    let prevIncome = 0, prevExpense = 0;
                    prevData.forEach(d => { if (d.type === 'income') prevIncome += (d.amount||0); else prevExpense += (d.amount||0); });
                    let cashBalance = 0;
                    [...allData].filter(d => d.status !== 'draft').sort((a,b) => (a.date||'').localeCompare(b.date||'')).forEach(d => { cashBalance += d.type === 'income' ? (d.amount||0) : -(d.amount||0); });
                    let spaRevenue = 0, hotelRevenue = 0;
                    try { const revDb = JSON.parse(localStorage.getItem('erp_revenue_db') || '{}'); Object.keys(revDb).forEach(dk => { if (dk.startsWith(month)) { const r = revDb[dk]; spaRevenue += ((r.spaTickRev||0)+(r.spaFbRev||0))*10000; hotelRevenue += ((r.hotelRoomRev||0)+(r.hotelFbRev||0))*10000; } }); } catch(e) {}

                    const [yyyy, mm] = month.split('-');
                    const prompt = `당신은 전라북도 진안군에 위치한 "홍삼한방타운" (홍삼스파 + 홍삼빌호텔)의 전담 AI CFO입니다.\n${yyyy}년 ${parseInt(mm)}월 경영실적을 심층 분석해주세요.\n\n═══ 경영 데이터 ═══\n[매출] 총 수입: ${totalIncome.toLocaleString()}원, 전월: ${prevIncome.toLocaleString()}원, 증감: ${(totalIncome-prevIncome).toLocaleString()}원\n수입별: ${Object.entries(incomeCats).map(([k,v])=>`${k}: ${v.toLocaleString()}원`).join(', ')}\n스파: ${spaRevenue.toLocaleString()}원, 호텔: ${hotelRevenue.toLocaleString()}원\n[비용] 총 지출: ${totalExpense.toLocaleString()}원, 전월: ${prevExpense.toLocaleString()}원\n비용별: ${Object.entries(expenseCats).map(([k,v])=>`${k}: ${v.toLocaleString()}원(${(v/totalExpense*100).toFixed(1)}%)`).join(', ')}\n[현금흐름] 영업이익: ${(totalIncome-totalExpense).toLocaleString()}원, 이익률: ${totalIncome>0?((totalIncome-totalExpense)/totalIncome*100).toFixed(1):0}%, 현금잔액: ${cashBalance.toLocaleString()}원\n\n분석 항목: 1.경영요약 2.매출구조 3.비용효율성 4.현금흐름 5.전월대비 6.CEO 액션아이템\n한국어, 이모지 활용, 섹션 번호 매겨주세요.`;

                    const response = await fetch(`${API_BASE}/ai/analyze`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt, month, forceRefresh: !!localCache[month] })
                    });
                    const data = await response.json();
                    if (!data.success) throw new Error(data.error || 'AI 분석 실패');

                    displayAiResult(month, data.result, data.timestamp, data.cached);
                    if (!data.cached) showToast('AI 분석이 완료되어 영구 저장되었습니다.');

                } catch (error) {
                    console.error('AI Analysis Error:', error);
                    if (statusEl) statusEl.style.display = 'none';
                    if (guideEl) guideEl.style.display = 'block';
                    alert('AI 분석 오류: ' + error.message);
                } finally {
                    btnRunAi.disabled = false;
                    btnRunAi.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> AI 분석 실행';
                }
            });
        }
    }

});

