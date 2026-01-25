/**
 * 房间页面功能
 */

/**
 * 从 URL 获取参数
 */
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

/**
 * 从路径中提取房间ID
 */
function getRoomIdFromPath() {
    const path = window.location.pathname;
    // 路径格式: /join/{roomId} 或 /join.html?roomId=xxx
    const match = path.match(/\/join\/([^\/]+)/);
    if (match) {
        return match[1];
    }
    // 如果路径不匹配，尝试从查询参数获取
    return getUrlParameter('roomId');
}

/**
 * 验证 URL 是否有效
 */
function isValidUrl(urlString) {
    try {
        const url = new URL(urlString);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (e) {
        return false;
    }
}

/**
 * 加载网页到 iframe
 */
function loadUrlIntoIframe(url) {
    const iframe = document.getElementById('browserFrame');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');

    // 重置状态
    iframe.style.display = 'none';
    loading.style.display = 'block';
    error.style.display = 'none';

    // 验证 URL
    if (!url || !isValidUrl(url)) {
        loading.style.display = 'none';
        error.style.display = 'block';
        errorMessage.textContent = '无效的 URL。请提供有效的 http:// 或 https:// 网址。';
        return;
    }

    // 设置 iframe src
    iframe.src = url;

    // 监听加载事件
    iframe.onload = () => {
        loading.style.display = 'none';
        iframe.style.display = 'block';
        error.style.display = 'none';
    };

    iframe.onerror = () => {
        loading.style.display = 'none';
        iframe.style.display = 'none';
        error.style.display = 'block';
        errorMessage.textContent = '无法加载该网页。可能是网页不允许在 iframe 中显示，或网络连接有问题。';
    };

    // 设置超时
    setTimeout(() => {
        if (loading.style.display !== 'none') {
            // 如果还在加载，可能是某些网站阻止了 iframe 加载
            // 尝试显示 iframe，即使可能被阻止
            loading.style.display = 'none';
            iframe.style.display = 'block';
        }
    }, 5000);
}

/**
 * 更新房间信息显示
 */
function updateRoomInfo(roomId) {
    const roomInfoEl = document.getElementById('roomInfo');
    if (roomId) {
        roomInfoEl.textContent = `房间: ${roomId}`;
    } else {
        roomInfoEl.textContent = '房间';
    }
}

/**
 * 页面初始化
 */
function init() {
    // 获取房间ID
    const roomId = getRoomIdFromPath();
    updateRoomInfo(roomId);

    // 从 URL 参数获取要加载的网页地址
    const url = getUrlParameter('url');

    if (url) {
        // 解码 URL（如果被编码了）
        const decodedUrl = decodeURIComponent(url);
        loadUrlIntoIframe(decodedUrl);
    } else {
        // 如果没有提供 URL，显示提示
        const loading = document.getElementById('loading');
        const error = document.getElementById('error');
        const errorMessage = document.getElementById('errorMessage');
        
        loading.style.display = 'none';
        error.style.display = 'block';
        errorMessage.textContent = '请在 URL 中添加 ?url=网页地址 参数来加载网页。例如: ?url=https://www.example.com';
    }
}

// 页面加载完成后初始化
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', init);
}

// 导出函数供测试使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getUrlParameter,
        getRoomIdFromPath,
        isValidUrl,
        loadUrlIntoIframe,
        updateRoomInfo,
    };
}
