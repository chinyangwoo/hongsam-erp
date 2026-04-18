document.addEventListener('DOMContentLoaded', () => {

    // 1. Tab Navigation Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active classes
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => {
                c.style.display = 'none';
                c.classList.remove('active');
            });

            // Add active to clicked target
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            const targetContent = document.getElementById(targetId);
            
            if(targetContent) {
                targetContent.style.display = 'block';
                // small timeout to allow display block to apply before styling active for animation if needed
                setTimeout(() => targetContent.classList.add('active'), 10);
            }
        });
    });

    // 1-b. Payroll KPI Dropdown Selectors
    function formatWon(num) {
        if (num >= 10000000) return (num / 10000000).toFixed(1).replace(/\.0$/, '') + '천만';
        if (num >= 1000000)  return (num / 1000000).toFixed(0) + '만';
        return num.toLocaleString('ko-KR') + '원';
    }

    const teamSelect = document.getElementById('teamSelect');
    const teamAmountDisplay = document.getElementById('teamAmountDisplay');
    if (teamSelect && teamAmountDisplay) {
        teamSelect.addEventListener('change', () => {
            const selected = teamSelect.options[teamSelect.selectedIndex];
            const amount = parseInt(selected.getAttribute('data-amount'), 10);
            teamAmountDisplay.textContent = formatWon(amount);
        });
    }

    const rankSelect = document.getElementById('rankSelect');
    const rankAmountDisplay = document.getElementById('rankAmountDisplay');
    if (rankSelect && rankAmountDisplay) {
        rankSelect.addEventListener('change', () => {
            const selected = rankSelect.options[rankSelect.selectedIndex];
            const amount = parseInt(selected.getAttribute('data-amount'), 10);
            rankAmountDisplay.textContent = formatWon(amount);
        });
    }

    // 2. Profile Modal Logic
    const profileModal = document.getElementById('profileModal');
    const closeBtn1 = document.getElementById('closeProfileModal');
    const closeBtn2 = document.getElementById('closeProfileModalBtn');

    // Make openProfileModal globally accessible
    window.openProfileModal = function(employeeId) {
        // In a real app, this would fetch data from /api/hr/employees/{id}
        // Here we just show the static modal for prototype
        profileModal.classList.add('show');
    };

    function closeModal() {
        profileModal.classList.remove('show');
    }

    if (closeBtn1) closeBtn1.addEventListener('click', closeModal);
    if (closeBtn2) closeBtn2.addEventListener('click', closeModal);

    // Close on overlay click
    profileModal.addEventListener('click', (e) => {
        if(e.target === profileModal) {
            closeModal();
        }
    });

    // 3. Export CSV Mock Action
    const btnExportCSV = document.getElementById('btnExportCSV');
    if(btnExportCSV) {
        btnExportCSV.addEventListener('click', () => {
            alert('출퇴근 기록을 CSV 파일로 다운로드합니다. (Prototype)');
        });
    }

    // 4. Add New Employee Modal Logic
    const btnAddNewEmployee = document.getElementById('btnAddNewEmployee');
    const newEmpModal = document.getElementById('newEmpModal');
    const closeNewEmpModal = document.getElementById('closeNewEmpModal');
    const closeNewEmpModalBtn = document.getElementById('closeNewEmpModalBtn');
    const saveNewEmpBtn = document.getElementById('saveNewEmpBtn');
    
    // Photo preview
    const empPhotoUpload = document.getElementById('empPhotoUpload');
    const photoPreview = document.getElementById('photoPreview');
    
    if (empPhotoUpload) {
        empPhotoUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    if (photoPreview) photoPreview.src = evt.target.result;
                }
                reader.readAsDataURL(file);
            }
        });
    }

    function closeNewModal() {
        if (newEmpModal) {
            newEmpModal.classList.remove('show');
            const form = document.getElementById('newEmpForm');
            if(form) form.reset();
            if(photoPreview) photoPreview.src = 'https://via.placeholder.com/150';
        }
    }

    if(btnAddNewEmployee) {
        btnAddNewEmployee.addEventListener('click', () => {
            if (newEmpModal) newEmpModal.classList.add('show');
        });
    }
    
    if (closeNewEmpModal) closeNewEmpModal.addEventListener('click', closeNewModal);
    if (closeNewEmpModalBtn) closeNewEmpModalBtn.addEventListener('click', closeNewModal);
    
    if (saveNewEmpBtn) {
        saveNewEmpBtn.addEventListener('click', () => {
            // 필수항목 검증
            const empId    = document.getElementById('newEmpId')?.value.trim();
            const empName  = document.getElementById('newEmpName')?.value.trim();
            const phone    = document.getElementById('newEmpPhone')?.value.trim();
            const addr     = document.getElementById('newEmpAddr')?.value.trim();
            const hireDate = document.getElementById('newEmpHireDate')?.value;
            const dept     = document.getElementById('newEmpDept')?.value;
            const rank     = document.getElementById('newEmpRank')?.value;

            if (!empId || !empName) {
                alert('사번과 성명은 필수 입력 항목입니다.');
                if (!empId) document.getElementById('newEmpId')?.focus();
                else document.getElementById('newEmpName')?.focus();
                return;
            }
            if (!dept) { alert('부서를 선택해주세요.'); return; }
            if (!rank) { alert('직급을 선택해주세요.'); return; }

            // 데이터 수집
            const empData = {
                emp_id:           empId,
                name:             empName,
                login_id:         document.getElementById('newEmpLoginId')?.value.trim() || empId,
                login_pw:         document.getElementById('newEmpLoginPw')?.value.trim() || '0000',
                birth_date:       document.getElementById('newEmpBirth')?.value || '',
                gender:           document.getElementById('newEmpGender')?.value || '남',
                id_front:         document.getElementById('newEmpIdFront')?.value.trim() || '',
                phone:            phone,
                emergency_phone:  document.getElementById('newEmpEmergPhone')?.value.trim() || '',
                email:            document.getElementById('newEmpEmail')?.value.trim() || '',
                address:          addr,
                hire_date:        hireDate || '',
                department:       dept,
                team_detail:      document.getElementById('newEmpTeamDetail')?.value.trim() || '',
                rank:             rank,
                emp_type:         document.getElementById('newEmpType')?.value || '정규직',
                status:           '재직',
                contract_end:     document.getElementById('newEmpContractEnd')?.value || '',
                annual_salary:    document.getElementById('newEmpAnnualSalary')?.value || '0',
                base_salary:      document.getElementById('newEmpBaseSalary')?.value || '0',
                family_info:      document.getElementById('newEmpFamily')?.value.trim() || '',
                notes:            document.getElementById('newEmpNotes')?.value.trim() || '',
                createdAt:        new Date().toISOString(),
                updatedAt:        new Date().toISOString(),
            };

            // 사진 데이터 (base64)
            const photo = document.getElementById('photoPreview');
            if (photo && photo.src && !photo.src.includes('ui-avatars.com')) {
                empData.photo = photo.src;
            }

            // 권한 수집
            const permRows = document.querySelectorAll('#newEmpForm .perm-table tbody tr');
            const perms = [];
            permRows.forEach(row => {
                const cells = row.querySelectorAll('input[type="checkbox"]');
                perms.push({
                    read: cells[0]?.checked || false,
                    write: cells[1]?.checked || false,
                });
            });
            empData.permissions = perms;

            // localStorage 저장
            const KEY = 'hongsam_employees';
            let employees = [];
            try { employees = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (_) {}

            // 중복 사번 검사
            const dupIdx = employees.findIndex(e => e.emp_id === empId);
            if (dupIdx >= 0) {
                if (!confirm(`사번 ${empId}이(가) 이미 등록되어 있습니다. 덮어쓰시겠습니까?`)) return;
                employees[dupIdx] = { ...employees[dupIdx], ...empData };
            } else {
                employees.push(empData);
            }
            localStorage.setItem(KEY, JSON.stringify(employees));

            // 카드 즉시 추가
            addEmployeeCard(empData);

            closeNewModal();
            showSaveToast(`사원 등록 완료: ${empName} (${empId})`);
        });
    }

    // 인사기록카드 그리드에 카드 추가
    function addEmployeeCard(emp) {
        const grid = document.querySelector('.personnel-grid');
        if (!grid) return;

        // 중복 카드 방지
        const existing = grid.querySelector(`[data-emp-id="${emp.emp_id}"]`);
        if (existing) existing.remove();

        const rankMap = {
            '대표이사': 'tag-important', '임원': 'tag-important',
            '부장': 'tag-important', '차장': 'tag-important',
            '아르바이트': 'tag-hr', '인턴': 'tag-hr',
        };
        const tagCls = rankMap[emp.rank] || 'tag-general';
        const rankLabel = emp.rank === '크루' ? '팀원 (크루)' : emp.rank;
        const statusDot = emp.status === '재직' ? 'online' : 'offline';
        const statusText = emp.status === '재직' ? '정상근무' : emp.status;
        const imgSrc = emp.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random`;

        const card = document.createElement('div');
        card.className = 'employee-card glassmorphism';
        card.setAttribute('data-emp-id', emp.emp_id);
        card.setAttribute('onclick', `openProfileModal('${emp.emp_id}')`);
        card.style.cursor = 'pointer';
        card.innerHTML = `
            <div class="emp-photo"><img src="${imgSrc}" alt="Photo"></div>
            <div class="emp-info">
                <h3 class="emp-name">${emp.name} <span class="emp-id">${emp.emp_id}</span></h3>
                <p class="emp-dept">${emp.department || ''} ${emp.team_detail ? '(' + emp.team_detail + ')' : ''}</p>
                <span class="emp-role ${tagCls}">${rankLabel}</span>
            </div>
            <div class="emp-status">
                <div class="status-dot ${statusDot}"></div> ${statusText}
            </div>
        `;
        // 새 카드에 하이라이트 애니메이션
        card.style.animation = 'fadeIn 0.5s ease';
        grid.appendChild(card);
    }

    // 저장 토스트
    function showSaveToast(msg) {
        const t = document.createElement('div');
        t.style.cssText = `
            position:fixed; bottom:32px; right:32px; z-index:99999;
            background:rgba(16,185,129,0.95); color:white; padding:14px 20px;
            border-radius:14px; display:flex; align-items:center; gap:10px;
            font-family:inherit; font-size:0.9rem; font-weight:600;
            box-shadow:0 10px 30px rgba(0,0,0,0.4);
            animation: fadeIn 0.3s ease;
        `;
        t.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${msg}`;
        document.body.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 3000);
    }
    
    // Payroll Quick Edit Modal
    const payrollModal      = document.getElementById('payrollModal');
    const btnEditPayroll    = document.getElementById('btnEditPayroll');
    const closePayrollModal = document.getElementById('closePayrollModal');
    const cancelPayrollModal= document.getElementById('cancelPayrollModal');
    const savePayrollBtn    = document.getElementById('savePayrollBtn');
    const pNetDisplay       = document.getElementById('pNetDisplay');
    const payrollTbody      = document.querySelector('#tab-payroll table tbody');

    const payrollInputIds = ['pBase','pMeal','pOT','pNP','pHI','pEI','pTax'];

    function calcNet() {
        const base = Number(document.getElementById('pBase')?.value) || 0;
        const meal = Number(document.getElementById('pMeal')?.value) || 0;
        const ot   = Number(document.getElementById('pOT')?.value)   || 0;
        const np   = Number(document.getElementById('pNP')?.value)   || 0;
        const hi   = Number(document.getElementById('pHI')?.value)   || 0;
        const ei   = Number(document.getElementById('pEI')?.value)   || 0;
        const tax  = Number(document.getElementById('pTax')?.value)  || 0;
        const net  = base + meal + ot - np - hi - ei - tax;
        if (pNetDisplay) pNetDisplay.textContent = net.toLocaleString('ko-KR') + ' 원';
        return net;
    }

    // Live update on any input change
    payrollInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', calcNet);
    });

    function openPayrollModal() {
        if (!payrollModal) return;
        ['pEmpId','pName', ...payrollInputIds].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        if (pNetDisplay) pNetDisplay.textContent = '0 원';
        payrollModal.style.display = 'flex';
        document.getElementById('pEmpId')?.focus();
    }

    function closePayrollModalFn() {
        if (payrollModal) payrollModal.style.display = 'none';
    }

    if (btnEditPayroll)     btnEditPayroll.addEventListener('click', openPayrollModal);
    if (closePayrollModal)  closePayrollModal.addEventListener('click', closePayrollModalFn);
    if (cancelPayrollModal) cancelPayrollModal.addEventListener('click', closePayrollModalFn);
    if (payrollModal) {
        payrollModal.addEventListener('click', (e) => {
            if (e.target === payrollModal) closePayrollModalFn();
        });
    }

    if (savePayrollBtn) {
        savePayrollBtn.addEventListener('click', () => {
            const empId = document.getElementById('pEmpId')?.value.trim();
            const name  = document.getElementById('pName')?.value.trim();
            if (!empId || !name) {
                alert('사번과 이름은 필수 입력 항목입니다.');
                return;
            }

            const base = Number(document.getElementById('pBase')?.value) || 0;
            const meal = Number(document.getElementById('pMeal')?.value) || 0;
            const ot   = Number(document.getElementById('pOT')?.value)   || 0;
            const np   = Number(document.getElementById('pNP')?.value)   || 0;
            const hi   = Number(document.getElementById('pHI')?.value)   || 0;
            const ei   = Number(document.getElementById('pEI')?.value)   || 0;
            const tax  = Number(document.getElementById('pTax')?.value)  || 0;
            const net  = base + meal + ot - np - hi - ei - tax;

            const fmt = (n, neg=false) => (neg ? '-' : '') + n.toLocaleString('ko-KR');

            if (payrollTbody) {
                // Check if row for same empId already exists → update it
                let existingRow = null;
                payrollTbody.querySelectorAll('tr').forEach(row => {
                    if (row.cells[0]?.textContent.trim() === empId) existingRow = row;
                });

                const rowHTML = `
                    <td>${empId}</td>
                    <td>${name}</td>
                    <td class="text-right">${fmt(base)}</td>
                    <td class="text-right">${fmt(meal)}</td>
                    <td class="text-right">${fmt(ot)}</td>
                    <td class="text-right">${fmt(np, true)}</td>
                    <td class="text-right">${fmt(hi, true)}</td>
                    <td class="text-right">${fmt(ei, true)}</td>
                    <td class="text-right">${fmt(tax, true)}</td>
                    <td class="text-right highlight">${fmt(net)}</td>
                `;
                if (existingRow) {
                    existingRow.innerHTML = rowHTML;
                    existingRow.style.background = 'rgba(16,185,129,0.12)';
                    setTimeout(() => existingRow.style.background = '', 1500);
                } else {
                    const newRow = document.createElement('tr');
                    newRow.innerHTML = rowHTML;
                    newRow.style.background = 'rgba(59,130,246,0.10)';
                    payrollTbody.appendChild(newRow);
                    setTimeout(() => newRow.style.background = '', 1500);
                }
            }

            closePayrollModalFn();
        });
    }

});
