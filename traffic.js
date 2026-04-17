document.addEventListener('DOMContentLoaded', () => {

    // 1. Crowd Counter Logic (+ / - Buttons)
    const btnCounts = document.querySelectorAll('.btn-count');
    
    // Limits
    const MAX_CAPACITY = 100;
    
    btnCounts.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const isPlus = e.target.classList.contains('plus') || e.target.parentElement.classList.contains('plus');
            const targetId = e.target.getAttribute('data-target') || e.target.parentElement.getAttribute('data-target');
            
            if(targetId) {
                const valElem = document.getElementById(targetId);
                let currentVal = parseInt(valElem.innerText, 10);
                
                if(isPlus) {
                    currentVal += 1;
                } else {
                    if (currentVal > 0) currentVal -= 1;
                }
                
                // Update DOM
                valElem.innerText = currentVal;
                
                // Update Progress bar & Status
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
        
        // Update Bar
        prog.style.width = `${ratio}%`;
        
        // Remove class based classes
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

    // 2. Hourly Traffic Line Chart (Using Chart.js)
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
                        borderColor: '#10B981', // green
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 2,
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true
                    },
                    {
                        label: '2층 (대온천탕)',
                        data: [10, 25, 45, 60, 50, 65, 80, 58, 40, 15],
                        borderColor: '#F59E0B', // yellow
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 2,
                        backgroundColor: 'transparent',
                        fill: false
                    },
                    {
                        label: '루프탑 (수영장/사우나)',
                        data: [2, 5, 20, 45, 60, 95, 85, 50, 20, 5],
                        borderColor: '#EF4444', // red
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 2,
                        backgroundColor: 'transparent',
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { usePointStyle: true, boxWidth: 8, padding: 20 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 120,
                        grid: { color: gridColor },
                        title: { display: true, text: '체류 인원수 (명)' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });

        // Optional: Expose update logic globally if theme switch happens
        window.updateTrafficChartTheme = function() {
            const isDark = document.body.classList.contains('dark-theme');
            trafficChart.options.scales.y.grid.color = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
            Chart.defaults.color = isDark ? '#94A3B8' : '#6B7280';
            trafficChart.update();
        };

        // Bind theme toggle to chart update
        const themeToggleBtn = document.getElementById('themeToggle');
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                setTimeout(window.updateTrafficChartTheme, 50);
            });
        }
    }

});
