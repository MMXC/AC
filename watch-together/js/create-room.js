/**
 * 创建房间功能
 * 对应页面组件：index.html 中 #createRoomForm、#result；数据流见 docs/component-tree-and-data-flow.md
 * 数据获取：单次 POST /api/v1/rooms，无串行依赖。
 */

// API 基础 URL（可以根据环境配置）
// 优先使用 window 对象中的配置（由服务器注入）
let API_BASE = 'http://localhost:3000'; // 默认使用后端 API 端口
if (typeof window !== 'undefined' && window.API_BASE_URL) {
    API_BASE = window.API_BASE_URL;
} else if (typeof process !== 'undefined' && process.env && process.env.API_BASE) {
    API_BASE = process.env.API_BASE;
}

/**
 * 校验 URL 是否为 http/https
 */
function isValidHttpUrl(urlString) {
    try {
        const url = new URL(urlString);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (e) {
        return false;
    }
}

/**
 * 创建房间（不再传 URL，房间仅用于屏幕共享）
 */
async function createRoom(roomName, hostNickname) {
    try {
        // 构建请求体，只包含非空字段
        const requestBody = {};
        if (roomName && roomName.trim()) {
            requestBody.name = roomName.trim();
        }
        if (hostNickname && hostNickname.trim()) {
            requestBody.hostNickname = hostNickname.trim();
        }

        const response = await fetch(`${API_BASE}/api/v1/rooms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        // 检查响应类型
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            // 如果不是 JSON 响应（可能是 HTML 错误页面），抛出更友好的错误
            const text = await response.text();
            console.error('API 返回非 JSON 响应:', text.substring(0, 200));
            throw new Error(`服务器错误 (${response.status}): 请检查 API 地址是否正确 (${API_BASE})`);
        }

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error?.message || `创建房间失败 (${response.status})`);
        }

        return data.data;
    } catch (error) {
        console.error('创建房间错误:', error);
        // 如果是网络错误，提供更友好的提示
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('无法连接到服务器，请检查网络连接和 API 地址');
        }
        throw error;
    }
}

/**
 * 生成完整的房间链接
 */
function generateRoomLink(roomId) {
    // 使用当前页面的 origin 和路径
    // 在浏览器环境中使用 window.location.origin，在 Node.js 环境中使用默认值
    let baseUrl = 'http://localhost:3000';
    if (typeof window !== 'undefined' && window.location) {
        baseUrl = window.location.origin;
    }
    return `${baseUrl}/room/${roomId}`;
}

/**
 * 复制到剪贴板
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        // 降级方案：使用传统方法
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        } catch (err2) {
            document.body.removeChild(textarea);
            return false;
        }
    }
}

// 页面加载完成后初始化（仅在浏览器环境中执行）
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const form = document.getElementById('createRoomForm');
        const createBtn = document.getElementById('createBtn');
        const loading = document.getElementById('loading');
        const error = document.getElementById('error');
        const result = document.getElementById('result');
        const roomIdEl = document.getElementById('roomId');
        const roomNameDisplayEl = document.getElementById('roomNameDisplay');
        const roomLinkEl = document.getElementById('roomLink');
        const copyBtn = document.getElementById('copyBtn');

        // 表单提交处理
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // 重置状态
            error.classList.remove('show');
            result.classList.remove('show');

            const roomName = document.getElementById('roomName').value.trim();
            const hostNickname = document.getElementById('hostNickname').value.trim();

            loading.classList.add('show');
            createBtn.disabled = true;

            try {
                // 创建房间（不再传 URL）
                const room = await createRoom(roomName, hostNickname);

                // 从响应中获取必要信息（兼容旧字段）
                const roomId = room.roomId || room.id;
                const hostUserId = room.hostUserId || room.hostId;

                // 生成房间链接（用于展示和回退）
                const roomLink = generateRoomLink(roomId);

                // 在本地存储房间和房主信息，供房主端初始化使用
                try {
                    if (typeof window !== 'undefined' && window.localStorage) {
                        window.localStorage.setItem('watch-together.roomId', roomId);
                        if (hostUserId) {
                            window.localStorage.setItem('watch-together.userId', hostUserId);
                            window.localStorage.setItem('watch-together.isHost', 'true');
                        }
                        // 保存房主昵称，供跳转后自动读取
                        if (hostNickname && hostNickname.trim()) {
                            window.localStorage.setItem('watch-together.hostNickname', hostNickname.trim());
                        }
                    }
                } catch (storageError) {
                    console.warn('保存房间信息到本地存储失败:', storageError);
                }

                // 更新结果展示（在跳转前短暂可见，也便于无跳转环境下调试）
                roomIdEl.textContent = roomId;
                roomNameDisplayEl.textContent = room.name || '未命名房间';
                roomLinkEl.value = roomLink;
                result.classList.add('show');
                loading.classList.remove('show');

                // 自动跳转到房主房间页面 /room/:roomId
                if (typeof window !== 'undefined') {
                    const targetPath = `/room/${roomId}`;
                    const targetHref = (window.location && window.location.origin)
                        ? `${window.location.origin}${targetPath}`
                        : targetPath;
                    try {
                        if (window.location && typeof window.location.assign === 'function') {
                            window.location.assign(targetHref);
                        } else {
                            window.location.href = targetHref;
                        }
                    } catch (navError) {
                        // 兜底方案
                        window.location.href = targetPath;
                    }
                }
            } catch (err) {
                error.textContent = err.message || '创建房间失败，请稍后重试';
                error.classList.add('show');
                loading.classList.remove('show');
            } finally {
                createBtn.disabled = false;
            }
        });

        // 复制链接按钮
        copyBtn.addEventListener('click', async () => {
            const link = roomLinkEl.value;
            if (link) {
                const success = await copyToClipboard(link);
                if (success) {
                    copyBtn.textContent = '已复制！';
                    setTimeout(() => {
                        copyBtn.textContent = '复制链接';
                    }, 2000);
                } else {
                    alert('复制失败，请手动复制链接');
                }
            }
        });
    });
}

// 导出函数供测试使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createRoom,
        generateRoomLink,
        copyToClipboard,
        API_BASE,
    };
}
