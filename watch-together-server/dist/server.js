"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http = require("http");
const { WebSocketServer } = require("ws");
const app_1 = __importDefault(require("./app"));
const PORT = process.env.PORT || 3000;
const httpServer = http.createServer(app_1.default);
const wss = new WebSocketServer({ server: httpServer });
// roomId -> Set<WebSocket>（房间内所有连接，用于广播）
const wsConnections = new Map();
// `${roomId}:${userId}` -> WebSocket（用于 WebRTC 点对点信令转发）
const wsByRoomUser = new Map();
const WEBRTC_SIGNAL_TYPES = [
    "WEBRTC_OFFER",
    "WEBRTC_ANSWER",
    "WEBRTC_ICE_CANDIDATE",
    "WEBRTC_END",
    "WEBRTC_ERROR",
];
function sendToUser(roomId, toUserId, message) {
    const key = `${roomId}:${toUserId}`;
    const ws = wsByRoomUser.get(key);
    if (ws && ws.readyState === 1) {
        ws.send(typeof message === "string" ? message : JSON.stringify(message));
    }
    else {
        console.warn(
            `[WebRTC] 信令目标用户不在线: roomId=${roomId}, toUserId=${toUserId}`
        );
    }
}
wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const roomId = url.searchParams.get("roomId");
    const userId = url.searchParams.get("userId");
    if (roomId && userId) {
        if (!wsConnections.has(roomId)) {
            wsConnections.set(roomId, new Set());
        }
        wsConnections.get(roomId).add(ws);
        wsByRoomUser.set(`${roomId}:${userId}`, ws);
    }
    ws.on("message", (data) => {
        try {
            const message = JSON.parse(data.toString());
            const type = message && message.type;
            if (!type) return;
            if (WEBRTC_SIGNAL_TYPES.includes(type)) {
                const msgRoomId = message.roomId;
                const toUserId = message.toUserId;
                const fromUserId = message.fromUserId;
                if (!msgRoomId) return;
                if (roomId && msgRoomId !== roomId) return;
                // 仅允许房主发起共享：WEBRTC_OFFER 的 fromUserId 必须为房间房主 (roomId + '-host')
                if (type === "WEBRTC_OFFER") {
                    const roomHostUserId = msgRoomId + "-host";
                    if (fromUserId !== roomHostUserId) {
                        console.warn(
                            "[WebRTC] 拒绝非房主的共享请求: roomId=" + msgRoomId + ", fromUserId=" + fromUserId
                        );
                        return;
                    }
                }
                if (toUserId != null && toUserId !== "") {
                    sendToUser(msgRoomId, toUserId, message);
                }
                else {
                    const connections = wsConnections.get(msgRoomId);
                    if (connections) {
                        const payload = typeof message === "string" ? message : JSON.stringify(message);
                        connections.forEach((sock) => {
                            if (sock !== ws && sock.readyState === 1) sock.send(payload);
                        });
                    }
                }
                return;
            }
        }
        catch (err) {
            console.error("[WebSocket] 消息解析错误:", err);
        }
    });
    ws.on("close", () => {
        if (roomId && userId) {
            wsByRoomUser.delete(`${roomId}:${userId}`);
            const connections = wsConnections.get(roomId);
            if (connections) {
                connections.delete(ws);
                if (connections.size === 0) wsConnections.delete(roomId);
            }
        }
    });
});
httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT} (HTTP + WebSocket)`);
});
