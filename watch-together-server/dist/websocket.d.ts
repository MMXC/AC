/**
 * Watch Together - WebSocket 服务器模块
 *
 * 提供 WebSocket 服务器，实现连接管理和基础消息处理
 */
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
/**
 * WebSocket 连接信息
 */
interface WebSocketConnection {
    ws: WebSocket;
    roomId: string;
    userId: string;
    lastPongTime: number;
    pingInterval?: NodeJS.Timeout;
    timeoutTimer?: NodeJS.Timeout;
    clientIp?: string;
}
/**
 * 创建并启动 WebSocket 服务器
 *
 * @param server HTTP 服务器实例
 * @returns WebSocket 服务器实例
 */
export declare function createWebSocketServer(server: Server): WebSocketServer;
/**
 * 关闭 WebSocket 服务器
 *
 * @returns Promise<void>
 */
export declare function closeWebSocketServer(): Promise<void>;
/**
 * 获取指定房间的所有连接
 *
 * @param roomId 房间 ID
 * @returns WebSocket 连接数组
 */
export declare function getRoomConnections(roomId: string): WebSocketConnection[];
/**
 * 向指定房间的所有连接广播消息
 *
 * @param roomId 房间 ID
 * @param message 消息对象
 */
export declare function broadcastToRoom(roomId: string, message: object): void;
/**
 * 向指定用户发送消息
 *
 * @param roomId 房间 ID
 * @param userId 用户 ID
 * @param message 消息对象
 * @returns 是否发送成功
 */
export declare function sendToUser(roomId: string, userId: string, message: object): boolean;
export {};
//# sourceMappingURL=websocket.d.ts.map