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
            alert('신규 사원이 성공적으로 등록되었습니다.');
            closeNewModal();
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
