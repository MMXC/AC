/**
 * WebRTC 信令消息模块
 * 
 * 提供 WebRTC 信令消息的类型常量、创建函数和验证函数。
 * 前端信令发送/接收层应统一使用这些常量和函数，避免硬编码字符串。
 */

/**
 * WebRTC 信令消息类型常量
 * 使用常量而非字符串字面量，避免拼写错误
 */
const WebRTCSignalingType = {
  /** WebRTC Offer 消息 - 房主发起连接时发送 */
  WEBRTC_OFFER: 'WEBRTC_OFFER',
  
  /** WebRTC Answer 消息 - 成员响应 Offer 时发送 */
  WEBRTC_ANSWER: 'WEBRTC_ANSWER',
  
  /** ICE Candidate 消息 - 交换网络候选地址 */
  WEBRTC_ICE_CANDIDATE: 'WEBRTC_ICE_CANDIDATE',
  
  /** 结束连接消息 - 主动关闭 WebRTC 连接 */
  WEBRTC_END: 'WEBRTC_END',
  
  /** 错误消息 - 信令过程中的错误通知 */
  WEBRTC_ERROR: 'WEBRTC_ERROR',
};

/**
 * 协议版本号
 */
const PROTOCOL_VERSION = '1.0';

/**
 * 创建 WebRTC Offer 消息
 * 
 * @param {Object} params - 消息参数
 * @param {string} params.roomId - 房间ID
 * @param {string} params.fromUserId - 发送者用户ID
 * @param {string|null} params.toUserId - 接收者用户ID（null 表示广播给所有成员）
 * @param {string} params.sdp - SDP Offer 内容
 * @param {Object} [params.tracks] - 扩展字段：track 信息
 * @returns {Object} WebRTC Offer 消息对象
 */
function createOfferMessage({ roomId, fromUserId, toUserId, sdp, tracks }) {
  return {
    type: WebRTCSignalingType.WEBRTC_OFFER,
    roomId,
    fromUserId,
    toUserId: toUserId || null,
    timestamp: Date.now(),
    version: PROTOCOL_VERSION,
    sdp,
    sdpType: 'offer',
    ...(tracks && { tracks }),
  };
}

/**
 * 创建 WebRTC Answer 消息
 * 
 * @param {Object} params - 消息参数
 * @param {string} params.roomId - 房间ID
 * @param {string} params.fromUserId - 发送者用户ID
 * @param {string} params.toUserId - 接收者用户ID（通常是房主）
 * @param {string} params.sdp - SDP Answer 内容
 * @param {Object} [params.tracks] - 扩展字段：track 信息
 * @returns {Object} WebRTC Answer 消息对象
 */
function createAnswerMessage({ roomId, fromUserId, toUserId, sdp, tracks }) {
  return {
    type: WebRTCSignalingType.WEBRTC_ANSWER,
    roomId,
    fromUserId,
    toUserId,
    timestamp: Date.now(),
    version: PROTOCOL_VERSION,
    sdp,
    sdpType: 'answer',
    ...(tracks && { tracks }),
  };
}

/**
 * 创建 ICE Candidate 消息
 * 
 * @param {Object} params - 消息参数
 * @param {string} params.roomId - 房间ID
 * @param {string} params.fromUserId - 发送者用户ID
 * @param {string} params.toUserId - 接收者用户ID
 * @param {RTCIceCandidateInit|null} params.candidate - ICE Candidate 对象（null 表示候选地址收集完成）
 * @returns {Object} ICE Candidate 消息对象
 */
function createICECandidateMessage({ roomId, fromUserId, toUserId, candidate }) {
  const message = {
    type: WebRTCSignalingType.WEBRTC_ICE_CANDIDATE,
    roomId,
    fromUserId,
    toUserId,
    timestamp: Date.now(),
    version: PROTOCOL_VERSION,
    candidate: candidate || null,
  };

  // 如果 candidate 存在，提取额外字段
  if (candidate) {
    if (candidate.candidate) {
      message.candidateString = candidate.candidate;
    }
    if (candidate.sdpMLineIndex !== undefined) {
      message.sdpMLineIndex = candidate.sdpMLineIndex;
    }
    if (candidate.sdpMid !== undefined) {
      message.sdpMid = candidate.sdpMid;
    }
  }

  return message;
}

/**
 * 创建 WebRTC 结束连接消息
 * 
 * @param {Object} params - 消息参数
 * @param {string} params.roomId - 房间ID
 * @param {string} params.fromUserId - 发送者用户ID
 * @param {string|null} params.toUserId - 接收者用户ID（null 表示广播给所有成员）
 * @param {string} [params.reason] - 结束原因
 * @returns {Object} WebRTC End 消息对象
 */
function createEndMessage({ roomId, fromUserId, toUserId, reason }) {
  return {
    type: WebRTCSignalingType.WEBRTC_END,
    roomId,
    fromUserId,
    toUserId: toUserId || null,
    timestamp: Date.now(),
    version: PROTOCOL_VERSION,
    ...(reason && { reason }),
  };
}

/**
 * 创建 WebRTC 错误消息
 * 
 * @param {Object} params - 消息参数
 * @param {string} params.roomId - 房间ID
 * @param {string} params.fromUserId - 发送者用户ID
 * @param {string|null} params.toUserId - 接收者用户ID
 * @param {string} params.errorMessage - 错误消息
 * @param {string} [params.errorCode] - 错误代码
 * @param {Object} [params.errorDetails] - 错误详情
 * @returns {Object} WebRTC Error 消息对象
 */
function createErrorMessage({ roomId, fromUserId, toUserId, errorMessage, errorCode, errorDetails }) {
  return {
    type: WebRTCSignalingType.WEBRTC_ERROR,
    roomId,
    fromUserId,
    toUserId: toUserId || null,
    timestamp: Date.now(),
    version: PROTOCOL_VERSION,
    errorMessage,
    ...(errorCode && { errorCode }),
    ...(errorDetails && { errorDetails }),
  };
}

/**
 * 验证 WebRTC 信令消息的基本结构
 * 
 * @param {unknown} message - 待验证的消息
 * @returns {boolean} 是否为有效的 WebRTC 信令消息
 */
function validateWebRTCSignalingMessage(message) {
  if (!message || typeof message !== 'object') {
    return false;
  }

  const msg = message;

  // 检查必需的基础字段
  if (!msg.type || typeof msg.type !== 'string') {
    return false;
  }

  // 检查消息类型是否有效
  const validTypes = Object.values(WebRTCSignalingType);
  if (!validTypes.includes(msg.type)) {
    return false;
  }

  if (!msg.roomId || typeof msg.roomId !== 'string') {
    return false;
  }

  if (!msg.fromUserId || typeof msg.fromUserId !== 'string') {
    return false;
  }

  if (msg.toUserId !== null && typeof msg.toUserId !== 'string') {
    return false;
  }

  if (typeof msg.timestamp !== 'number') {
    return false;
  }

  // 根据消息类型进行特定验证
  switch (msg.type) {
    case WebRTCSignalingType.WEBRTC_OFFER:
      return (
        typeof msg.sdp === 'string' &&
        msg.sdpType === 'offer'
      );

    case WebRTCSignalingType.WEBRTC_ANSWER:
      return (
        typeof msg.sdp === 'string' &&
        msg.sdpType === 'answer'
      );

    case WebRTCSignalingType.WEBRTC_ICE_CANDIDATE:
      return (
        msg.candidate === null ||
        (typeof msg.candidate === 'object' && msg.candidate !== null)
      );

    case WebRTCSignalingType.WEBRTC_END:
      return true; // End 消息只需要基础字段

    case WebRTCSignalingType.WEBRTC_ERROR:
      return typeof msg.errorMessage === 'string';

    default:
      return false;
  }
}

/**
 * 类型检查函数：检查消息是否为 Offer 消息
 * 
 * @param {Object} message - 消息对象
 * @returns {boolean} 是否为 Offer 消息
 */
function isOfferMessage(message) {
  return message && message.type === WebRTCSignalingType.WEBRTC_OFFER;
}

/**
 * 类型检查函数：检查消息是否为 Answer 消息
 * 
 * @param {Object} message - 消息对象
 * @returns {boolean} 是否为 Answer 消息
 */
function isAnswerMessage(message) {
  return message && message.type === WebRTCSignalingType.WEBRTC_ANSWER;
}

/**
 * 类型检查函数：检查消息是否为 ICE Candidate 消息
 * 
 * @param {Object} message - 消息对象
 * @returns {boolean} 是否为 ICE Candidate 消息
 */
function isICECandidateMessage(message) {
  return message && message.type === WebRTCSignalingType.WEBRTC_ICE_CANDIDATE;
}

/**
 * 类型检查函数：检查消息是否为 End 消息
 * 
 * @param {Object} message - 消息对象
 * @returns {boolean} 是否为 End 消息
 */
function isEndMessage(message) {
  return message && message.type === WebRTCSignalingType.WEBRTC_END;
}

/**
 * 类型检查函数：检查消息是否为 Error 消息
 * 
 * @param {Object} message - 消息对象
 * @returns {boolean} 是否为 Error 消息
 */
function isErrorMessage(message) {
  return message && message.type === WebRTCSignalingType.WEBRTC_ERROR;
}

// 将函数暴露到全局作用域，供其他脚本使用
if (typeof window !== 'undefined') {
  window.WebRTCSignalingType = WebRTCSignalingType;
  window.PROTOCOL_VERSION = PROTOCOL_VERSION;
  window.createOfferMessage = createOfferMessage;
  window.createAnswerMessage = createAnswerMessage;
  window.createICECandidateMessage = createICECandidateMessage;
  window.createEndMessage = createEndMessage;
  window.createErrorMessage = createErrorMessage;
  window.validateWebRTCSignalingMessage = validateWebRTCSignalingMessage;
  window.isOfferMessage = isOfferMessage;
  window.isAnswerMessage = isAnswerMessage;
  window.isICECandidateMessage = isICECandidateMessage;
  window.isEndMessage = isEndMessage;
  window.isErrorMessage = isErrorMessage;
}

// 导出所有内容供 CommonJS 使用（兼容性）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
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
  };
}

// 在浏览器环境中，将内容暴露到全局作用域
if (typeof window !== 'undefined') {
  window.WebRTCSignalingType = WebRTCSignalingType;
  window.PROTOCOL_VERSION = PROTOCOL_VERSION;
  window.createOfferMessage = createOfferMessage;
  window.createAnswerMessage = createAnswerMessage;
  window.createICECandidateMessage = createICECandidateMessage;
  window.createEndMessage = createEndMessage;
  window.createErrorMessage = createErrorMessage;
  window.validateWebRTCSignalingMessage = validateWebRTCSignalingMessage;
  window.isOfferMessage = isOfferMessage;
  window.isAnswerMessage = isAnswerMessage;
  window.isICECandidateMessage = isICECandidateMessage;
  window.isEndMessage = isEndMessage;
  window.isErrorMessage = isErrorMessage;
}
