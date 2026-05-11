// 홍삼한방타운 ERP — 경영시뮬레이션 모듈 (simulation.js v4)
document.addEventListener('DOMContentLoaded', function() {

    // ── Unit Toggle ──
    var unitBtns = document.querySelectorAll('.sim-unit-btn');
    unitBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            unitBtns.forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
        });
    });

    // ── Revenue Trend Chart (12개월) ──
    var revCtx = document.getElementById('simRevenueChart');
    var revChart = null;
    var isDark = document.body.classList.contains('dark-theme');
    if (revCtx && typeof Chart !== 'undefined') {
        revChart = new Chart(revCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    { label: '홍삼스파 매출', data: [], borderColor: '#8B5CF6', backgroundColor: 'rgba(139,92,246,0.1)', tension: 0.4, borderWidth: 2.5, pointRadius: 3, fill: true },
                    { label: '홍삼빌호텔 매출', data: [], borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.1)', tension: 0.4, borderWidth: 2.5, pointRadius: 3, fill: true }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { usePointStyle: true, padding: 20, color: isDark ? '#94A3B8' : '#6B7280' } },
                    tooltip: { callbacks: { label: function(ctx) { return ctx.dataset.label + ': ₩' + ctx.parsed.y.toLocaleString() + '천원'; } } }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, ticks: { callback: function(v) { return '₩' + (v/1000).toFixed(0) + 'M'; }, color: isDark ? '#94A3B8' : '#6B7280' } },
                    x: { grid: { display: false }, ticks: { color: isDark ? '#94A3B8' : '#6B7280' } }
                }
            }
        });
    }

    async function loadSimulationData() {
        let hotelApiData = [];
        try {
            const cached = JSON.parse(localStorage.getItem('erp_hotel_api_cache') || '{}');
            if (cached.ts && (Date.now() - cached.ts < 30 * 60 * 1000) && cached.data) {
                hotelApiData = cached.data;
            } else {
                const res = await fetch('https://hongsam.dothome.co.kr/api.php?action=load');
                if (res.ok) hotelApiData = await res.json();
            }
        } catch(e) {
            try { hotelApiData = JSON.parse(localStorage.getItem('erp_hotel_api_cache') || '{}').data || []; } catch(e2) {}
        }

        let revDb = {};
        try { revDb = JSON.parse(localStorage.getItem('erp_revenue_db') || '{}'); } catch(e) {}

        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');

        let hotelMonthRev = 0;
        let spaMonthRev = 0;
        let spaMonthExp = 0;
        let hotelLatestOcc = 0;

        // 호텔 당월 매출 및 최신 점유율
        let hotelLatestRec = null;
        if (hotelApiData.length > 0) {
            const sorted = hotelApiData.sort((a, b) => b.date.localeCompare(a.date));
            hotelLatestRec = sorted[0];
            hotelLatestOcc = hotelLatestRec.metrics.occRate || 0;
        }

        hotelApiData.forEach(r => {
            if (r.date.startsWith(`${y}-${m}`)) hotelMonthRev += (r.revenue.total || 0);
        });

        Object.keys(revDb).forEach(k => {
            if (k.startsWith(`${y}-${m}`)) {
                const r = revDb[k];
                spaMonthRev += ((r.spaTickRev || 0) + (r.spaFbRev || 0)) * 10000;
                spaMonthExp += (r.spaExpTotal || 0) * 10000;
            }
        });

        const elRev = document.getElementById('simRevenue');
        const elCost = document.getElementById('simCost');
        const elProfit = document.getElementById('simProfit');
        const elOcc = document.getElementById('simOccupancy');

        const totalRev = hotelMonthRev + spaMonthRev;
        const totalProfit = totalRev - spaMonthExp;

        if (elRev) elRev.innerText = '₩ ' + totalRev.toLocaleString();
        if (elCost) elCost.innerText = '₩ ' + spaMonthExp.toLocaleString();
        if (elProfit) elProfit.innerText = '₩ ' + totalProfit.toLocaleString();
        if (elOcc) elOcc.innerText = hotelLatestOcc + '%';

        // 12개월 차트 데이터
        const labels = [];
        const spaData = [];
        const hotelData = [];

        for (let i = 11; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const sy = d.getFullYear();
            const sm = String(d.getMonth() + 1).padStart(2, '0');
            const prefix = `${sy}-${sm}`;
            
            labels.push(`${d.getMonth() + 1}월`);
            
            let smh = 0;
            hotelApiData.forEach(r => {
                if (r.date.startsWith(prefix)) smh += (r.revenue.total || 0);
            });
            hotelData.push(Math.round(smh / 1000)); // 천원 단위

            let sms = 0;
            Object.keys(revDb).forEach(k => {
                if (k.startsWith(prefix)) {
                    sms += ((revDb[k].spaTickRev || 0) + (revDb[k].spaFbRev || 0)) * 10000;
                }
            });
            spaData.push(Math.round(sms / 1000));
        }

        if (revChart) {
            revChart.data.labels = labels;
            revChart.data.datasets[0].data = spaData;
            revChart.data.datasets[1].data = hotelData;
            revChart.update();
        }
    }
    loadSimulationData();

    // ── Cost Breakdown Doughnut ──
    var costCtx = document.getElementById('simCostChart');
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
    var sliders = { spaVisitors: document.getElementById('sliderSpaVisitors'), occupancy: document.getElementById('sliderOccupancy'), avgSpend: document.getElementById('sliderAvgSpend'), adr: document.getElementById('sliderADR') };
    var vals = { spaVisitors: document.getElementById('valSpaVisitors'), occupancy: document.getElementById('valOccupancy'), avgSpend: document.getElementById('valAvgSpend'), adr: document.getElementById('valADR') };
    var results = { spa: document.getElementById('resultSpaMonthlySales'), hotel: document.getElementById('resultHotelMonthlySales'), total: document.getElementById('resultTotalMonthlySales') };

    function calculateSimulation() {
        var sv = parseInt(sliders.spaVisitors.value);
        var oc = parseInt(sliders.occupancy.value);
        var as2 = parseInt(sliders.avgSpend.value);
        var ad = parseInt(sliders.adr.value);
        vals.spaVisitors.textContent = sv + '명';
        vals.occupancy.textContent = oc + '%';
        vals.avgSpend.textContent = '₩' + as2.toLocaleString();
        vals.adr.textContent = '₩' + ad.toLocaleString();
        var spa = sv * as2 * 30;
        var hotel = Math.floor(43 * (oc / 100) * ad * 30);
        var total = spa + hotel;
        results.spa.textContent = '₩ ' + spa.toLocaleString();
        results.hotel.textContent = '₩ ' + hotel.toLocaleString();
        results.total.textContent = '₩ ' + total.toLocaleString();
    }

    Object.values(sliders).forEach(function(s) { if (s) s.addEventListener('input', calculateSimulation); });
    calculateSimulation();
});
