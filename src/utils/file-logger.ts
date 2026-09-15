/**
 * 滚动日志器
 *
 * 按日期滚动日志文件，保留最近指定天数的日志。
 * 同时输出到控制台。
 */

import { appendFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

export interface FileLoggerOptions {
  /** 日志目录 */
  dir?: string;
  /** 日志文件名前缀 */
  prefix?: string;
  /** 保留天数 */
  retentionDays?: number;
  /** 是否同时输出到控制台 */
  console?: boolean;
}

export class FileLogger {
  private dir: string;
  private prefix: string;
  private retentionDays: number;
  private console: boolean;
  private currentDate: string = '';
  private logFile: string = '';

  constructor(options: FileLoggerOptions = {}) {
    this.dir = options.dir || 'logs';
    this.prefix = options.prefix || 'gsuid-adapter';
    this.retentionDays = options.retentionDays ?? 2;
    this.console = options.console ?? true;
  }

  /**
   * 初始化日志系统
   */
  init(): void {
    if (!existsSync(this.dir)) {
      mkdirSync(this.dir, { recursive: true });
    }
    this.rotate();
    this.currentDate = this.getDateString();
    this.logFile = join(this.dir, `${this.prefix}-${this.currentDate}.log`);
  }

  /**
   * 清理过期日志
   */
  private rotate(): void {
    try {
      if (!existsSync(this.dir)) return;

      const cutoff = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;
      const files = readdirSync(this.dir);

      for (const file of files) {
        if (!file.startsWith(`${this.prefix}-`) || !file.endsWith('.log')) continue;

        const filePath = join(this.dir, file);
        try {
          const stats = statSync(filePath);
          if (stats.mtimeMs < cutoff) {
            unlinkSync(filePath);
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }

  /**
   * 获取当前日期字符串 YYYY-MM-DD
   */
  private getDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 确保日志文件是最新的（日期变更时切换）
   */
  private ensureLogFile(): void {
    const today = this.getDateString();
    if (today !== this.currentDate) {
      this.currentDate = today;
      this.logFile = join(this.dir, `${this.prefix}-${this.currentDate}.log`);
      this.rotate();
    }
  }

  /**
   * 写入日志
   */
  private write(level: string, args: unknown[]): void {
    this.ensureLogFile();

    const timestamp = new Date().toISOString();
    const message = args.map(arg => {
      if (arg instanceof Error) return arg.stack || arg.message;
      if (typeof arg === 'object' && arg !== null) return JSON.stringify(arg);
      return String(arg);
    }).join(' ');

    const line = `[${timestamp}] [${level}] ${message}\n`;

    if (this.console) {
      console.log(`[${level}]`, ...args);
    }

    try {
      appendFileSync(this.logFile, line, 'utf-8');
    } catch {
      // ignore
    }
  }

  debug(...args: unknown[]): void {
    this.write('DEBUG', args);
  }

  info(...args: unknown[]): void {
    this.write('INFO', args);
  }

  warn(...args: unknown[]): void {
    this.write('WARN', args);
  }

  error(...args: unknown[]): void {
    this.write('ERROR', args);
  }

  /**
   * 获取当前日志文件路径
   */
  getLogFilePath(): string {
    return this.logFile;
  }
}
