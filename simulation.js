// 홍삼한방타운 ERP — 경영시뮬레이션 모듈 (simulation.js v2 - Claude AI 연동)
document.addEventListener('DOMContentLoaded', () => {

    // ── Unit Toggle ──
    const unitBtns = document.querySelectorAll('.sim-unit-btn');
    unitBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            unitBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // ── Revenue Trend Chart (12개월) ──
    const revCtx = document.getElementById('simRevenueChart');
    if (revCtx && typeof Chart !== 'undefined') {
        const isDark = document.body.classList.contains('dark-theme');
        new Chart(revCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['6월','7월','8월','9월','10월','11월','12월','1월','2월','3월','4월','5월'],
                datasets: [
                    {
                        label: '홍삼스파 매출',
                        data: [120, 145, 168, 135, 118, 105, 95, 88, 102, 125, 142, 155],
                        borderColor: '#8B5CF6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        tension: 0.4, borderWidth: 2.5, pointRadius: 3, fill: true
                    },
                    {
                        label: '홍삼빌호텔 매출',
                        data: [85, 95, 112, 88, 72, 65, 58, 52, 68, 82, 98, 113],
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4, borderWidth: 2.5, pointRadius: 3, fill: true
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { usePointStyle: true, padding: 20, color: isDark ? '#94A3B8' : '#6B7280' } },
                    tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ₩${ctx.parsed.y.toLocaleString()}백만` } }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, ticks: { callback: v => `₩${v}M`, color: isDark ? '#94A3B8' : '#6B7280' } },
                    x: { grid: { display: false }, ticks: { color: isDark ? '#94A3B8' : '#6B7280' } }
                }
            }
        });
    }

    // ── Cost Breakdown Doughnut ──
    const costCtx = document.getElementById('simCostChart');
    if (costCtx && typeof Chart !== 'undefined') {
        new Chart(costCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['인건비', '식음료/자재', '공과금(전기/가스/수도)', '마케팅', '감가상각', '기타'],
                datasets: [{ data: [42, 18, 16, 8, 10, 6], backgroundColor: ['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EC4899','#6B7280'], borderWidth: 0, hoverOffset: 6 }]
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16, font: { size: 11 } } } } }
        });
    }

    // ── What-If Simulation Sliders ──
    const sliders = { spaVisitors: document.getElementById('sliderSpaVisitors'), occupancy: document.getElementById('sliderOccupancy'), avgSpend: document.getElementById('sliderAvgSpend'), adr: document.getElementById('sliderADR') };
    const vals = { spaVisitors: document.getElementById('valSpaVisitors'), occupancy: document.getElementById('valOccupancy'), avgSpend: document.getElementById('valAvgSpend'), adr: document.getElementById('valADR') };
    const results = { spa: document.getElementById('resultSpaMonthlySales'), hotel: document.getElementById('resultHotelMonthlySales'), total: document.getElementById('resultTotalMonthlySales') };
    const HOTEL_ROOMS = 43, DAYS_IN_MONTH = 30;

    function calculateSimulation() {
        const sv = parseInt(sliders.spaVisitors.value), oc = parseInt(sliders.occupancy.value), as = parseInt(sliders.avgSpend.value), ad = parseInt(sliders.adr.value);
        vals.spaVisitors.textContent = `${sv}명`; vals.occupancy.textContent = `${oc}%`; vals.avgSpend.textContent = `₩${as.toLocaleString()}`; vals.adr.textContent = `₩${ad.toLocaleString()}`;
        const spa = sv * as * DAYS_IN_MONTH, hotel = Math.floor(HOTEL_ROOMS * (oc/100) * ad * DAYS_IN_MONTH), total = spa + hotel;
        results.spa.textContent = `₩ ${spa.toLocaleString()}`; results.hotel.textContent = `₩ ${hotel.toLocaleString()}`; results.total.textContent = `₩ ${total.toLocaleString()}`;
    }

    Object.values(sliders).forEach(s => { if(s) s.addEventListener('input', calculateSimulation); });
    calculateSimulation();

    // ═══════════════════════════════════════════════════════
    // AI Daily 경영분석 리포트 — 실제 Claude API 연동
    // ═══════════════════════════════════════════════════════
    const btnAiReport = document.getElementById('btnRunAiReport');
    const aiLoading = document.getElementById('aiLoading');
    const aiReportBody = document.getElementById('aiReportBody');
    const aiReportTime = document.getElementById('aiReportTime');
    const AI_PROXY_URL = '/api/ai-analyze';

    function collectERPData() {
        return {
            revenue: 268500000, cost: 185200000, profit: 83300000,
            occupancy: 67.4, profitMargin: 31.0,
            laborCostRatio: 42, fbCostRatio: 18, utilityCostRatio: 16, marketingCostRatio: 8,
            spaMonthly: [120,145,168,135,118,105,95,88,102,125,142,155],
            hotelMonthly: [85,95,112,88,72,65,58,52,68,82,98,113],
            hotelRooms: 43, date: new Date().toLocaleDateString('ko-KR')
        };
    }

    function buildPrompt(data) {
        return `당신은 홍삼한방타운(홍삼스파+홍삼빌호텔)의 전문 경영 컨설턴트 AI입니다.
아래 경영 데이터를 바탕으로 상세한 Daily 경영분석 리포트를 작성하세요.

[금일 경영 데이터 - ${data.date}]
- 월간 총 매출: ${data.revenue.toLocaleString()}원
- 월간 총 비용: ${data.cost.toLocaleString()}원
- 영업이익: ${data.profit.toLocaleString()}원 (영업이익률 ${data.profitMargin}%)
- 호텔 객실가동률: ${data.occupancy}% (총 ${data.hotelRooms}실)
- 비용구조: 인건비 ${data.laborCostRatio}%, 식음료 ${data.fbCostRatio}%, 공과금 ${data.utilityCostRatio}%, 마케팅 ${data.marketingCostRatio}%
- 홍삼스파 최근12개월 매출(백만원): ${data.spaMonthly.join(',')}
- 홍삼빌호텔 최근12개월 매출(백만원): ${data.hotelMonthly.join(',')}

반드시 아래 JSON 형식으로만 응답하세요. JSON 외의 텍스트를 절대 추가하지 마세요:
{"summary":"종합 요약 3~4문장. HTML strong 태그로 핵심 수치 강조","revenue":{"metrics":[{"label":"지표명","value":"값","trend":"up 또는 down 또는 neutral"}],"insight":"매출 인사이트 1~2문장"},"cashflow":{"metrics":[{"label":"지표명","value":"값","trend":"up 또는 down 또는 neutral"}],"insight":"현금흐름 인사이트"},"cost":{"metrics":[{"label":"지표명","value":"값","trend":"up 또는 down 또는 neutral"}],"insight":"비용 인사이트"},"risks":[{"level":"high 또는 medium 또는 low","text":"위험요소 설명"}],"actions":[{"title":"액션 제목","desc":"구체적 실행방안","priority":"high 또는 medium 또는 low"}]}

metrics 4~6개, risks 3~5개, actions 5개를 포함하세요. 모두 한국어로 작성하세요.`;
    }

    function renderAIReport(report) {
        const now = new Date();
        const ts = now.getFullYear() + '년 ' + (now.getMonth()+1) + '월 ' + now.getDate() + '일 ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
        document.getElementById('aiSummaryText').innerHTML = report.summary;

        function rm(id, d) {
            let h = '';
            d.metrics.forEach(function(m) {
                var c = m.trend === 'up' ? 'up' : m.trend === 'down' ? 'down' : '';
                h += '<div class="ai-metric"><span class="label">' + m.label + '</span><span class="value ' + c + '">' + m.value + '</span></div>';
            });
            h += '<div class="ai-insight">' + d.insight + '</div>';
            document.getElementById(id).innerHTML = h;
        }
        rm('aiRevAnalysis', report.revenue);
        rm('aiCashAnalysis', report.cashflow);
        rm('aiCostAnalysis', report.cost);

        var rh = '';
        report.risks.forEach(function(r) {
            var ic = r.level === 'high' ? '🔴' : r.level === 'medium' ? '🟡' : '🟢';
            rh += '<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.03)">' + ic + ' ' + r.text + '</div>';
        });
        document.getElementById('aiRiskAnalysis').innerHTML = rh;

        var ah = '';
        report.actions.forEach(function(a, i) {
            var pr = a.priority === 'high' ? '긴급' : a.priority === 'medium' ? '중요' : '참고';
            ah += '<div class="ai-action-item"><div class="ai-action-num">' + (i+1) + '</div><div class="ai-action-content"><div class="title">' + a.title + '</div><div class="desc">' + a.desc + '</div></div><span class="ai-action-priority ' + a.priority + '">' + pr + '</span></div>';
        });
        document.getElementById('aiActionList').innerHTML = ah;
        aiReportTime.textContent = ts + ' · Claude AI 분석';
    }

    if (btnAiReport) {
        btnAiReport.addEventListener('click', async function() {
            aiLoading.style.display = 'block';
            aiReportBody.style.display = 'none';
            btnAiReport.disabled = true;
            btnAiReport.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Claude AI 분석 중...';
            try {
                var data = collectERPData();
                var response = await fetch(AI_PROXY_URL, {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({ prompt: buildPrompt(data) })
                });
                if (!response.ok) throw new Error('API 오류: ' + response.status);
                var result = await response.json();
                var txt = (result.content && result.content[0]) ? result.content[0].text : '';
                if (!txt) throw new Error('AI 응답 없음');
                var match = txt.match(/\{[\s\S]*\}/);
                if (!match) throw new Error('JSON 파싱 실패');
                renderAIReport(JSON.parse(match[0]));
                aiLoading.style.display = 'none';
                aiReportBody.style.display = 'block';
                btnAiReport.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> AI 재분석';
                document.getElementById('aiReportSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
            } catch (err) {
                console.error('AI 분석 오류:', err);
                aiLoading.style.display = 'none';
                alert('AI 분석 오류: ' + err.message + '\n\nAI 프록시 서버(ai-proxy.js)가 실행 중인지 확인하세요.');
                btnAiReport.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> AI 분석 재시도';
            }
            btnAiReport.disabled = false;
        });
    }

});
