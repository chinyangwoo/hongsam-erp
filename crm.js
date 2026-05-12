document.addEventListener('DOMContentLoaded', () => {
    
    // Mock Data for CRM
    const customers = [
        { name: '김회장', phone: '010-9999-8888', rank: 'VVIP', visits: 42, totalSpend: 12500000, lastVisit: '2026-05-10' },
        { name: '이대표', phone: '010-1234-5678', rank: 'VIP', visits: 15, totalSpend: 3400000, lastVisit: '2026-05-02' },
        { name: '박진안', phone: '010-2345-6789', rank: '일반', visits: 3, totalSpend: 450000, lastVisit: '2026-04-20' },
        { name: '최전주', phone: '010-3456-7890', rank: '일반', visits: 1, totalSpend: 150000, lastVisit: '2026-05-11' },
        { name: '정무주', phone: '010-4567-8901', rank: 'VIP', visits: 12, totalSpend: 2800000, lastVisit: '2026-05-05' },
        { name: '강임실', phone: '010-5678-9012', rank: '일반', visits: 5, totalSpend: 750000, lastVisit: '2026-04-15' },
        { name: '조장수', phone: '010-6789-0123', rank: 'VVIP', visits: 35, totalSpend: 9800000, lastVisit: '2026-05-12' },
        { name: '윤남원', phone: '010-7890-1234', rank: '일반', visits: 2, totalSpend: 300000, lastVisit: '2026-03-22' }
    ];

    const tbody = document.getElementById('customerTableBody');
    if(tbody) {
        let html = '';
        customers.forEach(c => {
            let badge = 'badge-normal';
            if(c.rank === 'VVIP') badge = 'badge-vvip';
            else if(c.rank === 'VIP') badge = 'badge-vip';

            html += `
                <tr>
                    <td style="font-weight:600; color:#F8FAFC;">${c.name}</td>
                    <td style="color:#CBD5E1;">${c.phone}</td>
                    <td><span class="${badge}">${c.rank}</span></td>
                    <td style="text-align:center;">${c.visits}회</td>
                    <td style="text-align:right;">${c.totalSpend.toLocaleString()}원</td>
                    <td style="color:#94A3B8;">${c.lastVisit}</td>
                    <td><button class="btn-secondary" style="padding:4px 10px; font-size:0.75rem;">상세</button></td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    }

    // Chart
    if (document.getElementById('memberChart')) {
        Highcharts.chart('memberChart', {
            chart: {
                type: 'areaspline',
                backgroundColor: 'transparent',
                style: { fontFamily: 'Inter, sans-serif' }
            },
            title: { text: '' },
            xAxis: {
                categories: ['1월', '2월', '3월', '4월', '5월'],
                labels: { style: { color: '#94A3B8' } },
                lineColor: 'rgba(255,255,255,0.1)'
            },
            yAxis: {
                title: { text: '' },
                gridLineColor: 'rgba(255,255,255,0.05)',
                labels: { style: { color: '#94A3B8' } }
            },
            legend: { enabled: false },
            plotOptions: {
                areaspline: {
                    fillOpacity: 0.3,
                    marker: { radius: 4 },
                    lineWidth: 3
                }
            },
            series: [{
                name: '신규 가입자',
                data: [120, 150, 210, 180, 260],
                color: '#10B981',
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, 'rgba(16,185,129,0.5)'],
                        [1, 'rgba(16,185,129,0.0)']
                    ]
                }
            }],
            credits: { enabled: false }
        });
    }
});
