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
    }
}

/**
 * 处理 WebSocket 断开事件
 */
function handleWebSocketDisconnected() {
    screenStreamState.ws = null;
    
    // 如果正在共享，停止共享
    if (screenStreamState.isStreaming) {
        stopScreenSharing();
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
        
        // 获取页面的 video 元素用于本地预览
        const videoElement = document.getElementById('videoStream');
        const videoContainer = document.getElementById('videoContainer');
        const videoPlaceholder = document.getElementById('videoPlaceholder');
        const browserFrame = document.getElementById('browserFrame');
        const urlInputContainer = document.getElementById('urlInputContainer');
        
        if (!videoElement) {
            throw new Error('未找到 videoStream 元素');
        }
        
        // 隐藏 iframe 和 URL 输入框（如果存在）
        if (browserFrame) {
            browserFrame.style.display = 'none';
        }
        if (urlInputContainer) {
            urlInputContainer.style.display = 'none';
        }
        
        // 设置 video 元素的 srcObject 为采集到的 MediaStream
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
        
        // 发送开始共享消息（如果 WebSocket 已连接）
        if (screenStreamState.ws && screenStreamState.ws.readyState === WebSocket.OPEN) {
            sendScreenStreamStart();
            // 开始捕获画面（用于发送给其他成员）
            startFrameCapture(videoElement);
        }
        
        // 更新 UI
        updateStartSharingButton(true);
        console.log('屏幕共享已开始');
        
    } catch (error) {
        console.error('开始屏幕共享错误:', error);
        
        // 清理状态
        screenStreamState.isStreaming = false;
        screenStreamState.mediaStream = null;
        
        // 更新 UI
        updateStartSharingButton(false);
        
        // 处理错误
        if (error.name === 'NotAllowedError') {
            alert('屏幕共享权限被拒绝。请在浏览器设置中允许屏幕共享权限。');
        } else if (error.name === 'NotFoundError') {
            alert('未找到可用的屏幕或窗口。请确保您的设备支持屏幕共享。');
        } else if (error.name === 'NotSupportedError') {
            alert('您的浏览器不支持屏幕共享功能。请使用 Chrome、Firefox 或 Edge 浏览器。');
        } else {
            alert('开始屏幕共享失败：' + (error.message || '未知错误'));
        }
        
        // 发送错误消息（如果 WebSocket 已连接）
        if (screenStreamState.ws && screenStreamState.ws.readyState === WebSocket.OPEN) {
            sendScreenStreamError({
                message: error.message || '开始屏幕共享失败',
                code: error.name || 'UNKNOWN_ERROR',
            });
        }
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
    
    // 发送停止共享消息（如果 WebSocket 已连接）
    if (screenStreamState.ws && screenStreamState.ws.readyState === WebSocket.OPEN) {
        sendScreenStreamStop();
    }
    
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
