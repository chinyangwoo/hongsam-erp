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

    // 4. Add New Employee Button
    const btnAddNewEmployee = document.getElementById('btnAddNewEmployee');
    if(btnAddNewEmployee) {
        btnAddNewEmployee.addEventListener('click', () => {
            alert('신규 사원 등록 양식이 준비 중입니다. (기능 연동 대기)');
        });
    }

});
