/**
 * 类型定义文件
 * 定义插件内部使用的接口和类型
 *
 * 注意：OneBot 相关类型（OB11Message, OB11PostSendMsg 等）
 * 定义于 ./ob11（本地定义，见该文件头部注释）。
 */

// ==================== 插件配置 ====================

/**
 * 日志器接口
 * 独立运行时使用 pino 或 winston 等 logger 实现此接口
 */
export interface PluginLogger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

/**
 * 插件主配置接口
 */
export interface PluginConfig {
    /** 全局开关：是否启用转发功能 */
    gscoreEnable: boolean;
    /** 是否上报/转发机器人自身发送的消息 */
    forwardSelfMessage?: boolean;
    /** 早柚命令前缀，默认为 #早柚，用于群内快捷命令（如 #早柚群启用） */
    commandPrefix: string;
    /** 主人QQ，设置后仅该用户可用群内命令 */
    masterQQ?: string;
    /** GScore 连接地址 */
    gscoreUrl: string;
    /** GScore 连接 Token */
    gscoreToken: string;
    /** 重连间隔（毫秒） */
    reconnectInterval: number;
    /** 最大重连次数 */
    maxReconnectAttempts: number;
    /** 按群的单独配置 */
    groupConfigs: Record<string, GroupConfig>;
    /** 用户黑名单（QQ号列表），拉黑后不转发该用户消息到 GScore */
    blacklist: string[];
    /** 自定义图片外显 */
    customImageSummary?: string;
    /** 主人正常转发开关，开启后禁用群聊后主人仍可正常转发消息 */
    masterForwardWhenDisabled?: boolean;
    /** 无权限时静默（不回复权限提示） */
    silentNoPermission?: boolean;
    /** 扩展兼容：禁用多 bot 功能，开启后固定使用 napcat 作为 bot_id */
    disableMultiBot?: boolean;
    /** 扩展兼容：是否开启私聊 file 消息转发（通过 get_private_file_url 获取链接） */
    privateFileForwardEnabled?: boolean;
    /** 扩展兼容：是否开启私聊 JSON 文件转 base64 发送 */
    privateJsonBase64Enabled?: boolean;
    /** 扩展兼容：私聊 JSON 文件转 base64 的大小限制（KB） */
    privateJsonBase64MaxKb?: number;
    /** 反向 WS 监听地址（独立运行模式） */
    listenHost?: string;
    /** 反向 WS 监听端口（独立运行模式） */
    listenPort?: number;
    /** 反向 WS 鉴权 Token（连接时需在 URL 中携带 ?token=xxx） */
    wsToken?: string;
    /** SnowLuma/NapCat 等 OneBot 载体暴露的 HTTP API 地址（如 http://172.24.0.2:3000） */
    httpUrl?: string;
    /** HTTP API 鉴权 Token（Bearer Token） */
    httpToken?: string;
}

/**
 * 群配置
 */
export interface GroupConfig {
    /** 是否启用此群的功能 */
    enabled?: boolean;
    /** 群消息转发前缀，留空则转发全部消息 */
    forwardPrefix?: string;
}
