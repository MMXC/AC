# Task-45 实现指南：修复房间页面功能问题与错误

## 问题清单

### 1. 创建房间点击后房主未跳转至房间
**错误现象**: 创建房间成功后，房主未自动跳转到房间页面

**相关代码**:
- `watch-together/js/create-room.js` (189-205行)

**修复方案**:
1. 检查跳转逻辑是否正确执行
2. 确保 `window.location.assign` 或 `window.location.href` 正确调用
3. 检查是否有错误阻止了跳转
4. 在房间页面添加分享房间链接按钮（房主可见）

### 2. 房主昵称是跳转时读取创建房间时填写的
**错误现象**: 房主进入房间后仍需输入昵称

**相关代码**:
- `watch-together/js/create-room.js` (166-180行) - 保存房主信息
- `watch-together/js/room.js` (684-750行) - 读取房主信息

**修复方案**:
1. 在 `create-room.js` 中，创建房间成功后保存 `hostNickname` 到 localStorage:
   ```javascript
   window.localStorage.setItem('watch-together.hostNickname', hostNickname);
   window.localStorage.setItem('watch-together.isHost', 'true');
   ```
2. 在 `room.js` 的 `init()` 函数中:
   - 检查 localStorage 中是否有 `watch-together.isHost === 'true'`
   - 如果有，读取 `watch-together.hostNickname`
   - 跳过昵称输入界面，直接调用 `joinRoomWithNickname(roomId, hostUserId, hostNickname)`

### 3. 相同房间内成员需完整显示（同IP打开多个也需要显示多个成员）
**错误现象**: 成员列表未显示所有成员

**相关代码**:
- `watch-together/js/room.js` (28-123行) - 成员列表管理
- `watch-together-server/src/websocket.ts` - WebSocket 成员同步

**修复方案**:
1. 检查后端 WebSocket 是否正确发送 `MEMBER_JOINED` 事件
2. 检查前端是否正确监听和处理 `MEMBER_JOINED` 事件
3. 确保每个 WebSocket 连接都正确注册用户ID
4. 验证成员列表同步逻辑，确保所有连接的用户都被包含

### 4. 当前消息未显示自己和其它成员的消息
**错误现象**: 聊天消息未正确显示

**相关代码**:
- `watch-together/js/chat.js` (159-223行) - 消息处理
- `watch-together/js/chat.js` (286-355行) - 消息渲染

**修复方案**:
1. 检查 `handleWebSocketMessage` 中的 `CHAT_MESSAGE` 处理:
   - 确保正确调用 `addMessageToHistory`
   - 确保正确调用 `renderMessage`
2. 检查 `SYNC_STATE` 处理:
   - 确保 `messageHistory` 正确加载
   - 确保调用 `renderMessages()` 渲染所有消息
3. 检查消息发送逻辑:
   - 确保发送后消息被添加到历史记录
   - 确保发送后消息被渲染（或等待服务器回传）

### 5. 解决控制台报错问题

#### 5.1 API_BASE 重复声明错误
**错误**: `operation-source.js:1  Uncaught SyntaxError: Identifier 'API_BASE' has already been declared`

**相关代码**:
- `watch-together/js/room.js` (6行): `let API_BASE = 'http://localhost:3001';`
- `watch-together/js/operation-source.js` (6行): `let API_BASE = 'http://localhost:3001';`

**修复方案**:
```javascript
// 方案1: 使用 window.API_BASE（推荐）
if (typeof window !== 'undefined' && !window.API_BASE) {
    window.API_BASE = window.API_BASE_URL || 'http://localhost:3001';
}
const API_BASE = window.API_BASE;

// 方案2: 检查是否已定义
let API_BASE;
if (typeof window !== 'undefined' && window.API_BASE_URL) {
    API_BASE = window.API_BASE_URL;
} else if (typeof window !== 'undefined' && typeof window.API_BASE !== 'undefined') {
    API_BASE = window.API_BASE;
} else {
    API_BASE = 'http://localhost:3001';
    if (typeof window !== 'undefined') {
        window.API_BASE = API_BASE;
    }
}
```

#### 5.2 WebSocket 消息 JSON 解析错误
**错误**: `screen-streaming.js:130  处理 WebSocket 消息错误: SyntaxError: "[object Object]" is not valid JSON`

**相关代码**:
- `watch-together/js/screen-streaming.js` (112-132行)
- `watch-together/js/chat.js` (103-110行) - 已解析消息

**问题分析**:
- `chat.js` 中已经解析了 `event.data`: `const message = JSON.parse(event.data);`
- 但 `screen-streaming.js` 通过事件监听器接收消息时，`event.data` 可能已经是对象

**修复方案**:
```javascript
function handleWebSocketMessage(event) {
    try {
        // 检查 event.data 的类型
        let message;
        if (typeof event.data === 'string') {
            message = JSON.parse(event.data);
        } else if (typeof event.data === 'object') {
            message = event.data;
        } else {
            console.error('未知的消息数据类型:', typeof event.data);
            return;
        }
        
        if (message.type === 'SCREEN_STREAM_FRAME') {
            handleScreenFrame(message.data);
        } else if (message.type === 'SCREEN_STREAM_START') {
            handleScreenStreamStart(message.data);
        } else if (message.type === 'SCREEN_STREAM_STOP') {
            handleScreenStreamStop(message.data);
        } else if (message.type === 'SCREEN_STREAM_ERROR') {
            handleScreenStreamError(message.data);
        }
    } catch (error) {
        console.error('处理 WebSocket 消息错误:', error);
    }
}
```

或者修改事件监听方式，直接接收已解析的消息对象：
```javascript
// 在 chat.js 中，解析消息后分发事件
ws.onmessage = (event) => {
    try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
        
        // 分发已解析的消息给其他模块
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('websocketMessage', {
                detail: { message: message }
            }));
        }
    } catch (err) {
        console.error('解析 WebSocket 消息失败:', err);
    }
};

// 在 screen-streaming.js 中监听已解析的消息
window.addEventListener('websocketMessage', (event) => {
    const message = event.detail.message;
    handleWebSocketMessage(message);
});
```

## 实施步骤

### 步骤 1: 修复 API_BASE 重复声明
1. 修改 `watch-together/js/room.js`，使用 `window.API_BASE`
2. 修改 `watch-together/js/operation-source.js`，使用 `window.API_BASE`
3. 测试：打开房间页面，检查控制台无错误

### 步骤 2: 修复 WebSocket 消息解析
1. 修改 `watch-together/js/screen-streaming.js` 的 `handleWebSocketMessage` 函数
2. 检查 `event.data` 类型，正确处理字符串和对象
3. 测试：打开房间页面，发送消息，检查控制台无错误

### 步骤 3: 修复房主跳转和昵称
1. 修改 `watch-together/js/create-room.js`:
   - 确保跳转逻辑正确执行
   - 保存房主昵称到 localStorage
2. 修改 `watch-together/js/room.js`:
   - 在 `init()` 中检查是否为房主
   - 如果是房主，读取昵称并自动加入房间
3. 在 `watch-together/join.html` 添加分享房间链接按钮（房主可见）
4. 测试：创建房间，验证跳转和昵称读取

### 步骤 4: 修复成员列表显示
1. 检查后端 WebSocket 成员同步逻辑
2. 检查前端 `MEMBER_JOINED` 事件处理
3. 测试：打开多个标签页加入同一房间，验证所有成员显示

### 步骤 5: 修复消息显示
1. 检查 `chat.js` 中的消息处理逻辑
2. 确保消息正确添加到历史记录
3. 确保消息正确渲染
4. 测试：发送和接收消息，验证显示正常

## 测试验证

### 功能测试
1. ✅ 创建房间后房主自动跳转
2. ✅ 房主昵称自动读取
3. ✅ 普通成员昵称输入正常
4. ✅ 成员列表显示所有成员
5. ✅ 消息发送和接收正常
6. ✅ 分享房间链接按钮显示（房主）

### 错误检查
1. ✅ 控制台无 `API_BASE` 重复声明错误
2. ✅ 控制台无 JSON 解析错误
3. ✅ 控制台无其他错误

## 相关文件

- `watch-together/js/create-room.js` - 创建房间逻辑
- `watch-together/js/room.js` - 房间页面逻辑
- `watch-together/js/chat.js` - 聊天功能
- `watch-together/js/operation-source.js` - 操作来源管理
- `watch-together/js/screen-streaming.js` - 画面流功能
- `watch-together/join.html` - 房间页面 HTML
- `watch-together-server/src/websocket.ts` - WebSocket 服务端逻辑
