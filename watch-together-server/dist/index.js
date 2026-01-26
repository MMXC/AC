"use strict";
/**
 * Watch Together - 主入口文件
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const server_1 = require("./server");
function main() {
    (0, server_1.startServer)();
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=index.js.map