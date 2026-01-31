"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const { PrismaClient } = require("@prisma/client");
const app = (0, express_1.default)();
const prisma = new PrismaClient();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});
function isValidHttpUrl(urlString) {
    try {
        const url = new URL(urlString);
        return url.protocol === 'http:' || url.protocol === 'https:';
    }
    catch (_e) {
        return false;
    }
}
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const crypto = require('crypto');

function buildRoomPayload(room, members, includeCurrentUrl = false) {
    const memberList = (members || []).map((m) => ({
        id: m.id,
        userId: m.userId,
        nickname: m.nickname,
    }));
    const payload = {
        roomId: room.id,
        name: room.name,
        members: memberList,
    };
    if (includeCurrentUrl) {
        payload.currentUrl = room.currentUrl ?? null;
    }
    return payload;
}

app.get('/api/v1/rooms/:roomId', async (req, res) => {
    try {
        const roomId = req.params.roomId;
        if (!roomId) {
            return res.status(400).json({
                success: false,
                error: { code: 'BAD_REQUEST', message: 'roomId is required' },
            });
        }
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: { members: true },
        });
        if (!room) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Room not found' },
            });
        }
        const members = await prisma.roomMember.findMany({
            where: { roomId },
            orderBy: { joinedAt: 'asc' },
        });
        return res.status(200).json({
            success: true,
            data: buildRoomPayload(room, members, true),
        });
    } catch (err) {
        console.error('GET /api/v1/rooms/:roomId error:', err);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: err.message || 'Internal server error' },
        });
    }
});

app.put('/api/v1/rooms/:roomId/url', async (req, res) => {
    try {
        const roomId = req.params.roomId;
        const { url, userId } = req.body || {};
        if (!roomId) {
            return res.status(400).json({
                success: false,
                error: { code: 'BAD_REQUEST', message: 'roomId is required' },
            });
        }
        if (!url || typeof url !== 'string' || !url.trim() || !isValidHttpUrl(url.trim())) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_URL', message: 'url is required and must be a valid http or https URL' },
            });
        }
        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({
                success: false,
                error: { code: 'BAD_REQUEST', message: 'userId is required' },
            });
        }
        const room = await prisma.room.findUnique({
            where: { id: roomId },
        });
        if (!room) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Room not found' },
            });
        }
        const hostUserId = room.id + '-host';
        if (userId !== hostUserId) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Only the room host can update the URL' },
            });
        }
        await prisma.room.update({
            where: { id: roomId },
            data: { currentUrl: url.trim() },
        });
        return res.status(200).json({ success: true });
    } catch (err) {
        console.error('PUT /api/v1/rooms/:roomId/url error:', err);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: err.message || 'Internal server error' },
        });
    }
});

app.post('/api/v1/rooms/:roomId/join', async (req, res) => {
    try {
        const roomId = req.params.roomId;
        const { nickname, userId: bodyUserId } = req.body || {};
        if (!roomId) {
            return res.status(400).json({
                success: false,
                error: { code: 'BAD_REQUEST', message: 'roomId is required' },
            });
        }
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: { members: true },
        });
        if (!room) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Room not found' },
            });
        }
        const hostUserId = room.id + '-host';
        if (bodyUserId != null && bodyUserId !== '') {
            const existing = await prisma.roomMember.findUnique({
                where: {
                    roomId_userId: { roomId, userId: String(bodyUserId) },
                },
            });
            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Member not found in this room' },
                });
            }
            const isHost = existing.userId === hostUserId;
            const members = await prisma.roomMember.findMany({
                where: { roomId },
                orderBy: { joinedAt: 'asc' },
            });
            return res.status(200).json({
                success: true,
                data: {
                    userId: existing.userId,
                    nickname: existing.nickname ?? nickname ?? null,
                    room: buildRoomPayload(room, members),
                    isHost,
                },
            });
        }
        const newUserId = crypto.randomUUID();
        const nick = (nickname != null && String(nickname).trim()) ? String(nickname).trim() : null;
        await prisma.roomMember.create({
            data: {
                roomId,
                userId: newUserId,
                nickname: nick,
            },
        });
        const members = await prisma.roomMember.findMany({
            where: { roomId },
            orderBy: { joinedAt: 'asc' },
        });
        return res.status(200).json({
            success: true,
            data: {
                userId: newUserId,
                nickname: nick,
                room: buildRoomPayload(room, members),
                isHost: false,
            },
        });
    } catch (err) {
        console.error('POST /api/v1/rooms/:roomId/join error:', err);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: err.message || 'Internal server error' },
        });
    }
});

app.post('/api/v1/rooms', async (req, res) => {
    try {
        const { name, hostNickname, url } = req.body || {};
        if (!url || typeof url !== 'string' || !url.trim() || !isValidHttpUrl(url.trim())) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_URL', message: 'url is required and must be a valid http or https URL' },
            });
        }
        const roomName = (name != null && String(name).trim()) ? String(name).trim() : '未命名房间';
        const hostNick = (hostNickname != null && String(hostNickname).trim()) ? String(hostNickname).trim() : null;
        const currentUrl = url.trim();
        const room = await prisma.room.create({
            data: {
                name: roomName,
                hostNickname: hostNick,
                currentUrl: currentUrl,
            },
        });
        const hostMember = await prisma.roomMember.create({
            data: {
                roomId: room.id,
                userId: room.id + '-host',
                nickname: hostNick,
            },
        });
        const inviteLink = `${BASE_URL}/room/${room.id}`;
        const members = [
            { id: hostMember.id, userId: hostMember.userId, nickname: hostMember.nickname },
        ];
        return res.status(201).json({
            success: true,
            data: {
                roomId: room.id,
                hostId: hostMember.id,
                hostUserId: hostMember.userId,
                currentUrl,
                name: room.name,
                inviteLink,
                members,
            },
        });
    }
    catch (err) {
        console.error('POST /api/v1/rooms error:', err);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: err.message || 'Internal server error' },
        });
    }
});
exports.default = app;
