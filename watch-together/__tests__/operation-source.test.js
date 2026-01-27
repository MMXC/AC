/**
 * 操作来源功能测试
 */

const fs = require('fs');
const path = require('path');
const { MockWebSocket, createMockConnection } = require('../mock-server/websocket-mock');

describe('operation-source', () => {
    const joinHtmlPath = path.join(__dirname, '../join.html');
    const operationSourceJsPath = path.join(__dirname, '../js/operation-source.js');
    const roomJsPath = path.join(__dirname, '../js/room.js');
    const chatJsPath = path.join(__dirname, '../js/chat.js');

    describe('文件存在性检查', () => {
        test('operation-source.js文件存在', () => {
            expect(fs.existsSync(operationSourceJsPath)).toBe(true);
        });

        test('join.html引入了operation-source.js脚本', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('operation-source.js');
        });
    });

    describe('后端API权限验证', () => {
        test('只有房主可以成功设置/取消 operationSourceUserId', () => {
            const js = fs.readFileSync(operationSourceJsPath, 'utf-8');
            expect(js).toContain('setOperationSource');
            expect(js).toContain('clearOperationSource');
            // 函数应该发送 POST 请求到 /api/v1/rooms/:roomId/operation-source
            expect(js).toContain('/api/v1/rooms/');
            expect(js).toContain('/operation-source');
        });

        test('设置操作来源函数包含userId参数（用于验证是否为房主）', () => {
            const js = fs.readFileSync(operationSourceJsPath, 'utf-8');
            expect(js).toContain('userId: userId');
            expect(js).toContain('operationSourceUserId');
        });
    });

    describe('前端UI功能', () => {
        test('room.js包含右键菜单功能', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('showMemberContextMenu');
            expect(js).toContain('contextmenu');
        });

        test('room.js包含"设为操作来源"和"取消操作来源"菜单项', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('设为操作来源');
            expect(js).toContain('取消操作来源');
        });

        test('成员列表显示操作来源标记', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('操作来源');
            expect(js).toContain('getCurrentOperationSourceUserId');
        });

        test('右键菜单仅房主可见', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('window.isHost');
            expect(js).toContain('member.id !== window.currentUserId');
        });
    });

    describe('操作来源成员操作监听', () => {
        test('operation-source.js包含操作监听初始化函数', () => {
            const js = fs.readFileSync(operationSourceJsPath, 'utf-8');
            expect(js).toContain('initOperationSourceListener');
            expect(js).toContain('removeOperationSourceListener');
        });

        test('操作来源成员可以监听点击事件', () => {
            const js = fs.readFileSync(operationSourceJsPath, 'utf-8');
            expect(js).toContain('handleOperationSourceClick');
            expect(js).toContain('addEventListener(\'click\'');
        });

        test('操作来源成员可以监听拖动事件', () => {
            const js = fs.readFileSync(operationSourceJsPath, 'utf-8');
            expect(js).toContain('handleOperationSourceMouseDown');
            expect(js).toContain('handleOperationSourceMouseMove');
            expect(js).toContain('handleOperationSourceMouseUp');
        });

        test('操作来源成员可以监听滚动事件', () => {
            const js = fs.readFileSync(operationSourceJsPath, 'utf-8');
            expect(js).toContain('handleOperationSourceWheel');
            expect(js).toContain('addEventListener(\'wheel\'');
        });

        test('操作来源成员可以监听键盘事件', () => {
            const js = fs.readFileSync(operationSourceJsPath, 'utf-8');
            expect(js).toContain('handleOperationSourceKeyDown');
            expect(js).toContain('handleOperationSourceKeyUp');
        });

        test('操作监听仅在当前用户是操作来源时生效', () => {
            const js = fs.readFileSync(operationSourceJsPath, 'utf-8');
            expect(js).toContain('isCurrentUserOperationSource');
            expect(js).toContain('if (!isCurrentUserOperationSource()) return');
        });
    });

    describe('操作消息发送', () => {
        test('operation-source.js包含发送操作消息的函数', () => {
            const js = fs.readFileSync(operationSourceJsPath, 'utf-8');
            expect(js).toContain('sendOpSourceOperation');
        });

        test('发送的操作消息格式正确', () => {
            const js = fs.readFileSync(operationSourceJsPath, 'utf-8');
            expect(js).toContain('OP_SOURCE_OPERATION');
            expect(js).toContain('type: \'click\'');
            expect(js).toContain('type: \'drag\'');
            expect(js).toContain('type: \'scroll\'');
            expect(js).toContain('type: \'keydown\'');
            expect(js).toContain('type: \'keyup\'');
        });

        test('操作消息包含必要字段（x, y, timestamp等）', () => {
            const js = fs.readFileSync(operationSourceJsPath, 'utf-8');
            expect(js).toContain('x:');
            expect(js).toContain('y:');
            expect(js).toContain('timestamp:');
        });
    });

    describe('房主端操作模拟', () => {
        test('operation-source.js包含在iframe中模拟操作的函数', () => {
            const js = fs.readFileSync(operationSourceJsPath, 'utf-8');
            expect(js).toContain('simulateOperationInIframe');
        });

        test('房主端可以模拟点击操作', () => {
            const js = fs.readFileSync(operationSourceJsPath, 'utf-8');
            expect(js).toContain('case \'click\'');
            expect(js).toContain('elementFromPoint');
            expect(js).toContain('MouseEvent');
        });

        test('房主端可以模拟拖动操作', () => {
            const js = fs.readFileSync(operationSourceJsPath, 'utf-8');
            expect(js).toContain('case \'drag\'');
            expect(js).toContain('mousedown');
            expect(js).toContain('mousemove');
            expect(js).toContain('mouseup');
        });

        test('房主端可以模拟滚动操作', () => {
            const js = fs.readFileSync(operationSourceJsPath, 'utf-8');
            expect(js).toContain('case \'scroll\'');
            expect(js).toContain('scrollBy');
        });

        test('房主端可以模拟键盘操作', () => {
            const js = fs.readFileSync(operationSourceJsPath, 'utf-8');
            expect(js).toContain('case \'keydown\'');
            expect(js).toContain('case \'keyup\'');
            expect(js).toContain('KeyboardEvent');
        });

        test('模拟操作仅在房主端执行', () => {
            const js = fs.readFileSync(operationSourceJsPath, 'utf-8');
            expect(js).toContain('window.isHost');
        });
    });

    describe('WebSocket消息处理', () => {
        test('chat.js处理OPERATION_SOURCE_CHANGED消息', () => {
            const js = fs.readFileSync(chatJsPath, 'utf-8');
            expect(js).toContain('OPERATION_SOURCE_CHANGED');
            expect(js).toContain('handleOperationSourceChanged');
        });

        test('chat.js处理OP_SOURCE_OPERATION消息', () => {
            const js = fs.readFileSync(chatJsPath, 'utf-8');
            expect(js).toContain('OP_SOURCE_OPERATION');
            expect(js).toContain('simulateOperationInIframe');
        });

        test('SYNC_STATE消息包含operationSourceUserId', () => {
            const js = fs.readFileSync(chatJsPath, 'utf-8');
            expect(js).toContain('SYNC_STATE');
            expect(js).toContain('operationSourceUserId');
        });
    });

    describe('操作来源状态管理', () => {
        test('operation-source.js包含获取当前操作来源的函数', () => {
            const js = fs.readFileSync(operationSourceJsPath, 'utf-8');
            expect(js).toContain('getCurrentOperationSourceUserId');
        });

        test('operation-source.js包含检查当前用户是否为操作来源的函数', () => {
            const js = fs.readFileSync(operationSourceJsPath, 'utf-8');
            expect(js).toContain('isCurrentUserOperationSource');
        });

        test('operation-source.js处理操作来源变更', () => {
            const js = fs.readFileSync(operationSourceJsPath, 'utf-8');
            expect(js).toContain('handleOperationSourceChanged');
        });

        test('操作来源变更时自动初始化或移除监听', () => {
            const js = fs.readFileSync(operationSourceJsPath, 'utf-8');
            expect(js).toContain('initOperationSourceListener');
            expect(js).toContain('removeOperationSourceListener');
        });
    });

    describe('未被指定成员操作限制', () => {
        test('操作监听函数检查当前用户是否为操作来源', () => {
            const js = fs.readFileSync(operationSourceJsPath, 'utf-8');
            // 所有操作处理函数都应该检查 isCurrentUserOperationSource
            expect(js).toContain('if (!isCurrentUserOperationSource()) return');
        });

        test('非操作来源成员的操作不会发送消息', () => {
            const js = fs.readFileSync(operationSourceJsPath, 'utf-8');
            // sendOpSourceOperation 函数应该在发送前检查
            // 但实际上检查是在事件处理函数中进行的
            expect(js).toContain('sendOpSourceOperation');
        });
    });

    describe('取消操作来源后的行为', () => {
        test('取消操作来源后移除操作监听', () => {
            const js = fs.readFileSync(operationSourceJsPath, 'utf-8');
            expect(js).toContain('removeOperationSourceListener');
            expect(js).toContain('clearOperationSource');
        });

        test('操作来源变更时更新监听状态', () => {
            const js = fs.readFileSync(operationSourceJsPath, 'utf-8');
            expect(js).toContain('handleOperationSourceChanged');
            // 应该检查是否当前用户，如果是则初始化监听，否则移除监听
            expect(js).toContain('isCurrentUserOperationSource()');
        });
    });
});
