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

    // 5. Ledger (Maintenance) Modal Logic
    const ledgerModal    = document.getElementById('ledgerModal');
    const btnNewLedger   = document.getElementById('btnNewLedger');
    const closeLedgerModal  = document.getElementById('closeLedgerModal');
    const cancelLedgerModal = document.getElementById('cancelLedgerModal');
    const saveLedgerBtn  = document.getElementById('saveLedgerBtn');
    const ledgerListContainer = document.querySelector('.ledger-list-container');

    function openLedgerModal() {
        if (!ledgerModal) return;
        ['lTitle','lDesc','lManager','lCost'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const lStatus = document.getElementById('lStatus');
        if (lStatus) lStatus.selectedIndex = 0;
        ledgerModal.style.display = 'flex';
    }

    function closeLedgerModalFn() {
        if (ledgerModal) ledgerModal.style.display = 'none';
    }

    if (btnNewLedger)      btnNewLedger.addEventListener('click', openLedgerModal);
    if (closeLedgerModal)  closeLedgerModal.addEventListener('click', closeLedgerModalFn);
    if (cancelLedgerModal) cancelLedgerModal.addEventListener('click', closeLedgerModalFn);
    if (ledgerModal) {
        ledgerModal.addEventListener('click', (e) => {
            if (e.target === ledgerModal) closeLedgerModalFn();
        });
    }

    if (saveLedgerBtn) {
        saveLedgerBtn.addEventListener('click', () => {
            const title   = document.getElementById('lTitle')?.value.trim();
            const desc    = document.getElementById('lDesc')?.value.trim();
            const manager = document.getElementById('lManager')?.value.trim();
            const cost    = document.getElementById('lCost')?.value.trim();
            const status  = document.getElementById('lStatus')?.value;

            if (!title) {
                alert('고장 내용(제목)을 입력해주세요.');
                return;
            }

            const today = new Date().toLocaleDateString('ko-KR').replace(/\. /g,'.').replace('.','').slice(0,-1);

            // status → CSS class + tag class
            const statusClassMap = { '접수대기': 'pending', '수리중': 'critical', '수리완료': 'resolved' };
            const tagClassMap    = { '접수대기': 'tag-hr', '수리중': 'tag-important', '수리완료': 'tag-general' };
            const itemClass = statusClassMap[status] || 'pending';
            const tagClass  = tagClassMap[status]  || 'tag-hr';

            const card = document.createElement('div');
            card.className = `ledger-item ${itemClass}`;
            card.style.background = 'rgba(59,130,246,0.07)';
            card.innerHTML = `
                <div class="ledger-meta">
                    <span class="tag ${tagClass}">${status}</span>
                    <span class="l-date">접수: ${today}</span>
                </div>
                <h4>${title}</h4>
                <p>${desc || '상세 내용 없음.'}</p>
                <div class="l-footer">
                    <span>담당: ${manager || '미배정'}</span>
                    <span>비용 예상: ${cost || '미정'}</span>
                </div>
            `;

            if (ledgerListContainer) {
                // Insert at top so newest is first
                ledgerListContainer.insertBefore(card, ledgerListContainer.firstChild);
                setTimeout(() => card.style.background = '', 1500);
            }

            closeLedgerModalFn();
        });
    }

    // 6. Vendor Add Modal Logic
    const vendorModal    = document.getElementById('vendorModal');
    const btnAddVendor   = document.getElementById('btnAddVendor');
    const closeVendorModal  = document.getElementById('closeVendorModal');
    const cancelVendorModal = document.getElementById('cancelVendorModal');
    const saveVendorBtn  = document.getElementById('saveVendorBtn');
    const vendorTbody    = document.querySelector('#tab-vendors table tbody');

    function openVendorModal() {
        if (!vendorModal) return;
        ['vItemName','vSupplierName','vManagerName','vContact'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        vendorModal.style.display = 'flex';
    }

    function closeVendorModalFn() {
        if (vendorModal) vendorModal.style.display = 'none';
    }

    if (btnAddVendor)      btnAddVendor.addEventListener('click', openVendorModal);
    if (closeVendorModal)  closeVendorModal.addEventListener('click', closeVendorModalFn);
    if (cancelVendorModal) cancelVendorModal.addEventListener('click', closeVendorModalFn);

    // Close on backdrop click
    if (vendorModal) {
        vendorModal.addEventListener('click', (e) => {
            if (e.target === vendorModal) closeVendorModalFn();
        });
    }

    if (saveVendorBtn) {
        saveVendorBtn.addEventListener('click', () => {
            const itemName     = document.getElementById('vItemName')?.value.trim();
            const supplierName = document.getElementById('vSupplierName')?.value.trim();
            const managerName  = document.getElementById('vManagerName')?.value.trim();
            const contact      = document.getElementById('vContact')?.value.trim();

            if (!itemName || !supplierName) {
                alert('품목명과 공급업체명은 필수 입력 항목입니다.');
                return;
            }

            if (vendorTbody) {
                const newRow = document.createElement('tr');
                newRow.innerHTML = `
                    <td><strong>${itemName}</strong></td>
                    <td>${supplierName}</td>
                    <td>${managerName || '-'}</td>
                    <td>${contact || '-'}</td>
                `;
                // Highlight newly added row briefly
                newRow.style.background = 'rgba(59,130,246,0.12)';
                vendorTbody.appendChild(newRow);
                setTimeout(() => newRow.style.background = '', 1500);
            }

            closeVendorModalFn();
        });
    }
});

// 7. Inventory Excel Upload
const itemExcelUpload = document.getElementById('itemExcelUpload');
const inventoryTableBody = document.getElementById('inventoryTableBody');
if (itemExcelUpload && inventoryTableBody) {
    itemExcelUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const data = new Uint8Array(evt.target.result);
                const workbook = window.XLSX.read(data, {type: 'array'});
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = window.XLSX.utils.sheet_to_json(firstSheet, {defval: ''});
                
                if (rows.length === 0) {
                    alert('데이터가 없습니다.');
                    return;
                }

                // Data normalization
                let items = rows.map(r => ({
                    name: r['품목명'] || r['Item'] || '',
                    category: r['카테고리'] || r['Category'] || '미분류',
                    zone: r['구역'] || r['Zone'] || '공통 창고',
                    current: parseInt(r['현재재고']) || parseInt(r['Current']) || 0,
                    safe: parseInt(r['안전재고기준']) || parseInt(r['Safe']) || 0,
                    unit: r['단위'] || r['Unit'] || '개'
                })).filter(i => i.name.trim() !== '');

                // Sorting: Category -> Zone -> Name
                items.sort((a, b) => {
                    if (a.category !== b.category) return a.category.localeCompare(b.category);
                    if (a.zone !== b.zone) return a.zone.localeCompare(b.zone);
                    return a.name.localeCompare(b.name);
                });

                // Render table
                inventoryTableBody.innerHTML = '';
                items.forEach(item => {
                    const isWarning = item.current <= item.safe;
                    const rowClass = isWarning ? 'class="stock-critical"' : '';
                    const qtyClass = isWarning ? 'class="text-right qty-critical"' : 'class="text-right"';
                    const badgeHtml = isWarning 
                        ? '<span class="badge-critical"><i class="fa-solid fa-circle-exclamation"></i> 즉시 발주 요망</span>'
                        : '<span class="badge-normal"><i class="fa-solid fa-check"></i> 정상</span>';

                    const tr = document.createElement('tr');
                    if (isWarning) tr.className = 'stock-critical';
                    tr.innerHTML = `
                        <td><strong>${item.name}</strong></td>
                        <td>${item.zone}</td>
                        <td>${item.category}</td>
                        <td class="${qtyClass}">${item.current} ${item.unit}</td>
                        <td class="text-right">${item.safe} ${item.unit}</td>
                        <td>${badgeHtml}</td>
                        <td>
                            <button class="btn-icon" title="입고(+)"><i class="fa-solid fa-plus"></i></button>
                            <button class="btn-icon" title="출고(-)"><i class="fa-solid fa-minus"></i></button>
                        </td>
                    `;
                    inventoryTableBody.appendChild(tr);
                });

                // Re-attach listeners to +/-
                const newBtnIcons = inventoryTableBody.querySelectorAll('.btn-icon');
                newBtnIcons.forEach(btn => {
                    btn.addEventListener('click', function() {
                        const row = this.closest('tr');
                        const qtyCell = row.querySelector('td:nth-child(4)'); 
                        if(!qtyCell) return;
                        
                        let currentText = qtyCell.innerText;
                        let currentNum = parseInt(currentText.replace(/[^0-9\.-]/g, ''), 10) || 0;
                        let unitMatch = currentText.match(/[^\d\s\.\-]+/);
                        let unit = unitMatch ? unitMatch[0] : '개';

                        if(this.title.includes('입고')) {
                            currentNum += 1;
                            qtyCell.innerHTML = `<strong>${currentNum}</strong> ${unit}`;
                            qtyCell.style.color = '#10B981';
                        } else if(this.title.includes('출고')) {
                            if(currentNum > 0) currentNum -= 1;
                            qtyCell.innerHTML = `<strong>${currentNum}</strong> ${unit}`;
                            qtyCell.style.color = '#EF4444';
                        }
                        
                        // Check if threshold crossed
                        const safeCell = row.querySelector('td:nth-child(5)');
                        const safeNum = parseInt(safeCell.innerText.replace(/[^0-9]/g, ''), 10) || 0;
                        const badgeCell = row.querySelector('td:nth-child(6)');
                        
                        if (currentNum <= safeNum) {
                            row.classList.add('stock-critical');
                            qtyCell.classList.add('qty-critical');
                            badgeCell.innerHTML = '<span class="badge-critical"><i class="fa-solid fa-circle-exclamation"></i> 즉시 발주 요망</span>';
                        } else {
                            row.classList.remove('stock-critical');
                            qtyCell.classList.remove('qty-critical');
                            badgeCell.innerHTML = '<span class="badge-normal"><i class="fa-solid fa-check"></i> 정상</span>';
                        }
                        
                        setTimeout(() => { qtyCell.style.color = ''; }, 500);
                    });
                });

                alert('총 ' + items.length + '개의 품목이 카테고리/구역 기준으로 정렬되어 일괄 등록되었습니다.');
                itemExcelUpload.value = '';

                // Switch back to inventory tab
                const tabInvBtn = document.querySelector('.tab-btn[data-target="tab-inventory"]');
                if (tabInvBtn) tabInvBtn.click();

            } catch (err) {
                console.error(err);
                alert('파일 파싱 중 오류가 발생했습니다.');
            }
        };
        reader.readAsArrayBuffer(file);
    });
}
