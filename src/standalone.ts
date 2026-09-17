/**
 * 独立运行入口
 *
 * 启动反向 WS Server，等待 NapCat / SnowLuma 等 bot carrier 连接，
 * 拿到第一个连接并解析出 self_id 后，再连接 GScore。
 *
 * 使用方式：
 *   node dist/standalone.mjs
 *   node dist/standalone.mjs --config ./config.json --port 3002
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

import type { PluginLogger } from './types';
import { PluginState, createPluginState, sanitizeConfig } from './core/state';
import { DEFAULT_CONFIG } from './config';
import { GScoreService } from './services/gscore-service';
import { WsServer, NapCatAdapter, SnowLumaAdapter, GenericOB11Adapter } from './adapter';
import type { MessageEnvelope, MetaEnvelope } from './types/message-envelope';
import { ActionDispatcher } from './action-dispatcher';
import { FileLogger } from './utils/file-logger';

// ==================== CLI 参数解析 ====================

function parseArgs(): { configPath: string; port: number; verbose: boolean } {
  const args = process.argv.slice(2);
  let configPath = resolve(process.cwd(), 'config.json');
  let port = 3002;
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--config' && args[i + 1]) {
      configPath = resolve(process.cwd(), args[++i]);
    } else if (arg === '--port' && args[i + 1]) {
      port = parseInt(args[++i], 10);
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    }
  }

  return { configPath, port, verbose };
}

// ==================== 日志器 ====================

function createLogger(verbose: boolean): PluginLogger {
  const fileLogger = new FileLogger({
    dir: 'logs',
    prefix: 'gsuid-adapter',
    retentionDays: 2,
    console: true,
  });
  fileLogger.init();

  return {
    debug: (...args: unknown[]) => { if (verbose) fileLogger.debug(...args); },
    info: (...args: unknown[]) => fileLogger.info(...args),
    warn: (...args: unknown[]) => fileLogger.warn(...args),
    error: (...args: unknown[]) => fileLogger.error(...args),
  };
}

// ==================== 主函数 ====================

async function main(): Promise<void> {
  const { configPath, port, verbose } = parseArgs();
  const logger = createLogger(verbose);

  logger.info('🦊 GScore Adapter 正在启动...');

  // 1. 加载配置
  let rawConfig: Record<string, unknown> = { ...DEFAULT_CONFIG };
  try {
    if (existsSync(configPath)) {
      const raw = readFileSync(configPath, 'utf-8');
      rawConfig = { ...rawConfig, ...(JSON.parse(raw) as Record<string, unknown>) };
      logger.info(`已加载配置: ${configPath}`);
    } else {
      // 写入默认配置
      const { writeFileSync, mkdirSync } = await import('fs');
      const configDir = dirname(configPath);
      if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true });
      }
      writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
      logger.info(`已创建默认配置文件: ${configPath}`);
    }
  } catch (err) {
    logger.error('加载配置失败:', err as Error);
    rawConfig = { ...DEFAULT_CONFIG };
  }

  const config = sanitizeConfig(rawConfig);

  // 2. 初始化 PluginState
  const state = createPluginState(logger, configPath);
  // 用解析后的配置覆盖默认值，确保运行时和持久化都使用用户配置
  state.config = config;
  state.startTime = Date.now();

  // 2.5 初始化 ActionDispatcher（优先走 HTTP）
  // httpToken 为空时自动回退到 wsToken，用户只需填一个 token
  const actionDispatcher = ActionDispatcher.getInstance({
    httpUrl: config.httpUrl || '',
    httpToken: config.httpToken || config.wsToken || '',
    httpTimeout: 10000,
  });

  // 3. 初始化 GScoreService（暂不连接，等拿到 self_id 后再连）
  const gscoreService = GScoreService.getInstance();

  // 4. 启动反向 WS Server
  const wsServer = new WsServer({
    host: config.listenHost || '0.0.0.0',
    port: config.listenPort || port,
    token: config.wsToken || undefined,
    logger,
  });

  // 注册协议适配器
  wsServer.registerAdapter(new NapCatAdapter(logger));
  wsServer.registerAdapter(new SnowLumaAdapter(logger));
  wsServer.registerAdapter(new GenericOB11Adapter(logger));

  let gscoreConnected = false;

  // 监听事件
  wsServer.on('event', (event: unknown, carrier) => {
    const envelope = event as MessageEnvelope | MetaEnvelope;
    if ('message_id' in envelope) {
      // 消息事件
      handleIncomingMessage(envelope, carrier);
    } else {
      // Meta 事件
      handleIncomingMetaEvent(envelope, carrier);
    }
  });

  // 第一个 carrier 注册后，再连接 GScore
  wsServer.on('carrier:registered', async (_event, carrier) => {
    if (gscoreConnected) return;
    gscoreConnected = true;

    state.selfId = carrier.botId;
    logger.info(`[INIT] 检测到 Bot 连接: ${carrier.botId} (${carrier.adapterType})`);

    // 尝试获取机器人昵称
    try {
      const res = await ActionDispatcher.getInstance().call('get_login_info', {});
      if (res && typeof res === 'object' && (res as any).nickname) {
        state.selfNickname = String((res as any).nickname);
        logger.info(`[INIT] 机器人昵称: ${state.selfNickname}`);
      }
    } catch (e) {
      logger.warn('[INIT] 获取机器人信息失败，继续使用默认配置');
    }

    if (config.gscoreEnable) {
      logger.info('[INIT] 正在连接 GScore...');
      gscoreService.connect();
    }
  });

  wsServer.start();

  const address = wsServer.getAddress();
  logger.info(`反向 WS Server 已启动: ${address.host}:${address.port}`);

  // 5. 注册优雅关闭
  const shutdown = async (signal: string) => {
    logger.info(`收到 ${signal}，正在关闭...`);
    gscoreService.disconnect();
    wsServer.stop();
    // 注意：不要在这里 saveConfig()。所有运行时配置变更（黑名单、群开关、
    // 上报开关等）在发生时均已立即持久化；关闭时再整份写回会用内存中的旧
    // 配置覆盖用户在容器运行期间对 config.json 的手动修改（docker restart
    // 的场景下尤其明显）。
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  logger.info('🦊 GScore Adapter 启动完成！');
  logger.info(`监听端口: ${address.port}`);
  logger.info(`GScore 地址: ${config.gscoreUrl}`);
  logger.info(`命令前缀: ${config.commandPrefix || '#早柚'}`);
  logger.info(`HTTP API 地址: ${config.httpUrl || '(未配置)'}`);
  if (config.wsToken) {
    logger.info(`WS 鉴权 Token: 已配置`);
  }
}

// ==================== 事件处理 ====================

async function handleIncomingMessage(event: MessageEnvelope, _carrier: unknown): Promise<void> {
  await handleIncomingEvent(event);
}

async function handleIncomingMetaEvent(event: MetaEnvelope, _carrier: unknown): Promise<void> {
  try {
    const { GScoreService } = await import('./services/gscore-service');
    await GScoreService.getInstance().forwardMetaEvent(event);
  } catch (err) {
    console.error('[META] 转发 meta 事件到 GScore 失败:', err);
  }
}

async function handleIncomingEvent(event: MessageEnvelope): Promise<void> {
  try {
    // 注意：handleMessage 内部会通过 ActionDispatcher 发送回复
    // 这里直接传递标准化的 MessageEnvelope
    const { handleMessage } = await import('./handlers/message-handler');
    await handleMessage(null, event);
  } catch (err) {
    console.error('[MSG] 处理消息事件失败:', err);
  }
}

// ==================== 启动 ====================

main().catch((err) => {
  console.error('❌ 启动失败:', err);
  process.exit(1);
});
