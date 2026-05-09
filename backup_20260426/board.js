document.addEventListener('DOMContentLoaded', () => {

    // Category Tabs Logic
    const catBtns = document.querySelectorAll('.b-cat-btn');
    catBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            catBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const selectedText = this.innerText.trim();
            const rows = document.querySelectorAll('.erp-table tbody tr');
            
            rows.forEach(row => {
                if(selectedText === '전체 글') {
                    row.style.display = 'table-row';
                } else {
                    const badge = row.querySelector('.badge-cat');
                    if(badge && badge.innerText.includes(selectedText)) {
                        row.style.display = 'table-row';
                    } else {
                        row.style.display = 'none';
                    }
                }
            });
        });
    });

    // Write New Post btn
    const btnWritePost = document.getElementById('btnWritePost');
    if(btnWritePost) {
        btnWritePost.addEventListener('click', () => {
            alert('웹 에디터(WYSIWYG)가 포함된 새 글 쓰기 화면으로 이동합니다.');
        });
    }

    // Modal logic for reading a post
    const postRows = document.querySelectorAll('.clickable-row');
    const postModal = document.getElementById('postModal');
    const closePostModal = document.getElementById('closePostModal');

    postRows.forEach(row => {
        row.addEventListener('click', () => {
            postModal.classList.add('show');
        });
    });

    const hidePostModal = () => {
        postModal.classList.remove('show');
    };

    if(closePostModal) closePostModal.addEventListener('click', hidePostModal);
    
    postModal.addEventListener('click', (e) => {
        if(e.target === postModal) {
            hidePostModal();
        }
    });

    // Pagination logic mock
    const pageBtns = document.querySelectorAll('.page-btn');
    pageBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            if(!this.classList.contains('active') && !this.querySelector('i')) {
                pageBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                alert(this.innerText + ' 페이지로 이동합니다.');
            }
        });
    });

});
