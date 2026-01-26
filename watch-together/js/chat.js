/**
 * 实时聊天功能
 */

// WebSocket 连接
let ws = null;
let currentUserId = null;
let currentUserNickname = null;
let currentRoomId = null;
let messageHistory = [];

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

    // 获取当前用户信息（从成员列表中获取，或生成临时ID）
    const members = getMembersList();
    if (members.length > 0) {
        currentUserId = members[0].id;
        currentUserNickname = members[0].name;
    } else {
        // 如果没有成员信息，生成临时ID
        currentUserId = 'user-' + Date.now();
        currentUserNickname = '我';
    }

    // 连接 WebSocket
    connectWebSocket();

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
    const wsUrl = `ws://localhost:3001?roomId=${currentRoomId}&userId=${currentUserId}`;
    
    // 在浏览器环境中使用原生 WebSocket
    if (typeof WebSocket !== 'undefined') {
        ws = new WebSocket(wsUrl);
    } else {
        console.error('WebSocket 不支持');
        return;
    }

    ws.onopen = () => {
        console.log('WebSocket 连接已建立');
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

    ws.onclose = () => {
        console.log('WebSocket 连接已关闭');
        // 尝试重连
        setTimeout(() => {
            if (currentRoomId) {
                connectWebSocket();
            }
        }, 3000);
    };
}

/**
 * 处理 WebSocket 消息
 */
function handleWebSocketMessage(message) {
    switch (message.type) {
        case 'SYNC_STATE':
            // 同步状态，加载消息历史
            if (message.data && message.data.messages) {
                messageHistory = message.data.messages || [];
                renderMessages();
            }
            break;

        case 'CHAT_MESSAGE':
            // 收到新消息
            addMessageToHistory(message.data);
            renderMessage(message.data);
            break;

        case 'MEMBER_JOINED':
        case 'MEMBER_LEFT':
            // 成员变化，可以显示系统消息（可选）
            break;
    }
}

/**
 * 发送消息
 */
function sendMessage(content) {
    if (!content || !content.trim()) {
        return;
    }

    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.error('WebSocket 未连接');
        return;
    }

    const message = {
        type: 'CHAT_MESSAGE',
        userId: currentUserId,
        nickname: currentUserNickname,
        content: content.trim()
    };

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
    });
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
    };
}
