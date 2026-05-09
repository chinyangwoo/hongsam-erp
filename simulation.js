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
});
