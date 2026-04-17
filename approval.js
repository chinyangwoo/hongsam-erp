document.addEventListener('DOMContentLoaded', () => {

    // 1. Navigation highlight logic in Left LNB
    const apNavItems = document.querySelectorAll('.ap-nav-list li');
    apNavItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active from all
            document.querySelectorAll('.ap-nav-list li').forEach(i => i.classList.remove('active'));
            // Add to clicked
            this.classList.add('active');
            
            // Update breadcrumb title
            const breadTitle = document.querySelector('.bread-title h2');
            breadTitle.innerHTML = `<i class="${this.querySelector('i').className}"></i> ${this.innerText.replace(/[0-9]/g, '').trim()}`;
            
            // In a real app, this would fetch different documents
        });
    });

    // 2. Open Document Viewer Modal
    const docItems = document.querySelectorAll('.doc-actionable');
    const docViewer = document.getElementById('docViewer');
    const btnCloseViewer = document.getElementById('btnCloseViewer');

    docItems.forEach(item => {
        item.addEventListener('click', () => {
            // Retrieve data-doc-id and fetch data in real scenario. 
            // Here we just display the overlay.
            docViewer.style.display = 'flex';
        });
    });

    const hideViewer = () => {
        docViewer.style.display = 'none';
    };

    if(btnCloseViewer) btnCloseViewer.addEventListener('click', hideViewer);

    // 3. New Draft Selector Modal
    const btnNewDraft = document.getElementById('btnNewDraft');
    const draftModal = document.getElementById('draftModal');
    const closeDraftModal = document.getElementById('closeDraftModal');

    if(btnNewDraft) {
        btnNewDraft.addEventListener('click', () => {
            draftModal.classList.add('show');
        });
    }

    const hideDraftModal = () => {
        draftModal.classList.remove('show');
    };

    if(closeDraftModal) closeDraftModal.addEventListener('click', hideDraftModal);
    
    draftModal.addEventListener('click', (e) => {
        if(e.target === draftModal) {
            hideDraftModal();
        }
    });

    // 4. Approval / Rejection mock actions
    const btnApprove = document.querySelector('.btn-approve');
    const btnReject = document.querySelector('.btn-reject');
    
    if(btnApprove) {
        btnApprove.addEventListener('click', () => {
            alert('성공적으로 결재(승인)가 완료되었습니다.');
            hideViewer();
        });
    }

    if(btnReject) {
        btnReject.addEventListener('click', () => {
             const reason = prompt('반려 사유를 입력하세요:');
             if(reason) {
                 alert('해당 문서가 반려 처리되었습니다. 사유: ' + reason);
                 hideViewer();
             }
        });
    }

});
