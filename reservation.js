// ═══════════════════════════════════════════════════════════════
// 홍삼한방타운 ERP — 예약/대관 관리 모듈 (reservation.js v1)
// CRUD + FullCalendar + 상태관리 + 역할기반 권한제어
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

    const DB_KEY = 'erp_reservations';
    let calendar = null;
    let editingId = null;

    // ── 역할 기반 권한 ──
    const currentUser = localStorage.getItem('currentUser') || '';
    const empNum = parseInt(currentUser, 10);
    const isAdmin = currentUser === '001';
    // 팀장급(010~019) 이상만 편집 가능
    const canEdit = isAdmin || (empNum >= 1 && empNum <= 19);
    // 크루는 접근 자체가 app.js에서 차단되지만, 2중 방어
    const canView = isAdmin || (empNum >= 1 && empNum <= 19);

    // Admin 전용 요소 숨기기
    if (!canEdit) {
        document.querySelectorAll('.rsv-admin-only').forEach(el => el.style.display = 'none');
    }

    // ── 유틸리티 ──
    function escapeHtml(s) {
        if (!s) return '';
        return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
    function formatDate(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
    }
    function showToast(msg) {
        const t = document.getElementById('rsvToast');
        if (!t) return;
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 2500);
    }

    // ── DB 로드/저장 ──
    function loadReservations() {
        try {
            const raw = localStorage.getItem(DB_KEY);
            if (raw) { const arr = JSON.parse(raw); if (arr.length) return arr; }
        } catch {}
        const seed = getDefaultData();
        saveReservations(seed);
        return seed;
    }
    function saveReservations(data) {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
    }

    // ── 시드 데이터 ──
    function getDefaultData() {
        return [
            {
                id: 1, type: 'travel', title: '하나투어 진안 힐링패키지 단체',
                client: '하나투어 전주지점', contact: '김여행 (010-1234-5678)',
                startDate: '2026-05-15', endDate: '2026-05-15',
                venue: '루프탑 + 2층 스파', people: 45,
                status: 'confirmed', revenue: 2250000,
                memo: '버스 2대, 점심 식사 포함. VIP 룸 3개 배정.',
                createdBy: '001', createdAt: '2026-05-01'
            },
            {
                id: 2, type: 'venue', title: '진안군청 직원 워크숍 대관',
                client: '진안군청 총무과', contact: '박민수 과장 (063-430-2000)',
                startDate: '2026-05-20', endDate: '2026-05-20',
                venue: '루프탑 전체', people: 80,
                status: 'paid', revenue: 4000000,
                memo: '빔프로젝터, 마이크 세팅. 오전 10시~오후 5시.',
                createdBy: '001', createdAt: '2026-05-03'
            },
            {
                id: 3, type: 'vip', title: '일본 바이어 VIP 의전',
                client: '다나카 무역상사', contact: '사토 타케시 (통역: 이수진 010-9876-5432)',
                startDate: '2026-05-22', endDate: '2026-05-23',
                venue: '1층 일본식정원 + VIP룸', people: 6,
                status: 'inquiry', revenue: 1500000,
                memo: '일본어 의전 필요. 차량 공항픽업. 석식 코스 준비.',
                createdBy: '001', createdAt: '2026-05-05'
            },
            {
                id: 4, type: 'group', title: '전북대 동아리 MT',
                client: '전북대 온천동아리', contact: '최대학 (010-5555-3333)',
                startDate: '2026-05-25', endDate: '2026-05-26',
                venue: '2층 스파 + 루프탑', people: 30,
                status: 'confirmed', revenue: 1200000,
                memo: '학생 단체할인 적용 (20%). 야간 이용 포함.',
                createdBy: '001', createdAt: '2026-05-07'
            },
            {
                id: 5, type: 'travel', title: '모두투어 효도관광 패키지',
                client: '모두투어', contact: '서영업 (02-1234-5678)',
                startDate: '2026-06-01', endDate: '2026-06-01',
                venue: '전층 이용', people: 60,
                status: 'inquiry', revenue: 3600000,
                memo: '어르신 단체. 리프트/엘리베이터 안내 필수. 점심+간식 포함.',
                createdBy: '001', createdAt: '2026-05-10'
            },
            {
                id: 6, type: 'private', title: '김부장 은퇴 기념 파티',
                client: '홍삼한방타운 지원팀', contact: '김지원 (내선 101)',
                startDate: '2026-05-18', endDate: '2026-05-18',
                venue: '루프탑 이벤트홀', people: 25,
                status: 'completed', revenue: 500000,
                memo: '케이크, 꽃다발, 현수막 준비 완료.',
                createdBy: '001', createdAt: '2026-04-25'
            }
        ];
    }

    // ── 타입/상태 라벨 ──
    const typeLabels = { travel: '여행사/단체', venue: '시설대관', vip: 'VIP 의전', group: '일반단체', private: '사내행사' };
    const statusLabels = { inquiry: '문의접수', confirmed: '예약확정', paid: '입금완료', completed: '이용완료', cancelled: '예약취소' };
    const typeColors = { travel: '#10B981', venue: '#3B82F6', vip: '#8B5CF6', group: '#F97316', private: '#EC4899' };

    // ══════════════════════════════════════════
    //  KPI 업데이트
    // ══════════════════════════════════════════
    function updateKpi() {
        const data = loadReservations();
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        const weekEnd = new Date(now); weekEnd.setDate(now.getDate() + 7);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const todayCount = data.filter(r => r.startDate === today && r.status !== 'cancelled').length;
        const weekCount = data.filter(r => {
            const d = new Date(r.startDate);
            return d >= now && d <= weekEnd && r.status !== 'cancelled';
        }).length;
        const monthRev = data.filter(r => {
            const d = new Date(r.startDate);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && r.status !== 'cancelled';
        }).reduce((s, r) => s + (r.revenue || 0), 0);
        const activeVenues = [...new Set(data.filter(r => {
            const d = new Date(r.startDate);
            return d >= now && r.status !== 'cancelled' && r.status !== 'completed';
        }).map(r => r.venue))].length;

        const el = id => document.getElementById(id);
        if (el('kpiToday')) el('kpiToday').textContent = todayCount + '건';
        if (el('kpiWeek')) el('kpiWeek').textContent = weekCount + '건';
        if (el('kpiMonthRev')) el('kpiMonthRev').textContent = monthRev > 0 ? (monthRev / 10000).toFixed(0) + '만원' : '0원';
        if (el('kpiVenue')) el('kpiVenue').textContent = activeVenues + '개';
    }

    // ══════════════════════════════════════════
    //  캘린더 렌더링
    // ══════════════════════════════════════════
    function initCalendar() {
        const calendarEl = document.getElementById('rsvCalendar');
        if (!calendarEl) return;

        const data = loadReservations();
        const events = data.filter(r => r.status !== 'cancelled').map(r => ({
            id: String(r.id),
            title: `${r.title} (${r.people}명)`,
            start: r.startDate,
            end: r.endDate ? new Date(new Date(r.endDate).getTime() + 86400000).toISOString().split('T')[0] : undefined,
            backgroundColor: typeColors[r.type] || '#6B7280',
            borderColor: 'transparent',
            extendedProps: { reservationId: r.id }
        }));

        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'ko',
            headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,listWeek' },
            events: events,
            eventClick: function(info) {
                const id = parseInt(info.event.id);
                openViewModal(id);
            },
            dateClick: function(info) {
                if (!canEdit) return;
                openNewModal(info.dateStr);
            },
            height: 'auto',
            dayMaxEvents: 3,
            buttonText: { today: '오늘', month: '월', list: '목록' }
        });
        calendar.render();
    }

    // ══════════════════════════════════════════
    //  테이블 렌더링
    // ══════════════════════════════════════════
    function renderTable() {
        const tbody = document.getElementById('rsvTableBody');
        if (!tbody) return;

        let data = loadReservations();

        // 필터
        const filterType = document.getElementById('filterType');
        const filterStatus = document.getElementById('filterStatus');
        const searchInput = document.getElementById('rsvSearch');

        if (filterType && filterType.value !== 'all') {
            data = data.filter(r => r.type === filterType.value);
        }
        if (filterStatus && filterStatus.value !== 'all') {
            data = data.filter(r => r.status === filterStatus.value);
        }
        if (searchInput && searchInput.value.trim()) {
            const kw = searchInput.value.trim().toLowerCase();
            data = data.filter(r =>
                r.title.toLowerCase().includes(kw) ||
                r.client.toLowerCase().includes(kw) ||
                (r.venue || '').toLowerCase().includes(kw)
            );
        }

        // 날짜순 정렬
        data.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

        if (!data.length) {
            tbody.innerHTML = `<tr><td colspan="8" class="rsv-empty"><i class="fa-regular fa-calendar-xmark"></i>예약 데이터가 없습니다.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(r => `
            <tr style="cursor:pointer;" data-id="${r.id}">
                <td><span class="rsv-type ${r.type}">${typeLabels[r.type] || r.type}</span></td>
                <td><strong>${escapeHtml(r.title)}</strong></td>
                <td>${escapeHtml(r.client)}</td>
                <td class="text-center">${formatDate(r.startDate)}${r.endDate && r.endDate !== r.startDate ? ' ~ ' + formatDate(r.endDate) : ''}</td>
                <td class="text-center">${escapeHtml(r.venue || '-')}</td>
                <td class="text-center">${r.people || '-'}명</td>
                <td class="text-center"><span class="rsv-status ${r.status}">${statusLabels[r.status] || r.status}</span></td>
                <td class="text-center" style="font-weight:700; color:#10B981;">${r.revenue ? (r.revenue / 10000).toFixed(0) + '만' : '-'}</td>
            </tr>
        `).join('');

        // 행 클릭
        tbody.querySelectorAll('tr[data-id]').forEach(row => {
            row.addEventListener('click', () => openViewModal(parseInt(row.dataset.id)));
        });
    }

    // ══════════════════════════════════════════
    //  상세 보기 모달
    // ══════════════════════════════════════════
    function openViewModal(id) {
        const data = loadReservations();
        const r = data.find(d => d.id === id);
        if (!r) return;

        document.getElementById('viewTitle').textContent = r.title;
        document.getElementById('viewType').innerHTML = `<span class="rsv-type ${r.type}">${typeLabels[r.type]}</span>`;
        document.getElementById('viewClient').textContent = r.client;
        document.getElementById('viewContact').textContent = r.contact || '-';
        document.getElementById('viewDate').textContent = formatDate(r.startDate) + (r.endDate && r.endDate !== r.startDate ? ' ~ ' + formatDate(r.endDate) : '');
        document.getElementById('viewVenue').textContent = r.venue || '-';
        document.getElementById('viewPeople').textContent = (r.people || '-') + '명';
        document.getElementById('viewStatus').innerHTML = `<span class="rsv-status ${r.status}">${statusLabels[r.status]}</span>`;
        document.getElementById('viewRevenue').textContent = r.revenue ? r.revenue.toLocaleString() + '원' : '-';
        document.getElementById('viewMemo').textContent = r.memo || '없음';

        // 편집/삭제 버튼
        const editBtn = document.getElementById('btnEditRsv');
        const deleteBtn = document.getElementById('btnDeleteRsv');
        if (editBtn) editBtn.style.display = canEdit ? '' : 'none';
        if (deleteBtn) deleteBtn.style.display = canEdit ? '' : 'none';

        // 이벤트 바인딩
        if (editBtn) {
            editBtn.onclick = () => {
                closeModal('viewModal');
                openEditModal(id);
            };
        }
        if (deleteBtn) {
            deleteBtn.onclick = () => {
                if (!confirm('이 예약을 삭제하시겠습니까?')) return;
                let reservations = loadReservations();
                reservations = reservations.filter(d => d.id !== id);
                saveReservations(reservations);
                closeModal('viewModal');
                refreshAll();
                showToast('예약이 삭제되었습니다.');
            };
        }

        openModal('viewModal');
    }

    // ══════════════════════════════════════════
    //  신규 등록 모달
    // ══════════════════════════════════════════
    function openNewModal(dateStr) {
        editingId = null;
        document.getElementById('formModalTitle').innerHTML = '<i class="fa-solid fa-calendar-plus" style="color:#3B82F6;"></i> 새 예약 등록';
        resetForm();
        if (dateStr) document.getElementById('fStartDate').value = dateStr;
        document.getElementById('btnDeleteInForm').style.display = 'none';
        openModal('formModal');
    }

    function openEditModal(id) {
        const data = loadReservations();
        const r = data.find(d => d.id === id);
        if (!r) return;

        editingId = id;
        document.getElementById('formModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square" style="color:#F59E0B;"></i> 예약 수정';
        document.getElementById('fType').value = r.type;
        document.getElementById('fTitle').value = r.title;
        document.getElementById('fClient').value = r.client;
        document.getElementById('fContact').value = r.contact || '';
        document.getElementById('fStartDate').value = r.startDate;
        document.getElementById('fEndDate').value = r.endDate || '';
        document.getElementById('fVenue').value = r.venue || '';
        document.getElementById('fPeople').value = r.people || '';
        document.getElementById('fStatus').value = r.status;
        document.getElementById('fRevenue').value = r.revenue || '';
        document.getElementById('fMemo').value = r.memo || '';
        document.getElementById('btnDeleteInForm').style.display = '';
        openModal('formModal');
    }

    function resetForm() {
        ['fType','fTitle','fClient','fContact','fStartDate','fEndDate','fVenue','fPeople','fStatus','fRevenue','fMemo'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = el.tagName === 'SELECT' ? el.options[0].value : '';
        });
    }

    // ── 저장 ──
    document.getElementById('btnSaveRsv').addEventListener('click', () => {
        const title = document.getElementById('fTitle').value.trim();
        const client = document.getElementById('fClient').value.trim();
        const startDate = document.getElementById('fStartDate').value;

        if (!title) { alert('예약 제목을 입력해주세요.'); return; }
        if (!client) { alert('고객/기관명을 입력해주세요.'); return; }
        if (!startDate) { alert('시작 날짜를 선택해주세요.'); return; }

        const data = loadReservations();

        const entry = {
            type: document.getElementById('fType').value,
            title: title,
            client: client,
            contact: document.getElementById('fContact').value.trim(),
            startDate: startDate,
            endDate: document.getElementById('fEndDate').value || startDate,
            venue: document.getElementById('fVenue').value.trim(),
            people: parseInt(document.getElementById('fPeople').value) || 0,
            status: document.getElementById('fStatus').value,
            revenue: parseInt(document.getElementById('fRevenue').value) || 0,
            memo: document.getElementById('fMemo').value.trim()
        };

        if (editingId) {
            const idx = data.findIndex(d => d.id === editingId);
            if (idx !== -1) { Object.assign(data[idx], entry); }
            showToast('예약이 수정되었습니다.');
        } else {
            const maxId = data.reduce((m, d) => Math.max(m, d.id), 0);
            data.push({
                ...entry,
                id: maxId + 1,
                createdBy: currentUser,
                createdAt: new Date().toISOString().split('T')[0]
            });
            showToast('새 예약이 등록되었습니다.');
        }

        saveReservations(data);
        closeModal('formModal');
        refreshAll();
    });

    // ── 폼 내 삭제 ──
    document.getElementById('btnDeleteInForm').addEventListener('click', () => {
        if (!editingId) return;
        if (!confirm('이 예약을 삭제하시겠습니까?')) return;
        let data = loadReservations();
        data = data.filter(d => d.id !== editingId);
        saveReservations(data);
        closeModal('formModal');
        refreshAll();
        showToast('예약이 삭제되었습니다.');
    });

    // ── 모달 제어 ──
    function openModal(id) { document.getElementById(id).classList.add('show'); }
    function closeModal(id) { document.getElementById(id).classList.remove('show'); }

    // 닫기 버튼 바인딩
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
    });
    // 오버레이 클릭 닫기
    document.querySelectorAll('.rsv-modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal(overlay.id);
        });
    });

    // ── 신규 등록 버튼 ──
    const btnNew = document.getElementById('btnNewRsv');
    if (btnNew) {
        btnNew.addEventListener('click', () => openNewModal(new Date().toISOString().split('T')[0]));
    }

    // ── 필터 이벤트 ──
    ['filterType', 'filterStatus'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', renderTable);
    });
    const searchInput = document.getElementById('rsvSearch');
    if (searchInput) {
        let timer;
        searchInput.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(renderTable, 300);
        });
    }

    // ── 전체 갱신 ──
    function refreshAll() {
        updateKpi();
        renderTable();
        if (calendar) {
            // 캘린더 이벤트 갱신
            calendar.removeAllEvents();
            const data = loadReservations();
            data.filter(r => r.status !== 'cancelled').forEach(r => {
                calendar.addEvent({
                    id: String(r.id),
                    title: `${r.title} (${r.people}명)`,
                    start: r.startDate,
                    end: r.endDate ? new Date(new Date(r.endDate).getTime() + 86400000).toISOString().split('T')[0] : undefined,
                    backgroundColor: typeColors[r.type] || '#6B7280',
                    borderColor: 'transparent',
                    extendedProps: { reservationId: r.id }
                });
            });
        }
    }

    // ── 초기 렌더링 ──
    updateKpi();
    initCalendar();
    renderTable();
});
