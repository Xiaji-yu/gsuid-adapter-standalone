/**
 * 反向 WS Server
 *
 * 监听指定端口，接收来自 NapCat / SnowLuma / 其他 OneBot 载体的 WebSocket 连接。
 * 每个连接建立后，根据握手信息分配 ProtocolAdapter，
 * 将解析出的事件分发给 BotRegistry 和 MessageHandler。
 */

import WebSocket, { WebSocketServer } from 'ws';
import type { ProtocolAdapter } from '../types/adapter';
import type { MessageEnvelope, MetaEnvelope } from '../types/message-envelope';
import type { BotCarrier } from '../types/bot-carrier';
import { BotRegistry } from '../bot-registry';
import { ActionDispatcher } from '../action-dispatcher';
import type { PluginLogger } from '../types';

export interface WsServerOptions {
  /** 监听地址，默认 0.0.0.0 */
  host?: string;
  /** 监听端口，默认 3002 */
  port?: number;
  /** 可选的鉴权 token */
  token?: string;
  /** 日志器 */
  logger?: PluginLogger;
}

export class WsServer {
  private wss: WebSocketServer | null = null;
  private options: Required<WsServerOptions>;
  private adapters: Map<string, ProtocolAdapter> = new Map();

  constructor(options: WsServerOptions = {}) {
    this.options = {
      host: options.host ?? '0.0.0.0',
      port: options.port ?? 3002,
      token: options.token ?? '',
      logger: options.logger ?? console,
    };
  }

  /**
   * 注册协议适配器
   */
  registerAdapter(adapter: ProtocolAdapter): void {
    this.adapters.set(adapter.type, adapter);
  }

  /**
   * 启动 WS Server
   */
  start(): void {
    if (this.wss) {
      this.options.logger.warn('[WS] Server is already running');
      return;
    }

    this.wss = new WebSocketServer({ host: this.options.host, port: this.options.port });

    this.wss.on('listening', () => {
      this.options.logger.info(`[WS] Server listening on ${this.options.host}:${this.options.port}`);
    });

    this.wss.on('connection', (ws, req) => {
      const clientIp = req.socket.remoteAddress || 'unknown';
      this.options.logger.info(`[WS] New connection from ${clientIp}`);

      // Token 鉴权（如果配置了 token）
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token') || '';

      if (this.options.token && token !== this.options.token) {
        this.options.logger.warn(`[WS] Connection rejected: invalid token from ${clientIp}`);
        ws.close(1008, 'Invalid token');
        return;
      }

      // 协议适配器选择：优先从 query 参数读取，否则尝试自动检测
      const adapterType = url.searchParams.get('adapter') || 'generic-ob11';
      const adapter = this.adapters.get(adapterType) || this.adapters.get('generic-ob11');

      if (!adapter) {
        this.options.logger.error(`[WS] No adapter found for type: ${adapterType}`);
        ws.close(1011, `No adapter: ${adapterType}`);
        return;
      }

      // 调用适配器 open 钩子（兼容返回 void 或 Promise）
      if (adapter.handleOpen) {
        Promise.resolve(adapter.handleOpen(ws)).catch((err) => {
          this.options.logger.error(`[WS] Adapter ${adapterType} handleOpen error:`, err);
        });
      }

      // 注册 BotCarrier
      this.registerCarrier(ws, adapterType);

      // 消息处理（事件消息）
      ws.on('message', (data) => {
        try {
          const raw = typeof data === 'string' ? data : data.toString('utf-8');
          const result = adapter.handleMessage(ws, raw);

          if (result) {
            this.handleParsedEvent(result, ws);
          }
        } catch (err) {
          this.options.logger.error('[WS] Failed to handle message:', err);
        }
      });

      // Action 响应处理
      ws.on('message', (data) => {
        try {
          const raw = typeof data === 'string' ? data : data.toString('utf-8');
          const response = adapter.parseActionResponse
            ? adapter.parseActionResponse(raw)
            : this.defaultParseActionResponse(raw);

          if (response) {
            ActionDispatcher.getInstance().handleResponse(response);
          }
        } catch (err) {
          this.options.logger.error('[WS] Failed to parse action response:', err);
        }
      });

      // 关闭处理
      ws.on('close', (code, reason) => {
        this.options.logger.info(`[WS] Connection closed: ${code} ${reason.toString()}`);
        const carrier = BotRegistry.getInstance().getByWs(ws);
        if (carrier) {
          BotRegistry.getInstance().unregister(carrier.botId);
        }
        if (adapter.handleClose) {
          adapter.handleClose(ws, code, reason.toString());
        }
      });

      ws.on('error', (err) => {
        this.options.logger.error(`[WS] Connection error: ${err.message}`);
      });
    });

    this.wss.on('error', (err) => {
      this.options.logger.error(`[WS] Server error: ${err.message}`);
    });
  }

  /**
   * 停止 Server
   */
  stop(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
      this.options.logger.info('[WS] Server stopped');
    }
  }

  /**
   * 获取监听地址
   */
  getAddress(): { host: string; port: number } {
    if (!this.wss) return this.options;
    const address = this.wss.address();
    if (typeof address === 'string') return { host: this.options.host, port: Number(address) };
    if (address?.port) return { host: address.address || this.options.host, port: address.port };
    return this.options;
  }

  /**
   * 注册 BotCarrier
   */
  private registerCarrier(ws: WebSocket, adapterType: string): void {
    let carrierCreated = false;

    ws.on('message', (data) => {
      if (carrierCreated) return;

      try {
        const raw = typeof data === 'string' ? data : data.toString('utf-8');
        const parsed = JSON.parse(raw);
        const selfId = String(parsed.self_id || parsed.bot_id || `bot-${Date.now()}`);

        const carrier: BotCarrier = {
          botId: selfId,
          ws,
          adapterType,
          online: true,
          lastSeen: Date.now(),
          sendAction: (action, params, timeout) => this.sendActionToWs(ws, action, params, timeout),
          close: () => {
            ws.close();
          },
        };

        BotRegistry.getInstance().register(carrier);
        carrierCreated = true;
        this.options.logger.info(`[WS] Bot registered: ${selfId} (${adapterType})`);
        this.emit('carrier:registered', carrier);
      } catch {
        // 不是 JSON，继续等待
      }
    });
  }

  /**
   * 通过 WS 下发 Action
   */
  private async sendActionToWs(
    ws: WebSocket,
    action: string,
    params: Record<string, unknown>,
    timeout: number
  ): Promise<ActionResponse> {
    const adapter = Array.from(this.adapters.values()).find((a) => a.type === 'generic-ob11') || null;
    const request = { action, params, echo: undefined };

    const payload = adapter?.serializeActionRequest
      ? adapter.serializeActionRequest(request)
      : JSON.stringify(request);

    return new Promise((resolve, reject) => {
      if (ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket is not open'));
        return;
      }

      const timer = setTimeout(() => {
        reject(new Error(`Action timeout: ${action}`));
      }, timeout);

      // 临时监听响应
      const onMessage = (data: WebSocket.RawData) => {
        try {
          const raw = typeof data === 'string' ? data : data.toString('utf-8');
          const response = adapter?.parseActionResponse
            ? adapter.parseActionResponse(raw)
            : this.defaultParseActionResponse(raw);

          if (response && response.echo) {
            clearTimeout(timer);
            ws.removeListener('message', onMessage);
            resolve(response);
          }
        } catch {
          // ignore
        }
      };

      ws.on('message', onMessage);
      ws.send(payload, (err) => {
        if (err) {
          clearTimeout(timer);
          ws.removeListener('message', onMessage);
          reject(err);
        }
      });
    });
  }

  /**
   * 处理解析后的事件
   */
  private handleParsedEvent(event: MessageEnvelope | MetaEnvelope, ws: WebSocket): void {
    const carrier = BotRegistry.getInstance().getByWs(ws);
    if (!carrier) return;

    carrier.lastSeen = Date.now();

    // 事件路由：消息事件 / meta 事件
    // 这里使用事件发射器模式，由外部注册监听器
    this.emit('event', event, carrier);
  }

  // ==================== 简易事件发射器 ====================

  private eventListeners: Map<string, Set<(event: unknown, carrier: BotCarrier) => void>> = new Map();

  on(event: string, handler: (event: unknown, carrier: BotCarrier) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);
    return () => {
      this.eventListeners.get(event)?.delete(handler);
    };
  }

  private emit(event: string, data: unknown, carrier: BotCarrier): void {
    this.eventListeners.get(event)?.forEach((handler) => {
      try {
        handler(data, carrier);
      } catch (err) {
        this.options.logger.error(`[WS] Event handler error [${event}]:`, err);
      }
    });
  }

  // ==================== 默认 ActionResponse 解析 ====================

  private defaultParseActionResponse(raw: string): ActionResponse | null {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
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
}
