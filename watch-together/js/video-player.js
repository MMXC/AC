/**
 * VideoPlayer 组件
 * 用于成员端显示 WebRTC 视频流和状态
 */

// VideoPlayer 状态
const VideoPlayerState = {
    WAITING: 'waiting',           // 等待房主开始共享
    CONNECTING: 'connecting',     // 正在建立连接
    PLAYING: 'playing',           // 正在播放房主画面
    STOPPED: 'stopped',           // 房主已停止共享
    ERROR: 'error',               // 连接错误
};

// VideoPlayer 实例状态
let videoPlayerState = {
    currentState: VideoPlayerState.WAITING,
    peerConnection: null,
    remoteStream: null,
    videoElement: null,
    statusElement: null,
    placeholderElement: null,
    containerElement: null,
};

/**
 * 初始化 VideoPlayer
 */
function initVideoPlayer() {
    // 获取 DOM 元素
    videoPlayerState.videoElement = document.getElementById('videoStream');
    videoPlayerState.containerElement = document.getElementById('videoContainer');
    videoPlayerState.placeholderElement = document.getElementById('videoPlaceholder');
    
    if (!videoPlayerState.videoElement || !videoPlayerState.containerElement) {
        console.error('VideoPlayer: 未找到必要的 DOM 元素');
        return;
    }
    
    // 创建状态显示元素（如果不存在）
    if (!videoPlayerState.placeholderElement) {
        const placeholder = document.createElement('div');
        placeholder.id = 'videoPlaceholder';
        placeholder.className = 'video-placeholder';
        placeholder.innerHTML = '<h3></h3><p></p>';
        videoPlayerState.containerElement.appendChild(placeholder);
        videoPlayerState.placeholderElement = placeholder;
    }
    
    // 初始化状态显示
    updatePlayerState(VideoPlayerState.WAITING);
    
    // 监听用户加入房间事件
    if (typeof window !== 'undefined') {
        window.addEventListener('userJoinedRoom', handleUserJoinedRoom);
    }
    
    // 监听 WebSocket 连接事件
    if (typeof window !== 'undefined') {
        window.addEventListener('websocketConnected', handleWebSocketConnected);
        window.addEventListener('websocketDisconnected', handleWebSocketDisconnected);
    }
    
    console.log('VideoPlayer 初始化完成');
}

/**
 * 处理用户加入房间事件
 */
function handleUserJoinedRoom(event) {
    const { isHost } = event.detail || {};
    const effectiveIsHost = typeof isHost === 'boolean'
        ? isHost
        : (typeof window !== 'undefined' && window.isHost === true);
    
    // 只有成员端才使用 VideoPlayer
    if (!effectiveIsHost) {
        // 成员端：显示等待状态
        updatePlayerState(VideoPlayerState.WAITING);
    }
}

/**
 * 处理 WebSocket 连接事件
 */
function handleWebSocketConnected(event) {
    console.log('VideoPlayer: WebSocket 已连接');
    // WebSocket 连接后，如果还没有收到 Offer，保持等待状态
    if (videoPlayerState.currentState === VideoPlayerState.WAITING) {
        updatePlayerState(VideoPlayerState.WAITING);
    }
}

/**
 * 处理 WebSocket 断开事件
 */
function handleWebSocketDisconnected() {
    console.log('VideoPlayer: WebSocket 已断开');
    // 断开连接时，停止播放并显示错误
    stopVideoPlayer();
    updatePlayerState(VideoPlayerState.ERROR, '连接已断开');
}

/**
 * 更新播放器状态
 */
function updatePlayerState(state, message = null) {
    videoPlayerState.currentState = state;
    
    const placeholder = videoPlayerState.placeholderElement;
    const video = videoPlayerState.videoElement;
    const container = videoPlayerState.containerElement;
    
    if (!placeholder || !video || !container) {
        return;
    }
    
    // 根据状态更新显示
    switch (state) {
        case VideoPlayerState.WAITING:
            placeholder.style.display = 'block';
            video.style.display = 'none';
            updatePlaceholderText('等待房主开始共享...', '房主开始共享后，画面将在这里显示');
            break;
            
        case VideoPlayerState.CONNECTING:
            placeholder.style.display = 'block';
            video.style.display = 'none';
            updatePlaceholderText('正在连接...', '正在建立与房主的连接');
            break;
            
        case VideoPlayerState.PLAYING:
            placeholder.style.display = 'none';
            video.style.display = 'block';
            // 播放状态时隐藏占位符，显示视频
            // 可以添加一个状态指示器显示"正在播放房主画面"
            showPlayingStatus();
            break;
            
        case VideoPlayerState.STOPPED:
            hidePlayingStatus();
            placeholder.style.display = 'block';
            video.style.display = 'none';
            updatePlaceholderText('房主已停止共享', message || '房主已停止共享画面');
            break;
            
        case VideoPlayerState.ERROR:
            hidePlayingStatus();
            placeholder.style.display = 'block';
            video.style.display = 'none';
            updatePlaceholderText('连接错误', message || '无法连接到房主画面');
            break;
    }
}

/**
 * 更新占位符文本
 */
function updatePlaceholderText(title, message) {
    const placeholder = videoPlayerState.placeholderElement;
    if (!placeholder) return;
    
    const h3 = placeholder.querySelector('h3');
    const p = placeholder.querySelector('p');
    
    if (h3) h3.textContent = title;
    if (p) p.textContent = message;
}

/**
 * 显示播放状态指示器
 */
function showPlayingStatus() {
    // 在视频容器上添加状态指示器
    const container = videoPlayerState.containerElement;
    if (!container) return;
    
    // 移除旧的状态指示器（如果存在）
    const oldStatus = container.querySelector('.video-playing-status');
    if (oldStatus) {
        oldStatus.remove();
    }
    
    // 创建状态指示器
    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'video-playing-status';
    statusIndicator.style.cssText = `
        position: absolute;
        top: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 0.9em;
        z-index: 10;
        pointer-events: none;
    `;
    statusIndicator.textContent = '正在播放房主画面';
    container.appendChild(statusIndicator);
    
    // 3秒后自动隐藏（可选）
    setTimeout(() => {
        if (statusIndicator.parentNode) {
            statusIndicator.style.opacity = '0';
            statusIndicator.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                if (statusIndicator.parentNode) {
                    statusIndicator.remove();
                }
            }, 500);
        }
    }, 3000);
}

/**
 * 隐藏播放状态指示器
 */
function hidePlayingStatus() {
    const container = videoPlayerState.containerElement;
    if (!container) return;
    
    const statusIndicator = container.querySelector('.video-playing-status');
    if (statusIndicator) {
        statusIndicator.remove();
    }
}

/**
 * 处理 WebRTC Offer 消息（成员端）
 */
async function handleWebRTCOffer(message) {
    console.log('VideoPlayer: 收到 WebRTC Offer', message);
    
    // 只有成员端才处理 Offer
    if (window.isHost) {
        console.warn('VideoPlayer: 房主端不应处理 Offer');
        return;
    }
    
    try {
        // 更新状态为连接中
        updatePlayerState(VideoPlayerState.CONNECTING);
        
        // 创建 RTCPeerConnection
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        });
        
        videoPlayerState.peerConnection = pc;
        
        // 监听远程流
        pc.ontrack = (event) => {
            console.log('VideoPlayer: 收到远程流', event);
            if (event.streams && event.streams[0]) {
                videoPlayerState.remoteStream = event.streams[0];
                const video = videoPlayerState.videoElement;
                if (video) {
                    video.srcObject = event.streams[0];
                    
                    // 监听视频加载元数据事件
                    video.onloadedmetadata = () => {
                        console.log('VideoPlayer: 视频元数据已加载');
                        // 只有在元数据加载后才尝试播放
                        video.play().catch(err => {
                            console.error('VideoPlayer: 播放视频失败', err);
                            updatePlayerState(VideoPlayerState.ERROR, '播放视频失败');
                        });
                    };
                    
                    // 监听视频播放事件（确保实际开始播放）
                    video.onplaying = () => {
                        console.log('VideoPlayer: 视频开始播放');
                        // 只有在实际播放时才更新为播放状态
                        updatePlayerState(VideoPlayerState.PLAYING);
                    };
                    
                    // 监听视频暂停事件
                    video.onpause = () => {
                        console.log('VideoPlayer: 视频已暂停');
                        // 如果暂停但不是停止，保持播放状态（可能是用户暂停）
                    };
                    
                    // 监听视频结束事件
                    video.onended = () => {
                        console.log('VideoPlayer: 视频已结束');
                        updatePlayerState(VideoPlayerState.STOPPED, '视频流已结束');
                    };
                    
                    video.onerror = (err) => {
                        console.error('VideoPlayer: 视频播放错误', err);
                        updatePlayerState(VideoPlayerState.ERROR, '视频播放错误');
                    };
                }
            }
        };
        
        // 监听 ICE 候选
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('VideoPlayer: 生成 ICE 候选', event.candidate);
                // 发送 ICE 候选给房主
                sendWebRTCICECandidate(event.candidate, message.fromUserId);
            }
        };
        
        // 监听连接状态变化
        pc.onconnectionstatechange = () => {
            console.log('VideoPlayer: 连接状态变化', pc.connectionState);
            // 只有在连接状态实际变化时才更新UI状态
            // 避免在连接建立过程中误报错误
            if (pc.connectionState === 'failed') {
                updatePlayerState(VideoPlayerState.ERROR, '连接失败');
                stopVideoPlayer();
            } else if (pc.connectionState === 'disconnected') {
                // 断开连接时，如果视频还在播放，先不更新状态（可能是临时网络问题）
                // 等待一段时间后如果仍未恢复，再更新状态
                setTimeout(() => {
                    if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                        updatePlayerState(VideoPlayerState.ERROR, '连接已断开');
                        stopVideoPlayer();
                    }
                }, 3000);
            } else if (pc.connectionState === 'closed') {
                // 连接已关闭，停止播放
                updatePlayerState(VideoPlayerState.STOPPED, '连接已关闭');
                stopVideoPlayer();
            }
            // connecting 和 connected 状态不需要更新UI（由视频播放事件触发）
        };
        
        // 设置远程描述
        await pc.setRemoteDescription(new RTCSessionDescription({
            type: 'offer',
            sdp: message.sdp
        }));
        
        // 创建 Answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        // 发送 Answer 给房主
        sendWebRTCAnswer(answer, message.fromUserId);
        
    } catch (error) {
        console.error('VideoPlayer: 处理 Offer 失败', error);
        updatePlayerState(VideoPlayerState.ERROR, '建立连接失败: ' + error.message);
    }
}

/**
 * 处理 WebRTC ICE Candidate 消息
 */
async function handleWebRTCICECandidate(message) {
    const pc = videoPlayerState.peerConnection;
    if (!pc) {
        console.warn('VideoPlayer: 收到 ICE Candidate 但连接不存在');
        return;
    }
    
    try {
        if (message.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
            console.log('VideoPlayer: 添加 ICE Candidate 成功');
        } else {
            console.log('VideoPlayer: ICE Candidate 收集完成');
        }
    } catch (error) {
        console.error('VideoPlayer: 添加 ICE Candidate 失败', error);
    }
}

/**
 * 处理 WebRTC End 消息
 */
function handleWebRTCEnd(message) {
    console.log('VideoPlayer: 收到 WebRTC End', message);
    stopVideoPlayer();
    updatePlayerState(VideoPlayerState.STOPPED, message.reason || '房主已停止共享');
}

/**
 * 处理 WebRTC Error 消息
 */
function handleWebRTCError(message) {
    console.error('VideoPlayer: 收到 WebRTC Error', message);
    stopVideoPlayer();
    updatePlayerState(VideoPlayerState.ERROR, message.errorMessage || '连接错误');
}

/**
 * 停止视频播放器
 */
function stopVideoPlayer() {
    const pc = videoPlayerState.peerConnection;
    if (pc) {
        pc.close();
        videoPlayerState.peerConnection = null;
    }
    
    const video = videoPlayerState.videoElement;
    if (video) {
        video.srcObject = null;
    }
    
    videoPlayerState.remoteStream = null;
}

/**
 * 发送 WebRTC Answer 消息
 */
function sendWebRTCAnswer(answer, toUserId) {
    if (typeof window === 'undefined' || !window.currentRoomId || !window.currentUserId) {
        console.error('VideoPlayer: 无法发送 Answer，缺少必要信息');
        return;
    }
    
    // 使用 webrtc-signaling.js 中的函数创建消息
    if (typeof createAnswerMessage === 'function') {
        const message = createAnswerMessage({
            roomId: window.currentRoomId,
            fromUserId: window.currentUserId,
            toUserId: toUserId,
            sdp: answer.sdp
        });
        
        // 通过 WebSocket 发送（需要从 chat.js 获取 ws）
        sendWebSocketMessage(message);
    } else {
        console.error('VideoPlayer: createAnswerMessage 函数不可用');
    }
}

/**
 * 发送 WebRTC ICE Candidate 消息
 */
function sendWebRTCICECandidate(candidate, toUserId) {
    if (typeof window === 'undefined' || !window.currentRoomId || !window.currentUserId) {
        console.error('VideoPlayer: 无法发送 ICE Candidate，缺少必要信息');
        return;
    }
    
    // 使用 webrtc-signaling.js 中的函数创建消息
    if (typeof createICECandidateMessage === 'function') {
        const message = createICECandidateMessage({
            roomId: window.currentRoomId,
            fromUserId: window.currentUserId,
            toUserId: toUserId,
            candidate: candidate.toJSON()
        });
        
        // 通过 WebSocket 发送
        sendWebSocketMessage(message);
    } else {
        console.error('VideoPlayer: createICECandidateMessage 函数不可用');
    }
}

/**
 * 发送 WebSocket 消息（需要从 chat.js 获取 ws）
 */
function sendWebSocketMessage(message) {
    // 尝试从全局获取 WebSocket 连接
    if (typeof window !== 'undefined' && window.getWebSocketConnection) {
        const ws = window.getWebSocketConnection();
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
            return;
        }
    }
    
    // 如果无法获取 WebSocket，记录错误
    console.error('VideoPlayer: 无法发送 WebSocket 消息，连接不可用');
}

/**
 * 获取当前播放器状态
 */
function getVideoPlayerState() {
    return videoPlayerState.currentState;
}

// 页面加载完成后初始化
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initVideoPlayer);
    } else {
        initVideoPlayer();
    }
}

// 导出函数供其他模块使用
if (typeof window !== 'undefined') {
    window.handleWebRTCOffer = handleWebRTCOffer;
    window.handleWebRTCICECandidate = handleWebRTCICECandidate;
    window.handleWebRTCEnd = handleWebRTCEnd;
    window.handleWebRTCError = handleWebRTCError;
    window.getVideoPlayerState = getVideoPlayerState;
    window.stopVideoPlayer = stopVideoPlayer;
}

// 导出函数供测试使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initVideoPlayer,
        handleWebRTCOffer,
        handleWebRTCICECandidate,
        handleWebRTCEnd,
        handleWebRTCError,
        getVideoPlayerState,
        stopVideoPlayer,
        VideoPlayerState,
        videoPlayerState,
    };
}
