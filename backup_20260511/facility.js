// 홍삼한방타운 ERP — 시설현황 모듈 (facility.js v1)
document.addEventListener('DOMContentLoaded', () => {

    // ── Site Toggle (스파 / 호텔 / 전체) ──
    const siteBtns = document.querySelectorAll('.site-btn');
    const facilitySections = document.querySelectorAll('.facility-section');

    siteBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            siteBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const site = btn.dataset.site;

            facilitySections.forEach(sec => {
                if (site === 'all') {
                    sec.style.display = '';
                } else {
                    sec.style.display = sec.dataset.site === site ? '' : 'none';
                }
            });
        });
    });

    // ── Sensor Simulator (3~5초 간격 랜덤 변동) ──
    function randomFluctuation(base, range, decimals = 1) {
        return (base + (Math.random() - 0.5) * range).toFixed(decimals);
    }

    function updateSensors() {
        const $ = id => document.getElementById(id);
        if ($('snsBoilerTemp')) $('snsBoilerTemp').innerHTML = `${randomFluctuation(85, 4)} <small>℃</small>`;
        if ($('snsBoilerLpg')) $('snsBoilerLpg').innerHTML = `${randomFluctuation(12.5, 3)} <small>kg</small>`;
        if ($('snsElec1F')) $('snsElec1F').innerHTML = `${randomFluctuation(42, 8)} <small>kW</small>`;
        if ($('snsElec2F')) $('snsElec2F').innerHTML = `${randomFluctuation(88, 15)} <small>kW</small>`;
        if ($('snsElecRF')) $('snsElecRF').innerHTML = `${randomFluctuation(57, 10)} <small>kW</small>`;
        if ($('snsTotalKwh')) $('snsTotalKwh').textContent = Math.floor(1200 + Math.random() * 100).toLocaleString();
        if ($('snsSpa1')) $('snsSpa1').innerHTML = `${randomFluctuation(40.5, 2)} <small>℃</small>`;
        if ($('snsSpa2')) $('snsSpa2').innerHTML = `${randomFluctuation(38.2, 2)} <small>℃</small>`;
        if ($('snsPool')) $('snsPool').innerHTML = `${randomFluctuation(32.8, 3)} <small>℃</small>`;
        if ($('snsSauna')) $('snsSauna').innerHTML = `${randomFluctuation(82, 5)} <small>℃</small>`;
    }

    // 첫 실행 후 4초 간격
    updateSensors();
    setInterval(updateSensors, 4000);

    // ── Ledger Modal (신규 등록) ──
    const btnNewLedger = document.getElementById('btnNewLedger');
    if (btnNewLedger) {
        btnNewLedger.addEventListener('click', () => {
            alert('고장/유지보수 신규 등록 모달 (향후 구현 예정)');
        });
    }
});
