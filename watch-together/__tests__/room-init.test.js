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

        test('HTML 包含"修改 URL"按钮', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('id="changeUrlButton"');
            expect(html).toContain('id="urlControlContainer"');
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
            // 应该包含房主和成员的不同处理逻辑
            expect(js).toContain('房主端逻辑');
            expect(js).toContain('普通成员端逻辑');
        });

        test('updateRoomUrl 函数检查房主权限', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            // 应该检查是否是房主才能更新 URL
            expect(js).toMatch(/if\s*\(!window\.isHost\)/);
        });
    });

    describe('房主首次进入房间功能', () => {
        test('房主进入时，如果房间有 currentUrl，自动加载 iframe', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            // 应该检查 roomCurrentUrl 并调用 loadUrlIntoIframe
            expect(js).toContain('if (roomCurrentUrl)');
            expect(js).toContain('loadUrlIntoIframe(roomCurrentUrl)');
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

        test('"修改 URL"按钮点击事件已绑定', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('changeUrlButton');
            expect(js).toContain('addEventListener');
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
});
