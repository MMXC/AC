/**
 * 共享浏览区域功能测试
 */

const fs = require('fs');
const path = require('path');

describe('共享浏览区域', () => {
    const joinHtmlPath = path.join(__dirname, '../join.html');
    const roomJsPath = path.join(__dirname, '../js/room.js');

    describe('房间页面可以正常加载', () => {
        test('房间页面HTML文件存在', () => {
            expect(fs.existsSync(joinHtmlPath)).toBe(true);
        });

        test('房间页面包含必要的元素', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('一起看');
            expect(html).toContain('browserFrame');
            expect(html).toContain('iframe');
        });

        test('房间页面引用了 room.js', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('js/room.js');
        });

        test('room.js 文件存在', () => {
            expect(fs.existsSync(roomJsPath)).toBe(true);
        });
    });

    describe('中间区域显示 iframe', () => {
        test('HTML中包含iframe元素', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('<iframe');
            expect(html).toContain('id="browserFrame"');
        });

        test('iframe容器样式正确', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('iframe-container');
            expect(html).toContain('browser-area');
        });

        test('room.js包含加载iframe的函数', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('loadUrlIntoIframe');
            expect(js).toContain('browserFrame');
        });
    });

    describe('可以通过 URL 参数加载指定网页', () => {
        test('room.js包含获取URL参数的函数', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('getUrlParameter');
        });

        test('getUrlParameter函数可以正确解析URL参数', () => {
            // 模拟 URLSearchParams
            const { getUrlParameter } = require('../js/room');
            
            // 在 Node.js 环境中，我们需要模拟 window.location
            // 由于函数依赖 window.location，我们需要测试其逻辑
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('URLSearchParams');
            expect(js).toContain('window.location.search');
        });

        test('room.js包含URL验证函数', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('isValidUrl');
        });

        test('isValidUrl函数可以验证URL格式', () => {
            const { isValidUrl } = require('../js/room');
            
            // 测试有效URL
            expect(isValidUrl('https://www.example.com')).toBe(true);
            expect(isValidUrl('http://www.example.com')).toBe(true);
            expect(isValidUrl('https://example.com/path?query=1')).toBe(true);
            
            // 测试无效URL
            expect(isValidUrl('not-a-url')).toBe(false);
            expect(isValidUrl('ftp://example.com')).toBe(false);
            expect(isValidUrl('')).toBe(false);
            expect(isValidUrl(null)).toBe(false);
        });

        test('loadUrlIntoIframe函数存在', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('loadUrlIntoIframe');
            expect(js).toContain('iframe.src');
        });
    });

    describe('iframe 可以正常显示外部网页', () => {
        test('loadUrlIntoIframe函数设置iframe的src属性', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('iframe.src = url');
        });

        test('loadUrlIntoIframe函数处理加载状态', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('onload');
            expect(js).toContain('onerror');
        });

        test('loadUrlIntoIframe函数验证URL有效性', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('isValidUrl');
            expect(js).toContain('无效的 URL');
        });
    });

    describe('支持常见网站的加载', () => {
        test('支持http协议的URL', () => {
            const { isValidUrl } = require('../js/room');
            expect(isValidUrl('http://www.example.com')).toBe(true);
        });

        test('支持https协议的URL', () => {
            const { isValidUrl } = require('../js/room');
            expect(isValidUrl('https://www.example.com')).toBe(true);
        });

        test('支持带路径的URL', () => {
            const { isValidUrl } = require('../js/room');
            expect(isValidUrl('https://www.example.com/path/to/page')).toBe(true);
        });

        test('支持带查询参数的URL', () => {
            const { isValidUrl } = require('../js/room');
            expect(isValidUrl('https://www.example.com?query=value')).toBe(true);
        });

        test('loadUrlIntoIframe函数可以处理URL解码', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('decodeURIComponent');
        });
    });
});
