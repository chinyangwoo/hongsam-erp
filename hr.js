document.addEventListener('DOMContentLoaded', () => {

    const currentUserStr = localStorage.getItem('currentUser') || '';
    const empNum = parseInt(currentUserStr, 10);
    
    // ══════════════════════════════════════════════════════
    // HR 모듈 역할 분리
    // isAdminRole : 001 또는 is_admin 플래그 → 편집/삭제 가능
    // canViewAll  : 임원(002~009), 팀장(010~019) → 전체 열람 (편집 불가)
    // 그 외(크루) : 본인 인사카드만 열람
    // ══════════════════════════════════════════════════════
    let isAdminRole = false;
    let canViewAll = false;
    
    const ADMIN_IDS = ['001'];
    if (ADMIN_IDS.includes(currentUserStr)) {
        isAdminRole = true;
        canViewAll = true;
    } else if (empNum >= 1 && empNum <= 9) {
        // 임원급 (002~009): 전체 열람은 가능, 편집/삭제 불가
        canViewAll = true;
    } else if (empNum >= 10 && empNum <= 19) {
        // 팀장급 (010~019): 전체 열람 가능, 편집/삭제 불가
        canViewAll = true;
    }
    
    // Check HR DB for is_admin flag
    try {
        const empDb = JSON.parse(localStorage.getItem('hongsam_employees') || '[]');
        const rec = empDb.find(e => parseInt(e.emp_id, 10) === empNum);
        if (rec && rec.is_admin) {
            isAdminRole = true;
            canViewAll = true;
        }
    } catch(e) {}

    // 크루(본인만 열람) 전용 UI 처리
    if (!canViewAll) {
        // 일반 사원이면 관리자 전용 요소 숨김 처리
        document.querySelectorAll('.admin-only-element').forEach(el => el.style.display = 'none');
        // 인사기록카드 탭의 검색창도 숨김 (본인 것만 보이므로)
        const actionBar = document.querySelector('#tab-personnel .action-bar');
        if (actionBar) actionBar.style.display = 'none';
        
        // 페이지 제목을 '내 인사정보'로 변경
        const h1 = document.querySelector('.top-header h1');
        if (h1) h1.textContent = '내 인사정보';
        
        // 근태관리/급여관리 탭은 관리자 전용이므로 숨김
        document.querySelectorAll('.tab-btn').forEach(btn => {
            const target = btn.getAttribute('data-target');
            if (target === 'tab-attendance' || target === 'tab-payroll') {
                btn.style.display = 'none';
            }
        });
    } else if (!isAdminRole) {
        // 임원/팀장: 전체 열람은 가능하지만 편집 불가
        document.querySelectorAll('.admin-only-element').forEach(el => el.style.display = 'none');
    }

    // --- INIT EMPLOYEE DB ---
    function initHREmployees() {
        const KEY = 'hongsam_employees';
        let employees = [];
        try { employees = JSON.parse(localStorage.getItem(KEY)); } catch(_) {}
        
        if (!employees || employees.length === 0) {
            employees = [
                {
                    emp_id: "105", name: "홍길동", login_id: "105", login_pw: "0000",
                    department: "스파운영팀", team_detail: "2층 스파담당", rank: "크루", emp_type: "정규직", status: "재직",
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
        
        let employees = initHREmployees();
        if (!canViewAll && currentUserStr) {
            employees = employees.filter(e => parseInt(e.emp_id, 10) === empNum);
        }
        
        if (employees.length === 0) {
            grid.innerHTML = '<div style="text-align: center; padding: 40px; color: #94A3B8; width: 100%;">등록된 인사 정보가 없습니다.</div>';
            return;
        }

        employees.forEach(emp => {
            addEmployeeCard(emp);
        });
    }

    // Call it immediately on load
    renderAllEmployees();

    // --- ATTENDANCE EXCEL UPLOAD ---
    const attendanceExcelUpload = document.getElementById('attendanceExcelUpload');
    if (attendanceExcelUpload) {
        attendanceExcelUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(evt) {
                try {
                    const data = new Uint8Array(evt.target.result);
                    const workbook = window.XLSX.read(data, {type: 'array'});
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const rows = window.XLSX.utils.sheet_to_json(firstSheet, {header: 1});
                    
                    if (rows.length < 2) {
                        alert('데이터가 없거나 올바르지 않은 엑셀 형식입니다.');
                        return;
                    }

                    const headers = rows[0].map(h => h ? h.toString().replace(/\s+/g,'') : '');
                    
                    const findCol = (keywords) => {
                        for(let k of keywords) {
                            let idx = headers.findIndex(h => h.includes(k));
                            if(idx !== -1) return idx;
                        }
                        return -1;
                    };

                    const cDate = findCol(['날짜', '일자', 'Date']);
                    const cId = findCol(['사번', 'ID']);
                    const cName = findCol(['성명', '이름', '사원명']);
                    const cDept = findCol(['부서', '팀']);
                    const cIn = findCol(['출근', '지문', '시작', 'In']);
                    const cOut = findCol(['퇴근', '종료', 'Out']);

                    if (cId === -1 || cName === -1 || cIn === -1) {
                        alert('엑셀 양식에서 필수 컬럼(사번, 성명, 출근)을 찾을 수 없습니다.');
                        return;
                    }

                    const tbody = document.getElementById('attendanceTableBody');
                    if (!tbody) return;
                    tbody.innerHTML = '';

                    let statPresent = 0;
                    let statLate = 0;
                    let statAbsent = 0;
                    let statVacation = 0;

                    let hrEmployees = [];
                    try { hrEmployees = JSON.parse(localStorage.getItem('hongsam_employees') || '[]'); } catch(e){}

                    const today = new Date();
                    const defaultDateStr = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')}`;

                    let htmlString = '';

                    for (let i = 1; i < rows.length; i++) {
                        const row = rows[i];
                        if (!row || row.length === 0 || !row[cId] || !row[cName]) continue;

                        const empId = String(row[cId]).trim();
                        const name = row[cName] || '';
                        let dept = cDept !== -1 ? (row[cDept] || '') : '';
                        
                        if (!dept) {
                            const empInfo = hrEmployees.find(e => e.emp_id === empId);
                            if (empInfo) dept = empInfo.department;
                        }

                        let dateStr = cDate !== -1 ? (row[cDate] || defaultDateStr) : defaultDateStr;
                        
                        let inTimeRaw = row[cIn] || '';
                        let outTimeRaw = cOut !== -1 ? (row[cOut] || '') : '';
                        
                        let inTimeStr = inTimeRaw.toString().trim();
                        let outTimeStr = outTimeRaw.toString().trim();

                        let statusHtml = '';
                        
                        // 상태 자동 판별 로직
                        if (inTimeStr === '' || inTimeStr.includes('결근')) {
                            statusHtml = '<span class="status st-pending" style="color:#EF4444; background:rgba(239,68,68,0.1); padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:700;">결근</span>';
                            statAbsent++;
                            inTimeStr = '-';
                        } else if (inTimeStr.includes('휴가') || inTimeStr.includes('연차')) {
                            statusHtml = '<span class="status st-vacation" style="color:#6366F1; background:rgba(99,102,241,0.1); padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:700;">휴가</span>';
                            statVacation++;
                        } else {
                            // 지각 판별 (9시 정각 이후 출근 시 지각)
                            let isLate = false;
                            const timeMatch = inTimeStr.match(/(\d{1,2})[:시]\s*(\d{1,2})/);
                            if (timeMatch) {
                                const hour = parseInt(timeMatch[1], 10);
                                const min = parseInt(timeMatch[2], 10);
                                if (hour > 9 || (hour === 9 && min > 0)) {
                                    isLate = true;
                                }
                            } else if (inTimeStr.includes('지각')) {
                                isLate = true;
                            }
                            
                            if (isLate) {
                                statusHtml = '<span class="status st-pending" style="color:#F59E0B; background:rgba(245,158,11,0.1); padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:700;">지각</span>';
                                statLate++;
                            } else {
                                statusHtml = '<span class="status st-approved" style="color:#10B981; background:rgba(16,185,129,0.1); padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:700;">정상출근</span>';
                                statPresent++;
                            }
                        }
                        
                        if (!outTimeStr) outTimeStr = '-';

                        htmlString += `
                            <tr>
                                <td>${dateStr}</td>
                                <td>${empId}</td>
                                <td>${name}</td>
                                <td>${dept || '-'}</td>
                                <td class="time-stamp" style="font-family:monospace; color:#E2E8F0;">${inTimeStr}</td>
                                <td class="time-stamp" style="font-family:monospace; color:#E2E8F0;">${outTimeStr}</td>
                                <td>${statusHtml}</td>
                            </tr>
                        `;
                    }
                    
                    if (htmlString === '') {
                        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">업로드된 데이터가 없습니다.</td></tr>';
                    } else {
                        tbody.innerHTML = htmlString;
                    }

                    // 상단 요약 카드 수치 업데이트
                    const total = statPresent + statLate + statAbsent + statVacation;
                    if (document.getElementById('attPresent')) document.getElementById('attPresent').innerText = statPresent;
                    if (document.getElementById('attLate')) document.getElementById('attLate').innerText = statLate;
                    if (document.getElementById('attAbsent')) document.getElementById('attAbsent').innerText = statAbsent;
                    if (document.getElementById('attVacation')) document.getElementById('attVacation').innerText = statVacation;
                    
                    // 도넛 차트 업데이트 (CSS background conic-gradient 동적 변경)
                    const dcNum = document.querySelector('.donut-center .dc-num');
                    if (dcNum) dcNum.innerText = total;
                    
                    if (total > 0) {
                        const pDeg = (statPresent / total) * 360;
                        const aDeg = pDeg + (statAbsent / total) * 360;
                        const lDeg = aDeg + (statLate / total) * 360;
                        const chartDiv = document.getElementById('attDonutChart');
                        if (chartDiv) {
                            chartDiv.style.background = `conic-gradient(#10B981 0deg ${pDeg}deg, #EF4444 ${pDeg}deg ${aDeg}deg, #F59E0B ${aDeg}deg ${lDeg}deg, #6366F1 ${lDeg}deg 360deg)`;
                        }
                    }

                    // 범례 통계 텍스트도 업데이트
                    const legends = document.querySelectorAll('#tab-attendance .att-chart-box .att-legend .att-legend-item');
                    if (legends && legends.length >= 4) {
                        legends[0].innerHTML = `<div class="att-legend-dot" style="background:#10B981;"></div> 출근 ${statPresent}`;
                        legends[1].innerHTML = `<div class="att-legend-dot" style="background:#EF4444;"></div> 결근 ${statAbsent}`;
                        legends[2].innerHTML = `<div class="att-legend-dot" style="background:#F59E0B;"></div> 지각 ${statLate}`;
                        legends[3].innerHTML = `<div class="att-legend-dot" style="background:#6366F1;"></div> 휴가 ${statVacation}`;
                    }

                    if (typeof showSaveToast === 'function') {
                        showSaveToast(`근태 엑셀 데이터 연동 완료 (총 ${rows.length - 1}건)`);
                    } else {
                        alert('근태 엑셀 데이터가 성공적으로 반영되었습니다.');
                    }
                    attendanceExcelUpload.value = ''; // 초기화

                } catch (err) {
                    console.error(err);
                    alert('엑셀 파일 처리 중 오류가 발생했습니다: ' + err.message);
                }
            };
            reader.readAsArrayBuffer(file);
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
                setTimeout(() => {
                    targetContent.classList.add('active');
                    
                    // Highcharts breaks if rendered inside display:none. Trigger when visible!
                    if (targetId === 'tab-payroll' && !window.payrollChartsRendered) {
                        if (typeof renderPayrollCharts === 'function') {
                            renderPayrollCharts();
                            window.payrollChartsRendered = true;
                        }
                    }
                }, 10);
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
        let emp = null;
        try {
            const data = JSON.parse(localStorage.getItem('hongsam_employees') || '[]');
            emp = data.find(e => e.emp_id === String(employeeId));
        } catch(e) {}
        
        if (emp) {
            document.getElementById('profName').innerText = emp.name || '-';
            document.getElementById('profId').innerText = emp.emp_id || '-';
            
            const dept = emp.department || '';
            const tDetail = emp.team_detail ? `(${emp.team_detail})` : '';
            const rank = emp.rank || '사원';
            document.getElementById('profJob').innerText = `부서: ${dept} ${tDetail} / 직급: ${rank}`;
            
            document.getElementById('profHireDate').innerText = emp.hire_date || '-';
            document.getElementById('profPhone').innerText = emp.phone || '-';
            document.getElementById('profBirthDate').innerText = emp.birth_date || '-';
            
            let sal = emp.base_salary || '-';
            if (sal !== '-') sal = parseInt(sal.replace(/,/g, '')).toLocaleString('ko-KR') + ' 원';
            document.getElementById('profBaseSalary').innerText = sal;
            
            let familyInfo = emp.family_info || '';
            let notesInfo = emp.notes || '';
            let combined = [familyInfo, notesInfo].filter(Boolean).join(' / ');
            document.getElementById('profFamily').innerText = combined || '기록 없음';

            const profImg = document.getElementById('profImg');
            if (profImg) {
                profImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random&size=150`;
            }
            
            const profTags = document.getElementById('profTags');
            if (profTags) {
                const empTypeTag = emp.emp_type === '정규직' ? 'tag-important' : 'tag-hr';
                profTags.innerHTML = `
                    <span class="tag ${empTypeTag}">${emp.emp_type || '정규직'}</span>
                    <span class="tag tag-general">${emp.department || '팀 정보 없음'}</span>
                `;
            }
            // Clear timeline since it's mock
            const tl = document.getElementById('profTimeline');
            if(tl) {
                tl.innerHTML = `<li><div class="t-date">${emp.hire_date || ''}</div><div class="t-event">신규 입사</div></li>`;
            }
        }
        
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

    // 3.1 DB Export Action
    const btnExportDB = document.getElementById('btnExportDB');
    if (btnExportDB) {
        btnExportDB.addEventListener('click', () => {
            const dataStr = localStorage.getItem('hongsam_employees') || '[]';
            const blob = new Blob([dataStr], {type: "application/json;charset=utf-8"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            a.download = `홍삼스파_인사데이터_로컬백업_${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            if (typeof showSaveToast === 'function') {
                showSaveToast('로컬 저장소의 모든 인사 데이터가 파일로 영구 백업(다운로드) 되었습니다.');
            } else {
                alert('로컬 저장소의 모든 인사 데이터가 파일로 백업되었습니다.');
            }
        });
    }

    // 4. Add New Employee Modal Logic
    const btnAddNewEmployee = document.getElementById('btnAddNewEmployee');
    const newEmpModal = document.getElementById('newEmpModal');
    const closeNewEmpModal = document.getElementById('closeNewEmpModal');
    const closeNewEmpModalBtn = document.getElementById('closeNewEmpModalBtn');
    const saveNewEmpBtn = document.getElementById('saveNewEmpBtn');
    
    let isEditingEmp = false;
    
    // Photo preview
    const empPhotoUpload = document.getElementById('empPhotoUpload');
    const photoPreview = document.getElementById('photoPreview');
    
    if (empPhotoUpload) {
        empPhotoUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    const img = new Image();
                    img.onload = function() {
                        // 500KB 이하의 파일은 리사이징하지 않고 원본 그대로 사용 (애니메이션 GIF 및 고화질 유지)
                        if (file.size <= 500 * 1024) {
                            if (photoPreview) photoPreview.src = evt.target.result;
                            return;
                        }

                        // 500KB 초과 시 150x150 이하로 리사이징하여 localStorage 용량 초과 방지
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        const MAX_SIZE = 150;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_SIZE) {
                                height *= MAX_SIZE / width;
                                width = MAX_SIZE;
                            }
                        } else {
                            if (height > MAX_SIZE) {
                                width *= MAX_SIZE / height;
                                height = MAX_SIZE;
                            }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        // 원본 파일의 포맷을 최대한 유지 (GIF는 브라우저 Canvas 지원 한계로 PNG로 변환됨)
                        let exportType = file.type;
                        if (exportType !== 'image/jpeg' && exportType !== 'image/webp') {
                            exportType = 'image/png'; // PNG 포맷으로 투명도 유지
                        }
                        
                        if (photoPreview) photoPreview.src = canvas.toDataURL(exportType, 0.85);
                    };
                    img.onerror = function() {
                        alert('이미지를 불러올 수 없습니다. 지원되지 않는 형식(HEIC 등)이거나 손상된 파일일 수 있습니다. JPG나 PNG 파일을 사용해 주세요.');
                    };
                    img.src = evt.target.result;
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
            if(photoPreview) photoPreview.src = 'https://ui-avatars.com/api/?name=New&background=random';
        }
    }

    if(btnAddNewEmployee) {
        btnAddNewEmployee.addEventListener('click', () => {
            isEditingEmp = false;
            const titleEl = document.getElementById('newEmpModalTitle');
            if (titleEl) titleEl.innerText = '신규 사원 등록 (인사기록카드)';
            const idInput = document.getElementById('newEmpId');
            if (idInput) idInput.readOnly = false;
            
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
            if (photo && photo.src && !photo.src.includes('ui-avatars.com') && !photo.src.includes('via.placeholder.com')) {
                empData.photo = photo.src;
            }

            // 권한 수집
            const adminCheckbox = document.getElementById('newEmpAdmin');
            const isAdminGranted = adminCheckbox?.checked || false;
            const permRows = document.querySelectorAll('#newEmpForm .perm-table tbody tr');
            const perms = [];
            permRows.forEach(row => {
                const cells = row.querySelectorAll('input[type="checkbox"]');
                perms.push({
                    read: isAdminGranted ? true : (cells[0]?.checked || false),
                    write: isAdminGranted ? true : (cells[1]?.checked || false),
                });
            });
            empData.permissions = perms;
            empData.is_admin = isAdminGranted;

            // localStorage 저장
            const KEY = 'hongsam_employees';
            let employees = [];
            try { employees = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (_) {}

            // 중복 사번 검사
            const dupIdx = employees.findIndex(e => e.emp_id === empId);
            if (dupIdx >= 0) {
                if (!isEditingEmp) {
                    if (!confirm(`사번 ${empId}이(가) 이미 등록되어 있습니다. 덮어쓰시겠습니까?`)) return;
                }
                employees[dupIdx] = { ...employees[dupIdx], ...empData };
            } else {
                employees.push(empData);
            }
            localStorage.setItem(KEY, JSON.stringify(employees));

            // 카드 즉시 추가
            addEmployeeCard(empData);

            closeNewModal();
            if (isEditingEmp) {
                showSaveToast(`사원 정보 수정 완료: ${empName} (${empId})`);
            } else {
                showSaveToast(`사원 등록 완료: ${empName} (${empId})`);
            }
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
            '마스터': 'tag-important',
            '호스트': 'tag-important', 
            '큐레이터': 'tag-general',
            '크루': 'tag-general',
            '계약직': 'tag-hr',
            '알바': 'tag-hr'
        };
        const rankLabelMap = {
            '마스터': '대표(마스터)',
            '호스트': '총지배인(호스트)',
            '큐레이터': '팀장(큐레이터)',
            '크루': '팀원(크루)',
            '계약직': '계약직',
            '알바': '알바'
        };
        const tagCls = rankMap[emp.rank] || 'tag-general';
        const rankLabel = rankLabelMap[emp.rank] || emp.rank;
        const statusDot = emp.status === '재직' ? 'online' : 'offline';
        const statusText = emp.status === '재직' ? '정상근무' : emp.status;
        const imgSrc = emp.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random`;

        let actionsHtml = '';
        if (isAdminRole) {
            actionsHtml = `
            <div class="emp-card-actions">
                <button title="수정" onclick="event.stopPropagation(); editEmployee('${emp.emp_id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-del" title="삭제" onclick="event.stopPropagation(); deleteEmployee('${emp.emp_id}','${emp.name}')"><i class="fa-solid fa-trash"></i></button>
            </div>
            `;
        }

        const card = document.createElement('div');
        card.className = 'employee-card glassmorphism';
        card.setAttribute('data-emp-id', emp.emp_id);
        card.style.cursor = 'pointer';
        card.innerHTML = `
            ${actionsHtml}
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

                    const container = document.getElementById('payrollTablesContainer');
                    if (container) {
                        container.innerHTML = `
                            <h3 style="margin-bottom: 12px; font-size: 1.1rem; color: #60A5FA;">
                                <i class="fa-solid fa-calendar-check"></i> 엑셀 로드 임시 내역
                            </h3>
                            <table class="erp-table">
                                <thead>
                                    <tr>
                                        <th>사번</th>
                                        <th>직급</th>
                                        <th>이름</th>
                                        <th>기본급</th>
                                        <th>식대</th>
                                        <th>연장/야간수당</th>
                                        <th>4대보험료</th>
                                        <th>소득세/지방소득세</th>
                                        <th>실수령액</th>
                                    </tr>
                                </thead>
                                <tbody id="tempPayrollTbody"></tbody>
                            </table>
                        `;
                    }
                    const tbody = document.getElementById('tempPayrollTbody');
                    
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
                        
                        const insSum = Number(np) + Number(hi) + Number(ei);
                        const net = row[cNet] || ((Number(base)+Number(meal)+Number(ot)) - (insSum+Number(tax)));

                        const rowHTML = `
                            <tr>
                                <td>${empId}</td>
                                <td>${rank}</td>
                                <td>${name}</td>
                                <td class="text-right">${fmt(base)}</td>
                                <td class="text-right">${fmt(meal)}</td>
                                <td class="text-right">${fmt(ot)}</td>
                                <td class="text-right">${fmt(insSum, true)}</td>
                                <td class="text-right">${fmt(tax, true)}</td>
                                <td class="text-right highlight">${fmt(net)}</td>
                            </tr>
                        `;
                        if (tbody) tbody.insertAdjacentHTML('beforeend', rowHTML);
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

    const payrollInputIds = ['pBase','pMeal','pOT','pInsurance','pTax'];

    function calcNet() {
        const base = Number(document.getElementById('pBase')?.value) || 0;
        const meal = Number(document.getElementById('pMeal')?.value) || 0;
        const ot   = Number(document.getElementById('pOT')?.value)   || 0;
        const ins  = Number(document.getElementById('pInsurance')?.value) || 0;
        const tax  = Number(document.getElementById('pTax')?.value)  || 0;
        const net  = base + meal + ot - ins - tax;
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
            const ins  = Number(document.getElementById('pInsurance')?.value) || 0;
            const tax  = Number(document.getElementById('pTax')?.value)  || 0;
            const net  = base + meal + ot - ins - tax;

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
                    <td class="text-right">${fmt(ins, true)}</td>
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

        isEditingEmp = true;
        const titleEl = document.getElementById('newEmpModalTitle');
        if (titleEl) titleEl.innerText = '사원 정보 수정 (인사기록카드)';
        const idInput = document.getElementById('newEmpId');
        if (idInput) idInput.readOnly = true;

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

            // 모듈별 세부 권한 설정 복원
            if (emp.permissions && Array.isArray(emp.permissions)) {
                const permRows = document.querySelectorAll('#newEmpForm .perm-table tbody tr');
                permRows.forEach((row, idx) => {
                    const mappedPerm = emp.permissions[idx];
                    if (mappedPerm) {
                        const cells = row.querySelectorAll('input[type="checkbox"]');
                        if (cells[0]) cells[0].checked = !!mappedPerm.read;
                        if (cells[1]) cells[1].checked = !!mappedPerm.write;
                    }
                });
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
            if (!isAdminRole && parseInt(emp.emp_id, 10) !== empNum) return; // 비관리자는 본인 휴가만
            
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
                    ${isAdminRole ? `<button class="btn-primary" style="padding:6px 12px; font-size:0.8rem; background:linear-gradient(135deg, #10B981, #059669); border:none; border-radius:6px; cursor:pointer; color:white;" onclick="editLeave('${emp.emp_id}','${emp.name}',${total},${used})"><i class="fa-solid fa-pen"></i> 수정</button>` : `<span style="color:#64748B; font-size:0.8rem;">권한없음</span>`}
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



    function renderPayrollTable() {
        const container = document.getElementById('payrollTablesContainer');
        if (!container) return;
        
        let employees = [];
        try { employees = JSON.parse(localStorage.getItem('hongsam_employees') || '[]'); } catch(_) {}
        
        // Group payroll history by month
        const monthlyData = {};
        employees.forEach(emp => {
            if (!isAdminRole && parseInt(emp.emp_id, 10) !== empNum) return; // 비관리자는 본인 급여만
            if (emp.payroll_history && Array.isArray(emp.payroll_history)) {
                emp.payroll_history.forEach(ph => {
                    if (!ph.month) return;
                    if (!monthlyData[ph.month]) monthlyData[ph.month] = [];
                    monthlyData[ph.month].push({ ...emp, ...ph }); // Combine emp basic info + payroll record
                });
            }
        });

        // Sort months descending
        const sortedMonths = Object.keys(monthlyData).sort((a, b) => b.localeCompare(a));
        
        // Take top 12 months (Full year)
        const recentMonths = sortedMonths.slice(0, 12);
        
        if (recentMonths.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 30px; color: #94A3B8;">등록된 급여 정보가 없습니다. 급여대장 엑셀 업로드 또는 간편 입력을 사용하세요.</div>';
            return;
        }

        container.innerHTML = '';
        
        const tabsContainer = document.createElement('div');
        tabsContainer.style.display = 'flex';
        tabsContainer.style.gap = '10px';
        tabsContainer.style.marginBottom = '20px';
        tabsContainer.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        tabsContainer.style.paddingBottom = '10px';

        const contentContainer = document.createElement('div');
        
        const fmt = (n, neg=false) => {
            let num = Number(n) || 0;
            if(neg && num > 0) num = -num;
            return num.toLocaleString('ko-KR');
        };

        recentMonths.forEach((month, index) => {
            // Tab Button
            const tabBtn = document.createElement('button');
            tabBtn.textContent = month;
            tabBtn.style.padding = '8px 16px';
            tabBtn.style.borderRadius = '8px';
            tabBtn.style.border = 'none';
            tabBtn.style.cursor = 'pointer';
            tabBtn.style.fontWeight = '600';
            tabBtn.style.transition = 'all 0.2s ease';
            
            if (index === 0) {
                tabBtn.style.background = '#3B82F6';
                tabBtn.style.color = '#FFFFFF';
            } else {
                tabBtn.style.background = 'rgba(255,255,255,0.05)';
                tabBtn.style.color = '#94A3B8';
            }

            // Month Section
            const emps = monthlyData[month];
            emps.sort((a, b) => parseInt(a.emp_id, 10) - parseInt(b.emp_id, 10));
            
            const monthSection = document.createElement('div');
            monthSection.style.display = index === 0 ? 'block' : 'none';
            
            monthSection.innerHTML = `
                <h3 style="margin-bottom: 12px; font-size: 1.1rem; color: #60A5FA;">
                    <i class="fa-solid fa-calendar-check"></i> ${month}분 급여내역
                </h3>
                <table class="erp-table">
                    <thead>
                        <tr>
                            <th style="text-align: center;">사번</th>
                            <th style="text-align: center;">직급</th>
                            <th style="text-align: center;">이름</th>
                            <th class="text-right">기본급</th>
                            <th class="text-right">식대</th>
                            <th class="text-right">연장/야간수당</th>
                            <th class="text-right">4대보험료</th>
                            <th class="text-right">소득세/지방소득세</th>
                            <th class="text-right">실수령액</th>
                        </tr>
                    </thead>
                    <tbody>
                    </tbody>
                </table>
            `;
            
            const tbody = monthSection.querySelector('tbody');
            emps.forEach(emp => {
                const tr = document.createElement('tr');
                
                // Calculate combined 4대보험
                const insSum = (Number(emp.national_pension) || 0) + (Number(emp.health_insurance) || 0) + (Number(emp.employment_ins) || 0);
                
                tr.innerHTML = `
                    <td style="text-align: center;">${emp.emp_id || '-'}</td>
                    <td style="text-align: center;">${emp.rank || '-'}</td>
                    <td style="text-align: center;">${emp.name || '-'}</td>
                    <td class="text-right">${fmt(emp.base_salary)}</td>
                    <td class="text-right">${fmt(emp.meal_allowance)}</td>
                    <td class="text-right">${fmt(emp.ot_allowance)}</td>
                    <td class="text-right">${fmt(insSum, true)}</td>
                    <td class="text-right">${fmt(emp.income_tax, true)}</td>
                    <td class="text-right highlight">${fmt(emp.net_salary)}</td>
                `;
                tbody.appendChild(tr);
            });
            
            tabBtn.onclick = () => {
                Array.from(contentContainer.children).forEach(child => child.style.display = 'none');
                Array.from(tabsContainer.children).forEach(btn => {
                    btn.style.background = 'rgba(255,255,255,0.05)';
                    btn.style.color = '#94A3B8';
                });
                monthSection.style.display = 'block';
                tabBtn.style.background = '#3B82F6';
                tabBtn.style.color = '#FFFFFF';
                
                // 선택한 월에 맞게 KPI 갱신
                updatePayrollKPIs(month);
            };

            tabsContainer.appendChild(tabBtn);
            contentContainer.appendChild(monthSection);
        });

        container.appendChild(tabsContainer);
        container.appendChild(contentContainer);
    }

    async function updatePayrollKPIs(targetMonth = null) {
        let employees = [];
        try { employees = JSON.parse(localStorage.getItem('hongsam_employees') || '[]'); } catch(_) {}
        
        const monthlyData = {};
        employees.forEach(emp => {
            if (emp.payroll_history && Array.isArray(emp.payroll_history)) {
                emp.payroll_history.forEach(ph => {
                    if (!ph.month) return;
                    if (!monthlyData[ph.month]) monthlyData[ph.month] = [];
                    monthlyData[ph.month].push({ ...emp, ...ph });
                });
            }
        });
        const sortedMonths = Object.keys(monthlyData).sort((a, b) => b.localeCompare(a));
        const activeMonth = targetMonth || sortedMonths[0]; // e.g. "2026년 4월"
        if (!activeMonth) return;

        let totalPayroll = 0;

        (monthlyData[activeMonth] || []).forEach(emp => {
            const gross = Number(emp.base_salary||0) + Number(emp.meal_allowance||0) + Number(emp.ot_allowance||0);
            totalPayroll += gross;
        });

        // 1. 해당 월 급여지급총액
        const titleEl = document.getElementById('totalPayrollTitle');
        if (titleEl) {
            titleEl.textContent = `${activeMonth} 급여지급총액`;
        }
        
        const elTotalList = document.querySelectorAll('.kpi-card');
        elTotalList.forEach(card => {
            const h3 = card.querySelector('h3');
            if (h3 && h3.textContent.includes('급여지급총액')) {
                const amountP = card.querySelector('.amount');
                if (amountP) amountP.textContent = totalPayroll.toLocaleString();
            }
        });

        // 2. 월매출대비인건비비중
        let hotelMonthRev = 0;
        let spaMonthRev = 0;
        try {
            const HOTEL_API = 'https://hongsam.dothome.co.kr/api.php?action=load';
            const res = await fetch(HOTEL_API);
            if (res.ok) {
                const data = await res.json();
                let mMatch = activeMonth.match(/(\d{4})년 (\d{1,2})월/);
                if (mMatch) {
                    const y = mMatch[1];
                    const m = mMatch[2].padStart(2, '0');
                    data.forEach(r => {
                        if (r.date.startsWith(`${y}-${m}`)) hotelMonthRev += (r.revenue.total || 0);
                    });
                }
            }
        } catch(e) {}

        try {
            const revRes = await fetch('http://43.203.237.63:3001/api/db/erp_revenue_db');
            if (revRes.ok) {
                const revDb = await revRes.json();
                let mMatch = activeMonth.match(/(\d{4})년 (\d{1,2})월/);
                if (mMatch) {
                    const y = mMatch[1];
                    const m = mMatch[2].padStart(2, '0');
                    Object.keys(revDb).forEach(k => {
                        if (k.startsWith(`${y}-${m}`)) {
                            const tick = Number(revDb[k].spaTickRev) || 0;
                            const fb = Number(revDb[k].spaFbRev) || 0;
                            spaMonthRev += (tick + fb) * 10000;
                        }
                    });
                }
            }
        } catch(e) {
            console.warn("Failed to fetch spa revenue:", e);
        }

        const totalSales = hotelMonthRev + spaMonthRev;
        const ratioNum = totalSales > 0 ? (totalPayroll / totalSales) * 100 : 0;
        const ratio = ratioNum.toFixed(1);
        
        const ratioAmountEl = document.getElementById('payrollRatioAmount');
        const ratioBarEl = document.getElementById('payrollRatioBar');
        const diffDescEl = document.getElementById('payrollRatioDiff');
        
        if (ratioAmountEl) ratioAmountEl.textContent = ratio + '%';
        if (ratioBarEl) ratioBarEl.style.width = ratio + '%';

        if (diffDescEl) {
            const IDEAL_RATIO = 40.0;
            const diff = ratioNum - IDEAL_RATIO;
            const diffAbs = Math.abs(diff).toFixed(1);
            if (ratioNum === 0) {
                diffDescEl.innerHTML = `매출 데이터 없음`;
            } else if (diff > 0) {
                diffDescEl.innerHTML = `적정 인건비중(${IDEAL_RATIO}%) 대비 <span style="color:#EF4444; font-weight:bold;">${diffAbs}% 초과</span>`;
            } else {
                diffDescEl.innerHTML = `적정 인건비중(${IDEAL_RATIO}%) 대비 <span style="color:#10B981; font-weight:bold;">${diffAbs}% 감소</span>`;
            }
        }
    }


    renderVacationTable(); // 초기 연차현황 렌더링
    renderPayrollTable();  // 급여 테이블 렌더링
    updatePayrollKPIs();   // KPI 계산 및 표기

    // ─── 정적 카드에도 수정/삭제 버튼 추가 (관리자만) ───
    if (isAdminRole) {
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
    }

    // ─── 급여관리 하단 차트 렌더링 ───
    function renderPayrollCharts() {
        if (!window.Highcharts) {
            setTimeout(renderPayrollCharts, 200);
            return; // Wait for script load
        }

        // 1. 도넛 그래프: 전월매출 대비 총급여 비중
        // Mock Data: 전월매출 2억 3천만 (230,000,000) / 급여총액 6천 5백만 (65,400,000) -> 28.4%
        Highcharts.chart('payrollDonutChart', {
            chart: { type: 'pie', backgroundColor: 'transparent' },
            title: { 
                text: '전월매출 대비<br>급여지급비중', 
                align: 'center', 
                verticalAlign: 'middle', 
                y: 10,
                style: { color: '#F8FAFC', fontSize: '14px', fontWeight: 'bold' } 
            },
            tooltip: { formatter: function() { return `<b>${this.point.name}</b><br>금액: ${this.y.toLocaleString()} 원<br>비중: ${this.percentage.toFixed(1)}%`; } },
            plotOptions: {
                pie: {
                    innerSize: '75%',
                    borderWidth: 0,
                    dataLabels: { enabled: true, color: '#CBD5E1', connectorColor: '#64748B', style:{textOutline:'none'}, format: '<b>{point.name}</b><br>{point.percentage:.1f}%' }
                }
            },
            credits: { enabled: false },
            series: [{
                name: '금액',
                data: [
                    { name: '총급여 지급', y: 65400000, color: '#EF4444' },
                    { name: '잔여 매출', y: 164600000, color: '#3B82F6' }
                ]
            }]
        });

        // 2. 3D 차트: 1인당 매출 (전월매출 / 전월 방문객수)
        // Mock Data: 전월매출 230,000,000 / 방문객 4500명 = ~51,111원
        Highcharts.chart('perCapita3DChart', {
            chart: {
                type: 'column',
                backgroundColor: 'transparent',
                options3d: { enabled: true, alpha: 15, beta: 15, depth: 50, viewDistance: 25 }
            },
            title: { 
                text: '월별 1인당 객단가 (1인당 매출현황)', 
                style: { color: '#F8FAFC', fontSize: '15px', fontWeight: 'bold' } 
            },
            xAxis: {
                categories: ['11월', '12월', '1월', '2월', '3월', '4월(전망)'],
                labels: { style: { color: '#94A3B8' } }
            },
            yAxis: {
                title: { text: null },
                labels: { style: { color: '#94A3B8' }, format: '{value:,.0f} 원' },
                gridLineColor: 'rgba(255,255,255,0.05)'
            },
            tooltip: { formatter: function() { return `<b>${this.x}</b><br>1인당 매출: <b>${this.y.toLocaleString()} 원</b>`; } },
            plotOptions: {
                column: { depth: 40, colorByPoint: true, borderRadius: 4 }
            },
            colors: ['#64748B', '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#6366F1'],
            credits: { enabled: false },
            legend: { enabled: false },
            series: [{
                name: '1인당 매출',
                data: [42500, 48300, 46100, 49800, 51111, 55250]
            }]
        });
    }
    // Wait for the user to visit tab-payroll to render

    // ═══════════════════════════════════════════════════════════
    // 인사기록카드 PDF 다운로드 (html2canvas + jsPDF)
    // ═══════════════════════════════════════════════════════════
    const btnExportPdf = document.getElementById('btnExportPdf');
    if (btnExportPdf) {
        btnExportPdf.addEventListener('click', async () => {
            const modal = document.querySelector('#profileModal .modal-content');
            if (!modal) return;

            const empName = document.getElementById('profName')?.innerText || '사원';
            const empId = document.getElementById('profId')?.innerText || '';

            // 버튼 상태 변경
            btnExportPdf.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 생성중...';
            btnExportPdf.disabled = true;

            try {
                // html2canvas로 모달 캡처
                const canvas = await html2canvas(modal, {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#0F172A',
                    logging: false
                });

                // jsPDF A4 세로
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();

                // 이미지 비율 맞추기
                const imgWidth = pageWidth - 20; // 10mm 마진
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                // 여러 페이지 처리
                if (imgHeight <= pageHeight - 20) {
                    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, imgWidth, imgHeight);
                } else {
                    let yOffset = 0;
                    let pageNum = 0;
                    const sliceHeight = (pageHeight - 20) * (canvas.width / imgWidth);

                    while (yOffset < canvas.height) {
                        if (pageNum > 0) pdf.addPage();

                        const sliceCanvas = document.createElement('canvas');
                        sliceCanvas.width = canvas.width;
                        sliceCanvas.height = Math.min(sliceHeight, canvas.height - yOffset);
                        const ctx = sliceCanvas.getContext('2d');
                        ctx.drawImage(canvas, 0, yOffset, canvas.width, sliceCanvas.height, 0, 0, sliceCanvas.width, sliceCanvas.height);

                        const sliceImgHeight = (sliceCanvas.height * imgWidth) / sliceCanvas.width;
                        pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 10, 10, imgWidth, sliceImgHeight);

                        yOffset += sliceHeight;
                        pageNum++;
                    }
                }

                // 다운로드
                const dateStr = new Date().toISOString().slice(0, 10);
                pdf.save(`인사기록카드_${empName}_${empId}_${dateStr}.pdf`);
                showSaveToast(`${empName}님의 인사기록카드 PDF가 다운로드되었습니다.`);

            } catch (err) {
                console.error('PDF 생성 오류:', err);
                alert('PDF 생성 중 오류가 발생했습니다: ' + err.message);
            } finally {
                btnExportPdf.innerHTML = '<i class="fa-solid fa-file-pdf"></i> PDF';
                btnExportPdf.disabled = false;
            }
        });
    }
});
