/**
 * VideoPlayer 组件
 * 独立的视频播放器组件，可以附加 MediaStream 进行播放
 * 不关心 WebRTC 细节，只关心 MediaStream 对象
 */

// VideoPlayer 状态
let videoPlayerState = {
    currentStream: null,
    videoElement: null,
    containerElement: null,
    placeholderElement: null,
    streamEndedHandler: null,
    isAttached: false,
};

/**
 * 初始化 VideoPlayer 组件
 */
function initVideoPlayer() {
    // 获取 DOM 元素
    const videoElement = document.getElementById('videoStream');
    const containerElement = document.getElementById('videoContainer');
    const placeholderElement = document.getElementById('videoPlaceholder');
    
    if (!videoElement) {
        console.error('VideoPlayer: 未找到 videoStream 元素');
        return;
    }
    
    if (!containerElement) {
        console.error('VideoPlayer: 未找到 videoContainer 元素');
        return;
    }
    
    // 保存引用
    videoPlayerState.videoElement = videoElement;
    videoPlayerState.containerElement = containerElement;
    videoPlayerState.placeholderElement = placeholderElement;
    
    // 设置 video 元素属性
    videoElement.autoplay = true;
    videoElement.playsInline = true;
    videoElement.muted = false; // 允许播放音频
    
    console.log('VideoPlayer: 初始化完成');
}

/**
 * 附加 MediaStream 到播放器
 * @param {MediaStream} stream - 要播放的媒体流
 */
function attachStream(stream) {
    if (!stream || !(stream instanceof MediaStream)) {
        console.error('VideoPlayer: attachStream 需要传入有效的 MediaStream 对象');
        return;
    }
    
    const videoElement = videoPlayerState.videoElement;
    const containerElement = videoPlayerState.containerElement;
    const placeholderElement = videoPlayerState.placeholderElement;
    
    if (!videoElement || !containerElement) {
        console.error('VideoPlayer: 组件未初始化，请先调用 initVideoPlayer()');
        return;
    }
    
    // 如果已经有流附加，先完全分离旧流（防止内存泄漏）
    if (videoPlayerState.isAttached && videoPlayerState.currentStream) {
        // 保存旧流的引用
        const oldStream = videoPlayerState.currentStream;
        // 先清理事件监听器和状态
        if (videoPlayerState.streamEndedHandler) {
            oldStream.getTracks().forEach(track => {
                track.removeEventListener('ended', videoPlayerState.streamEndedHandler);
            });
            videoPlayerState.streamEndedHandler = null;
        }
        // 清空 video 元素的 srcObject（这会停止旧流的播放）
        videoElement.srcObject = null;
        // 重置状态
        videoPlayerState.currentStream = null;
        videoPlayerState.isAttached = false;
        console.log('VideoPlayer: 已清理旧流');
    }
    
    try {
        // 保存当前流引用
        videoPlayerState.currentStream = stream;
        videoPlayerState.isAttached = true;
        
        // 创建新的流结束事件处理器
        videoPlayerState.streamEndedHandler = () => {
            // 检查是否是当前流（防止旧流的事件触发）
            if (videoPlayerState.currentStream === stream) {
                console.log('VideoPlayer: 流已结束');
                detachStream();
            }
        };
        
        // 为所有轨道添加 ended 事件监听
        stream.getTracks().forEach(track => {
            track.addEventListener('ended', videoPlayerState.streamEndedHandler);
        });
        
        // 设置 video 元素的 srcObject（这会自动开始播放）
        videoElement.srcObject = stream;
        
        // 播放视频
        videoElement.play().catch(error => {
            console.error('VideoPlayer: 播放失败:', error);
            // 如果自动播放失败，可能是浏览器策略限制，但不影响流附加
        });
        
        // 监听视频加载完成（使用一次性事件，避免重复绑定）
        const onLoadedMetadata = () => {
            // 再次检查是否是当前流（防止异步竞态）
            if (videoPlayerState.currentStream === stream) {
                console.log('VideoPlayer: 视频元数据已加载', {
                    videoWidth: videoElement.videoWidth,
                    videoHeight: videoElement.videoHeight,
                    tracks: stream.getTracks().map(t => ({
                        kind: t.kind,
                        enabled: t.enabled,
                        readyState: t.readyState
                    }))
                });
            }
            videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
        };
        videoElement.addEventListener('loadedmetadata', onLoadedMetadata);
        
        // 显示 video 元素，隐藏占位符
        videoElement.style.display = 'block';
        if (placeholderElement) {
            placeholderElement.style.display = 'none';
        }
        
        // 确保容器可见
        if (containerElement) {
            containerElement.style.display = 'flex';
        }
        
        console.log('VideoPlayer: 流已附加', {
            videoTracks: stream.getVideoTracks().length,
            audioTracks: stream.getAudioTracks().length,
            streamId: stream.id
        });
        
    } catch (error) {
        console.error('VideoPlayer: 附加流失败:', error);
        // 清理状态
        videoPlayerState.currentStream = null;
        videoPlayerState.isAttached = false;
        videoPlayerState.streamEndedHandler = null;
        throw error;
    }
}

/**
 * 分离当前 MediaStream
 */
function detachStream() {
    const videoElement = videoPlayerState.videoElement;
    const containerElement = videoPlayerState.containerElement;
    const placeholderElement = videoPlayerState.placeholderElement;
    
    if (!videoElement) {
        return;
    }
    
    // 如果没有附加的流，直接返回
    if (!videoPlayerState.isAttached || !videoPlayerState.currentStream) {
        console.log('VideoPlayer: 没有附加的流，无需分离');
        return;
    }
    
    try {
        // 保存当前流的引用
        const streamToDetach = videoPlayerState.currentStream;
        
        // 移除流结束事件监听（防止内存泄漏）
        if (videoPlayerState.streamEndedHandler) {
            streamToDetach.getTracks().forEach(track => {
                track.removeEventListener('ended', videoPlayerState.streamEndedHandler);
            });
            videoPlayerState.streamEndedHandler = null;
        }
        
        // 停止播放并清空 srcObject（这会停止所有轨道的播放）
        videoElement.pause();
        videoElement.srcObject = null;
        
        // 注意：这里不停止 MediaStream 的轨道，因为组件不拥有流的生命周期
        // 调用者负责管理流的生命周期（停止轨道）
        
        // 隐藏 video 元素，显示占位符
        videoElement.style.display = 'none';
        if (placeholderElement) {
            placeholderElement.style.display = 'block';
            // 更新占位符文本
            const h3 = placeholderElement.querySelector('h3');
            const p = placeholderElement.querySelector('p');
            if (h3) h3.textContent = '暂无视频流';
            if (p) p.textContent = '等待视频流附加';
        }
        
        // 清理状态（必须在最后执行，确保所有清理操作完成）
        videoPlayerState.currentStream = null;
        videoPlayerState.isAttached = false;
        
        console.log('VideoPlayer: 流已分离', {
            streamId: streamToDetach.id
        });
        
    } catch (error) {
        console.error('VideoPlayer: 分离流失败:', error);
        // 即使出错也要清理状态
        videoPlayerState.currentStream = null;
        videoPlayerState.isAttached = false;
        videoPlayerState.streamEndedHandler = null;
    }
}

/**
 * 获取当前附加的流
 * @returns {MediaStream|null} 当前附加的流，如果没有则返回 null
 */
function getCurrentStream() {
    return videoPlayerState.currentStream;
}

/**
 * 检查是否有流附加
 * @returns {boolean} 是否有流附加
 */
function isStreamAttached() {
    return videoPlayerState.isAttached && videoPlayerState.currentStream !== null;
}

// 页面加载完成后初始化
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initVideoPlayer);
    } else {
        initVideoPlayer();
    }
}

// 暴露到全局作用域，供控制台测试使用
if (typeof window !== 'undefined') {
    window.VideoPlayer = {
        attachStream,
        detachStream,
        getCurrentStream,
        isStreamAttached,
        initVideoPlayer,
    };
    
    // 提供便捷的测试函数
    window.testVideoPlayer = async function() {
        console.log('VideoPlayer 测试函数');
        console.log('使用方法:');
        console.log('1. 获取本地摄像头流:');
        console.log('   const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });');
        console.log('   window.VideoPlayer.attachStream(stream);');
        console.log('');
        console.log('2. 分离流:');
        console.log('   window.VideoPlayer.detachStream();');
        console.log('');
        console.log('3. 检查状态:');
        console.log('   window.VideoPlayer.isStreamAttached();');
        console.log('   window.VideoPlayer.getCurrentStream();');
        console.log('');
        console.log('快速测试（需要用户授权）:');
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });
            console.log('✓ 已获取本地媒体流');
            attachStream(stream);
            console.log('✓ 流已附加到 VideoPlayer');
            console.log('提示: 调用 window.VideoPlayer.detachStream() 可以分离流');
            return stream;
        } catch (error) {
            console.error('获取媒体流失败:', error);
            console.log('请手动调用:');
            console.log('  const stream = await navigator.mediaDevices.getUserMedia({ video: true });');
            console.log('  window.VideoPlayer.attachStream(stream);');
            throw error;
        }
    };
}

// 导出函数供测试使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initVideoPlayer,
        attachStream,
        detachStream,
        getCurrentStream,
        isStreamAttached,
        videoPlayerState,
    };
}
