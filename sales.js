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

    // ── 관리자 권한 및 매출 데이터 초기화 ──
    const currentUser = localStorage.getItem('currentUser') || '';
    const ADMIN_IDS = ['001'];
    let isAdmin = ADMIN_IDS.includes(currentUser);
    try {
        const employees = JSON.parse(localStorage.getItem('hongsam_employees') || '[]');
        const empRecord = employees.find(e => e.emp_id === currentUser);
        if (empRecord && empRecord.is_admin) isAdmin = true;
    } catch(e) {}

    // 관리자 UI 요소 표시
    if (isAdmin) {
        document.querySelectorAll('.admin-badge').forEach(el => el.style.display = 'inline-flex');
        document.querySelectorAll('.admin-only-btn').forEach(el => el.style.display = 'inline-block');
    }

    let revDb = JSON.parse(localStorage.getItem('erp_revenue_db') || '{}');

    // ══════════════════════════════════════════
    // 1. 매출 미니 캘린더 렌더링 (호텔/스파 통합)
    // ══════════════════════════════════════════
    window.renderRevenueCalendars = function() {
        const hotelCal = document.getElementById('hotelMiniCal');
        const spaCal = document.getElementById('spaMiniCal');
        if (!hotelCal || !spaCal) return;

        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const firstDay = new Date(y, m, 1).getDay(); // 0=Sun
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

        let hotelHtml = '', spaHtml = '';

        // Headers
        dayNames.forEach((dn, i) => {
            let cls = 'day-head';
            if (i === 0) cls += ' sun';
            if (i === 6) cls += ' sat';
            hotelHtml += `<div class="${cls}">${dn}</div>`;
            spaHtml += `<div class="${cls}">${dn}</div>`;
        });

        for (let i = 0; i < firstDay; i++) {
            hotelHtml += '<div class="day-cell empty"></div>';
            spaHtml += '<div class="day-cell empty"></div>';
        }

        // 차트 렌더링을 위해 데이터를 수집
        const hChartData = [];
        const sChartData = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = (day === d) ? ' today' : '';
            const dateKey = `${y}-${mStr}-${String(day).padStart(2, '0')}`;
            
            // 시뮬레이션 데이터 믹스 또는 실제 데이터 적용
            let hotelRev = 0;
            let spaRev = 0;
            
            if (revDb[dateKey]) {
                hotelRev = revDb[dateKey].hotelObjRev || 0;
                spaRev = revDb[dateKey].spaEntrance || 0;
            } else if (day <= d) {
                // 시뮬레이션
                const dow = new Date(y, m, day).getDay();
                const hBase = (dow === 5 || dow === 6) ? 450 : (dow === 0 ? 380 : 250);
                const sBase = (dow === 5 || dow === 6) ? 120 : (dow === 0 ? 95 : 65);
                hotelRev = Math.max(120, hBase + Math.floor(Math.random() * 80) - 40);
                spaRev = Math.max(30, sBase + Math.floor(Math.random() * 30) - 15);
                
                revDb[dateKey] = {
                    hotelObjRev: hotelRev,
                    spaEntrance: spaRev
                };
            }

            if (day <= d) {
                hChartData.push(hotelRev);
                sChartData.push(spaRev);
            }

            // 호텔 셀 렌더링
            let hRevText = hotelRev > 0 ? (hotelRev >= 100 ? Math.round(hotelRev) + '만' : hotelRev + '만') : '';
            let hClassStr = `day-cell${isToday}`;
            if (isAdmin) hClassStr += ' admin-clickable';
            if (hotelRev > 0) hClassStr += ' has-revenue';

            hotelHtml += `
                <div class="${hClassStr}" data-date="${dateKey}" data-biz="hotel" title="${isAdmin ? '매출 입력' : ''}">
                    <div class="day-num">${day}</div>
                    ${hRevText ? `<div class="day-rev-data"><div class="rev-item rev-hotel">${hRevText}</div></div>` : ''}
                </div>`;

            // 스파 셀 렌더링
            let sRevText = spaRev > 0 ? spaRev + '명' : '';
            let sClassStr = `day-cell${isToday}`;
            if (isAdmin) sClassStr += ' admin-clickable';
            if (spaRev > 0) sClassStr += ' has-revenue';

            spaHtml += `
                <div class="${sClassStr}" data-date="${dateKey}" data-biz="spa" title="${isAdmin ? '매출 입력' : ''}">
                    <div class="day-num">${day}</div>
                    ${sRevText ? `<div class="day-rev-data"><div class="rev-item rev-spa">${sRevText}</div></div>` : ''}
                </div>`;
        }

        hotelCal.innerHTML = hotelHtml;
        spaCal.innerHTML = spaHtml;

        // DB 갱신 후, 저장소 반영
        localStorage.setItem('erp_revenue_db', JSON.stringify(revDb));

        // 관리자용 클릭 이벤트
        if (isAdmin) {
            document.querySelectorAll('.day-cell.admin-clickable').forEach(cell => {
                cell.addEventListener('click', function() {
                    openRevenueModal(this.dataset.date, this.dataset.biz);
                });
            });
        }

    }
    
    // 최초 1회 렌더링
    renderRevenueCalendars();
    setTimeout(renderRevenueCalendars, 50);

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

    // 호텔/스파 30일 매출/입장객 차트 (revDb 연동)
    window.renderBarCharts = function() {
        const hotel30Data = [];
        const spa30Data = [];
        
        for (let i = 0; i < 30; i++) {
            const pastDate = new Date(y, m, d - 29 + i);
            const py = pastDate.getFullYear();
            const pm = String(pastDate.getMonth() + 1).padStart(2, '0');
            const pd = String(pastDate.getDate()).padStart(2, '0');
            const dateKey = `${py}-${pm}-${pd}`;
            
            if (revDb[dateKey]) {
                hotel30Data.push(revDb[dateKey].hotelObjRev || 0);
                spa30Data.push(revDb[dateKey].spaEntrance || 0);
            } else {
                const dow = pastDate.getDay();
                // 호텔 시뮬
                const hBase = (dow === 5 || dow === 6) ? 450 : (dow === 0 ? 380 : 250);
                hotel30Data.push(Math.max(100, hBase + Math.floor(Math.random() * 100) - 50));
                
                // 스파 시뮬
                const sBase = (dow === 5 || dow === 6) ? 200 : (dow === 0 ? 150 : 90);
                spa30Data.push(Math.max(40, sBase + Math.floor(Math.random() * 60) - 30));
            }
        }
        generateBarChart('hotelBarChart', hotel30Data, 'linear-gradient(180deg, #F59E0B, #D97706)', 'won');
        generateBarChart('spaBarChart', spa30Data, 'linear-gradient(180deg, #3B82F6, #2563EB)', 'person');
    };
    
    renderBarCharts();

    function saveCalendarEvents() {
        if (window.hotelCalendar) {
            const hEvs = window.hotelCalendar.getEvents().map(ev => ({
                id: ev.id,
                title: ev.title,
                start: ev.startStr,
                end: ev.endStr || null,
                backgroundColor: ev.backgroundColor,
                borderColor: ev.borderColor,
                extendedProps: { ...ev.extendedProps }
            }));
            localStorage.setItem('erp_hotel_events', JSON.stringify(hEvs));
        }
        if (window.salesCalendar) {
            const sEvs = window.salesCalendar.getEvents().map(ev => ({
                id: ev.id,
                title: ev.title,
                start: ev.startStr,
                end: ev.endStr || null,
                backgroundColor: ev.backgroundColor,
                borderColor: ev.borderColor,
                extendedProps: { ...ev.extendedProps }
            }));
            localStorage.setItem('erp_spa_events', JSON.stringify(sEvs));
        }
    }

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
    let currentCalendarType = 'spa';

    function closeNewEvModal() {
        if (newEventModal) newEventModal.classList.remove('show');
    }
    window.openNewEventModal = function(dateStr, calType = 'spa') {
        currentSelectedDate = dateStr;
        currentCalendarType = calType;
        if (neDateInput) neDateInput.value = dateStr;
        if (neTitleInput) { neTitleInput.value = ''; neTitleInput.focus(); }
        const nePeople = document.getElementById('nePeople');
        const neRevenue = document.getElementById('neRevenue');
        const nePrep = document.getElementById('nePrep');
        if (nePeople) nePeople.value = '';
        if (neRevenue) neRevenue.value = '';
        if (nePrep) nePrep.value = '';
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
            
            const peopleVal = document.getElementById('nePeople') ? document.getElementById('nePeople').value.trim() : '';
            const revVal = document.getElementById('neRevenue') ? document.getElementById('neRevenue').value.trim() : '';
            const prepVal = document.getElementById('nePrep') ? document.getElementById('nePrep').value.trim() : '';
            
            const bgColor = neTagInput ? neTagInput.value : '#10B981';
            let tagLabel = '기타 일정';
            if (bgColor === '#10B981') tagLabel = '여행사 단체';
            else if (bgColor === '#3B82F6') tagLabel = '시설 대관';
            else if (bgColor === '#8B5CF6') tagLabel = 'VIP 의전 및 기타';

            const newEvObj = {
                title, start: currentSelectedDate,
                backgroundColor: bgColor, borderColor: bgColor,
                extendedProps: { 
                    people: peopleVal || '-', 
                    revenue: revVal || '-', 
                    prep: prepVal || '신규 등록된 일정입니다.', 
                    tagLabel 
                }
            };

            if (currentCalendarType === 'hotel' && window.hotelCalendar) {
                window.hotelCalendar.addEvent(newEvObj);
                saveCalendarEvents();
                if (typeof renderHotelAgendaList === 'function') renderHotelAgendaList();
            } else if (window.salesCalendar) {
                window.salesCalendar.addEvent(newEvObj);
                saveCalendarEvents();
                if (typeof renderAgendaList === 'function') renderAgendaList();
            }
            closeNewEvModal();
        });
    }

    // ══════════════════════════════════════════
    // 4-A. FULLCALENDAR (호텔 영업일정)
    // ══════════════════════════════════════════
    const hotelCalendarEl = document.getElementById('hotelCalendar');

    if (hotelCalendarEl) {
        window.hotelCalendar = new FullCalendar.Calendar(hotelCalendarEl, {
            initialView: 'dayGridMonth',
            locale: 'ko',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek'
            },
            height: 650,
            selectable: true,
            events: JSON.parse(localStorage.getItem('erp_hotel_events')) || [
                {
                    title: '전주대 교수 워크숍 단체 투숙 (15실)',
                    start: `${y}-${mStr}-05T15:00:00`,
                    end: `${y}-${mStr}-07T11:00:00`,
                    backgroundColor: '#EF4444', borderColor: '#EF4444',
                    extendedProps: {
                        people: '30명 (15실)', revenue: '6,450,000원',
                        prep: '3층 전체 블록 배정, 조식 30인분 준비, 회의실 세팅.',
                        tagLabel: '객실 예약 (단체)'
                    }
                },
                {
                    title: '(주)금산인삼 창립기념 연회',
                    start: `${y}-${mStr}-12T18:00:00`,
                    end: `${y}-${mStr}-12T22:00:00`,
                    backgroundColor: '#F59E0B', borderColor: '#F59E0B',
                    extendedProps: {
                        people: '80명', revenue: '8,500,000원',
                        prep: '대연회장 세팅, 코스 요리 80인분, 화훼 장식, 사회자 마이크 준비.',
                        tagLabel: '연회/행사 (식음료팀)'
                    }
                },
                {
                    title: '진안군 관광포럼 시설 대관',
                    start: `${y}-${mStr}-18T09:00:00`,
                    end: `${y}-${mStr}-18T17:00:00`,
                    backgroundColor: '#3B82F6', borderColor: '#3B82F6',
                    extendedProps: {
                        people: '100명', revenue: '5,000,000원',
                        prep: '중회의실+소회의실 동시 대관, 빔프로젝터 2대, 점심 도시락 100개.',
                        tagLabel: '시설 대관 (스파운영팀)'
                    }
                },
                {
                    title: 'VIP 스위트 예약 (일본 거래처)',
                    start: `${y}-${mStr}-25T14:00:00`,
                    end: `${y}-${mStr}-27T11:00:00`,
                    backgroundColor: '#8B5CF6', borderColor: '#8B5CF6',
                    extendedProps: {
                        people: '4명 (2실)', revenue: '(대외비)',
                        prep: 'VIP 스위트룸 배정, 공항 픽업 차량 수배, 일본어 통역 대기.',
                        tagLabel: 'VIP (본사)'
                    }
                },
                {
                    title: '대전 동호회 MT 예약 (8실)',
                    start: `${y}-${mStr}-20T15:00:00`,
                    end: `${y}-${mStr}-21T11:00:00`,
                    backgroundColor: '#EF4444', borderColor: '#EF4444',
                    extendedProps: {
                        people: '16명 (8실)', revenue: '2,400,000원',
                        prep: '2층 단체 배정, 바비큐장 예약, 야외 캠프파이어 준비.',
                        tagLabel: '객실 예약 (단체)'
                    }
                }
            ],
            eventClick: function(info) { window.openEventModal(info.event); },
            dateClick: function(info) { window.openNewEventModal(info.dateStr, 'hotel'); }
        });
        window.hotelCalendar.render();
        renderHotelAgendaList();
    }

    // ── Hotel Agenda List Renderer ──
    function renderHotelAgendaList() {
        const agendaUl = document.getElementById('hotelAgendaList');
        if (!agendaUl || !window.hotelCalendar) return;

        const events = window.hotelCalendar.getEvents();
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
                <div style="flex-shrink:0; font-weight:700; color:#EF4444; background:rgba(239,68,68,0.15); padding:6px 12px; border-radius:6px; min-width:80px; text-align:center;">${dateText}</div>
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
    // 4-B. FULLCALENDAR (스파 영업일정)
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
            events: JSON.parse(localStorage.getItem('erp_spa_events')) || [
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
                        tagLabel: '일반단체 (스파운영팀)'
                    }
                }
            ],
            eventClick: function(info) { window.openEventModal(info.event); },
            dateClick: function(info) { window.openNewEventModal(info.dateStr, 'hotel'); }
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
    const editEventBtn = document.getElementById('editEventBtn');
    const deleteEventBtn = document.getElementById('deleteEventBtn');

    let currentEventObj = null;

    window.openEventModal = function(eventObj) {
        if (!eventModal) return;
        currentEventObj = eventObj;
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

    if (deleteEventBtn) {
        deleteEventBtn.addEventListener('click', () => {
            if (currentEventObj) {
                if(confirm('이 영업일정을 삭제하시겠습니까?')) {
                    currentEventObj.remove();
                    saveCalendarEvents();
                    if (typeof renderHotelAgendaList === 'function') renderHotelAgendaList();
                    if (typeof renderAgendaList === 'function') renderAgendaList();
                    closeEvModal();
                }
            }
        });
    }

    if (editEventBtn) {
        editEventBtn.addEventListener('click', () => {
            if (currentEventObj) {
                const dStr = currentEventObj.startStr.split('T')[0];
                let cType = 'spa';
                // 간이 캘린더 타입 판별
                try {
                    const tagL = currentEventObj.extendedProps.tagLabel || '';
                    if (tagL.includes('객실') || tagL.includes('식음료팀') || tagL.includes('호텔')) cType = 'hotel';
                } catch(e) {}
                
                closeEvModal();
                window.openNewEventModal(dStr, cType);
                
                if (document.getElementById('neTitle')) document.getElementById('neTitle').value = currentEventObj.title;
                
                const pText = currentEventObj.extendedProps.people;
                if (document.getElementById('nePeople')) document.getElementById('nePeople').value = (pText && pText !== '-') ? pText : '';
                
                const rText = currentEventObj.extendedProps.revenue;
                if (document.getElementById('neRevenue')) document.getElementById('neRevenue').value = (rText && rText !== '-') ? rText : '';
                
                const prText = currentEventObj.extendedProps.prep;
                if (document.getElementById('nePrep')) document.getElementById('nePrep').value = (prText && prText !== '신규 등록된 일정입니다.') ? prText : '';
                
                currentEventObj.remove();
                saveCalendarEvents();
                if (typeof renderHotelAgendaList === 'function') renderHotelAgendaList();
                if (typeof renderAgendaList === 'function') renderAgendaList();
            }
        });
    }

    // ══════════════════════════════════════════
    // 6. 매출 입력/수정 (관리자 전용)
    // ══════════════════════════════════════════
    const revenueModal = document.getElementById('revenueModal');
    const closeRevModalBtn = document.getElementById('closeRevModal');
    const cancelRevBtn = document.getElementById('cancelRevBtn');
    const saveRevBtn = document.getElementById('saveRevBtn');
    const deleteRevBtn = document.getElementById('deleteRevBtn');
    
    function showToast(msg) {
        const t = document.getElementById('toastMsg');
        if (t) {
            t.innerText = msg;
            t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), 3000);
        }
    }

    window.openRevenueModal = function(dateStr, bizUnit) {
        if (!revenueModal) return;
        document.getElementById('revDate').value = dateStr;
        document.getElementById('revBizUnit').value = bizUnit;
        
        // 동적 폼 생성
        const fieldsContainer = document.getElementById('revFieldsContainer');
        fieldsContainer.innerHTML = '';
        
        const data = revDb[dateStr] || {};
        
        if (bizUnit === 'hotel') {
            document.getElementById('revModalTitle').innerHTML = '<i class="fa-solid fa-hotel" style="color:#EF4444; margin-right:8px;"></i>홍삼빌호텔 매출 입력';
            fieldsContainer.innerHTML = `
                <div class="rev-field-row">
                    <label>객실 매출</label>
                    <input type="number" id="inp_hotelObjRev" class="rev-amount-input" value="${data.hotelObjRev || ''}" placeholder="0">
                    <span class="rev-unit">만원</span>
                </div>
                <div class="rev-field-row">
                    <label>F&B 매출</label>
                    <input type="number" id="inp_hotelFbRev" class="rev-amount-input" value="${data.hotelFbRev || ''}" placeholder="0">
                    <span class="rev-unit">만원</span>
                </div>
                <div class="rev-field-row">
                    <label>판매 객실수</label>
                    <input type="number" id="inp_hotelSold" class="rev-amount-input" value="${data.hotelSold || ''}" placeholder="0">
                    <span class="rev-unit">실</span>
                </div>
            `;
        } else {
            document.getElementById('revModalTitle').innerHTML = '<i class="fa-solid fa-hot-tub-person" style="color:#3B82F6; margin-right:8px;"></i>홍삼스파 매출 입력';
            fieldsContainer.innerHTML = `
                <div class="rev-field-row">
                    <label>입장객 수</label>
                    <input type="number" id="inp_spaEntrance" class="rev-amount-input" value="${data.spaEntrance || ''}" placeholder="0">
                    <span class="rev-unit">명</span>
                </div>
                <div class="rev-field-row">
                    <label>입장 매출</label>
                    <input type="number" id="inp_spaTickRev" class="rev-amount-input" value="${data.spaTickRev || ''}" placeholder="0">
                    <span class="rev-unit">만원</span>
                </div>
                <div class="rev-field-row">
                    <label>식음료/기타</label>
                    <input type="number" id="inp_spaFbRev" class="rev-amount-input" value="${data.spaFbRev || ''}" placeholder="0">
                    <span class="rev-unit">만원</span>
                </div>
            `;
        }
        
        document.getElementById('revMemo').value = data.memo || '';
        
        if (revDb[dateStr] && Object.keys(revDb[dateStr]).length > 0) {
            deleteRevBtn.style.display = 'inline-block';
        } else {
            deleteRevBtn.style.display = 'none';
        }

        revenueModal.classList.add('show');
    };

    function closeRevenueModal() {
        if (revenueModal) revenueModal.classList.remove('show');
    }

    if (closeRevModalBtn) closeRevModalBtn.addEventListener('click', closeRevenueModal);
    if (cancelRevBtn) cancelRevBtn.addEventListener('click', closeRevenueModal);
    if (revenueModal) revenueModal.addEventListener('click', e => { if (e.target === revenueModal) closeRevenueModal(); });

    if (saveRevBtn) {
        saveRevBtn.addEventListener('click', () => {
            const dateStr = document.getElementById('revDate').value;
            const bizUnit = document.getElementById('revBizUnit').value;
            
            if (!revDb[dateStr]) revDb[dateStr] = {};
            
            if (bizUnit === 'hotel') {
                revDb[dateStr].hotelObjRev = parseInt(document.getElementById('inp_hotelObjRev').value) || 0;
                revDb[dateStr].hotelFbRev = parseInt(document.getElementById('inp_hotelFbRev').value) || 0;
                revDb[dateStr].hotelSold = parseInt(document.getElementById('inp_hotelSold').value) || 0;
            } else {
                revDb[dateStr].spaEntrance = parseInt(document.getElementById('inp_spaEntrance').value) || 0;
                revDb[dateStr].spaTickRev = parseInt(document.getElementById('inp_spaTickRev').value) || 0;
                revDb[dateStr].spaFbRev = parseInt(document.getElementById('inp_spaFbRev').value) || 0;
            }
            revDb[dateStr].memo = document.getElementById('revMemo').value.trim();
            
            localStorage.setItem('erp_revenue_db', JSON.stringify(revDb));
            
            try {
                fetch('http://43.203.237.63:3001/api/db/erp_revenue_db', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(revDb)
                }).catch(e => console.warn(e));
            } catch(e) {}
            
            closeRevenueModal();
            renderRevenueCalendars();
            if (typeof renderBarCharts === 'function') renderBarCharts();
            showToast('매출 데이터가 정상적으로 저장되었습니다.');
        });
    }

    if (deleteRevBtn) {
        deleteRevBtn.addEventListener('click', () => {
            const dateStr = document.getElementById('revDate').value;
            const bizUnit = document.getElementById('revBizUnit').value;
            
            if (revDb[dateStr]) {
                if (bizUnit === 'hotel') {
                    delete revDb[dateStr].hotelObjRev;
                    delete revDb[dateStr].hotelFbRev;
                    delete revDb[dateStr].hotelSold;
                } else {
                    delete revDb[dateStr].spaEntrance;
                    delete revDb[dateStr].spaTickRev;
                    delete revDb[dateStr].spaFbRev;
                }
                
                if (Object.keys(revDb[dateStr]).every(k => k === 'memo' || !revDb[dateStr][k])) {
                    delete revDb[dateStr];
                }
                
                localStorage.setItem('erp_revenue_db', JSON.stringify(revDb));
                
                try {
                    fetch('http://43.203.237.63:3001/api/db/erp_revenue_db', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(revDb)
                    }).catch(e => console.warn(e));
                } catch(e) {}
            }
            
            closeRevenueModal();
            renderRevenueCalendars();
            if (typeof renderBarCharts === 'function') renderBarCharts();
            showToast('해당 일자의 데이터가 삭제되었습니다.');
        });
    }
});
