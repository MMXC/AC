/**
 * 共享区域操作同步功能
 */

// WebSocket 连接（复用 chat.js 的连接或创建新连接）
let syncWs = null;
let currentUserId = null;
let currentRoomId = null;
let isApplyingRemoteOperation = false; // 防止循环同步
let lastScrollPosition = { x: 0, y: 0 };
let scrollThrottleTimer = null;

/**
 * 初始化操作同步功能
 */
function initSync() {
    // 获取房间ID和用户ID
    currentRoomId = getRoomIdFromPath();
    if (!currentRoomId) {
        console.error('无法获取房间ID');
        return;
    }

    // 获取当前用户信息
    const members = getMembersList();
    if (members.length > 0) {
        currentUserId = members[0].id;
    } else {
        currentUserId = 'user-' + Date.now();
    }

    // 连接 WebSocket（如果 chat.js 已经连接，可以复用，这里先创建独立连接）
    connectSyncWebSocket();

    // 等待 iframe 加载完成后设置事件监听
    setupIframeEventListeners();
}

/**
 * 连接 WebSocket
 */
function connectSyncWebSocket() {
    // 如果 chat.js 已经创建了 WebSocket，可以复用
    // 这里先尝试获取全局的 ws 连接
    if (typeof ws !== 'undefined' && ws && ws.readyState === WebSocket.OPEN) {
        syncWs = ws;
        // 复用现有的消息处理
        return;
    }

    // 否则创建新的连接
    const wsUrl = `ws://localhost:3001?roomId=${currentRoomId}&userId=${currentUserId}`;
    
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

    syncWs.onclose = () => {
        console.log('操作同步 WebSocket 连接已关闭');
        setTimeout(() => {
            if (currentRoomId) {
                connectSyncWebSocket();
            }
        }, 3000);
    };
}

/**
 * 处理同步消息
 */
function handleSyncMessage(message) {
    // 忽略自己发送的消息
    if (message.userId === currentUserId) {
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
        userId: currentUserId,
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
        userId: currentUserId,
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
        userId: currentUserId,
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
        getCurrentUserId: () => currentUserId,
        getCurrentRoomId: () => currentRoomId,
    };
}
