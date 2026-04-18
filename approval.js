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

    // 3. Draft Form Editor Logic
    const btnNewDraft = document.getElementById('btnNewDraft');
    const draftEditModal = document.getElementById('draftEditModal');
    const closeDraftEditModal = document.getElementById('closeDraftEditModal');
    const btnCancelDraftBtn = document.getElementById('btnCancelDraftBtn');
    const btnSubmitDraft = document.getElementById('btnSubmitDraft');
    
    // Approval Line Logic
    const drafterRole = document.getElementById('drafterRole');
    const approver1 = document.getElementById('approver1');
    const approver2 = document.getElementById('approver2');

    if (drafterRole && approver1 && approver2) {
        drafterRole.addEventListener('change', (e) => {
            const role = e.target.value;
            if (role === 'crew') {
                approver1.value = '큐레이터 (팀장)';
                approver2.value = '호스트 (지배인)';
            } else if (role === 'curator') {
                approver1.value = '호스트 (지배인)';
                approver2.value = '진양우 (대표이사)';
            }
        });
    }

    const showDraftEdit = () => {
        if (draftEditModal) {
            const draftSubject = document.getElementById('draftSubject');
            const draftType = document.getElementById('draftType');
            if (draftSubject) draftSubject.value = '';
            if (draftType) draftType.value = '지출결의서';
            
            if (drafterRole && approver1 && approver2) {
                drafterRole.value = 'crew';
                approver1.value = '큐레이터 (팀장)';
                approver2.value = '호스트 (지배인)';
            }
            draftEditModal.classList.add('show');
        }
    };

    const hideDraftEdit = () => {
        if (draftEditModal) draftEditModal.classList.remove('show');
    };

    if (btnNewDraft) btnNewDraft.addEventListener('click', showDraftEdit);

    if (closeDraftEditModal) closeDraftEditModal.addEventListener('click', hideDraftEdit);
    if (btnCancelDraftBtn) btnCancelDraftBtn.addEventListener('click', hideDraftEdit);
    
    // Close on outside click
    if (draftEditModal) {
        draftEditModal.addEventListener('click', (e) => {
            if (e.target === draftEditModal) {
                hideDraftEdit();
            }
        });
    }

    if (btnSubmitDraft) {
        btnSubmitDraft.addEventListener('click', () => {
            const subject = document.getElementById('draftSubject').value;
            const draftTypeSelect = document.getElementById('draftType');
            const draftType = draftTypeSelect ? draftTypeSelect.value : '기안서';
            
            if (!subject) {
                alert('문서 제목을 입력해주세요.');
                return;
            }
            alert(`[${draftType}] "${subject}"\n기안이 성공적으로 상신되었습니다.\n결재 진행 현황은 '결재 한 문서'함에서 확인할 수 있습니다.`);
            hideDraftEdit();
        });
    }

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
