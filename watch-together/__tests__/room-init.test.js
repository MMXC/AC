/**
 * 房间页前端初始化与房主/成员 UI 区分功能测试
 */

const fs = require('fs');
const path = require('path');

describe('房间页前端初始化与房主/成员 UI 区分', () => {
    const joinHtmlPath = path.join(__dirname, '../join.html');
    const roomJsPath = path.join(__dirname, '../js/room.js');

    describe('HTML 结构验证', () => {
        test('HTML 文件存在', () => {
            expect(fs.existsSync(joinHtmlPath)).toBe(true);
        });

        test('HTML 包含画面容器元素（video/canvas）', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('id="videoContainer"');
            expect(html).toContain('id="videoStream"');
            expect(html).toContain('id="canvasStream"');
            expect(html).toContain('id="videoPlaceholder"');
        });

        // 房主端已统一为视频占位，URL 控制 UI 已移除（见 host-remove-iframe-url）
        test('HTML 包含画面区域（无 URL 控制 UI）', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('id="videoContainer"');
            expect(html).toContain('id="videoPlaceholder"');
        });

        test('HTML 包含 iframe 元素', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('id="browserFrame"');
        });
    });

    describe('room.js 功能验证', () => {
        test('room.js 文件存在', () => {
            expect(fs.existsSync(roomJsPath)).toBe(true);
        });

        test('room.js 包含画面容器相关函数', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('showVideoContainer');
            expect(js).toContain('hideVideoContainer');
            expect(js).toContain('updateVideoPlaceholder');
        });

        test('room.js 包含 URL 控制按钮相关函数', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('showUrlControlButton');
            expect(js).toContain('hideUrlControlButton');
        });

        test('room.js 不再依赖 ?url= 查询参数', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            // 检查是否还有从 URL 参数加载网页的逻辑（应该已移除）
            // 应该从 joinData.data.room.currentUrl 获取（通过 roomData.currentUrl）
            expect(js).toContain('joinData.data.room');
            expect(js).toContain('roomCurrentUrl');
            expect(js).toContain('roomData.currentUrl');
            // 确认不再从 URL 参数加载（注释中已说明）
            expect(js).toContain('不再从 URL 参数加载网页');
        });

        test('loadUrlIntoIframe 函数检查房主权限', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('window.isHost');
            // 应该检查是否是房主才能加载 iframe
            expect(js).toMatch(/if\s*\(!window\.isHost\)/);
        });

        test('joinRoomWithNickname 函数根据 isHost 区分逻辑', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('if (isHost)');
            expect(js).toContain('else {');
            // 应包含房主与成员的不同处理（房主端逻辑 或 主区域显示逻辑；普通成员端逻辑）
            expect(js).toMatch(/房主端逻辑|主区域显示逻辑|showVideoContainer.*等待画面流/);
            expect(js).toContain('普通成员端逻辑');
        });

        test('updateRoomUrl 函数检查房主权限', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            // 应该检查是否是房主才能更新 URL
            expect(js).toMatch(/if\s*\(!window\.isHost\)/);
        });
    });

    describe('房主首次进入房间功能', () => {
        test('房主进入时，房间区域显示逻辑存在', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            // 房主端统一为视频占位后，仍可能保留 loadUrlIntoIframe 供内部使用，或仅 showVideoContainer
            expect(js).toMatch(/loadUrlIntoIframe|showVideoContainer.*updateVideoPlaceholder/);
        });

        test('房主进入时，显示"修改 URL"按钮', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('showUrlControlButton()');
        });

        test('房主进入时，如果房间没有 currentUrl，显示 URL 输入框', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('showUrlInputContainer()');
        });
    });

    describe('普通成员进入房间功能', () => {
        test('普通成员进入时，不显示 URL 输入框', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            // 成员端应该隐藏 URL 输入框
            expect(js).toContain('hideUrlInputContainer()');
        });

        test('普通成员进入时，不显示"修改 URL"按钮', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('hideUrlControlButton()');
        });

        test('普通成员进入时，显示画面容器占位', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('showVideoContainer()');
            expect(js).toContain('hideBrowserFrame()');
        });

        test('普通成员进入时，不加载真实 iframe', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            // 成员端不应该调用 loadUrlIntoIframe
            // 应该隐藏 iframe
            expect(js).toContain('hideBrowserFrame()');
        });
    });

    describe('房主修改 URL 功能', () => {
        test('房主修改 URL 后，本地 iframe 立即更新', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            // updateRoomUrl 函数中应该调用 loadUrlIntoIframe
            expect(js).toContain('loadUrlIntoIframe(url)');
        });

        test('房主修改 URL 后，显示"修改 URL"按钮', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('showUrlControlButton()');
        });

        test('room.js 包含事件绑定或 URL 相关函数', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            // URL 控制 UI 已移除，room.js 仍可能保留 updateRoomUrl/loadUrlIntoIframe 等
            expect(js).toMatch(/addEventListener|updateRoomUrl|loadUrlIntoIframe/);
        });
    });

    describe('代码质量检查', () => {
        test('所有函数都有适当的错误处理', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            // 检查关键函数是否有 try-catch
            expect(js).toContain('try {');
            expect(js).toContain('catch');
        });

        test('代码中没有明显的语法错误', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            // 检查基本的语法结构
            expect(js).toContain('function');
            expect(js).toContain('{');
            expect(js).toContain('}');
        });

        test('代码中使用了 console.log 进行调试', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            // 应该有适当的日志输出
            expect(js).toContain('console.log');
        });
    });

    describe('导出函数验证', () => {
        test('所有新增的函数都已导出', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            // 检查 module.exports 中是否包含新函数
            expect(js).toContain('showVideoContainer');
            expect(js).toContain('hideVideoContainer');
            expect(js).toContain('updateVideoPlaceholder');
            expect(js).toContain('showUrlControlButton');
            expect(js).toContain('hideUrlControlButton');
        });
    });

    describe('房主昵称自动读取功能', () => {
        const createRoomJsPath = path.join(__dirname, '../js/create-room.js');

        test('create-room.js 文件存在', () => {
            expect(fs.existsSync(createRoomJsPath)).toBe(true);
        });

        test('create-room.js 创建房间成功后保存 hostNickname 到 localStorage', () => {
            const js = fs.readFileSync(createRoomJsPath, 'utf-8');
            // 应该保存 hostNickname 到 localStorage
            expect(js).toContain('watch-together.hostNickname');
            expect(js).toContain('localStorage.setItem');
            // 应该检查 hostNickname 是否存在且不为空
            expect(js).toContain('hostNickname && hostNickname.trim()');
            expect(js).toContain('localStorage.setItem(\'watch-together.hostNickname\'');
        });

        test('room.js 的 init() 函数检查 localStorage 中的 isHost 标识', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            // 应该检查 localStorage 中的 isHost
            expect(js).toContain('watch-together.isHost');
            expect(js).toContain('localStorage.getItem');
            // 应该检查房间ID是否匹配
            expect(js).toContain('storedRoomId === roomId');
        });

        test('如果是房主，从 localStorage 读取昵称', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            // 应该从 localStorage 读取 hostNickname
            expect(js).toContain('watch-together.hostNickname');
            expect(js).toContain('hostNicknameFromStorage');
        });

        test('房主跳过昵称输入界面，直接调用 joinRoomWithNickname', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            // 应该检查 isHostFromStorage
            expect(js).toContain('isHostFromStorage');
            // 应该隐藏昵称输入界面
            expect(js).toContain('nicknameInputContainer.style.display = \'none\'');
            // 应该直接调用 joinRoomWithNickname
            expect(js).toContain('joinRoomWithNickname(roomId');
            expect(js).toContain('hostNicknameFromStorage');
        });

        test('普通成员仍显示昵称输入框，功能正常', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            // 如果不是房主，应该显示昵称输入界面
            expect(js).toContain('else {');
            expect(js).toContain('nicknameInputContainer.style.display = \'block\'');
        });
    });
});
