"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http = require("http");
const crypto = require("crypto");
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
const SCREEN_STREAM_BROADCAST_TYPES = ["SCREEN_STREAM_START", "SCREEN_STREAM_STOP"];
function sendToUser(roomId, toUserId, message) {
    const key = `${roomId}:${toUserId}`;
    const ws = wsByRoomUser.get(key);
    if (ws && ws.readyState === 1) {
        ws.send(typeof message === "string" ? message : JSON.stringify(message));
        return true;
    }
    console.warn(
        `[WebRTC] 信令目标用户不在线: roomId=${roomId}, toUserId=${toUserId}`
    );
    return false;
}
/** 向房间内除 excludeUserId 外的所有连接广播消息（用于 MEMBER_JOINED / MEMBER_LEFT） */
function broadcastToRoom(roomId, excludeUserId, message) {
    const connections = wsConnections.get(roomId);
    if (!connections) return;
    const payload = typeof message === "string" ? message : JSON.stringify(message);
    const skipWs = excludeUserId ? wsByRoomUser.get(`${roomId}:${excludeUserId}`) : null;
    connections.forEach((sock) => {
        if (sock === skipWs) return;
        if (sock.readyState === 1) sock.send(payload);
    });
}
const ws_room_broadcast_1 = require("./ws-room-broadcast");
const appModule = require("./app");
ws_room_broadcast_1.setBroadcastToRoom(broadcastToRoom);
function broadcastSyncStateToRoom(roomId) {
    const getRoomMembersForSync = appModule.getRoomMembersForSync;
    if (typeof getRoomMembersForSync !== "function") return;
    getRoomMembersForSync(roomId)
        .then((members) => {
        if (!members || members.length === 0) return;
        const payload = JSON.stringify({ type: "SYNC_STATE", data: { members } });
        const connections = wsConnections.get(roomId);
        if (!connections) return;
        connections.forEach((ws) => {
            if (ws.readyState === 1) ws.send(payload);
        });
    })
        .catch((err) => console.error("[WebSocket] broadcastSyncStateToRoom error:", err));
}
ws_room_broadcast_1.setBroadcastSyncStateToRoom(broadcastSyncStateToRoom);
wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const roomId = url.searchParams.get("roomId");
    const userId = url.searchParams.get("userId");
    if (roomId && userId) {
        ws.roomId = roomId;
        ws.userId = userId;
        if (!wsConnections.has(roomId)) {
            wsConnections.set(roomId, new Set());
        }
        wsConnections.get(roomId).add(ws);
        wsByRoomUser.set(`${roomId}:${userId}`, ws);
        // 新连接建立时向该客户端发送 SYNC_STATE，使房主/成员无需刷新即可获得完整成员列表
        const getRoomMembersForSync = appModule.getRoomMembersForSync;
        if (typeof getRoomMembersForSync === "function") {
            getRoomMembersForSync(roomId)
                .then((members) => {
                if (members && members.length > 0 && ws.readyState === 1) {
                    ws.send(JSON.stringify({ type: "SYNC_STATE", data: { members } }));
                }
            })
                .catch((err) => console.error("[WebSocket] send SYNC_STATE on connect error:", err));
        }
        // 新成员加入时向房间内其他连接广播 MEMBER_JOINED，房主端无需刷新即可在成员列表中显示该成员
        const getRoomMemberByUserId = appModule.getRoomMemberByUserId;
        if (typeof getRoomMemberByUserId === "function") {
            getRoomMemberByUserId(roomId, userId)
                .then((member) => {
                if (member && member.userId) {
                    const nickname = member.nickname != null ? member.nickname : member.userId;
                    broadcastToRoom(roomId, userId, {
                        type: "MEMBER_JOINED",
                        data: { userId: member.userId, nickname },
                    });
                    // 同时向全房间广播 SYNC_STATE，确保房主等收到完整成员列表（含新成员）
                    broadcastSyncStateToRoom(roomId);
                }
            })
                .catch((err) => console.error("[WebSocket] broadcast MEMBER_JOINED on connect error:", err));
        }
    }
    ws.on("message", (data) => {
        try {
            const message = JSON.parse(data.toString());
            const type = message && message.type;
            if (!type) return;
            // 聊天消息：向房间内所有连接广播（含发送者），前端据此渲染消息区域
            const connRoomId = ws.roomId || roomId;
            if (type === "CHAT_MESSAGE" && connRoomId && message.userId && message.nickname != null && message.content != null) {
                const id = crypto.randomUUID();
                const timestamp = new Date().toISOString();
                const payload = JSON.stringify({
                    type: "CHAT_MESSAGE",
                    data: {
                        id,
                        userId: message.userId,
                        nickname: message.nickname,
                        content: String(message.content).trim(),
                        timestamp,
                    },
                });
                const connections = wsConnections.get(connRoomId);
                let sentCount = 0;
                if (connections) {
                    connections.forEach((sock) => {
                        if (sock.readyState === 1) {
                            sock.send(payload);
                            sentCount++;
                        }
                    });
                }
                console.log("[排查] CHAT_MESSAGE 收到 roomId=%s userId=%s contentLen=%d 已广播到 %d 个连接", connRoomId, message.userId, String(message.content).trim().length, sentCount);
                return;
            }
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
                    const sent = sendToUser(msgRoomId, toUserId, message);
                    if (sent)
                        console.log("[排查] WEBRTC 信令已转发 type=%s toUserId=%s", type, toUserId);
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
            if (SCREEN_STREAM_BROADCAST_TYPES.includes(type)) {
                const msgRoomId = message.roomId || (ws.roomId || null);
                if (msgRoomId) {
                    const connections = wsConnections.get(msgRoomId);
                    if (connections) {
                        const payload = typeof message === "string" ? message : JSON.stringify(message);
                        connections.forEach((sock) => {
                            if (sock !== ws && sock.readyState === 1)
                                sock.send(payload);
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
        const rId = ws.roomId || roomId;
        const uId = ws.userId || userId;
        if (rId && uId) {
            // 成员断开时向房间内其他连接广播 MEMBER_LEFT，房主端无需刷新即可更新成员列表
            broadcastToRoom(rId, uId, { type: "MEMBER_LEFT", data: { userId: uId } });
            wsByRoomUser.delete(`${rId}:${uId}`);
            const connections = wsConnections.get(rId);
            if (connections) {
                connections.delete(ws);
                if (connections.size === 0) wsConnections.delete(rId);
            }
        }
    });
});
httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT} (HTTP + WebSocket)`);
});
