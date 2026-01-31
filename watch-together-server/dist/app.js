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
