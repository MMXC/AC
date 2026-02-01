"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Optional broadcast function set by server.js: (roomId, excludeUserId, message) => void */
let broadcastToRoom = null;
/** Optional: send SYNC_STATE (full members) to all in room. Set by server.js */
let broadcastSyncStateToRoom = null;
function setBroadcastToRoom(fn) {
    broadcastToRoom = fn;
}
function getBroadcastToRoom() {
    return broadcastToRoom;
}
function setBroadcastSyncStateToRoom(fn) {
    broadcastSyncStateToRoom = fn;
}
function getBroadcastSyncStateToRoom() {
    return broadcastSyncStateToRoom;
}
exports.setBroadcastToRoom = setBroadcastToRoom;
exports.getBroadcastToRoom = getBroadcastToRoom;
exports.setBroadcastSyncStateToRoom = setBroadcastSyncStateToRoom;
exports.getBroadcastSyncStateToRoom = getBroadcastSyncStateToRoom;
