// Phase 3: WebSocket 연결 엔진 (실시간 채팅 및 상태 연동)
(function() {
    // 백엔드 Socket.io 주소
    const SOCKET_URL = 'http://43.203.237.63:3000';
    let socket = null;

    // 만약 socket.io 라이브러리가 로드되지 않았다면 종료
    if (typeof io === 'undefined') {
        console.warn("[Phase 3] socket.io 라이브러리를 찾을 수 없어 실시간 연동을 시작할 수 없습니다.");
        return;
    }

    console.log("[Phase 3] Connecting to Real-Time Socket Server...");
    socket = io(SOCKET_URL);

    socket.on('connect', () => {
        console.log('[Phase 3] Socket Connected successfully: ' + socket.id);
        
        // 내 정보 꺼내서 로그인 사실 알림
        const curUser = localStorage.getItem('currentUser'); // 예: "105"
        const curUserName = localStorage.getItem('currentUserName');
        if (curUser) {
            socket.emit('user_login', { emp_id: curUser, name: curUserName });
        }
    });

    socket.on('disconnect', () => {
        console.log('[Phase 3] Socket Disconnected. You are offline.');
    });

    // 1. 온라인 접속자 명단 수신
    socket.on('online_users_update', (onlineEmpIds) => {
        console.log('[Phase 3] Online users updated: ', onlineEmpIds);
        
        // 전역 변수로 저장해두어 messenger.js 등 화면단에서 사용할 수 있도록 함
        window.activeOnlineUsers = onlineEmpIds;
        
        // 만약 화면에 메신저 함수가 있다면 (messenger.js가 로드된 상태) 재랜더링 지시
        if (typeof window.refreshMessengerOnlineStatus === 'function') {
            window.refreshMessengerOnlineStatus(onlineEmpIds);
        }
    });

    // 2. 실시간 로컬 메신저 메시지 수신
    socket.on('receive_message', (msgData) => {
        if (typeof window.handleIncomingSocketMessage === 'function') {
            window.handleIncomingSocketMessage(msgData);
        }
    });

    // 3. 브로드캐스트(전체공지) 수신
    socket.on('receive_broadcast', (msgData) => {
        if (typeof window.handleIncomingBroadcast === 'function') {
            window.handleIncomingBroadcast(msgData);
        } else {
            // 다른 탭에서 보고 있을 시 알림창 띄우기 처리 (옵션)
            if (typeof showSaveToast === 'function') {
                showSaveToast(`[전사공지] ${msgData.senderName}: ${msgData.text}`);
            }
        }
    });

    // 전역 소켓 객체 공유
    window.erpSocket = socket;

})();
