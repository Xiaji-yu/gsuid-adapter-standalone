/**
 * 协议适配器接口
 *
 * 每种 bot carrier（NapCat / SnowLuma / 标准 OneBot）实现一个 ProtocolAdapter，
 * 负责将上游的原始 WebSocket 消息解析为统一的 MessageEnvelope / MetaEnvelope，
 * 并在需要时将 ActionRequest 序列化为上游能识别的格式。
 */

import type WebSocket from 'ws';
import type { MessageEnvelope, MetaEnvelope } from './message-envelope';
import type { ActionRequest, ActionResponse } from './bot-carrier';

export type { ActionRequest, ActionResponse } from './bot-carrier';

/**
 * 协议适配器接口
 */
export interface ProtocolAdapter {
  /** 适配器唯一标识 */
  readonly type: string;

  /**
   * WS 连接建立时调用
   * 可用于发送鉴权、初始化消息等
   */
  handleOpen?(ws: WebSocket): void | Promise<void>;

  /**
   * 处理原始消息
   * @param ws 对应的 WebSocket 连接
   * @param raw 原始字符串（可能是 JSON）
   * @returns 解析后的标准事件，若无法解析则返回 null
   */
  handleMessage(ws: WebSocket, raw: string): MessageEnvelope | MetaEnvelope | null;

  /**
   * WS 连接关闭时调用
   */
  handleClose?(ws: WebSocket, code: number, reason: string): void;

  /**
   * 将 ActionRequest 序列化为上游格式的字符串
   * 默认返回 JSON 字符串
   */
  serializeActionRequest?(request: ActionRequest): string;

  /**
   * 解析上游返回的 ActionResponse
   * 默认从 JSON 解析
   */
  parseActionResponse?(raw: string): ActionResponse | null;
}
