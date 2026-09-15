/**
 * 全局状态管理模块（单例模式）
 *
 * 封装插件的配置持久化和运行时状态，提供在项目任意位置访问
 * config、logger 等对象的能力，无需逐层传递参数。
 *
 * 独立运行模式下，不再依赖 NapCatPluginContext，改为注入式依赖。
 */

import fs from 'fs';
import path from 'path';
import type { PluginLogger } from './types';
import { DEFAULT_CONFIG } from '../config';
import type { PluginConfig, GroupConfig } from '../types';
import { ActionDispatcher } from '../action-dispatcher';

// ==================== 配置清洗工具 ====================

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * 配置清洗函数
 * 确保从文件读取的配置符合预期类型，防止运行时错误
 */
export function sanitizeConfig(raw: unknown): PluginConfig {
  if (!isObject(raw)) return { ...DEFAULT_CONFIG, groupConfigs: {} };

  const out: PluginConfig = { ...DEFAULT_CONFIG, groupConfigs: {} };

  if (typeof raw.gscoreEnable === 'boolean') out.gscoreEnable = raw.gscoreEnable;
  if (typeof raw.forwardSelfMessage === 'boolean') out.forwardSelfMessage = raw.forwardSelfMessage;
  if (typeof raw.commandPrefix === 'string') out.commandPrefix = raw.commandPrefix;
  if (typeof raw.masterQQ === 'string') out.masterQQ = raw.masterQQ;
  if (typeof raw.gscoreUrl === 'string') out.gscoreUrl = raw.gscoreUrl;
  if (typeof raw.gscoreToken === 'string') out.gscoreToken = raw.gscoreToken;
  if (typeof raw.reconnectInterval === 'number') out.reconnectInterval = raw.reconnectInterval;
  if (typeof raw.maxReconnectAttempts === 'number') out.maxReconnectAttempts = raw.maxReconnectAttempts;
  if (typeof raw.customImageSummary === 'string') out.customImageSummary = raw.customImageSummary;
  if (typeof raw.masterForwardWhenDisabled === 'boolean') out.masterForwardWhenDisabled = raw.masterForwardWhenDisabled;
  if (typeof raw.silentNoPermission === 'boolean') out.silentNoPermission = raw.silentNoPermission;
  if (typeof raw.customForwardInfo === 'boolean') out.customForwardInfo = raw.customForwardInfo;
  if (typeof raw.customForwardQQ === 'string') out.customForwardQQ = raw.customForwardQQ;
  if (typeof raw.customForwardName === 'string') out.customForwardName = raw.customForwardName;
  if (typeof raw.disableMultiBot === 'boolean') out.disableMultiBot = raw.disableMultiBot;
  if (typeof raw.privateFileForwardEnabled === 'boolean') out.privateFileForwardEnabled = raw.privateFileForwardEnabled;
  if (typeof raw.privateJsonBase64Enabled === 'boolean') out.privateJsonBase64Enabled = raw.privateJsonBase64Enabled;
  if (typeof raw.privateJsonBase64MaxKb === 'number') out.privateJsonBase64MaxKb = raw.privateJsonBase64MaxKb;

  // 独立运行字段
  if (typeof raw.listenHost === 'string') out.listenHost = raw.listenHost;
  if (typeof raw.listenPort === 'number') out.listenPort = raw.listenPort;
  if (Array.isArray(raw.adapterTypes)) out.adapterTypes = raw.adapterTypes;
  if (typeof raw.wsToken === 'string') out.wsToken = raw.wsToken;
  if (typeof raw.httpUrl === 'string') out.httpUrl = raw.httpUrl;
  if (typeof raw.httpToken === 'string') out.httpToken = raw.httpToken;

  if (Array.isArray(raw.blacklist)) {
    out.blacklist = raw.blacklist.filter((item: unknown) => typeof item === 'string');
  }

  if (isObject(raw.groupConfigs)) {
    for (const [groupId, groupConfig] of Object.entries(raw.groupConfigs)) {
      if (isObject(groupConfig)) {
        const cfg: GroupConfig = {};
        if (typeof groupConfig.enabled === 'boolean') cfg.enabled = groupConfig.enabled;
        if (typeof groupConfig.forwardPrefix === 'string') cfg.forwardPrefix = groupConfig.forwardPrefix;
        out.groupConfigs[groupId] = cfg;
      }
    }
  }

  return out;
}

// ==================== 插件全局状态类 ====================

export class PluginState {
  /** 日志器（注入） */
  private _logger: PluginLogger;

  /** 插件配置 */
  config: PluginConfig = { ...DEFAULT_CONFIG };

  /** 插件启动时间戳 */
  startTime: number = 0;

  /** 机器人自身 QQ 号 */
  selfId: string = '';
  /** 机器人自身昵称 */
  selfNickname: string = '';

  /** 配置持久化路径 */
  private configPath: string;

  /** 是否已初始化 */
  private initialized: boolean = false;

  constructor(logger: PluginLogger, configPath: string) {
    this._logger = logger;
    this.configPath = configPath;
  }

  get logger(): PluginLogger {
    return this._logger;
  }

  // ==================== 生命周期 ====================

  /**
   * 初始化（在 main 入口中调用）
   */
  async init(): Promise<void> {
    this.startTime = Date.now();
    this.loadConfig();
    await this.fetchSelfId();
    this.initialized = true;
  }

  /**
   * 获取机器人自身信息（异步，init 时自动调用）
   * 通过 ActionDispatcher 调用 get_login_info
   */
  private async fetchSelfId(): Promise<void> {
    try {
      const res = await ActionDispatcher.getInstance().call(
        'get_login_info',
        {},
        undefined,
        5000
      ) as { user_id?: number | string; nickname?: string } | void;
      if (res?.user_id) {
        this.selfId = String(res.user_id);
        this.logger.debug('(｡·ω·｡) 机器人 QQ: ' + this.selfId);
      }
      if (res?.nickname) {
        this.selfNickname = String(res.nickname);
        this.logger.debug('(｡·ω·｡) 机器人昵称: ' + this.selfNickname);
      }
    } catch (e) {
      this.logger.warn('(；′⌒`) 获取机器人自身信息失败:', e as Error);
    }
  }

  // ==================== 配置管理 ====================

  /**
   * 从磁盘加载配置
   */
  loadConfig(): void {
    try {
      if (this.configPath && fs.existsSync(this.configPath)) {
        const raw = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        this.config = sanitizeConfig(raw);
        this.logger.debug('已加载本地配置');
      } else {
        this.config = { ...DEFAULT_CONFIG, groupConfigs: {} };
        this.saveConfig();
        this.logger.debug('配置文件不存在，已创建默认配置');
      }
    } catch (error) {
      this.logger.error('加载配置失败，使用默认配置:', error as Error);
      this.config = { ...DEFAULT_CONFIG, groupConfigs: {} };
    }
  }

  /**
   * 保存配置到磁盘
   */
  saveConfig(): void {
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (error) {
      this.logger.error('保存配置失败:', error as Error);
    }
  }

  /**
   * 合并更新配置
   */
  updateConfig(partial: Partial<PluginConfig>): void {
    this.config = { ...this.config, ...partial };
    this.saveConfig();
  }

  /**
   * 完整替换配置
   */
  replaceConfig(config: PluginConfig): void {
    this.config = sanitizeConfig(config);
    this.saveConfig();
  }

  /**
   * 更新指定群的配置
   */
  updateGroupConfig(groupId: string, config: Partial<GroupConfig>): void {
    this.config.groupConfigs[groupId] = {
      ...this.config.groupConfigs[groupId],
      ...config,
    };
    this.saveConfig();
  }

  /**
   * 检查群是否启用（默认启用，除非明确设置为 false）
   */
  isGroupEnabled(groupId: string): boolean {
    return this.config.groupConfigs[groupId]?.enabled !== false;
  }

  /** 获取群消息转发前缀（默认空） */
  getGroupForwardPrefix(groupId: string): string {
    return this.config.groupConfigs[groupId]?.forwardPrefix || '';
  }

  // ==================== 黑名单管理 ====================

  addToBlacklist(userId: string): void {
    if (!this.config.blacklist.includes(userId)) {
      this.config.blacklist.push(userId);
      this.saveConfig();
    }
  }

  removeFromBlacklist(userId: string): void {
    const index = this.config.blacklist.indexOf(userId);
    if (index !== -1) {
      this.config.blacklist.splice(index, 1);
      this.saveConfig();
    }
  }

  isBlacklisted(userId: string): boolean {
    return this.config.blacklist.includes(userId);
  }

  // ==================== 工具方法 ====================

  getUptime(): number {
    return Date.now() - this.startTime;
  }

  getUptimeFormatted(): string {
    const ms = this.getUptime();
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);

    if (d > 0) return `${d}天${h % 24}小时`;
    if (h > 0) return `${h}小时${m % 60}分钟`;
    if (m > 0) return `${m}分钟${s % 60}秒`;
    return `${s}秒`;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// ==================== 导出单例 ====================

export const pluginState: PluginState = new Proxy({} as PluginState, {
  get(_target, prop: string | symbol) {
    const instance = getPluginState();
    const value = (instance as any)[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
  set(_target, prop: string | symbol, value: any) {
    const instance = getPluginState();
    (instance as any)[prop] = value;
    return true;
  },
  has(_target, prop: string | symbol) {
    const instance = getPluginState();
    return prop in instance;
  },
});

let pluginStateInstance: PluginState | null = null;

export function createPluginState(logger: PluginLogger, configPath: string): PluginState {
  pluginStateInstance = new PluginState(logger, configPath);
  return pluginStateInstance;
}

export function getPluginState(): PluginState {
  if (!pluginStateInstance) {
    throw new Error('PluginState 尚未初始化，请先调用 createPluginState()');
  }
  return pluginStateInstance;
}
