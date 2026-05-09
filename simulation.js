// 홍삼한방타운 ERP — 경영시뮬레이션 모듈 (simulation.js v1)
document.addEventListener('DOMContentLoaded', () => {

    // ── Unit Toggle ──
    const unitBtns = document.querySelectorAll('.sim-unit-btn');
    unitBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            unitBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // TODO: 데이터 소스 전환 로직 (통합/스파/호텔)
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
                        tension: 0.4,
                        borderWidth: 2.5,
                        pointRadius: 3,
                        fill: true
                    },
                    {
                        label: '홍삼빌호텔 매출',
                        data: [85, 95, 112, 88, 72, 65, 58, 52, 68, 82, 98, 113],
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        borderWidth: 2.5,
                        pointRadius: 3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { 
                            usePointStyle: true, 
                            padding: 20,
                            color: isDark ? '#94A3B8' : '#6B7280'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx => `${ctx.dataset.label}: ₩${ctx.parsed.y.toLocaleString()}백만`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                        ticks: {
                            callback: v => `₩${v}M`,
                            color: isDark ? '#94A3B8' : '#6B7280'
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: isDark ? '#94A3B8' : '#6B7280' }
                    }
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
                datasets: [{
                    data: [42, 18, 16, 8, 10, 6],
                    backgroundColor: [
                        '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280'
                    ],
                    borderWidth: 0,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 16,
                            font: { size: 11 }
                        }
                    }
                }
            }
        });
    }

    // ── What-If Simulation Sliders ──
    const sliders = {
        spaVisitors: document.getElementById('sliderSpaVisitors'),
        occupancy: document.getElementById('sliderOccupancy'),
        avgSpend: document.getElementById('sliderAvgSpend'),
        adr: document.getElementById('sliderADR')
    };
    const vals = {
        spaVisitors: document.getElementById('valSpaVisitors'),
        occupancy: document.getElementById('valOccupancy'),
        avgSpend: document.getElementById('valAvgSpend'),
        adr: document.getElementById('valADR')
    };
    const results = {
        spa: document.getElementById('resultSpaMonthlySales'),
        hotel: document.getElementById('resultHotelMonthlySales'),
        total: document.getElementById('resultTotalMonthlySales')
    };

    const HOTEL_ROOMS = 43;
    const DAYS_IN_MONTH = 30;

    function calculateSimulation() {
        const spaVisitors = parseInt(sliders.spaVisitors.value);
        const occupancy = parseInt(sliders.occupancy.value);
        const avgSpend = parseInt(sliders.avgSpend.value);
        const adr = parseInt(sliders.adr.value);

        // Display values
        vals.spaVisitors.textContent = `${spaVisitors}명`;
        vals.occupancy.textContent = `${occupancy}%`;
        vals.avgSpend.textContent = `₩${avgSpend.toLocaleString()}`;
        vals.adr.textContent = `₩${adr.toLocaleString()}`;

        // Calculate
        const spaMonthlySales = spaVisitors * avgSpend * DAYS_IN_MONTH;
        const hotelMonthlySales = Math.floor(HOTEL_ROOMS * (occupancy / 100) * adr * DAYS_IN_MONTH);
        const totalMonthlySales = spaMonthlySales + hotelMonthlySales;

        // Display results
        results.spa.textContent = `₩ ${spaMonthlySales.toLocaleString()}`;
        results.hotel.textContent = `₩ ${hotelMonthlySales.toLocaleString()}`;
        results.total.textContent = `₩ ${totalMonthlySales.toLocaleString()}`;
    }

    // Bind sliders
    Object.values(sliders).forEach(slider => {
        if (slider) {
            slider.addEventListener('input', calculateSimulation);
        }
    });

    // Initial calculation
    calculateSimulation();

    // ═══════════════════════════════════════════════════════
    // AI Daily 경영분석 리포트 엔진
    // ═══════════════════════════════════════════════════════
    const btnAiReport = document.getElementById('btnRunAiReport');
    const aiLoading = document.getElementById('aiLoading');
    const aiReportBody = document.getElementById('aiReportBody');
    const aiReportTime = document.getElementById('aiReportTime');

    // 현재 ERP 데이터 수집 (페이지 내 KPI 값 기반)
    function collectERPData() {
        const getText = id => {
            const el = document.getElementById(id);
            return el ? el.textContent.replace(/[₩,\s명%]/g, '') : '0';
        };
        const revenue = parseFloat(getText('simRevenue')) || 268500000;
        const cost = parseFloat(getText('simCost')) || 185200000;
        const profit = parseFloat(getText('simProfit')) || 83300000;
        const occupancy = parseFloat(getText('simOccupancy')) || 67.4;

        const now = new Date();
        const dayOfMonth = now.getDate();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

        return {
            revenue, cost, profit, occupancy, dayOfMonth, daysInMonth,
            profitMargin: ((profit / revenue) * 100).toFixed(1),
            costRatio: ((cost / revenue) * 100).toFixed(1),
            dailyAvgRev: Math.floor(revenue / dayOfMonth),
            projectedMonthRev: Math.floor((revenue / dayOfMonth) * daysInMonth),
            laborCostRatio: 42,
            fbCostRatio: 18,
            utilityCostRatio: 16,
            marketingCostRatio: 8,
            depreciationRatio: 10,
            etcCostRatio: 6,
            spaMonthlyData: [120,145,168,135,118,105,95,88,102,125,142,155],
            hotelMonthlyData: [85,95,112,88,72,65,58,52,68,82,98,113]
        };
    }

    // AI 분석 리포트 생성
    function generateAIReport(data) {
        const now = new Date();
        const dateStr = `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일`;
        const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

        // 매출 트렌드 분석
        const spaData = data.spaMonthlyData;
        const hotelData = data.hotelMonthlyData;
        const spaTrend = spaData[11] - spaData[10];
        const hotelTrend = hotelData[11] - hotelData[10];
        const spaPeak = Math.max(...spaData);
        const spaPeakMonth = spaData.indexOf(spaPeak) + 6 > 12 ? spaData.indexOf(spaPeak) + 6 - 12 : spaData.indexOf(spaPeak) + 6;

        // 종합 요약
        const summaryHTML = `
            <strong>${dateStr} ${timeStr} 기준</strong> 경영성적 분석 결과입니다.<br><br>
            금월 통합 매출은 <strong>₩${(data.revenue/100000000).toFixed(1)}억원</strong>으로, 
            영업이익률 <strong>${data.profitMargin}%</strong>를 기록하고 있습니다. 
            일평균 매출 <strong>₩${data.dailyAvgRev.toLocaleString()}</strong>원 기준, 
            월말 예상 매출은 <strong>₩${data.projectedMonthRev.toLocaleString()}</strong>원으로 추정됩니다.
            호텔 객실가동률은 <strong>${data.occupancy}%</strong>로 
            ${data.occupancy >= 70 ? '양호한 수준입니다.' : '개선이 필요한 수준입니다.'}
        `;

        // 매출 분석 카드
        const revHTML = `
            <div class="ai-metric"><span class="label">금월 누적 매출</span><span class="value">₩${(data.revenue/10000).toLocaleString()}만</span></div>
            <div class="ai-metric"><span class="label">일평균 매출</span><span class="value">₩${(data.dailyAvgRev/10000).toLocaleString()}만</span></div>
            <div class="ai-metric"><span class="label">월말 예상 매출</span><span class="value up">₩${(data.projectedMonthRev/10000).toLocaleString()}만</span></div>
            <div class="ai-metric"><span class="label">스파 전월 대비</span><span class="value ${spaTrend>=0?'up':'down'}">${spaTrend>=0?'▲':'▼'} ${Math.abs(((spaTrend/spaData[10])*100).toFixed(1))}%</span></div>
            <div class="ai-metric"><span class="label">호텔 전월 대비</span><span class="value ${hotelTrend>=0?'up':'down'}">${hotelTrend>=0?'▲':'▼'} ${Math.abs(((hotelTrend/hotelData[10])*100).toFixed(1))}%</span></div>
            <div class="ai-insight">📊 스파 매출 성수기는 ${spaPeakMonth}월(₩${spaPeak}백만)이며, 현재 ${spaTrend>=0?'상승':'하락'} 추세입니다. ${spaTrend>=0?'성수기 진입에 따른 가격 전략 검토를 권장합니다.':'비수기 대응 프로모션 기획이 필요합니다.'}</div>
        `;

        // 현금흐름 분석
        const netCashflow = data.revenue - data.cost;
        const cashHTML = `
            <div class="ai-metric"><span class="label">금월 수입(매출)</span><span class="value up">₩${(data.revenue/10000).toLocaleString()}만</span></div>
            <div class="ai-metric"><span class="label">금월 지출(비용)</span><span class="value down">₩${(data.cost/10000).toLocaleString()}만</span></div>
            <div class="ai-metric"><span class="label">순 현금흐름</span><span class="value ${netCashflow>=0?'up':'down'}">₩${(netCashflow/10000).toLocaleString()}만</span></div>
            <div class="ai-metric"><span class="label">영업이익률</span><span class="value">${data.profitMargin}%</span></div>
            <div class="ai-metric"><span class="label">비용 대비 매출</span><span class="value">${(data.revenue/data.cost).toFixed(2)}배</span></div>
            <div class="ai-insight">💰 현금흐름은 ${netCashflow>=0?'흑자':'적자'} 상태입니다. ${data.profitMargin >= 30 ? '영업이익률 30% 이상으로 건전한 수익구조를 유지하고 있습니다.' : '영업이익률 개선을 위해 비용 절감 또는 매출 확대 전략이 필요합니다.'}</div>
        `;

        // 비용 구조 진단
        const costHTML = `
            <div class="ai-metric"><span class="label">인건비 비중</span><span class="value ${data.laborCostRatio>40?'down':''}">${data.laborCostRatio}%</span></div>
            <div class="ai-metric"><span class="label">식음료/자재비</span><span class="value">${data.fbCostRatio}%</span></div>
            <div class="ai-metric"><span class="label">공과금 (전기/가스/수도)</span><span class="value">${data.utilityCostRatio}%</span></div>
            <div class="ai-metric"><span class="label">마케팅비</span><span class="value">${data.marketingCostRatio}%</span></div>
            <div class="ai-metric"><span class="label">감가상각비</span><span class="value">${data.depreciationRatio}%</span></div>
            <div class="ai-metric"><span class="label">기타</span><span class="value">${data.etcCostRatio}%</span></div>
            <div class="ai-insight">⚙️ 인건비(${data.laborCostRatio}%)가 전체 비용의 최대 비중을 차지합니다. ${data.laborCostRatio>40 ? '업계 평균(38~42%) 상단에 위치하며, 생산성 대비 인건비 효율성 점검이 필요합니다.' : '업계 평균 범위 내에서 관리되고 있습니다.'}</div>
        `;

        // 위험요소
        const risks = [];
        if (data.occupancy < 60) risks.push({level:'high', text:'호텔 객실가동률이 60% 미만으로 매우 낮습니다. 객단가 인하 또는 패키지 상품 검토가 시급합니다.'});
        if (data.occupancy < 70) risks.push({level:'medium', text:`호텔 객실가동률(${data.occupancy}%)이 손익분기 기준(70%)에 미달합니다. OTA 채널 확대를 검토하세요.`});
        if (data.laborCostRatio > 42) risks.push({level:'high', text:'인건비 비중이 42%를 초과했습니다. 파트타임 인력 비율 조정 또는 근무 스케줄 최적화를 검토하세요.'});
        if (data.profitMargin < 25) risks.push({level:'high', text:`영업이익률(${data.profitMargin}%)이 25% 미만으로 수익성 악화 위험이 있습니다.`});
        if (spaTrend < 0) risks.push({level:'medium', text:'스파 매출이 전월 대비 하락세입니다. 비수기 프로모션 또는 단체 할인 프로그램을 검토하세요.'});
        risks.push({level:'low', text:'공과금(전기/가스/수도) 비중이 16%로 안정적이나, 하절기 냉방비 증가에 대비한 에너지 절감 계획을 수립하세요.'});

        let riskHTML = '';
        risks.forEach(r => {
            const icon = r.level === 'high' ? '🔴' : r.level === 'medium' ? '🟡' : '🟢';
            riskHTML += `<div style="padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.03);">${icon} ${r.text}</div>`;
        });

        // CEO 액션 아이템
        const actions = [
            { title: '호텔 OTA 채널 최적화', desc: `현재 가동률 ${data.occupancy}% → 목표 80%. 야놀자/여기어때 프로모션 및 주중 할인 패키지를 이번 주 내 런칭하세요.`, priority: 'high' },
            { title: '스파 성수기 가격 전략 수립', desc: '7~8월 성수기 도래 전 입장료 단계별 인상안(₩2,000~₩5,000)을 경영회의에서 논의하세요.', priority: 'medium' },
            { title: '인건비 효율 개선', desc: `인건비 비중 ${data.laborCostRatio}%. 파트타임 인력 비율 조정 및 교차근무 시스템 도입으로 2%p 절감을 목표하세요.`, priority: 'high' },
            { title: 'F&B 매출 부대수익 강화', desc: '카페 및 루프탑 바 메뉴 리뉴얼, 시즌 한정 메뉴 도입으로 객단가 ₩3,000 이상 상승을 추진하세요.', priority: 'medium' },
            { title: '에너지 비용 절감 계획', desc: '하절기 전력 사용량 피크 대비, LED 전환 및 보일러 효율 점검을 5월 내 완료하세요.', priority: 'low' }
        ];

        let actionHTML = '';
        actions.forEach((a, i) => {
            actionHTML += `
                <div class="ai-action-item">
                    <div class="ai-action-num">${i+1}</div>
                    <div class="ai-action-content">
                        <div class="title">${a.title}</div>
                        <div class="desc">${a.desc}</div>
                    </div>
                    <span class="ai-action-priority ${a.priority}">${a.priority === 'high' ? '긴급' : a.priority === 'medium' ? '중요' : '참고'}</span>
                </div>
            `;
        });

        return { summaryHTML, revHTML, cashHTML, costHTML, riskHTML, actionHTML, timeStr: `${dateStr} ${timeStr}` };
    }

    // AI 분석 실행
    if (btnAiReport) {
        btnAiReport.addEventListener('click', () => {
            // 로딩 표시
            aiLoading.style.display = 'block';
            aiReportBody.style.display = 'none';
            btnAiReport.disabled = true;
            btnAiReport.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 분석 중...';

            // 3초 후 결과 표시 (AI 분석 시뮬레이션)
            setTimeout(() => {
                const data = collectERPData();
                const report = generateAIReport(data);

                document.getElementById('aiSummaryText').innerHTML = report.summaryHTML;
                document.getElementById('aiRevAnalysis').innerHTML = report.revHTML;
                document.getElementById('aiCashAnalysis').innerHTML = report.cashHTML;
                document.getElementById('aiCostAnalysis').innerHTML = report.costHTML;
                document.getElementById('aiRiskAnalysis').innerHTML = report.riskHTML;
                document.getElementById('aiActionList').innerHTML = report.actionHTML;
                aiReportTime.textContent = report.timeStr;

                aiLoading.style.display = 'none';
                aiReportBody.style.display = 'block';
                btnAiReport.disabled = false;
                btnAiReport.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> AI 재분석';

                // 스크롤 이동
                document.getElementById('aiReportSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 3000);
        });
    }

});
