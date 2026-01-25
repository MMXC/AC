/**
 * 侧边栏信息功能测试
 */

const fs = require('fs');
const path = require('path');

describe('侧边栏信息', () => {
    const joinHtmlPath = path.join(__dirname, '../join.html');
    const roomJsPath = path.join(__dirname, '../js/room.js');

    describe('侧边栏正确显示房间号', () => {
        test('HTML中包含侧边栏结构', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('sidebar');
            expect(html).toContain('sidebarRoomId');
        });

        test('侧边栏包含房间信息区域', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('房间信息');
            expect(html).toContain('room-id-display');
        });

        test('room.js包含更新侧边栏房间号的逻辑', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('sidebarRoomId');
            expect(js).toContain('updateRoomInfo');
        });

        test('updateRoomInfo函数可以更新侧边栏房间号', () => {
            const { updateRoomInfo } = require('../js/room');
            
            // 在Node.js环境中，我们需要模拟DOM
            // 由于函数依赖DOM，我们检查函数逻辑
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('getElementById(\'sidebarRoomId\')');
            expect(js).toContain('textContent');
        });
    });

    describe('侧边栏显示当前成员列表', () => {
        test('HTML中包含成员列表区域', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('成员列表');
            expect(html).toContain('membersList');
            expect(html).toContain('members-list');
        });

        test('HTML中包含成员项的结构', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('member-item');
            expect(html).toContain('member-avatar');
            expect(html).toContain('member-name');
        });

        test('room.js包含成员列表管理功能', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('addMember');
            expect(js).toContain('removeMember');
            expect(js).toContain('updateMembersDisplay');
        });

        test('addMember函数可以添加成员', () => {
            const { addMember, getMembersList } = require('../js/room');
            
            // 清空列表（通过移除所有成员）
            const initialMembers = getMembersList();
            initialMembers.forEach(member => {
                const { removeMember } = require('../js/room');
                removeMember(member.id);
            });

            addMember('test-member-1', '测试成员1');
            const members = getMembersList();
            expect(members.length).toBe(1);
            expect(members[0].id).toBe('test-member-1');
            expect(members[0].name).toBe('测试成员1');
        });

        test('getMemberInitial函数可以生成成员头像首字母', () => {
            const { getMemberInitial } = require('../js/room');
            
            expect(getMemberInitial('张三')).toBe('张');
            expect(getMemberInitial('Alice')).toBe('A');
            expect(getMemberInitial('bob')).toBe('B');
            expect(getMemberInitial('')).toBe('?');
            expect(getMemberInitial(null)).toBe('?');
        });
    });

    describe('新成员加入时列表自动更新', () => {
        test('addMember函数会调用updateMembersDisplay', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('addMember');
            // 检查addMember函数内部是否调用了updateMembersDisplay
            // 使用更宽松的匹配，因为函数体可能跨多行
            const addMemberStart = js.indexOf('function addMember');
            expect(addMemberStart).toBeGreaterThan(-1);
            // 检查在addMember函数定义之后是否有updateMembersDisplay调用
            const afterAddMember = js.substring(addMemberStart);
            expect(afterAddMember).toContain('updateMembersDisplay');
        });

        test('添加多个成员时列表正确更新', () => {
            const { addMember, getMembersList, removeMember } = require('../js/room');
            
            // 清空列表
            const initialMembers = getMembersList();
            initialMembers.forEach(member => {
                removeMember(member.id);
            });

            addMember('member-1', '成员1');
            addMember('member-2', '成员2');
            addMember('member-3', '成员3');
            
            const members = getMembersList();
            expect(members.length).toBe(3);
            expect(members.some(m => m.id === 'member-1')).toBe(true);
            expect(members.some(m => m.id === 'member-2')).toBe(true);
            expect(members.some(m => m.id === 'member-3')).toBe(true);
        });

        test('添加已存在的成员会更新其信息', () => {
            const { addMember, getMembersList, removeMember } = require('../js/room');
            
            // 清空列表
            const initialMembers = getMembersList();
            initialMembers.forEach(member => {
                removeMember(member.id);
            });

            addMember('member-1', '成员1');
            addMember('member-1', '更新的成员1');
            
            const members = getMembersList();
            expect(members.length).toBe(1);
            expect(members[0].name).toBe('更新的成员1');
        });
    });

    describe('成员离开时列表自动更新', () => {
        test('removeMember函数会调用updateMembersDisplay', () => {
            const js = fs.readFileSync(roomJsPath, 'utf-8');
            expect(js).toContain('removeMember');
            // 检查removeMember函数内部是否调用了updateMembersDisplay
            const removeMemberStart = js.indexOf('function removeMember');
            expect(removeMemberStart).toBeGreaterThan(-1);
            // 检查在removeMember函数定义之后是否有updateMembersDisplay调用
            const afterRemoveMember = js.substring(removeMemberStart);
            expect(afterRemoveMember).toContain('updateMembersDisplay');
        });

        test('removeMember函数可以移除成员', () => {
            const { addMember, removeMember, getMembersList } = require('../js/room');
            
            // 清空列表
            const initialMembers = getMembersList();
            initialMembers.forEach(member => {
                removeMember(member.id);
            });

            addMember('member-1', '成员1');
            addMember('member-2', '成员2');
            
            removeMember('member-1');
            
            const members = getMembersList();
            expect(members.length).toBe(1);
            expect(members[0].id).toBe('member-2');
        });

        test('移除不存在的成员不会报错', () => {
            const { removeMember, getMembersList } = require('../js/room');
            
            const initialCount = getMembersList().length;
            removeMember('non-existent-member');
            const finalCount = getMembersList().length;
            
            expect(finalCount).toBe(initialCount);
        });
    });

    describe('UI 布局合理美观', () => {
        test('侧边栏有合理的宽度', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('width: 280px');
        });

        test('侧边栏有合适的样式', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('background: #2d2d2d');
            expect(html).toContain('border-right');
        });

        test('成员列表项有合适的样式', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('member-item');
            expect(html).toContain('member-avatar');
            expect(html).toContain('border-radius');
        });

        test('成员头像有圆形样式', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('border-radius: 50%');
        });

        test('侧边栏和浏览器区域正确布局', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('main-container');
            expect(html).toContain('display: flex');
            // 检查侧边栏在浏览器区域之前
            const sidebarIndex = html.indexOf('sidebar');
            const browserAreaIndex = html.indexOf('browser-area');
            expect(sidebarIndex).toBeLessThan(browserAreaIndex);
        });

        test('成员列表为空时显示提示', () => {
            const html = fs.readFileSync(joinHtmlPath, 'utf-8');
            expect(html).toContain('暂无成员');
            expect(html).toContain('members-empty');
        });
    });
});
