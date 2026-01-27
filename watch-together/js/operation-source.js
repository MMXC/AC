/**
 * 操作来源管理功能
 */

// API 基础 URL（使用全局变量，避免重复声明）
if (typeof window !== 'undefined') {
    // 如果 window.API_BASE 已定义，使用它；否则设置默认值
    if (!window.API_BASE) {
        if (window.API_BASE_URL) {
            window.API_BASE = window.API_BASE_URL;
        } else if (typeof process !== 'undefined' && process.env && process.env.API_BASE) {
            window.API_BASE = process.env.API_BASE;
        } else {
            window.API_BASE = 'http://localhost:3001';
        }
    }
}
const API_BASE = typeof window !== 'undefined' ? window.API_BASE : 'http://localhost:3001';

let currentOperationSourceUserId = null;

/**
 * 设置操作来源成员
 */
async function setOperationSource(roomId, userId, operationSourceUserId) {
    try {
        const response = await fetch(`${API_BASE}/api/v1/rooms/${roomId}/operation-source`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: userId,
                operationSourceUserId: operationSourceUserId,
            }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error?.message || '设置操作来源失败');
        }

        currentOperationSourceUserId = data.data.operationSourceUserId;
        updateMembersDisplay(); // 更新成员列表显示
        return { success: true };
    } catch (error) {
        console.error('设置操作来源错误:', error);
        return { success: false, error: error.message || '请稍后重试' };
    }
}

/**
 * 取消操作来源
 */
async function clearOperationSource(roomId, userId) {
    return await setOperationSource(roomId, userId, null);
}

/**
 * 获取当前操作来源用户ID
 */
function getCurrentOperationSourceUserId() {
    return currentOperationSourceUserId;
}

/**
 * 检查当前用户是否为操作来源成员
 */
function isCurrentUserOperationSource() {
    return window.currentUserId === currentOperationSourceUserId;
}

/**
 * 处理 OPERATION_SOURCE_CHANGED WebSocket 消息
 */
function handleOperationSourceChanged(data) {
    currentOperationSourceUserId = data.operationSourceUserId;
    updateMembersDisplay(); // 更新成员列表显示
    
    // 如果当前用户被设置为操作来源，初始化操作监听
    if (isCurrentUserOperationSource()) {
        initOperationSourceListener();
    } else {
        // 如果当前用户不再是操作来源，移除操作监听
        removeOperationSourceListener();
    }
}

/**
 * 初始化操作来源监听（仅操作来源成员）
 */
function initOperationSourceListener() {
    // 监听画面容器上的操作事件
    const videoContainer = document.getElementById('videoContainer');
    if (!videoContainer) return;

    // 移除旧的事件监听器（如果存在）
    removeOperationSourceListener();

    // 添加点击事件监听
    videoContainer.addEventListener('click', handleOperationSourceClick, true);
    
    // 添加拖动事件监听
    videoContainer.addEventListener('mousedown', handleOperationSourceMouseDown, true);
    videoContainer.addEventListener('mousemove', handleOperationSourceMouseMove, true);
    videoContainer.addEventListener('mouseup', handleOperationSourceMouseUp, true);
    
    // 添加滚动事件监听
    videoContainer.addEventListener('wheel', handleOperationSourceWheel, true);
    
    // 添加键盘事件监听
    document.addEventListener('keydown', handleOperationSourceKeyDown, true);
    document.addEventListener('keyup', handleOperationSourceKeyUp, true);

    console.log('操作来源监听已初始化');
}

/**
 * 移除操作来源监听
 */
function removeOperationSourceListener() {
    const videoContainer = document.getElementById('videoContainer');
    if (!videoContainer) return;

    videoContainer.removeEventListener('click', handleOperationSourceClick, true);
    videoContainer.removeEventListener('mousedown', handleOperationSourceMouseDown, true);
    videoContainer.removeEventListener('mousemove', handleOperationSourceMouseMove, true);
    videoContainer.removeEventListener('mouseup', handleOperationSourceMouseUp, true);
    videoContainer.removeEventListener('wheel', handleOperationSourceWheel, true);
    document.removeEventListener('keydown', handleOperationSourceKeyDown, true);
    document.removeEventListener('keyup', handleOperationSourceKeyUp, true);

    console.log('操作来源监听已移除');
}

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

/**
 * 处理操作来源点击事件
 */
function handleOperationSourceClick(event) {
    if (!isCurrentUserOperationSource()) return;
    
    const videoContainer = document.getElementById('videoContainer');
    if (!videoContainer) return;

    const rect = videoContainer.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    sendOpSourceOperation({
        type: 'click',
        x: x,
        y: y,
        button: event.button,
        timestamp: Date.now(),
    });
}

/**
 * 处理操作来源鼠标按下事件
 */
function handleOperationSourceMouseDown(event) {
    if (!isCurrentUserOperationSource()) return;
    
    isDragging = true;
    const videoContainer = document.getElementById('videoContainer');
    if (!videoContainer) return;

    const rect = videoContainer.getBoundingClientRect();
    dragStartX = event.clientX - rect.left;
    dragStartY = event.clientY - rect.top;
}

/**
 * 处理操作来源鼠标移动事件
 */
function handleOperationSourceMouseMove(event) {
    if (!isCurrentUserOperationSource() || !isDragging) return;
    
    const videoContainer = document.getElementById('videoContainer');
    if (!videoContainer) return;

    const rect = videoContainer.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    sendOpSourceOperation({
        type: 'drag',
        x: x,
        y: y,
        deltaX: x - dragStartX,
        deltaY: y - dragStartY,
        timestamp: Date.now(),
    });
}

/**
 * 处理操作来源鼠标释放事件
 */
function handleOperationSourceMouseUp(event) {
    if (!isCurrentUserOperationSource()) return;
    
    isDragging = false;
}

/**
 * 处理操作来源滚轮事件
 */
function handleOperationSourceWheel(event) {
    if (!isCurrentUserOperationSource()) return;
    
    sendOpSourceOperation({
        type: 'scroll',
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        timestamp: Date.now(),
    });
}

/**
 * 处理操作来源键盘按下事件
 */
function handleOperationSourceKeyDown(event) {
    if (!isCurrentUserOperationSource()) return;
    
    sendOpSourceOperation({
        type: 'keydown',
        key: event.key,
        timestamp: Date.now(),
    });
}

/**
 * 处理操作来源键盘释放事件
 */
function handleOperationSourceKeyUp(event) {
    if (!isCurrentUserOperationSource()) return;
    
    sendOpSourceOperation({
        type: 'keyup',
        key: event.key,
        timestamp: Date.now(),
    });
}

/**
 * 发送操作来源操作消息
 */
function sendOpSourceOperation(operation) {
    // 获取 WebSocket 连接（复用 chat.js 的连接）
    if (typeof ws === 'undefined' || !ws || ws.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket 未连接，无法发送操作来源操作');
        return;
    }

    if (!window.currentUserId || !window.currentRoomId) {
        console.warn('用户未加入房间，无法发送操作来源操作');
        return;
    }

    const message = {
        type: 'OP_SOURCE_OPERATION',
        userId: window.currentUserId,
        operation: operation,
    };

    ws.send(JSON.stringify(message));
}

/**
 * 在房主端模拟操作（接收 OP_SOURCE_OPERATION 消息后调用）
 */
function simulateOperationInIframe(operation) {
    const iframe = document.getElementById('browserFrame');
    if (!iframe || !window.isHost) {
        return;
    }

    try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (!iframeDoc) {
            // 跨域情况，无法直接操作
            console.warn('无法访问 iframe 内容（跨域限制）');
            return;
        }

        switch (operation.type) {
            case 'click':
                {
                    const element = iframeDoc.elementFromPoint(operation.x, operation.y);
                    if (element) {
                        const event = new MouseEvent('click', {
                            bubbles: true,
                            cancelable: true,
                            clientX: operation.x,
                            clientY: operation.y,
                            button: operation.button || 0,
                        });
                        element.dispatchEvent(event);
                    }
                }
                break;

            case 'drag':
                {
                    const element = iframeDoc.elementFromPoint(operation.x, operation.y);
                    if (element) {
                        const mouseDownEvent = new MouseEvent('mousedown', {
                            bubbles: true,
                            cancelable: true,
                            clientX: operation.x - operation.deltaX,
                            clientY: operation.y - operation.deltaY,
                            button: 0,
                        });
                        element.dispatchEvent(mouseDownEvent);

                        const mouseMoveEvent = new MouseEvent('mousemove', {
                            bubbles: true,
                            cancelable: true,
                            clientX: operation.x,
                            clientY: operation.y,
                        });
                        element.dispatchEvent(mouseMoveEvent);

                        const mouseUpEvent = new MouseEvent('mouseup', {
                            bubbles: true,
                            cancelable: true,
                            clientX: operation.x,
                            clientY: operation.y,
                            button: 0,
                        });
                        element.dispatchEvent(mouseUpEvent);
                    }
                }
                break;

            case 'scroll':
                {
                    iframe.contentWindow.scrollBy(operation.deltaX || 0, operation.deltaY || 0);
                }
                break;

            case 'keydown':
            case 'keyup':
                {
                    const activeElement = iframeDoc.activeElement || iframeDoc.body;
                    const event = new KeyboardEvent(operation.type, {
                        bubbles: true,
                        cancelable: true,
                        key: operation.key,
                        code: operation.key,
                    });
                    activeElement.dispatchEvent(event);
                }
                break;
        }
    } catch (error) {
        console.error('模拟操作失败:', error);
    }
}

// 导出函数供测试使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        setOperationSource,
        clearOperationSource,
        getCurrentOperationSourceUserId,
        isCurrentUserOperationSource,
        handleOperationSourceChanged,
        initOperationSourceListener,
        removeOperationSourceListener,
        simulateOperationInIframe,
        sendOpSourceOperation,
    };
}
