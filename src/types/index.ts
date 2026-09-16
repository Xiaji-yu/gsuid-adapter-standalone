/**
 * 类型目录汇总导出
 *
 * 使 `./types` / `../types` 形式的导入可以解析到本目录的类型定义。
 * 全部为类型导出，运行时会被完全擦除。
 */

export type { PluginConfig, GroupConfig, PluginLogger } from './types';
export type { MessageEnvelope, MetaEnvelope, MessageSegment, SenderInfo } from './message-envelope';
export type { BotCarrier, BotCarrierOptions, ActionRequest, ActionResponse } from './bot-carrier';
export type { ProtocolAdapter } from './adapter';
export type { OB11Message, OB11PostSendMsg, OB11MessageSegment, OB11Sender } from './ob11';
