/**
 * perf_utils.js - shared pagination helper (Item 5)
 * Usage inside a module's render function:
 *   data = (window.ERPPaginate && ERPPaginate.attach('crm', tbody, data, 50, renderTable)) || data;
 * attach() keeps page state per key, draws a pager right after the table,
 * and returns only the current page slice (or the full list if small).
 */
(function () {
    var states = {}; // key -> { page, full, rerender }

    function buildPager(state, key, host) {
        var total = state.full.length;
        var pages = Math.ceil(total / state.size);
        var el = document.getElementById('erp-pager-' + key);
        if (pages <= 1) { if (el) el.remove(); return; }
        if (!el) {
            el = document.createElement('div');
            el.id = 'erp-pager-' + key;
            el.style.cssText = 'display:flex;gap:6px;justify-content:center;align-items:center;padding:14px 0;flex-wrap:wrap;';
            host.parentNode.insertBefore(el, host.nextSibling);
        }
        var p = state.page;
        var html = '';
        var btn = function (label, target, disabled, active) {
            return '<button data-pg="' + target + '" ' + (disabled ? 'disabled' : '') +
                ' style="min-width:34px;padding:6px 10px;border-radius:6px;border:1px solid rgba(148,163,184,.35);cursor:pointer;font-size:.8rem;' +
                (active ? 'background:#3B82F6;color:#fff;border-color:#3B82F6;' : 'background:transparent;color:#CBD5E1;') +
                (disabled ? 'opacity:.35;cursor:default;' : '') + '">' + label + '</button>';
        };
        html += btn('&laquo;', p - 1, p <= 1, false);
        var start = Math.max(1, p - 2), end = Math.min(pages, start + 4);
        if (end - start < 4) start = Math.max(1, end - 4);
        for (var i = start; i <= end; i++) html += btn(String(i), i, false, i === p);
        html += btn('&raquo;', p + 1, p >= pages, false);
        html += '<span style="color:#64748B;font-size:.75rem;margin-left:8px;">총 ' + total.toLocaleString() + '건</span>';
        el.innerHTML = html;
        el.querySelectorAll('button[data-pg]').forEach(function (b) {
            b.addEventListener('click', function () {
                var t = parseInt(this.dataset.pg, 10);
                if (isNaN(t) || t < 1 || t > pages) return;
                state.page = t;
                state.rerender(state.full);
            });
        });
    }

    window.ERPPaginate = {
        attach: function (key, hostEl, items, pageSize, rerenderFn) {
            if (!hostEl || !Array.isArray(items)) return null;
            var host = hostEl.closest ? (hostEl.closest('table') || hostEl) : hostEl;
            var st = states[key] || (states[key] = { page: 1 });
            st.full = items;
            st.size = pageSize || 50;
            st.rerender = rerenderFn;
            var pages = Math.max(1, Math.ceil(items.length / st.size));
            if (st.page > pages) st.page = pages;
            buildPager(st, key, host);
            if (items.length <= st.size) return items;
            var s = (st.page - 1) * st.size;
            return items.slice(s, s + st.size);
        },
        reset: function (key) { if (states[key]) states[key].page = 1; }
    };
})();
