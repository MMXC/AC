/**
 * 画面流/屏幕投影通路设计与最小实现测试
 */

const fs = require('fs');
const path = require('path');

describe('画面流/屏幕投影通路设计与最小实现', () => {
    const joinHtmlPath = path.join(__dirname, '../join.html');
    const screenStreamingJsPath = path.join(__dirname, '../js/screen-streaming.js');
    const chatJsPath = path.join(__dirname, '../js/chat.js');

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

        test('HTML 引入了 screen-streaming.js 脚本', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('screen-streaming.js');
        });

        test('HTML 包含开始共享按钮样式', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('start-sharing-button');
        });
    });

    describe('screen-streaming.js 文件验证', () => {
        test('screen-streaming.js 文件存在', () => {
            expect(fs.existsSync(screenStreamingJsPath)).toBe(true);
        });

        test('screen-streaming.js 包含初始化函数', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('initScreenStreaming');
        });

        test('screen-streaming.js 包含开始共享函数', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('startScreenSharing');
        });

        test('screen-streaming.js 包含停止共享函数', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('stopScreenSharing');
        });

        test('screen-streaming.js 包含画面帧处理函数', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('handleScreenFrame');
        });

        test('screen-streaming.js 包含画面流开始处理函数', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('handleScreenStreamStart');
        });

        test('screen-streaming.js 包含画面流停止处理函数', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('handleScreenStreamStop');
        });

        test('screen-streaming.js 包含错误处理函数', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('handleScreenStreamError');
        });

        test('screen-streaming.js 使用 getDisplayMedia API', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('getDisplayMedia');
        });

        test('screen-streaming.js 通过 WebSocket 发送画面数据', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('SCREEN_STREAM_FRAME');
            expect(js).toContain('sendScreenFrame');
        });

        test('screen-streaming.js 监听 WebSocket 消息', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('handleWebSocketMessage');
            expect(js).toContain('SCREEN_STREAM_START');
            expect(js).toContain('SCREEN_STREAM_STOP');
            expect(js).toContain('SCREEN_STREAM_ERROR');
        });

        test('screen-streaming.js 使用 Canvas 绘制画面', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('canvas');
            expect(js).toContain('getContext');
            expect(js).toContain('drawImage');
            expect(js).toContain('toDataURL');
        });

        test('screen-streaming.js 检查房主权限', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('window.isHost');
            expect(js).toMatch(/if\s*\(!window\.isHost\)/);
        });

        test('screen-streaming.js 处理权限拒绝错误', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('NotAllowedError');
        });

        test('screen-streaming.js 处理浏览器不支持错误', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('NotSupportedError');
        });

        test('screen-streaming.js 监听用户加入房间事件', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('userJoinedRoom');
        });

        test('screen-streaming.js 监听 WebSocket 连接事件', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('websocketConnected');
            expect(js).toContain('websocketDisconnected');
        });

        test('screen-streaming.js 在房主端显示开始共享按钮', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('showStartSharingButton');
        });

        test('screen-streaming.js 在成员端隐藏开始共享按钮', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('hideStartSharingButton');
        });

        test('screen-streaming.js 更新占位提示', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('updateVideoPlaceholder');
        });

        test('screen-streaming.js 显示画面容器', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('showVideoContainer');
        });
    });

    describe('chat.js WebSocket 事件触发验证', () => {
        test('chat.js 在 WebSocket 连接成功时触发事件', () => {
            const js = fs.readFileSync(chatJsPath, 'utf-8');
            expect(js).toContain('websocketConnected');
            expect(js).toContain('dispatchEvent');
        });

        test('chat.js 在 WebSocket 断开时触发事件', () => {
            const js = fs.readFileSync(chatJsPath, 'utf-8');
            expect(js).toContain('websocketDisconnected');
        });
    });

    describe('画面流功能完整性验证', () => {
        test('画面流状态管理完整', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('screenStreamState');
            expect(js).toContain('isStreaming');
            expect(js).toContain('mediaStream');
            expect(js).toContain('captureInterval');
            expect(js).toContain('frameRate');
            expect(js).toContain('quality');
        });

        test('画面流支持低帧率配置', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            // 应该配置了低帧率（例如 5 fps）
            expect(js).toMatch(/frameRate:\s*\d+/);
        });

        test('画面流支持图片质量配置', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            // 应该配置了图片质量（0-1）
            expect(js).toMatch(/quality:\s*[\d.]+/);
        });

        test('画面流监听流结束事件', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('addEventListener');
            expect(js).toContain('ended');
        });

        test('画面流在停止时清理资源', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('clearInterval');
            expect(js).toContain('stop()');
        });

        test('画面流在成员端接收并显示画面', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('handleScreenFrame');
            expect(js).toContain('new Image()');
            expect(js).toContain('drawImage');
        });

        test('画面流在停止时显示占位提示', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('handleScreenStreamStop');
            expect(js).toContain('画面流已停止');
        });

        test('画面流在错误时显示错误提示', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('handleScreenStreamError');
            expect(js).toContain('画面流错误');
        });
    });

    describe('错误处理和日志验证', () => {
        test('画面流有权限拒绝错误处理', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('NotAllowedError');
            expect(js).toContain('权限被拒绝');
        });

        test('画面流有浏览器不支持错误处理', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('NotSupportedError');
            expect(js).toContain('不支持屏幕共享');
        });

        test('画面流有未找到设备错误处理', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('NotFoundError');
        });

        test('画面流有错误日志记录', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('console.error');
        });

        test('画面流发送错误消息到服务器', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('sendScreenStreamError');
            expect(js).toContain('SCREEN_STREAM_ERROR');
        });
    });

    describe('房主和成员角色区分验证', () => {
        test('房主端可以开始共享', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('if (!window.isHost)');
            expect(js).toContain('只有房主可以开始屏幕共享');
        });

        test('房主端显示开始共享按钮', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            // 允许通过 detail.isHost 或 window.isHost 判断房主身份
            expect(
                js.includes('if (isHost)') ||
                js.includes('effectiveIsHost') ||
                js.includes('window.isHost')
            ).toBe(true);
            expect(js).toContain('showStartSharingButton');
        });

        test('成员端隐藏开始共享按钮', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('else {');
            expect(js).toContain('hideStartSharingButton');
        });

        test('成员端只操作画面容器', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            // 成员端不应该直接访问 iframe DOM
            // 只应该操作 video/canvas 容器
            expect(js).toContain('videoContainer');
            expect(js).toContain('canvasStream');
            expect(js).toContain('videoPlaceholder');
        });
    });

    describe('房主向所有成员建立 WebRTC 连接 (backlog-110)', () => {
        test('房主端为每个成员创建并跟踪独立的 PeerConnection（以 userId 为 key）', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('peerConnections');
            expect(js).toMatch(/peerConnections\.(set|get|has|delete)/);
            expect(js).toContain('addPeerConnectionForMember');
        });

        test('信令层能为每个成员正确路由（toUserId 在 offer/answer/ice 中）', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('toUserId');
            expect(js).toContain('createOfferMessage');
            expect(js).toContain('createAnswerMessage');
            expect(js).toContain('createICECandidateMessage');
        });

        test('新成员加入时可增量建立连接（memberJoinedRoom 触发 addPeerConnectionForMember）', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('memberJoinedRoom');
            expect(js).toContain('handleMemberJoinedRoom');
            expect(js).toContain('addPeerConnectionForMember');
        });

        test('成员离开时房主端能关闭对应 PeerConnection 并释放资源', () => {
            const js = fs.readFileSync(screenStreamingJsPath, 'utf-8');
            expect(js).toContain('memberLeftRoom');
            expect(js).toContain('handleMemberLeftRoom');
            expect(js).toContain('closePeerConnectionForMember');
            expect(js).toContain('pc.close()');
        });
    });
});
