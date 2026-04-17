document.addEventListener('DOMContentLoaded', () => {

    // 1. Tab Navigation Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => {
                c.style.display = 'none';
                c.classList.remove('active');
            });

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            const targetContent = document.getElementById(targetId);
            
            if(targetContent) {
                targetContent.style.display = 'block';
                setTimeout(() => targetContent.classList.add('active'), 10);
            }

            // Important: FullCalendar needs to re-render if it was hidden when initialized
            if(targetId === 'tab-calendar' && window.salesCalendar) {
                setTimeout(() => {
                    window.salesCalendar.render();
                }, 50);
            }
        });
    });

    // 2. FullCalendar Initialization
    const calendarEl = document.getElementById('calendar');
    
    // Sample events for prototype
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');

    if (calendarEl) {
        window.salesCalendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'ko', // Korean language
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,listWeek'
            },
            height: '100%',
            events: [
                {
                    title: '하나투어 진안관광 45명',
                    start: `${y}-${m}-22T14:00:00`,
                    end: `${y}-${m}-22T18:00:00`,
                    backgroundColor: '#10B981', // green
                    borderColor: '#10B981',
                    extendedProps: {
                        people: '45명',
                        revenue: '2,250,000원',
                        prep: '루프탑 사우나 단체입장 준비 요망, 수건 여유분 100장 추가 배치할 것.',
                        tagLabel: '여행사 단체 (지원팀)'
                    }
                },
                {
                    title: 'Jinan 지자체 행사 단독 대관',
                    start: `${y}-${m}-14T09:00:00`,
                    end: `${y}-${m}-16T18:00:00`,
                    backgroundColor: '#3B82F6', // Blue
                    borderColor: '#3B82F6',
                    extendedProps: {
                        people: '120명',
                        revenue: '12,000,000원',
                        prep: '전관 대관 행사. 안전 요원 3명 추가 배치, 식음료팀 특식 준비 필요.',
                        tagLabel: '시설 대관 (지원팀)'
                    }
                },
                {
                    title: 'VIP 의전 (협력사 대표단)',
                    start: `${y}-${m}-28T11:00:00`,
                    end: `${y}-${m}-28T15:00:00`,
                    backgroundColor: '#8B5CF6', // Purple
                    borderColor: '#8B5CF6',
                    extendedProps: {
                        people: '5명',
                        revenue: '(대외비)',
                        prep: '일본식 정원 프라이빗 예약 진행, VIP 전용 어메니티 세팅 완료할 것.',
                        tagLabel: 'VIP 의전 (본사)'
                    }
                }
            ],
            eventClick: function(info) {
                // Open Custom Modal rather than default browser alert
                openEventModal(info.event);
            }
        });

        window.salesCalendar.render();
    }

    // 3. Event Modal Logic
    const eventModal = document.getElementById('eventModal');
    const closeEventBtn = document.getElementById('closeEventBtn');
    const closeEventModalX = document.getElementById('closeEventModal');

    window.openEventModal = function(eventObj) {
        // Populate data
        document.getElementById('evTitle').innerText = eventObj.title;
        document.getElementById('evTag').innerText = eventObj.extendedProps.tagLabel || '기타 일정';

        // Format Date
        const startDate = eventObj.start.toLocaleString('ko-KR');
        const endDate = eventObj.end ? eventObj.end.toLocaleString('ko-KR') : '';
        document.getElementById('evDate').innerText = endDate ? `${startDate} ~ ${endDate}` : startDate;

        // Custom Props
        document.getElementById('evPeople').innerText = eventObj.extendedProps.people || '-';
        document.getElementById('evRevenue').innerText = eventObj.extendedProps.revenue || '-';
        document.getElementById('evPrep').innerText = eventObj.extendedProps.prep || '등록된 준비사항이 없습니다.';

        eventModal.classList.add('show');
    };

    function closeEvModal() {
        eventModal.classList.remove('show');
    }

    if (closeEventBtn) closeEventBtn.addEventListener('click', closeEvModal);
    if (closeEventModalX) closeEventModalX.addEventListener('click', closeEvModal);

    eventModal.addEventListener('click', (e) => {
        if(e.target === eventModal) {
            closeEvModal();
        }
    });

});
