/** @jest-environment jsdom */

/**
 * 创建房间前端页面 UI 测试（URL 必填 + 自动进入房间）
 */

const fs = require('fs');
const path = require('path');

function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

describe('创建房间前端页面改造（URL 必填 & 自动跳转）', () => {
  let originalFetch;

  beforeEach(() => {
    // 加载首页 HTML 作为测试 DOM
    const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf-8');
    document.documentElement.innerHTML = html;

    // 确保初始地址为首页
    window.location.href = window.location.origin + '/';

    // Mock fetch
    originalFetch = global.fetch;
    global.fetch = jest.fn();

    // 清理 localStorage
    window.localStorage.clear();

    // 重新加载模块并触发 DOMContentLoaded，挂载事件处理
    jest.resetModules();
    require('../js/create-room');
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetModules();
  });

  test('URL 为空时阻止提交并显示错误提示', async () => {
    const form = document.getElementById('createRoomForm');
    const targetUrlInput = document.getElementById('targetUrl');
    const errorEl = document.getElementById('error');

    targetUrlInput.value = '';

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(errorEl.classList.contains('show')).toBe(true);
    expect(errorEl.textContent).toContain('http:// 或 https://');
  });

  test('非法 URL（非 http/https）时阻止提交并显示错误提示', async () => {
    const form = document.getElementById('createRoomForm');
    const targetUrlInput = document.getElementById('targetUrl');
    const errorEl = document.getElementById('error');

    targetUrlInput.value = 'ftp://example.com/file';

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(errorEl.classList.contains('show')).toBe(true);
    expect(errorEl.textContent).toContain('http:// 或 https://');
  });

  test('合法 URL 时会调用创建房间接口并自动跳转到房间页面', async () => {
    const form = document.getElementById('createRoomForm');
    const targetUrlInput = document.getElementById('targetUrl');
    const roomNameInput = document.getElementById('roomName');
    const hostNicknameInput = document.getElementById('hostNickname');

    const url = 'https://example.com/watch';
    const roomId = 'room-abc12345';
    const hostUserId = 'user-host12345';

    targetUrlInput.value = url;
    roomNameInput.value = '测试房间';
    hostNicknameInput.value = '测试房主';

    // Mock fetch 返回后端成功响应
    global.fetch.mockResolvedValue({
      ok: true,
      status: 201,
      headers: {
        get: () => 'application/json',
      },
      json: async () => ({
        success: true,
        data: {
          roomId,
          hostUserId,
          currentUrl: url,
          inviteLink: `/room/${roomId}`,
          id: roomId,
          name: '测试房间',
        },
      }),
    });

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();

    // 校验至少调用了一次创建房间接口，并包含 URL 字段
    expect(global.fetch).toHaveBeenCalled();
    const [calledUrl, options] = global.fetch.mock.calls[0];
    expect(calledUrl).toContain('/api/v1/rooms');
    const body = JSON.parse(options.body);
    expect(body.url).toBe(url);
    expect(body.name).toBe('测试房间');
    expect(body.hostNickname).toBe('测试房主');

    // 校验本地存储了必要的标识
    expect(window.localStorage.getItem('watch-together.roomId')).toBe(roomId);
    expect(window.localStorage.getItem('watch-together.userId')).toBe(hostUserId);
    expect(window.localStorage.getItem('watch-together.isHost')).toBe('true');
    expect(window.localStorage.getItem('watch-together.currentUrl')).toBe(url);

    // 校验自动跳转到了房间页面，且不需要再拼接 ?url
    const expectedOrigin = window.location.origin || 'http://localhost';
    const roomLinkInput = document.getElementById('roomLink');
    const linkValue = roomLinkInput.value;
    expect(linkValue).toBe(`${expectedOrigin}/room/${roomId}`);
    expect(linkValue.includes('?url=')).toBe(false);
  });
});

