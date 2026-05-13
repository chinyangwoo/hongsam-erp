document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Data Initialization & LocalStorage Sync
    const CRM_DB_KEY = 'hongsam_crm_db';
    let customers = [];
    
    try {
        const stored = localStorage.getItem(CRM_DB_KEY);
        if (stored) {
            customers = JSON.parse(stored);
        } else {
            // Initial mock data if empty
            customers = [
                { id: 'c1', name: '김회장', phone: '010-9999-8888', rank: 'VVIP', visits: 42, totalSpend: 12500000, lastVisit: '2026-05-10', memo: '스파 2층 선호. 차량 번호 12가3456', history: ['스파 프라이빗룸 (2026-05-10)', 'VIP 연간 회원권 갱신 (2026-01-05)'] },
                { id: 'c2', name: '이대표', phone: '010-1234-5678', rank: 'VIP', visits: 15, totalSpend: 3400000, lastVisit: '2026-05-02', memo: '', history: ['호텔 스위트룸 숙박 (2026-05-01)'] },
                { id: 'c3', name: '박진안', phone: '010-2345-6789', rank: '일반', visits: 3, totalSpend: 450000, lastVisit: '2026-04-20', memo: '알러지 있음 (땅콩)', history: ['스파 일반권 (2026-04-20)', '스파 일반권 (2025-11-12)'] },
                { id: 'c4', name: '최전주', phone: '010-3456-7890', rank: '일반', visits: 1, totalSpend: 150000, lastVisit: '2026-05-11', memo: '', history: ['스파 커플권 (2026-05-11)'] },
                { id: 'c5', name: '정무주', phone: '010-4567-8901', rank: 'VIP', visits: 12, totalSpend: 2800000, lastVisit: '2026-05-05', memo: '주말 예약 선호', history: ['스파 프라이빗룸 (2026-05-05)'] },
                { id: 'c6', name: '강임실', phone: '010-5678-9012', rank: '일반', visits: 5, totalSpend: 750000, lastVisit: '2026-04-15', memo: '', history: ['식음료 카페 이용 (2026-04-15)'] },
                { id: 'c7', name: '조장수', phone: '010-6789-0123', rank: 'VVIP', visits: 35, totalSpend: 9800000, lastVisit: '2026-05-12', memo: '와인 서비스 필요', history: ['호텔 펜트하우스 (2026-05-12)'] },
                { id: 'c8', name: '윤남원', phone: '010-7890-1234', rank: '일반', visits: 2, totalSpend: 300000, lastVisit: '2026-03-22', memo: '', history: ['스파 일반권 (2026-03-22)'] }
            ];
            localStorage.setItem(CRM_DB_KEY, JSON.stringify(customers));
        }
    } catch(e) { console.error("CRM DB Error:", e); }

    // 2. Render Customer Table
    function renderTable(data) {
        const tbody = document.getElementById('customerTableBody');
        if(!tbody) return;
        
        let html = '';
        data.forEach(c => {
            let badge = 'badge-normal';
            if(c.rank === 'VVIP') badge = 'badge-vvip';
            else if(c.rank === 'VIP') badge = 'badge-vip';

            html += `
                <tr>
                    <td style="font-weight:600; color:#F8FAFC;">${c.name}</td>
                    <td style="color:#CBD5E1;">${c.phone}</td>
                    <td><span class="${badge}">${c.rank}</span></td>
                    <td style="text-align:center;">${c.visits}회</td>
                    <td style="text-align:right;">${(c.totalSpend||0).toLocaleString()}원</td>
                    <td style="color:#94A3B8;">${c.lastVisit}</td>
                    <td><button class="btn-secondary btn-detail" data-id="${c.id}" style="padding:4px 10px; font-size:0.75rem;">상세</button></td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
        
        // Add listeners to detail buttons
        document.querySelectorAll('.btn-detail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                openCustomerModal(id);
            });
        });
    }
    
    renderTable(customers);

    // 3. Search Logic
    const searchInput = document.getElementById('crmSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = customers.filter(c => 
                c.name.toLowerCase().includes(query) || 
                c.phone.includes(query)
            );
            renderTable(filtered);
        });
    }

    // 3-1. New Customer Registration
    const newCustModal = document.getElementById('newCustomerModal');
    const btnNewCustomer = document.getElementById('btnNewCustomer');
    const closeNewCustModal = document.getElementById('closeNewCustModal');
    const cancelNewCustBtn = document.getElementById('cancelNewCustBtn');
    const saveNewCustBtn = document.getElementById('saveNewCustBtn');

    function openNewCustModal() {
        document.getElementById('newCustName').value = '';
        document.getElementById('newCustPhone').value = '';
        document.getElementById('newCustRank').value = '일반';
        document.getElementById('newCustMemo').value = '';
        newCustModal.classList.add('show');
        setTimeout(() => document.getElementById('newCustName').focus(), 200);
    }
    function closeNewCustModalFn() { newCustModal.classList.remove('show'); }

    if (btnNewCustomer) btnNewCustomer.addEventListener('click', openNewCustModal);
    if (closeNewCustModal) closeNewCustModal.addEventListener('click', closeNewCustModalFn);
    if (cancelNewCustBtn) cancelNewCustBtn.addEventListener('click', closeNewCustModalFn);
    if (newCustModal) newCustModal.addEventListener('click', (e) => { if (e.target === newCustModal) closeNewCustModalFn(); });

    // Phone auto-format (010-0000-0000)
    const phoneInput = document.getElementById('newCustPhone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let v = e.target.value.replace(/[^0-9]/g, '');
            if (v.length > 3 && v.length <= 7) v = v.slice(0,3) + '-' + v.slice(3);
            else if (v.length > 7) v = v.slice(0,3) + '-' + v.slice(3,7) + '-' + v.slice(7,11);
            e.target.value = v;
        });
    }

    if (saveNewCustBtn) {
        saveNewCustBtn.addEventListener('click', () => {
            const name = document.getElementById('newCustName').value.trim();
            const phone = document.getElementById('newCustPhone').value.trim();
            const rank = document.getElementById('newCustRank').value;
            const memo = document.getElementById('newCustMemo').value.trim();

            if (!name) { alert('고객명을 입력해 주세요.'); document.getElementById('newCustName').focus(); return; }
            if (!phone || phone.length < 12) { alert('연락처를 올바르게 입력해 주세요. (예: 010-0000-0000)'); document.getElementById('newCustPhone').focus(); return; }
            if (customers.some(c => c.phone === phone)) { alert('이미 등록된 연락처입니다.'); return; }

            const today = new Date();
            const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

            const newCustomer = {
                id: 'c' + Date.now(),
                name: name,
                phone: phone,
                rank: rank,
                visits: 0,
                totalSpend: 0,
                lastVisit: dateStr,
                memo: memo,
                history: []
            };

            customers.push(newCustomer);
            localStorage.setItem(CRM_DB_KEY, JSON.stringify(customers));
            renderTable(customers);
            closeNewCustModalFn();

            // Success toast
            const t = document.createElement('div');
            t.style.cssText = `position:fixed; bottom:32px; right:32px; z-index:99999; background:rgba(16,185,129,0.95); color:white; padding:14px 20px; border-radius:14px; font-weight:600; box-shadow:0 10px 30px rgba(0,0,0,0.4);`;
            t.innerHTML = `<i class="fa-solid fa-circle-check"></i> <strong>${name}</strong> 고객이 등록되었습니다.`;
            document.body.appendChild(t);
            setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(()=>t.remove(),300); }, 2500);
        });
    }

    // 4. Modal Logic
    const modal = document.getElementById('customerModal');
    const btnClose1 = document.getElementById('closeCustomerModal');
    const btnClose2 = document.getElementById('closeCustomerModalBtn');
    const btnSaveMemo = document.getElementById('saveCustomerMemoBtn');
    let currentEditingId = null;

    function openCustomerModal(id) {
        const c = customers.find(x => x.id === id);
        if(!c) return;
        
        currentEditingId = id;
        document.getElementById('modalCustName').innerText = c.name;
        document.getElementById('modalCustPhone').innerText = c.phone;
        
        const rankEl = document.getElementById('modalCustRank');
        rankEl.innerText = c.rank;
        rankEl.className = '';
        if(c.rank === 'VVIP') rankEl.classList.add('badge-vvip');
        else if(c.rank === 'VIP') rankEl.classList.add('badge-vip');
        else rankEl.classList.add('badge-normal');
        
        document.getElementById('modalCustVisits').innerText = c.visits + '회';
        document.getElementById('modalCustSpend').innerText = (c.totalSpend||0).toLocaleString() + ' 원';
        document.getElementById('modalCustLastVisit').innerText = c.lastVisit;
        document.getElementById('modalCustMemo').value = c.memo || '';
        
        const historyEl = document.getElementById('modalCustHistory');
        if (c.history && c.history.length > 0) {
            historyEl.innerHTML = c.history.map(h => {
                const match = h.match(/(.*?)\s*\((.*?)\)/);
                const desc = match ? match[1].trim() : h;
                const date = match ? match[2].trim() : '';
                return `
                    <li style="position: relative; padding-left: 24px; margin-bottom: 20px;">
                        <div style="position: absolute; left: -5px; top: 4px; width: 10px; height: 10px; border-radius: 50%; background: #3B82F6; box-shadow: 0 0 0 4px rgba(59,130,246,0.2);"></div>
                        <div style="font-weight: 600; color: #F8FAFC; font-size: 0.95rem; line-height: 1.4;">${desc}</div>
                        <div style="color: #94A3B8; font-size: 0.8rem; margin-top: 4px;"><i class="fa-regular fa-calendar" style="margin-right: 4px;"></i>${date}</div>
                    </li>
                `;
            }).join('');
        } else {
            historyEl.innerHTML = '<li style="position: relative; padding-left: 24px; color: #64748B; font-size: 0.9rem;">이용 내역이 없습니다.</li>';
        }
        
        modal.classList.add('show');
    }

    function closeModal() {
        modal.classList.remove('show');
        currentEditingId = null;
    }

    if(btnClose1) btnClose1.addEventListener('click', closeModal);
    if(btnClose2) btnClose2.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });

    if(btnSaveMemo) {
        btnSaveMemo.addEventListener('click', () => {
            if(!currentEditingId) return;
            const newMemo = document.getElementById('modalCustMemo').value;
            const idx = customers.findIndex(x => x.id === currentEditingId);
            if(idx !== -1) {
                customers[idx].memo = newMemo;
                localStorage.setItem(CRM_DB_KEY, JSON.stringify(customers));
                
                // Toast notification
                const t = document.createElement('div');
                t.style.cssText = `position:fixed; bottom:32px; right:32px; z-index:99999; background:rgba(16,185,129,0.95); color:white; padding:14px 20px; border-radius:14px; font-weight:600; box-shadow:0 10px 30px rgba(0,0,0,0.4); animation: fadeIn 0.3s ease;`;
                t.innerHTML = `<i class="fa-solid fa-check-circle"></i> 고객 메모가 저장되었습니다.`;
                document.body.appendChild(t);
                setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(()=>t.remove(),300); }, 2500);
            }
            closeModal();
        });
    }

    // 5. Marketing SMS Logic
    const btnExecuteCampaign = document.getElementById('btnExecuteCampaign');
    const campaignTarget = document.getElementById('campaignTarget');
    const campaignCost = document.getElementById('campaignCost');
    
    // Dynamic cost calculation based on target
    if(campaignTarget && campaignCost) {
        campaignTarget.addEventListener('change', (e) => {
            let cost = 0;
            const v = e.target.value;
            if (v === 'all') cost = 10120 * 15; // 15원/건
            else if (v === 'vip') cost = 842 * 15;
            else if (v === 'inactive') cost = 3240 * 15;
            else if (v === 'spa') cost = 5600 * 15;
            campaignCost.innerText = cost.toLocaleString() + ' 원';
        });
    }

    if(btnExecuteCampaign) {
        btnExecuteCampaign.addEventListener('click', () => {
            btnExecuteCampaign.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 발송 중...';
            btnExecuteCampaign.disabled = true;
            
            setTimeout(() => {
                // Restore button
                btnExecuteCampaign.innerHTML = '<i class="fa-solid fa-paper-plane"></i> 발송 완료';
                btnExecuteCampaign.classList.replace('btn-primary', 'btn-secondary');
                
                // Show Toast
                const t = document.createElement('div');
                t.style.cssText = `position:fixed; bottom:32px; right:32px; z-index:99999; background:rgba(59,130,246,0.95); color:white; padding:14px 20px; border-radius:14px; font-weight:600; box-shadow:0 10px 30px rgba(0,0,0,0.4); animation: fadeIn 0.3s ease;`;
                t.innerHTML = `<i class="fa-solid fa-envelope-circle-check"></i> 성공적으로 타겟 마케팅 캠페인이 발송되었습니다.`;
                document.body.appendChild(t);
                setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(()=>t.remove(),300); }, 3000);
                
                // Reset after 3 seconds
                setTimeout(() => {
                    btnExecuteCampaign.innerHTML = '<i class="fa-solid fa-paper-plane"></i> 발송하기';
                    btnExecuteCampaign.classList.replace('btn-secondary', 'btn-primary');
                    btnExecuteCampaign.disabled = false;
                }, 3000);
            }, 1200);
        });
    }

    // 6. Chart (Highcharts)
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
