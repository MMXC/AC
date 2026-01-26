/**
 * 路由导航功能测试
 */

const { app, server, rooms } = require('../mock-server/server');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 设置测试环境
const API_BASE = 'http://localhost:3001';
process.env.API_BASE = API_BASE;

// 导入路由相关函数
const { generateRoomLink } = require('../js/create-room');
const { getRoomIdFromPath, getUrlParameter, validateRoom, showError } = require('../js/room');

describe('路由导航', () => {
    let testServer;

    beforeAll((done) => {
        // 启动测试服务器
        testServer = server.listen(3001, () => {
            console.log('测试服务器已启动');
            done();
        });
    });

    afterAll((done) => {
        // 清理测试数据
        rooms.clear();
        // 关闭测试服务器
        testServer.close(() => {
            console.log('测试服务器已关闭');
            done();
        });
    });

    beforeEach(() => {
        // 每个测试前清空房间数据
        rooms.clear();
    });

    describe('首页路由 / 可以正常访问', () => {
        test('首页HTML文件存在', () => {
            const indexPath = path.join(__dirname, '../index.html');
            expect(fs.existsSync(indexPath)).toBe(true);
        });

        test('首页路由返回200状态码', (done) => {
            http.get('http://localhost:3001/', (res) => {
                expect(res.statusCode).toBe(200);
                expect(res.headers['content-type']).toContain('text/html');
                done();
            }).on('error', (err) => {
                done(err);
            });
        });

        test('首页包含创建房间表单', (done) => {
            http.get('http://localhost:3001/', (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    expect(data).toContain('createRoomForm');
                    expect(data).toContain('创建房间');
                    done();
                });
            }).on('error', (err) => {
                done(err);
            });
        });
    });

    describe('房间路由 /room/:roomId 可以正常访问', () => {
        test('房间页面HTML文件存在', () => {
            const joinPath = path.join(__dirname, '../join.html');
            expect(fs.existsSync(joinPath)).toBe(true);
        });

        test('房间路由返回200状态码', (done) => {
            http.get('http://localhost:3001/room/test-room-123', (res) => {
                expect(res.statusCode).toBe(200);
                expect(res.headers['content-type']).toContain('text/html');
                done();
            }).on('error', (err) => {
                done(err);
            });
        });

        test('房间页面包含房间相关元素', (done) => {
            http.get('http://localhost:3001/room/test-room-123', (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    expect(data).toContain('browserFrame');
                    expect(data).toContain('sidebarRoomId');
                    expect(data).toContain('membersList');
                    done();
                });
            }).on('error', (err) => {
                done(err);
            });
        });
    });

    describe('通过房间链接可以正确跳转到房间页面', () => {
        test('generateRoomLink 生成正确的房间链接格式', () => {
            const roomId = 'room-abc123';
            const link = generateRoomLink(roomId);
            expect(link).toContain('/room/');
            expect(link).toContain(roomId);
            expect(link).toMatch(/\/room\/room-abc123$/);
        });

        test('房间链接格式正确（包含完整URL）', () => {
            const roomId = 'room-xyz789';
            const link = generateRoomLink(roomId);
            expect(link).toMatch(/^https?:\/\/.+\/room\/room-xyz789$/);
        });
    });

    describe('URL 参数可以正确解析', () => {
        test('getRoomIdFromPath 可以从 /room/:roomId 路径解析房间ID', () => {
            // 模拟 window.location.pathname
            const originalPathname = global.window?.location?.pathname;
            
            // 创建模拟的 window 对象
            global.window = {
                location: {
                    pathname: '/room/room-test-123',
                    search: ''
                }
            };

            const roomId = getRoomIdFromPath();
            expect(roomId).toBe('room-test-123');

            // 清理
            if (originalPathname !== undefined) {
                global.window.location.pathname = originalPathname;
            } else {
                delete global.window;
            }
        });

        test('getRoomIdFromPath 兼容旧格式 /join/:roomId', () => {
            global.window = {
                location: {
                    pathname: '/join/room-old-456',
                    search: ''
                }
            };

            const roomId = getRoomIdFromPath();
            expect(roomId).toBe('room-old-456');

            delete global.window;
        });

        test('getUrlParameter 可以正确解析查询参数', () => {
            global.window = {
                location: {
                    pathname: '/room/room-test',
                    search: '?url=https://example.com&name=test'
                }
            };

            const url = getUrlParameter('url');
            const name = getUrlParameter('name');
            const notExist = getUrlParameter('notExist');

            expect(url).toBe('https://example.com');
            expect(name).toBe('test');
            expect(notExist).toBeNull();

            delete global.window;
        });

        test('getRoomIdFromPath 可以从查询参数获取房间ID（降级方案）', () => {
            global.window = {
                location: {
                    pathname: '/join.html',
                    search: '?roomId=room-query-789'
                }
            };

            const roomId = getRoomIdFromPath();
            expect(roomId).toBe('room-query-789');

            delete global.window;
        });
    });

    describe('无效房间号显示错误提示', () => {
        test('validateRoom 对不存在的房间返回错误', async () => {
            const result = await validateRoom('non-existent-room');
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('不存在');
        });

        test('validateRoom 对空房间号返回错误', async () => {
            const result = await validateRoom('');
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
        });

        test('validateRoom 对存在的房间返回成功', async () => {
            // 先创建一个房间
            const createResponse = await fetch(`${API_BASE}/api/rooms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: '测试房间' })
            });
            const createData = await createResponse.json();
            const roomId = createData.data.id;

            // 验证房间
            const result = await validateRoom(roomId);
            expect(result.valid).toBe(true);
            expect(result.room).toBeDefined();
            expect(result.room.id).toBe(roomId);
        });

        test('showError 函数存在且可调用', () => {
            expect(typeof showError).toBe('function');
        });
    });

    describe('路由集成测试', () => {
        test('完整的路由流程：创建房间 -> 生成链接 -> 访问房间页面', async () => {
            // 创建房间
            const createResponse = await fetch(`${API_BASE}/api/rooms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: '集成测试房间' })
            });
            const createData = await createResponse.json();
            const roomId = createData.data.id;

            // 生成链接
            const link = generateRoomLink(roomId);
            expect(link).toContain(`/room/${roomId}`);

            // 验证房间存在
            const validation = await validateRoom(roomId);
            expect(validation.valid).toBe(true);

            // 访问房间页面（通过HTTP请求）
            return new Promise((resolve, reject) => {
                http.get(`http://localhost:3001/room/${roomId}`, (res) => {
                    expect(res.statusCode).toBe(200);
                    let data = '';
                    res.on('data', (chunk) => {
                        data += chunk;
                    });
                    res.on('end', () => {
                        expect(data).toContain('一起看');
                        resolve();
                    });
                }).on('error', reject);
            });
        });
    });
});
