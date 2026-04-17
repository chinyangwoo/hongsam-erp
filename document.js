document.addEventListener('DOMContentLoaded', () => {

    // 1. Folder Navigation Logic
    const folderItems = document.querySelectorAll('.folder-item');
    
    folderItems.forEach(item => {
        item.addEventListener('click', function() {
            // Check for restricted access
            if(this.classList.contains('restricted')) {
                const confirmAuth = confirm('해당 폴더는 최고관리자(마스터/호스트) 전용 보안 폴더입니다.\n열람하시겠습니까?');
                if(!confirmAuth) return;
            }

            folderItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');

            // Update Breadcrumb Text
            const folderText = this.innerText.trim();
            const breadcrumbActive = document.querySelector('.breadcrumb span.active');
            if(breadcrumbActive) {
                breadcrumbActive.innerText = folderText;
            }
        });
    });

    // 2. Upload Button Mock
    const btnUploadDoc = document.getElementById('btnUploadDoc');
    if(btnUploadDoc) {
        btnUploadDoc.addEventListener('click', () => {
            alert('파일 업로드 창(모달)이 열립니다. (드래그 앤 드롭 지원 영역)');
        });
    }

    // 3. HWP Alert Modal Logic
    const hwpAlertModal = document.getElementById('hwpAlertModal');
    const closeHwpAlert = document.getElementById('closeHwpAlert');
    const btnHwpDownload = document.getElementById('btnHwpDownload');
    const restrictedViewBtns = document.querySelectorAll('.restricted-view');

    // Make it pop up when someone clicks eye icon on an HWP file
    restrictedViewBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = btn.getAttribute('data-type');
            if(type === 'hwp') {
                e.preventDefault(); // Stop normal view routine
                hwpAlertModal.classList.add('show');
            }
        });
    });

    const hideModal = () => {
        hwpAlertModal.classList.remove('show');
    };

    if(closeHwpAlert) closeHwpAlert.addEventListener('click', hideModal);
    
    if(btnHwpDownload) btnHwpDownload.addEventListener('click', () => {
        alert('한글 문서가 로컬 PC로 즉시 다운로드 됩니다.');
        hideModal();
    });

    hwpAlertModal.addEventListener('click', (e) => {
        if(e.target === hwpAlertModal) hideModal();
    });

});
