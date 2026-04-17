document.addEventListener('DOMContentLoaded', () => {

    // 1. Tab Navigation Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => {
                c.style.display = 'none';
                c.classList.remove('active');
            });

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            const targetContent = document.getElementById(targetId);
            
            if(targetContent) {
                targetContent.style.display = 'block';
                setTimeout(() => targetContent.classList.add('active'), 10);
            }
        });
    });

    // 2. Mock Action for "Request Order" in Global Header
    const btnRequestOrder = document.getElementById('btnRequestOrder');
    if(btnRequestOrder) {
        btnRequestOrder.addEventListener('click', () => {
            alert('안전재고 미달 품목 (루프탑: 타월, 2층 스파: 바디워시)에 대한 일괄 발주안이 상신되었습니다.');
        });
    }

    // 3. Mock Action for Maintanence Form Submit
    const btnSubmitInspection = document.getElementById('btnSubmitInspection');
    if(btnSubmitInspection) {
        btnSubmitInspection.addEventListener('click', () => {
            alert('오늘(2026.04.17)자 시설 정기점검 완료 상태가 저장되었습니다.');
        });
    }

    // 4. Mock Action for +/- Buttons on table
    const btnIcons = document.querySelectorAll('.btn-icon');
    btnIcons.forEach(btn => {
        btn.addEventListener('click', function() {
            const row = this.closest('tr');
            const qtyCell = row.querySelector('td:nth-child(4)'); // 4th column is '현재 재고'
            
            if(!qtyCell) return;
            
            let currentText = qtyCell.innerText;
            let currentNum = parseInt(currentText.replace(/[^0-9]/g, ''), 10);
            let unit = currentText.replace(/[0-9\s]/g, ''); // Extract unit string like '장', 'Kg'

            if(this.title.includes('입고')) {
                currentNum += 1;
                qtyCell.innerHTML = `<strong>${currentNum}</strong> ${unit}`;
                qtyCell.style.color = '#10B981'; // Green flash
            } else if(this.title.includes('출고')) {
                if(currentNum > 0) currentNum -= 1;
                qtyCell.innerHTML = `<strong>${currentNum}</strong> ${unit}`;
                qtyCell.style.color = '#EF4444'; // Red flash
            }
            
            setTimeout(() => {
                qtyCell.style.color = ''; // Reset color
            }, 500);
        });
    });

    // 5. Ledger new registration
    const ledgerNewBtn = document.querySelector('.maint-panel .btn-text');
    if(ledgerNewBtn) {
        ledgerNewBtn.addEventListener('click', () => {
            alert('새로운 유지보수 고장 내용을 신규 등록합니다.');
        });
    }

});
