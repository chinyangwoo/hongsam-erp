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
    const API_BASE = ((window.ERP_CONFIG && window.ERP_CONFIG.apiBase) || 'http://43.203.237.63:3001/api');

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
    // v5: 이모티콘 선택기
    // ══════════════════════════════════════════════════════════
    const EMOJI_DATA = {
        frequent: ['👍','👏','🙏','😊','😂','❤️','🔥','✅','💯','🎉','👋','💪','😍','🤔','👌','😁'],
        smile: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','😐','😑','😶','😏','😒','🙄','😬','😮‍💨','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐'],
        hand: ['👍','👎','👊','✊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👋','🤚','🖐️','✋','🖖','💪','🦾','🙏'],
        heart: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','🫶'],
        object: ['🎉','🎊','🎈','🎁','🏆','🥇','🥈','🥉','⚽','🎯','🔔','📌','📎','✏️','📝','📊','📈','📉','💰','💸','🏠','🚗','⏰','📱','💻','🔑','🔒','💡','⚡','🌟','⭐','☀️','🌈','☁️','❄️','🌊']
    };

    const btnEmoji = document.getElementById('btnEmoji');
    const emojiPicker = document.getElementById('emojiPicker');
    const emojiGrid = document.getElementById('emojiGrid');

    function renderEmojiGrid(group) {
        if (!emojiGrid) return;
        const emojis = EMOJI_DATA[group] || EMOJI_DATA.frequent;
        emojiGrid.innerHTML = emojis.map(e => `<span>${e}</span>`).join('');
        emojiGrid.querySelectorAll('span').forEach(sp => {
            sp.addEventListener('click', () => {
                chatInput.value += sp.textContent;
                chatInput.focus();
                emojiPicker.style.display = 'none';
            });
        });
    }

    if (btnEmoji && emojiPicker) {
        btnEmoji.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = emojiPicker.style.display !== 'none';
            emojiPicker.style.display = isOpen ? 'none' : 'block';
            if (!isOpen) renderEmojiGrid('frequent');
        });
        document.querySelectorAll('.emoji-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.emoji-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderEmojiGrid(tab.dataset.group);
            });
        });
        document.addEventListener('click', (e) => {
            if (!emojiPicker.contains(e.target) && e.target !== btnEmoji) {
                emojiPicker.style.display = 'none';
            }
        });
    }

    // ══════════════════════════════════════════════════════════
    // v5: 대화 내용 검색
    // ══════════════════════════════════════════════════════════
    const btnSearchChat = document.getElementById('btnSearchChat');
    const chatSearchBar = document.getElementById('chatSearchBar');
    const chatSearchQuery = document.getElementById('chatSearchQuery');
    const chatSearchCount = document.getElementById('chatSearchCount');
    const chatSearchPrev = document.getElementById('chatSearchPrev');
    const chatSearchNext = document.getElementById('chatSearchNext');
    const chatSearchClose = document.getElementById('chatSearchClose');
    let searchResults = [];
    let searchIdx = -1;

    if (btnSearchChat && chatSearchBar) {
        btnSearchChat.addEventListener('click', () => {
            const isOpen = chatSearchBar.style.display !== 'none';
            chatSearchBar.style.display = isOpen ? 'none' : 'flex';
            if (!isOpen) { chatSearchQuery.value = ''; chatSearchQuery.focus(); clearSearchHighlights(); }
        });
        chatSearchClose.addEventListener('click', () => {
            chatSearchBar.style.display = 'none';
            clearSearchHighlights();
        });
        chatSearchQuery.addEventListener('input', performChatSearch);
        chatSearchPrev.addEventListener('click', () => navigateSearch(-1));
        chatSearchNext.addEventListener('click', () => navigateSearch(1));
    }

    function performChatSearch() {
        const query = chatSearchQuery.value.trim().toLowerCase();
        searchResults = [];
        searchIdx = -1;
        if (!query) { clearSearchHighlights(); chatSearchCount.textContent = ''; return; }
        const bubbles = chatMessagesArea.querySelectorAll('.msg-bubble');
        bubbles.forEach((b, i) => {
            const orig = b.dataset.originalText || b.textContent;
            b.dataset.originalText = orig;
            if (orig.toLowerCase().includes(query)) {
                searchResults.push(b);
                const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
                b.innerHTML = orig.replace(re, '<mark>$1</mark>');
            } else {
                b.innerHTML = orig;
            }
        });
        chatSearchCount.textContent = searchResults.length > 0 ? `${searchResults.length}건` : '0건';
        if (searchResults.length > 0) { searchIdx = 0; highlightCurrent(); }
    }

    function navigateSearch(dir) {
        if (searchResults.length === 0) return;
        searchIdx = (searchIdx + dir + searchResults.length) % searchResults.length;
        highlightCurrent();
    }

    function highlightCurrent() {
        searchResults.forEach(b => b.querySelectorAll('mark').forEach(m => m.classList.remove('current')));
        if (searchResults[searchIdx]) {
            searchResults[searchIdx].querySelectorAll('mark').forEach(m => m.classList.add('current'));
            searchResults[searchIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
            chatSearchCount.textContent = `${searchIdx+1}/${searchResults.length}`;
        }
    }

    function clearSearchHighlights() {
        chatMessagesArea.querySelectorAll('.msg-bubble').forEach(b => {
            if (b.dataset.originalText) b.innerHTML = b.dataset.originalText;
        });
        searchResults = []; searchIdx = -1;
    }

    // ══════════════════════════════════════════════════════════
    // v5: 채널 고정 (Pin)
    // ══════════════════════════════════════════════════════════
    const PINNED_KEY = 'erp_messenger_pinned';
    function getPinnedChannels() {
        try { return JSON.parse(localStorage.getItem(PINNED_KEY) || '[]'); } catch(e) { return []; }
    }
    function savePinnedChannels(pins) { localStorage.setItem(PINNED_KEY, JSON.stringify(pins)); }

    const btnPinChannel = document.getElementById('btnPinChannel');
    if (btnPinChannel) {
        btnPinChannel.addEventListener('click', () => {
            const pins = getPinnedChannels();
            const idx = pins.indexOf(activeRoomId);
            if (idx >= 0) { pins.splice(idx, 1); showToast('채널 고정이 해제되었습니다.'); }
            else { pins.push(activeRoomId); showToast('채널이 상단에 고정되었습니다.'); }
            savePinnedChannels(pins);
            updatePinButton();
            renderChannelList();
        });
    }

    function updatePinButton() {
        if (!btnPinChannel) return;
        const pins = getPinnedChannels();
        if (pins.includes(activeRoomId)) { btnPinChannel.classList.add('pinned'); }
        else { btnPinChannel.classList.remove('pinned'); }
    }

    // 채널 렌더링 시 고정 채널 우선 정렬 적용
    const origRenderChannelList = renderChannelList;
    renderChannelList = function() {
        origRenderChannelList();
        // 고정 아이콘 + 정렬 후처리
        const pins = getPinnedChannels();
        if (channelList && pins.length > 0) {
            const items = Array.from(channelList.querySelectorAll('.channel-item'));
            const pinned = items.filter(li => pins.includes(li.dataset.room));
            const unpinned = items.filter(li => !pins.includes(li.dataset.room));
            channelList.innerHTML = '';
            pinned.forEach(li => { li.classList.add('pinned'); li.innerHTML += '<i class="fa-solid fa-thumbtack pin-icon"></i>'; channelList.appendChild(li); });
            unpinned.forEach(li => channelList.appendChild(li));
        }
        updatePinButton();
    };

    // ══════════════════════════════════════════════════════════
    // v5: 읽음 확인 + 메시지 삭제
    // ══════════════════════════════════════════════════════════
    // renderSingleMessage 오버라이드
    const origRenderSingleMessage = renderSingleMessage;
    renderSingleMessage = function(msg) {
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

        // 읽음 표시 (자신의 메시지만)
        let readHtml = '';
        if (isSelf) {
            const isRead = !msg.unread;
            readHtml = `<div class="msg-read-status ${isRead ? 'read' : ''}"><i class="fa-solid fa-check-double"></i> ${isRead ? '읽음' : '전송됨'}</div>`;
        }

        // 삭제 버튼 (자신의 메시지만)
        let deleteBtn = '';
        if (isSelf) {
            deleteBtn = `<button class="msg-delete-btn" data-msgid="${msg.id}" title="메시지 삭제"><i class="fa-solid fa-trash-can"></i></button>`;
        }

        if (msg.isBroadcast) {
            return `
                <div class="msg-wrapper ${isSelf ? 'self' : 'peer'}">
                    ${avatarHtml}
                    <div class="msg-content-block">
                        <div class="msg-meta">${nameHtml}<span class="m-time">${escapeHtml(msg.timeStr)}</span>${deleteBtn}</div>
                        <div class="msg-bubble broadcast">
                            <strong class="b-title"><i class="fa-solid fa-bullhorn"></i> 긴급 공지 (Broadcast)</strong>
                            <p>${textHtml}</p>
                        </div>
                        ${readHtml}
                    </div>
                </div>
            `;
        }

        return `
            <div class="msg-wrapper ${isSelf ? 'self' : 'peer'}">
                ${avatarHtml}
                <div class="msg-content-block">
                    <div class="msg-meta">${nameHtml}<span class="m-time">${escapeHtml(msg.timeStr)}</span>${deleteBtn}</div>
                    <div class="msg-bubble">${textHtml}</div>
                    ${readHtml}
                </div>
            </div>
        `;
    };

    // 삭제 버튼 이벤트 위임
    chatMessagesArea.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.msg-delete-btn');
        if (!delBtn) return;
        const msgId = delBtn.dataset.msgid;
        if (!confirm('이 메시지를 삭제하시겠습니까?')) return;
        const messages = loadMessages();
        const roomMsgs = messages[activeRoomId] || [];
        const idx = roomMsgs.findIndex(m => m.id === msgId);
        if (idx >= 0) {
            roomMsgs.splice(idx, 1);
            messages[activeRoomId] = roomMsgs;
            saveMessages(messages);
            renderChatRoom();
            showToast('메시지가 삭제되었습니다.');
        }
    });

    // ══════════════════════════════════════════════════════════
    // v5: 타이핑 인디케이터
    // ══════════════════════════════════════════════════════════
    let typingTimer = null;
    chatInput.addEventListener('input', () => {
        if (window.erpSocket && window.erpSocket.connected) {
            window.erpSocket.emit('user_typing', { roomId: activeRoomId, empId: myEmpId, name: myName });
        }
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            if (window.erpSocket && window.erpSocket.connected) {
                window.erpSocket.emit('user_stop_typing', { roomId: activeRoomId, empId: myEmpId });
            }
        }, 2000);
    });

    window.handleTypingIndicator = function(data) {
        if (data.empId === myEmpId || data.roomId !== activeRoomId) return;
        let indicator = chatMessagesArea.querySelector('.typing-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'typing-indicator';
            chatMessagesArea.appendChild(indicator);
        }
        indicator.innerHTML = `<span class="typing-dots"><span></span><span></span><span></span></span> ${escapeHtml(data.name)}님이 입력 중...`;
        chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
    };

    window.handleStopTyping = function(data) {
        if (data.roomId !== activeRoomId) return;
        const indicator = chatMessagesArea.querySelector('.typing-indicator');
        if (indicator) indicator.remove();
    };

    // Socket 이벤트 바인딩 (socket_client.js가 로드된 후)
    setTimeout(() => {
        if (window.erpSocket) {
            window.erpSocket.on('user_typing', (d) => { if (typeof window.handleTypingIndicator === 'function') window.handleTypingIndicator(d); });
            window.erpSocket.on('user_stop_typing', (d) => { if (typeof window.handleStopTyping === 'function') window.handleStopTyping(d); });
        }
    }, 1000);

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
