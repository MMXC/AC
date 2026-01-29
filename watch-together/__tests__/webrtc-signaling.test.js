/**
 * WebRTC 信令消息协议单元测试
 * 
 * 测试场景：
 * 1. 为每种信令消息构造至少一个示例 JSON，并通过单元测试断言能被类型定义正确解析
 * 2. 在前端模拟 send/receive 信令消息的单元测试中，确保不会因字段名错误导致解析失败
 */

const {
  WebRTCSignalingType,
  PROTOCOL_VERSION,
  createOfferMessage,
  createAnswerMessage,
  createICECandidateMessage,
  createEndMessage,
  createErrorMessage,
  validateWebRTCSignalingMessage,
  isOfferMessage,
  isAnswerMessage,
  isICECandidateMessage,
  isEndMessage,
  isErrorMessage,
} = require('../js/webrtc-signaling.js');

describe('WebRTC 信令消息协议', () => {
  describe('消息类型常量', () => {
    test('应该定义所有必需的消息类型', () => {
      expect(WebRTCSignalingType.WEBRTC_OFFER).toBe('WEBRTC_OFFER');
      expect(WebRTCSignalingType.WEBRTC_ANSWER).toBe('WEBRTC_ANSWER');
      expect(WebRTCSignalingType.WEBRTC_ICE_CANDIDATE).toBe('WEBRTC_ICE_CANDIDATE');
      expect(WebRTCSignalingType.WEBRTC_END).toBe('WEBRTC_END');
      expect(WebRTCSignalingType.WEBRTC_ERROR).toBe('WEBRTC_ERROR');
    });

    test('协议版本应该正确', () => {
      expect(PROTOCOL_VERSION).toBe('1.0');
    });
  });

  describe('创建消息函数', () => {
    const baseParams = {
      roomId: 'room-abc123',
      fromUserId: 'user-host001',
      toUserId: 'user-member1',
    };

    test('createOfferMessage 应该创建有效的 Offer 消息', () => {
      const sdp = 'v=0\r\no=- 1234567890 1234567890 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n';
      const message = createOfferMessage({
        ...baseParams,
        sdp,
      });

      expect(message.type).toBe(WebRTCSignalingType.WEBRTC_OFFER);
      expect(message.roomId).toBe('room-abc123');
      expect(message.fromUserId).toBe('user-host001');
      expect(message.toUserId).toBe('user-member1');
      expect(message.sdp).toBe(sdp);
      expect(message.sdpType).toBe('offer');
      expect(message.version).toBe(PROTOCOL_VERSION);
      expect(typeof message.timestamp).toBe('number');
    });

    test('createOfferMessage 应该支持广播消息（toUserId 为 null）', () => {
      const message = createOfferMessage({
        roomId: 'room-abc123',
        fromUserId: 'user-host001',
        toUserId: null,
        sdp: 'v=0\r\n...',
      });

      expect(message.toUserId).toBeNull();
    });

    test('createOfferMessage 应该支持 tracks 扩展字段', () => {
      const message = createOfferMessage({
        ...baseParams,
        sdp: 'v=0\r\n...',
        tracks: {
          audioTrackId: 'audio-track-001',
          videoTrackId: 'video-track-001',
        },
      });

      expect(message.tracks).toEqual({
        audioTrackId: 'audio-track-001',
        videoTrackId: 'video-track-001',
      });
    });

    test('createAnswerMessage 应该创建有效的 Answer 消息', () => {
      const sdp = 'v=0\r\no=- 9876543210 9876543210 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n';
      const message = createAnswerMessage({
        ...baseParams,
        sdp,
      });

      expect(message.type).toBe(WebRTCSignalingType.WEBRTC_ANSWER);
      expect(message.sdp).toBe(sdp);
      expect(message.sdpType).toBe('answer');
      expect(validateWebRTCSignalingMessage(message)).toBe(true);
    });

    test('createICECandidateMessage 应该创建有效的 ICE Candidate 消息', () => {
      const candidate = {
        candidate: 'candidate:1 1 UDP 2130706431 192.168.1.100 54321 typ host',
        sdpMLineIndex: 0,
        sdpMid: '0',
      };
      const message = createICECandidateMessage({
        ...baseParams,
        candidate,
      });

      expect(message.type).toBe(WebRTCSignalingType.WEBRTC_ICE_CANDIDATE);
      expect(message.candidate).toEqual(candidate);
      expect(message.candidateString).toBe(candidate.candidate);
      expect(message.sdpMLineIndex).toBe(0);
      expect(message.sdpMid).toBe('0');
      expect(validateWebRTCSignalingMessage(message)).toBe(true);
    });

    test('createICECandidateMessage 应该支持 null candidate（候选地址收集完成）', () => {
      const message = createICECandidateMessage({
        ...baseParams,
        candidate: null,
      });

      expect(message.candidate).toBeNull();
      expect(validateWebRTCSignalingMessage(message)).toBe(true);
    });

    test('createEndMessage 应该创建有效的 End 消息', () => {
      const message = createEndMessage({
        ...baseParams,
        reason: '用户主动停止共享',
      });

      expect(message.type).toBe(WebRTCSignalingType.WEBRTC_END);
      expect(message.reason).toBe('用户主动停止共享');
      expect(validateWebRTCSignalingMessage(message)).toBe(true);
    });

    test('createErrorMessage 应该创建有效的 Error 消息', () => {
      const message = createErrorMessage({
        ...baseParams,
        errorMessage: 'ICE 连接失败',
        errorCode: 'ICE_CONNECTION_FAILED',
        errorDetails: {
          iceConnectionState: 'failed',
        },
      });

      expect(message.type).toBe(WebRTCSignalingType.WEBRTC_ERROR);
      expect(message.errorMessage).toBe('ICE 连接失败');
      expect(message.errorCode).toBe('ICE_CONNECTION_FAILED');
      expect(message.errorDetails).toEqual({ iceConnectionState: 'failed' });
      expect(validateWebRTCSignalingMessage(message)).toBe(true);
    });
  });

  describe('消息验证', () => {
    test('validateWebRTCSignalingMessage 应该验证有效的 Offer 消息', () => {
      const validOffer = {
        type: WebRTCSignalingType.WEBRTC_OFFER,
        roomId: 'room-abc123',
        fromUserId: 'user-host001',
        toUserId: 'user-member1',
        timestamp: Date.now(),
        sdp: 'v=0\r\no=- 1234567890 1234567890 IN IP4 127.0.0.1\r\n',
        sdpType: 'offer',
      };

      expect(validateWebRTCSignalingMessage(validOffer)).toBe(true);
    });

    test('validateWebRTCSignalingMessage 应该拒绝缺少必需字段的消息', () => {
      const invalidMessage = {
        type: WebRTCSignalingType.WEBRTC_OFFER,
        // 缺少 roomId
        fromUserId: 'user-host001',
        toUserId: 'user-member1',
        timestamp: Date.now(),
        sdp: 'v=0\r\n...',
        sdpType: 'offer',
      };

      expect(validateWebRTCSignalingMessage(invalidMessage)).toBe(false);
    });

    test('validateWebRTCSignalingMessage 应该拒绝无效的消息类型', () => {
      const invalidMessage = {
        type: 'INVALID_TYPE',
        roomId: 'room-abc123',
        fromUserId: 'user-host001',
        toUserId: 'user-member1',
        timestamp: Date.now(),
      };

      expect(validateWebRTCSignalingMessage(invalidMessage)).toBe(false);
    });

    test('validateWebRTCSignalingMessage 应该验证有效的 Answer 消息', () => {
      const validAnswer = {
        type: WebRTCSignalingType.WEBRTC_ANSWER,
        roomId: 'room-abc123',
        fromUserId: 'user-member1',
        toUserId: 'user-host001',
        timestamp: Date.now(),
        sdp: 'v=0\r\no=- 9876543210 9876543210 IN IP4 127.0.0.1\r\n',
        sdpType: 'answer',
      };

      expect(validateWebRTCSignalingMessage(validAnswer)).toBe(true);
    });

    test('validateWebRTCSignalingMessage 应该验证有效的 ICE Candidate 消息', () => {
      const validCandidate = {
        type: WebRTCSignalingType.WEBRTC_ICE_CANDIDATE,
        roomId: 'room-abc123',
        fromUserId: 'user-host001',
        toUserId: 'user-member1',
        timestamp: Date.now(),
        candidate: {
          candidate: 'candidate:1 1 UDP 2130706431 192.168.1.100 54321 typ host',
          sdpMLineIndex: 0,
          sdpMid: '0',
        },
      };

      expect(validateWebRTCSignalingMessage(validCandidate)).toBe(true);
    });

    test('validateWebRTCSignalingMessage 应该验证 null candidate（候选地址收集完成）', () => {
      const validEndCandidate = {
        type: WebRTCSignalingType.WEBRTC_ICE_CANDIDATE,
        roomId: 'room-abc123',
        fromUserId: 'user-host001',
        toUserId: 'user-member1',
        timestamp: Date.now(),
        candidate: null,
      };

      expect(validateWebRTCSignalingMessage(validEndCandidate)).toBe(true);
    });

    test('validateWebRTCSignalingMessage 应该验证有效的 Error 消息', () => {
      const validError = {
        type: WebRTCSignalingType.WEBRTC_ERROR,
        roomId: 'room-abc123',
        fromUserId: 'user-host001',
        toUserId: 'user-member1',
        timestamp: Date.now(),
        errorMessage: '连接失败',
      };

      expect(validateWebRTCSignalingMessage(validError)).toBe(true);
    });

    test('validateWebRTCSignalingMessage 应该拒绝非对象输入', () => {
      expect(validateWebRTCSignalingMessage(null)).toBe(false);
      expect(validateWebRTCSignalingMessage(undefined)).toBe(false);
      expect(validateWebRTCSignalingMessage('string')).toBe(false);
      expect(validateWebRTCSignalingMessage(123)).toBe(false);
    });
  });

  describe('类型检查函数', () => {
    test('isOfferMessage 应该正确识别 Offer 消息', () => {
      const offerMessage = createOfferMessage({
        roomId: 'room-abc123',
        fromUserId: 'user-host001',
        toUserId: 'user-member1',
        sdp: 'v=0\r\n...',
      });

      expect(isOfferMessage(offerMessage)).toBe(true);
      expect(isAnswerMessage(offerMessage)).toBe(false);
      expect(isICECandidateMessage(offerMessage)).toBe(false);
    });

    test('isAnswerMessage 应该正确识别 Answer 消息', () => {
      const answerMessage = createAnswerMessage({
        roomId: 'room-abc123',
        fromUserId: 'user-member1',
        toUserId: 'user-host001',
        sdp: 'v=0\r\n...',
      });

      expect(isAnswerMessage(answerMessage)).toBe(true);
      expect(isOfferMessage(answerMessage)).toBe(false);
    });

    test('isICECandidateMessage 应该正确识别 ICE Candidate 消息', () => {
      const candidateMessage = createICECandidateMessage({
        roomId: 'room-abc123',
        fromUserId: 'user-host001',
        toUserId: 'user-member1',
        candidate: {
          candidate: 'candidate:1 1 UDP 2130706431 192.168.1.100 54321 typ host',
        },
      });

      expect(isICECandidateMessage(candidateMessage)).toBe(true);
      expect(isOfferMessage(candidateMessage)).toBe(false);
    });

    test('isEndMessage 应该正确识别 End 消息', () => {
      const endMessage = createEndMessage({
        roomId: 'room-abc123',
        fromUserId: 'user-host001',
        toUserId: 'user-member1',
        reason: '停止共享',
      });

      expect(isEndMessage(endMessage)).toBe(true);
      expect(isErrorMessage(endMessage)).toBe(false);
    });

    test('isErrorMessage 应该正确识别 Error 消息', () => {
      const errorMessage = createErrorMessage({
        roomId: 'room-abc123',
        fromUserId: 'user-host001',
        toUserId: 'user-member1',
        errorMessage: '连接失败',
      });

      expect(isErrorMessage(errorMessage)).toBe(true);
      expect(isEndMessage(errorMessage)).toBe(false);
    });
  });

  describe('前端 send/receive 场景测试', () => {
    test('应该能够正确序列化和反序列化消息（模拟 WebSocket 发送）', () => {
      const originalMessage = createOfferMessage({
        roomId: 'room-abc123',
        fromUserId: 'user-host001',
        toUserId: 'user-member1',
        sdp: 'v=0\r\no=- 1234567890 1234567890 IN IP4 127.0.0.1\r\n',
      });

      // 模拟 WebSocket 发送：序列化为 JSON 字符串
      const jsonString = JSON.stringify(originalMessage);

      // 模拟 WebSocket 接收：从 JSON 字符串解析
      const receivedMessage = JSON.parse(jsonString);

      // 验证解析后的消息结构正确
      expect(receivedMessage.type).toBe(WebRTCSignalingType.WEBRTC_OFFER);
      expect(receivedMessage.roomId).toBe('room-abc123');
      expect(receivedMessage.fromUserId).toBe('user-host001');
      expect(receivedMessage.toUserId).toBe('user-member1');
      expect(receivedMessage.sdp).toBe('v=0\r\no=- 1234567890 1234567890 IN IP4 127.0.0.1\r\n');
      expect(receivedMessage.sdpType).toBe('offer');

      // 验证消息格式有效
      expect(validateWebRTCSignalingMessage(receivedMessage)).toBe(true);
    });

    test('应该能够处理所有消息类型的序列化/反序列化', () => {
      const messages = [
        createOfferMessage({
          roomId: 'room-abc123',
          fromUserId: 'user-host001',
          toUserId: 'user-member1',
          sdp: 'v=0\r\n...',
        }),
        createAnswerMessage({
          roomId: 'room-abc123',
          fromUserId: 'user-member1',
          toUserId: 'user-host001',
          sdp: 'v=0\r\n...',
        }),
        createICECandidateMessage({
          roomId: 'room-abc123',
          fromUserId: 'user-host001',
          toUserId: 'user-member1',
          candidate: {
            candidate: 'candidate:1 1 UDP 2130706431 192.168.1.100 54321 typ host',
          },
        }),
        createEndMessage({
          roomId: 'room-abc123',
          fromUserId: 'user-host001',
          toUserId: 'user-member1',
          reason: '停止共享',
        }),
        createErrorMessage({
          roomId: 'room-abc123',
          fromUserId: 'user-host001',
          toUserId: 'user-member1',
          errorMessage: '连接失败',
        }),
      ];

      messages.forEach((message) => {
        const jsonString = JSON.stringify(message);
        const receivedMessage = JSON.parse(jsonString);

        // 验证解析后的消息格式有效
        expect(validateWebRTCSignalingMessage(receivedMessage)).toBe(true);
        expect(receivedMessage.type).toBe(message.type);
      });
    });

    test('应该能够处理字段名错误的情况（防御性编程）', () => {
      // 模拟字段名拼写错误的情况
      const messageWithTypo = {
        type: WebRTCSignalingType.WEBRTC_OFFER,
        roomId: 'room-abc123',
        fromUserId: 'user-host001',
        toUserId: 'user-member1',
        timestamp: Date.now(),
        // 错误：sdp 拼写错误
        sdpContent: 'v=0\r\n...',
        sdpType: 'offer',
      };

      // 验证应该失败（缺少必需的 sdp 字段）
      expect(validateWebRTCSignalingMessage(messageWithTypo)).toBe(false);
    });

    test('应该能够处理广播消息（toUserId 为 null）', () => {
      const broadcastMessage = createOfferMessage({
        roomId: 'room-abc123',
        fromUserId: 'user-host001',
        toUserId: null, // 广播给所有成员
        sdp: 'v=0\r\n...',
      });

      expect(broadcastMessage.toUserId).toBeNull();
      expect(validateWebRTCSignalingMessage(broadcastMessage)).toBe(true);

      // 序列化/反序列化后应该保持 null
      const jsonString = JSON.stringify(broadcastMessage);
      const receivedMessage = JSON.parse(jsonString);
      expect(receivedMessage.toUserId).toBeNull();
    });
  });

  describe('实际使用场景示例', () => {
    test('房主向单个成员建立连接的完整流程', () => {
      // 1. 房主发送 Offer
      const offer = createOfferMessage({
        roomId: 'room-abc123',
        fromUserId: 'user-host001',
        toUserId: 'user-member1',
        sdp: 'v=0\r\no=- 1234567890 1234567890 IN IP4 127.0.0.1\r\n',
      });
      expect(validateWebRTCSignalingMessage(offer)).toBe(true);

      // 2. 成员发送 Answer
      const answer = createAnswerMessage({
        roomId: 'room-abc123',
        fromUserId: 'user-member1',
        toUserId: 'user-host001',
        sdp: 'v=0\r\no=- 9876543210 9876543210 IN IP4 127.0.0.1\r\n',
      });
      expect(validateWebRTCSignalingMessage(answer)).toBe(true);

      // 3. 双方交换 ICE Candidate
      const candidate1 = createICECandidateMessage({
        roomId: 'room-abc123',
        fromUserId: 'user-host001',
        toUserId: 'user-member1',
        candidate: {
          candidate: 'candidate:1 1 UDP 2130706431 192.168.1.100 54321 typ host',
        },
      });
      expect(validateWebRTCSignalingMessage(candidate1)).toBe(true);

      const candidate2 = createICECandidateMessage({
        roomId: 'room-abc123',
        fromUserId: 'user-member1',
        toUserId: 'user-host001',
        candidate: {
          candidate: 'candidate:2 1 UDP 2130706431 192.168.1.101 54322 typ host',
        },
      });
      expect(validateWebRTCSignalingMessage(candidate2)).toBe(true);

      // 4. 结束连接
      const end = createEndMessage({
        roomId: 'room-abc123',
        fromUserId: 'user-host001',
        toUserId: 'user-member1',
        reason: '用户主动停止共享',
      });
      expect(validateWebRTCSignalingMessage(end)).toBe(true);
    });

    test('房主向所有成员广播 Offer', () => {
      const broadcastOffer = createOfferMessage({
        roomId: 'room-abc123',
        fromUserId: 'user-host001',
        toUserId: null, // 广播给所有成员
        sdp: 'v=0\r\no=- 1234567890 1234567890 IN IP4 127.0.0.1\r\n',
      });

      expect(broadcastOffer.toUserId).toBeNull();
      expect(validateWebRTCSignalingMessage(broadcastOffer)).toBe(true);
    });
  });
});
