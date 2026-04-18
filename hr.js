document.addEventListener('DOMContentLoaded', () => {

    // --- INIT EMPLOYEE DB ---
    function initHREmployees() {
        const KEY = 'hongsam_employees';
        let employees = [];
        try { employees = JSON.parse(localStorage.getItem(KEY)); } catch(_) {}
        
        if (!employees || employees.length === 0) {
            employees = [
                {
                    emp_id: "105", name: "홍길동", login_id: "105", login_pw: "0000",
                    department: "운영팀", team_detail: "2층 스파담당", rank: "크루", emp_type: "정규직", status: "재직",
                    photo: "https://ui-avatars.com/api/?name=홍길동&background=random"
                },
                {
                    emp_id: "021", name: "김지원", login_id: "021", login_pw: "0000",
                    department: "지원팀", team_detail: "인사/총무", rank: "큐레이터", emp_type: "정규직", status: "휴가중",
                    photo: "https://ui-avatars.com/api/?name=김지원&background=random"
                },
                {
                    emp_id: "203", name: "박철수", login_id: "203", login_pw: "0000",
                    department: "공무팀", team_detail: "시설/전기", rank: "크루", emp_type: "정규직", status: "재직",
                    photo: "https://ui-avatars.com/api/?name=박철수&background=random"
                },
                {
                    emp_id: "304", name: "이영희", login_id: "304", login_pw: "0000",
                    department: "식음료팀", team_detail: "루프탑", rank: "알바", emp_type: "계약직", status: "재직",
                    photo: "https://ui-avatars.com/api/?name=이영희&background=random"
                }
            ];
            localStorage.setItem(KEY, JSON.stringify(employees));
        }
        return employees;
    }

    function renderAllEmployees() {
        const grid = document.querySelector('.personnel-grid');
        if (!grid) return;
        grid.innerHTML = ''; // clear grid
        
        const employees = initHREmployees();
        employees.forEach(emp => {
            addEmployeeCard(emp);
        });
    }

    // Call it immediately on load
    renderAllEmployees();

    // --- SECURITY API SYNC (CAPS) ---
    const btnSyncSecurity = document.getElementById('btnSyncSecurity');
    if (btnSyncSecurity) {
        btnSyncSecurity.addEventListener('click', () => {
            btnSyncSecurity.disabled = true;
            const originalHTML = btnSyncSecurity.innerHTML;
            btnSyncSecurity.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> API 서버 연결 중...';
            
            setTimeout(() => {
                const tbody = document.getElementById('attendanceTableBody');
                if (!tbody) return;
                
                tbody.innerHTML = ''; // clear placeholder
                
                // Construct mock attendance log dynamically based on current employees
                let employees = [];
                try { employees = JSON.parse(localStorage.getItem('hongsam_employees')); } catch(_) {}
                if (!employees || employees.length === 0) employees = initHREmployees();

                const today = new Date();
                const dateStr = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')}`;
                
                // Shuffle/randomize to make it look real
                const logs = employees.map((emp, index) => {
                    // Make up some times
                    let inHour = 8;
                    let inMin = 30 + Math.floor(Math.random() * 45); // 08:30 to 09:14
                    let outHour = 18;
                    let outMin = Math.floor(Math.random() * 30);
                    
                    let statusHtml;
                    if (inHour === 9 && inMin > 0) {
                        statusHtml = '<span class="status st-pending" style="color:#F59E0B; background:rgba(245,158,11,0.1); padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:700;">지각</span>';
                    } else if (index % 5 === 2) {
                        statusHtml = '<span class="status st-vacation" style="color:#6366F1; background:rgba(99,102,241,0.1); padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:700;">휴가 (연차)</span>';
                        inHour = null;
                        outHour = null;
                    } else {
                        statusHtml = '<span class="status st-approved" style="color:#10B981; background:rgba(16,185,129,0.1); padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:700;">정상출근</span>';
                    }

                    const inTimeStr = inHour ? `${String(inHour).padStart(2,'0')}:${String(inMin).padStart(2,'0')}:1${index}` : '-';
                    const outTimeStr = outHour ? `${String(outHour).padStart(2,'0')}:${String(outMin).padStart(2,'0')}:4${index}` : '-';

                    return `
                        <tr>
                            <td>${dateStr}</td>
                            <td>${emp.emp_id}</td>
                            <td>${emp.name}</td>
                            <td>${emp.department || '-'}</td>
                            <td class="time-stamp" style="font-family:monospace; color:#E2E8F0;">${inTimeStr}</td>
                            <td class="time-stamp" style="font-family:monospace; color:#E2E8F0;">${outTimeStr}</td>
                            <td>${statusHtml}</td>
                        </tr>
                    `;
                });

                tbody.innerHTML = logs.join('');
                
                // Provide UI feedback
                btnSyncSecurity.innerHTML = '<i class="fa-solid fa-check"></i> 동기화 완료';
                btnSyncSecurity.style.background = 'linear-gradient(135deg, #3B82F6, #2563EB)';
                
                showSaveToast('보안서버(캡스)에서 오늘자 출퇴근 기록을 성공적으로 동기화했습니다.');
                
                setTimeout(() => {
                    btnSyncSecurity.disabled = false;
                    btnSyncSecurity.innerHTML = originalHTML;
                    btnSyncSecurity.style.background = '';
                }, 4000);
            }, 2000); // 2 sec fake delay
        });
    }

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
    
    // Admin 체크 로직
    const adminCheckbox = document.getElementById('newEmpAdmin');
    if (adminCheckbox) {
        adminCheckbox.addEventListener('change', (e) => {
            const checks = document.querySelectorAll('#newEmpForm .perm-table tbody input[type="checkbox"]');
            if (e.target.checked) {
                checks.forEach(c => c.checked = true);
            }
        });
    }

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
                login_id:         empId,
                login_pw:         '0000',
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
            const isAdmin = document.getElementById('newEmpAdmin')?.checked || false;
            const permRows = document.querySelectorAll('#newEmpForm .perm-table tbody tr');
            const perms = [];
            permRows.forEach(row => {
                const cells = row.querySelectorAll('input[type="checkbox"]');
                perms.push({
                    read: isAdmin ? true : (cells[0]?.checked || false),
                    write: isAdmin ? true : (cells[1]?.checked || false),
                });
            });
            empData.permissions = perms;
            empData.is_admin = isAdmin;

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
            '마스터': 'tag-important', '임원': 'tag-important',
            '호스트': 'tag-important', 
            '큐레이터': 'tag-general',
            '크루': 'tag-general',
            '계약직': 'tag-hr'
        };
        const rankLabelMap = {
            '마스터': '마스터(대표이사)',
            '임원': '임원',
            '호스트': '호스트(지배인)',
            '큐레이터': '큐레이터(팀장)',
            '크루': '크루(팀원)',
            '계약직': '계약직'
        };
        const tagCls = rankMap[emp.rank] || 'tag-general';
        const rankLabel = rankLabelMap[emp.rank] || emp.rank;
        const statusDot = emp.status === '재직' ? 'online' : 'offline';
        const statusText = emp.status === '재직' ? '정상근무' : emp.status;
        const imgSrc = emp.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random`;

        const card = document.createElement('div');
        card.className = 'employee-card glassmorphism';
        card.setAttribute('data-emp-id', emp.emp_id);
        card.style.cursor = 'pointer';
        card.innerHTML = `
            <div class="emp-card-actions">
                <button title="수정" onclick="event.stopPropagation(); editEmployee('${emp.emp_id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-del" title="삭제" onclick="event.stopPropagation(); deleteEmployee('${emp.emp_id}','${emp.name}')"><i class="fa-solid fa-trash"></i></button>
            </div>
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
        card.addEventListener('click', () => openProfileModal(emp.emp_id));
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
    
    // --- NEW: Payroll Excel Upload Handler ---
    const payrollExcelUpload = document.getElementById('payrollExcelUpload');
    if (payrollExcelUpload) {
        payrollExcelUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(evt) {
                try {
                    const data = new Uint8Array(evt.target.result);
                    // Use XLSX from global (loaded in HTML)
                    const workbook = window.XLSX.read(data, {type: 'array'});
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    // Treat first row as header
                    const rows = window.XLSX.utils.sheet_to_json(firstSheet, {header: 1});
                    
                    if (rows.length < 2) {
                        alert('데이터가 없거나 올바르지 않은 엑셀 형식입니다.');
                        return;
                    }

                    const headers = rows[0].map(h => h ? h.toString().replace(/\s+/g,'') : '');
                    
                    // Simple heuristic mapping for Douzone-like columns
                    // We need indices for: 사번, 직급, 성명, 기본급, 식대, 연장/야간, 국민연금, 건강보험, 고용보험, 소득세+지방소득세, 차인지급액(실수령)
                    const findCol = (keywords) => {
                        for(let k of keywords) {
                            let idx = headers.findIndex(h => h.includes(k));
                            if(idx !== -1) return idx;
                        }
                        return -1;
                    };

                    const cId = findCol(['사번','ID']);
                    const cRank = findCol(['직위','직급','Rank']);
                    const cName = findCol(['성명','이름','사원명']);
                    const cBase = findCol(['기본급','급여']);
                    const cMeal = findCol(['식대']);
                    const cOt = findCol(['연장','수당','야간','야간수당']);
                    const cNp = findCol(['국민연금']);
                    const cHi = findCol(['건강보험']);
                    const cEi = findCol(['고용보험']);
                    const cTax = findCol(['근세','소득세','주민세','지방']);
                    const cNet = findCol(['차인','지급액','실수령','차인지급액']);

                    if (cId === -1 || cName === -1) {
                        alert('엑셀 양식에서 "사번"이나 "성명" 컬럼을 찾을 수 없습니다.');
                        return;
                    }

                    const tbody = document.getElementById('payrollTableBody');
                    if (tbody) tbody.innerHTML = ''; // Clear empty placeholder
                    
                    let hrEmployees = [];
                    try { hrEmployees = JSON.parse(localStorage.getItem('hongsam_employees') || '[]'); } catch(e){}

                    const fmt = (n, neg=false) => {
                        let num = Number(n) || 0;
                        if(neg && num > 0) num = -num;
                        return num.toLocaleString('ko-KR');
                    };

                    for (let i = 1; i < rows.length; i++) {
                        const row = rows[i];
                        if (!row || row.length === 0 || !row[cId] || !row[cName]) continue;

                        const empId = String(row[cId]).trim();
                        let rank = cRank !== -1 ? (row[cRank] || '') : '';
                        const name = row[cName] || '';
                        
                        // If rank not provided in excel, try getting from localStorage
                        if (!rank) {
                            const empInfo = hrEmployees.find(e => e.emp_id === empId);
                            if (empInfo) rank = empInfo.rank;
                        }

                        const base = row[cBase] || 0;
                        const meal = row[cMeal] || 0;
                        const ot = row[cOt] || 0;
                        const np = row[cNp] || 0;
                        const hi = row[cHi] || 0;
                        const ei = row[cEi] || 0;
                        const tax = row[cTax] || 0;
                        const net = row[cNet] || ((Number(base)+Number(meal)+Number(ot)) - (Number(np)+Number(hi)+Number(ei)+Number(tax)));

                        const rowHTML = `
                            <tr>
                                <td>${empId}</td>
                                <td>${rank}</td>
                                <td>${name}</td>
                                <td class="text-right">${fmt(base)}</td>
                                <td class="text-right">${fmt(meal)}</td>
                                <td class="text-right">${fmt(ot)}</td>
                                <td class="text-right">${fmt(np, true)}</td>
                                <td class="text-right">${fmt(hi, true)}</td>
                                <td class="text-right">${fmt(ei, true)}</td>
                                <td class="text-right">${fmt(tax, true)}</td>
                                <td class="text-right highlight">${fmt(net)}</td>
                            </tr>
                        `;
                        tbody.insertAdjacentHTML('beforeend', rowHTML);
                    }

                    showSaveToast('급여 엑셀 데이터가 성공적으로 로드되었습니다.');
                    payrollExcelUpload.value = ''; // reset

                } catch (err) {
                    console.error(err);
                    alert('엑셀 파일 처리 중 오류가 발생했습니다: ' + err.message);
                }
            };
            reader.readAsArrayBuffer(file);
        });
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

            let rank = '-';
            try {
                const employees = JSON.parse(localStorage.getItem('hongsam_employees') || '[]');
                const emp = employees.find(e => e.emp_id === empIdStr);
                if (emp) rank = emp.rank;
            } catch(e) {}


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
                    <td>${rank}</td>
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

    // ─── 인사기록카드 수정 ───
    window.editEmployee = function(empId) {
        const KEY = 'hongsam_employees';
        let employees = [];
        try { employees = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (_) {}
        const emp = employees.find(e => e.emp_id === empId);
        
        if (!emp) {
            alert(`사번 ${empId}의 데이터를 찾을 수 없습니다.\n(localStorage에 저장된 사원만 수정 가능)`);
            return;
        }

        // 신규 사원 등록 모달을 열고 기존 데이터 채우기
        if (newEmpModal) newEmpModal.classList.add('show');
        
        setTimeout(() => {
            const setVal = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
            setVal('newEmpId', emp.emp_id);
            setVal('newEmpName', emp.name);
            setVal('newEmpBirth', emp.birth_date);
            setVal('newEmpGender', emp.gender);
            setVal('newEmpIdFront', emp.id_front);
            setVal('newEmpPhone', emp.phone);
            setVal('newEmpEmergPhone', emp.emergency_phone);
            setVal('newEmpEmail', emp.email);
            setVal('newEmpAddr', emp.address);
            setVal('newEmpHireDate', emp.hire_date);
            setVal('newEmpDept', emp.department);
            setVal('newEmpTeamDetail', emp.team_detail);
            setVal('newEmpRank', emp.rank);
            setVal('newEmpType', emp.emp_type);
            setVal('newEmpContractEnd', emp.contract_end);
            setVal('newEmpAnnualSalary', emp.annual_salary);
            setVal('newEmpBaseSalary', emp.base_salary);
            setVal('newEmpFamily', emp.family_info);
            setVal('newEmpNotes', emp.notes);
            if (document.getElementById('newEmpAdmin')) {
                document.getElementById('newEmpAdmin').checked = !!emp.is_admin;
            }
            if (emp.photo && photoPreview) photoPreview.src = emp.photo;
        }, 100);
    };

    // ─── 인사기록카드 삭제 ───
    window.deleteEmployee = function(empId, empName) {
        if (!confirm(`"${empName}" (사번: ${empId}) 사원을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) return;
        
        const KEY = 'hongsam_employees';
        let employees = [];
        try { employees = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (_) {}
        employees = employees.filter(e => e.emp_id !== empId);
        localStorage.setItem(KEY, JSON.stringify(employees));
        
        // 카드 제거
        const card = document.querySelector(`[data-emp-id="${empId}"]`);
        if (card) {
            card.style.transition = 'opacity 0.3s, transform 0.3s';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.9)';
            setTimeout(() => card.remove(), 300);
        }
        
        showSaveToast(`"${empName}" 사원이 삭제되었습니다.`);
    };

    // ─── 연차/휴가 관련 로직 ───
    function renderVacationTable() {
        const tbody = document.getElementById('vacationTableBody');
        if (!tbody) return;
        
        let employees = [];
        try { employees = JSON.parse(localStorage.getItem('hongsam_employees') || '[]'); } catch(_) {}
        
        if (employees.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 30px;">등록된 사원이 없습니다. 인사기록카드에서 사원을 등록해주세요.</td></tr>';
            return;
        }

        // Sort by emp_id ascending
        employees.sort((a, b) => parseInt(a.emp_id, 10) - parseInt(b.emp_id, 10));

        tbody.innerHTML = '';
        employees.forEach(emp => {
            const total = parseInt(emp.total_vacation) || 15;
            const used = parseInt(emp.used_vacation) || 0;
            const remain = total - used;
            const rate = total > 0 ? (used / total) * 100 : 0;
            const rateFormatted = rate.toFixed(1);
            
            let remainClass = remain <= 3 ? 'late-stamp text-right' : 'highlight text-right';
            let barColor = rate >= 80 ? 'var(--accent-red)' : rate >= 50 ? 'var(--accent-orange)' : 'var(--accent-blue)';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${emp.emp_id}</td>
                <td>${emp.name}</td>
                <td>${emp.department || '-'}</td>
                <td>${total}일</td>
                <td>${used}일</td>
                <td class="${remainClass}">${remain}일</td>
                <td class="progress-cell" style="padding-top:14px;">
                    <div class="progress-bar-bg" style="margin:0;">
                        <div class="progress-bar-fill" style="width: ${rate}%; background: ${barColor};"></div>
                    </div>
                    <div style="font-size:0.75rem; color:#94A3B8; text-align:right; margin-top:6px; font-weight:600;">사용률: ${rateFormatted}%</div>
                </td>
                <td>
                    <button class="btn-primary" style="padding:6px 12px; font-size:0.8rem; background:linear-gradient(135deg, #10B981, #059669); border:none; border-radius:6px; cursor:pointer; color:white;" onclick="editLeave('${emp.emp_id}','${emp.name}',${total},${used})"><i class="fa-solid fa-pen"></i> 수정</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    window.editLeave = function(empId, empName, totalDays, usedDays) {
        const newTotal = prompt(`[${empName}] 사원의 총 연차 배정일수를 입력하세요:`, totalDays);
        if (newTotal === null) return;
        const newUsed = prompt(`[${empName}] 사원의 사용 연차일수를 입력하세요:`, usedDays);
        if (newUsed === null) return;
        
        const total = parseInt(newTotal, 10);
        const used = parseInt(newUsed, 10);
        if (isNaN(total) || isNaN(used) || total < 0 || used < 0) {
            alert('유효한 숫자를 입력해 주세요.');
            return;
        }

        const KEY = 'hongsam_employees';
        let employees = [];
        try { employees = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch(_) {}
        
        const idx = employees.findIndex(e => e.emp_id === empId);
        if (idx !== -1) {
            employees[idx].total_vacation = total;
            employees[idx].used_vacation = used;
            localStorage.setItem(KEY, JSON.stringify(employees));
        }

        renderVacationTable();
        const remain = total - used;
        showSaveToast(`${empName} 사원의 연차 정보가 수정되었습니다. (배정:${total}일, 사용:${used}일, 잔여:${remain}일)`);
    };

    // ─── 페이지 로드 시 localStorage의 사원을 그리드에 렌더 ───
    function loadSavedEmployees() {
        const KEY = 'hongsam_employees';
        try {
            const employees = JSON.parse(localStorage.getItem(KEY) || '[]');
            employees.forEach(emp => addEmployeeCard(emp));
        } catch (_) {}
    }
    loadSavedEmployees();
    renderVacationTable(); // 초기 연차현황 렌더링

    // ─── 정적 카드에도 수정/삭제 버튼 추가 ───
    document.querySelectorAll('.employee-card').forEach(card => {
        if (!card.querySelector('.emp-card-actions')) {
            const empIdEl = card.querySelector('.emp-id');
            const empNameEl = card.querySelector('.emp-name');
            if (empIdEl) {
                const eid = empIdEl.textContent.trim();
                const ename = empNameEl ? empNameEl.childNodes[0].textContent.trim() : '';
                const actions = document.createElement('div');
                actions.className = 'emp-card-actions';
                actions.innerHTML = `
                    <button title="수정" onclick="event.stopPropagation(); editEmployee('${eid}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-del" title="삭제" onclick="event.stopPropagation(); deleteEmployee('${eid}','${ename}')"><i class="fa-solid fa-trash"></i></button>
                `;
                card.appendChild(actions);
            }
        }
    });

});
