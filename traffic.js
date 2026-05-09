document.addEventListener('DOMContentLoaded', () => {

    // ═══════════════════════════════════════════
    // 1. Crowd Counter Logic (+ / - Buttons)
    // ═══════════════════════════════════════════
    const btnCounts = document.querySelectorAll('.btn-count');
    const MAX_CAPACITY = 100;
    
    btnCounts.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const el = e.target.closest('.btn-count');
            if (!el) return;
            const isPlus = el.classList.contains('plus');
            const targetId = el.getAttribute('data-target');
            
            if(targetId) {
                const valElem = document.getElementById(targetId);
                let currentVal = parseInt(valElem.innerText, 10);
                
                if(isPlus) { currentVal += 1; }
                else { if (currentVal > 0) currentVal -= 1; }
                
                valElem.innerText = currentVal;
                updateCardStatus(targetId.replace('count-', ''), currentVal);
            }
        });
    });

    function updateCardStatus(zonePrefix, value) {
        const card = document.getElementById(`card-${zonePrefix}`);
        const badge = document.getElementById(`badge-${zonePrefix}`);
        const prog = document.getElementById(`prog-${zonePrefix}`);
        
        let ratio = (value / MAX_CAPACITY) * 100;
        if(ratio > 100) ratio = 100;
        
        prog.style.width = `${ratio}%`;
        card.classList.remove('zone-green', 'zone-yellow', 'zone-red');
        
        if (value < 50) {
            card.classList.add('zone-green');
            badge.innerText = '쾌적';
        } else if (value >= 50 && value < 80) {
            card.classList.add('zone-yellow');
            badge.innerText = '보통';
        } else {
            card.classList.add('zone-red');
            badge.innerText = '혼잡 (입장제어)';
        }
    }

    // ═══════════════════════════════════════════
    // 2. CCTV Filter Tabs (전체 / 홍삼스파 / 홍삼빌호텔)
    // ═══════════════════════════════════════════
    const tabs = document.querySelectorAll('.cctv-tab');
    const frames = document.querySelectorAll('.cctv-frame');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const filter = tab.getAttribute('data-filter');

            frames.forEach(frame => {
                if (filter === 'all') {
                    frame.classList.remove('hidden');
                } else {
                    frame.classList.toggle('hidden', frame.getAttribute('data-site') !== filter);
                }
            });
        });
    });

    // ═══════════════════════════════════════════
    // 3. AI 분석 시뮬레이션 (데모)
    // ═══════════════════════════════════════════
    const btnAi = document.getElementById('btnAiAnalysis');
    const banner = document.getElementById('aiBanner');
    const lastUpdateEl = document.getElementById('aiLastUpdate');

    // 카메라별 층 매핑
    const camFloorMap = {
        1: '1f', 2: '1f', 3: '1f', 4: '1f', 5: '1f',
        6: '2f', 7: '2f', 8: '2f', 9: '2f',
        10: 'rf', 11: 'rf', 12: 'rf',
        13: null, 14: null, 15: null, 16: null,
        17: null, 18: null, 19: null, 20: null
    };

    function runAiAnalysis() {
        // 분석 중 표시
        banner.classList.add('ai-running');
        if(btnAi) { btnAi.disabled = true; btnAi.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 분석 중...'; }

        setTimeout(() => {
            // 각 카메라별 AI 인원수 생성 (시뮬레이션)
            const floorTotals = { '1f': 0, '2f': 0, 'rf': 0 };

            for (let cam = 1; cam <= 20; cam++) {
                let count;
                const floor = camFloorMap[cam];
                
                // 층별 현실적인 범위
                if (floor === '1f') count = Math.floor(Math.random() * 12) + 2;
                else if (floor === '2f') count = Math.floor(Math.random() * 18) + 5;
                else if (floor === 'rf') count = Math.floor(Math.random() * 25) + 8;
                else count = Math.floor(Math.random() * 10) + 1; // 호텔

                const el = document.getElementById(`aiCam${cam}`);
                if (el) el.textContent = `${count}명`;

                if (floor && floorTotals.hasOwnProperty(floor)) {
                    floorTotals[floor] += count;
                }
            }

            // 층별 합산 결과를 밀집도 카드에 반영
            Object.keys(floorTotals).forEach(zone => {
                const countEl = document.getElementById(`count-${zone}`);
                if (countEl) {
                    // 최대 100명 캡
                    const val = Math.min(floorTotals[zone], 100);
                    countEl.innerText = val;
                    updateCardStatus(zone, val);
                }
            });

            // 타임스탬프 업데이트
            const now = new Date();
            const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
            if(lastUpdateEl) lastUpdateEl.textContent = `마지막 분석: ${ts}`;

            // 완료 표시
            banner.classList.remove('ai-running');
            if(btnAi) { btnAi.disabled = false; btnAi.innerHTML = '<i class="fa-solid fa-robot"></i> AI 분석 실행'; }

        }, 2000); // 2초 분석 시뮬레이션
    }

    if (btnAi) {
        btnAi.addEventListener('click', runAiAnalysis);
    }

    // 초기 1회 자동 실행
    setTimeout(runAiAnalysis, 1000);

    // ═══════════════════════════════════════════
    // 4. Hourly Traffic Line Chart
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
                    {
                        label: '1층 (로비/정원)',
                        data: [5, 12, 35, 40, 45, 30, 24, 15, 8, 2],
                        borderColor: '#10B981',
                        tension: 0.4, borderWidth: 3, pointRadius: 2,
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true
                    },
                    {
                        label: '2층 (대온천탕)',
                        data: [10, 25, 45, 60, 50, 65, 80, 58, 40, 15],
                        borderColor: '#F59E0B',
                        tension: 0.4, borderWidth: 3, pointRadius: 2,
                        backgroundColor: 'transparent', fill: false
                    },
                    {
                        label: '루프탑 (수영장/사우나)',
                        data: [2, 5, 20, 45, 60, 95, 85, 50, 20, 5],
                        borderColor: '#EF4444',
                        tension: 0.4, borderWidth: 3, pointRadius: 2,
                        backgroundColor: 'transparent', fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { usePointStyle: true, boxWidth: 8, padding: 20 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true, max: 120,
                        grid: { color: gridColor },
                        title: { display: true, text: '체류 인원수 (명)' }
                    },
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
            themeToggleBtn.addEventListener('click', () => {
                setTimeout(window.updateTrafficChartTheme, 50);
            });
        }
    }

});
