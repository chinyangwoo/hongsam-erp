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
        
        // Time Formatting
        const now = new Date();
        let hours = now.getHours();
        let minutes = now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes();
        const ampm = hours >= 12 ? '오후' : '오전';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        const timeStr = `${ampm} ${hours}:${minutes}`;

        // Create Message DOM
        const msgWrapper = document.createElement('div');
        msgWrapper.className = 'msg-wrapper self';

        let innerHTML = `
            <div class="msg-content-block">
                <div class="msg-meta">
                    <span class="m-time">${timeStr}</span>
                </div>
        `;

        if(isBroadcast) {
            innerHTML += `
                <div class="msg-bubble broadcast">
                    <strong class="b-title"><i class="fa-solid fa-bullhorn"></i> 긴급 공지 (Broadcast)</strong>
                    <p>${text.replace(/\n/g, '<br>')}</p>
                </div>
            `;
        } else {
            innerHTML += `
                <div class="msg-bubble">${text.replace(/\n/g, '<br>')}</div>
            `;
        }

        innerHTML += `</div>`;
        
        msgWrapper.innerHTML = innerHTML;
        
        // Append to chat area
        chatMessagesArea.appendChild(msgWrapper);

        // Scroll to bottom
        chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;

        // Reset Input
        chatInput.value = '';
        chatInput.style.height = 'auto';
        checkBroadcast.checked = false; // Reset Broadcast toggle after send
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

    // ── Load Employees into DM List from Local Storage (Synced) ──
    function loadMessengerEmployees() {
        const dmList = document.getElementById('messengerDmList');
        if (!dmList) return;

        let employees = [];
        try {
            employees = JSON.parse(localStorage.getItem('hongsam_employees') || '[]');
        } catch(e) {}

        if (employees.length === 0) {
            dmList.innerHTML = `<li style="padding: 15px; color: var(--text-secondary); text-align: center; font-size: 0.85rem;">인사기록카드에 등록된 직원이 없습니다.</li>`;
            return;
        }

        dmList.innerHTML = '';
        employees.forEach(emp => {
            const li = document.createElement('li');
            li.className = 'dm-item';
            
            const dept = emp.department || '부서미정';
            const statusClass = emp.status === '재직' ? 'online' : 'offline';
            const statusText = emp.status === '재직' ? '온라인' : '오프라인';
            
            li.innerHTML = `
                <div class="dm-avatar"><img src="https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random" alt="user"></div>
                <div class="dm-info">
                    <span class="dm-name">${emp.name} (${dept})</span>
                    <span class="dm-status ${statusClass}">${statusText}</span>
                </div>
            `;
            
            // Add click interaction for dynamic items
            li.addEventListener('click', function() {
                document.querySelectorAll('.channel-item').forEach(i => i.classList.remove('active'));
                document.querySelectorAll('.dm-item').forEach(i => i.style.background = 'transparent');
                this.style.background = 'rgba(255, 255, 255, 0.05)';
                
                // Change Chat Header
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
    }

    // Delay loading slightly to allow cloud_sync to populate localStorage
    setTimeout(loadMessengerEmployees, 500);

});
