/**
 * WebRTC 信令消息类型定义
 * 
 * 基于现有房间 WebSocket/sync 通道，定义用于 WebRTC 的信令消息格式。
 * 这些类型用于在房主和成员之间建立 WebRTC 连接时进行信令交换。
 */

/**
 * WebRTC 信令消息类型枚举
 */
export enum WebRTCSignalingType {
  /** WebRTC Offer 消息 - 房主发起连接时发送 */
  WEBRTC_OFFER = 'WEBRTC_OFFER',
  
  /** WebRTC Answer 消息 - 成员响应 Offer 时发送 */
  WEBRTC_ANSWER = 'WEBRTC_ANSWER',
  
  /** ICE Candidate 消息 - 交换网络候选地址 */
  WEBRTC_ICE_CANDIDATE = 'WEBRTC_ICE_CANDIDATE',
  
  /** 结束连接消息 - 主动关闭 WebRTC 连接 */
  WEBRTC_END = 'WEBRTC_END',
  
  /** 错误消息 - 信令过程中的错误通知 */
  WEBRTC_ERROR = 'WEBRTC_ERROR',
}

/**
 * WebRTC 信令消息基础接口
 * 所有 WebRTC 信令消息都包含这些基础字段
 */
export interface BaseWebRTCSignalingMessage {
  /** 消息类型 */
  type: WebRTCSignalingType;
  
  /** 房间ID - 标识消息所属的房间 */
  roomId: string;
  
  /** 发送者用户ID - 标识消息的发送者 */
  fromUserId: string;
  
  /** 接收者用户ID - 标识消息的目标接收者（对于广播消息可能为空） */
  toUserId: string | null;
  
  /** 消息时间戳（毫秒） */
  timestamp: number;
  
  /** 协议版本号 - 用于未来扩展和兼容性处理 */
  version?: string;
}

/**
 * WebRTC Offer 消息
 * 房主创建 WebRTC 连接时发送，包含 SDP Offer
 */
export interface WebRTCOfferMessage extends BaseWebRTCSignalingMessage {
  type: WebRTCSignalingType.WEBRTC_OFFER;
  
  /** SDP Offer 内容 - WebRTC Session Description Protocol Offer */
  sdp: string;
  
  /** SDP 类型，通常为 "offer" */
  sdpType: 'offer';
  
  /** 扩展字段：用于未来支持多 track（音频、视频分离） */
  tracks?: {
    /** 音频 track ID */
    audioTrackId?: string;
    /** 视频 track ID */
    videoTrackId?: string;
  };
}

/**
 * WebRTC Answer 消息
 * 成员响应 Offer 时发送，包含 SDP Answer
 */
export interface WebRTCAnswerMessage extends BaseWebRTCSignalingMessage {
  type: WebRTCSignalingType.WEBRTC_ANSWER;
  
  /** SDP Answer 内容 - WebRTC Session Description Protocol Answer */
  sdp: string;
  
  /** SDP 类型，通常为 "answer" */
  sdpType: 'answer';
  
  /** 扩展字段：用于未来支持多 track */
  tracks?: {
    audioTrackId?: string;
    videoTrackId?: string;
  };
}

/**
 * ICE Candidate 消息
 * 用于交换网络候选地址，建立 P2P 连接
 */
export interface WebRTCICECandidateMessage extends BaseWebRTCSignalingMessage {
  type: WebRTCSignalingType.WEBRTC_ICE_CANDIDATE;
  
  /** ICE Candidate 对象 - 包含网络候选地址信息 */
  candidate: RTCIceCandidateInit | null;
  
  /** 候选地址字符串（兼容格式） */
  candidateString?: string;
  
  /** 关联的 SDP 媒体行索引 */
  sdpMLineIndex?: number | null;
  
  /** 关联的 SDP 媒体行标识 */
  sdpMid?: string | null;
}

/**
 * WebRTC 结束连接消息
 * 主动关闭 WebRTC 连接时发送
 */
export interface WebRTCEndMessage extends BaseWebRTCSignalingMessage {
  type: WebRTCSignalingType.WEBRTC_END;
  
  /** 结束原因 */
  reason?: string;
}

/**
 * WebRTC 错误消息
 * 信令过程中的错误通知
 */
export interface WebRTCErrorMessage extends BaseWebRTCSignalingMessage {
  type: WebRTCSignalingType.WEBRTC_ERROR;
  
  /** 错误代码 */
  errorCode?: string;
  
  /** 错误消息 */
  errorMessage: string;
  
  /** 错误详情（可选） */
  errorDetails?: Record<string, unknown>;
}

/**
 * WebRTC 信令消息联合类型
 * 所有可能的 WebRTC 信令消息类型
 */
export type WebRTCSignalingMessage =
  | WebRTCOfferMessage
  | WebRTCAnswerMessage
  | WebRTCICECandidateMessage
  | WebRTCEndMessage
  | WebRTCErrorMessage;

/**
 * 类型守卫函数：检查消息是否为 Offer 消息
 */
export function isWebRTCOfferMessage(
  message: WebRTCSignalingMessage
): message is WebRTCOfferMessage {
  return message.type === WebRTCSignalingType.WEBRTC_OFFER;
}

/**
 * 类型守卫函数：检查消息是否为 Answer 消息
 */
export function isWebRTCAnswerMessage(
  message: WebRTCSignalingMessage
): message is WebRTCAnswerMessage {
  return message.type === WebRTCSignalingType.WEBRTC_ANSWER;
}

/**
 * 类型守卫函数：检查消息是否为 ICE Candidate 消息
 */
export function isWebRTCICECandidateMessage(
  message: WebRTCSignalingMessage
): message is WebRTCICECandidateMessage {
  return message.type === WebRTCSignalingType.WEBRTC_ICE_CANDIDATE;
}

/**
 * 类型守卫函数：检查消息是否为 End 消息
 */
export function isWebRTCEndMessage(
  message: WebRTCSignalingMessage
): message is WebRTCEndMessage {
  return message.type === WebRTCSignalingType.WEBRTC_END;
}

/**
 * 类型守卫函数：检查消息是否为 Error 消息
 */
export function isWebRTCErrorMessage(
  message: WebRTCSignalingMessage
): message is WebRTCErrorMessage {
  return message.type === WebRTCSignalingType.WEBRTC_ERROR;
}

/**
 * 验证 WebRTC 信令消息的基本结构
 */
export function validateWebRTCSignalingMessage(
  message: unknown
): message is WebRTCSignalingMessage {
  if (!message || typeof message !== 'object') {
    return false;
  }

  const msg = message as Record<string, unknown>;

  // 检查必需的基础字段
  if (
    !msg.type ||
    typeof msg.type !== 'string' ||
    !Object.values(WebRTCSignalingType).includes(msg.type as WebRTCSignalingType)
  ) {
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
  const type = msg.type as WebRTCSignalingType;
  switch (type) {
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
