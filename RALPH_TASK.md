---
backlog_id: backlog-55
task: 优化创建房间页面设计（index.html）- 字体与视觉风格
test_command: "cd watch-together && python -m http.server 8000"
---

# Task: 优化创建房间页面设计（index.html）- 字体与视觉风格

## Description

基于 frontend-design 技能要求，优化 `watch-together/index.html` 页面的视觉设计。替换系统字体为更有特色的字体组合（如：显示字体 + 正文字体配对），优化颜色方案和视觉细节（纹理、阴影、背景效果），确保不影响现有功能。

**Test Command**: `cd watch-together && python -m http.server 8000` 然后在浏览器中访问 http://localhost:8000/index.html 验证页面显示和功能正常

## Success Criteria

- [x] 替换系统字体为有特色的字体组合（如 Google Fonts），包含显示字体和正文字体配对
- [x] 优化颜色方案，使用 CSS 变量管理主题色，避免使用常见的紫色渐变
- [x] 添加视觉细节：纹理、阴影、背景效果（如渐变网格、噪点纹理、装饰性边框等）
- [x] 保持所有现有功能正常工作（表单提交、房间创建、链接复制等）
- [x] 页面在主流浏览器中显示正常，响应式设计保持良好
