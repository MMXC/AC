---
id: TASK-127
title: 点击共享画面后房主端与成员端画面均无法加载
status: Done
assignee: []
created_date: '2026-02-02 08:38'
updated_date: '2026-02-02 20:41'
labels: []
dependencies: []
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
房主点击「共享画面」（或「开始共享」）后，房主端本地预览与成员端远端画面均加载不出来（黑屏、一直转圈或占位不消失）。需排查：房主端 getDisplayMedia 是否成功、本地 video 是否绑定流、WebRTC/画面流信令与媒体通路是否建立、成员端是否收到流并正确 attach 到 video 元素。可参考 Remotion 技能中与视频/流渲染相关的实践，或评估是否引入 Remotion 作为共享内容源的一种方案。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**测试用例**:

**测试场景**:
1. 房主进入房间，至少一名成员加入
2. 房主点击「开始共享」/「共享画面」，在系统弹窗中选择屏幕或窗口并允许
3. 检查房主端：画面容器内是否有视频帧（非黑屏、非一直「正在连接」）
4. 检查成员端：画面容器内是否在数秒内出现房主共享的画面

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 房主点击「开始共享」并授权后，房主端画面区域（如 #videoStream 或占位区）显示本地共享画面
- [ ] #2 成员端在房主开始共享后的约定时间内，画面区域显示房主共享的画面（非长期占位/转圈）
- [ ] #3 房主点击「停止共享」后，房主端与成员端均正确恢复占位或隐藏画面区域（可选）
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-02-03 04:41:41 - 任务完成，RALPH_TASK.md 已归档

---

## 测试通过 (Test Passed)

- **测试时间**: 2026-02-03 04:41:41
- **测试结果截图** (保存在 `backlog/test-results/task-127/`):
  - [final.png](backlog/test-results/task-127/final.png)
  - [initial.png](backlog/test-results/task-127/initial.png)
  - [member-joined.png](backlog/test-results/task-127/member-joined.png)

---

## RALPH_TASK.md 归档内容

```
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

- [x] #1 房主点击「开始共享」并授权后，房主端画面区域（如 #videoStream 或占位区）显示本地共享画面
- [x] #2 成员端在房主开始共享后的约定时间内，画面区域显示房主共享的画面（非长期占位/转圈）
- [x] #3 房主点击「停止共享」后，房主端与成员端均正确恢复占位或隐藏画面区域（可选）

## Implementation Steps

1. **1.1 房主端本地预览必须显式 play()** — done when: 房主点击「开始共享」并授权后，`#videoStream` 已绑定流且调用了 `videoElement.play()`，画面区域有视频帧（非黑屏）。
2. **1.2 确保房主端画面容器在开始共享时显示** — done when: 开始共享时 `#videoContainer` 为 display flex、`#videoPlaceholder` 隐藏、`#videoStream` 显示。
3. **1.3 成员端 ontrack 绑定流并显示** — done when: 成员端收到远端 track 后调用 `VideoPlayer.attachStream(remoteStream)` 且容器/占位符状态正确。
4. **2.1 运行测试** — done when: `skill:watch-together-webapp-testing TASK-127` 或本地双浏览器手动验证房主/成员端画面均能加载。
```
<!-- SECTION:NOTES:END -->
