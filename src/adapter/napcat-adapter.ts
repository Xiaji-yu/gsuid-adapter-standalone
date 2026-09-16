/**
 * NapCat 反向 WS 协议适配器
 *
 * NapCat 通过反向 WebSocket 推送 OneBot v11 标准 JSON 事件。
 * 本适配器负责将 NapCat 格式的原始 JSON 解析为标准的 MessageEnvelope / MetaEnvelope。
 *
 * NapCat 事件格式（标准 OneBot v11）：
 * {
 *   "post_type": "message",
 *   "message_type": "group",
 *   "time": 1699999999,
 *   "self_id": "123456789",
 *   "user_id": "987654321",
 *   "message_id": 12345,
 *   "group_id": 123456789,
 *   "message": [{"type": "text", "data": {"text": "hello"}}],
 *   "raw_message": "hello",
 *   "sender": {"user_id": 987654321, "nickname": "test", "card": "", "role": "member"}
 * }
 */

import type WebSocket from 'ws';
import type { ProtocolAdapter, ActionRequest, ActionResponse } from '../types/adapter';
import type { MessageEnvelope, MetaEnvelope } from '../types/message-envelope';
import type { PluginLogger } from '../types';

export class NapCatAdapter implements ProtocolAdapter {
  readonly type = 'napcat';
  private logger: PluginLogger;

  constructor(logger?: PluginLogger) {
    this.logger = logger ?? console;
  }

  handleOpen(_ws: WebSocket): void {
    this.logger.debug('[NapCat] Connection opened');
  }

  handleMessage(_ws: WebSocket, raw: string): MessageEnvelope | MetaEnvelope | null {
    try {
      const event = JSON.parse(raw);
      const postType = String(event.post_type || '');

      if (postType === 'message' || postType === 'message_sent') {
        return this.parseMessageEvent(event);
      }

      if (postType === 'notice') {
        return this.parseNoticeEvent(event);
      }

      // 忽略其他类型（request / meta_event 等）
      this.logger.debug(`[NapCat] Ignored event type: ${postType}`);
      return null;
    } catch (err) {
      this.logger.error('[NapCat] Failed to parse message:', err);
      return null;
    }
  }

  handleClose(_ws: WebSocket, code: number, reason: string): void {
    this.logger.debug(`[NapCat] Connection closed: ${code} ${reason}`);
  }

  serializeActionRequest(request: ActionRequest): string {
    // NapCat 反向 WS 下发 action 使用标准 OneBot API 格式
    return JSON.stringify({
      action: request.action,
      params: request.params,
      echo: request.echo,
    });
  }

  parseActionResponse(raw: string): ActionResponse | null {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        // NapCat 返回格式：{ status: 'ok' | 'failed', data: ..., echo: ... }
        return {
          status: parsed.status === 'failed' ? 'failed' : 'ok',
          data: parsed.data,
          error: parsed.error,
          echo: parsed.echo,
        };
      }
    } catch {
      // ignore
    }
    return null;
  }

  // ==================== 私有方法 ====================

  private parseMessageEvent(event: Record<string, unknown>): MessageEnvelope {
    const message = this.parseMessageSegments(event.message);
    const sender = this.parseSender(event.sender, event.user_id);

    return {
      message_id: String(event.message_id || ''),
      message_type: event.message_type === 'private' ? 'private' : 'group',
      raw_message: String(event.raw_message || ''),
      message,
      sender,
      group_id: event.group_id !== undefined ? String(event.group_id) : undefined,
      user_id: String(event.user_id || ''),
      self_id: String(event.self_id || ''),
      time: Number(event.time || Date.now() / 1000),
      is_self: Boolean(event.is_self),
      carrier: this.type,
      raw: event,
    };
  }

  private parseNoticeEvent(event: Record<string, unknown>): MetaEnvelope {
    const noticeType = String(event.notice_type || '');
    const subType = String(event.sub_type || '');

    let eventName: string;
    const data: Record<string, unknown> = {};

    if (noticeType === 'group_increase') {
      eventName = 'user_join_group';
      data.user_id = String(event.user_id || '');
      data.group_id = String(event.group_id || '');
      if (event.operator_id !== undefined) data.operator_id = String(event.operator_id);
    } else if (noticeType === 'group_decrease') {
      eventName = 'user_exit_group';
      data.user_id = String(event.user_id || '');
      data.group_id = String(event.group_id || '');
      if (event.operator_id !== undefined) data.operator_id = String(event.operator_id);
    } else if (noticeType === 'notify' && subType === 'poke') {
      eventName = 'poke';
      data.user_id = String(event.user_id || '');
      data.target_id = String(event.target_id || event.self_id || '');
      if (event.group_id !== undefined) data.group_id = String(event.group_id);
    } else {
      // 不支持的 notice 类型
      eventName = 'unknown';
      data.notice_type = noticeType;
      data.sub_type = subType;
    }

    return {
      event_name: eventName,
      data,
      self_id: String(event.self_id || ''),
      time: Number(event.time || Date.now() / 1000),
      carrier: this.type,
      raw: event,
    };
  }

  private parseMessageSegments(raw: unknown): MessageEnvelope['message'] {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((seg): seg is Record<string, unknown> => seg && typeof seg === 'object')
      .map((seg) => ({
        type: String(seg.type || 'text'),
        data: (seg.data && typeof seg.data === 'object' ? seg.data : {}) as Record<string, unknown>,
      }));
  }

  private parseSender(raw: unknown, fallbackUserId: unknown): MessageEnvelope['sender'] {
    const userId = String(fallbackUserId || '');
    if (raw && typeof raw === 'object') {
      const sender = raw as Record<string, unknown>;
      return {
        user_id: String(sender.user_id || userId),
        nickname: String(sender.nickname || ''),
        card: sender.card !== undefined ? String(sender.card) : undefined,
        role: this.normalizeRole(sender.role),
      };
    }
    return {
      user_id: userId,
      nickname: '',
    };
  }

  private normalizeRole(role: unknown): MessageEnvelope['sender']['role'] {
    const r = String(role || '').toLowerCase();
    if (r === 'owner') return 'owner';
    if (r === 'admin' || r === 'administrator') return 'admin';
    return 'member';
  }
}
