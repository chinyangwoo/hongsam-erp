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

    // ── 비관리자: 매출 섹션 숨기고 캘린더만 공개 ──
    if (!isAdmin) {
        // 매출 KPI, 영업현황(미니캘린더+차트) 섹션 숨기기
        document.querySelectorAll('.sales-admin-only').forEach(el => el.style.display = 'none');
        // 헤더 설명 변경
        const headerDesc = document.getElementById('salesHeaderDesc');
        if (headerDesc) headerDesc.innerText = '홍삼빌호텔 + 홍삼스파 영업 일정 캘린더';
        // 이벤트 모달에서 예상매출액 항목 숨기기
        const evRevenueRow = document.getElementById('evRevenue');
        if (evRevenueRow && evRevenueRow.closest('li')) {
            evRevenueRow.closest('li').style.display = 'none';
        }
    }

    let revDb = JSON.parse(localStorage.getItem('erp_revenue_db') || '{}');

    // ══════════════════════════════════════════
    // 0. 홍삼빌호텔 API 자동 연동 (hongsam.dothome.co.kr)
    // ══════════════════════════════════════════
    const HOTEL_API = 'https://hongsam.dothome.co.kr/api.php?action=load';
    const HOTEL_CACHE_KEY = 'erp_hotel_api_cache';
    const HOTEL_CACHE_TTL = 30 * 60 * 1000; // 30분 캐시

    let hotelApiData = []; // 호텔 API에서 가져온 원본 레코드

    async function fetchHotelData() {
        // 캐시 확인
        try {
            const cached = JSON.parse(localStorage.getItem(HOTEL_CACHE_KEY) || '{}');
            if (cached.ts && (Date.now() - cached.ts < HOTEL_CACHE_TTL) && cached.data) {
                hotelApiData = cached.data;
                applyHotelDataToERP();
                return;
            }
        } catch(e) {}

        // API 호출
        try {
            const res = await fetch(HOTEL_API);
            if (res.ok) {
                hotelApiData = await res.json();
                localStorage.setItem(HOTEL_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: hotelApiData }));
                console.log(`[호텔API] ${hotelApiData.length}건 데이터 수신 완료`);
            } else {
                throw new Error('API HTTP ' + res.status);
            }
        } catch(e) {
            console.warn('[호텔API] 직접 연결 실패, 서버 캐시 시도:', e.message);
            // 서버 캐시 파일 fallback
            try {
                const fallback = await fetch('/hotel_data_cache.json');
                if (fallback.ok) hotelApiData = await fallback.json();
            } catch(e2) {
                // 로컬 캐시 fallback
                try { hotelApiData = JSON.parse(localStorage.getItem(HOTEL_CACHE_KEY) || '{}').data || []; } catch(e3) {}
            }
        }

        if (hotelApiData.length > 0) applyHotelDataToERP();
    }

    function applyHotelDataToERP() {
        // 날짜별 Map 구성 (가장 최근 레코드 우선)
        const dateMap = {};
        hotelApiData.forEach(r => { dateMap[r.date] = r; });

        // ── 1) 호텔 KPI 카드 업데이트 ──
        const todayKey = `${y}-${mStr}-${String(d).padStart(2, '0')}`;
        const yestDate = new Date(y, m, d - 1);
        const yKey = `${yestDate.getFullYear()}-${String(yestDate.getMonth()+1).padStart(2,'0')}-${String(yestDate.getDate()).padStart(2,'0')}`;

        // 가장 최근 데이터 찾기 (오늘이 없으면 가장 마지막 날짜)
        let latestRec = dateMap[todayKey];
        let prevRec = dateMap[yKey];
        
        if (!latestRec) {
            // 오늘 데이터가 없으면 가장 최근 날짜 데이터 사용
            const sorted = hotelApiData.sort((a, b) => b.date.localeCompare(a.date));
            if (sorted.length > 0) latestRec = sorted[0];
            if (sorted.length > 1) prevRec = sorted[1];
        }

        if (latestRec) {
            const fmt = v => '₩ ' + v.toLocaleString();
            const delta = (curr, prev, unit) => {
                if (!prev) return { cls: 'sk-delta', text: `최신: ${latestRec.date}`, style: 'color:var(--text-secondary)' };
                const diff = curr - prev;
                const pct = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0;
                if (diff >= 0) return { cls: 'sk-delta up', text: `▲ ${unit === '%' ? Math.abs(pct) + '%' : Math.abs(diff) + unit} 전일대비`, style: '' };
                else return { cls: 'sk-delta down', text: `▼ ${unit === '%' ? Math.abs(pct) + '%' : Math.abs(diff) + unit} 전일대비`, style: '' };
            };

            // 점유율
            const occ = latestRec.metrics.occRate || 0;
            const prevOcc = prevRec ? (prevRec.metrics.occRate || 0) : null;
            const elOcc = document.getElementById('hotel-kpi-occ');
            const elOccD = document.getElementById('hotel-kpi-occ-delta');
            if (elOcc) elOcc.innerHTML = occ + '<span style="font-size:0.8rem;">%</span>';
            if (elOccD && prevOcc !== null) {
                const d1 = delta(occ, prevOcc, '%');
                elOccD.className = d1.cls; elOccD.innerText = d1.text;
                if (d1.style) elOccD.style.color = d1.style.split(':')[1];
            } else if (elOccD) {
                elOccD.innerText = '최신: ' + latestRec.date;
            }

            // 객실매출
            const roomRev = latestRec.revenue.room || 0;
            const elRR = document.getElementById('hotel-kpi-room-rev');
            const elRRD = document.getElementById('hotel-kpi-room-rev-delta');
            if (elRR) elRR.innerText = fmt(roomRev);
            if (elRRD && prevRec) {
                const d2 = delta(roomRev, prevRec.revenue.room || 0, '%');
                elRRD.className = d2.cls; elRRD.innerText = d2.text;
            }

            // RevPAR
            const revpar = latestRec.metrics.revpar || 0;
            const elRP = document.getElementById('hotel-kpi-revpar');
            const elRPD = document.getElementById('hotel-kpi-revpar-delta');
            if (elRP) elRP.innerText = fmt(revpar);
            if (elRPD && prevRec) {
                const d3 = delta(revpar, prevRec.metrics.revpar || 0, '%');
                elRPD.className = d3.cls; elRPD.innerText = d3.text;
            }

            // 판매 객실수
            const roomsSold = latestRec.rooms.total || 0;
            const elRS = document.getElementById('hotel-kpi-rooms-sold');
            const elRSD = document.getElementById('hotel-kpi-rooms-sold-delta');
            if (elRS) elRS.innerHTML = roomsSold + '<span style="font-size:0.8rem;"> / 43</span>';
            if (elRSD && prevRec) {
                const diff = roomsSold - (prevRec.rooms.total || 0);
                elRSD.className = diff >= 0 ? 'sk-delta up' : 'sk-delta down';
                elRSD.innerText = (diff >= 0 ? '▲ ' : '▼ ') + Math.abs(diff) + '실 전일대비';
            }

            // ADR
            const adr = latestRec.metrics.adr || 0;
            const elADR = document.getElementById('hotel-kpi-adr');
            const elADRD = document.getElementById('hotel-kpi-adr-delta');
            if (elADR) elADR.innerText = fmt(adr);
            if (elADRD && prevRec) {
                const d4 = delta(adr, prevRec.metrics.adr || 0, '%');
                elADRD.className = d4.cls; elADRD.innerText = d4.text;
            }

            // F&B 매출
            const fbRev = latestRec.revenue.food || 0;
            const elFB = document.getElementById('hotel-kpi-fb');
            const elFBD = document.getElementById('hotel-kpi-fb-delta');
            if (elFB) elFB.innerText = fmt(fbRev);
            if (elFBD && prevRec) {
                const d5 = delta(fbRev, prevRec.revenue.food || 0, '%');
                elFBD.className = d5.cls; elFBD.innerText = d5.text;
            }
        }

        // ── 2) 호텔 매출 데이터를 revDb에 동기화 (미니캘린더 + 바차트 반영) ──
        hotelApiData.forEach(r => {
            if (!revDb[r.date]) revDb[r.date] = {};
            // 만원 단위로 변환 (API는 원 단위)
            revDb[r.date].hotelObjRev = Math.round((r.revenue.total || 0) / 10000);
            revDb[r.date].hotelRoomRev = r.revenue.room || 0;
            revDb[r.date].hotelFbRev = r.revenue.food || 0;
            revDb[r.date].hotelRoomsSold = r.rooms.total || 0;
            revDb[r.date].hotelOccRate = r.metrics.occRate || 0;
        });
        localStorage.setItem('erp_revenue_db', JSON.stringify(revDb));

        // 차트 및 캘린더 갱신
        if (typeof renderRevenueCalendars === 'function') renderRevenueCalendars();
        if (typeof renderBarCharts === 'function') renderBarCharts();

        // ── 3) 통합 매출 집계 KPI 자동 계산 (실제 데이터 기반) ──
        const wonFmt = v => {
            if (v >= 100000000) return '₩ ' + (v / 100000000).toFixed(1) + '억';
            if (v >= 10000) return '₩ ' + Math.round(v).toLocaleString();
            return '₩ ' + v.toLocaleString();
        };
        const pctDelta = (curr, prev) => {
            if (!prev || prev === 0) return null;
            return Math.round(((curr - prev) / prev) * 100);
        };
        const setKpi = (valId, subId, value, pct, label) => {
            const elV = document.getElementById(valId);
            const elS = document.getElementById(subId);
            if (elV) elV.innerText = wonFmt(value);
            if (elS && pct !== null) {
                const arrow = pct >= 0 ? '▲' : '▼';
                const cls = pct >= 0 ? 'up' : 'down';
                elS.innerHTML = `<span class="${cls}">${arrow} ${Math.abs(pct)}%</span> ${label}`;
            } else if (elS) {
                elS.innerHTML = `<span style="color:var(--text-secondary);">호텔 실적 기준</span>`;
            }
        };

        // 날짜 유틸
        const todayD = new Date(y, m, d);
        const getDateKey = (dt) => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
        const getMonday = (dt) => { const dd = new Date(dt); const day = dd.getDay(); const diff = dd.getDate() - day + (day === 0 ? -6 : 1); dd.setDate(diff); return dd; };

        // (a) 전일 매출 — 가장 최근 날짜 기준
        const sortedRecs = [...hotelApiData].sort((a,b) => b.date.localeCompare(a.date));
        if (sortedRecs.length >= 1) {
            const yesterdayRev = sortedRecs[0].revenue.total || 0;
            // 전주 동일 요일 데이터 찾기
            const latestDate = new Date(sortedRecs[0].date);
            const sameLastWeek = new Date(latestDate);
            sameLastWeek.setDate(sameLastWeek.getDate() - 7);
            const lastWeekKey = getDateKey(sameLastWeek);
            const lastWeekRec = hotelApiData.find(r => r.date === lastWeekKey);
            const lastWeekRev = lastWeekRec ? lastWeekRec.revenue.total : null;
            setKpi('kpiYesterday', 'kpiYesterdaySub', yesterdayRev, pctDelta(yesterdayRev, lastWeekRev), '전주 동일 대비');
        }

        // (b) 금주 매출 (최근 7일 기준 — 가장 마지막 데이터 기준)
        const latestDataDate = sortedRecs.length > 0 ? new Date(sortedRecs[0].date) : todayD;
        const weekStartDate = new Date(latestDataDate);
        weekStartDate.setDate(weekStartDate.getDate() - 6); // 최근 7일
        const prevWeekEnd = new Date(weekStartDate);
        prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
        const prevWeekStart = new Date(prevWeekEnd);
        prevWeekStart.setDate(prevWeekStart.getDate() - 6);
        let thisWeekTotal = 0, prevWeekTotal = 0;
        hotelApiData.forEach(r => {
            const rd = new Date(r.date);
            if (rd >= weekStartDate && rd <= latestDataDate) thisWeekTotal += (r.revenue.total || 0);
            if (rd >= prevWeekStart && rd <= prevWeekEnd) prevWeekTotal += (r.revenue.total || 0);
        });
        setKpi('kpiWeek', 'kpiWeekSub', thisWeekTotal, pctDelta(thisWeekTotal, prevWeekTotal), '전주 대비');

        // (c) 금월 매출
        const thisMonthPrefix = `${y}-${mStr}`;
        const prevM = m === 0 ? 11 : m - 1;
        const prevY = m === 0 ? y - 1 : y;
        const prevMonthPrefix = `${prevY}-${String(prevM + 1).padStart(2, '0')}`;
        let thisMonthTotal = 0, prevMonthTotal = 0;
        hotelApiData.forEach(r => {
            if (r.date.startsWith(thisMonthPrefix)) thisMonthTotal += (r.revenue.total || 0);
            if (r.date.startsWith(prevMonthPrefix)) prevMonthTotal += (r.revenue.total || 0);
        });
        setKpi('kpiMonth', 'kpiMonthSub', thisMonthTotal, pctDelta(thisMonthTotal, prevMonthTotal), '전월 대비');

        // (d) 금년 누적 매출
        const thisYearPrefix = `${y}`;
        let yearTotal = 0;
        hotelApiData.forEach(r => {
            if (r.date.startsWith(thisYearPrefix)) yearTotal += (r.revenue.total || 0);
        });
        const elYear = document.getElementById('kpiYear');
        const elYearSub = document.getElementById('kpiYearSub');
        if (elYear) elYear.innerText = wonFmt(yearTotal);
        if (elYearSub) elYearSub.innerHTML = `<span style="color:var(--text-secondary);">1월~${m+1}월 호텔 실적 합산</span>`;
    }

    // 호텔 데이터 자동 로드
    fetchHotelData();


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
            
            // 실제 입력 데이터만 표시 (시뮬레이션 데이터 없음)
            let hotelRev = 0;
            let spaRev = 0;
            
            if (revDb[dateKey]) {
                hotelRev = revDb[dateKey].hotelObjRev || 0;
                spaRev = revDb[dateKey].spaEntrance || 0;
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

    // 호텔/스파 30일 매출/입장객 차트 (실제 입력 데이터만 표시)
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
                hotel30Data.push(0);
                spa30Data.push(0);
            }
        }
        generateBarChart('hotelBarChart', hotel30Data, 'linear-gradient(180deg, #F59E0B, #D97706)', 'won');
        generateBarChart('spaBarChart', spa30Data, 'linear-gradient(180deg, #3B82F6, #2563EB)', 'person');
    };

    // ── 스파 KPI 카드 자동 업데이트 (실제 입력 데이터 기반) ──
    window.updateSpaKpiCards = function() {
        const todayKey = `${y}-${mStr}-${String(d).padStart(2, '0')}`;
        const yesterdayDate = new Date(y, m, d - 1);
        const yKey = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth()+1).padStart(2,'0')}-${String(yesterdayDate.getDate()).padStart(2,'0')}`;
        
        const todayData = revDb[todayKey] || {};
        const yesterdayData = revDb[yKey] || {};
        
        // 오늘 입장객
        const todayVisitors = todayData.spaEntrance || 0;
        const yesterdayVisitors = yesterdayData.spaEntrance || 0;
        const el1 = document.getElementById('spa-kpi-visitors');
        const el1d = document.getElementById('spa-kpi-visitors-delta');
        if (el1 && todayVisitors > 0) {
            el1.innerHTML = todayVisitors + '<span style="font-size:0.8rem;">명</span>';
            const diff = todayVisitors - yesterdayVisitors;
            if (yesterdayVisitors > 0) {
                el1d.className = diff >= 0 ? 'sk-delta up' : 'sk-delta down';
                el1d.innerText = (diff >= 0 ? '▲ ' : '▼ ') + Math.abs(diff) + '명 전일대비';
            } else {
                el1d.className = 'sk-delta';
                el1d.style.color = 'var(--text-secondary)';
                el1d.innerText = '전일 데이터 없음';
            }
        }
        
        // 입장 매출
        const ticketRev = todayData.spaTickRev || 0;
        const el2 = document.getElementById('spa-kpi-ticket');
        if (el2 && ticketRev > 0) el2.innerText = '₩ ' + (ticketRev * 10000).toLocaleString();
        
        // 식음료 매출
        const fbRev = todayData.spaFbRev || 0;
        const el3 = document.getElementById('spa-kpi-fb');
        if (el3 && fbRev > 0) el3.innerText = '₩ ' + (fbRev * 10000).toLocaleString();
        
        // 금월 누적 방문
        let monthTotal = 0;
        for (let day = 1; day <= d; day++) {
            const dk = `${y}-${mStr}-${String(day).padStart(2, '0')}`;
            if (revDb[dk] && revDb[dk].spaEntrance) monthTotal += revDb[dk].spaEntrance;
        }
        const el4 = document.getElementById('spa-kpi-monthly');
        if (el4 && monthTotal > 0) el4.innerHTML = monthTotal.toLocaleString() + '<span style="font-size:0.8rem;">명</span>';
        
        // 객단가 (총 매출 / 총 방문객)
        let monthTicketTotal = 0;
        for (let day = 1; day <= d; day++) {
            const dk = `${y}-${mStr}-${String(day).padStart(2, '0')}`;
            if (revDb[dk] && revDb[dk].spaTickRev) monthTicketTotal += revDb[dk].spaTickRev;
        }
        const el5 = document.getElementById('spa-kpi-perperson');
        if (el5 && monthTotal > 0 && monthTicketTotal > 0) {
            const perPerson = Math.round((monthTicketTotal * 10000) / monthTotal);
            el5.innerText = '₩ ' + perPerson.toLocaleString();
        }
    };
    
    renderBarCharts();
    updateSpaKpiCards();

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
            events: JSON.parse(localStorage.getItem('erp_spa_events')) || [],
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
            if (typeof updateSpaKpiCards === 'function') updateSpaKpiCards();
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
            if (typeof updateSpaKpiCards === 'function') updateSpaKpiCards();
            showToast('해당 일자의 데이터가 삭제되었습니다.');
        });
    }
});
