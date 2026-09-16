/**
 * 插件配置模块
 * 定义默认配置值和配置 Schema
 *
 * 独立运行模式下，不再依赖 NapCatPluginContext 的 NapCatConfig，
 * 改为纯 TypeScript 配置定义 + JSON Schema。
 */

import type { PluginConfig } from './types';

/** 默认配置 */
export const DEFAULT_CONFIG: PluginConfig = {
    gscoreEnable: true,
    forwardSelfMessage: false,
    commandPrefix: '#早柚',
    masterQQ: '',
    groupConfigs: {},
    gscoreUrl: 'ws://localhost:8765',
    gscoreToken: '',
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
    blacklist: [],
    customImageSummary: '',
    masterForwardWhenDisabled: false,
    silentNoPermission: false,
    disableMultiBot: false,
    privateFileForwardEnabled: true,
    privateJsonBase64Enabled: false,
    privateJsonBase64MaxKb: 1024,
    // 独立运行新增字段
    listenHost: '0.0.0.0',
    listenPort: 3002,
    // 反向 WS 鉴权 Token（独立于 GScore Token）
    wsToken: '',
    // HTTP API 配置（优先于 WS 下发 Action）
    httpUrl: '',
    httpToken: '',
};

/**
 * 配置 Schema（用于文档和校验）
 * 独立运行时可用于 CLI 参数校验
 */
export const CONFIG_SCHEMA = {
    type: 'object',
    properties: {
        gscoreEnable: { type: 'boolean', default: true, description: '启用 GScore 适配' },
        forwardSelfMessage: { type: 'boolean', default: false, description: '上报自身消息' },
        commandPrefix: { type: 'string', default: '#早柚', description: '命令前缀' },
        masterQQ: { type: 'string', default: '', description: '主人 QQ（多个用英文逗号分隔）' },
        gscoreUrl: { type: 'string', default: 'ws://localhost:8765', description: 'GScore WebSocket 地址' },
        gscoreToken: { type: 'string', default: '', description: 'GScore 连接 Token' },
        reconnectInterval: { type: 'number', default: 5000, description: '重连间隔（毫秒）' },
        maxReconnectAttempts: { type: 'number', default: 10, description: '最大重连次数（0 为无限）' },
        blacklist: { type: 'array', default: [], description: '黑名单 QQ 号列表' },
        groupConfigs: { type: 'object', default: {}, description: '按群配置（key 为群号）；enabled 缺省视为启用，显式设为 false 才关闭' },
        customImageSummary: { type: 'string', default: '', description: '图片外显文本（逗号分隔）' },
        masterForwardWhenDisabled: { type: 'boolean', default: false, description: '主人正常转发' },
        silentNoPermission: { type: 'boolean', default: false, description: '无权限时静默' },
        disableMultiBot: { type: 'boolean', default: false, description: '禁用多 bot 功能' },
        privateFileForwardEnabled: { type: 'boolean', default: true, description: '私聊转发文件' },
        privateJsonBase64Enabled: { type: 'boolean', default: false, description: '私聊 JSON 转 base64' },
        privateJsonBase64MaxKb: { type: 'number', default: 1024, description: '私聊 JSON 转 base64 大小限制（KB）' },
        listenHost: { type: 'string', default: '0.0.0.0', description: '反向 WS 监听地址' },
        listenPort: { type: 'number', default: 3002, description: '反向 WS 监听端口' },
        wsToken: { type: 'string', default: '', description: '反向 WS 鉴权 Token（连接时需在 URL 中携带 ?token=xxx）' },
        httpUrl: { type: 'string', default: '', description: 'OneBot HTTP API 地址（如 http://172.24.0.2:3000），优先于 WS 下发 Action' },
        httpToken: { type: 'string', default: '', description: 'HTTP API 鉴权 Token（Bearer Token）' },
    },
    required: ['gscoreUrl'],
};

/**
 * 构建 WebUI 配置 Schema（兼容旧版 NapCat 插件模式）
 * 独立运行时不再使用此函数
 */
export function buildConfigSchema(_ctx?: any): any[] {
  // 返回空数组，独立运行模式下不使用 WebUI Schema
  return [];
}
