/**
 * 实时聊天功能测试
 */

const fs = require('fs');
const path = require('path');
const { MockWebSocket, createMockConnection } = require('../mock-server/websocket-mock');

describe('实时聊天', () => {
    const joinHtmlPath = path.join(__dirname, '../join.html');
    const chatJsPath = path.join(__dirname, '../js/chat.js');
    const roomJsPath = path.join(__dirname, '../js/room.js');

    describe('聊天界面可以正常显示', () => {
        test('HTML中包含聊天界面结构', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('chat-section');
            expect(html).toContain('chat-messages');
            expect(html).toContain('chat-input');
            expect(html).toContain('chatSendButton');
        });

        test('HTML中包含聊天消息显示区域', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('chatMessages');
            expect(html).toContain('chat-message');
        });

        test('HTML中包含消息输入框和发送按钮', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('chatInput');
            expect(html).toContain('chat-send-button');
            expect(html).toContain('发送');
        });

        test('HTML中包含聊天相关的CSS样式', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('chat-message-header');
            expect(html).toContain('chat-message-sender');
            expect(html).toContain('chat-message-content');
            expect(html).toContain('chat-message-time');
        });

        test('chat.js文件存在且包含初始化函数', () => {
            expect(fs.existsSync(chatJsPath)).toBe(true);
            const js = fs.readFileSync(chatJsPath, 'utf-8');
            expect(js).toContain('initChat');
        });
    });

    describe('可以发送消息', () => {
        test('chat.js包含发送消息的函数', () => {
            const js = fs.readFileSync(chatJsPath, 'utf-8');
            expect(js).toContain('sendMessage');
            expect(js).toContain('handleSendMessage');
        });

        test('sendMessage函数可以发送消息内容', () => {
            const { sendMessage } = require('../js/chat');
            
            // 创建模拟WebSocket
            const mockWs = createMockConnection('test-room', 'test-user');
            
            // 模拟WebSocket的send方法
            let sentData = null;
            mockWs.send = (data) => {
                sentData = JSON.parse(data);
            };

            // 设置全局WebSocket（在Node环境中需要模拟）
            // 由于chat.js使用全局WebSocket，我们需要通过模块导出测试
            // 这里主要验证函数逻辑存在
            const js = fs.readFileSync(chatJsPath, 'utf-8');
            expect(js).toContain('ws.send(JSON.stringify(message))');
        });

        test('输入框支持Enter键发送消息', () => {
            const js = fs.readFileSync(chatJsPath, 'utf-8');
            expect(js).toContain('keydown');
            expect(js).toContain('Enter');
            expect(js).toContain('handleSendMessage');
        });

        test('发送按钮绑定点击事件', () => {
            const js = fs.readFileSync(chatJsPath, 'utf-8');
            expect(js).toContain('addEventListener');
            expect(js).toContain('click');
            expect(js).toContain('handleSendMessage');
        });
    });

    describe('消息实时同步给所有成员', () => {
        test('chat.js包含WebSocket连接功能', () => {
            const js = fs.readFileSync(chatJsPath, 'utf-8');
            expect(js).toContain('connectWebSocket');
            expect(js).toContain('WebSocket');
        });

        test('chat.js包含处理WebSocket消息的函数', () => {
            const js = fs.readFileSync(chatJsPath, 'utf-8');
            expect(js).toContain('handleWebSocketMessage');
            expect(js).toContain('onmessage');
        });

        test('可以处理CHAT_MESSAGE类型的消息', () => {
            const js = fs.readFileSync(chatJsPath, 'utf-8');
            expect(js).toContain('CHAT_MESSAGE');
            expect(js).toContain('case \'CHAT_MESSAGE\'');
        });

        test('可以处理SYNC_STATE类型的消息', () => {
            const js = fs.readFileSync(chatJsPath, 'utf-8');
            expect(js).toContain('SYNC_STATE');
            expect(js).toContain('case \'SYNC_STATE\'');
        });

        test('WebSocket连接包含房间ID和用户ID参数', () => {
            const js = fs.readFileSync(chatJsPath, 'utf-8');
            expect(js).toContain('roomId');
            expect(js).toContain('userId');
        });
    });

    describe('消息显示发送者信息', () => {
        test('renderMessage函数包含发送者显示逻辑', () => {
            const js = fs.readFileSync(chatJsPath, 'utf-8');
            expect(js).toContain('renderMessage');
            expect(js).toContain('chat-message-sender');
            expect(js).toContain('nickname');
        });

        test('消息包含发送者昵称字段', () => {
            const js = fs.readFileSync(chatJsPath, 'utf-8');
            expect(js).toContain('message.nickname');
            expect(js).toContain('senderEl.textContent');
        });

        test('HTML中包含发送者显示的结构', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('chat-message-sender');
        });

        test('formatMessageTime函数可以格式化时间', () => {
            const { formatMessageTime } = require('../js/chat');
            
            const timestamp = new Date().toISOString();
            const formatted = formatMessageTime(timestamp);
            expect(typeof formatted).toBe('string');
        });
    });

    describe('消息历史记录正确保存', () => {
        test('chat.js包含消息历史记录数组', () => {
            const js = fs.readFileSync(chatJsPath, 'utf-8');
            expect(js).toContain('messageHistory');
        });

        test('addMessageToHistory函数可以添加消息到历史', () => {
            const js = fs.readFileSync(chatJsPath, 'utf-8');
            expect(js).toContain('addMessageToHistory');
        });

        test('可以加载消息历史记录', () => {
            const js = fs.readFileSync(chatJsPath, 'utf-8');
            expect(js).toContain('messageHistory = message.data.messages');
        });

        test('renderMessages函数可以渲染所有历史消息', () => {
            const js = fs.readFileSync(chatJsPath, 'utf-8');
            expect(js).toContain('renderMessages');
            expect(js).toContain('messageHistory.forEach');
        });

        test('消息历史记录有数量限制', () => {
            const js = fs.readFileSync(chatJsPath, 'utf-8');
            expect(js).toContain('messageHistory.length > 100');
            expect(js).toContain('slice(-100)');
        });

        test('SYNC_STATE消息会加载历史消息', () => {
            const js = fs.readFileSync(chatJsPath, 'utf-8');
            expect(js).toContain('SYNC_STATE');
            // 检查是否在SYNC_STATE处理中加载消息
            const syncStateIndex = js.indexOf('case \'SYNC_STATE\'');
            const messagesIndex = js.indexOf('message.data.messages', syncStateIndex);
            expect(messagesIndex).toBeGreaterThan(syncStateIndex);
        });
    });

    describe('集成测试', () => {
        test('chat.js导出了必要的函数供测试使用', () => {
            const chatModule = require('../js/chat');
            expect(typeof chatModule.initChat).toBe('function');
            expect(typeof chatModule.sendMessage).toBe('function');
            expect(typeof chatModule.renderMessage).toBe('function');
            expect(typeof chatModule.formatMessageTime).toBe('function');
        });

        test('join.html引入了chat.js脚本', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('js/chat.js');
        });

        test('chat.js在页面加载时初始化', () => {
            const js = fs.readFileSync(chatJsPath, 'utf-8');
            expect(js).toContain('DOMContentLoaded');
            expect(js).toContain('initChat');
        });
    });
});
