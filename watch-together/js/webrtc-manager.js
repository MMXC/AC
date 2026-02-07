/**
 * WebRTC 连接管理器
 * 处理 WebRTC 连接建立、ICE 协商、超时和错误处理
 */

// WebRTC 连接状态（命名与 screen-streaming.js 的 webrtcState 区分，避免同页加载时重复声明）
const webrtcManagerState = {
    peerConnections: new Map(), // userId -> RTCPeerConnection
    iceTimeoutTimers: new Map(), // userId -> timeout timer
    retryCounters: new Map(), // userId -> retry count
    ws: null,
};

// 配置常量
const WEBRTC_CONFIG = {
    iceTimeout: 30000, // ICE 协商超时时间：30秒
    maxRetries: 3, // 最大重试次数
    retryInterval: 5000, // 重试间隔：5秒
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

/**
 * 初始化 WebRTC 管理器
 */
function initWebRTCManager(ws) {
    webrtcManagerState.ws = ws;
    
    // 监听 WebSocket 消息
    if (ws) {
        ws.addEventListener('message', handleWebRTCSignalingMessage);
    }
}

/**
 * 处理 WebRTC 信令消息
 */
function handleWebRTCSignalingMessage(event) {
    try {
        let message;
        if (typeof event.data === 'string') {
            message = JSON.parse(event.data);
        } else if (typeof event.data === 'object' && event.data !== null) {
            message = event.data;
        } else {
            return;
        }
        
        // 只处理 WebRTC 相关消息
        if (!message.type || !message.type.startsWith('WEBRTC_')) {
            return;
        }
        // 成员端：由 screen-streaming 统一处理（含 ontrack 与 VideoPlayer），避免 webrtc-manager 无 ontrack 导致无画面
        if (typeof window !== 'undefined' && !window.isHost && typeof window.handleWebRTCSignalingMessage === 'function') {
            window.handleWebRTCSignalingMessage(message);
            return;
        }
        
        // 在浏览器环境中，使用全局变量或直接访问
        let WebRTCSignalingType;
        if (typeof window !== 'undefined' && window.WebRTCSignalingType) {
            WebRTCSignalingType = window.WebRTCSignalingType;
        } else if (typeof require !== 'undefined') {
            const signaling = require('./webrtc-signaling.js');
            WebRTCSignalingType = signaling.WebRTCSignalingType;
        } else {
            // 降级：直接使用字符串常量
            WebRTCSignalingType = {
                WEBRTC_OFFER: 'WEBRTC_OFFER',
                WEBRTC_ANSWER: 'WEBRTC_ANSWER',
                WEBRTC_ICE_CANDIDATE: 'WEBRTC_ICE_CANDIDATE',
                WEBRTC_END: 'WEBRTC_END',
                WEBRTC_ERROR: 'WEBRTC_ERROR',
            };
        }
        
        switch (message.type) {
            case WebRTCSignalingType.WEBRTC_OFFER:
                handleOffer(message);
                break;
            case WebRTCSignalingType.WEBRTC_ANSWER:
                handleAnswer(message);
                break;
            case WebRTCSignalingType.WEBRTC_ICE_CANDIDATE:
                handleICECandidate(message);
                break;
            case WebRTCSignalingType.WEBRTC_END:
                handleEnd(message);
                break;
            case WebRTCSignalingType.WEBRTC_ERROR:
                handleError(message);
                break;
        }
    } catch (error) {
        console.error('处理 WebRTC 信令消息错误:', error);
    }
}

/**
 * 创建 WebRTC 连接
 */
function createPeerConnection(targetUserId) {
    // 如果已存在连接，先关闭
    if (webrtcManagerState.peerConnections.has(targetUserId)) {
        closePeerConnection(targetUserId);
    }
    
    const pc = new RTCPeerConnection({
        iceServers: WEBRTC_CONFIG.iceServers,
    });
    
    // ICE 连接状态监听
    pc.addEventListener('iceconnectionstatechange', () => {
        console.log(`ICE 连接状态变化 [${targetUserId}]:`, pc.iceConnectionState);
        
        switch (pc.iceConnectionState) {
            case 'connected':
            case 'completed':
                // 连接成功，清除超时定时器
                clearICETimeout(targetUserId);
                resetRetryCounter(targetUserId);
                break;
            case 'failed':
                // ICE 协商失败
                handleICEFailure(targetUserId);
                break;
            case 'disconnected':
                // 连接断开
                handleICEDisconnected(targetUserId);
                break;
            case 'closed':
                // 连接已关闭
                clearICETimeout(targetUserId);
                break;
        }
    });
    
    // ICE 候选地址收集监听
    pc.addEventListener('icecandidate', (event) => {
        if (event.candidate) {
            sendICECandidate(targetUserId, event.candidate);
        } else {
            // 候选地址收集完成
            console.log(`ICE 候选地址收集完成 [${targetUserId}]`);
        }
    });
    
    // 连接错误监听
    pc.addEventListener('error', (error) => {
        console.error(`WebRTC 连接错误 [${targetUserId}]:`, error);
        handleWebRTCError(targetUserId, error);
    });
    
    webrtcManagerState.peerConnections.set(targetUserId, pc);
    
    return pc;
}

/**
 * 设置 ICE 协商超时
 */
function setICETimeout(targetUserId) {
    // 清除现有超时
    clearICETimeout(targetUserId);
    
    const timer = setTimeout(() => {
        const pc = webrtcManagerState.peerConnections.get(targetUserId);
        if (pc && (pc.iceConnectionState === 'checking' || pc.iceConnectionState === 'new')) {
            console.warn(`ICE 协商超时 [${targetUserId}]`);
            handleICETimeout(targetUserId);
        }
    }, WEBRTC_CONFIG.iceTimeout);
    
    webrtcManagerState.iceTimeoutTimers.set(targetUserId, timer);
}

/**
 * 清除 ICE 协商超时
 */
function clearICETimeout(targetUserId) {
    const timer = webrtcManagerState.iceTimeoutTimers.get(targetUserId);
    if (timer) {
        clearTimeout(timer);
        webrtcManagerState.iceTimeoutTimers.delete(targetUserId);
    }
}

/**
 * 处理 ICE 协商超时
 */
function handleICETimeout(targetUserId) {
    const pc = webrtcManagerState.peerConnections.get(targetUserId);
    if (!pc) return;
    
    // 关闭连接
    closePeerConnection(targetUserId);
    
    // 显示错误提示
    showWebRTCError(
        '连接超时',
        'WebRTC 连接建立超时。请检查网络连接，确保防火墙未阻止连接，然后重试。',
        true, // 可重试
        targetUserId
    );
}

/**
 * 处理 ICE 协商失败
 */
function handleICEFailure(targetUserId) {
    const pc = webrtcManagerState.peerConnections.get(targetUserId);
    if (!pc) return;
    
    // 关闭连接
    closePeerConnection(targetUserId);
    
    // 检查是否可以重试
    const retryCount = getRetryCount(targetUserId);
    if (retryCount < WEBRTC_CONFIG.maxRetries) {
        // 可以重试
        incrementRetryCounter(targetUserId);
        showWebRTCError(
            '连接失败',
            `WebRTC 连接建立失败（尝试 ${retryCount + 1}/${WEBRTC_CONFIG.maxRetries}）。正在自动重试...`,
            true,
            targetUserId
        );
        
        // 延迟重试
        setTimeout(() => {
            retryConnection(targetUserId);
        }, WEBRTC_CONFIG.retryInterval);
    } else {
        // 重试次数已用完
        resetRetryCounter(targetUserId);
        showWebRTCError(
            '连接失败',
            'WebRTC 连接建立失败，已重试多次。请检查网络连接或稍后重试。',
            false,
            targetUserId
        );
    }
}

/**
 * 处理 ICE 连接断开
 */
function handleICEDisconnected(targetUserId) {
    console.warn(`ICE 连接断开 [${targetUserId}]`);
    
    // 可以尝试重新连接
    const retryCount = getRetryCount(targetUserId);
    if (retryCount < WEBRTC_CONFIG.maxRetries) {
        incrementRetryCounter(targetUserId);
        setTimeout(() => {
            retryConnection(targetUserId);
        }, WEBRTC_CONFIG.retryInterval);
    }
}

/**
 * 重试连接
 */
function retryConnection(targetUserId) {
    console.log(`重试连接 [${targetUserId}]`);
    // 这里需要根据实际场景重新发起连接
    // 例如：如果是房主，重新发送 Offer；如果是成员，等待新的 Offer
}

/**
 * 处理 WebRTC 错误
 */
function handleWebRTCError(targetUserId, error) {
    console.error(`WebRTC 错误 [${targetUserId}]:`, error);
    
    showWebRTCError(
        '连接错误',
        `WebRTC 连接出现错误：${error.message || '未知错误'}`,
        true,
        targetUserId
    );
}

/**
 * 关闭 WebRTC 连接
 */
function closePeerConnection(targetUserId) {
    const pc = webrtcManagerState.peerConnections.get(targetUserId);
    if (pc) {
        pc.close();
        webrtcManagerState.peerConnections.delete(targetUserId);
    }
    
    clearICETimeout(targetUserId);
}

/**
 * 重试计数器管理
 */
function getRetryCount(targetUserId) {
    return webrtcManagerState.retryCounters.get(targetUserId) || 0;
}

function incrementRetryCounter(targetUserId) {
    const current = getRetryCount(targetUserId);
    webrtcManagerState.retryCounters.set(targetUserId, current + 1);
}

function resetRetryCounter(targetUserId) {
    webrtcManagerState.retryCounters.delete(targetUserId);
}

/**
 * 发送 ICE Candidate
 */
function sendICECandidate(targetUserId, candidate) {
    if (!webrtcManagerState.ws || webrtcManagerState.ws.readyState !== WebSocket.OPEN) {
        return;
    }
    
    // 获取 createICECandidateMessage 函数
    let createICECandidateMessage;
    if (typeof window !== 'undefined' && window.createICECandidateMessage) {
        createICECandidateMessage = window.createICECandidateMessage;
    } else if (typeof require !== 'undefined') {
        const signaling = require('./webrtc-signaling.js');
        createICECandidateMessage = signaling.createICECandidateMessage;
    } else {
        console.error('无法找到 createICECandidateMessage 函数');
        return;
    }
    
    const message = createICECandidateMessage({
        roomId: window.currentRoomId,
        fromUserId: window.currentUserId,
        toUserId: targetUserId,
        candidate: candidate.toJSON(),
    });
    
    webrtcManagerState.ws.send(JSON.stringify(message));
}

/**
 * 处理 Offer 消息
 */
async function handleOffer(message) {
    const { fromUserId, sdp } = message;
    
    try {
        const pc = createPeerConnection(fromUserId);
        
        // 设置远程描述
        await pc.setRemoteDescription(new RTCSessionDescription({
            type: 'offer',
            sdp: sdp,
        }));
        
        // 创建 Answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        // 发送 Answer
        let createAnswerMessage;
        if (typeof window !== 'undefined' && window.createAnswerMessage) {
            createAnswerMessage = window.createAnswerMessage;
        } else if (typeof require !== 'undefined') {
            const signaling = require('./webrtc-signaling.js');
            createAnswerMessage = signaling.createAnswerMessage;
        } else {
            console.error('无法找到 createAnswerMessage 函数');
            return;
        }
        
        const answerMessage = createAnswerMessage({
            roomId: message.roomId,
            fromUserId: window.currentUserId,
            toUserId: fromUserId,
            sdp: answer.sdp,
        });
        
        if (webrtcManagerState.ws && webrtcManagerState.ws.readyState === WebSocket.OPEN) {
            webrtcManagerState.ws.send(JSON.stringify(answerMessage));
        }
        
        // 设置超时
        setICETimeout(fromUserId);
    } catch (error) {
        console.error('处理 Offer 错误:', error);
        handleWebRTCError(fromUserId, error);
    }
}

/**
 * 处理 Answer 消息
 */
async function handleAnswer(message) {
    const { fromUserId, sdp } = message;
    
    try {
        const pc = webrtcManagerState.peerConnections.get(fromUserId);
        if (!pc) {
            console.warn(`未找到连接 [${fromUserId}]`);
            return;
        }
        
        await pc.setRemoteDescription(new RTCSessionDescription({
            type: 'answer',
            sdp: sdp,
        }));
        
        // 设置超时
        setICETimeout(fromUserId);
    } catch (error) {
        console.error('处理 Answer 错误:', error);
        handleWebRTCError(fromUserId, error);
    }
}

/**
 * 处理 ICE Candidate 消息
 */
async function handleICECandidate(message) {
    const { fromUserId, candidate } = message;
    
    try {
        const pc = webrtcManagerState.peerConnections.get(fromUserId);
        if (!pc) {
            console.warn(`未找到连接 [${fromUserId}]`);
            return;
        }
        
        if (candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
            // 候选地址收集完成
            console.log(`ICE 候选地址收集完成 [${fromUserId}]`);
        }
    } catch (error) {
        console.error('处理 ICE Candidate 错误:', error);
    }
}

/**
 * 处理 End 消息
 */
function handleEnd(message) {
    const { fromUserId } = message;
    closePeerConnection(fromUserId);
    resetRetryCounter(fromUserId);
}

/**
 * 处理 Error 消息
 */
function handleError(message) {
    const { fromUserId, errorMessage } = message;
    
    showWebRTCError(
        '信令错误',
        errorMessage || 'WebRTC 信令过程中出现错误',
        false,
        fromUserId
    );
    
    closePeerConnection(fromUserId);
}

/**
 * 显示 WebRTC 错误提示
 */
function showWebRTCError(title, message, isRecoverable = false, targetUserId = null) {
    // 复用屏幕共享的错误提示函数
    if (typeof showScreenSharingError === 'function') {
        showScreenSharingError(title, message, isRecoverable);
    } else {
        // 降级方案：使用 alert
        alert(`${title}: ${message}`);
    }
}

// 导出函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initWebRTCManager,
        createPeerConnection,
        closePeerConnection,
        handleWebRTCSignalingMessage,
        webrtcManagerState,
        WEBRTC_CONFIG,
    };
}
