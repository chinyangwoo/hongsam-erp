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
    if (revCtx && typeof Chart !== 'undefined') {
        var isDark = document.body.classList.contains('dark-theme');
        new Chart(revCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['6월','7월','8월','9월','10월','11월','12월','1월','2월','3월','4월','5월'],
                datasets: [
                    { label: '홍삼스파 매출', data: [120,145,168,135,118,105,95,88,102,125,142,155], borderColor: '#8B5CF6', backgroundColor: 'rgba(139,92,246,0.1)', tension: 0.4, borderWidth: 2.5, pointRadius: 3, fill: true },
                    { label: '홍삼빌호텔 매출', data: [85,95,112,88,72,65,58,52,68,82,98,113], borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.1)', tension: 0.4, borderWidth: 2.5, pointRadius: 3, fill: true }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { usePointStyle: true, padding: 20, color: isDark ? '#94A3B8' : '#6B7280' } },
                    tooltip: { callbacks: { label: function(ctx) { return ctx.dataset.label + ': ₩' + ctx.parsed.y.toLocaleString() + '백만'; } } }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, ticks: { callback: function(v) { return '₩' + v + 'M'; }, color: isDark ? '#94A3B8' : '#6B7280' } },
                    x: { grid: { display: false }, ticks: { color: isDark ? '#94A3B8' : '#6B7280' } }
                }
            }
        });
    }

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
