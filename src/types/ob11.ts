/**
 * OneBot v11 标准类型（本地定义）
 *
 * 项目原先通过 napcat-types 包引入 OB11Message / OB11PostSendMsg，
 * 但该包发布的源码包含语法错误且缺少上游依赖（ajv、napcat-protobuf 等），
 * 无法独立通过类型检查，因此在此本地定义项目实际使用的 OneBot v11 类型子集。
 *
 * 注意：以下均使用 type 别名而非 interface，以便这些类型可以赋值给
 * Record<string, unknown>（ActionDispatcher API 参数所需）。
 */

/** OneBot v11 消息段 */
export type OB11MessageSegment = {
  /** 消息段类型，如 text / image / at / reply / face / file */
  type: string;
  /** 消息段数据 */
  data: Record<string, unknown>;
};

/** OneBot v11 发送者信息 */
export type OB11Sender = {
  /** 发送者 QQ */
  user_id: number | string;
  /** 昵称 */
  nickname: string;
  /** 群名片（群消息时存在） */
  card?: string;
  /** 群内角色 */
  role?: 'owner' | 'admin' | 'member';
};

/**
 * OneBot v11 消息事件
 * 字段与 OneBot v11 规范及项目实际使用保持一致
 */
export type OB11Message = {
  /** 消息 ID */
  message_id: number | string;
  /** 消息类型：group / private */
  message_type: 'group' | 'private';
  /** 消息原始内容（纯文本） */
  raw_message: string;
  /** 消息段数组 */
  message: OB11MessageSegment[];
  /** 发送者信息 */
  sender: OB11Sender;
  /** 群 ID（群消息时存在） */
  group_id?: number | string;
  /** 发送者 QQ */
  user_id: number | string;
  /** 机器人自身 QQ */
  self_id: number | string;
  /** 事件时间戳（秒） */
  time: number;
  /** 是否为机器人自身消息 */
  is_self?: boolean;
};

/**
 * OneBot v11 send_msg 接口参数
 */
export type OB11PostSendMsg = {
  /** 消息内容：消息段数组或纯文本字符串 */
  message: OB11MessageSegment[] | string;
  /** 消息类型：group / private */
  message_type?: 'group' | 'private';
  /** 群号（群消息时使用） */
  group_id?: number | string;
  /** QQ 号（私聊时使用） */
  user_id?: number | string;
  /** 是否作为纯文本发送（跳过 CQ 码解析） */
  auto_escape?: boolean;
};
