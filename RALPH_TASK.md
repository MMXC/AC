---
backlog_id: backlog-127
task: 点击共享画面后房主端与成员端画面均无法加载
test_command: "skill:watch-together-webapp-testing ${TASK_ID}"
---

# Task: 点击共享画面后房主端与成员端画面均无法加载

## Description

房主点击「共享画面」（或「开始共享」）后，房主端本地预览与成员端远端画面均加载不出来（黑屏、一直转圈或占位不消失）。需排查：房主端 getDisplayMedia 是否成功、本地 video 是否绑定流、WebRTC/画面流信令与媒体通路是否建立、成员端是否收到流并正确 attach 到 video 元素。可参考 Remotion 技能中与视频/流渲染相关的实践，或评估是否引入 Remotion 作为共享内容源的一种方案。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**测试用例**:

**测试场景**:
1. 房主进入房间，至少一名成员加入
2. 房主点击「开始共享」/「共享画面」，在系统弹窗中选择屏幕或窗口并允许
3. 检查房主端：画面容器内是否有视频帧（非黑屏、非一直「正在连接」）
4. 检查成员端：画面容器内是否在数秒内出现房主共享的画面

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

## Success Criteria

- [ ] #1 房主点击「开始共享」并授权后，房主端画面区域（如 #videoStream 或占位区）显示本地共享画面
- [ ] #2 成员端在房主开始共享后的约定时间内，画面区域显示房主共享的画面（非长期占位/转圈）
- [ ] #3 房主点击「停止共享」后，房主端与成员端均正确恢复占位或隐藏画面区域（可选）

## Implementation Steps

<!-- 细化约定时填写：步骤 + 每步验收，例如 -->
<!-- 1.1 加路由 — done when: GET /api/v1/rooms 返回 200 -->
<!-- 1.2 写 handler — done when: POST 入参校验失败返回 400 -->
