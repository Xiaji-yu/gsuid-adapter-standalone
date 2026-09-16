/**
 * Bot 载体抽象接口
 *
 * 每个连接到 Adapter 的 bot 实例（无论是 NapCat / SnowLuma / 其他 OneBot 载体）
 * 都对应一个 BotCarrier。ActionDispatcher 通过此接口向 bot 下发 API 指令，
 * 无需关心底层是 NapCat 还是 SnowLuma。
 */

import type WebSocket from 'ws';
import type { MessageEnvelope, MetaEnvelope } from './message-envelope';

/**
 * Action 请求（Adapter → Bot Carrier）
 */
export interface ActionRequest {
  /** OneBot API action 名称，如 send_msg / delete_msg / set_group_ban */
  action: string;
  /** API 参数 */
  params: Record<string, unknown>;
  /** 请求 ID，用于匹配响应 */
  echo?: string;
}

/**
 * Action 响应（Bot Carrier → Adapter）
 */
export interface ActionResponse {
  /** 响应状态：ok / failed */
  status: 'ok' | 'failed';
  /** 响应数据（OneBot API return 字段） */
  data?: unknown;
  /** 错误信息（status 为 failed 时存在） */
  error?: string;
  /** 回传的 echo */
  echo?: string;
}

/**
 * Bot 载体接口
 * 每个已连接的 bot 实例需要实现此接口。
 */
export interface BotCarrier {
  /** 唯一标识：通常为 self_id 或自定义 bot_id */
  readonly botId: string;
  /** 底层 WebSocket 连接 */
  readonly ws: WebSocket;
  /** 上游 carrier 类型：napcat / snowluma / generic-ob11 */
  readonly adapterType: string;
  /** 是否在线 */
  readonly online: boolean;
  /** 最后活跃时间戳（毫秒） */
  lastSeen: number;

  /**
   * 下发 Action 请求并等待响应
   * @param action OneBot API action 名称
   * @param params API 参数
   * @param timeout 超时时间（毫秒），默认 10 秒
   */
  sendAction(action: string, params: Record<string, unknown>, timeout?: number): Promise<ActionResponse>;

  /**
   * 主动关闭连接
   */
  close(): void;
}

/**
 * BotCarrier 创建选项
 */
export interface BotCarrierOptions {
  botId: string;
  ws: WebSocket;
  adapterType: string;
  sendAction: (action: string, params: Record<string, unknown>, timeout?: number) => Promise<ActionResponse>;
  close: () => void;
}
