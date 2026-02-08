#!/usr/bin/env node
/**
 * 前端静态资源构建校验（多页面 HTML + 模块化 JS，无 bundler）。
 * 检查架构约定中的入口与目录是否存在，通过则退出 0。
 */
const fs = require("fs");
const path = require("path");

const required = [
  "index.html",
  "join.html",
  "js/room.js",
  "js/chat.js",
  "js/sync.js",
  "js/create-room.js",
  "docs/architecture-decisions.md",
];

let failed = false;
for (const rel of required) {
  const p = path.join(__dirname, "..", rel);
  if (!fs.existsSync(p)) {
    console.error("Missing required path:", rel);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log("Build check OK: required entries present.");
process.exit(0);
