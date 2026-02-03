/**
 * 实时聊天功能
 */

// WebSocket 连接
let ws = null;
let currentUserId = null;
let currentUserNickname = null;
let currentRoomId = null;
let messageHistory = [];

// WebSocket 重连配置
const WS_RECONNECT_CONFIG = {
    maxRetries: 3, // 最大重试次数
    retryInterval: 5000, // 重试间隔：5秒
    retryCount: 0, // 当前重试次数
};

/**
 * 显示 WebSocket 错误提示
 */
function showWebSocketError(title, message, isRecoverable = false) {
    // 创建或获取错误通知容器
    let errorNotification = document.getElementById('websocketErrorNotification');
    
    if (!errorNotification) {
        errorNotification = document.createElement('div');
        errorNotification.id = 'websocketErrorNotification';
        errorNotification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2d2d2d;
            border: 1px solid #e74c3c;
            border-radius: 8px;
            padding: 20px;
            max-width: 400px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            animation: slideIn 0.3s ease-out;
        `;
        
        // 添加动画样式（如果还没有）
        if (!document.getElementById('errorNotificationStyles')) {
            const style = document.createElement('style');
            style.id = 'errorNotificationStyles';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(errorNotification);
    }
    
    // 设置内容
    errorNotification.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 12px;">
            <div style="flex: 1;">
                <h3 style="margin: 0 0 8px 0; color: #e74c3c; font-size: 1.1em; font-weight: 600;">
                    ${title}
                </h3>
                <p style="margin: 0 0 12px 0; color: #aaa; font-size: 0.9em; line-height: 1.5;">
                    ${message}
                </p>
                ${isRecoverable ? `
                    <button id="refreshPageBtn" style="
                        padding: 8px 16px;
                        background: #4a9eff;
                        border: none;
                        border-radius: 6px;
                        color: #fff;
                        font-size: 0.9em;
                        font-weight: 600;
                        cursor: pointer;
                        transition: background 0.2s;
                        margin-right: 8px;
                    ">刷新页面</button>
                ` : ''}
            </div>
            <button id="closeWebSocketErrorBtn" style="
                background: transparent;
                border: none;
                color: #aaa;
                font-size: 1.2em;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: color 0.2s;
            ">×</button>
        </div>
    `;
    
    // 显示通知
    errorNotification.style.display = 'block';
    
    // 绑定关闭按钮
    const closeBtn = errorNotification.querySelector('#closeWebSocketErrorBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            errorNotification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                errorNotification.style.display = 'none';
            }, 300);
        });
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.color = '#fff';
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.color = '#aaa';
        });
    }
    
    // 绑定刷新按钮
    if (isRecoverable) {
        const refreshBtn = errorNotification.querySelector('#refreshPageBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                window.location.reload();
            });
            refreshBtn.addEventListener('mouseenter', () => {
                refreshBtn.style.background = '#3a8eef';
            });
            refreshBtn.addEventListener('mouseleave', () => {
                refreshBtn.style.background = '#4a9eff';
            });
        }
    }
    
    // 自动关闭（10秒后，如果是可恢复的错误）
    if (isRecoverable) {
        setTimeout(() => {
            if (errorNotification.style.display !== 'none') {
                errorNotification.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => {
                    errorNotification.style.display = 'none';
                }, 300);
            }
        }, 10000);
    }
}

/**
 * 初始化聊天功能
 */
function initChat() {
    // 获取房间ID
    currentRoomId = getRoomIdFromPath();
    if (!currentRoomId) {
        console.error('无法获取房间ID');
        return;
    }

    // 检查用户是否已加入房间
    // 确保 window.currentUserId 是字符串类型，而不是 DOM 元素
    if (typeof window !== 'undefined' && window.currentUserId && typeof window.currentUserId === 'string') {
        currentUserId = window.currentUserId;
        currentUserNickname = window.currentUserNickname || '我';
        
        console.log('用户已加入房间，准备连接 WebSocket', { currentUserId, currentRoomId });
        
        // 用户已加入，连接 WebSocket
        connectWebSocket();
    } else {
        // 用户尚未加入房间，等待加入事件
        console.log('等待用户加入房间...', { currentRoomId });
        // 不在这里添加事件监听器，在 DOMContentLoaded 中统一处理
        return;
    }

    // 绑定发送按钮事件
    const sendButton = document.getElementById('chatSendButton');
    const chatInput = document.getElementById('chatInput');

    if (sendButton && chatInput) {
        sendButton.addEventListener('click', handleSendMessage);
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
    }
}

/**
 * 连接 WebSocket
 */
function connectWebSocket() {
    // 验证必要参数
    if (!currentRoomId || !currentUserId) {
        console.error('无法连接 WebSocket: 缺少必要参数', { currentRoomId, currentUserId });
        return;
    }
    
    // 验证 userId 格式：与后端约定一致，接受 UUID（如 8f0bb8e5-9711-419b-8481-accbdf28ace2）或 user-xxx/cuid 等
    const userIdPattern = /^[\w-]{8,}$/;
    if (!userIdPattern.test(currentUserId)) {
        console.error('无法连接 WebSocket: userId 格式不正确', currentUserId);
        return;
    }
    
    // 获取 WebSocket URL（优先使用 window 配置；默认与 API 同主机，端口 3000）
    let wsBaseUrl = 'ws://localhost:3000';
    if (typeof window !== 'undefined' && window.WS_BASE_URL) {
        wsBaseUrl = window.WS_BASE_URL;
    } else if (typeof window !== 'undefined' && window.API_BASE_URL) {
        // 如果只有 API_BASE_URL，转换为 WebSocket URL
        wsBaseUrl = window.API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
    }
    const wsUrl = `${wsBaseUrl}/ws?roomId=${currentRoomId}&userId=${currentUserId}`;
    
    console.log('正在连接 WebSocket:', wsUrl);
    
    // 在浏览器环境中使用原生 WebSocket
    if (typeof WebSocket !== 'undefined') {
        ws = new WebSocket(wsUrl);
    } else {
        console.error('WebSocket 不支持');
        return;
    }

    ws.onopen = () => {
        console.log('WebSocket 连接已建立');
        
        // 重置重试计数
        WS_RECONNECT_CONFIG.retryCount = 0;
        
        // 供自动化测试等待：连接就绪后可发送聊天消息
        if (typeof document !== 'undefined' && document.body) {
            document.body.dataset.chatWsConnected = 'true';
        }
        
        // 触发 WebSocket 连接事件，供其他模块使用（如 screen-streaming.js）
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('websocketConnected', {
                detail: { ws: ws }
            }));
        }
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            handleWebSocketMessage(message);
        } catch (err) {
            console.error('解析 WebSocket 消息失败:', err);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket 错误:', error);
    };

    ws.onclose = (event) => {
        console.log('WebSocket 连接已关闭', event.code, event.reason);
        
        // 触发 WebSocket 断开事件
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('websocketDisconnected', {
                detail: { code: event.code, reason: event.reason }
            }));
        }
        
        // 如果是因为连接数限制而关闭（1008），不要重连并显示错误提示
        if (event.code === 1008) {
            console.error('WebSocket 连接因连接数限制而关闭，停止重连');
            WS_RECONNECT_CONFIG.retryCount = 0; // 重置重试计数
            // 显示用户友好的错误提示
            const errorMessage = event.reason || '连接过多，请关闭多余页面后刷新';
            showWebSocketError('连接失败', `连接失败：${errorMessage}`, false);
            return;
        }
        
        // 如果是正常关闭（1000），不重连
        if (event.code === 1000) {
            WS_RECONNECT_CONFIG.retryCount = 0;
            return;
        }
        
        // 只有在用户已加入房间且不是主动关闭的情况下才重连
        // 确保 window.currentUserId 是字符串类型
        if (currentRoomId && window.currentUserId && typeof window.currentUserId === 'string') {
            // 检查重试次数
            if (WS_RECONNECT_CONFIG.retryCount < WS_RECONNECT_CONFIG.maxRetries) {
                WS_RECONNECT_CONFIG.retryCount++;
                const retryMessage = `WebSocket 连接断开，正在重试 (${WS_RECONNECT_CONFIG.retryCount}/${WS_RECONNECT_CONFIG.maxRetries})...`;
                console.log(retryMessage);
                
                // 显示重试提示（仅在第一次重试时显示）
                if (WS_RECONNECT_CONFIG.retryCount === 1) {
                    showWebSocketError('连接断开', 'WebSocket 信令连接已断开，正在自动重连...', true);
                }
                
                setTimeout(() => {
                    if (currentRoomId && window.currentUserId && typeof window.currentUserId === 'string') {
                        connectWebSocket();
                    }
                }, WS_RECONNECT_CONFIG.retryInterval);
            } else {
                // 重试次数已用完
                console.error('WebSocket 重连次数已达上限，停止重连');
                WS_RECONNECT_CONFIG.retryCount = 0; // 重置计数
                showWebSocketError(
                    '连接失败',
                    'WebSocket 连接已断开，自动重连失败。请检查网络连接后刷新页面。',
                    true // 可恢复，用户可以通过刷新页面重试
                );
            }
        }
    };
}

/**
 * 处理 WebSocket 消息
 */
function handleWebSocketMessage(message) {
    console.log('收到 WebSocket 消息:', message.type, message);
    
    switch (message.type) {
        case 'SYNC_STATE':
            // 同步状态，加载消息历史
            // 后端返回的是 recentMessages，不是 messages
            if (message.data && message.data.recentMessages) {
                messageHistory = message.data.recentMessages || [];
                console.log('加载消息历史:', messageHistory.length, '条消息');
                renderMessages();
            } else {
                console.log('SYNC_STATE 消息中没有 recentMessages');
            }
            // 同步成员列表
            if (message.data && message.data.members && Array.isArray(message.data.members)) {
                console.log('同步成员列表:', message.data.members.length, '个成员');
                const currentUserId = window.currentUserId;
                
                // 使用 addMember 和 removeMember 函数更新成员列表（如果可用）
                if (typeof addMember === 'function' && typeof removeMember === 'function') {
                    // 获取当前成员列表
                    const currentMembers = typeof getMembersList === 'function' ? getMembersList() : [];
                    
                    // 创建新成员列表的 userId 集合（用于快速查找）
                    const newMemberIds = new Set(message.data.members.map(m => m.userId));
                    
                    // 移除所有不在新列表中的成员（包括当前用户，因为当前用户也会在新列表中）
                    currentMembers.forEach(member => {
                        if (!newMemberIds.has(member.id)) {
                            removeMember(member.id);
                        }
                    });
                    
                    // 添加或更新所有成员到列表
                    message.data.members.forEach(member => {
                        addMember(member.userId, member.nickname);
                    });
                    
                    console.log('成员列表已同步，当前成员数:', message.data.members.length);
                } else {
                    console.warn('addMember 或 removeMember 函数不可用，无法同步成员列表');
                }
            }
            // 初始化操作来源状态
            if (message.data && typeof handleOperationSourceChanged === 'function') {
                handleOperationSourceChanged({
                    operationSourceUserId: message.data.operationSourceUserId || null,
                });
            }
            break;

        case 'CHAT_MESSAGE':
            // 收到新消息
            console.log('收到聊天消息:', message.data);
            addMessageToHistory(message.data);
            renderMessage(message.data);
            break;

        case 'CONNECTED':
            // 连接成功消息（可以忽略或显示）
            console.log('WebSocket 连接确认:', message.data);
            break;

        case 'ERROR':
            // 错误消息
            console.error('WebSocket 错误:', message.error);
            break;

        case 'MEMBER_JOINED':
            // 成员加入，更新成员列表，并派发事件供房主建立 WebRTC 连接
            console.log('成员加入:', message.data);
            if (message.data && message.data.userId) {
                const addMemberFn = typeof addMember === 'function' ? addMember : (typeof window !== 'undefined' && window.addMember);
                const nickname = message.data.nickname != null && message.data.nickname !== '' ? message.data.nickname : (message.data.userId || '访客');
                if (addMemberFn) {
                    addMemberFn(message.data.userId, nickname);
                    console.log('已添加成员到列表:', message.data.userId, nickname);
                } else {
                    console.warn('addMember 函数不可用，无法更新成员列表');
                }
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('memberJoinedRoom', {
                        detail: { userId: message.data.userId, nickname },
                    }));
                }
            }
            break;
        case 'MEMBER_LEFT':
            // 成员离开，更新成员列表，并派发事件供房主关闭对应 WebRTC 连接
            console.log('成员离开:', message.data);
            if (message.data && message.data.userId) {
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('memberLeftRoom', {
                        detail: { userId: message.data.userId },
                    }));
                }
                if (typeof removeMember === 'function') {
                    removeMember(message.data.userId);
                    console.log('已从列表中移除成员:', message.data.userId);
                } else {
                    console.warn('removeMember 函数不可用，无法更新成员列表');
                }
            }
            break;

        case 'OPERATION_SOURCE_CHANGED':
            // 操作来源变更
            console.log('操作来源变更:', message.data);
            if (typeof handleOperationSourceChanged === 'function') {
                handleOperationSourceChanged(message.data);
            }
            break;

        case 'OP_SOURCE_OPERATION':
            // 操作来源操作消息（仅房主接收）
            console.log('收到操作来源操作:', message.data);
            if (window.isHost && typeof simulateOperationInIframe === 'function') {
                simulateOperationInIframe(message.data.operation);
            }
            break;

        case (window.WebRTCSignalingType && window.WebRTCSignalingType.WEBRTC_OFFER):
        case (window.WebRTCSignalingType && window.WebRTCSignalingType.WEBRTC_ANSWER):
        case (window.WebRTCSignalingType && window.WebRTCSignalingType.WEBRTC_ICE_CANDIDATE):
        case (window.WebRTCSignalingType && window.WebRTCSignalingType.WEBRTC_END):
        case (window.WebRTCSignalingType && window.WebRTCSignalingType.WEBRTC_ERROR):
            // WebRTC 信令消息：转交给专门的处理函数（如 screen-streaming.js），类型来自 webrtc-signaling.js
            if (typeof window !== 'undefined' && typeof window.handleWebRTCSignalingMessage === 'function') {
                window.handleWebRTCSignalingMessage(message);
            } else {
                console.warn('收到 WebRTC 信令消息，但未注册处理函数', message.type);
            }
            break;

        default:
            console.log('未知消息类型:', message.type);
    }
}

/**
 * 发送消息
 */
function sendMessage(content) {
    if (!content || !content.trim()) {
        console.warn('消息内容为空，无法发送');
        return;
    }

    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.error('WebSocket 未连接，当前状态:', ws ? ws.readyState : 'null');
        return;
    }

    if (!currentUserId || !currentUserNickname) {
        console.error('用户信息不完整，无法发送消息', { currentUserId, currentUserNickname });
        return;
    }

    const message = {
        type: 'CHAT_MESSAGE',
        userId: currentUserId,
        nickname: currentUserNickname,
        content: content.trim()
    };

    console.log('发送聊天消息:', message);
    ws.send(JSON.stringify(message));
}

/**
 * 处理发送消息按钮点击
 */
function handleSendMessage() {
    const chatInput = document.getElementById('chatInput');
    if (!chatInput) return;

    const content = chatInput.value.trim();
    if (!content) return;

    // 发送消息
    sendMessage(content);

    // 清空输入框
    chatInput.value = '';
    
    // 重置输入框高度
    chatInput.style.height = 'auto';
}

/**
 * 添加消息到历史记录
 */
function addMessageToHistory(message) {
    // 检查消息是否已存在（避免重复添加）
    if (message.id && messageHistory.some(m => m.id === message.id)) {
        console.log('消息已存在，跳过添加:', message.id);
        return;
    }
    
    messageHistory.push(message);
    // 只保留最近100条消息
    if (messageHistory.length > 100) {
        messageHistory = messageHistory.slice(-100);
    }
}

/**
 * 渲染单条消息
 */
function renderMessage(message) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    // 检查消息是否已渲染（避免重复渲染）
    if (message.id) {
        const existingMessage = chatMessages.querySelector(`[data-message-id="${message.id}"]`);
        if (existingMessage) {
            console.log('消息已渲染，跳过:', message.id);
            return;
        }
    }

    // 移除空状态提示
    const emptyState = chatMessages.querySelector('.chat-empty');
    if (emptyState) {
        emptyState.remove();
    }

    // 创建消息元素
    const messageEl = document.createElement('div');
    messageEl.className = 'chat-message';
    messageEl.setAttribute('data-message-id', message.id);

    // 消息头部（发送者和时间）
    const headerEl = document.createElement('div');
    headerEl.className = 'chat-message-header';

    const senderEl = document.createElement('span');
    senderEl.className = 'chat-message-sender';
    senderEl.textContent = message.nickname || '未知用户';

    const timeEl = document.createElement('span');
    timeEl.className = 'chat-message-time';
    timeEl.textContent = formatMessageTime(message.timestamp);

    headerEl.appendChild(senderEl);
    headerEl.appendChild(timeEl);

    // 消息内容
    const contentEl = document.createElement('div');
    contentEl.className = 'chat-message-content';
    contentEl.textContent = message.content;

    messageEl.appendChild(headerEl);
    messageEl.appendChild(contentEl);

    chatMessages.appendChild(messageEl);

    // 滚动到底部
    scrollChatToBottom();
}

/**
 * 渲染所有消息
 */
function renderMessages() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    // 清空现有消息
    chatMessages.innerHTML = '';

    if (messageHistory.length === 0) {
        const emptyEl = document.createElement('div');
        emptyEl.className = 'chat-empty';
        emptyEl.textContent = '暂无消息';
        chatMessages.appendChild(emptyEl);
        return;
    }

    // 渲染所有消息
    messageHistory.forEach(message => {
        renderMessage(message);
    });
    
    // 渲染完成后滚动到底部
    scrollChatToBottom();
}

/**
 * 格式化消息时间
 */
function formatMessageTime(timestamp) {
    if (!timestamp) return '';

    try {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        // 如果是今天，显示时间
        if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
            return date.toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }

        // 如果是昨天
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.getDate() === yesterday.getDate()) {
            return '昨天 ' + date.toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }

        // 其他情况显示日期和时间
        return date.toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (err) {
        return '';
    }
}

/**
 * 滚动聊天区域到底部
 */
function scrollChatToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

/**
 * 更新当前用户信息
 */
function updateCurrentUser(userId, nickname) {
    currentUserId = userId;
    currentUserNickname = nickname;
}

// 页面加载完成后初始化
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // 等待 room.js 初始化完成
        setTimeout(() => {
            initChat();
        }, 100);
        
        // 监听用户加入房间事件（支持多次触发，比如修改昵称后重新加入）
        window.addEventListener('userJoinedRoom', (event) => {
            console.log('收到 userJoinedRoom 事件', event.detail);
            // 如果已经有连接，先关闭
            if (ws && ws.readyState !== WebSocket.CLOSED) {
                console.log('关闭现有 WebSocket 连接');
                ws.close();
            }
            // 确保使用事件中的 userId（必须是字符串）
            if (event.detail && event.detail.userId && typeof event.detail.userId === 'string') {
                window.currentUserId = event.detail.userId;
                window.currentUserNickname = event.detail.nickname;
            } else {
                console.error('userJoinedRoom 事件中的 userId 无效:', event.detail);
            }
            // 重新初始化
            setTimeout(() => {
                initChat();
            }, 100);
        });
    });
}

/**
 * 获取 WebSocket 连接（供其他模块使用）
 */
function getWebSocketConnection() {
    return ws;
}

// 将函数暴露到全局作用域，供其他脚本（如 video-player.js）使用
if (typeof window !== 'undefined') {
    window.getWebSocketConnection = getWebSocketConnection;
}

// 导出函数供测试使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initChat,
        sendMessage,
        connectWebSocket,
        handleWebSocketMessage,
        renderMessage,
        renderMessages,
        formatMessageTime,
        updateCurrentUser,
        getMessageHistory: () => messageHistory,
        getCurrentUserId: () => currentUserId,
        getCurrentUserNickname: () => currentUserNickname,
        getWebSocketConnection,
    };
}
