/**
 * 首页创建房间功能测试
 */

const { app, server, rooms } = require('../mock-server/server');
const http = require('http');

// 设置测试环境
const API_BASE = 'http://localhost:3001';
process.env.API_BASE = API_BASE;

// 导入创建房间函数（需要设置环境变量后）
const { createRoom, generateRoomLink } = require('../js/create-room');

describe('首页创建房间', () => {
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

    describe('首页可以正常访问', () => {
        test('首页HTML文件存在', () => {
            const fs = require('fs');
            const path = require('path');
            const indexPath = path.join(__dirname, '../index.html');
            expect(fs.existsSync(indexPath)).toBe(true);
        });

        test('首页包含创建房间按钮', () => {
            const fs = require('fs');
            const path = require('path');
            const indexPath = path.join(__dirname, '../index.html');
            const html = fs.readFileSync(indexPath, 'utf-8');
            expect(html).toContain('创建房间');
            expect(html).toContain('createBtn');
        });
    });

    describe('点击创建房间按钮可以创建新房间', () => {
        test('可以成功创建房间', async () => {
            const roomName = '测试房间';
            const hostNickname = '测试房主';

            const room = await createRoom(roomName, hostNickname);

            expect(room).toBeDefined();
            expect(room.name).toBe(roomName);
            expect(room.members).toBeDefined();
            expect(room.members.length).toBe(1);
            expect(room.members[0].nickname).toBe(hostNickname);
            expect(room.members[0].isHost).toBe(true);
        });

        test('可以不提供房间名称创建房间', async () => {
            const room = await createRoom();

            expect(room).toBeDefined();
            expect(room.name).toBe('未命名房间');
        });

        test('可以不提供昵称创建房间', async () => {
            const room = await createRoom('测试房间');

            expect(room).toBeDefined();
            expect(room.members.length).toBe(1);
            expect(room.members[0].nickname).toBe('房主');
        });
    });

    describe('生成唯一的房间号', () => {
        test('每次创建的房间号都不同', async () => {
            const room1 = await createRoom('房间1');
            const room2 = await createRoom('房间2');
            const room3 = await createRoom('房间3');

            expect(room1.id).not.toBe(room2.id);
            expect(room2.id).not.toBe(room3.id);
            expect(room1.id).not.toBe(room3.id);
        });

        test('房间号格式正确', async () => {
            const room = await createRoom();

            expect(room.id).toMatch(/^room-[a-f0-9]{8}$/);
        });
    });

    describe('生成可分享的房间链接', () => {
        test('生成房间链接', () => {
            const roomId = 'room-abc12345';
            const link = generateRoomLink(roomId);

            expect(link).toContain(roomId);
            expect(link).toMatch(/\/join\/room-[a-f0-9]+$/);
        });

        test('房间链接格式正确', () => {
            const roomId = 'room-abc12345';
            const link = generateRoomLink(roomId);

            // 链接应该包含 /join/ 路径
            expect(link).toContain('/join/');
            // 链接应该以房间ID结尾
            expect(link.endsWith(roomId)).toBe(true);
        });

        test('创建房间后返回的房间数据包含链接信息', async () => {
            const room = await createRoom('测试房间');

            // 服务器返回的房间数据应该包含 inviteLink
            expect(room.inviteLink).toBeDefined();
            expect(typeof room.inviteLink).toBe('string');
            expect(room.inviteLink).toContain(room.id);
        });
    });

    describe('房间链接格式正确', () => {
        test('链接包含正确的路径结构', () => {
            const roomId = 'room-test123';
            const link = generateRoomLink(roomId);

            // 应该包含 /join/ 路径和房间ID
            expect(link).toContain('/join/');
            expect(link).toContain(roomId);
            expect(link.endsWith(roomId)).toBe(true);
        });

        test('链接可以用于分享', async () => {
            const room = await createRoom('分享测试房间');

            // 服务器返回的 inviteLink 应该是一个有效的URL
            expect(room.inviteLink).toMatch(/^https?:\/\//);
            expect(room.inviteLink).toContain('/join/');
            expect(room.inviteLink).toContain(room.id);
        });
    });
});
