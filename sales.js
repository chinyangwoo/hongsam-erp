// ═══════════════════════════════════════════════════════════════
// 홍삼한방타운 ERP — 영업관리 모듈 (sales.js v4)
// 통합 매출 대시보드: 홍삼빌호텔 + 홍삼스파
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

    // ── 날짜 헬퍼 ──
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth(); // 0-based
    const d = today.getDate();
    const mStr = String(m + 1).padStart(2, '0');

    // ══════════════════════════════════════════
    // 1. 미니 캘린더 렌더링 (호텔/스파)
    // ══════════════════════════════════════════
    function generateMiniCalendar(containerId, data, unit) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const firstDay = new Date(y, m, 1).getDay(); // 0=Sun

        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        let html = '';

        // Header row
        dayNames.forEach((dn, i) => {
            let cls = 'day-head';
            if (i === 0) cls += ' sun';
            if (i === 6) cls += ' sat';
            html += `<div class="${cls}">${dn}</div>`;
        });

        // Empty cells before 1st
        for (let i = 0; i < firstDay; i++) {
            html += '<div class="day-cell empty"></div>';
        }

        // Day cells
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = (day === d) ? ' today' : '';
            const val = (day <= d && data[day - 1] !== undefined) ? data[day - 1] : null;
            let revText = '';
            if (val !== null && val > 0) {
                if (unit === 'won') {
                    revText = val >= 100 ? Math.round(val) + '만' : val + '만';
                } else {
                    revText = val + '명';
                }
            }
            html += `
                <div class="day-cell${isToday}">
                    <div class="day-num">${day}</div>
                    ${revText ? `<div class="day-rev">${revText}</div>` : ''}
                </div>`;
        }

        container.innerHTML = html;
    }

    // 호텔 일별 매출 데이터 (만 원 단위, 최근 d일)
    const hotelDailyRevenue = [];
    for (let i = 1; i <= d; i++) {
        // 주말(금,토)은 매출 높고, 평일은 낮은 시뮬레이션
        const dow = new Date(y, m, i).getDay();
        const base = (dow === 5 || dow === 6) ? 450 : (dow === 0 ? 380 : 250);
        const variance = Math.floor(Math.random() * 80) - 40;
        hotelDailyRevenue.push(Math.max(120, base + variance));
    }

    // 스파 일별 입장객 수 데이터
    const spaDailyVisitors = [];
    for (let i = 1; i <= d; i++) {
        const dow = new Date(y, m, i).getDay();
        const base = (dow === 5 || dow === 6) ? 120 : (dow === 0 ? 95 : 65);
        const variance = Math.floor(Math.random() * 30) - 15;
        spaDailyVisitors.push(Math.max(30, base + variance));
    }

    generateMiniCalendar('hotelMiniCal', hotelDailyRevenue, 'won');
    generateMiniCalendar('spaMiniCal', spaDailyVisitors, 'person');

    // ══════════════════════════════════════════
    // 2. 30일 바 차트 렌더링
    // ══════════════════════════════════════════
    function generateBarChart(containerId, dataArray, color, unit) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const max = Math.max(...dataArray);
        let html = '';

        dataArray.forEach((val, i) => {
            const pct = max > 0 ? (val / max * 100) : 0;
            const dayNum = i + 1;
            let tooltip;
            if (unit === 'won') {
                tooltip = `${mStr}/${String(dayNum).padStart(2,'0')}: ${val}만원`;
            } else {
                tooltip = `${mStr}/${String(dayNum).padStart(2,'0')}: ${val}명`;
            }
            html += `<div class="bar" style="height:${Math.max(pct, 3)}%; background:${color};" data-tooltip="${tooltip}"></div>`;
        });

        container.innerHTML = html;
    }

    // 호텔 30일 매출 추이
    const hotel30Data = [];
    for (let i = 0; i < 30; i++) {
        const pastDate = new Date(y, m, d - 29 + i);
        const dow = pastDate.getDay();
        const base = (dow === 5 || dow === 6) ? 450 : (dow === 0 ? 380 : 250);
        hotel30Data.push(Math.max(100, base + Math.floor(Math.random() * 100) - 50));
    }

    // 스파 30일 매출 추이
    const spa30Data = [];
    for (let i = 0; i < 30; i++) {
        const pastDate = new Date(y, m, d - 29 + i);
        const dow = pastDate.getDay();
        const base = (dow === 5 || dow === 6) ? 200 : (dow === 0 ? 150 : 90);
        spa30Data.push(Math.max(40, base + Math.floor(Math.random() * 60) - 30));
    }

    generateBarChart('hotelBarChart', hotel30Data, 'linear-gradient(180deg, #F59E0B, #D97706)', 'won');
    generateBarChart('spaBarChart', spa30Data, 'linear-gradient(180deg, #3B82F6, #2563EB)', 'won');

    // ══════════════════════════════════════════
    // 3. NEW EVENT MODAL
    // ══════════════════════════════════════════
    const newEventModal = document.getElementById('newEventModal');
    const closeNewEventBtn = document.getElementById('closeNewEventBtn');
    const closeNewEventModalHeader = document.getElementById('closeNewEventModalHeader');
    const saveNewEventBtn = document.getElementById('saveNewEventBtn');
    const neDateInput = document.getElementById('neDate');
    const neTitleInput = document.getElementById('neTitle');
    const neTagInput = document.getElementById('neTag');
    let currentSelectedDate = '';

    function closeNewEvModal() {
        if (newEventModal) newEventModal.classList.remove('show');
    }
    window.openNewEventModal = function(dateStr) {
        currentSelectedDate = dateStr;
        if (neDateInput) neDateInput.value = dateStr;
        if (neTitleInput) { neTitleInput.value = ''; neTitleInput.focus(); }
        if (neTagInput) neTagInput.selectedIndex = 0;
        if (newEventModal) newEventModal.classList.add('show');
    };
    if (closeNewEventBtn) closeNewEventBtn.addEventListener('click', closeNewEvModal);
    if (closeNewEventModalHeader) closeNewEventModalHeader.addEventListener('click', closeNewEvModal);
    if (newEventModal) newEventModal.addEventListener('click', e => { if (e.target === newEventModal) closeNewEvModal(); });

    if (saveNewEventBtn) {
        saveNewEventBtn.addEventListener('click', () => {
            const title = neTitleInput ? neTitleInput.value.trim() : '';
            if (!title) { alert('일정 제목(내용)을 입력해주세요.'); return; }
            const bgColor = neTagInput ? neTagInput.value : '#10B981';
            let tagLabel = '기타 일정';
            if (bgColor === '#10B981') tagLabel = '여행사 단체';
            else if (bgColor === '#3B82F6') tagLabel = '시설 대관';
            else if (bgColor === '#8B5CF6') tagLabel = 'VIP 의전 및 기타';

            if (window.salesCalendar) {
                window.salesCalendar.addEvent({
                    title, start: currentSelectedDate,
                    backgroundColor: bgColor, borderColor: bgColor,
                    extendedProps: { people: '-', revenue: '-', prep: '신규 등록된 일정입니다.', tagLabel }
                });
                if (typeof renderAgendaList === 'function') renderAgendaList();
            }
            closeNewEvModal();
        });
    }

    // ══════════════════════════════════════════
    // 4. FULLCALENDAR (스파 영업일정)
    // ══════════════════════════════════════════
    const calendarEl = document.getElementById('calendar');

    if (calendarEl) {
        window.salesCalendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'ko',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek'
            },
            height: 650,
            selectable: true,
            events: [
                {
                    title: '하나투어 진안관광 45명',
                    start: `${y}-${mStr}-22T14:00:00`,
                    end: `${y}-${mStr}-22T18:00:00`,
                    backgroundColor: '#10B981', borderColor: '#10B981',
                    extendedProps: {
                        people: '45명', revenue: '2,250,000원',
                        prep: '루프탑 사우나 단체입장 준비 요망, 수건 여유분 100장 추가 배치할 것.',
                        tagLabel: '여행사 단체 (지원팀)'
                    }
                },
                {
                    title: 'Jinan 지자체 행사 단독 대관',
                    start: `${y}-${mStr}-14T09:00:00`,
                    end: `${y}-${mStr}-16T18:00:00`,
                    backgroundColor: '#3B82F6', borderColor: '#3B82F6',
                    extendedProps: {
                        people: '120명', revenue: '12,000,000원',
                        prep: '전관 대관 행사. 안전 요원 3명 추가 배치, 식음료팀 특식 준비 필요.',
                        tagLabel: '시설 대관 (지원팀)'
                    }
                },
                {
                    title: 'VIP 의전 (협력사 대표단)',
                    start: `${y}-${mStr}-28T11:00:00`,
                    end: `${y}-${mStr}-28T15:00:00`,
                    backgroundColor: '#8B5CF6', borderColor: '#8B5CF6',
                    extendedProps: {
                        people: '5명', revenue: '(대외비)',
                        prep: '일본식 정원 프라이빗 예약 진행, VIP 전용 어메니티 세팅 완료할 것.',
                        tagLabel: 'VIP 의전 (본사)'
                    }
                },
                {
                    title: '대전 노인복지센터 단체 방문',
                    start: `${y}-${mStr}-10T10:00:00`,
                    end: `${y}-${mStr}-10T16:00:00`,
                    backgroundColor: '#F97316', borderColor: '#F97316',
                    extendedProps: {
                        people: '60명', revenue: '1,800,000원',
                        prep: '어르신 전용 온천 프로그램 운영, 점심 식사 포함.',
                        tagLabel: '일반단체 (운영팀)'
                    }
                }
            ],
            eventClick: function(info) { window.openEventModal(info.event); },
            dateClick: function(info) { window.openNewEventModal(info.dateStr); }
        });
        window.salesCalendar.render();
        renderAgendaList();
    }

    // ── Agenda List Renderer ──
    function renderAgendaList() {
        const agendaUl = document.getElementById('agendaList');
        if (!agendaUl || !window.salesCalendar) return;

        const events = window.salesCalendar.getEvents();
        events.sort((a, b) => new Date(a.start) - new Date(b.start));
        agendaUl.innerHTML = '';

        if (events.length === 0) {
            agendaUl.innerHTML = '<li style="color:var(--text-secondary); text-align:center; padding:20px;">등록된 일정이 없습니다.</li>';
            return;
        }

        events.forEach(ev => {
            const startDate = new Date(ev.start);
            const mo = startDate.getMonth() + 1;
            const da = startDate.getDate();
            const dateText = `${mo}월 ${da}일`;
            let peopleText = ev.extendedProps.people !== '-' ? ev.extendedProps.people : '';
            let contentText = ev.title;
            if (peopleText) contentText += ` (${peopleText} 예정)`;
            if (ev.extendedProps.prep && ev.extendedProps.prep !== '신규 등록된 일정입니다.') {
                contentText += ` - ${ev.extendedProps.prep}`;
            }

            const li = document.createElement('li');
            li.onclick = () => window.openEventModal(ev);
            li.innerHTML = `
                <div style="flex-shrink:0; font-weight:700; color:#3B82F6; background:rgba(59,130,246,0.15); padding:6px 12px; border-radius:6px; min-width:80px; text-align:center;">${dateText}</div>
                <div style="flex:1; color:var(--text-primary); font-size:0.95rem; line-height:1.4;">
                    <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${ev.backgroundColor}; margin-right:8px; vertical-align:middle;"></span>
                    ${contentText}
                </div>
                <div style="color:var(--text-muted); font-size:0.85rem;">${ev.extendedProps.tagLabel || '기타'}</div>
            `;
            agendaUl.appendChild(li);
        });
    }

    // ══════════════════════════════════════════
    // 5. EVENT VIEW MODAL
    // ══════════════════════════════════════════
    const eventModal = document.getElementById('eventModal');
    const closeEventBtn = document.getElementById('closeEventBtn');
    const closeEventModalX = document.getElementById('closeEventModal');

    window.openEventModal = function(eventObj) {
        if (!eventModal) return;
        document.getElementById('evTitle').innerText = eventObj.title;
        document.getElementById('evTag').innerText = eventObj.extendedProps.tagLabel || '기타 일정';
        const startDate = eventObj.start.toLocaleString('ko-KR');
        const endDate = eventObj.end ? eventObj.end.toLocaleString('ko-KR') : '';
        document.getElementById('evDate').innerText = endDate ? `${startDate} ~ ${endDate}` : startDate;
        document.getElementById('evPeople').innerText = eventObj.extendedProps.people || '-';
        document.getElementById('evRevenue').innerText = eventObj.extendedProps.revenue || '-';
        document.getElementById('evPrep').innerText = eventObj.extendedProps.prep || '등록된 준비사항이 없습니다.';
        eventModal.classList.add('show');
    };

    function closeEvModal() { if (eventModal) eventModal.classList.remove('show'); }
    if (closeEventBtn) closeEventBtn.addEventListener('click', closeEvModal);
    if (closeEventModalX) closeEventModalX.addEventListener('click', closeEvModal);
    if (eventModal) eventModal.addEventListener('click', e => { if (e.target === eventModal) closeEvModal(); });

});
