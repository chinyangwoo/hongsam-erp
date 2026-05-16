// 홍삼한방타운 ERP — 시설현황 모듈 (facility.js v2)
// 타임라인 기반 유지보수 대장 + 실시간 센서 시뮬레이터
document.addEventListener('DOMContentLoaded', () => {

    // ═══════════════════════════════════════════════
    // 1. Site Toggle (스파 / 호텔 / 전체)
    // ═══════════════════════════════════════════════
    const siteBtns = document.querySelectorAll('.site-btn');
    const facilitySections = document.querySelectorAll('.facility-section');

    siteBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            siteBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const site = btn.dataset.site;

            facilitySections.forEach(sec => {
                if (site === 'all') {
                    sec.style.display = '';
                } else {
                    sec.style.display = sec.dataset.site === site ? '' : 'none';
                }
            });
        });
    });

    // ═══════════════════════════════════════════════
    // 2. Sensor Simulator (3~5초 간격 랜덤 변동)
    // ═══════════════════════════════════════════════
    function randomFluctuation(base, range, decimals = 1) {
        return (base + (Math.random() - 0.5) * range).toFixed(decimals);
    }

    function updateSensors() {
        const $ = id => document.getElementById(id);
        if ($('snsBoilerTemp')) $('snsBoilerTemp').innerHTML = `${randomFluctuation(85, 4)} <small>℃</small>`;
        if ($('snsBoilerLpg')) $('snsBoilerLpg').innerHTML = `${randomFluctuation(12.5, 3)} <small>kg</small>`;
        if ($('snsElec1F')) $('snsElec1F').innerHTML = `${randomFluctuation(42, 8)} <small>kW</small>`;
        if ($('snsElec2F')) $('snsElec2F').innerHTML = `${randomFluctuation(88, 15)} <small>kW</small>`;
        if ($('snsElecRF')) $('snsElecRF').innerHTML = `${randomFluctuation(57, 10)} <small>kW</small>`;
        if ($('snsTotalKwh')) $('snsTotalKwh').textContent = Math.floor(1200 + Math.random() * 100).toLocaleString();
        if ($('snsSpa1')) $('snsSpa1').innerHTML = `${randomFluctuation(40.5, 2)} <small>℃</small>`;
        if ($('snsSpa2')) $('snsSpa2').innerHTML = `${randomFluctuation(38.2, 2)} <small>℃</small>`;
        if ($('snsPool')) $('snsPool').innerHTML = `${randomFluctuation(32.8, 3)} <small>℃</small>`;
        if ($('snsSauna')) $('snsSauna').innerHTML = `${randomFluctuation(82, 5)} <small>℃</small>`;
    }

    updateSensors();
    setInterval(updateSensors, 4000);

    // ═══════════════════════════════════════════════
    // 3. 유지보수 대장 데이터 (localStorage + 초기 샘플)
    // ═══════════════════════════════════════════════
    const LEDGER_KEY = 'erp_facility_ledger';

    const SAMPLE_DATA = [
        {
            id: 1,
            facility: '루프탑 인피니티풀 순환모터',
            site: 'spa',
            status: 'inprogress',
            occurredAt: '2026-05-14T09:30',
            reporter: '운영팀 이수진',
            description: '모터 베어링 파손 의심. 이상 소음 발생. 예비 모터로 임시 가동 중.',
            handler: '한일모터스 (외주)',
            handlerType: 'external',
            action: '모터 베어링 교체 및 축 정렬 작업 진행 중',
            completedAt: null,
            cost: 450000,
        },
        {
            id: 2,
            facility: '3층 302호 에어컨',
            site: 'hotel',
            status: 'pending',
            occurredAt: '2026-05-15T14:20',
            reporter: '메이드팀 김수연',
            description: '냉방 효율 저하. 냉매 보충 및 필터 청소 요망.',
            handler: '',
            handlerType: '',
            action: '',
            completedAt: null,
            cost: 0,
        },
        {
            id: 3,
            facility: '1층 프런트 우측 조명',
            site: 'spa',
            status: 'pending',
            occurredAt: '2026-05-16T08:10',
            reporter: '운영팀 프런트',
            description: 'LED 다운라이트(주백색) 1개 점등 불량. 교체 요망.',
            handler: '',
            handlerType: '',
            action: '',
            completedAt: null,
            cost: 0,
        },
        {
            id: 4,
            facility: '2층 남탕 샤워기 3번',
            site: 'spa',
            status: 'resolved',
            occurredAt: '2026-05-10T11:00',
            reporter: '공무팀 박종수',
            description: '수압 약함. 헤드 내부 스케일 축적.',
            handler: '공무팀 김민규',
            handlerType: 'internal',
            action: '샤워기 헤드 내부 스케일 제거 및 고무패킹 교체 완료.',
            completedAt: '2026-05-10T15:30',
            cost: 12000,
        },
        {
            id: 5,
            facility: '보일러실 2번 버너',
            site: 'spa',
            status: 'resolved',
            occurredAt: '2026-05-08T06:45',
            reporter: '공무팀 박종수',
            description: '점화 불량. 점화 플러그 및 노즐 점검 필요.',
            handler: '(주)진안보일러',
            handlerType: 'external',
            action: '점화 플러그 교체, 노즐 청소 후 정상 가동 확인.',
            completedAt: '2026-05-08T14:00',
            cost: 180000,
        },
        {
            id: 6,
            facility: '2층 여탕 탈의실 도어록',
            site: 'spa',
            status: 'resolved',
            occurredAt: '2026-05-06T10:15',
            reporter: '운영팀 이수진',
            description: '디지털 도어록 비밀번호 입력 패드 간헐적 미작동.',
            handler: '공무팀 김민규',
            handlerType: 'internal',
            action: '배터리 교체 및 패드 접촉 불량 수리. 정상 작동 확인.',
            completedAt: '2026-05-06T11:30',
            cost: 8000,
        },
        {
            id: 7,
            facility: '5층 501호 화장실 변기',
            site: 'hotel',
            status: 'resolved',
            occurredAt: '2026-05-12T16:40',
            reporter: '메이드팀 박서윤',
            description: '물이 계속 흐르는 현상 (플러시 밸브 이상).',
            handler: '공무팀 박종수',
            handlerType: 'internal',
            action: '플러시 밸브 고무 플래퍼 교체. 누수 해소 확인.',
            completedAt: '2026-05-12T18:10',
            cost: 5000,
        },
    ];

    function loadLedger() {
        try {
            const saved = localStorage.getItem(LEDGER_KEY);
            if (saved) return JSON.parse(saved);
        } catch(e) { /* ignore */ }
        // 초기 세팅
        localStorage.setItem(LEDGER_KEY, JSON.stringify(SAMPLE_DATA));
        return SAMPLE_DATA;
    }

    function saveLedger(data) {
        localStorage.setItem(LEDGER_KEY, JSON.stringify(data));
    }

    let ledgerData = loadLedger();

    // ═══════════════════════════════════════════════
    // 4. 필터 & 렌더링
    // ═══════════════════════════════════════════════
    let currentFilter = 'all';
    const tableBody = document.getElementById('ledgerTableBody');
    const filterBtns = document.querySelectorAll('.ledger-filter-btn');

    // 필터 버튼 이벤트
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderLedger();
        });
    });

    function formatDateTime(dtStr) {
        if (!dtStr) return { date: '-', time: '' };
        const d = new Date(dtStr);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        return { date: `${mm}.${dd}`, time: `${hh}:${mi}` };
    }

    function calcElapsed(start, end) {
        if (!start || !end) return { text: '-', cls: '' };
        const diff = new Date(end) - new Date(start);
        if (diff < 0) return { text: '-', cls: '' };
        const totalMin = Math.floor(diff / 60000);
        const hours = Math.floor(totalMin / 60);
        const mins = totalMin % 60;
        let cls = 'fast';
        if (hours >= 24) cls = 'slow';
        else if (hours >= 4) cls = 'moderate';

        if (hours >= 24) {
            const days = Math.floor(hours / 24);
            const remHrs = hours % 24;
            return { text: `${days}일 ${remHrs}h`, cls };
        }
        return { text: `${hours}h ${mins}m`, cls };
    }

    function getStatusTag(status) {
        const map = {
            pending:     { label: '접수대기', cls: 'st-pending',     icon: 'fa-clock' },
            inprogress:  { label: '수리중',   cls: 'st-inprogress',  icon: 'fa-wrench' },
            resolved:    { label: '수리완료', cls: 'st-resolved',    icon: 'fa-check' },
        };
        const s = map[status] || map.pending;
        return `<span class="ld-status-tag ${s.cls}"><i class="fa-solid ${s.icon}"></i> ${s.label}</span>`;
    }

    function updateFilterCounts() {
        const counts = { all: ledgerData.length, pending: 0, inprogress: 0, resolved: 0 };
        ledgerData.forEach(d => { if (counts[d.status] !== undefined) counts[d.status]++; });
        const el = id => document.getElementById(id);
        if (el('cntAll')) el('cntAll').textContent = counts.all;
        if (el('cntPending')) el('cntPending').textContent = counts.pending;
        if (el('cntInprogress')) el('cntInprogress').textContent = counts.inprogress;
        if (el('cntResolved')) el('cntResolved').textContent = counts.resolved;
    }

    function renderLedger() {
        if (!tableBody) return;

        updateFilterCounts();

        let data = [...ledgerData];
        if (currentFilter !== 'all') {
            data = data.filter(d => d.status === currentFilter);
        }

        // 시간 순서대로 정렬 (최신 발생 건이 맨 위)
        data.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));

        tableBody.innerHTML = '';

        if (data.length === 0) {
            tableBody.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-secondary); font-size:0.9rem;"><i class="fa-solid fa-check-double" style="font-size:1.5rem; margin-bottom:10px; display:block; opacity:0.3;"></i>해당 항목이 없습니다.</div>';
            return;
        }

        data.forEach(item => {
            const occ = formatDateTime(item.occurredAt);
            const comp = formatDateTime(item.completedAt);
            const elapsed = calcElapsed(item.occurredAt, item.completedAt);

            const row = document.createElement('div');
            row.className = `ledger-row ${item.status === 'resolved' ? 'row-resolved' : ''}`;
            row.innerHTML = `
                <div class="lt-col">${getStatusTag(item.status)}</div>
                <div class="lt-col ld-facility-cell">
                    <span class="ld-facility-name">${item.facility}</span>
                    <span class="ld-facility-site ${item.site}">${item.site === 'spa' ? '홍삼스파' : '홍삼빌호텔'}</span>
                </div>
                <div class="lt-col ld-time-cell">
                    <div class="ld-date">${occ.date}</div>
                    <div class="ld-clock">${occ.time}</div>
                </div>
                <div class="lt-col ld-handler-cell">
                    ${item.handler ? `<div>${item.handler}</div><div class="ld-handler-type">${item.handlerType === 'external' ? '외주업체' : '내부직원'}</div>` : '<span style="color:#64748B;">미배정</span>'}
                </div>
                <div class="lt-col ld-time-cell">
                    ${item.completedAt ? `<div class="ld-date">${comp.date}</div><div class="ld-clock">${comp.time}</div>` : '<span style="color:#64748B;">-</span>'}
                </div>
                <div class="lt-col ld-elapsed ${elapsed.cls}">${elapsed.text}</div>
            `;

            // 클릭 → 상세 모달
            row.addEventListener('click', () => openDetail(item));
            tableBody.appendChild(row);
        });
    }

    // ═══════════════════════════════════════════════
    // 5. 상세 보기 모달
    // ═══════════════════════════════════════════════
    const detailModal = document.getElementById('ledgerDetailModal');
    const closeDetail = document.getElementById('closeLdDetail');
    const closeDetailBtn = document.getElementById('closeLdDetailBtn');
    const detailBody = document.getElementById('ldModalBody');
    const detailFooter = document.getElementById('ldModalFooter');

    function hideDetailModal() { if (detailModal) detailModal.classList.remove('show'); }
    if (closeDetail) closeDetail.addEventListener('click', hideDetailModal);
    if (closeDetailBtn) closeDetailBtn.addEventListener('click', hideDetailModal);
    if (detailModal) detailModal.addEventListener('click', e => { if (e.target === detailModal) hideDetailModal(); });

    function openDetail(item) {
        if (!detailModal || !detailBody) return;

        const occ = formatDateTime(item.occurredAt);
        const comp = formatDateTime(item.completedAt);
        const elapsed = calcElapsed(item.occurredAt, item.completedAt);
        const costFmt = item.cost > 0 ? '₩ ' + item.cost.toLocaleString() : '-';

        detailBody.innerHTML = `
            <div style="margin-bottom:20px;">${getStatusTag(item.status)}</div>
            <div class="ld-detail-grid">
                <div class="ld-detail-item full-width">
                    <div class="ld-di-label"><i class="fa-solid fa-tools" style="margin-right:4px;"></i> 오작동 시설명칭</div>
                    <div class="ld-di-value" style="font-size:1.1rem;">${item.facility} <span class="ld-facility-site ${item.site}" style="margin-left:8px;">${item.site === 'spa' ? '홍삼스파' : '홍삼빌호텔'}</span></div>
                </div>
                <div class="ld-detail-item">
                    <div class="ld-di-label"><i class="fa-regular fa-clock" style="margin-right:4px;"></i> 발생 일시</div>
                    <div class="ld-di-value">${item.occurredAt ? item.occurredAt.replace('T', ' ') : '-'}</div>
                </div>
                <div class="ld-detail-item">
                    <div class="ld-di-label"><i class="fa-solid fa-user" style="margin-right:4px;"></i> 신고자</div>
                    <div class="ld-di-value">${item.reporter || '-'}</div>
                </div>
                <div class="ld-detail-item full-width">
                    <div class="ld-di-label"><i class="fa-solid fa-stethoscope" style="margin-right:4px;"></i> 증상 및 내용</div>
                    <div class="ld-di-value" style="font-weight:400; font-size:0.92rem;">${item.description || '-'}</div>
                </div>
                <div class="ld-detail-item">
                    <div class="ld-di-label"><i class="fa-solid fa-wrench" style="margin-right:4px;"></i> 조치 담당자/업체</div>
                    <div class="ld-di-value">${item.handler || '<span style="color:#F59E0B;">미배정</span>'} ${item.handlerType === 'external' ? '<small style="color:#64748B;">(외주)</small>' : item.handlerType === 'internal' ? '<small style="color:#64748B;">(내부)</small>' : ''}</div>
                </div>
                <div class="ld-detail-item">
                    <div class="ld-di-label"><i class="fa-solid fa-won-sign" style="margin-right:4px;"></i> 수리 비용</div>
                    <div class="ld-di-value">${costFmt}</div>
                </div>
                ${item.action ? `<div class="ld-detail-item full-width">
                    <div class="ld-di-label"><i class="fa-solid fa-clipboard-check" style="margin-right:4px;"></i> 조치 내용</div>
                    <div class="ld-di-value" style="font-weight:400; font-size:0.92rem;">${item.action}</div>
                </div>` : ''}
                <div class="ld-detail-item">
                    <div class="ld-di-label"><i class="fa-solid fa-flag-checkered" style="margin-right:4px;"></i> 복구완료 일시</div>
                    <div class="ld-di-value">${item.completedAt ? item.completedAt.replace('T', ' ') : '<span style="color:#F59E0B;">미완료</span>'}</div>
                </div>
                <div class="ld-detail-item">
                    <div class="ld-di-label"><i class="fa-solid fa-hourglass-half" style="margin-right:4px;"></i> 총 소요시간</div>
                    <div class="ld-di-value ld-elapsed ${elapsed.cls}" style="font-size:1.1rem;">${elapsed.text}</div>
                </div>
            </div>
        `;

        // 상태 변경 버튼
        detailFooter.innerHTML = '';
        if (item.status === 'pending') {
            const btnAssign = document.createElement('button');
            btnAssign.className = 'btn-primary';
            btnAssign.innerHTML = '<i class="fa-solid fa-wrench"></i> 수리 배정 (수리중 전환)';
            btnAssign.addEventListener('click', () => {
                const handler = prompt('조치 담당자/업체명을 입력하세요:');
                if (handler && handler.trim()) {
                    item.status = 'inprogress';
                    item.handler = handler.trim();
                    item.handlerType = handler.includes('(') || handler.includes('주') || handler.includes('업체') ? 'external' : 'internal';
                    saveLedger(ledgerData);
                    renderLedger();
                    hideDetailModal();
                }
            });
            detailFooter.appendChild(btnAssign);
        } else if (item.status === 'inprogress') {
            const btnComplete = document.createElement('button');
            btnComplete.className = 'btn-primary';
            btnComplete.style.background = 'linear-gradient(135deg, #10B981, #059669)';
            btnComplete.innerHTML = '<i class="fa-solid fa-check"></i> 수리완료 처리';
            btnComplete.addEventListener('click', () => {
                const action = prompt('조치 내용을 간략히 입력하세요:', item.action || '');
                if (action !== null) {
                    const costStr = prompt('수리 비용 (원, 숫자만):', item.cost || '0');
                    item.status = 'resolved';
                    item.action = action;
                    item.completedAt = new Date().toISOString().slice(0, 16);
                    item.cost = parseInt(costStr) || 0;
                    saveLedger(ledgerData);
                    renderLedger();
                    hideDetailModal();
                }
            });
            detailFooter.appendChild(btnComplete);
        }

        const btnClose = document.createElement('button');
        btnClose.className = 'btn-secondary';
        btnClose.textContent = '닫기';
        btnClose.addEventListener('click', hideDetailModal);
        detailFooter.appendChild(btnClose);

        detailModal.classList.add('show');
    }

    // ═══════════════════════════════════════════════
    // 6. 신규 등록 모달
    // ═══════════════════════════════════════════════
    const newModal = document.getElementById('ledgerNewModal');
    const closeLdNew = document.getElementById('closeLdNew');
    const cancelLdNew = document.getElementById('cancelLdNew');
    const saveLdNew = document.getElementById('saveLdNew');
    const btnNewLedger = document.getElementById('btnNewLedger');

    function showNewModal() {
        if (newModal) {
            // 현재 시간 기본값 설정
            const now = new Date();
            const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            const el = document.getElementById('newLdOccurred');
            if (el) el.value = local;
            newModal.classList.add('show');
        }
    }
    function hideNewModal() { if (newModal) newModal.classList.remove('show'); }

    if (btnNewLedger) btnNewLedger.addEventListener('click', showNewModal);
    if (closeLdNew) closeLdNew.addEventListener('click', hideNewModal);
    if (cancelLdNew) cancelLdNew.addEventListener('click', hideNewModal);
    if (newModal) newModal.addEventListener('click', e => { if (e.target === newModal) hideNewModal(); });

    if (saveLdNew) {
        saveLdNew.addEventListener('click', () => {
            const facility = document.getElementById('newLdFacility')?.value?.trim();
            const site = document.getElementById('newLdSite')?.value || 'spa';
            const occurred = document.getElementById('newLdOccurred')?.value;
            const reporter = document.getElementById('newLdReporter')?.value?.trim();
            const desc = document.getElementById('newLdDesc')?.value?.trim();

            if (!facility) { alert('시설명칭을 입력해 주세요.'); return; }
            if (!occurred) { alert('발생 일시를 입력해 주세요.'); return; }

            const newItem = {
                id: Date.now(),
                facility,
                site,
                status: 'pending',
                occurredAt: occurred,
                reporter: reporter || '-',
                description: desc || '',
                handler: '',
                handlerType: '',
                action: '',
                completedAt: null,
                cost: 0,
            };

            ledgerData.push(newItem);
            saveLedger(ledgerData);
            renderLedger();
            hideNewModal();

            // 폼 초기화
            if (document.getElementById('newLdFacility')) document.getElementById('newLdFacility').value = '';
            if (document.getElementById('newLdReporter')) document.getElementById('newLdReporter').value = '';
            if (document.getElementById('newLdDesc')) document.getElementById('newLdDesc').value = '';

            alert(`"${facility}" 고장 건이 접수대기로 등록되었습니다.`);
        });
    }

    // ═══════════════════════════════════════════════
    // 초기 렌더링
    // ═══════════════════════════════════════════════
    renderLedger();
});
