# 测试用例生成示例

## 改进内容

现在每个任务都会自动生成：

1. **测试数据**：具体的输入和预期输出
2. **测试场景**：多个测试场景描述
3. **断言示例**：可执行的断言代码

## 示例：创建首页 - 房间创建功能

### 任务信息
- **ID**: watch-together-001
- **标题**: 创建首页 - 房间创建功能
- **测试命令**: `npm test -- --testNamePattern='首页创建房间'`

### 成功标准
1. [ ] 首页可以正常访问
2. [ ] 点击创建房间按钮可以创建新房间
3. [ ] 生成唯一的房间号
4. [ ] 生成可分享的房间链接
5. [ ] 房间链接格式正确

### 测试用例（自动生成）

#### 测试数据
1. 输入: `点击创建房间按钮`
   预期输出: `生成房间号和链接`

2. 输入: `房间号格式`
   预期输出: `唯一字符串，如 'room-abc123'`

#### 测试场景
1. 场景1: 用户访问首页，点击创建房间按钮
2. 场景2: 验证生成的房间号唯一性
3. 场景3: 验证房间链接格式正确（包含房间号）

#### 断言示例
1. `assert(roomId).toBeDefined()`
2. `assert(roomId).toMatch(/^room-[a-z0-9]+$/)`
3. `assert(roomLink).toContain(roomId)`
4. `assert(roomLink).toMatch(/^https?:\/\/.+\/room\/[a-z0-9-]+$/)`

## 示例：Mock 数据和 API 模拟

### 测试用例（自动生成）

#### 测试数据
1. 输入: `POST /api/rooms`
   预期输出: `{roomId: 'room-123', members: [], createdAt: '2024-01-01T10:00:00Z'}`

2. 输入: `GET /api/rooms/room-123`
   预期输出: `{roomId: 'room-123', members: [{id: 'user1', name: 'Alice'}]}`

#### 测试场景
1. 场景1: 创建房间 API Mock 返回正确的数据结构
2. 场景2: 获取房间信息 API Mock 返回房间数据和成员列表
3. 场景3: WebSocket Mock 可以模拟实时消息
4. 场景4: Mock 数据格式与真实 API 一致

#### 断言示例
1. `expect(mockResponse.data).toHaveProperty('roomId')`
2. `expect(mockResponse.data).toHaveProperty('members')`
3. `expect(mockResponse.data.members).toBeArray()`
4. `expect(mockResponse.status).toBe(200)`
5. `expect(mockResponse.data.roomId).toMatch(/^room-[a-z0-9]+$/)`

## 在 backlog.md 中的格式

```markdown
### [ ] 创建首页 - 房间创建功能

**ID**: watch-together-001  
**Status**: To Do

**Description**:  
实现首页，包含创建房间功能，生成唯一房间号和房间链接

**Test Command**: `npm test -- --testNamePattern='首页创建房间'`

**Success Criteria**:
1. [ ] 首页可以正常访问
2. [ ] 点击创建房间按钮可以创建新房间
3. [ ] 生成唯一的房间号
4. [ ] 生成可分享的房间链接
5. [ ] 房间链接格式正确

**测试用例**:

**测试数据**:
1. 输入: `点击创建房间按钮`
   预期输出: `生成房间号和链接`
2. 输入: `房间号格式`
   预期输出: `唯一字符串，如 'room-abc123'`

**测试场景**:
1. 场景1: 用户访问首页，点击创建房间按钮
2. 场景2: 验证生成的房间号唯一性
3. 场景3: 验证房间链接格式正确（包含房间号）

**断言示例**:
1. `assert(roomId).toBeDefined()`
2. `assert(roomId).toMatch(/^room-[a-z0-9]+$/)`
3. `assert(roomLink).toContain(roomId)`
4. `assert(roomLink).toMatch(/^https?:\/\/.+\/room\/[a-z0-9-]+$/)`

---
```

## 在 RALPH_TASK.md 中的格式

生成的 `RALPH_TASK.md` 会包含：

```markdown
## Success Criteria

1. [ ] 首页可以正常访问
2. [ ] 点击创建房间按钮可以创建新房间
...

## Test Cases

### Test Data

1. 输入: `点击创建房间按钮`
   预期输出: `生成房间号和链接`
...

### Test Scenarios

1. 场景1: 用户访问首页，点击创建房间按钮
...

### Assertions

1. `assert(roomId).toBeDefined()`
...
```

## 使用方式

运行智能分解工具时，会自动为每个任务生成测试用例：

```bash
python .cursor/ralph-scripts/smart-decompose.py "你的需求描述"
```

生成的任务会包含：
- ✅ 明确的成功标准
- ✅ 具体的测试数据
- ✅ 详细的测试场景
- ✅ 可执行的断言示例

这样 Ralph 执行任务时，可以直接使用这些测试用例来验证功能是否完成。
