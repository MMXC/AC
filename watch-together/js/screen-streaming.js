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
    frameRate: 5, // 低帧率版本，每秒5帧（旧的基于图片的传输仍然保留，作为降级方案）
    quality: 0.7, // 图片质量（0-1）
};

// WebRTC 状态（房主与单个成员之间的一条媒体通路）
let webrtcState = {
    peerConnection: null,
    localStream: null,
    remoteStream: null,
    targetUserId: null,
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
    const { userId } = event.detail || {};
    
    // 使用全局 window.isHost 作为真实的房主标识
    const isHost = typeof window !== 'undefined' ? !!window.isHost : false;

    if (isHost) {
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
    
    // 注意：WebSocket 连接是可选的，用于向其他成员发送画面数据
    // 本地预览功能不需要 WebSocket
    
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
        
        // 创建 video 元素用于捕获画面（旧的基于 Canvas 的传输仍然保留，作为降级方案）
        const videoElement = document.createElement('video');
        videoElement.srcObject = stream;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        
        // 显示 video 容器和 video 元素，隐藏占位符
        if (videoContainer) {
            videoContainer.style.display = 'flex';
        }
        if (videoElement) {
            videoElement.style.display = 'block';
        }
        if (videoPlaceholder) {
            videoPlaceholder.style.display = 'none';
        }
        
        // 等待视频加载
        await new Promise((resolve, reject) => {
            videoElement.onloadedmetadata = () => {
                resolve();
            };
            videoElement.onerror = (error) => {
                reject(error);
            };
            // 设置超时，避免无限等待
            setTimeout(() => {
                if (videoElement.readyState === 0) {
                    reject(new Error('视频加载超时'));
                } else {
                    resolve();
                }
            }, 5000);
        });
        
        // 发送开始共享消息（旧协议，作为降级兼容）
        sendScreenStreamStart();
        
        // 优先尝试通过 WebRTC 将 MediaStream 发送给单个成员
        try {
            await startWebRTCPeerConnectionAsHost(stream);
        } catch (webrtcError) {
            console.error('启动 WebRTC 连接失败，回退到旧的图片流方案:', webrtcError);
        }

        // 无论 WebRTC 是否成功，仍然启动旧的帧捕获逻辑作为兜底，
        // 以保证已有的画面流测试和功能不受影响
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
    
    // 获取 video 元素并清理预览
    const videoElement = document.getElementById('videoStream');
    const videoPlaceholder = document.getElementById('videoPlaceholder');
    
    // 停止媒体流轨道
    if (screenStreamState.mediaStream) {
        screenStreamState.mediaStream.getTracks().forEach(track => {
            track.stop();
        });
        screenStreamState.mediaStream = null;
    }
    
    // 清理 video 元素的 srcObject
    if (videoElement) {
        videoElement.srcObject = null;
        videoElement.style.display = 'none';
    }
    
    // 显示占位符
    if (videoPlaceholder) {
        videoPlaceholder.style.display = 'block';
        updateVideoPlaceholder('画面流已停止', '房主已停止共享画面');
    }
    
    screenStreamState.isStreaming = false;

    // 关闭 WebRTC 连接并通知对端
    stopWebRTCPeerConnection(true);
    
    // 发送停止共享消息（旧协议，作为降级兼容）
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
 * 创建 RTCPeerConnection（统一的 STUN 配置）
 */
function createPeerConnection() {
    const config = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
        ],
    };
    return new RTCPeerConnection(config);
}

/**
 * 房主端：启动 WebRTC PeerConnection，并向单个成员发送 Offer
 */
async function startWebRTCPeerConnectionAsHost(stream) {
    if (typeof window === 'undefined') return;
    if (!screenStreamState.ws || screenStreamState.ws.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket 未连接，无法发送 WebRTC 信令');
    }
    if (!window.currentRoomId || !window.currentUserId) {
        throw new Error('当前房间或用户信息缺失，无法建立 WebRTC 连接');
    }

    // 选择一个目标成员（当前场景假设只有一个成员）
    let targetUserId = null;
    if (typeof getMembersList === 'function') {
        const members = getMembersList() || [];
        const candidates = members.filter(m => m.id !== window.currentUserId);
        if (candidates.length > 0) {
            targetUserId = candidates[0].id;
        }
    }

    if (!targetUserId) {
        throw new Error('当前房间中没有可以建立 WebRTC 连接的成员');
    }

    const pc = createPeerConnection();
    webrtcState.peerConnection = pc;
    webrtcState.localStream = stream;
    webrtcState.targetUserId = targetUserId;

    // 将屏幕流中的 track 添加到 PeerConnection 中
    stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
    });

    // ICE 候选收集并通过 WebSocket 发送给目标成员
    pc.onicecandidate = (event) => {
        if (!screenStreamState.ws || screenStreamState.ws.readyState !== WebSocket.OPEN) {
            return;
        }
        const candidate = event.candidate ? event.candidate.toJSON() : null;
        try {
            const iceMessage = createICECandidateMessage({
                roomId: window.currentRoomId,
                fromUserId: window.currentUserId,
                toUserId: targetUserId,
                candidate,
            });
            screenStreamState.ws.send(JSON.stringify(iceMessage));
        } catch (error) {
            console.error('发送 WebRTC ICE 候选失败:', error);
        }
    };

    pc.onconnectionstatechange = () => {
        console.log('WebRTC 连接状态（房主端）:', pc.connectionState);
    };

    // 创建并发送 Offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const tracks = {};
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack && videoTrack.id) {
        tracks.videoTrackId = videoTrack.id;
    }

    const offerMessage = createOfferMessage({
        roomId: window.currentRoomId,
        fromUserId: window.currentUserId,
        toUserId: targetUserId,
        sdp: offer.sdp,
        tracks,
    });

    screenStreamState.ws.send(JSON.stringify(offerMessage));
    console.log('已发送 WebRTC Offer 给成员:', targetUserId);
}

/**
 * 关闭当前 WebRTC 连接
 * @param {boolean} notifyPeer 是否通过 WEBRTC_END 通知对端
 */
function stopWebRTCPeerConnection(notifyPeer) {
    if (typeof window === 'undefined') return;

    const pc = webrtcState.peerConnection;
    if (pc) {
        try {
            pc.close();
        } catch (e) {
            console.error('关闭 WebRTC 连接时出错:', e);
        }
    }

    if (webrtcState.remoteStream) {
        try {
            webrtcState.remoteStream.getTracks().forEach(track => track.stop());
        } catch (e) {
            console.error('停止远端流轨道时出错:', e);
        }
        if (typeof window !== 'undefined' && window.VideoPlayer && typeof window.VideoPlayer.detachStream === 'function') {
            window.VideoPlayer.detachStream();
        }
    }

    webrtcState.peerConnection = null;
    webrtcState.localStream = null;
    webrtcState.remoteStream = null;

    if (notifyPeer && typeof createEndMessage === 'function' && screenStreamState.ws && screenStreamState.ws.readyState === WebSocket.OPEN) {
        try {
            const endMessage = createEndMessage({
                roomId: window.currentRoomId,
                fromUserId: window.currentUserId,
                toUserId: webrtcState.targetUserId || null,
                reason: 'host-stopped-sharing',
            });
            screenStreamState.ws.send(JSON.stringify(endMessage));
        } catch (e) {
            console.error('发送 WebRTC 结束消息失败:', e);
        }
    }

    webrtcState.targetUserId = null;
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
        button.textContent = '开始共享';
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
            button.textContent = '开始共享';
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

/**
 * WebRTC 信令处理（由 chat.js 转发到这里）
 */
async function handleWebRTCOffer(message) {
    if (typeof window === 'undefined') return;
    if (!window.currentUserId || !window.currentRoomId) return;

    // 只处理发给当前成员的 Offer，且当前成员不是房主
    if (message.toUserId !== window.currentUserId) return;
    if (window.isHost) return;
    if (message.roomId !== window.currentRoomId) return;

    if (!screenStreamState.ws || screenStreamState.ws.readyState !== WebSocket.OPEN) {
        console.warn('收到 WebRTC Offer 时 WebSocket 未连接');
        return;
    }

    const pc = createPeerConnection();
    webrtcState.peerConnection = pc;
    webrtcState.targetUserId = message.fromUserId;

    const videoElement = document.getElementById('videoStream');
    const canvasElement = document.getElementById('canvasStream');
    const placeholder = document.getElementById('videoPlaceholder');

    // 隐藏占位符和canvas，准备显示video
    if (canvasElement) {
        canvasElement.style.display = 'none';
    }
    if (placeholder) {
        placeholder.style.display = 'none';
    }
    if (typeof showVideoContainer === 'function') {
        showVideoContainer();
    }

    pc.ontrack = (event) => {
        console.log('成员端收到 WebRTC 远端 track');
        // WebRTC 会自动将接收到的 tracks 添加到 event.streams[0]
        const remoteStream = event.streams[0];
        webrtcState.remoteStream = remoteStream;

        // 优先使用 VideoPlayer 组件接收远端流并播放（满足成功标准 #4）
        if (typeof window !== 'undefined' && window.VideoPlayer && typeof window.VideoPlayer.attachStream === 'function') {
            window.VideoPlayer.attachStream(remoteStream);
        } else if (videoElement) {
            videoElement.srcObject = remoteStream;
            videoElement.style.display = 'block';
            videoElement.play().catch(err => {
                console.error('播放视频失败:', err);
            });
        }
    };

    pc.onicecandidate = (event) => {
        if (!screenStreamState.ws || screenStreamState.ws.readyState !== WebSocket.OPEN) {
            return;
        }
        const candidate = event.candidate ? event.candidate.toJSON() : null;
        try {
            const iceMessage = createICECandidateMessage({
                roomId: window.currentRoomId,
                fromUserId: window.currentUserId,
                toUserId: message.fromUserId,
                candidate,
            });
            screenStreamState.ws.send(JSON.stringify(iceMessage));
        } catch (error) {
            console.error('成员端发送 WebRTC ICE 候选失败:', error);
        }
    };

    pc.onconnectionstatechange = () => {
        console.log('WebRTC 连接状态（成员端）:', pc.connectionState);
    };

    await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'offer',
        sdp: message.sdp,
    }));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    const answerMessage = createAnswerMessage({
        roomId: window.currentRoomId,
        fromUserId: window.currentUserId,
        toUserId: message.fromUserId,
        sdp: answer.sdp,
    });

    screenStreamState.ws.send(JSON.stringify(answerMessage));
    console.log('成员端已发送 WebRTC Answer 给房主:', message.fromUserId);
}

async function handleWebRTCAnswer(message) {
    if (typeof window === 'undefined') return;
    if (!window.currentUserId || !window.currentRoomId) return;
    if (!window.isHost) return; // 只有房主应当收到 Answer

    if (message.toUserId !== window.currentUserId) return;
    if (message.roomId !== window.currentRoomId) return;

    const pc = webrtcState.peerConnection;
    if (!pc) {
        console.warn('收到 WebRTC Answer 时本地没有 PeerConnection');
        return;
    }

    await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'answer',
        sdp: message.sdp,
    }));
    console.log('房主端已应用 WebRTC Answer');
}

async function handleWebRTCIceCandidate(message) {
    if (typeof window === 'undefined') return;
    if (!window.currentUserId || !window.currentRoomId) return;

    // 只处理发给当前用户的 ICE
    if (message.toUserId !== window.currentUserId) return;
    if (message.roomId !== window.currentRoomId) return;

    const pc = webrtcState.peerConnection;
    if (!pc) {
        console.warn('收到 WebRTC ICE 候选时本地没有 PeerConnection');
        return;
    }

    // 自己发出的 ICE 可能通过广播又收到一次，这里直接忽略
    if (message.fromUserId === window.currentUserId) {
        return;
    }

    try {
        if (!message.candidate) {
            await pc.addIceCandidate(null);
        } else {
            const candidate = new RTCIceCandidate(message.candidate);
            await pc.addIceCandidate(candidate);
        }
    } catch (e) {
        console.error('应用 WebRTC ICE 候选时出错:', e);
    }
}

function handleWebRTCEnd(message) {
    if (typeof window === 'undefined') return;
    if (!window.currentUserId || !window.currentRoomId) return;

    if (message.roomId !== window.currentRoomId) return;

    // 只有在当前连接相关时才处理结束
    if (
        message.toUserId === null || // 广播
        message.toUserId === window.currentUserId ||
        message.fromUserId === window.currentUserId
    ) {
        console.log('收到 WebRTC 结束消息，关闭本地连接');
        stopWebRTCPeerConnection(false);
    }
}

function handleWebRTCError(message) {
    console.error('收到 WebRTC 错误消息:', message);
}

// 将 WebRTC 信令处理函数暴露到全局，供 chat.js 调用
if (typeof window !== 'undefined') {
    window.handleWebRTCSignalingMessage = function (message) {
        if (!message || !message.type) return;

        switch (message.type) {
            case 'WEBRTC_OFFER':
                handleWebRTCOffer(message);
                break;
            case 'WEBRTC_ANSWER':
                handleWebRTCAnswer(message);
                break;
            case 'WEBRTC_ICE_CANDIDATE':
                handleWebRTCIceCandidate(message);
                break;
            case 'WEBRTC_END':
                handleWebRTCEnd(message);
                break;
            case 'WEBRTC_ERROR':
                handleWebRTCError(message);
                break;
            default:
                break;
        }
    };
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
