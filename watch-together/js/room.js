/**
 * 房间页面功能
 */

// API 基础 URL（使用全局变量，避免重复声明）
if (typeof window !== 'undefined') {
    // 如果 window.API_BASE 已定义，使用它；否则设置默认值
    if (!window.API_BASE) {
        if (window.API_BASE_URL) {
            window.API_BASE = window.API_BASE_URL;
        } else if (typeof process !== 'undefined' && process.env && process.env.API_BASE) {
            window.API_BASE = process.env.API_BASE;
        } else {
            window.API_BASE = 'http://localhost:3001';
        }
    }
}
const API_BASE = typeof window !== 'undefined' ? window.API_BASE : 'http://localhost:3001';

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
        // 获取当前操作来源用户ID（如果 operation-source.js 已加载）
        const currentOperationSourceUserId = typeof getCurrentOperationSourceUserId === 'function' 
            ? getCurrentOperationSourceUserId() 
            : null;

        // 显示成员列表
        membersList.forEach(member => {
            const memberItem = document.createElement('li');
            memberItem.className = 'member-item';
            memberItem.setAttribute('data-member-id', member.id);

            const avatar = document.createElement('div');
            avatar.className = 'member-avatar';
            avatar.textContent = getMemberInitial(member.name);

            const nameContainer = document.createElement('div');
            nameContainer.style.display = 'flex';
            nameContainer.style.alignItems = 'center';
            nameContainer.style.gap = '8px';
            nameContainer.style.flex = '1';

            const name = document.createElement('div');
            name.className = 'member-name';
            name.textContent = member.name;

            // 显示操作来源标记
            if (currentOperationSourceUserId === member.id) {
                const badge = document.createElement('span');
                badge.textContent = '操作来源';
                badge.style.fontSize = '0.75em';
                badge.style.color = '#4a9eff';
                badge.style.padding = '2px 6px';
                badge.style.background = 'rgba(74, 158, 255, 0.2)';
                badge.style.borderRadius = '4px';
                nameContainer.appendChild(name);
                nameContainer.appendChild(badge);
            } else {
                nameContainer.appendChild(name);
            }

            memberItem.appendChild(avatar);
            memberItem.appendChild(nameContainer);
            membersListEl.appendChild(memberItem);

            // 如果是房主，添加右键菜单
            if (window.isHost && member.id !== window.currentUserId) {
                memberItem.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    showMemberContextMenu(e, member.id, currentOperationSourceUserId === member.id);
                });
            }
        });
    }
}

/**
 * 显示成员右键菜单
 */
function showMemberContextMenu(event, memberId, isOperationSource) {
    // 移除旧的菜单（如果存在）
    const oldMenu = document.getElementById('memberContextMenu');
    if (oldMenu) {
        oldMenu.remove();
    }

    // 创建菜单
    const menu = document.createElement('div');
    menu.id = 'memberContextMenu';
    menu.style.position = 'fixed';
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    menu.style.background = '#2d2d2d';
    menu.style.border = '1px solid #404040';
    menu.style.borderRadius = '6px';
    menu.style.padding = '8px 0';
    menu.style.zIndex = '10000';
    menu.style.minWidth = '150px';
    menu.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';

    // 创建菜单项
    const menuItem = document.createElement('div');
    menuItem.style.padding = '8px 16px';
    menuItem.style.cursor = 'pointer';
    menuItem.style.color = '#fff';
    menuItem.style.fontSize = '0.9em';
    menuItem.style.transition = 'background 0.2s';
    
    if (isOperationSource) {
        menuItem.textContent = '取消操作来源';
        menuItem.addEventListener('click', async () => {
            const result = await clearOperationSource(window.currentRoomId, window.currentUserId);
            if (!result.success) {
                alert('取消操作来源失败：' + (result.error || '请稍后重试'));
            }
            menu.remove();
        });
    } else {
        menuItem.textContent = '设为操作来源';
        menuItem.addEventListener('click', async () => {
            const result = await setOperationSource(window.currentRoomId, window.currentUserId, memberId);
            if (!result.success) {
                alert('设置操作来源失败：' + (result.error || '请稍后重试'));
            }
            menu.remove();
        });
    }

    menuItem.addEventListener('mouseenter', () => {
        menuItem.style.background = '#3a3a3a';
    });
    menuItem.addEventListener('mouseleave', () => {
        menuItem.style.background = 'transparent';
    });

    menu.appendChild(menuItem);
    document.body.appendChild(menu);

    // 点击其他地方关闭菜单
    const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    };
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 100);
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
 * 加载网页到 iframe（仅房主端使用）
 */
function loadUrlIntoIframe(url) {
    // 只有房主才能加载 iframe
    if (!window.isHost) {
        console.warn('非房主用户不能加载 iframe');
        return;
    }

    const iframe = document.getElementById('browserFrame');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');
    const videoContainer = document.getElementById('videoContainer');

    // 隐藏画面容器（成员端使用）
    if (videoContainer) {
        videoContainer.style.display = 'none';
    }

    // 重置状态
    iframe.style.display = 'none';
    loading.style.display = 'block';
    error.style.display = 'none';

    // 验证 URL
    if (!url || !isValidUrl(url)) {
        loading.style.display = 'none';
        error.style.display = 'block';
        if (errorMessage) {
            errorMessage.textContent = '无效的 URL。请提供有效的 http:// 或 https:// 网址。';
        }
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
        if (errorMessage) {
            errorMessage.textContent = '无法加载该网页。可能是网页不允许在 iframe 中显示，或网络连接有问题。';
        }
    };

    // 设置超时
    setTimeout(() => {
        if (loading && loading.style.display !== 'none') {
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
        const response = await fetch(`${API_BASE}/api/v1/rooms/${roomId}`);
        
        if (!response.ok) {
            // 如果是 500 错误，尝试解析错误信息
            if (response.status === 500) {
                try {
                    const errorData = await response.json();
                    return { valid: false, error: errorData.error?.message || '服务器错误，请稍后重试' };
                } catch {
                    return { valid: false, error: '服务器错误，请稍后重试' };
                }
            }
            // 其他错误
            try {
                const data = await response.json();
                return { valid: false, error: data.error?.message || '房间不存在或已关闭' };
            } catch {
                return { valid: false, error: '无法连接到服务器' };
            }
        }
        
        const data = await response.json();

        if (!data.success) {
            return { valid: false, error: data.error?.message || '房间不存在或已关闭' };
        }

        return { valid: true, room: data.data };
    } catch (error) {
        console.error('验证房间错误:', error);
        return { valid: false, error: '无法连接到服务器，请稍后重试' };
    }
}

/**
 * 使用昵称加入房间
 */
async function joinRoomWithNickname(roomId, userId, nickname) {
    const nicknameInputContainer = document.getElementById('nicknameInputContainer');
    const nicknameDisplay = document.getElementById('nicknameDisplay');
    const joinRoomButton = document.getElementById('joinRoomButton');
    const nicknameInput = document.getElementById('nicknameInput');
    const currentNickname = document.getElementById('currentNickname');
    
    if (joinRoomButton) {
        joinRoomButton.disabled = true;
        joinRoomButton.textContent = '加入中...';
    }
    
    try {
        // 调用加入房间 API
        const joinResponse = await fetch(`${API_BASE}/api/v1/rooms/${roomId}/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nickname: nickname,
            }),
        });

        const joinData = await joinResponse.json();
        
        if (!joinResponse.ok || !joinData.success) {
            throw new Error(joinData.error?.message || '加入房间失败');
        }

        // 使用服务器返回的 userId
        const serverUserId = joinData.data.userId || userId;
        const serverNickname = joinData.data.nickname || nickname;
        const roomData = joinData.data.room || {};
        const roomCurrentUrl = roomData.currentUrl;
        const roomHostId = roomData.hostId;
        // 优先使用服务器返回的 isHost 字段，如果没有则通过比较 userId 和 hostId 判断
        const isHost = joinData.data.isHost !== undefined ? joinData.data.isHost : (serverUserId === roomHostId);
        
        console.log('加入房间成功，服务器返回的 userId:', serverUserId);
        console.log('房间信息:', { 
            currentUrl: roomCurrentUrl, 
            hostId: roomHostId, 
            isHost, 
            serverIsHost: joinData.data.isHost,
            joinDataFull: joinData
        });
        
        // 添加当前用户到成员列表
        addMember(serverUserId, serverNickname);
        
        // 将 userId 设置为全局变量，供其他脚本使用
        if (typeof window !== 'undefined') {
            window.currentUserId = serverUserId;
            window.currentUserNickname = serverNickname;
            window.tempUserId = null; // 清除临时ID
            window.currentRoomId = roomId; // 确保房间ID已设置
            window.isHost = isHost; // 保存是否是房主
            window.roomCurrentUrl = roomCurrentUrl; // 保存房间当前URL
        }
        
        // 更新显示的 userId（使用服务器返回的真实 userId）
        const userIdDisplay = document.getElementById('currentUserId');
        if (userIdDisplay) {
            userIdDisplay.textContent = serverUserId;
        }
        
        // 隐藏输入界面，显示昵称
        if (nicknameInputContainer) nicknameInputContainer.style.display = 'none';
        if (nicknameDisplay) nicknameDisplay.style.display = 'block';
        if (currentNickname) currentNickname.textContent = serverNickname;
        
        // 处理 URL 加载逻辑（根据角色区分）
        if (isHost) {
            // 房主端逻辑
            if (roomCurrentUrl) {
                // 房主首次进入房间时，真实 iframe 自动加载 currentUrl，且有"修改 URL"按钮
                console.log('房主进入房间，房间已有 URL，自动加载:', roomCurrentUrl);
                loadUrlIntoIframe(roomCurrentUrl);
                hideUrlInputContainer();
                showUrlControlButton(); // 显示"修改 URL"按钮
            } else {
                // 房间没有 URL，显示 URL 输入框
                console.log('房主进入房间，房间没有 URL，显示 URL 输入框');
                showUrlInputContainer();
                hideUrlControlButton();
                hideVideoContainer();
            }
        } else {
            // 普通成员端逻辑：不显示 URL 输入框，只显示画面容器占位
            console.log('普通成员进入房间，显示画面容器占位');
            hideUrlInputContainer();
            hideUrlControlButton();
            hideBrowserFrame();
            showVideoContainer();
            if (roomCurrentUrl) {
                // 房间已有 URL，显示等待画面流提示
                updateVideoPlaceholder('等待画面流', '房主已设置网页，画面将在这里显示');
            } else {
                // 房间没有 URL，显示等待房主设置提示
                updateVideoPlaceholder('等待房主设置', '房主设置网页后，画面将在这里显示');
            }
        }
        
        // 触发自定义事件，通知其他脚本用户已加入房间
        if (typeof window !== 'undefined') {
            console.log('用户已成功加入房间，触发 userJoinedRoom 事件', { userId: serverUserId, nickname: serverNickname, roomId });
            window.dispatchEvent(new CustomEvent('userJoinedRoom', {
                detail: { userId: serverUserId, nickname: serverNickname, roomId }
            }));
        }
        
    } catch (error) {
        console.error('加入房间错误:', error);
        alert('加入房间失败：' + (error.message || '请稍后重试'));
        if (joinRoomButton) {
            joinRoomButton.disabled = false;
            joinRoomButton.textContent = '加入房间';
        }
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
 * 显示 URL 输入框（房主使用）
 */
function showUrlInputContainer() {
    const urlInputContainer = document.getElementById('urlInputContainer');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const iframe = document.getElementById('browserFrame');
    
    if (loading) loading.style.display = 'none';
    if (error) error.style.display = 'none';
    if (iframe) iframe.style.display = 'none';
    if (urlInputContainer) {
        urlInputContainer.style.display = 'block';
        const urlInput = document.getElementById('urlInput');
        if (urlInput) {
            urlInput.focus();
        }
    }
}

/**
 * 隐藏 URL 输入框
 */
function hideUrlInputContainer() {
    const urlInputContainer = document.getElementById('urlInputContainer');
    if (urlInputContainer) {
        urlInputContainer.style.display = 'none';
    }
}

/**
 * 显示画面容器（普通成员端使用）
 */
function showVideoContainer() {
    const videoContainer = document.getElementById('videoContainer');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const iframe = document.getElementById('browserFrame');
    const urlInputContainer = document.getElementById('urlInputContainer');
    
    if (loading) loading.style.display = 'none';
    if (error) error.style.display = 'none';
    if (iframe) iframe.style.display = 'none';
    if (urlInputContainer) urlInputContainer.style.display = 'none';
    
    if (videoContainer) {
        videoContainer.style.display = 'flex';
    }
}

/**
 * 隐藏画面容器
 */
function hideVideoContainer() {
    const videoContainer = document.getElementById('videoContainer');
    if (videoContainer) {
        videoContainer.style.display = 'none';
    }
}

/**
 * 更新画面容器占位提示
 */
function updateVideoPlaceholder(title, message) {
    const videoPlaceholder = document.getElementById('videoPlaceholder');
    if (videoPlaceholder) {
        const h3 = videoPlaceholder.querySelector('h3');
        const p = videoPlaceholder.querySelector('p');
        if (h3) h3.textContent = title;
        if (p) p.textContent = message;
    }
}

/**
 * 隐藏浏览器 iframe（成员端不显示）
 */
function hideBrowserFrame() {
    const iframe = document.getElementById('browserFrame');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    
    if (iframe) iframe.style.display = 'none';
    if (loading) loading.style.display = 'none';
    if (error) error.style.display = 'none';
}

/**
 * 显示"修改 URL"按钮（房主端使用）
 */
function showUrlControlButton() {
    const urlControlContainer = document.getElementById('urlControlContainer');
    if (urlControlContainer && window.isHost) {
        urlControlContainer.style.display = 'block';
    }
}

/**
 * 隐藏"修改 URL"按钮
 */
function hideUrlControlButton() {
    const urlControlContainer = document.getElementById('urlControlContainer');
    if (urlControlContainer) {
        urlControlContainer.style.display = 'none';
    }
}

/**
 * 更新房间 URL（仅房主可以调用）
 */
async function updateRoomUrl(roomId, userId, url) {
    // 只有房主才能更新 URL
    if (!window.isHost) {
        console.warn('非房主用户不能更新房间 URL');
        return { success: false, error: '只有房主可以更新房间 URL' };
    }

    try {
        const response = await fetch(`${API_BASE}/api/v1/rooms/${roomId}/url`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: url,
                userId: userId,
            }),
        });

        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.error?.message || '更新房间 URL 失败');
        }

        // 更新全局变量
        if (typeof window !== 'undefined') {
            window.roomCurrentUrl = url;
        }
        
        // 房主修改 URL 后，本地 iframe 立即更新
        loadUrlIntoIframe(url);
        
        // 隐藏 URL 输入框
        hideUrlInputContainer();
        
        // 显示"修改 URL"按钮
        showUrlControlButton();
        
        return { success: true };
    } catch (error) {
        console.error('更新房间 URL 错误:', error);
        return { success: false, error: error.message || '请稍后重试' };
    }
}

/**
 * 生成临时用户ID（符合后端格式要求）
 */
function generateTempUserId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';
    for (let i = 0; i < 8; i++) {
        randomString += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `user-${randomString}`;
}

/**
 * 页面初始化
 */
async function init() {
    // 立即生成并显示用户ID（不等待异步操作）
    const tempUserId = generateTempUserId();
    const userIdDisplay = document.getElementById('currentUserId');
    if (userIdDisplay) {
        userIdDisplay.textContent = tempUserId;
        console.log('已设置临时用户ID:', tempUserId);
    } else {
        console.error('未找到 currentUserId 元素');
    }
    
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
    
    // 将临时 userId 和 roomId 设置为全局变量（tempUserId 已在函数开始处生成）
    if (typeof window !== 'undefined') {
        window.tempUserId = tempUserId;
        window.currentUserId = null; // 尚未加入房间
        window.currentUserNickname = null;
        window.currentRoomId = roomId; // 保存房间ID
    }
    
    // 显示昵称输入界面
    const nicknameInputContainer = document.getElementById('nicknameInputContainer');
    const nicknameDisplay = document.getElementById('nicknameDisplay');
    const joinRoomButton = document.getElementById('joinRoomButton');
    const changeNicknameButton = document.getElementById('changeNicknameButton');
    const nicknameInput = document.getElementById('nicknameInput');
    
    if (nicknameInputContainer) {
        nicknameInputContainer.style.display = 'block';
    }
    
    // 加入房间按钮点击事件
    if (joinRoomButton) {
        joinRoomButton.addEventListener('click', async () => {
            await joinRoomWithNickname(roomId, tempUserId, nicknameInput?.value.trim() || '访客');
        });
    }
    
    // 修改昵称按钮点击事件
    if (changeNicknameButton) {
        changeNicknameButton.addEventListener('click', async () => {
            // 如果用户已加入房间，先离开房间
            if (window.currentUserId && window.currentRoomId) {
                try {
                    await fetch(`${API_BASE}/api/v1/rooms/${window.currentRoomId}/leave`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            userId: window.currentUserId,
                        }),
                    });
                    
                    // 从成员列表中移除
                    removeMember(window.currentUserId);
                    
                    // 清除全局变量
                    window.currentUserId = null;
                    window.currentUserNickname = null;
                } catch (error) {
                    console.error('离开房间错误:', error);
                }
            }
            
            // 显示输入界面
            if (nicknameDisplay) nicknameDisplay.style.display = 'none';
            if (nicknameInputContainer) nicknameInputContainer.style.display = 'block';
            if (nicknameInput) {
                nicknameInput.value = window.currentUserNickname || '';
                nicknameInput.focus();
            }
        });
    }
    
    // 昵称输入框回车键事件
    if (nicknameInput) {
        nicknameInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                await joinRoomWithNickname(roomId, tempUserId, nicknameInput.value.trim() || '访客');
            }
        });
    }

    // URL 输入框相关事件（仅房主可见）
    const urlInput = document.getElementById('urlInput');
    const loadUrlButton = document.getElementById('loadUrlButton');
    
    const handleLoadUrl = async () => {
        if (!window.currentUserId || !window.currentRoomId) {
            alert('请先加入房间');
            return;
        }
        
        // 只有房主才能加载 URL
        if (!window.isHost) {
            alert('只有房主可以设置网页地址');
            return;
        }
        
        const url = urlInput?.value.trim();
        if (!url) {
            alert('请输入网页地址');
            return;
        }
        
        if (!isValidUrl(url)) {
            alert('无效的 URL。请提供有效的 http:// 或 https:// 网址。');
            return;
        }
        
        if (loadUrlButton) {
            loadUrlButton.disabled = true;
            loadUrlButton.textContent = '加载中...';
        }
        
        const result = await updateRoomUrl(window.currentRoomId, window.currentUserId, url);
        
        if (loadUrlButton) {
            loadUrlButton.disabled = false;
            loadUrlButton.textContent = '加载网页';
        }
        
        if (!result.success) {
            alert('加载失败：' + (result.error || '请稍后重试'));
        }
    };
    
    if (loadUrlButton) {
        loadUrlButton.addEventListener('click', handleLoadUrl);
    }
    
    if (urlInput) {
        urlInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                await handleLoadUrl();
            }
        });
    }

    // "修改 URL"按钮事件（仅房主可见）
    const changeUrlButton = document.getElementById('changeUrlButton');
    if (changeUrlButton) {
        changeUrlButton.addEventListener('click', () => {
            // 显示 URL 输入框，并预填当前 URL
            if (urlInput && window.roomCurrentUrl) {
                urlInput.value = window.roomCurrentUrl;
            }
            showUrlInputContainer();
            hideUrlControlButton();
        });
    }

    // 不再从 URL 参数加载网页，改为在加入房间后根据房间状态加载
    // 如果房间已有 currentUrl，会在加入房间后自动加载
    // 如果房间没有 currentUrl 且用户是房主，会显示 URL 输入框
    // 如果房间没有 currentUrl 且用户不是房主，会显示等待提示
}

// 页面加载完成后初始化
if (typeof document !== 'undefined') {
    // 如果 DOM 已经加载完成，立即执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM 已经加载完成，立即执行
        init();
    }
}

/**
 * 获取成员列表（全局函数，供其他脚本使用）
 */
function getMembersList() {
    return membersList;
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
        getMembersList,
        validateRoom,
        showError,
        joinRoomWithNickname,
        showVideoContainer,
        hideVideoContainer,
        updateVideoPlaceholder,
        hideBrowserFrame,
        showUrlControlButton,
        hideUrlControlButton,
        API_BASE,
    };
}
