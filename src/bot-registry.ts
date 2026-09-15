/**
 * Bot 注册表
 *
 * 管理所有通过反向 WS 连接到 Adapter 的 bot carrier。
 * 单例模式，全局唯一。
 */

import type { BotCarrier } from '../types/bot-carrier';

export class BotRegistry {
  private static instance: BotRegistry;
  private carriers: Map<string, BotCarrier> = new Map();
  private wsToBotId: Map<WebSocket, string> = new Map();

  private constructor() {}

  static getInstance(): BotRegistry {
    if (!BotRegistry.instance) {
      BotRegistry.instance = new BotRegistry();
    }
    return BotRegistry.instance;
  }

  /**
   * 注册 bot carrier
   */
  register(carrier: BotCarrier): void {
    this.carriers.set(carrier.botId, carrier);
    this.wsToBotId.set(carrier.ws, carrier.botId);
  }

  /**
   * 注销 bot carrier
   */
  unregister(botId: string): void {
    const carrier = this.carriers.get(botId);
    if (carrier) {
      this.wsToBotId.delete(carrier.ws);
      this.carriers.delete(botId);
    }
  }

  /**
   * 根据 WebSocket 查找 bot carrier
   */
  getByWs(ws: WebSocket): BotCarrier | undefined {
    const botId = this.wsToBotId.get(ws);
    if (botId) return this.carriers.get(botId);
    return undefined;
  }

  /**
   * 根据 botId 查找 carrier
   */
  get(botId: string): BotCarrier | undefined {
    return this.carriers.get(botId);
  }

  /**
   * 获取所有 carrier
   */
  getAll(): BotCarrier[] {
    return Array.from(this.carriers.values());
  }

  /**
   * 获取在线 carrier 数量
   */
  get size(): number {
    return this.carriers.size;
  }

  /**
   * 清空注册表
   */
  clear(): void {
    this.carriers.forEach((carrier) => {
      this.wsToBotId.delete(carrier.ws);
      try {
        carrier.close();
      } catch (e) {
        // ignore
      }
    });
    this.carriers.clear();
  }
}
