/**
 * Configuration constants and types for the notification system
 */

export const DEFAULT_CONFIG = {
  MAX_HISTORY_SIZE: 1000,
  BATCH_SIZE: 10,
  BATCH_TIMEOUT: 100,
  LOG_LEVEL: 'info' as const,
} as const;

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface NotificationSystemConfig {
  logLevel: LogLevel;
  maxHistorySize: number;
  batchSize: number;
  batchTimeout: number;
}

export function createConfig(overrides: Partial<NotificationSystemConfig> = {}): NotificationSystemConfig {
  return {
    logLevel: DEFAULT_CONFIG.LOG_LEVEL,
    maxHistorySize: DEFAULT_CONFIG.MAX_HISTORY_SIZE,
    batchSize: DEFAULT_CONFIG.BATCH_SIZE,
    batchTimeout: DEFAULT_CONFIG.BATCH_TIMEOUT,
    ...overrides,
  };
}

/**
 * Simple logger that respects log levels
 */
export class NotificationLogger {
  constructor(private level: LogLevel) {}

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      if (data !== undefined) {
        console.log(`[NotificationSystem:DEBUG] ${message}`, data);
      } else {
        console.log(`[NotificationSystem:DEBUG] ${message}`);
      }
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      if (data !== undefined) {
        console.log(`[NotificationSystem:INFO] ${message}`, data);
      } else {
        console.log(`[NotificationSystem:INFO] ${message}`);
      }
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      if (data !== undefined) {
        console.warn(`[NotificationSystem:WARN] ${message}`, data);
      } else {
        console.warn(`[NotificationSystem:WARN] ${message}`);
      }
    }
  }

  error(message: string, data?: any): void {
    if (this.shouldLog('error')) {
      if (data !== undefined) {
        console.error(`[NotificationSystem:ERROR] ${message}`, data);
      } else {
        console.error(`[NotificationSystem:ERROR] ${message}`);
      }
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'silent'];
    const currentIndex = levels.indexOf(this.level);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }
}
