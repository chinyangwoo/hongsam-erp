document.addEventListener('DOMContentLoaded', () => {

    // ============================================================
    // 1. NEW EVENT MODAL — must be defined BEFORE calendar init
    //    so that dateClick can call openNewEventModal safely
    // ============================================================
    const newEventModal = document.getElementById('newEventModal');
    const closeNewEventBtn = document.getElementById('closeNewEventBtn');
    const closeNewEventModalHeader = document.getElementById('closeNewEventModalHeader');
    const saveNewEventBtn = document.getElementById('saveNewEventBtn');
    const neDateInput = document.getElementById('neDate');
    const neTitleInput = document.getElementById('neTitle');
    const neTagInput = document.getElementById('neTag');

    let currentSelectedDate = '';

    function closeNewEvModal() {
        if(newEventModal) newEventModal.classList.remove('show');
    }

    window.openNewEventModal = function(dateStr) {
        currentSelectedDate = dateStr;
        if(neDateInput) neDateInput.value = dateStr;
        if(neTitleInput) { neTitleInput.value = ''; neTitleInput.focus(); }
        if(neTagInput) neTagInput.selectedIndex = 0;
        if(newEventModal) newEventModal.classList.add('show');
    };

    if (closeNewEventBtn) closeNewEventBtn.addEventListener('click', closeNewEvModal);
    if (closeNewEventModalHeader) closeNewEventModalHeader.addEventListener('click', closeNewEvModal);
    if (newEventModal) {
        newEventModal.addEventListener('click', (e) => {
            if (e.target === newEventModal) closeNewEvModal();
        });
    }

    if (saveNewEventBtn) {
        saveNewEventBtn.addEventListener('click', () => {
            const title = neTitleInput ? neTitleInput.value.trim() : '';
            if (!title) {
                alert('일정 제목(내용)을 입력해주세요.');
                return;
            }
            const bgColor = neTagInput ? neTagInput.value : '#10B981';
            let tagLabel = '기타 일정';
            if (bgColor === '#10B981') tagLabel = '여행사 단체';
            else if (bgColor === '#3B82F6') tagLabel = '시설 대관';
            else if (bgColor === '#8B5CF6') tagLabel = 'VIP 의전 및 기타';

            if (window.salesCalendar) {
                window.salesCalendar.addEvent({
                    title: title,
                    start: currentSelectedDate,
                    backgroundColor: bgColor,
                    borderColor: bgColor,
                    extendedProps: {
                        people: '-',
                        revenue: '-',
                        prep: '신규 등록된 일정입니다.',
                        tagLabel: tagLabel
                    }
                });
                if (typeof renderAgendaList === 'function') renderAgendaList();
            }
            closeNewEvModal();
        });
    }

    // ============================================================
    // 2. FULLCALENDAR INITIALIZATION
    // ============================================================
    const calendarEl = document.getElementById('calendar');

    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');

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
                    start: `${y}-${m}-22T14:00:00`,
                    end: `${y}-${m}-22T18:00:00`,
                    backgroundColor: '#10B981',
                    borderColor: '#10B981',
                    extendedProps: {
                        people: '45명', revenue: '2,250,000원',
                        prep: '루프탑 사우나 단체입장 준비 요망, 수건 여유분 100장 추가 배치할 것.',
                        tagLabel: '여행사 단체 (지원팀)'
                    }
                },
                {
                    title: 'Jinan 지자체 행사 단독 대관',
                    start: `${y}-${m}-14T09:00:00`,
                    end: `${y}-${m}-16T18:00:00`,
                    backgroundColor: '#3B82F6',
                    borderColor: '#3B82F6',
                    extendedProps: {
                        people: '120명', revenue: '12,000,000원',
                        prep: '전관 대관 행사. 안전 요원 3명 추가 배치, 식음료팀 특식 준비 필요.',
                        tagLabel: '시설 대관 (지원팀)'
                    }
                },
                {
                    title: 'VIP 의전 (협력사 대표단)',
                    start: `${y}-${m}-28T11:00:00`,
                    end: `${y}-${m}-28T15:00:00`,
                    backgroundColor: '#8B5CF6',
                    borderColor: '#8B5CF6',
                    extendedProps: {
                        people: '5명', revenue: '(대외비)',
                        prep: '일본식 정원 프라이빗 예약 진행, VIP 전용 어메니티 세팅 완료할 것.',
                        tagLabel: 'VIP 의전 (본사)'
                    }
                }
            ],
            // Click existing event to view detail
            eventClick: function(info) {
                window.openEventModal(info.event);
            },
            // Click empty date cell to add new event
            dateClick: function(info) {
                window.openNewEventModal(info.dateStr);
            }
        });

        window.salesCalendar.render();
        renderAgendaList(); // Initial render
    }

    // ============================================================
    // 2-B. DYNAMIC AGENDA LIST RENDERER
    // ============================================================
    function renderAgendaList() {
        const agendaUl = document.getElementById('agendaList');
        if (!agendaUl || !window.salesCalendar) return;

        const events = window.salesCalendar.getEvents();
        // Sort events by start date
        events.sort((a, b) => new Date(a.start) - new Date(b.start));

        agendaUl.innerHTML = '';
        if (events.length === 0) {
            agendaUl.innerHTML = '<li style="color:var(--text-secondary); text-align:center; padding:20px;">등록된 일정이 없습니다.</li>';
            return;
        }

        events.forEach(ev => {
            const startDate = new Date(ev.start);
            const m = startDate.getMonth() + 1;
            const d = startDate.getDate();
            const dateText = `${m}월 ${d}일`;

            // Look for details
            let peopleText = ev.extendedProps.people !== '-' ? ev.extendedProps.people : '';
            let contentText = `${ev.title}`;
            if (peopleText) contentText += ` (${peopleText} 예정)`;
            if (ev.extendedProps.prep && ev.extendedProps.prep !== '신규 등록된 일정입니다.') {
                contentText += ` - ${ev.extendedProps.prep}`;
            }

            const li = document.createElement('li');
            li.style.cssText = `
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 14px 20px;
                background: rgba(0,0,0,0.2);
                border: 1px solid rgba(255,255,255,0.05);
                border-radius: 10px;
                cursor: pointer;
                transition: background 0.2s;
            `;
            li.onmouseover = () => li.style.background = 'rgba(255,255,255,0.05)';
            li.onmouseout = () => li.style.background = 'rgba(0,0,0,0.2)';
            li.onclick = () => window.openEventModal(ev); // click to open same modal

            li.innerHTML = `
                <div style="flex-shrink:0; font-weight:700; color:#3B82F6; background:rgba(59,130,246,0.15); padding:6px 12px; border-radius:6px; min-width:80px; text-align:center;">
                    ${dateText}
                </div>
                <div style="flex:1; color:var(--text-primary); font-size:0.95rem; line-height:1.4;">
                    <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${ev.backgroundColor}; margin-right:8px; vertical-align:middle;"></span>
                    ${contentText}
                </div>
                <div style="color:var(--text-muted); font-size:0.85rem;">
                    ${ev.extendedProps.tagLabel || '기타'}
                </div>
            `;
            agendaUl.appendChild(li);
        });
    }

    // ============================================================
    // 3. EXISTING EVENT VIEW MODAL
    // ============================================================
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

    function closeEvModal() {
        if (eventModal) eventModal.classList.remove('show');
    }

    if (closeEventBtn) closeEventBtn.addEventListener('click', closeEvModal);
    if (closeEventModalX) closeEventModalX.addEventListener('click', closeEvModal);
    if (eventModal) {
        eventModal.addEventListener('click', (e) => {
            if (e.target === eventModal) closeEvModal();
        });
    }

    // ============================================================
    // 4. VISITOR COUNT EDIT MODAL
    // ============================================================
    const btnEditVisitor = document.getElementById('btnEditVisitor');
    const visitorEditModal = document.getElementById('visitorEditModal');
    const closeVisitorModal = document.getElementById('closeVisitorModal');
    const closeVisitorModalHeader = document.getElementById('closeVisitorModalHeader');
    const saveVisitorBtn = document.getElementById('saveVisitorBtn');
    const visitorInput = document.getElementById('visitorInput');
    const visitorCountDisplay = document.getElementById('visitorCountDisplay');

    function closeVisModal() {
        if (visitorEditModal) visitorEditModal.classList.remove('show');
    }

    function openVisitorModal() {
        if (visitorEditModal) {
            visitorEditModal.classList.add('show');
            if (visitorCountDisplay && visitorInput) {
                visitorInput.value = visitorCountDisplay.innerText.replace(/[^0-9]/g, '');
                visitorInput.focus();
            }
        }
    }

    if (btnEditVisitor) btnEditVisitor.addEventListener('click', openVisitorModal);
    if (closeVisitorModal) closeVisitorModal.addEventListener('click', closeVisModal);
    if (closeVisitorModalHeader) closeVisitorModalHeader.addEventListener('click', closeVisModal);
    if (visitorEditModal) {
        visitorEditModal.addEventListener('click', (e) => {
            if (e.target === visitorEditModal) closeVisModal();
        });
    }

    if (saveVisitorBtn) {
        saveVisitorBtn.addEventListener('click', () => {
            if (visitorInput && visitorInput.value) {
                const num = parseInt(visitorInput.value, 10);
                if (visitorCountDisplay) visitorCountDisplay.innerText = num.toLocaleString() + ' 명';
                closeVisModal();
            }
        });
    }

});
