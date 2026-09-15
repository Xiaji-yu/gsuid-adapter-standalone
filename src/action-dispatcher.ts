/**
 * Action Dispatcher
 *
 * 替代 NapCat 插件层的 `ctx.actions.call()`。
 * 优先通过 HTTP 调用 OneBot API（SnowLuma/NapCat 等暴露的 HTTP 端口），
 * 如果未配置 HTTP 地址，则 fallback 到 WebSocket 下发。
 *
 * 支持的 API：
 *   - send_msg
 *   - delete_msg
 *   - set_group_ban
 *   - get_msg
 *   - get_forward_msg
 *   - get_private_file_url
 *   - get_login_info
 */

import { randomUUID } from 'crypto';
import type { ActionRequest, ActionResponse, BotCarrier } from './types/bot-carrier';
import { BotRegistry } from './bot-registry';

type ActionHandler = (params: Record<string, unknown>) => Promise<unknown>;

export interface ActionDispatcherOptions {
  /** HTTP API 地址（如 http://172.24.0.2:3000），留空则仅使用 WS */
  httpUrl?: string;
  /** HTTP API 鉴权 Token */
  httpToken?: string;
  /** HTTP 请求超时（毫秒） */
  httpTimeout?: number;
}

export class ActionDispatcher {
  private static instance: ActionDispatcher;
  private pendingRequests: Map<
    string,
    { resolve: (value: unknown) => void; reject: (reason: unknown) => void; timer: NodeJS.Timeout }
  > = new Map();
  private registry: BotRegistry;
  private options: ActionDispatcherOptions;

  private constructor(options: ActionDispatcherOptions = {}) {
    this.registry = BotRegistry.getInstance();
    this.options = {
      httpUrl: options.httpUrl || '',
      httpToken: options.httpToken || '',
      httpTimeout: options.httpTimeout ?? 10000,
    };
  }

  static getInstance(options?: ActionDispatcherOptions): ActionDispatcher {
    if (!ActionDispatcher.instance) {
      ActionDispatcher.instance = new ActionDispatcher(options);
    }
    return ActionDispatcher.instance;
  }

  /**
   * 注册到 BotCarrier 的响应处理
   * 当 BotCarrier 收到 ActionResponse 时，调用此方法完成 Promise
   */
  handleResponse(response: ActionResponse): void {
    if (!response.echo) return;
    const pending = this.pendingRequests.get(response.echo);
    if (!pending) return;

    clearTimeout(pending.timer);
    this.pendingRequests.delete(response.echo);

    if (response.status === 'ok') {
      pending.resolve(response.data ?? {});
    } else {
      pending.reject(new Error(response.error || 'Action failed'));
    }
  }

  /**
   * 调用 OneBot API（替代 ctx.actions.call）
   * 优先使用 HTTP，HTTP 不可用时 fallback 到 WS
   * @param action API 名称
   * @param params API 参数
   * @param targetBotId 目标 bot ID，不传则使用当前唯一连接
   * @param timeout 超时时间（毫秒）
   */
  async call(
    action: string,
    params: Record<string, unknown>,
    targetBotId?: string,
    timeout?: number
  ): Promise<unknown> {
    const carrier = targetBotId
      ? this.registry.get(targetBotId)
      : this.getDefaultCarrier();

    if (!carrier) {
      throw new Error(`No bot carrier available for action: ${action}`);
    }

    const echo = randomUUID();
    const request: ActionRequest = {
      action,
      params: this.sanitizeParams(params),
      echo,
    };

    // 优先走 HTTP
    if (this.options.httpUrl) {
      try {
        const result = await this.callHttp(action, request.params, timeout);
        return result;
      } catch (err) {
        // HTTP 调用失败，可能是网络问题，也可能是 OneBot 业务错误
        // OneBot 业务错误（如 retcode != 0）直接抛出，不 fallback 到 WS
        const errorMsg = String(err);
        if (errorMsg.startsWith('[OneBot]')) {
          throw err;
        }
        console.warn(`[ActionDispatcher] HTTP 调用失败，fallback 到 WS: ${err}`);
      }
    } else {
      console.log(`[ActionDispatcher] httpUrl 为空，直接使用 WS 下发: ${action}`);
    }

    // Fallback 到 WS
    return new Promise((resolve, reject) => {
      const wsTimeout = timeout ?? 10000;
      const timer = setTimeout(() => {
        this.pendingRequests.delete(echo);
        reject(new Error(`Action timeout: ${action} (${wsTimeout}ms)`));
      }, wsTimeout);

      this.pendingRequests.set(echo, { resolve, reject, timer });

      carrier
        .sendAction(action, request.params, wsTimeout)
        .then(() => {
          // response will be handled asynchronously via handleResponse
        })
        .catch((err) => {
          clearTimeout(timer);
          this.pendingRequests.delete(echo);
          reject(err);
        });
    });
  }

  /**
   * 通过 HTTP 调用 OneBot API
   */
  private async callHttp(action: string, params: Record<string, unknown>, timeout?: number): Promise<unknown> {
    let baseUrl = this.options.httpUrl!.replace(/\/$/, '');
    // 自动补 http:// 前缀（用户可能只写了 host:port）
    if (!/^https?:\/\//i.test(baseUrl)) {
      baseUrl = `http://${baseUrl}`;
    }
    const url = `${baseUrl}/${action}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.options.httpToken) {
      headers['Authorization'] = `Bearer ${this.options.httpToken}`;
    }

    const controller = new AbortController();
    const timeoutMs = timeout ?? this.options.httpTimeout!;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // OneBot HTTP API 响应格式：{ status: 'ok'|'failed', data: ..., message: ... }
      // status 为 failed 时，说明 HTTP 调用本身成功，只是业务上失败（如权限不足、不在群里等）
      // 这种情况应该直接抛出业务错误，不应该 fallback 到 WS
      if (data.status === 'failed') {
        const errorMsg = data.message || data.wording || `Action failed: ${action}`;
        throw new Error(`[OneBot] ${errorMsg}`);
      }

      return data.data ?? {};
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  /**
   * 获取默认 carrier（当只有一个连接时）
   */
  private getDefaultCarrier(): BotCarrier | undefined {
    const carriers = this.registry.getAll();
    if (carriers.length === 0) return undefined;
    return carriers[0];
  }

  /**
   * 清洗参数：确保所有值都是 JSON 可序列化的
   */
  private sanitizeParams(params: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) {
        result[key] = null;
      } else if (typeof value === 'bigint') {
        result[key] = Number(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * 获取当前注册的 bot 列表
   */
  getConnectedBots(): string[] {
    return this.registry.getAll().map((c) => c.botId);
  }
}
