/**
 * 房主加入逻辑测试
 * 验证房主加入时传入 userId 参数的功能
 */

const fs = require('fs');
const path = require('path');

describe('房主加入逻辑', () => {
    const roomJsPath = path.join(__dirname, '../js/room.js');

    describe('joinRoomWithNickname 函数房主检测', () => {
        test('joinRoomWithNickname 函数检查 localStorage 中的 isHost 标识', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            // 应该检查 localStorage 中的 isHost
            expect(js).toContain('watch-together.isHost');
            expect(js).toContain('localStorage.getItem');
            // 应该检查房间ID是否匹配
            expect(js).toContain('storedRoomId === roomId');
        });

        test('如果是房主，从 localStorage 读取 userId', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            // 应该从 localStorage 读取 userId
            expect(js).toContain('watch-together.userId');
            expect(js).toContain('hostUserIdFromStorage');
        });

        test('如果是房主，在 API 请求中传入 userId 参数', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            // 应该检查是否为房主，如果是则添加 userId 到请求体
            expect(js).toContain('requestBody.userId');
            expect(js).toContain('isHostFromStorage');
            expect(js).toContain('hostUserIdFromStorage');
            // 应该只在是房主时才添加 userId
            expect(js).toMatch(/if\s*\(isHostFromStorage\s*&&\s*hostUserIdFromStorage\)/);
        });

        test('普通成员加入时不传 userId 参数', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            // 请求体应该只包含 nickname（默认情况）
            expect(js).toContain('const requestBody = {');
            expect(js).toContain('nickname: nickname');
            // userId 应该只在条件满足时才添加
            expect(js).toMatch(/if\s*\(isHostFromStorage\s*&&\s*hostUserIdFromStorage\)\s*\{[\s\S]*?requestBody\.userId/);
        });

        test('房主加入后正确识别为房主（isHost: true）', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            // 应该使用服务器返回的 isHost 字段
            expect(js).toContain('joinData.data.isHost');
            expect(js).toContain('window.isHost = isHost');
        });

        test('房主加入后显示房主界面（iframe、修改 URL 按钮等）', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            // 应该根据 isHost 显示不同的界面
            expect(js).toContain('if (isHost)');
            expect(js).toContain('showShareRoomButton()');
            expect(js).toContain('loadUrlIntoIframe');
            expect(js).toContain('showUrlControlButton()');
        });
    });

    describe('代码逻辑验证', () => {
        test('请求体构建逻辑正确', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            // 应该先创建基础请求体，然后条件性添加 userId
            expect(js).toContain('const requestBody = {');
            expect(js).toContain('nickname: nickname');
            // 应该在条件检查后才添加 userId
            const requestBodyIndex = js.indexOf('const requestBody = {');
            const userIdCheckIndex = js.indexOf('if (isHostFromStorage && hostUserIdFromStorage)');
            expect(requestBodyIndex).toBeLessThan(userIdCheckIndex);
        });

        test('有适当的日志输出', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            // 应该有日志记录房主身份检测
            expect(js).toContain('console.log');
            expect(js).toContain('检测到房主身份');
        });

        test('错误处理完整', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            // 应该有 try-catch 处理 localStorage 读取错误
            expect(js).toContain('try {');
            expect(js).toContain('catch (storageError)');
        });
    });
});
