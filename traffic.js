// 홍삼한방타운 ERP — 트래픽 모니터링 (traffic.js v3)
// 성능 최적화: 4분할/9분할/전체스냅샷/자동순환 뷰 모드
document.addEventListener('DOMContentLoaded', () => {

    // ═══════════════════════════════════════════
    // 카메라 마스터 데이터
    // ═══════════════════════════════════════════
    const CAMERAS = [
        { id: 1,  site: 'spa',   label: 'CAM 01 · 1층 로비',          privacy: false },
        { id: 2,  site: 'spa',   label: 'CAM 02 · 1층 일본식정원',    privacy: false },
        { id: 3,  site: 'spa',   label: 'CAM 03 · 1층 카페',          privacy: false },
        { id: 4,  site: 'spa',   label: 'CAM 04 · 1층 주차장',        privacy: false },
        { id: 5,  site: 'spa',   label: 'CAM 05 · 1층 외부출입구',    privacy: false },
        { id: 6,  site: 'spa',   label: 'CAM 06 · 2층 대온천탕',      privacy: true  },
        { id: 7,  site: 'spa',   label: 'CAM 07 · 2층 이벤트탕',      privacy: false },
        { id: 8,  site: 'spa',   label: 'CAM 08 · 2층 탈의실복도',    privacy: false },
        { id: 9,  site: 'spa',   label: 'CAM 09 · 2층 휴게실',        privacy: false },
        { id: 10, site: 'spa',   label: 'CAM 10 · 루프탑 인피니티풀', privacy: false },
        { id: 11, site: 'spa',   label: 'CAM 11 · 루프탑 건식사우나', privacy: false },
        { id: 12, site: 'spa',   label: 'CAM 12 · 루프탑 바(Bar)',    privacy: false },
        { id: 13, site: 'hotel', label: 'CAM 13 · 호텔 로비',         privacy: false },
        { id: 14, site: 'hotel', label: 'CAM 14 · 호텔 프런트',       privacy: false },
        { id: 15, site: 'hotel', label: 'CAM 15 · 호텔 주차장',       privacy: false },
        { id: 16, site: 'hotel', label: 'CAM 16 · 호텔 2층 복도',     privacy: false },
        { id: 17, site: 'hotel', label: 'CAM 17 · 호텔 3층 복도',     privacy: false },
        { id: 18, site: 'hotel', label: 'CAM 18 · 호텔 식당',         privacy: false },
        { id: 19, site: 'hotel', label: 'CAM 19 · 호텔 뒤편 통로',    privacy: false },
        { id: 20, site: 'hotel', label: 'CAM 20 · 호텔 외부 전경',    privacy: false },
    ];

    const camFloorMap = {
        1: '1f', 2: '1f', 3: '1f', 4: '1f', 5: '1f',
        6: '2f', 7: '2f', 8: '2f', 9: '2f',
        10: 'rf', 11: 'rf', 12: 'rf',
    };

    // AI 카운트 저장
    const aiCounts = {};

    // ═══════════════════════════════════════════
    // 1. Crowd Counter Logic (+ / - Buttons)
    // ═══════════════════════════════════════════
    const MAX_CAPACITY = 100;
    document.querySelectorAll('.btn-count').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const el = e.target.closest('.btn-count');
            if (!el) return;
            const targetId = el.getAttribute('data-target');
            if (targetId) {
                const valElem = document.getElementById(targetId);
                let v = parseInt(valElem.innerText, 10);
                if (el.classList.contains('plus')) v += 1;
                else if (v > 0) v -= 1;
                valElem.innerText = v;
                updateCardStatus(targetId.replace('count-', ''), v);
            }
        });
    });

    function updateCardStatus(zone, value) {
        const card = document.getElementById(`card-${zone}`);
        const badge = document.getElementById(`badge-${zone}`);
        const prog = document.getElementById(`prog-${zone}`);
        if (!card || !badge || !prog) return;
        let ratio = Math.min((value / MAX_CAPACITY) * 100, 100);
        prog.style.width = `${ratio}%`;
        card.classList.remove('zone-green', 'zone-yellow', 'zone-red');
        if (value < 50) { card.classList.add('zone-green'); badge.innerText = '쾌적'; }
        else if (value < 80) { card.classList.add('zone-yellow'); badge.innerText = '보통'; }
        else { card.classList.add('zone-red'); badge.innerText = '혼잡 (입장제어)'; }
    }

    // ═══════════════════════════════════════════
    // 2. 뷰 모드 관리
    // ═══════════════════════════════════════════
    let currentMode = 'quad'; // quad | nine | snapshot | auto
    let currentFilter = 'all';
    let liveSlots = [1, 2, 3, 4]; // 실시간 표시 카메라 ID
    let autoTimer = null;
    let autoCountdown = null;
    let autoGroup = 0;

    const liveGrid = document.getElementById('cctvLiveGrid');
    const thumbGrid = document.getElementById('cctvThumbGrid');
    const thumbArea = document.getElementById('cctvThumbArea');
    const autoRotateBar = document.getElementById('autoRotateBar');

    // 뷰 모드 버튼
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            stopAutoRotate();
            if (currentMode === 'auto') startAutoRotate();
            renderCCTV();
        });
    });

    // 사이트 필터
    document.querySelectorAll('.cctv-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.cctv-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            renderCCTV();
        });
    });

    function getFilteredCameras() {
        if (currentFilter === 'all') return CAMERAS;
        return CAMERAS.filter(c => c.site === currentFilter);
    }

    function getSnapshotTime() {
        const now = new Date();
        return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    }

    // ═══════════════════════════════════════════
    // 3. CCTV 렌더링
    // ═══════════════════════════════════════════
    function renderCCTV() {
        const cams = getFilteredCameras();
        liveGrid.innerHTML = '';
        thumbGrid.innerHTML = '';

        if (currentMode === 'snapshot') {
            // 전체 스냅샷 모드 — GPU 부하 제로
            liveGrid.className = 'cctv-live-grid snapshot-all';
            thumbArea.style.display = 'none';
            autoRotateBar.style.display = 'none';

            cams.forEach(cam => {
                liveGrid.appendChild(createSnapshotFrame(cam, true));
            });

        } else {
            // 4분할 / 9분할 / 자동순환
            const slotCount = currentMode === 'nine' ? 9 : 4;
            liveGrid.className = `cctv-live-grid ${currentMode === 'nine' ? 'nine' : 'quad'}`;

            // 실시간 슬롯 보정
            if (liveSlots.length !== slotCount) {
                liveSlots = cams.slice(0, slotCount).map(c => c.id);
            }
            // 필터 변경 시 슬롯 보정
            const filteredIds = cams.map(c => c.id);
            liveSlots = liveSlots.filter(id => filteredIds.includes(id));
            while (liveSlots.length < slotCount && liveSlots.length < cams.length) {
                const next = cams.find(c => !liveSlots.includes(c.id));
                if (next) liveSlots.push(next.id);
                else break;
            }

            // 실시간 프레임
            liveSlots.forEach(camId => {
                const cam = CAMERAS.find(c => c.id === camId);
                if (cam) liveGrid.appendChild(createLiveFrame(cam));
            });

            // 나머지 썸네일
            const remaining = cams.filter(c => !liveSlots.includes(c.id));
            if (remaining.length > 0) {
                thumbArea.style.display = 'block';
                remaining.forEach(cam => {
                    thumbGrid.appendChild(createSnapshotFrame(cam, false));
                });
            } else {
                thumbArea.style.display = 'none';
            }

            // 자동순환 바
            autoRotateBar.style.display = currentMode === 'auto' ? 'flex' : 'none';
        }
    }

    function createLiveFrame(cam) {
        const div = document.createElement('div');
        div.className = `cctv-frame-live ${cam.privacy ? 'blurred-cam' : ''}`;
        div.dataset.camId = cam.id;
        const aiText = aiCounts[cam.id] ? `${aiCounts[cam.id]}명` : '--';
        div.innerHTML = `
            <div class="cctv-label">${cam.label}${cam.privacy ? ' <span class="privacy-tag">프라이버시</span>' : ''}</div>
            <div class="cctv-ai-count" id="aiCam${cam.id}">${aiText}</div>
            <div class="live-badge">LIVE</div>
            <div class="cctv-placeholder"><i class="fa-solid fa-${cam.privacy ? 'eye-slash' : 'camera-retro'}"></i> ${cam.privacy ? '흐림 처리 적용' : '실시간 스트림'}</div>
        `;
        div.addEventListener('click', () => openFullscreen(cam));
        return div;
    }

    function createSnapshotFrame(cam, isLargeMode) {
        const div = document.createElement('div');
        div.className = isLargeMode ? 'cctv-frame-live' : 'cctv-thumb';
        div.dataset.camId = cam.id;
        const aiText = aiCounts[cam.id] ? `${aiCounts[cam.id]}명` : '--';
        const time = getSnapshotTime();

        if (isLargeMode) {
            div.innerHTML = `
                <div class="cctv-label">${cam.label}</div>
                <div class="cctv-ai-count" id="aiCam${cam.id}">${aiText}</div>
                <div class="cctv-placeholder"><i class="fa-solid fa-image"></i> 스냅샷 (${time})</div>
            `;
            div.style.borderColor = 'rgba(255,255,255,0.08)';
        } else {
            div.innerHTML = `
                <div class="cctv-label" style="font-size:0.55rem; padding:2px 5px;">${cam.label}</div>
                <span class="snap-badge">SNAP</span>
                <span class="snap-time">${time}</span>
                <div class="cctv-placeholder" style="font-size:0.6rem;"><i class="fa-solid fa-image" style="font-size:1rem;"></i></div>
            `;
        }
        div.addEventListener('click', () => {
            if (!isLargeMode && currentMode !== 'snapshot') {
                // 썸네일 클릭 → 실시간 슬롯의 마지막과 교환
                const oldId = liveSlots[liveSlots.length - 1];
                liveSlots[liveSlots.length - 1] = cam.id;
                renderCCTV();
            } else {
                openFullscreen(cam);
            }
        });
        return div;
    }

    // ═══════════════════════════════════════════
    // 4. 전체 화면 모달 (개별 카메라)
    // ═══════════════════════════════════════════
    function openFullscreen(cam) {
        // 기존 모달이 있으면 제거
        const existing = document.getElementById('cctvFullModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'cctvFullModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;backdrop-filter:blur(8px);animation:fadeIn 0.3s;';

        const aiText = aiCounts[cam.id] ? `${aiCounts[cam.id]}명` : '--';
        modal.innerHTML = `
            <div style="width:90vw;max-width:1200px;aspect-ratio:16/9;background:#000;border:2px solid rgba(59,130,246,0.4);border-radius:16px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;">
                <div class="cctv-label" style="font-size:0.9rem;padding:6px 14px;">${cam.label}</div>
                <div class="cctv-ai-count" style="font-size:0.85rem;padding:4px 12px;" id="aiCamFull">${aiText}</div>
                <div style="position:absolute;top:12px;right:12px;background:rgba(239,68,68,0.85);color:#fff;padding:4px 12px;border-radius:6px;font-size:0.75rem;font-weight:700;display:flex;align-items:center;gap:6px;z-index:10;"><div class="pulse-dot" style="width:8px;height:8px;"></div> LIVE HD</div>
                <div class="cctv-placeholder" style="font-size:1rem;"><i class="fa-solid fa-camera-retro" style="font-size:3rem;"></i><br>고화질 실시간 스트림</div>
            </div>
            <div style="display:flex;gap:12px;align-items:center;">
                <span style="color:var(--text-secondary);font-size:0.85rem;">${cam.label} — ${cam.site === 'spa' ? '홍삼스파' : '홍삼빌호텔'}</span>
                <button id="closeFullModal" style="padding:8px 20px;border-radius:8px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);color:#fff;cursor:pointer;font-family:inherit;font-weight:600;font-size:0.85rem;">✕ 닫기 (ESC)</button>
            </div>
        `;

        document.body.appendChild(modal);
        document.getElementById('closeFullModal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', escHandler); }
        });
    }

    // ═══════════════════════════════════════════
    // 5. 자동 순환 모드
    // ═══════════════════════════════════════════
    const AUTO_INTERVAL = 10; // 초
    const GROUPS = [];
    function buildGroups() {
        const cams = getFilteredCameras();
        GROUPS.length = 0;
        for (let i = 0; i < cams.length; i += 4) {
            GROUPS.push(cams.slice(i, i + 4).map(c => c.id));
        }
    }

    function startAutoRotate() {
        buildGroups();
        if (GROUPS.length === 0) return;
        autoGroup = 0;
        applyAutoGroup();
        let countdown = AUTO_INTERVAL;

        autoCountdown = setInterval(() => {
            countdown--;
            const el = document.getElementById('autoCountdown');
            const fill = document.getElementById('autoRotateFill');
            if (el) el.textContent = countdown;
            if (fill) fill.style.width = `${(countdown / AUTO_INTERVAL) * 100}%`;

            if (countdown <= 0) {
                autoGroup = (autoGroup + 1) % GROUPS.length;
                applyAutoGroup();
                countdown = AUTO_INTERVAL;
            }
        }, 1000);
    }

    function applyAutoGroup() {
        if (!GROUPS[autoGroup]) return;
        liveSlots = [...GROUPS[autoGroup]];
        const el = document.getElementById('autoGroupNum');
        if (el) el.textContent = autoGroup + 1;
        renderCCTV();
    }

    function stopAutoRotate() {
        if (autoCountdown) { clearInterval(autoCountdown); autoCountdown = null; }
        if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    }

    const btnStopAuto = document.getElementById('btnStopAuto');
    if (btnStopAuto) {
        btnStopAuto.addEventListener('click', () => {
            stopAutoRotate();
            // 4분할로 복귀
            currentMode = 'quad';
            document.querySelectorAll('.view-mode-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('.view-mode-btn[data-mode="quad"]')?.classList.add('active');
            renderCCTV();
        });
    }

    // ═══════════════════════════════════════════
    // 6. AI 분석 시뮬레이션
    // ═══════════════════════════════════════════
    const btnAi = document.getElementById('btnAiAnalysis');
    const banner = document.getElementById('aiBanner');
    const lastUpdateEl = document.getElementById('aiLastUpdate');

    function runAiAnalysis() {
        if (banner) banner.classList.add('ai-running');
        if (btnAi) { btnAi.disabled = true; btnAi.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 분석 중...'; }

        setTimeout(() => {
            const floorTotals = { '1f': 0, '2f': 0, 'rf': 0 };

            for (let cam = 1; cam <= 20; cam++) {
                const floor = camFloorMap[cam];
                let count;
                if (floor === '1f') count = Math.floor(Math.random() * 12) + 2;
                else if (floor === '2f') count = Math.floor(Math.random() * 18) + 5;
                else if (floor === 'rf') count = Math.floor(Math.random() * 25) + 8;
                else count = Math.floor(Math.random() * 10) + 1;

                aiCounts[cam] = count;
                // DOM에 반영 (존재하면)
                const el = document.getElementById(`aiCam${cam}`);
                if (el) el.textContent = `${count}명`;

                if (floor && floorTotals.hasOwnProperty(floor)) {
                    floorTotals[floor] += count;
                }
            }

            Object.keys(floorTotals).forEach(zone => {
                const countEl = document.getElementById(`count-${zone}`);
                if (countEl) {
                    const val = Math.min(floorTotals[zone], 100);
                    countEl.innerText = val;
                    updateCardStatus(zone, val);
                }
            });

            const now = new Date();
            const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
            if (lastUpdateEl) lastUpdateEl.textContent = `마지막 분석: ${ts}`;

            if (banner) banner.classList.remove('ai-running');
            if (btnAi) { btnAi.disabled = false; btnAi.innerHTML = '<i class="fa-solid fa-robot"></i> AI 분석 실행'; }

            // 렌더링 갱신 (AI 카운트 반영)
            renderCCTV();
        }, 2000);
    }

    if (btnAi) btnAi.addEventListener('click', runAiAnalysis);
    setTimeout(runAiAnalysis, 1000);

    // ═══════════════════════════════════════════
    // 7. Hourly Traffic Line Chart
    // ═══════════════════════════════════════════
    const ctxTraffic = document.getElementById('trafficLineChart');
    if (ctxTraffic) {
        const body = document.body;
        const textColor = body.classList.contains('dark-theme') ? '#94A3B8' : '#6B7280';
        const gridColor = body.classList.contains('dark-theme') ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
        Chart.defaults.color = textColor;
        Chart.defaults.font.family = "'Inter', sans-serif";

        const trafficChart = new Chart(ctxTraffic.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '24:00'],
                datasets: [
                    { label: '1층 (로비/정원)', data: [5, 12, 35, 40, 45, 30, 24, 15, 8, 2], borderColor: '#10B981', tension: 0.4, borderWidth: 3, pointRadius: 2, backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true },
                    { label: '2층 (대온천탕)', data: [10, 25, 45, 60, 50, 65, 80, 58, 40, 15], borderColor: '#F59E0B', tension: 0.4, borderWidth: 3, pointRadius: 2, backgroundColor: 'transparent', fill: false },
                    { label: '루프탑 (수영장/사우나)', data: [2, 5, 20, 45, 60, 95, 85, 50, 20, 5], borderColor: '#EF4444', tension: 0.4, borderWidth: 3, pointRadius: 2, backgroundColor: 'transparent', fill: false }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 20 } } },
                scales: {
                    y: { beginAtZero: true, max: 120, grid: { color: gridColor }, title: { display: true, text: '체류 인원수 (명)' } },
                    x: { grid: { display: false } }
                }
            }
        });

        window.updateTrafficChartTheme = function() {
            const isDark = document.body.classList.contains('dark-theme');
            trafficChart.options.scales.y.grid.color = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
            Chart.defaults.color = isDark ? '#94A3B8' : '#6B7280';
            trafficChart.update();
        };

        const themeToggleBtn = document.getElementById('themeToggle');
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => { setTimeout(window.updateTrafficChartTheme, 50); });
        }
    }

    // ═══════════════════════════════════════════
    // 초기 렌더링
    // ═══════════════════════════════════════════
    renderCCTV();
});
