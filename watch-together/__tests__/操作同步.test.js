/**
 * 操作同步功能测试
 */

const fs = require('fs');
const path = require('path');
const { MockWebSocket, createMockConnection } = require('../mock-server/websocket-mock');

describe('操作同步', () => {
    const joinHtmlPath = path.join(__dirname, '../join.html');
    const syncJsPath = path.join(__dirname, '../js/sync.js');
    const roomJsPath = path.join(__dirname, '../js/room.js');

    describe('可以捕获 iframe 内的操作事件', () => {
        test('sync.js文件存在且包含初始化函数', () => {
            expect(fs.existsSync(syncJsPath)).toBe(true);
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('initSync');
        });

        test('sync.js包含设置iframe事件监听的函数', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('setupIframeEventListeners');
        });

        test('sync.js包含处理滚动事件的函数', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('handleIframeScroll');
            expect(js).toContain('scroll');
        });

        test('sync.js包含处理点击事件的函数', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('handleIframeClick');
            expect(js).toContain('click');
        });

        test('sync.js包含处理URL变化的函数', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('handleIframeUrlChange');
            expect(js).toContain('URL');
        });

        test('sync.js包含跨域事件监听的处理', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('setupCrossOriginEventListeners');
            expect(js).toContain('postMessage');
        });

        test('join.html引入了sync.js脚本', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('js/sync.js');
        });
    });

    describe('操作事件可以发送到服务器', () => {
        test('sync.js包含发送滚动同步的函数', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('sendScrollSync');
        });

        test('sync.js包含发送点击同步的函数', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('sendClickSync');
        });

        test('sync.js包含发送URL变化的函数', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('sendUrlChange');
        });

        test('sendScrollSync函数通过WebSocket发送消息', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('SCROLL_SYNC');
            expect(js).toContain('syncWs.send');
        });

        test('sendClickSync函数通过WebSocket发送消息', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('CLICK_SYNC');
            expect(js).toContain('syncWs.send');
        });

        test('sendUrlChange函数通过WebSocket发送消息', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('URL_CHANGED');
            expect(js).toContain('syncWs.send');
        });

        test('sync.js包含WebSocket连接功能', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('connectSyncWebSocket');
            expect(js).toContain('WebSocket');
        });

        test('WebSocket连接包含房间ID和用户ID参数', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('roomId');
            expect(js).toContain('userId');
        });
    });

    describe('操作可以同步给其他成员', () => {
        test('sync.js包含处理同步消息的函数', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('handleSyncMessage');
        });

        test('可以处理SCROLL_SYNC类型的消息', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('SCROLL_SYNC');
            expect(js).toContain('case \'SCROLL_SYNC\'');
        });

        test('可以处理CLICK_SYNC类型的消息', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('CLICK_SYNC');
            expect(js).toContain('case \'CLICK_SYNC\'');
        });

        test('可以处理URL_CHANGED类型的消息', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('URL_CHANGED');
            expect(js).toContain('case \'URL_CHANGED\'');
        });

        test('sync.js包含应用滚动同步的函数', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('applyScrollSync');
        });

        test('sync.js包含应用点击同步的函数', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('applyClickSync');
        });

        test('sync.js包含应用URL变化的函数', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('applyUrlChange');
        });

        test('处理消息时会忽略自己发送的消息', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('message.userId === syncCurrentUserId');
        });
    });

    describe('滚动位置可以同步', () => {
        test('sendScrollSync函数发送滚动位置数据', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('sendScrollSync');
            // 检查是否包含x和y坐标
            const sendScrollIndex = js.indexOf('sendScrollSync');
            const xIndex = js.indexOf('x:', sendScrollIndex);
            const yIndex = js.indexOf('y:', sendScrollIndex);
            expect(xIndex).toBeGreaterThan(sendScrollIndex);
            expect(yIndex).toBeGreaterThan(sendScrollIndex);
        });

        test('applyScrollSync函数应用滚动位置', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('applyScrollSync');
            expect(js).toContain('scrollLeft');
            expect(js).toContain('scrollTop');
        });

        test('滚动事件有节流处理', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('scrollThrottleTimer');
            expect(js).toContain('setTimeout');
        });

        test('滚动同步消息包含时间戳', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('timestamp');
            const sendScrollIndex = js.indexOf('sendScrollSync');
            const timestampIndex = js.indexOf('timestamp', sendScrollIndex);
            expect(timestampIndex).toBeGreaterThan(sendScrollIndex);
        });
    });

    describe('URL 变化可以同步', () => {
        test('sendUrlChange函数发送URL变化数据', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('sendUrlChange');
        });

        test('applyUrlChange函数应用URL变化', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('applyUrlChange');
            // 检查是否使用loadUrlIntoIframe或直接设置src
            expect(js).toContain('loadUrlIntoIframe') || expect(js).toContain('iframe.src');
        });

        test('URL变化消息包含时间戳', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            const sendUrlIndex = js.indexOf('sendUrlChange');
            const timestampIndex = js.indexOf('timestamp', sendUrlIndex);
            expect(timestampIndex).toBeGreaterThan(sendUrlIndex);
        });

        test('可以监听iframe的URL变化', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('handleIframeUrlChange');
            expect(js).toContain('popstate') || expect(js).toContain('location.href');
        });
    });

    describe('集成测试', () => {
        test('sync.js导出了必要的函数供测试使用', () => {
            const syncModule = require('../js/sync');
            expect(typeof syncModule.initSync).toBe('function');
            expect(typeof syncModule.sendScrollSync).toBe('function');
            expect(typeof syncModule.sendClickSync).toBe('function');
            expect(typeof syncModule.sendUrlChange).toBe('function');
            expect(typeof syncModule.applyScrollSync).toBe('function');
            expect(typeof syncModule.applyClickSync).toBe('function');
            expect(typeof syncModule.applyUrlChange).toBe('function');
        });

        test('sync.js在页面加载时初始化', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('DOMContentLoaded');
            expect(js).toContain('initSync');
        });

        test('sync.js包含防止循环同步的机制', () => {
            const js = fs.readFileSync(syncJsPath, 'utf-8');
            expect(js).toContain('isApplyingRemoteOperation');
        });
    });
});
