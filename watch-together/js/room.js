/**
 * 房间页面功能
 */

// API 基础 URL（可以根据环境配置）
let API_BASE = 'http://localhost:3001';
if (typeof process !== 'undefined' && process.env && process.env.API_BASE) {
    API_BASE = process.env.API_BASE;
}

// 成员列表数据
let membersList = [];

/**
 * 生成成员头像的首字母
 */
function getMemberInitial(name) {
    if (!name || name.length === 0) return '?';
    return name.charAt(0).toUpperCase();
}

/**
 * 添加成员到列表
 */
function addMember(memberId, memberName) {
    // 检查成员是否已存在
    const existingIndex = membersList.findIndex(m => m.id === memberId);
    if (existingIndex >= 0) {
        // 如果已存在，更新名称
        membersList[existingIndex].name = memberName;
    } else {
        // 添加新成员
        membersList.push({
            id: memberId,
            name: memberName || `成员${memberId.substring(0, 8)}`
        });
    }
    updateMembersDisplay();
}

/**
 * 从列表中移除成员
 */
function removeMember(memberId) {
    membersList = membersList.filter(m => m.id !== memberId);
    updateMembersDisplay();
}

/**
 * 更新成员列表显示
 */
function updateMembersDisplay() {
    if (typeof document === 'undefined') return;
    const membersListEl = document.getElementById('membersList');
    if (!membersListEl) return;

    // 清空现有列表
    membersListEl.innerHTML = '';

    if (membersList.length === 0) {
        // 如果没有成员，显示空状态
        const emptyItem = document.createElement('li');
        emptyItem.className = 'members-empty';
        emptyItem.textContent = '暂无成员';
        membersListEl.appendChild(emptyItem);
    } else {
        // 显示成员列表
        membersList.forEach(member => {
            const memberItem = document.createElement('li');
            memberItem.className = 'member-item';
            memberItem.setAttribute('data-member-id', member.id);

            const avatar = document.createElement('div');
            avatar.className = 'member-avatar';
            avatar.textContent = getMemberInitial(member.name);

            const name = document.createElement('div');
            name.className = 'member-name';
            name.textContent = member.name;

            memberItem.appendChild(avatar);
            memberItem.appendChild(name);
            membersListEl.appendChild(memberItem);
        });
    }
}

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
    // 路径格式: /room/{roomId} 或 /join/{roomId} (兼容旧格式)
    const roomMatch = path.match(/\/room\/([^\/]+)/);
    if (roomMatch) {
        return roomMatch[1];
    }
    // 兼容旧格式 /join/{roomId}
    const joinMatch = path.match(/\/join\/([^\/]+)/);
    if (joinMatch) {
        return joinMatch[1];
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

    // 同时更新侧边栏的房间号显示
    const sidebarRoomIdEl = document.getElementById('sidebarRoomId');
    if (sidebarRoomIdEl) {
        if (roomId) {
            sidebarRoomIdEl.textContent = roomId;
        } else {
            sidebarRoomIdEl.textContent = '未知房间';
        }
    }
}

/**
 * 验证房间是否存在
 */
async function validateRoom(roomId) {
    if (!roomId) {
        return { valid: false, error: '房间号不能为空' };
    }

    try {
        const response = await fetch(`${API_BASE}/api/rooms/${roomId}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            return { valid: false, error: data.error?.message || '房间不存在或已关闭' };
        }

        return { valid: true, room: data.data };
    } catch (error) {
        console.error('验证房间错误:', error);
        return { valid: false, error: '无法连接到服务器，请稍后重试' };
    }
}

/**
 * 显示错误信息
 */
function showError(message) {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');
    const iframe = document.getElementById('browserFrame');
    
    if (loading) loading.style.display = 'none';
    if (iframe) iframe.style.display = 'none';
    if (error) {
        error.style.display = 'block';
        if (errorMessage) {
            errorMessage.textContent = message;
        }
    }
}

/**
 * 页面初始化
 */
async function init() {
    // 获取房间ID
    const roomId = getRoomIdFromPath();
    
    // 如果没有房间ID，显示错误
    if (!roomId) {
        showError('无效的房间链接。请检查链接是否正确。');
        return;
    }

    // 验证房间是否存在
    const validation = await validateRoom(roomId);
    if (!validation.valid) {
        showError(validation.error || '房间不存在或已关闭');
        updateRoomInfo(null);
        return;
    }

    // 房间有效，更新房间信息
    updateRoomInfo(roomId);

    // 初始化成员列表显示
    updateMembersDisplay();

    // 模拟添加当前用户（在实际应用中，这应该从服务器获取）
    // 这里使用一个简单的用户ID生成方式
    const currentUserId = 'user-' + Date.now();
    const currentUserName = '我';
    addMember(currentUserId, currentUserName);

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
        
        if (loading) loading.style.display = 'none';
        if (error) {
            error.style.display = 'block';
            if (errorMessage) {
                errorMessage.textContent = '请在 URL 中添加 ?url=网页地址 参数来加载网页。例如: ?url=https://www.example.com';
            }
        }
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
        addMember,
        removeMember,
        updateMembersDisplay,
        getMemberInitial,
        getMembersList: () => membersList,
        validateRoom,
        showError,
        API_BASE,
    };
}
