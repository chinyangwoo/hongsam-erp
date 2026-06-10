document.addEventListener('DOMContentLoaded', () => {
    
    // ═══════════════════════════════════════════════════════════
    // 접근권한 제어 (RBAC)
    // CRM 페이지: 팀장(큐레이터) 이상만 접근 가능
    // 마케팅 발송: 마스터, 호스트, 큐레이터(홍보팀장) 가능
    // ═══════════════════════════════════════════════════════════
    const CRM_ALLOWED_RANKS = ['마스터', '호스트', '큐레이터']; // 팀장 이상
    const CRM_ADMIN_RANKS = ['마스터', '호스트']; // 마케팅 발송 권한 (마스터, 호스트)

    const currentUser = localStorage.getItem('currentUser');
    let currentRank = '';
    let isAdmin = false;

    // HR DB에서 현재 사용자의 직급 확인
    try {
        const employees = JSON.parse(localStorage.getItem('hongsam_employees') || '[]');
        const empRecord = employees.find(e => e.emp_id === currentUser);
        if (empRecord && empRecord.rank) {
            currentRank = empRecord.rank;
        }
    } catch (_) {}

    // 사번 001은 항상 마스터(admin) 권한 부여
    if (currentUser === '001') {
        currentRank = '마스터';
    }

    // 접근 권한 체크 — 팀장(큐레이터) 이상만 허용
    if (!CRM_ALLOWED_RANKS.includes(currentRank)) {
        document.body.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:center; height:100vh; background:#0F172A; color:white; font-family:'Pretendard',sans-serif;">
                <div style="text-align:center; max-width:480px; padding:40px;">
                    <i class="fa-solid fa-lock" style="font-size:4rem; color:#EF4444; margin-bottom:20px; display:block;"></i>
                    <h1 style="font-size:1.5rem; margin-bottom:12px;">접근 권한이 없습니다</h1>
                    <p style="color:#94A3B8; line-height:1.6; margin-bottom:24px;">
                        고객관리(CRM) 페이지는 <strong style="color:#F59E0B;">팀장(큐레이터) 이상</strong> 직급만 접근 가능합니다.<br>
                        현재 직급: <strong style="color:#EF4444;">${currentRank || '미등록'}</strong>
                    </p>
                    <a href="index.html" style="display:inline-block; padding:12px 32px; background:linear-gradient(135deg,#3B82F6,#2563EB); color:white; border-radius:12px; text-decoration:none; font-weight:600;">
                        <i class="fa-solid fa-arrow-left"></i> 대시보드로 돌아가기
                    </a>
                </div>
            </div>`;
        return; // 이하 모든 CRM 로직 실행 중단
    }

    // admin 여부 확인 (마케팅 발송 권한: 마스터, 호스트, 또는 사번 029)
    isAdmin = CRM_ADMIN_RANKS.includes(currentRank) || currentUser === '029';

    // 마케팅 발송 버튼 — admin이 아니면 비활성화
    const btnExecuteCampaign = document.getElementById('btnExecuteCampaign');
    if (btnExecuteCampaign && !isAdmin) {
        btnExecuteCampaign.disabled = true;
        btnExecuteCampaign.style.opacity = '0.4';
        btnExecuteCampaign.style.cursor = 'not-allowed';
        btnExecuteCampaign.title = '마케팅 발송은 마스터/호스트/큐레이터(홍보팀장)만 가능합니다';
        btnExecuteCampaign.innerHTML = '<i class="fa-solid fa-lock"></i> 발송 권한 없음';
    }

    // 1. Data Initialization & LocalStorage Sync
    const CRM_DB_KEY = 'hongsam_crm_db';
    const API_BASE = ((window.ERP_CONFIG && window.ERP_CONFIG.apiBase) || 'http://43.203.237.63:3001/api');
    let customers = [];
    
    try {
        const stored = localStorage.getItem(CRM_DB_KEY);
        if (stored) {
            customers = JSON.parse(stored);
        } else {
            // 초기 데이터 없음 — 신규등록 버튼으로 고객 추가
            customers = [];
            localStorage.setItem(CRM_DB_KEY, JSON.stringify(customers));
        }
    } catch(e) { console.error("CRM DB Error:", e); }

    // 2. Render Customer Table
    function renderTable(data) {
        const tbody = document.getElementById('customerTableBody');
        if(!tbody) return;
        if (window.ERPPaginate) { data = ERPPaginate.attach('crm_customers', tbody, data, 50, renderTable) || data; }
        
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

    // 모든 신규등록 버튼에 이벤트 바인딩 (상단 헤더 + 테이블 옆)
    document.querySelectorAll('.btn-open-new-customer').forEach(btn => {
        btn.addEventListener('click', openNewCustModal);
    });
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

    // 5. Marketing SMS Logic (btnExecuteCampaign은 상단 RBAC에서 이미 참조)
    const campaignTarget = document.getElementById('campaignTarget');
    const campaignCost = document.getElementById('campaignCost');
    const campaignMethod = document.getElementById('campaignMethod');
    
    // Dynamic cost calculation based on target + method
    const costMap = { all: 10120, vip: 842, inactive: 3240, spa: 5600 };
    const priceMap = { sms: 25, rcs_text: 10, rcs_template: 50 };

    function updateCampaignCost() {
        if (!campaignTarget || !campaignCost) return;
        const count = costMap[campaignTarget.value] || 0;
        const method = campaignMethod ? campaignMethod.value : 'sms';
        const unitPrice = priceMap[method] || 25;
        campaignCost.innerText = (count * unitPrice).toLocaleString() + ' 원';
    }

    if (campaignTarget) campaignTarget.addEventListener('change', updateCampaignCost);
    if (campaignMethod) campaignMethod.addEventListener('change', updateCampaignCost);

    if(btnExecuteCampaign) {
        btnExecuteCampaign.addEventListener('click', async () => {
            // 발송 권한 재검증 (UI 우회 방지)
            if (!isAdmin) {
                alert('⛔ 마케팅 발송 권한이 없습니다.\n마스터/호스트/큐레이터(홍보팀장) 계정으로 로그인해 주세요.');
                return;
            }
            const target = campaignTarget ? campaignTarget.value : 'all';
            const method = campaignMethod ? campaignMethod.value : 'sms';
            const messageEl = document.getElementById('campaignMessage');
            const titleEl = document.getElementById('campaignTitle');
            const message = messageEl ? messageEl.value.trim() : '';
            const title = titleEl ? titleEl.value.trim() : '[홍삼한방타운]';

            if (!message) { alert('메시지 내용을 입력해 주세요.'); return; }

            // 타겟별 수신자 필터링
            let receivers = [];
            if (target === 'vip') receivers = customers.filter(c => c.rank === 'VIP' || c.rank === 'VVIP').map(c => c.phone);
            else if (target === 'inactive') receivers = customers.filter(c => {
                const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                return new Date(c.lastVisit) < sixMonthsAgo;
            }).map(c => c.phone);
            else receivers = customers.map(c => c.phone);

            if (receivers.length === 0) { alert('발송 대상이 없습니다.'); return; }

            const unitPrice = priceMap[method] || 25;
            const estCost = Math.round(receivers.length * unitPrice);
            const methodLabel = method === 'sms' ? (message.length > 90 ? 'LMS' : 'SMS') : method === 'rcs_text' ? 'RCS 텍스트' : 'RCS 템플릿';

            if (!confirm(`📱 ${receivers.length}명에게 ${methodLabel} 발송\n예상 비용: ${estCost.toLocaleString()}원\n\n계속하시겠습니까?`)) return;

            btnExecuteCampaign.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 발송 중...';
            btnExecuteCampaign.disabled = true;

            try {
                let apiUrl, bodyData;

                if (method === 'sms') {
                    // SMS/LMS 발송
                    apiUrl = `${API_BASE}/sms/send`;
                    bodyData = {
                        receivers: receivers,
                        message: '(광고) ' + message + '\n무료수신거부 080-XXX-XXXX',
                        title: title
                    };
                } else {
                    // RCS 발송 (텍스트 또는 템플릿)
                    apiUrl = `${API_BASE}/rcs/send`;
                    bodyData = {
                        receivers: receivers,
                        message: message,
                        title: title,
                        fallbackMessage: '(광고) ' + message + '\n무료수신거부 080-XXX-XXXX'
                    };
                }

                const res = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bodyData)
                });
                const result = await res.json();

                const t = document.createElement('div');
                t.style.cssText = `position:fixed; bottom:32px; right:32px; z-index:99999; color:white; padding:14px 20px; border-radius:14px; font-weight:600; box-shadow:0 10px 30px rgba(0,0,0,0.4);`;

                if (result.success) {
                    t.style.background = method.startsWith('rcs') ? 'rgba(139,92,246,0.95)' : 'rgba(16,185,129,0.95)';
                    const modeText = result.mode === 'simulation' ? ' (시뮬레이션)' : '';
                    const typeIcon = method.startsWith('rcs') ? '💎' : '📱';
                    t.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${typeIcon} ${result.sentCount}명 ${methodLabel} 발송 완료${modeText}`;
                } else {
                    t.style.background = 'rgba(239,68,68,0.95)';
                    t.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> 발송 실패: ${result.error || '알 수 없는 오류'}`;
                }
                document.body.appendChild(t);
                setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(()=>t.remove(),300); }, 4000);
            } catch (err) {
                alert('서버 통신 오류: ' + err.message);
            } finally {
                setTimeout(() => {
                    btnExecuteCampaign.innerHTML = '<i class="fa-solid fa-paper-plane"></i> 발송하기';
                    btnExecuteCampaign.disabled = false;
                }, 2000);
            }
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
