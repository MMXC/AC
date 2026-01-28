/**
 * 画面流/屏幕投影功能
 * 房主端：使用 getDisplayMedia 捕获屏幕，通过 WebSocket 发送画面数据
 * 普通成员端：接收画面数据并在 video/canvas 中播放
 */

// 画面流状态
let screenStreamState = {
    isStreaming: false,
    mediaStream: null,
    captureInterval: null,
    ws: null,
    canvas: null,
    ctx: null,
    frameRate: 5, // 低帧率版本，每秒5帧
    quality: 0.7, // 图片质量（0-1）
};

/**
 * 初始化画面流功能
 */
function initScreenStreaming() {
    // 获取 DOM 元素
    const videoElement = document.getElementById('videoStream');
    const canvasElement = document.getElementById('canvasStream');
    
    if (!canvasElement) {
        console.error('未找到 canvasStream 元素');
        return;
    }
    
    // 初始化 canvas
    screenStreamState.canvas = canvasElement;
    screenStreamState.ctx = canvasElement.getContext('2d');
    
    // 设置 canvas 尺寸（根据容器大小）
    updateCanvasSize();
    
    // 监听窗口大小变化
    window.addEventListener('resize', updateCanvasSize);
    
    // 监听用户加入房间事件
    if (typeof window !== 'undefined') {
        window.addEventListener('userJoinedRoom', handleUserJoinedRoom);
    }
    
    // 监听 WebSocket 连接事件（从 chat.js）
    if (typeof window !== 'undefined') {
        window.addEventListener('websocketConnected', handleWebSocketConnected);
        window.addEventListener('websocketDisconnected', handleWebSocketDisconnected);
    }
}

/**
 * 更新 canvas 尺寸
 */
function updateCanvasSize() {
    if (!screenStreamState.canvas) return;
    
    const container = document.getElementById('videoContainer');
    if (container) {
        const rect = container.getBoundingClientRect();
        screenStreamState.canvas.width = rect.width;
        screenStreamState.canvas.height = rect.height;
    }
}

/**
 * 处理用户加入房间事件
 */
function handleUserJoinedRoom(event) {
    const { userId, isHost } = event.detail || {};
    // 事件中优先使用 detail.isHost，其次回退到全局 window.isHost
    const effectiveIsHost = typeof isHost === 'boolean'
        ? isHost
        : (typeof window !== 'undefined' && window.isHost === true);

    if (effectiveIsHost) {
        // 房主端：显示开始共享按钮
        showStartSharingButton();
    } else {
        // 普通成员端：隐藏开始共享按钮，等待接收画面
        hideStartSharingButton();
        updateVideoPlaceholder('等待画面流', '房主开始共享后，画面将在这里显示');
    }
}

/**
 * 处理 WebSocket 连接事件
 */
function handleWebSocketConnected(event) {
    const ws = event.detail?.ws;
    if (ws) {
        screenStreamState.ws = ws;
        
        // 监听 WebSocket 消息
        ws.addEventListener('message', handleWebSocketMessage);
        
        // 初始化 WebRTC 管理器（如果存在）
        if (typeof initWebRTCManager === 'function') {
            try {
                initWebRTCManager(ws);
            } catch (error) {
                console.warn('初始化 WebRTC 管理器失败:', error);
            }
        }
    }
}

/**
 * 处理 WebSocket 断开事件
 */
function handleWebSocketDisconnected(event) {
    const wasStreaming = screenStreamState.isStreaming;
    screenStreamState.ws = null;
    
    // 如果正在共享，停止共享并显示错误提示
    if (wasStreaming) {
        stopScreenSharing();
        
        // 显示连接中断错误提示
        showScreenSharingError(
            '连接中断',
            'WebSocket 信令连接已断开，屏幕共享已停止。请检查网络连接后刷新页面重试。',
            true // 可恢复，用户可以通过刷新页面重试
        );
        
        // 更新占位符提示
        updateVideoPlaceholder('连接中断', 'WebSocket 连接已断开，请刷新页面重试');
    }
    
    // 通知成员端连接中断
    if (!window.isHost) {
        updateVideoPlaceholder('连接中断', '信令连接已断开，请刷新页面重试');
    }
}

/**
 * 处理 WebSocket 消息
 */
function handleWebSocketMessage(event) {
    try {
        // 检查 event.data 类型：如果已经是对象则直接使用，如果是字符串则解析
        let message;
        if (typeof event.data === 'string') {
            message = JSON.parse(event.data);
        } else if (typeof event.data === 'object' && event.data !== null) {
            message = event.data;
        } else {
            console.error('无效的 WebSocket 消息格式:', typeof event.data);
            return;
        }
        
        if (message.type === 'SCREEN_STREAM_FRAME') {
            // 接收画面帧数据
            handleScreenFrame(message.data);
        } else if (message.type === 'SCREEN_STREAM_START') {
            // 画面流开始
            handleScreenStreamStart(message.data);
        } else if (message.type === 'SCREEN_STREAM_STOP') {
            // 画面流停止
            handleScreenStreamStop(message.data);
        } else if (message.type === 'SCREEN_STREAM_ERROR') {
            // 画面流错误
            handleScreenStreamError(message.data);
        }
    } catch (error) {
        console.error('处理 WebSocket 消息错误:', error);
    }
}

/**
 * 处理画面帧数据（成员端）
 */
function handleScreenFrame(data) {
    if (!data || !data.imageData) return;
    
    const videoElement = document.getElementById('videoStream');
    const canvasElement = document.getElementById('canvasStream');
    const placeholder = document.getElementById('videoPlaceholder');
    
    if (!canvasElement || !screenStreamState.ctx) return;
    
    // 创建图片对象
    const img = new Image();
    img.onload = () => {
        // 绘制到 canvas
        screenStreamState.ctx.clearRect(0, 0, screenStreamState.canvas.width, screenStreamState.canvas.height);
        screenStreamState.ctx.drawImage(img, 0, 0, screenStreamState.canvas.width, screenStreamState.canvas.height);
        
        // 隐藏占位符，显示 canvas
        if (placeholder) placeholder.style.display = 'none';
        if (canvasElement) canvasElement.style.display = 'block';
        if (videoElement) videoElement.style.display = 'none';
    };
    img.onerror = (error) => {
        console.error('加载画面帧错误:', error);
    };
    
    // 加载 base64 图片数据
    img.src = data.imageData;
}

/**
 * 处理画面流开始（成员端）
 */
function handleScreenStreamStart(data) {
    console.log('画面流开始:', data);
    updateVideoPlaceholder('正在接收画面流...', '');
    
    // 显示画面容器
    showVideoContainer();
}

/**
 * 处理画面流停止（成员端）
 */
function handleScreenStreamStop(data) {
    console.log('画面流停止:', data);
    
    // 隐藏 canvas，显示占位符
    const canvasElement = document.getElementById('canvasStream');
    const placeholder = document.getElementById('videoPlaceholder');
    
    if (canvasElement) canvasElement.style.display = 'none';
    if (placeholder) {
        placeholder.style.display = 'block';
        updateVideoPlaceholder('画面流已停止', '房主已停止共享画面');
    }
}

/**
 * 处理画面流错误（成员端）
 */
function handleScreenStreamError(data) {
    console.error('画面流错误:', data);
    
    const errorMessage = data?.message || '画面流出现错误';
    updateVideoPlaceholder('画面流错误', errorMessage);
}

/**
 * 开始屏幕共享（房主端）
 */
async function startScreenSharing() {
    // 检查是否是房主
    if (!window.isHost) {
        alert('只有房主可以开始屏幕共享');
        return;
    }
    
    // 检查是否已经在共享
    if (screenStreamState.isStreaming) {
        console.log('已经在共享画面');
        return;
    }
    
    // 检查 WebSocket 连接
    if (!screenStreamState.ws || screenStreamState.ws.readyState !== WebSocket.OPEN) {
        alert('WebSocket 未连接，请稍后重试');
        return;
    }
    
    try {
        // 请求屏幕共享权限
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                mediaSource: 'screen',
                width: { ideal: 1920 },
                height: { ideal: 1080 },
            },
            audio: false,
        });
        
        screenStreamState.mediaStream = stream;
        screenStreamState.isStreaming = true;
        
        // 监听流结束事件（用户点击停止共享）
        stream.getVideoTracks()[0].addEventListener('ended', () => {
            stopScreenSharing();
        });
        
        // 创建 video 元素用于捕获画面
        const videoElement = document.createElement('video');
        videoElement.srcObject = stream;
        videoElement.play();
        
        // 等待视频加载
        await new Promise((resolve) => {
            videoElement.onloadedmetadata = () => {
                resolve();
            };
        });
        
        // 发送开始共享消息
        sendScreenStreamStart();
        
        // 开始捕获画面
        startFrameCapture(videoElement);
        
        // 更新 UI
        updateStartSharingButton(true);
        console.log('屏幕共享已开始');
        
    } catch (error) {
        console.error('开始屏幕共享错误:', error);
        
        // 处理错误 - 使用友好的UI提示而非alert
        let errorTitle = '屏幕共享失败';
        let errorMessage = '';
        let isRecoverable = false;
        
        if (error.name === 'NotAllowedError') {
            errorTitle = '权限被拒绝';
            errorMessage = '屏幕共享权限被拒绝。请点击浏览器地址栏的锁图标，允许屏幕共享权限后重试。';
            isRecoverable = true;
        } else if (error.name === 'NotFoundError') {
            errorTitle = '未找到屏幕源';
            errorMessage = '未找到可用的屏幕或窗口。请确保您的设备支持屏幕共享功能。';
            isRecoverable = false;
        } else if (error.name === 'NotSupportedError') {
            errorTitle = '浏览器不支持';
            errorMessage = '您的浏览器不支持屏幕共享功能。请使用 Chrome、Firefox 或 Edge 浏览器。';
            isRecoverable = false;
        } else if (error.name === 'AbortError') {
            errorTitle = '操作已取消';
            errorMessage = '屏幕共享选择已取消。';
            isRecoverable = true;
        } else {
            errorTitle = '屏幕共享失败';
            errorMessage = error.message || '未知错误，请稍后重试。';
            isRecoverable = true;
        }
        
        // 显示友好的错误提示
        showScreenSharingError(errorTitle, errorMessage, isRecoverable);
        
        // 发送错误消息
        sendScreenStreamError({
            message: errorMessage,
            code: error.name || 'UNKNOWN_ERROR',
        });
    }
}

/**
 * 停止屏幕共享（房主端）
 */
function stopScreenSharing() {
    if (!screenStreamState.isStreaming) {
        return;
    }
    
    // 停止捕获
    if (screenStreamState.captureInterval) {
        clearInterval(screenStreamState.captureInterval);
        screenStreamState.captureInterval = null;
    }
    
    // 停止媒体流
    if (screenStreamState.mediaStream) {
        screenStreamState.mediaStream.getTracks().forEach(track => track.stop());
        screenStreamState.mediaStream = null;
    }
    
    screenStreamState.isStreaming = false;
    
    // 发送停止共享消息
    sendScreenStreamStop();
    
    // 更新 UI
    updateStartSharingButton(false);
    
    console.log('屏幕共享已停止');
}

/**
 * 开始捕获画面帧
 */
function startFrameCapture(videoElement) {
    if (!screenStreamState.canvas || !screenStreamState.ctx) {
        console.error('Canvas 未初始化');
        return;
    }
    
    // 设置 canvas 尺寸匹配视频
    screenStreamState.canvas.width = videoElement.videoWidth || 1920;
    screenStreamState.canvas.height = videoElement.videoHeight || 1080;
    
    // 定期捕获画面
    const interval = 1000 / screenStreamState.frameRate; // 根据帧率计算间隔
    
    screenStreamState.captureInterval = setInterval(() => {
        try {
            // 绘制视频帧到 canvas
            screenStreamState.ctx.drawImage(
                videoElement,
                0,
                0,
                screenStreamState.canvas.width,
                screenStreamState.canvas.height
            );
            
            // 转换为 base64 图片
            const imageData = screenStreamState.canvas.toDataURL('image/jpeg', screenStreamState.quality);
            
            // 发送画面帧
            sendScreenFrame(imageData);
            
        } catch (error) {
            console.error('捕获画面帧错误:', error);
        }
    }, interval);
}

/**
 * 发送画面帧数据
 */
function sendScreenFrame(imageData) {
    if (!screenStreamState.ws || screenStreamState.ws.readyState !== WebSocket.OPEN) {
        return;
    }
    
    try {
        const message = {
            type: 'SCREEN_STREAM_FRAME',
            data: {
                imageData: imageData,
                timestamp: Date.now(),
            },
        };
        
        screenStreamState.ws.send(JSON.stringify(message));
    } catch (error) {
        console.error('发送画面帧错误:', error);
    }
}

/**
 * 发送开始共享消息
 */
function sendScreenStreamStart() {
    if (!screenStreamState.ws || screenStreamState.ws.readyState !== WebSocket.OPEN) {
        return;
    }
    
    try {
        const message = {
            type: 'SCREEN_STREAM_START',
            data: {
                timestamp: Date.now(),
            },
        };
        
        screenStreamState.ws.send(JSON.stringify(message));
    } catch (error) {
        console.error('发送开始共享消息错误:', error);
    }
}

/**
 * 发送停止共享消息
 */
function sendScreenStreamStop() {
    if (!screenStreamState.ws || screenStreamState.ws.readyState !== WebSocket.OPEN) {
        return;
    }
    
    try {
        const message = {
            type: 'SCREEN_STREAM_STOP',
            data: {
                timestamp: Date.now(),
            },
        };
        
        screenStreamState.ws.send(JSON.stringify(message));
    } catch (error) {
        console.error('发送停止共享消息错误:', error);
    }
}

/**
 * 发送错误消息
 */
function sendScreenStreamError(errorData) {
    if (!screenStreamState.ws || screenStreamState.ws.readyState !== WebSocket.OPEN) {
        return;
    }
    
    try {
        const message = {
            type: 'SCREEN_STREAM_ERROR',
            data: {
                ...errorData,
                timestamp: Date.now(),
            },
        };
        
        screenStreamState.ws.send(JSON.stringify(message));
    } catch (error) {
        console.error('发送错误消息错误:', error);
    }
}

/**
 * 显示开始共享按钮
 */
function showStartSharingButton() {
    let button = document.getElementById('startSharingButton');
    
    if (!button) {
        // 创建按钮
        button = document.createElement('button');
        button.id = 'startSharingButton';
        button.className = 'start-sharing-button';
        button.textContent = '开始共享画面';
        button.addEventListener('click', () => {
            if (screenStreamState.isStreaming) {
                stopScreenSharing();
            } else {
                startScreenSharing();
            }
        });
        
        // 添加到 header
        const header = document.querySelector('.header');
        if (header) {
            header.appendChild(button);
        }
    }
    
    button.style.display = 'block';
}

/**
 * 隐藏开始共享按钮
 */
function hideStartSharingButton() {
    const button = document.getElementById('startSharingButton');
    if (button) {
        button.style.display = 'none';
    }
}

/**
 * 更新开始共享按钮状态
 */
function updateStartSharingButton(isStreaming) {
    const button = document.getElementById('startSharingButton');
    if (button) {
        if (isStreaming) {
            button.textContent = '停止共享';
            button.classList.add('streaming');
        } else {
            button.textContent = '开始共享画面';
            button.classList.remove('streaming');
        }
    }
}

/**
 * 显示屏幕共享错误提示（友好的UI提示）
 */
function showScreenSharingError(title, message, isRecoverable = false) {
    // 创建或获取错误通知容器
    let errorNotification = document.getElementById('screenSharingErrorNotification');
    
    if (!errorNotification) {
        errorNotification = document.createElement('div');
        errorNotification.id = 'screenSharingErrorNotification';
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
        
        // 添加动画样式
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
                    <button id="retryScreenSharingBtn" style="
                        padding: 8px 16px;
                        background: #4a9eff;
                        border: none;
                        border-radius: 6px;
                        color: #fff;
                        font-size: 0.9em;
                        font-weight: 600;
                        cursor: pointer;
                        transition: background 0.2s;
                    ">重试</button>
                ` : ''}
            </div>
            <button id="closeErrorNotificationBtn" style="
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
    const closeBtn = errorNotification.querySelector('#closeErrorNotificationBtn');
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
    
    // 绑定重试按钮
    if (isRecoverable) {
        const retryBtn = errorNotification.querySelector('#retryScreenSharingBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                errorNotification.style.display = 'none';
                startScreenSharing();
            });
            retryBtn.addEventListener('mouseenter', () => {
                retryBtn.style.background = '#3a8eef';
            });
            retryBtn.addEventListener('mouseleave', () => {
                retryBtn.style.background = '#4a9eff';
            });
        }
    }
    
    // 自动关闭（5秒后）
    setTimeout(() => {
        if (errorNotification.style.display !== 'none') {
            errorNotification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                errorNotification.style.display = 'none';
            }, 300);
        }
    }, 5000);
}

// 页面加载完成后初始化
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScreenStreaming);
    } else {
        initScreenStreaming();
    }
}

// 导出函数供测试使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initScreenStreaming,
        startScreenSharing,
        stopScreenSharing,
        handleScreenFrame,
        handleScreenStreamStart,
        handleScreenStreamStop,
        handleScreenStreamError,
        screenStreamState,
    };
}
