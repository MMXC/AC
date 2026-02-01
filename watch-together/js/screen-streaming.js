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

// ICE 协商超时（毫秒），超时后提示用户检查网络
const ICE_NEGOTIATION_TIMEOUT_MS = 20000;
// 可恢复错误自动重试次数（如为某成员建立连接）
const WEBRTC_RETRY_PER_MEMBER_MAX = 2;

// WebRTC 状态
// 房主端：peerConnections 为 Map<userId, RTCPeerConnection>，localStream 为当前共享流
// 成员端：保留单个 peerConnection / remoteStream / targetUserId
let webrtcState = {
    /** 房主端：每个成员一个 PC，key 为成员 userId */
    peerConnections: new Map(),
    /** 房主端：当前共享的本地流（同一流添加到所有 PC） */
    localStream: null,
    /** 成员端：与房主的单条连接 */
    peerConnection: null,
    remoteStream: null,
    targetUserId: null,
    /** 房主端：在 setRemoteDescription 之前收到的 ICE 候选队列，key 为成员 userId */
    pendingIceCandidatesByMember: new Map(),
    /** 成员端：在 setRemoteDescription 之前收到的房主 ICE 候选队列 */
    pendingIceCandidates: [],
    /** 房主端：每个成员的 ICE 协商超时定时器，key 为成员 userId */
    iceTimeoutByMember: new Map(),
    /** 房主端：每个成员已重试次数，key 为成员 userId */
    retryCountByMember: new Map(),
    /** 成员端：ICE 协商超时定时器 */
    iceTimeoutHandle: null,
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
        window.addEventListener('memberJoinedRoom', handleMemberJoinedRoom);
        window.addEventListener('memberLeftRoom', handleMemberLeftRoom);
        window.addEventListener('videoPlayerStreamEnded', handleVideoPlayerStreamEnded);
    }
    
    // 监听 WebSocket 连接事件（从 chat.js）
    if (typeof window !== 'undefined') {
        window.addEventListener('websocketConnected', handleWebSocketConnected);
        window.addEventListener('websocketDisconnected', handleWebSocketDisconnected);
    }
}

/**
 * 成员端：显示「正在播放房主画面」状态标签
 */
function showMemberViewingStatusLabel() {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('videoStatusLabel');
    if (el) {
        el.textContent = '正在播放房主画面';
        el.style.display = 'block';
    }
}

/**
 * 成员端：隐藏观看状态标签
 */
function hideMemberViewingStatusLabel() {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('videoStatusLabel');
    if (el) el.style.display = 'none';
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
 * 成员端：VideoPlayer 因远端流结束而 detach 时，统一显示「房主已停止共享」
 */
function handleVideoPlayerStreamEnded() {
    if (typeof window !== 'undefined' && window.isHost) return;
    hideMemberViewingStatusLabel();
    updateVideoPlaceholder('房主已停止共享', '');
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
        // 普通成员端：隐藏开始共享按钮，显示等待房主开始共享
        hideStartSharingButton();
        updateVideoPlaceholder('等待房主开始共享...', '');
        hideMemberViewingStatusLabel();
    }
}

/**
 * 处理 WebSocket 连接事件
 * 信令重连后，房主若正在共享则自动重新向所有成员建立 WebRTC 连接（有限重连）。
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

        // 房主且正在共享：信令重连后自动重新建立 WebRTC 连接（可恢复错误有限重连）
        if (typeof window !== 'undefined' && window.isHost && screenStreamState.isStreaming && screenStreamState.mediaStream) {
            const stream = screenStreamState.mediaStream;
            stopWebRTCPeerConnection(false);
            startWebRTCPeerConnectionAsHost(stream).catch((err) => {
                console.error('WebSocket 重连后恢复 WebRTC 失败:', err);
                showScreenSharingError(
                    '恢复共享失败',
                    '信令已重连，但无法自动恢复画面共享。请点击「停止共享」后再次「开始共享」重试。',
                    true
                );
            });
        }
    }
}

/**
 * 处理 WebSocket 断开事件
 * 房主：停止共享并提示；成员：停止播放、关闭 WebRTC 并提示。
 */
function handleWebSocketDisconnected(event) {
    const wasStreaming = screenStreamState.isStreaming;
    screenStreamState.ws = null;

    // 成员端：信令中断时立即停止共享/播放并关闭 WebRTC 连接
    if (typeof window !== 'undefined' && !window.isHost) {
        if (webrtcState.iceTimeoutHandle) {
            clearTimeout(webrtcState.iceTimeoutHandle);
            webrtcState.iceTimeoutHandle = null;
        }
        stopWebRTCPeerConnection(false);
        hideMemberViewingStatusLabel();
        updateVideoPlaceholder('信令中断', 'WebSocket 信令连接已断开，已停止播放。请检查网络后刷新页面重试。');
    }

    // 房主：如果正在共享，停止共享并显示错误提示
    if (wasStreaming) {
        stopScreenSharing();
        showScreenSharingError(
            '信令中断',
            'WebSocket 信令连接已断开，屏幕共享已停止。请检查网络连接后刷新页面重试。',
            true
        );
        updateVideoPlaceholder('连接中断', 'WebSocket 连接已断开，请刷新页面重试');
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
    
    const videoContainer = document.getElementById('videoContainer');
    const videoPlaceholder = document.getElementById('videoPlaceholder');
    const videoStreamEl = document.getElementById('videoStream');
    const canvasElement = document.getElementById('canvasStream');

    if (!videoStreamEl) {
        console.error('未找到 videoStream 元素，无法显示本地预览');
        return;
    }

    try {
        // 请求屏幕/标签页共享权限（不限制 mediaSource，用户可在对话框中选择屏幕或标签页）
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
            },
            audio: false,
        });
        
        screenStreamState.mediaStream = stream;
        screenStreamState.isStreaming = true;
        
        // 监听流结束事件（用户点击系统停止共享）
        const videoTracks = stream.getVideoTracks();
        if (videoTracks.length > 0) {
            videoTracks[0].addEventListener('ended', () => {
                stopScreenSharing();
            });
        }
        
        // 使用页面上的 <video id="videoStream"> 作为本地预览，实时显示采集画面
        videoStreamEl.srcObject = stream;
        videoStreamEl.autoplay = true;
        videoStreamEl.playsInline = true;
        
        // 显示 video 容器和本地预览 video，隐藏占位符；房主端用 video 预览，隐藏 canvas
        if (videoContainer) {
            videoContainer.style.display = 'flex';
        }
        videoStreamEl.style.display = 'block';
        if (videoPlaceholder) {
            videoPlaceholder.style.display = 'none';
        }
        if (canvasElement) {
            canvasElement.style.display = 'none';
        }
        
        // 等待视频元数据加载
        await new Promise((resolve, reject) => {
            videoStreamEl.onloadedmetadata = () => {
                resolve();
            };
            videoStreamEl.onerror = (err) => {
                reject(err);
            };
            setTimeout(() => {
                if (videoStreamEl.readyState === 0) {
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

        // 无论 WebRTC 是否成功，仍然启动旧的帧捕获逻辑作为兜底（使用同一 video 元素）
        startFrameCapture(videoStreamEl);
        
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
            errorTitle = '您已拒绝屏幕共享权限';
            errorMessage = '权限被拒绝：您点击了「取消」或拒绝了屏幕共享。若要共享画面，请点击「开始共享」后在弹出的窗口中选择要共享的屏幕或窗口并允许权限。';
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
    
    // 获取 DOM 元素并清理预览
    const videoElement = document.getElementById('videoStream');
    const videoPlaceholder = document.getElementById('videoPlaceholder');
    const canvasElement = document.getElementById('canvasStream');
    
    // 停止媒体流轨道（必须关闭，否则无法再次 getDisplayMedia）
    if (screenStreamState.mediaStream) {
        screenStreamState.mediaStream.getTracks().forEach(track => {
            track.stop();
        });
        screenStreamState.mediaStream = null;
    }
    
    // 清理本地预览：清空 video 的 srcObject 并隐藏
    if (videoElement) {
        videoElement.srcObject = null;
        videoElement.style.display = 'none';
    }
    if (canvasElement) {
        canvasElement.style.display = 'none';
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
 * 房主端：清除某成员的 ICE 超时定时器
 */
function clearIceTimeoutForMember(targetUserId) {
    const tid = webrtcState.iceTimeoutByMember.get(targetUserId);
    if (tid) {
        clearTimeout(tid);
        webrtcState.iceTimeoutByMember.delete(targetUserId);
    }
}

/**
 * 房主端：为指定成员创建 PeerConnection 并发送 Offer（单条连接）
 * ICE 长时间未连接则超时退出；可恢复错误时在限制次数内自动重试。
 */
async function addPeerConnectionForMember(targetUserId, stream) {
    if (typeof window === 'undefined') return;
    if (!screenStreamState.ws || screenStreamState.ws.readyState !== WebSocket.OPEN) return;
    if (!window.currentRoomId || !window.currentUserId) return;
    if (webrtcState.peerConnections.has(targetUserId)) {
        clearIceTimeoutForMember(targetUserId);
        closePeerConnectionForMember(targetUserId);
    }

    const pc = createPeerConnection();
    webrtcState.peerConnections.set(targetUserId, pc);

    stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
    });

    pc.onicecandidate = (event) => {
        if (!screenStreamState.ws || screenStreamState.ws.readyState !== WebSocket.OPEN) return;
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
        console.log(`WebRTC 连接状态 [${targetUserId}]:`, pc.connectionState);
        if (pc.connectionState === 'connected') {
            clearIceTimeoutForMember(targetUserId);
            webrtcState.retryCountByMember.delete(targetUserId);
        }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const tracks = {};
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack && videoTrack.id) tracks.videoTrackId = videoTrack.id;

    const offerMessage = createOfferMessage({
        roomId: window.currentRoomId,
        fromUserId: window.currentUserId,
        toUserId: targetUserId,
        sdp: offer.sdp,
        tracks,
    });
    screenStreamState.ws.send(JSON.stringify(offerMessage));
    console.log('已发送 WebRTC Offer 给成员:', targetUserId);

    // ICE 协商超时：长时间未连接则关闭并提示，可恢复时有限次数内重试
    const timeoutId = setTimeout(() => {
        webrtcState.iceTimeoutByMember.delete(targetUserId);
        if (pc.connectionState === 'connected' || pc.connectionState === 'closed') return;
        const currentRetries = webrtcState.retryCountByMember.get(targetUserId) || 0;
        closePeerConnectionForMember(targetUserId);
        if (currentRetries < WEBRTC_RETRY_PER_MEMBER_MAX - 1) {
            webrtcState.retryCountByMember.set(targetUserId, currentRetries + 1);
            addPeerConnectionForMember(targetUserId, stream).catch(err => {
                console.error('重试为成员建立 WebRTC 连接失败:', targetUserId, err);
                webrtcState.retryCountByMember.delete(targetUserId);
            });
        } else {
            webrtcState.retryCountByMember.delete(targetUserId);
            showScreenSharingError(
                '部分成员连接超时',
                'ICE 协商超时，请检查网络。受影响成员可刷新页面后重试。',
                true
            );
        }
    }, ICE_NEGOTIATION_TIMEOUT_MS);
    webrtcState.iceTimeoutByMember.set(targetUserId, timeoutId);
}

/**
 * 房主端：关闭对指定成员的 PeerConnection 并释放资源
 */
function closePeerConnectionForMember(targetUserId) {
    clearIceTimeoutForMember(targetUserId);
    webrtcState.pendingIceCandidatesByMember.delete(targetUserId);
    webrtcState.retryCountByMember.delete(targetUserId);
    const pc = webrtcState.peerConnections.get(targetUserId);
    if (pc) {
        try {
            pc.close();
        } catch (e) {
            console.error('关闭 WebRTC 连接时出错:', e);
        }
        webrtcState.peerConnections.delete(targetUserId);
        console.log('已关闭对成员的 WebRTC 连接:', targetUserId);
    }
}

/**
 * 房主端：新成员加入房间时，若正在共享则为其建立一条 WebRTC 连接
 */
function handleMemberJoinedRoom(event) {
    const { userId } = event.detail || {};
    if (!userId || !window.isHost || !screenStreamState.isStreaming) return;
    if (userId === window.currentUserId) return;
    const stream = webrtcState.localStream || screenStreamState.mediaStream;
    if (!stream) return;
    addPeerConnectionForMember(userId, stream).catch(err => {
        console.error('为新成员建立 WebRTC 连接失败:', userId, err);
    });
}

/**
 * 房主端：成员离开房间时关闭对该成员的 PeerConnection
 */
function handleMemberLeftRoom(event) {
    const { userId } = event.detail || {};
    if (!userId || !window.isHost) return;
    closePeerConnectionForMember(userId);
}

/**
 * 房主端：启动 WebRTC，向当前所有成员各建立一条 PeerConnection 并发送 Offer
 */
async function startWebRTCPeerConnectionAsHost(stream) {
    if (typeof window === 'undefined') return;
    if (!screenStreamState.ws || screenStreamState.ws.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket 未连接，无法发送 WebRTC 信令');
    }
    if (!window.currentRoomId || !window.currentUserId) {
        throw new Error('当前房间或用户信息缺失，无法建立 WebRTC 连接');
    }

    webrtcState.localStream = stream;
    const members = typeof getMembersList === 'function' ? getMembersList() || [] : [];
    const candidates = members.filter(m => m.id !== window.currentUserId);

    for (const member of candidates) {
        try {
            await addPeerConnectionForMember(member.id, stream);
        } catch (err) {
            console.error('为成员建立 WebRTC 连接失败:', member.id, err);
        }
    }
    if (candidates.length === 0) {
        console.log('当前无其他成员，有新成员加入时将自动建立连接');
    }
}

/**
 * 关闭当前 WebRTC 连接
 * @param {boolean} notifyPeer 是否通过 WEBRTC_END 通知对端
 */
function stopWebRTCPeerConnection(notifyPeer) {
    if (typeof window === 'undefined') return;

    // 清除所有 ICE 协商超时定时器
    if (webrtcState.iceTimeoutByMember && webrtcState.iceTimeoutByMember.size > 0) {
        webrtcState.iceTimeoutByMember.forEach((tid) => clearTimeout(tid));
        webrtcState.iceTimeoutByMember.clear();
    }
    webrtcState.retryCountByMember && webrtcState.retryCountByMember.clear();
    if (webrtcState.iceTimeoutHandle) {
        clearTimeout(webrtcState.iceTimeoutHandle);
        webrtcState.iceTimeoutHandle = null;
    }

    // 房主端：关闭所有成员的 PeerConnection
    if (webrtcState.peerConnections && webrtcState.peerConnections.size > 0) {
        webrtcState.peerConnections.forEach((pc) => {
            try {
                pc.close();
            } catch (e) {
                console.error('关闭 WebRTC 连接时出错:', e);
            }
        });
        webrtcState.peerConnections.clear();
    }

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
        // 成员端：房主停止共享时正确 detachStream 并更新 UI 为「房主已停止共享」（#4）
        if (typeof window !== 'undefined' && !window.isHost && typeof updateVideoPlaceholder === 'function') {
            updateVideoPlaceholder('画面流已停止', '房主已停止共享');
        }
    }

    webrtcState.peerConnection = null;
    webrtcState.localStream = null;
    webrtcState.remoteStream = null;
    webrtcState.pendingIceCandidates = [];
    webrtcState.pendingIceCandidatesByMember.clear();

    if (notifyPeer && typeof createEndMessage === 'function' && screenStreamState.ws && screenStreamState.ws.readyState === WebSocket.OPEN) {
        try {
            const endMessage = createEndMessage({
                roomId: window.currentRoomId,
                fromUserId: window.currentUserId,
                toUserId: null,
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
 * 显示开始共享按钮（仅房主可见）
 */
function showStartSharingButton() {
    if (typeof window !== 'undefined' && !window.isHost) {
        hideStartSharingButton();
        return;
    }
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
    if (typeof window !== 'undefined' && !window.isHost) return;
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
        // 正确获取 event.streams[0]；若无则用 event.track 构造 MediaStream（#1）
        const remoteStream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
        webrtcState.remoteStream = remoteStream;

        // 调用 VideoPlayer.attachStream(stream) 将远端流传入，成员端 <video> 实时播放房主共享画面（#2 #3）
        if (typeof window !== 'undefined' && window.VideoPlayer && typeof window.VideoPlayer.attachStream === 'function') {
            window.VideoPlayer.attachStream(remoteStream);
        } else if (videoElement) {
            videoElement.srcObject = remoteStream;
            videoElement.style.display = 'block';
            videoElement.play().catch(err => {
                console.error('播放视频失败:', err);
            });
        }
        // 成员端：显示「正在播放房主画面」状态文案
        showMemberViewingStatusLabel();
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
        if (pc.connectionState === 'connected') {
            if (webrtcState.iceTimeoutHandle) {
                clearTimeout(webrtcState.iceTimeoutHandle);
                webrtcState.iceTimeoutHandle = null;
            }
        }
        // 房主停止共享或连接断开时，停止播放并更新状态文案
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            if (webrtcState.iceTimeoutHandle) {
                clearTimeout(webrtcState.iceTimeoutHandle);
                webrtcState.iceTimeoutHandle = null;
            }
            if (typeof window !== 'undefined' && window.VideoPlayer && typeof window.VideoPlayer.detachStream === 'function') {
                window.VideoPlayer.detachStream();
            }
            hideMemberViewingStatusLabel();
            updateVideoPlaceholder(
                pc.connectionState === 'failed' ? '连接出错' : '房主已停止共享',
                pc.connectionState === 'failed' ? '连接失败，请检查网络后刷新重试' : ''
            );
        }
    };

    await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'offer',
        sdp: message.sdp,
    }));

    const queue = webrtcState.pendingIceCandidates;
    if (queue && queue.length > 0) {
        await drainPendingIceCandidates(pc, queue);
    }

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

    // ICE 协商超时：长时间未连接则退出并提示用户检查网络
    if (webrtcState.iceTimeoutHandle) {
        clearTimeout(webrtcState.iceTimeoutHandle);
    }
    webrtcState.iceTimeoutHandle = setTimeout(() => {
        webrtcState.iceTimeoutHandle = null;
        if (pc.connectionState === 'connected' || pc.connectionState === 'closed') return;
        stopWebRTCPeerConnection(false);
        hideMemberViewingStatusLabel();
        updateVideoPlaceholder(
            '连接超时',
            'ICE 协商超时，请检查网络后刷新页面重试。'
        );
    }, ICE_NEGOTIATION_TIMEOUT_MS);
}

async function handleWebRTCAnswer(message) {
    if (typeof window === 'undefined') return;
    if (!window.currentUserId || !window.currentRoomId) return;
    if (!window.isHost) return;

    if (message.toUserId !== window.currentUserId) return;
    if (message.roomId !== window.currentRoomId) return;

    const fromUserId = message.fromUserId;
    const pc = webrtcState.peerConnections && webrtcState.peerConnections.get(fromUserId);
    if (!pc) {
        console.warn('收到 WebRTC Answer 时本地没有对应成员的 PeerConnection:', fromUserId);
        return;
    }

    await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'answer',
        sdp: message.sdp,
    }));
    console.log('房主端已应用 WebRTC Answer，来自成员:', fromUserId);

    const queue = webrtcState.pendingIceCandidatesByMember.get(fromUserId);
    if (queue && queue.length > 0) {
        await drainPendingIceCandidates(pc, queue);
        webrtcState.pendingIceCandidatesByMember.delete(fromUserId);
    }
}

async function applyIceCandidateToPc(pc, message) {
    if (!pc) return;
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

async function drainPendingIceCandidates(pc, queue) {
    if (!pc || !queue || queue.length === 0) return;
    for (const msg of queue) {
        await applyIceCandidateToPc(pc, msg);
    }
    queue.length = 0;
}

async function handleWebRTCIceCandidate(message) {
    if (typeof window === 'undefined') return;
    if (!window.currentUserId || !window.currentRoomId) return;

    if (message.toUserId !== window.currentUserId) return;
    if (message.roomId !== window.currentRoomId) return;
    if (message.fromUserId === window.currentUserId) return;

    const pc = window.isHost
        ? (webrtcState.peerConnections && webrtcState.peerConnections.get(message.fromUserId))
        : webrtcState.peerConnection;

    const canApply = pc && pc.remoteDescription;
    if (window.isHost) {
        if (!canApply) {
            let queue = webrtcState.pendingIceCandidatesByMember.get(message.fromUserId);
            if (!queue) {
                queue = [];
                webrtcState.pendingIceCandidatesByMember.set(message.fromUserId, queue);
            }
            queue.push(message);
            return;
        }
    } else {
        if (!canApply) {
            webrtcState.pendingIceCandidates.push(message);
            return;
        }
    }

    await applyIceCandidateToPc(pc, message);
}

function handleWebRTCEnd(message) {
    if (typeof window === 'undefined') return;
    if (!window.currentUserId || !window.currentRoomId) return;
    if (message.roomId !== window.currentRoomId) return;

    const isRelevant =
        message.toUserId === null ||
        message.toUserId === window.currentUserId ||
        message.fromUserId === window.currentUserId;
    if (!isRelevant) return;

    if (window.isHost && message.fromUserId && message.fromUserId !== window.currentUserId) {
        closePeerConnectionForMember(message.fromUserId);
        return;
    }
    console.log('收到 WebRTC 结束消息，关闭本地连接');
    stopWebRTCPeerConnection(false);
    // 成员端：停止播放并显示「房主已停止共享」
    if (!window.isHost) {
        hideMemberViewingStatusLabel();
        updateVideoPlaceholder('房主已停止共享', '');
    }
}

function handleWebRTCError(message) {
    console.error('收到 WebRTC 错误消息:', message);
    // 成员端：显示错误提示
    if (typeof window !== 'undefined' && !window.isHost) {
        hideMemberViewingStatusLabel();
        const errorMessage = message?.message || message?.reason || '连接出错，请刷新重试';
        updateVideoPlaceholder('连接出错', errorMessage);
    }
}

// 将 WebRTC 信令处理函数暴露到全局，供 chat.js 调用；类型统一使用 webrtc-signaling.js 的 WebRTCSignalingType
if (typeof window !== 'undefined') {
    var WebRTCSignalingType = window.WebRTCSignalingType || {
        WEBRTC_OFFER: 'WEBRTC_OFFER',
        WEBRTC_ANSWER: 'WEBRTC_ANSWER',
        WEBRTC_ICE_CANDIDATE: 'WEBRTC_ICE_CANDIDATE',
        WEBRTC_END: 'WEBRTC_END',
        WEBRTC_ERROR: 'WEBRTC_ERROR'
    };
    window.handleWebRTCSignalingMessage = function (message) {
        if (!message || !message.type) return;

        switch (message.type) {
            case WebRTCSignalingType.WEBRTC_OFFER:
                handleWebRTCOffer(message);
                break;
            case WebRTCSignalingType.WEBRTC_ANSWER:
                handleWebRTCAnswer(message);
                break;
            case WebRTCSignalingType.WEBRTC_ICE_CANDIDATE:
                handleWebRTCIceCandidate(message);
                break;
            case WebRTCSignalingType.WEBRTC_END:
                handleWebRTCEnd(message);
                break;
            case WebRTCSignalingType.WEBRTC_ERROR:
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
