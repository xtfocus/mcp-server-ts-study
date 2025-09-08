import type { ProgressNotification } from '@modelcontextprotocol/sdk/types.js';
import type { 
  AnyNotification, 
  NotificationServiceConfig, 
  StatusNotification, 
  ResultChunkNotification
} from './types';
import { BaseNotificationHandler, createBaseNotifier } from './base-notifier';
import { ProgressTracker, HierarchicalProgressTracker, createProgressTracker, createHierarchicalProgressTracker } from './progress-tracker';
import type { TaskPhase } from './types';

export class NotificationService {
  private sendNotification: (notification: AnyNotification) => Promise<void>;
  private config: Required<NotificationServiceConfig>;
  private batch: AnyNotification[] = [];
  private batchTimeout?: NodeJS.Timeout;

  constructor(
    sendNotification: (notification: AnyNotification) => Promise<void>,
    config: NotificationServiceConfig = {}
  ) {
    this.sendNotification = sendNotification;
    this.config = {
      batchSize: config.batchSize || 10,
      batchTimeout: config.batchTimeout || 100,
      maxHistorySize: config.maxHistorySize || 1000,
    };
    
    console.log(`[NotificationService] Created with config:`, this.config);
  }

  async sendProgress(
    token: string | number,
    progress: number,
    message?: string,
    total?: number
  ): Promise<void> {
    console.log(`[NotificationService] sendProgress called:`, {
      token,
      progress,
      total,
      message
    });
    
    const notification: ProgressNotification = {
      method: 'notifications/progress',
      params: {
        progressToken: token,
        progress,
        ...(total && { total }),
        ...(message && { message }),
      },
    };

    try {
      await this.sendNotification(notification);
      console.log(`[NotificationService] Progress notification sent successfully`);
    } catch (error) {
      console.error('[NotificationService] Failed to send progress notification:', {
        token,
        progress,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async sendStatus(
    type: 'info' | 'warning' | 'error' | 'success',
    message: string,
    data?: any
  ): Promise<void> {
    console.log(`[NotificationService] sendStatus called:`, {
      type,
      message,
      data
    });
    
    const notification: StatusNotification = {
      method: 'notifications/status',
      params: {
        type,
        message,
        ...(data && { data }),
        timestamp: new Date().toISOString(),
      },
    };

    try {
      await this.sendNotification(notification);
      console.log(`[NotificationService] Status notification sent successfully`);
    } catch (error) {
      console.error('[NotificationService] Failed to send status notification:', {
        type,
        message,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async sendResultChunk(
    token: string | number,
    chunk: any,
    message?: string,
    total?: number
  ): Promise<void> {
    const notification: ResultChunkNotification = {
      method: 'notifications/result_chunk',
      params: {
        progressToken: token,
        chunk,
        ...(message && { message }),
        ...(total && { total }),
      },
    };

    await this.sendNotification(notification);
  }

  /**
   * Create a generic base notifier - completely agnostic about task nature
   * Developers can use this to emit any type of notification
   */
  createBaseNotifier(token?: string | number): BaseNotificationHandler | null {
    return createBaseNotifier(token, this.sendNotification.bind(this));
  }

  /**
   * Create a step-based progress tracker
   */
  createProgressTracker(token?: string | number): ProgressTracker | null {
    return createProgressTracker(token, this.sendNotification.bind(this), this.config.maxHistorySize);
  }

  /**
   * Create a hierarchical progress tracker with phases
   */
  createHierarchicalProgressTracker(
    token?: string | number,
    phases: TaskPhase[] = []
  ): HierarchicalProgressTracker | null {
    return createHierarchicalProgressTracker(token, this.sendNotification.bind(this), phases);
  }

  async withNotifications<T>(
    fn: (notifier: NotificationService) => Promise<T>
  ): Promise<T> {
    try {
      return await fn(this);
    } catch (error) {
      await this.sendStatus('error', 'Operation failed', { error: (error as Error).message });
      throw error;
    }
  }

  // Batch notification methods for high-frequency updates
  async addToBatch(notification: AnyNotification): Promise<void> {
    this.batch.push(notification);
    
    if (this.batch.length >= this.config.batchSize) {
      await this.flushBatch();
    } else if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => this.flushBatch(), this.config.batchTimeout);
    }
  }

  private async flushBatch(): Promise<void> {
    if (this.batch.length === 0) return;
    
    const batchToSend = [...this.batch];
    this.batch = [];
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = undefined;
    }

    // Send all notifications in the batch
    for (const notification of batchToSend) {
      try {
        await this.sendNotification(notification);
      } catch (error) {
        console.warn('Failed to send batched notification:', error);
      }
    }
  }

  async flush(): Promise<void> {
    await this.flushBatch();
  }
}
