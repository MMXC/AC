/**
 * 共享区域操作同步功能
 */

// WebSocket 连接（复用 chat.js 的连接或创建新连接）
let syncWs = null;
// 注意：currentUserId 和 currentRoomId 应该从 chat.js 或 room.js 中获取，避免重复声明
let syncCurrentUserId = null;
let syncCurrentRoomId = null;
let isApplyingRemoteOperation = false; // 防止循环同步
let lastScrollPosition = { x: 0, y: 0 };
let scrollThrottleTimer = null;

/**
 * 初始化操作同步功能
 */
function initSync() {
    // 获取房间ID和用户ID
    syncCurrentRoomId = getRoomIdFromPath();
    if (!syncCurrentRoomId) {
        console.error('无法获取房间ID');
        return;
    }

    // 检查用户是否已加入房间
    // 确保 window.currentUserId 是字符串类型，而不是 DOM 元素
    if (typeof window !== 'undefined' && window.currentUserId && typeof window.currentUserId === 'string') {
        syncCurrentUserId = window.currentUserId;
        
        console.log('用户已加入房间，准备连接操作同步 WebSocket', { syncCurrentUserId, syncCurrentRoomId });
        
        // 连接 WebSocket（如果 chat.js 已经连接，可以复用，这里先创建独立连接）
        connectSyncWebSocket();

        // 等待 iframe 加载完成后设置事件监听
        setupIframeEventListeners();
    } else {
        // 用户尚未加入房间，等待加入事件
        console.log('等待用户加入房间...', { syncCurrentRoomId });
        // 不在这里添加事件监听器，在 DOMContentLoaded 中统一处理
        return;
    }
}

/**
 * 连接 WebSocket
 */
function connectSyncWebSocket() {
    // 验证必要参数
    if (!syncCurrentRoomId || !syncCurrentUserId) {
        console.error('无法连接操作同步 WebSocket: 缺少必要参数', { syncCurrentRoomId, syncCurrentUserId });
        return;
    }
    
    // 验证 userId 格式：与后端约定一致，接受 UUID（如 8f0bb8e5-9711-419b-8481-accbdf28ace2）或 user-xxx/cuid 等
    const userIdPattern = /^[\w-]{8,}$/;
    if (!userIdPattern.test(syncCurrentUserId)) {
        console.error('无法连接操作同步 WebSocket: userId 格式不正确', syncCurrentUserId);
        return;
    }
    
    // 如果 chat.js 已经创建了 WebSocket，可以复用
    // 这里先尝试获取全局的 ws 连接
    if (typeof ws !== 'undefined' && ws && ws.readyState === WebSocket.OPEN) {
        syncWs = ws;
        // 复用现有的消息处理
        return;
    }

    // 否则创建新的连接
    // 获取 WebSocket URL（优先使用 window 配置，否则使用默认值）
    let wsBaseUrl = 'ws://localhost:3001';
    if (typeof window !== 'undefined' && window.WS_BASE_URL) {
        wsBaseUrl = window.WS_BASE_URL;
    } else if (typeof window !== 'undefined' && window.API_BASE_URL) {
        // 如果只有 API_BASE_URL，转换为 WebSocket URL
        wsBaseUrl = window.API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
    }
    const wsUrl = `${wsBaseUrl}/ws?roomId=${syncCurrentRoomId}&userId=${syncCurrentUserId}`;
    
    console.log('正在连接操作同步 WebSocket:', wsUrl);
    
    if (typeof WebSocket !== 'undefined') {
        syncWs = new WebSocket(wsUrl);
    } else {
        console.error('WebSocket 不支持');
        return;
    }

    syncWs.onopen = () => {
        console.log('操作同步 WebSocket 连接已建立');
    };

    syncWs.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            handleSyncMessage(message);
        } catch (err) {
            console.error('解析同步消息失败:', err);
        }
    };

    syncWs.onerror = (error) => {
        console.error('操作同步 WebSocket 错误:', error);
    };

    syncWs.onclose = (event) => {
        console.log('操作同步 WebSocket 连接已关闭', event.code, event.reason);
        // 如果是因为连接数限制而关闭（1008），不要重连并显示错误提示
        if (event.code === 1008) {
            console.error('操作同步 WebSocket 连接因连接数限制而关闭，停止重连');
            // 显示用户友好的错误提示
            const errorMessage = event.reason || '连接过多，请关闭多余页面后刷新';
            if (typeof showError === 'function') {
                showError(`操作同步连接失败：${errorMessage}`);
            } else {
                // 如果没有 showError 函数，直接显示错误区域
                const errorDiv = document.getElementById('error');
                const errorMessageEl = document.getElementById('errorMessage');
                if (errorDiv && errorMessageEl) {
                    errorDiv.style.display = 'block';
                    errorMessageEl.textContent = `操作同步连接失败：${errorMessage}`;
                } else {
                    alert(`操作同步连接失败：${errorMessage}`);
                }
            }
            return;
        }
        // 只有在用户已加入房间且不是主动关闭的情况下才重连
        // 确保 syncCurrentUserId 是字符串类型
        if (syncCurrentRoomId && syncCurrentUserId && typeof syncCurrentUserId === 'string' && event.code !== 1000) {
            setTimeout(() => {
                if (syncCurrentRoomId && syncCurrentUserId && typeof syncCurrentUserId === 'string') {
                    connectSyncWebSocket();
                }
            }, 3000);
        }
    };
}

/**
 * 处理同步消息
 */
function handleSyncMessage(message) {
    // 成员列表相关消息：若由 sync 连接收到，转发给 chat 的 handleWebSocketMessage 以更新成员列表
    if (message.type === 'SYNC_STATE' || message.type === 'MEMBER_JOINED' || message.type === 'MEMBER_LEFT') {
        if (typeof window !== 'undefined' && typeof window.handleWebSocketMessage === 'function') {
            window.handleWebSocketMessage(message);
        }
    }
    // 忽略自己发送的消息（仅对需区分发送者的类型）
    if (message.userId === syncCurrentUserId) {
        return;
    }

    switch (message.type) {
        case 'SCROLL_SYNC':
            applyScrollSync(message.data);
            break;

        case 'CLICK_SYNC':
            applyClickSync(message.data);
            break;

        case 'URL_CHANGED':
            applyUrlChange(message.data);
            break;

        case 'OPERATION_SYNC':
            applyOperationSync(message.data);
            break;
    }
}

/**
 * 设置 iframe 事件监听
 */
function setupIframeEventListeners() {
    const iframe = document.getElementById('browserFrame');
    if (!iframe) {
        // 如果 iframe 还没加载，等待一下
        setTimeout(setupIframeEventListeners, 100);
        return;
    }

    // 监听 iframe 加载完成
    iframe.addEventListener('load', () => {
        try {
            // 尝试访问 iframe 内容（可能因为跨域限制而失败）
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            
            // 监听 iframe 内的滚动事件
            if (iframeDoc) {
                iframeDoc.addEventListener('scroll', handleIframeScroll, true);
                iframeDoc.addEventListener('click', handleIframeClick, true);
            }

            // 监听 iframe 的 URL 变化
            iframe.contentWindow.addEventListener('popstate', handleIframeUrlChange);
        } catch (e) {
            // 跨域限制，使用替代方案
            console.log('无法直接访问 iframe 内容（跨域限制），使用替代方案');
            setupCrossOriginEventListeners(iframe);
        }
    });

    // 如果 iframe 已经加载完成
    if (iframe.contentDocument || iframe.contentWindow) {
        iframe.dispatchEvent(new Event('load'));
    }
}

/**
 * 设置跨域情况下的事件监听（替代方案）
 */
function setupCrossOriginEventListeners(iframe) {
    // 由于跨域限制，无法直接监听 iframe 内的事件
    // 我们可以监听 iframe 容器的事件，或者使用 postMessage
    // 这里先实现一个基础版本，监听容器的滚动（如果 iframe 可以滚动）
    
    // 监听 iframe 容器的滚动（如果 iframe 本身可以滚动）
    const container = iframe.parentElement;
    if (container) {
        container.addEventListener('scroll', () => {
            // 这个滚动是容器的，不是 iframe 内容的
            // 对于跨域 iframe，我们需要其他方案
        });
    }

    // 使用 postMessage 通信（需要 iframe 内的页面配合）
    window.addEventListener('message', (event) => {
        // 验证来源
        if (event.source === iframe.contentWindow) {
            handleIframePostMessage(event.data);
        }
    });
}

/**
 * 处理来自 iframe 的 postMessage
 */
function handleIframePostMessage(data) {
    if (data.type === 'SCROLL') {
        sendScrollSync(data.x, data.y);
    } else if (data.type === 'CLICK') {
        sendClickSync(data.x, data.y);
    } else if (data.type === 'URL_CHANGE') {
        sendUrlChange(data.url);
    }
}

/**
 * 处理 iframe 内的滚动事件
 */
function handleIframeScroll(event) {
    if (isApplyingRemoteOperation) {
        return;
    }

    const target = event.target;
    const scrollX = target.scrollLeft || window.scrollX || 0;
    const scrollY = target.scrollTop || window.scrollY || 0;

    // 节流处理，避免发送过多消息
    if (scrollThrottleTimer) {
        clearTimeout(scrollThrottleTimer);
    }

    scrollThrottleTimer = setTimeout(() => {
        // 只有当滚动位置真正改变时才发送
        if (scrollX !== lastScrollPosition.x || scrollY !== lastScrollPosition.y) {
            lastScrollPosition = { x: scrollX, y: scrollY };
            sendScrollSync(scrollX, scrollY);
        }
    }, 100);
}

/**
 * 处理 iframe 内的点击事件
 */
function handleIframeClick(event) {
    if (isApplyingRemoteOperation) {
        return;
    }

    const target = event.target;
    const rect = target.getBoundingClientRect();
    const iframe = document.getElementById('browserFrame');
    if (!iframe) return;

    const iframeRect = iframe.getBoundingClientRect();
    const x = event.clientX - iframeRect.left;
    const y = event.clientY - iframeRect.top;

    sendClickSync(x, y);
}

/**
 * 处理 iframe URL 变化
 */
function handleIframeUrlChange(event) {
    if (isApplyingRemoteOperation) {
        return;
    }

    const iframe = document.getElementById('browserFrame');
    if (!iframe) return;

    try {
        const newUrl = iframe.contentWindow.location.href;
        sendUrlChange(newUrl);
    } catch (e) {
        // 跨域限制，无法获取 URL
        console.log('无法获取 iframe URL（跨域限制）');
    }
}

/**
 * 发送滚动同步消息
 */
function sendScrollSync(x, y) {
    if (!syncWs || syncWs.readyState !== WebSocket.OPEN) {
        return;
    }

    const message = {
        type: 'SCROLL_SYNC',
        userId: syncCurrentUserId,
        data: {
            x: x,
            y: y,
            timestamp: Date.now()
        }
    };

    syncWs.send(JSON.stringify(message));
}

/**
 * 发送点击同步消息
 */
function sendClickSync(x, y) {
    if (!syncWs || syncWs.readyState !== WebSocket.OPEN) {
        return;
    }

    const message = {
        type: 'CLICK_SYNC',
        userId: syncCurrentUserId,
        data: {
            x: x,
            y: y,
            timestamp: Date.now()
        }
    };

    syncWs.send(JSON.stringify(message));
}

/**
 * 发送 URL 变化消息
 */
function sendUrlChange(url) {
    if (!syncWs || syncWs.readyState !== WebSocket.OPEN) {
        return;
    }

    const message = {
        type: 'URL_CHANGED',
        userId: syncCurrentUserId,
        data: {
            url: url,
            timestamp: Date.now()
        }
    };

    syncWs.send(JSON.stringify(message));
}

/**
 * 应用滚动同步
 */
function applyScrollSync(data) {
    const iframe = document.getElementById('browserFrame');
    if (!iframe) return;

    isApplyingRemoteOperation = true;

    try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (iframeDoc) {
            iframeDoc.documentElement.scrollLeft = data.x;
            iframeDoc.documentElement.scrollTop = data.y;
        } else {
            // 跨域情况，尝试使用 postMessage
            iframe.contentWindow.postMessage({
                type: 'SYNC_SCROLL',
                x: data.x,
                y: data.y
            }, '*');
        }
    } catch (e) {
        console.log('无法应用滚动同步（跨域限制）');
    }

    setTimeout(() => {
        isApplyingRemoteOperation = false;
    }, 100);
}

/**
 * 应用点击同步
 */
function applyClickSync(data) {
    const iframe = document.getElementById('browserFrame');
    if (!iframe) return;

    isApplyingRemoteOperation = true;

    try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (iframeDoc) {
            const element = iframeDoc.elementFromPoint(data.x, data.y);
            if (element) {
                element.click();
            }
        } else {
            // 跨域情况，尝试使用 postMessage
            iframe.contentWindow.postMessage({
                type: 'SYNC_CLICK',
                x: data.x,
                y: data.y
            }, '*');
        }
    } catch (e) {
        console.log('无法应用点击同步（跨域限制）');
    }

    setTimeout(() => {
        isApplyingRemoteOperation = false;
    }, 100);
}

/**
 * 应用 URL 变化
 */
function applyUrlChange(data) {
    const iframe = document.getElementById('browserFrame');
    if (!iframe) return;

    isApplyingRemoteOperation = true;

    // 使用 loadUrlIntoIframe 函数加载新 URL
    if (typeof loadUrlIntoIframe === 'function') {
        loadUrlIntoIframe(data.url);
    } else {
        iframe.src = data.url;
    }

    setTimeout(() => {
        isApplyingRemoteOperation = false;
    }, 100);
}

/**
 * 应用操作同步（通用）
 */
function applyOperationSync(data) {
    switch (data.operation) {
        case 'scroll':
            applyScrollSync(data);
            break;
        case 'click':
            applyClickSync(data);
            break;
        case 'url':
            applyUrlChange(data);
            break;
    }
}

// 页面加载完成后初始化
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // 等待 room.js 和 chat.js 初始化完成
        setTimeout(() => {
            initSync();
        }, 200);
        
        // 监听用户加入房间事件（支持多次触发，比如修改昵称后重新加入）
        window.addEventListener('userJoinedRoom', (event) => {
            console.log('收到 userJoinedRoom 事件（操作同步）', event.detail);
            // 如果已经有连接，先关闭
            if (syncWs && syncWs.readyState !== WebSocket.CLOSED) {
                console.log('关闭现有操作同步 WebSocket 连接');
                syncWs.close();
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
                initSync();
            }, 200);
        });
    });
}

// 导出函数供测试使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initSync,
        connectSyncWebSocket,
        handleSyncMessage,
        sendScrollSync,
        sendClickSync,
        sendUrlChange,
        applyScrollSync,
        applyClickSync,
        applyUrlChange,
        setupIframeEventListeners,
        getCurrentUserId: () => syncCurrentUserId,
        getCurrentRoomId: () => syncCurrentRoomId,
    };
}
