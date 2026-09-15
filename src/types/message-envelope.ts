/**
 * 标准化消息信封
 * 抹平不同 bot carrier（NapCat / SnowLuma / 其他 OB11 载体）的字段差异，
 * 使下游消息处理逻辑无需关心上游协议细节。
 */

/**
 * 发送者信息
 */
export interface SenderInfo {
  /** 用户 QQ 号 */
  user_id: string;
  /** 昵称 */
  nickname: string;
  /** 群名片 / 备注 */
  card?: string;
  /** 群权限：owner / admin / member */
  role?: 'owner' | 'admin' | 'member';
}

/**
 * 消息段数据（标准化后的最小单元）
 */
export interface MessageSegment {
  type: string;
  data: Record<string, unknown>;
}

/**
 * 标准化消息信封
 * 所有来自 bot carrier 的事件，经 ProtocolAdapter 解析后统一封装为 MessageEnvelope。
 */
export interface MessageEnvelope {
  /** 消息 ID */
  message_id: string;
  /** 消息类型：group / private */
  message_type: 'group' | 'private';
  /** 消息原始内容（纯文本） */
  raw_message: string;
  /** 消息段数组 */
  message: MessageSegment[];
  /** 发送者信息 */
  sender: SenderInfo;
  /** 群 ID（群消息时存在） */
  group_id?: string;
  /** 用户 ID（私聊或群内发送者） */
  user_id: string;
  /** Bot 自身 ID */
  self_id: string;
  /** 事件时间戳（毫秒） */
  time: number;
  /** 是否为 Bot 自身消息 */
  is_self: boolean;
  /** 上游 carrier 类型：napcat / snowluma / generic-ob11 */
  carrier: string;
  /** 原始事件对象（保留用于特殊处理） */
  raw: Record<string, unknown>;
}

/**
 * Meta 事件（notice / 进群 / 退群 / 戳一戳）
 */
export interface MetaEnvelope {
  /** 事件名称：user_join_group / user_exit_group / poke */
  event_name: string;
  /** 事件数据 */
  data: Record<string, unknown>;
  /** Bot 自身 ID */
  self_id: string;
  /** 事件时间戳 */
  time: number;
  /** 上游 carrier 类型 */
  carrier: string;
  /** 原始事件对象 */
  raw: Record<string, unknown>;
}
