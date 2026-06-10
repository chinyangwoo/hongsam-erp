/**
 * erp_config.js - Central API endpoint configuration (Item 9: HTTPS-ready)
 * All modules read window.ERP_CONFIG instead of hardcoding the server address.
 * To switch to HTTPS after the reverse proxy is verified: set USE_HTTPS = true.
 */
(function () {
    var USE_HTTPS = false; // flip to true once https://43-203-237-63.sslip.io is live
    var HTTPS_ORIGIN = 'https://43-203-237-63.sslip.io';
    var HTTP_ORIGIN = 'http://43.203.237.63:3001';

    var origin;
    try {
        var h = window.location.hostname;
        if (h === 'localhost' || h === '127.0.0.1') {
            origin = 'http://localhost:3001';
        } else {
            origin = USE_HTTPS ? HTTPS_ORIGIN : HTTP_ORIGIN;
        }
    } catch (e) {
        origin = HTTP_ORIGIN;
    }

    window.ERP_CONFIG = {
        origin: origin,
        apiBase: origin + '/api',
        useHttps: USE_HTTPS
    };
})();
