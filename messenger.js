// ═══════════════════════════════════════════════════════════════
// 홍삼한방타운 ERP — 사내 메신저 v2 (messenger.js)
// 1:1 DM · 그룹채널 · 채팅 히스토리 · 브로드캐스트
// ═══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

    // ── XSS 방지 ──
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ── 현재 사용자 정보 ──
    const myEmpId = localStorage.getItem('currentUser') || '000';
    const myName = localStorage.getItem('currentUserName') || '사용자';
    const isAdmin = myEmpId === '001';

    // ── DOM ──
    const chatInput = document.getElementById('chatInput');
    const btnSendMsg = document.getElementById('btnSendMsg');
    const chatMessagesArea = document.getElementById('chatMessagesArea');
    const checkBroadcast = document.getElementById('checkBroadcast');
    const channelList = document.getElementById('channelListEl');
    const dmListEl = document.getElementById('messengerDmList');
    const chatHeaderInfo = document.querySelector('.ch-header-info');
    const searchInput = document.getElementById('msgSearchInput');
    const btnCreateGroup = document.getElementById('btnCreateGroup');

    // ── Storage ──
    const DB_KEY = 'erp_messenger_db';
    const ROOMS_KEY = 'erp_messenger_rooms';
    const API_BASE = 'http://43.203.237.63:3001/api';

    function loadMessages() {
        try { return JSON.parse(localStorage.getItem(DB_KEY) || '{}'); } catch(e) { return {}; }
    }
    function saveMessages(data) {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
        fetch(`${API_BASE}/db/erp_messenger_db`, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify(data)
        }).catch(() => {});
    }
    function loadRooms() {
        try {
            const r = JSON.parse(localStorage.getItem(ROOMS_KEY) || 'null');
            return r || getDefaultRooms();
        } catch(e) { return getDefaultRooms(); }
    }
    function saveRooms(rooms) {
        localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
        fetch(`${API_BASE}/db/erp_messenger_rooms`, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify(rooms)
        }).catch(() => {});
    }

    function getDefaultRooms() {
        return [
            { id: 'ch_all', name: '전체공지방', type: 'channel', icon: 'fa-bullhorn', members: 'all' },
            { id: 'ch_support', name: '지원팀방', type: 'channel', icon: 'fa-headset', members: 'all' },
            { id: 'ch_spa', name: '스파운영팀방', type: 'channel', icon: 'fa-spa', members: 'all' },
            { id: 'ch_maintenance', name: '공무팀방', type: 'channel', icon: 'fa-wrench', members: 'all' },
            { id: 'ch_hotel_maid', name: '호텔 메이드팀방', type: 'channel', icon: 'fa-broom', members: 'all' },
            { id: 'ch_hotel_kitchen', name: '호텔 주방팀방', type: 'channel', icon: 'fa-utensils', members: 'all' }
        ];
    }

    // ── 현재 활성 대화방 ──
    let activeRoomId = 'ch_support';
    let activeRoomType = 'channel'; // 'channel' or 'dm'
    let activeRoomName = '지원팀방';

    // ══════════════════════════════════════════════════════════
    // 채널 목록 렌더링
    // ══════════════════════════════════════════════════════════
    function renderChannelList() {
        if (!channelList) return;
        const rooms = loadRooms();
        const messages = loadMessages();

        channelList.innerHTML = rooms.map(room => {
            const isActive = room.id === activeRoomId;
            const roomMsgs = messages[room.id] || [];
            const unread = roomMsgs.filter(m => m.unread && m.senderId !== myEmpId).length;
            const iconCls = room.icon || 'fa-hashtag';

            return `
                <li class="channel-item ${isActive ? 'active' : ''} ${unread > 0 ? 'has-unread' : ''}" data-room="${room.id}" data-type="channel">
                    <span class="ch-hash"><i class="fa-solid ${iconCls}"></i></span> ${escapeHtml(room.name)}
                    ${unread > 0 ? `<span class="ch-badge">${unread}</span>` : ''}
                </li>
            `;
        }).join('');

        // 이벤트 바인딩
        channelList.querySelectorAll('.channel-item').forEach(li => {
            li.addEventListener('click', () => {
                activeRoomId = li.dataset.room;
                activeRoomType = 'channel';
                const room = rooms.find(r => r.id === activeRoomId);
                activeRoomName = room ? room.name : activeRoomId;
                renderChannelList();
                renderDmList();
                renderChatRoom();
            });
        });
    }

    // ══════════════════════════════════════════════════════════
    // DM 사용자 목록 렌더링
    // ══════════════════════════════════════════════════════════
    function renderDmList(onlineEmpIds) {
        if (!dmListEl) return;
        const online = onlineEmpIds || window.activeOnlineUsers || [];
        let employees = [];
        try { employees = JSON.parse(localStorage.getItem('hongsam_employees') || '[]'); } catch(e){}

        // 검색 필터
        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        let filtered = employees.filter(e => String(e.emp_id) !== myEmpId);
        if (query) {
            filtered = filtered.filter(e =>
                (e.name || '').toLowerCase().includes(query) ||
                (e.department || '').toLowerCase().includes(query)
            );
        }

        const messages = loadMessages();

        dmListEl.innerHTML = filtered.map(emp => {
            const dmId = getDmRoomId(myEmpId, emp.emp_id);
            const isActive = dmId === activeRoomId;
            const isOnline = online.includes(String(emp.emp_id));
            const statusClass = isOnline ? 'online' : 'offline';
            const statusText = isOnline ? '온라인' : '오프라인';
            const photoSrc = emp.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random`;
            const dept = emp.department || '부서미정';

            // 마지막 메시지 미리보기
            const dmMsgs = messages[dmId] || [];
            const lastMsg = dmMsgs.length > 0 ? dmMsgs[dmMsgs.length - 1] : null;
            const lastMsgText = lastMsg ? lastMsg.text : '';
            const unread = dmMsgs.filter(m => m.unread && m.senderId !== myEmpId).length;

            return `
                <li class="dm-item ${isActive ? 'dm-active' : ''} ${unread > 0 ? 'has-unread' : ''}" data-emp="${emp.emp_id}" data-room="${dmId}">
                    <div class="dm-avatar">
                        <img src="${photoSrc}" alt="user">
                        <span class="status-dot ${statusClass}"></span>
                    </div>
                    <div class="dm-info">
                        <span class="dm-name">${escapeHtml(emp.name)} <small style="color:var(--text-secondary); font-weight:400;">(${escapeHtml(dept)})</small></span>
                        <span class="dm-msg">${escapeHtml(lastMsgText).substring(0, 30)}${lastMsgText.length > 30 ? '...' : ''}</span>
                    </div>
                    ${unread > 0 ? `<span class="dm-badge">${unread}</span>` : ''}
                </li>
            `;
        }).join('');

        // 이벤트 바인딩
        dmListEl.querySelectorAll('.dm-item').forEach(li => {
            li.addEventListener('click', () => {
                const empId = li.dataset.emp;
                activeRoomId = li.dataset.room;
                activeRoomType = 'dm';
                const emp = employees.find(e => String(e.emp_id) === empId);
                activeRoomName = emp ? emp.name : empId;
                renderChannelList();
                renderDmList(online);
                renderChatRoom();
            });
        });
    }

    function getDmRoomId(id1, id2) {
        const sorted = [String(id1), String(id2)].sort();
        return `dm_${sorted[0]}_${sorted[1]}`;
    }

    // ══════════════════════════════════════════════════════════
    // 채팅방 렌더링
    // ══════════════════════════════════════════════════════════
    function renderChatRoom() {
        if (!chatMessagesArea || !chatHeaderInfo) return;

        // 헤더 업데이트
        if (activeRoomType === 'channel') {
            const rooms = loadRooms();
            const room = rooms.find(r => r.id === activeRoomId);
            const icon = room ? room.icon || 'fa-hashtag' : 'fa-hashtag';
            chatHeaderInfo.innerHTML = `
                <h2><i class="fa-solid ${icon}" style="margin-right:8px; color:var(--accent-blue);"></i>${escapeHtml(activeRoomName)}</h2>
                <span class="ch-member-count"><i class="fa-solid fa-users"></i> 그룹 채널</span>
            `;
        } else {
            let employees = [];
            try { employees = JSON.parse(localStorage.getItem('hongsam_employees') || '[]'); } catch(e){}
            const online = window.activeOnlineUsers || [];
            // DM 상대방 emp_id 추출
            const parts = activeRoomId.replace('dm_', '').split('_');
            const otherEmpId = parts[0] === myEmpId ? parts[1] : parts[0];
            const emp = employees.find(e => String(e.emp_id) === otherEmpId) || {};
            const isOnline = online.includes(otherEmpId);
            chatHeaderInfo.innerHTML = `
                <h2>${escapeHtml(activeRoomName)} <span style="font-weight:400; color:var(--text-secondary); font-size:.85rem;">(${escapeHtml(emp.department || '')})</span></h2>
                <span class="ch-member-count"><span class="status-dot ${isOnline?'online':'offline'}" style="display:inline-block; margin-right:4px;"></span> ${isOnline?'온라인':'오프라인'}</span>
            `;
        }

        // 메시지 렌더링
        const messages = loadMessages();
        const roomMsgs = messages[activeRoomId] || [];

        // 읽음 처리
        roomMsgs.forEach(m => { if (m.senderId !== myEmpId) m.unread = false; });
        messages[activeRoomId] = roomMsgs;
        saveMessages(messages);

        if (roomMsgs.length === 0) {
            chatMessagesArea.innerHTML = `
                <div class="chat-empty-state">
                    <i class="fa-regular fa-comment-dots"></i>
                    <p>아직 대화 내용이 없습니다.</p>
                    <span>첫 메시지를 보내보세요!</span>
                </div>
            `;
            return;
        }

        // 날짜별 그룹핑
        let html = '';
        let lastDate = '';
        roomMsgs.forEach(msg => {
            const msgDate = msg.date || '';
            if (msgDate !== lastDate) {
                html += `<div class="chat-date-divider"><span>${escapeHtml(msgDate)}</span></div>`;
                lastDate = msgDate;
            }
            html += renderSingleMessage(msg);
        });

        chatMessagesArea.innerHTML = html;
        chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;

        // 채널 뱃지 갱신
        renderChannelList();
    }

    function renderSingleMessage(msg) {
        const isSelf = (msg.senderId === myEmpId);
        let employees = [];
        try { employees = JSON.parse(localStorage.getItem('hongsam_employees') || '[]'); } catch(e){}

        let avatarHtml = '';
        if (!isSelf) {
            const emp = employees.find(e => String(e.emp_id) === String(msg.senderId)) || {};
            const photoSrc = emp.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.senderName)}&background=random`;
            avatarHtml = `<img src="${photoSrc}" alt="user" class="msg-avatar">`;
        }

        const nameHtml = !isSelf ? `<span class="m-name">${escapeHtml(msg.senderName)}</span>` : '';
        const textHtml = escapeHtml(msg.text).replace(/\n/g, '<br>');

        if (msg.isBroadcast) {
            return `
                <div class="msg-wrapper ${isSelf ? 'self' : 'peer'}">
                    ${avatarHtml}
                    <div class="msg-content-block">
                        <div class="msg-meta">${nameHtml}<span class="m-time">${escapeHtml(msg.timeStr)}</span></div>
                        <div class="msg-bubble broadcast">
                            <strong class="b-title"><i class="fa-solid fa-bullhorn"></i> 긴급 공지 (Broadcast)</strong>
                            <p>${textHtml}</p>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="msg-wrapper ${isSelf ? 'self' : 'peer'}">
                ${avatarHtml}
                <div class="msg-content-block">
                    <div class="msg-meta">${nameHtml}<span class="m-time">${escapeHtml(msg.timeStr)}</span></div>
                    <div class="msg-bubble">${textHtml}</div>
                </div>
            </div>
        `;
    }

    // ══════════════════════════════════════════════════════════
    // 메시지 전송
    // ══════════════════════════════════════════════════════════
    function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        const isBroadcast = checkBroadcast.checked;
        const now = new Date();
        let hours = now.getHours();
        let minutes = now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes();
        const ampm = hours >= 12 ? '오후' : '오전';
        hours = hours % 12 || 12;
        const timeStr = `${ampm} ${hours}:${minutes}`;
        const dateStr = `${now.getFullYear()}. ${String(now.getMonth()+1).padStart(2,'0')}. ${String(now.getDate()).padStart(2,'0')}`;

        const msgObj = {
            id: 'msg_' + Date.now(),
            senderId: myEmpId,
            senderName: myName,
            text: text,
            timeStr: timeStr,
            date: dateStr,
            isBroadcast: isBroadcast,
            unread: true,
            timestamp: now.toISOString()
        };

        // 로컬 저장
        const messages = loadMessages();
        const targetRoom = isBroadcast ? 'ch_all' : activeRoomId;
        if (!messages[targetRoom]) messages[targetRoom] = [];
        messages[targetRoom].push(msgObj);
        saveMessages(messages);

        // WebSocket 전송
        const payload = {
            ...msgObj,
            roomId: targetRoom,
            roomType: activeRoomType
        };

        if (window.erpSocket && window.erpSocket.connected) {
            if (isBroadcast) {
                window.erpSocket.emit('send_broadcast', payload);
            } else {
                window.erpSocket.emit('send_message', payload);
            }
        }

        // UI 리셋
        chatInput.value = '';
        chatInput.style.height = 'auto';
        checkBroadcast.checked = false;

        // 브로드캐스트면 전체공지방으로 전환
        if (isBroadcast && activeRoomId !== 'ch_all') {
            activeRoomId = 'ch_all';
            activeRoomType = 'channel';
            activeRoomName = '전체공지방';
        }

        renderChatRoom();
        renderDmList();
    }

    // ── 입력 이벤트 ──
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
        if (!this.value) this.style.height = 'auto';
    });
    chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    btnSendMsg.addEventListener('click', sendMessage);

    // ══════════════════════════════════════════════════════════
    // WebSocket 수신 핸들러
    // ══════════════════════════════════════════════════════════
    window.handleIncomingSocketMessage = function(msgData) {
        const messages = loadMessages();
        const targetRoom = msgData.roomId || activeRoomId;
        if (!messages[targetRoom]) messages[targetRoom] = [];

        // 중복 체크
        if (messages[targetRoom].find(m => m.id === msgData.id)) return;

        msgData.unread = (targetRoom !== activeRoomId);
        messages[targetRoom].push(msgData);
        saveMessages(messages);

        if (targetRoom === activeRoomId) {
            renderChatRoom();
        } else {
            renderChannelList();
            renderDmList();
        }
    };

    window.handleIncomingBroadcast = function(msgData) {
        const messages = loadMessages();
        if (!messages['ch_all']) messages['ch_all'] = [];
        if (messages['ch_all'].find(m => m.id === msgData.id)) return;

        msgData.unread = (activeRoomId !== 'ch_all');
        msgData.isBroadcast = true;
        messages['ch_all'].push(msgData);
        saveMessages(messages);

        if (activeRoomId === 'ch_all') {
            renderChatRoom();
        } else {
            renderChannelList();
            // 브로드캐스트 알림 토스트
            showToast(`📢 ${escapeHtml(msgData.senderName)}: ${escapeHtml(msgData.text).substring(0,40)}`);
        }
    };

    // ── 온라인 상태 업데이트 ──
    window.refreshMessengerOnlineStatus = function(onlineEmpIds) {
        renderDmList(onlineEmpIds);
    };

    // ══════════════════════════════════════════════════════════
    // 그룹 채널 생성 모달
    // ══════════════════════════════════════════════════════════
    if (btnCreateGroup) {
        btnCreateGroup.addEventListener('click', () => {
            showModal('createGroupModal');
        });
    }

    const btnSaveGroup = document.getElementById('btnSaveGroup');
    if (btnSaveGroup) {
        btnSaveGroup.addEventListener('click', () => {
            const nameInput = document.getElementById('fGroupName');
            const name = nameInput ? nameInput.value.trim() : '';
            if (!name) { alert('채널 이름을 입력하세요.'); return; }

            const rooms = loadRooms();
            const newRoom = {
                id: 'ch_' + Date.now().toString(36),
                name: name,
                type: 'channel',
                icon: 'fa-users-line',
                members: 'all',
                creator: myEmpId,
                created: new Date().toISOString()
            };
            rooms.push(newRoom);
            saveRooms(rooms);
            closeModal('createGroupModal');

            activeRoomId = newRoom.id;
            activeRoomType = 'channel';
            activeRoomName = newRoom.name;
            renderChannelList();
            renderChatRoom();
            showToast(`'${escapeHtml(name)}' 채널이 생성되었습니다.`);
            if (nameInput) nameInput.value = '';
        });
    }

    // ── 검색 ──
    if (searchInput) {
        searchInput.addEventListener('input', () => renderDmList());
    }

    // ── 모달 ──
    function showModal(id) { document.getElementById(id)?.classList.add('show'); }
    function closeModal(id) { document.getElementById(id)?.classList.remove('show'); }
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
    });
    document.querySelectorAll('.msg-modal-overlay').forEach(ov => {
        ov.addEventListener('click', e => { if (e.target === ov) closeModal(ov.id); });
    });

    // ── 토스트 ──
    function showToast(msg) {
        const t = document.getElementById('msgToast');
        if (!t) return;
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3000);
    }

    // ── 브로드캐스트 권한 (Admin만) ──
    const bcToggle = document.querySelector('.broadcast-toggle');
    if (bcToggle && !isAdmin) {
        bcToggle.style.display = 'none';
    }

    // ══════════════════════════════════════════════════════════
    // 초기 로드
    // ══════════════════════════════════════════════════════════
    // 서버에서 데이터 복원
    Promise.all([
        fetch(`${API_BASE}/db/erp_messenger_db`).then(r=>r.json()).catch(()=>null),
        fetch(`${API_BASE}/db/erp_messenger_rooms`).then(r=>r.json()).catch(()=>null)
    ]).then(([msgs, rooms]) => {
        if (msgs && typeof msgs === 'object' && Object.keys(msgs).length > 0) {
            localStorage.setItem(DB_KEY, JSON.stringify(msgs));
        }
        if (rooms && Array.isArray(rooms) && rooms.length > 0) {
            localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
        }
    }).catch(()=>{}).finally(() => {
        renderChannelList();
        renderChatRoom();
        setTimeout(() => {
            renderDmList(window.activeOnlineUsers || []);
        }, 500);
    });

});
