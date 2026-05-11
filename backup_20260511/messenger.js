document.addEventListener('DOMContentLoaded', () => {

    const chatInput = document.getElementById('chatInput');
    const btnSendMsg = document.getElementById('btnSendMsg');
    const chatMessagesArea = document.getElementById('chatMessagesArea');
    const checkBroadcast = document.getElementById('checkBroadcast');

    // Auto-resize textarea logic
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value === '') {
            this.style.height = 'auto'; // Reset if empty
        }
    });

    // Send Message on Enter (but allow Shift+Enter for new line)
    chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    btnSendMsg.addEventListener('click', sendMessage);

    function sendMessage() {
        const text = chatInput.value.trim();
        if(!text) return;

        const isBroadcast = checkBroadcast.checked;
        const myName = localStorage.getItem('currentUserName') || 'User';
        const myEmpId = localStorage.getItem('currentUser') || '000';
        
        // Time Formatting
        const now = new Date();
        let hours = now.getHours();
        let minutes = now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes();
        const ampm = hours >= 12 ? '오후' : '오전';
        hours = hours % 12;
        hours = hours ? hours : 12; 
        const timeStr = `${ampm} ${hours}:${minutes}`;

        // Create Payload
        const payload = {
            senderId: myEmpId,
            senderName: myName,
            text: text,
            timeStr: timeStr
        };

        // Emit via WebSocket
        if (window.erpSocket && window.erpSocket.connected) {
            if (isBroadcast) {
                window.erpSocket.emit('send_broadcast', payload);
            } else {
                window.erpSocket.emit('send_message', payload);
            }
        } else {
            alert("서버와 연결이 끊어졌습니다. 실시간 전송이 불가합니다.");
            return;
        }

        // Reset Input
        chatInput.value = '';
        chatInput.style.height = 'auto';
        checkBroadcast.checked = false;
    }

    // --- Phase 3: WebSocket Receiver Rendering ---
    window.handleIncomingSocketMessage = function(msgData) {
        renderMessageToUI(msgData, false);
    };

    window.handleIncomingBroadcast = function(msgData) {
        renderMessageToUI(msgData, true);
    };

    function renderMessageToUI(msgData, isBroadcast) {
        const myEmpId = localStorage.getItem('currentUser');
        const isSelf = (msgData.senderId === myEmpId);
        
        const msgWrapper = document.createElement('div');
        msgWrapper.className = 'msg-wrapper ' + (isSelf ? 'self' : 'peer');

        let innerHTML = ``;
        
        // 프로필 렌더링 (내가 아닐 경우만 표시 - 카톡 스타일)
        if (!isSelf) {
            let employees = [];
            try { employees = JSON.parse(localStorage.getItem('hongsam_employees') || '[]'); } catch(e){}
            const senderEmp = employees.find(e => e.emp_id === String(msgData.senderId)) || {};
            const photoSrc = senderEmp.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(msgData.senderName)}&background=random`;
            
            innerHTML += `<img src="${photoSrc}" alt="user" class="msg-avatar">`;
        }

        innerHTML += `
            <div class="msg-content-block">
                <div class="msg-meta">
                    ${!isSelf ? `<span class="m-name">${msgData.senderName}</span>` : ''}
                    <span class="m-time">${msgData.timeStr}</span>
                </div>
        `;

        if(isBroadcast) {
            innerHTML += `
                <div class="msg-bubble broadcast">
                    <strong class="b-title"><i class="fa-solid fa-bullhorn"></i> 긴급 공지 (Broadcast)</strong>
                    <p>${msgData.text.replace(/\n/g, '<br>')}</p>
                </div>
            `;
        } else {
            innerHTML += `
                <div class="msg-bubble">${msgData.text.replace(/\n/g, '<br>')}</div>
            `;
        }

        innerHTML += `</div>`;
        
        msgWrapper.innerHTML = innerHTML;
        chatMessagesArea.appendChild(msgWrapper);
        chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
    }

    // Scroll to bottom on load
    chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;

    // Toggle active classes on Channels / DMs (Visual Simulation)
    const listsItems = document.querySelectorAll('.channel-item, .dm-item');
    listsItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove from all
            document.querySelectorAll('.channel-item').forEach(i => i.classList.remove('active'));
            document.querySelectorAll('.dm-item').forEach(i => i.style.background = 'transparent'); // Reset DMs

            if (this.classList.contains('channel-item')) {
                this.classList.add('active');
            } else {
                this.style.background = 'rgba(255, 255, 255, 0.05)';
            }

            // Remove unread badge if present
            this.classList.remove('has-unread');
            const badge = this.querySelector('.ch-badge');
            if(badge) badge.style.display = 'none';
        });
    });

    // ── Phase 3: Real-Time Live Status via WebSocket ──
    window.refreshMessengerOnlineStatus = function(onlineEmpIds) {
        const dmList = document.getElementById('messengerDmList');
        if (!dmList) return;

        let employees = [];
        try { employees = JSON.parse(localStorage.getItem('hongsam_employees') || '[]'); } catch(e) {}

        dmList.innerHTML = '';
        employees.forEach(emp => {
            const li = document.createElement('li');
            li.className = 'dm-item';
            
            const dept = emp.department || '부서미정';
            
            // 실시간 소켓 접속자 명단에 있는지 확인 (온라인/오프라인)
            let isOnline = onlineEmpIds.includes(String(emp.emp_id));
            let statusClass = isOnline ? 'online' : 'offline';
            let statusText = isOnline ? '온라인' : '오프라인';
            
            const photoSrc = emp.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random`;
            
            li.innerHTML = `
                <div class="dm-avatar"><img src="${photoSrc}" alt="user"></div>
                <div class="dm-info">
                    <span class="dm-name">${emp.name} (${dept})</span>
                    <span class="dm-status ${statusClass}">${statusText}</span>
                </div>
            `;
            
            li.addEventListener('click', function() {
                document.querySelectorAll('.channel-item').forEach(i => i.classList.remove('active'));
                document.querySelectorAll('.dm-item').forEach(i => i.style.background = 'transparent');
                this.style.background = 'rgba(255, 255, 255, 0.05)';
                
                const chatHeader = document.querySelector('.ch-header-info');
                if (chatHeader) {
                    chatHeader.innerHTML = `
                        <h2>${emp.name} <span>(${dept})</span></h2>
                        <span class="ch-member-count"><span class="status-dot ${statusClass}" style="display:inline-block; margin-right:4px;"></span> ${statusText}</span>
                    `;
                }
            });
            
            dmList.appendChild(li);
        });
    };

    // 초기 로딩 (현재 전역 변수화된 접속자 명단으로 그리기)
    setTimeout(() => {
        if(window.activeOnlineUsers) {
            window.refreshMessengerOnlineStatus(window.activeOnlineUsers);
        } else {
            // 소켓 대기
            window.refreshMessengerOnlineStatus([]);
        }
    }, 500);

});
