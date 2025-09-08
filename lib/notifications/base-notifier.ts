import type { ProgressNotification } from '@modelcontextprotocol/sdk/types.js';
import { NotificationLogger, type LogLevel } from './config';

/**
 * Base interface for all notification types
 * 
 * This interface defines the core contract for notification handlers.
 * It's completely generic and makes no assumptions about task nature,
 * allowing developers to emit any type of notification.
 * 
 * @example
 * ```typescript
 * const notifier = service.createBaseNotifier(token);
 * await notifier.notify("Processing started", { userId: 123 });
 * await notifier.complete("Processing finished");
 * ```
 */
export interface BaseNotifier {
  /**
   * Send a custom notification with optional data
   * 
   * This is the most generic method - developers can emit any notification
   * without assumptions about progress, steps, or task structure.
   * 
   * @param message - The notification message to display to the user
   * @param data - Optional data object to include with the notification
   * 
   * @example
   * ```typescript
   * await notifier.notify("Processing item", { id: 123, status: "active" });
   * await notifier.notify("Custom event occurred", { timestamp: Date.now() });
   * ```
   */
  notify(message: string, data?: any): Promise<void>;
  
  /**
   * Mark the operation as completed
   * 
   * Sends a completion notification and marks the notifier as inactive.
   * Should be called when the operation finishes successfully.
   * 
   * @param message - Optional completion message (defaults to "Completed")
   * 
   * @example
   * ```typescript
   * await notifier.complete("All items processed successfully");
   * ```
   */
  complete(message?: string): Promise<void>;
  
  /**
   * Mark the operation as failed
   * 
   * Sends an error notification and marks the notifier as inactive.
   * Should be called when the operation encounters an error.
   * 
   * @param error - The error that occurred
   * 
   * @example
   * ```typescript
   * try {
   *   await riskyOperation();
   * } catch (error) {
   *   await notifier.error(error);
   * }
   * ```
   */
  error(error: Error): Promise<void>;
  
  /**
   * Check if the notifier is still active
   * 
   * Returns true if the notifier can still send notifications.
   * Returns false if the operation has been completed or errored.
   * 
   * @returns True if active, false if completed or errored
   * 
   * @example
   * ```typescript
   * if (notifier.isActive()) {
   *   await notifier.notify("Still working...");
   * }
   * ```
   */
  isActive(): boolean;
}

/**
 * Abstract base class for all notification handlers
 * 
 * Provides the fundamental notification capability without any assumptions
 * about task nature. This class implements the BaseNotifier interface and
 * provides common functionality for all specialized notification handlers.
 * 
 * @abstract
 * @implements {BaseNotifier}
 * 
 * @example
 * ```typescript
 * class MyNotifier extends BaseNotificationHandler {
 *   // Implement any specialized behavior
 * }
 * ```
 */
export abstract class BaseNotificationHandler implements BaseNotifier {
  protected progressToken: string | number;
  protected sendNotification: (notification: ProgressNotification) => Promise<void>;
  protected isCompleted = false;
  protected isErrored = false;
  protected logger: NotificationLogger;

  /**
   * Creates a new BaseNotificationHandler instance
   * 
   * @param progressToken - The MCP progress token for associating notifications
   * @param sendNotification - Function to send notifications to the MCP client
   * @param logLevel - Logging level for this notifier (defaults to 'info')
   */
  constructor(
    progressToken: string | number,
    sendNotification: (notification: ProgressNotification) => Promise<void>,
    logLevel: LogLevel = 'info'
  ) {
    this.progressToken = progressToken;
    this.sendNotification = sendNotification;
    this.logger = new NotificationLogger(logLevel);
    
    this.logger.debug(`BaseNotificationHandler created with token: ${progressToken}`);
  }

  /**
   * Send a custom notification - completely generic
   * 
   * Developers can use this to emit any type of notification without
   * assumptions about progress, steps, or task structure.
   * 
   * @param message - The notification message to display
   * @param data - Optional data object to include with the notification
   * 
   * @example
   * ```typescript
   * await notifier.notify("Processing started", { userId: 123 });
   * await notifier.notify("Custom event", { timestamp: Date.now() });
   * ```
   */
  async notify(message: string, data?: any): Promise<void> {
    if (!this.isActive()) {
      this.logger.debug(`Skipping notify - not active`);
      return;
    }
    
    this.logger.debug(`notify called: ${message}`, data);
    
    try {
      const notification: ProgressNotification = {
        method: 'notifications/progress',
        params: {
          progressToken: this.progressToken,
          progress: 0, // Generic notifications don't have specific progress values
          message: data ? `${message} (${JSON.stringify(data)})` : message,
        },
      };

      await this.sendNotification(notification);
      this.logger.debug(`Custom notification sent successfully`);
    } catch (error) {
      this.logger.error('Failed to send custom notification:', {
        token: this.progressToken,
        message,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Mark as completed
   */
  async complete(message?: string): Promise<void> {
    if (!this.isActive()) {
      this.logger.debug(`Already completed/errored, skipping`);
      return;
    }
    
    this.isCompleted = true;
    this.logger.info(`Completing with message: ${message || 'Completed'}`);
    
    try {
      const notification: ProgressNotification = {
        method: 'notifications/progress',
        params: {
          progressToken: this.progressToken,
          progress: 1, // Completion is 100% progress
          message: message || 'Completed',
        },
      };

      await this.sendNotification(notification);
      this.logger.debug(`Completion notification sent successfully`);
    } catch (error) {
      this.logger.error('Failed to send completion notification:', {
        token: this.progressToken,
        message,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Mark as failed
   */
  async error(error: Error): Promise<void> {
    if (!this.isActive()) {
      this.logger.debug(`Already completed/errored, skipping error`);
      return;
    }
    
    this.isErrored = true;
    this.logger.error(`Error occurred: ${error.message}`);
    
    try {
      const notification: ProgressNotification = {
        method: 'notifications/progress',
        params: {
          progressToken: this.progressToken,
          progress: 0, // Error state doesn't have progress
          message: `Error: ${error.message}`,
        },
      };

      await this.sendNotification(notification);
      this.logger.debug(`Error notification sent successfully`);
    } catch (notifyError) {
      this.logger.error('Failed to send error notification:', {
        token: this.progressToken,
        originalError: error.message,
        notifyError: notifyError instanceof Error ? notifyError.message : String(notifyError)
      });
    }
  }

  /**
   * Check if still active
   */
  isActive(): boolean {
    return !this.isCompleted && !this.isErrored;
  }

  /**
   * Get current status
   */
  getStatus(): { isCompleted: boolean; isErrored: boolean; isActive: boolean } {
    return {
      isCompleted: this.isCompleted,
      isErrored: this.isErrored,
      isActive: this.isActive(),
    };
  }
}

/**
 * Factory function to create a base notifier instance
 * 
 * Creates a concrete implementation of BaseNotificationHandler that provides
 * basic notification functionality without any specialized behavior.
 * 
 * @param progressToken - The MCP progress token (optional)
 * @param sendNotification - Function to send notifications (optional)
 * @returns A BaseNotificationHandler instance or null if parameters are missing
 * 
 * @example
 * ```typescript
 * const notifier = createBaseNotifier(token, sendNotification);
 * if (notifier) {
 *   await notifier.notify("Starting process");
 *   await notifier.complete("Process finished");
 * }
 * ```
 */
export function createBaseNotifier(
  progressToken: string | number | undefined,
  sendNotification: ((notification: ProgressNotification) => Promise<void>) | undefined,
  logLevel: LogLevel = 'info'
): BaseNotificationHandler | null {
  if (!progressToken || !sendNotification) {
    return null;
  }

  return new (class extends BaseNotificationHandler {
    // This is a concrete implementation of the abstract base class
    // It provides the basic notification functionality without any specialized behavior
  })(progressToken, sendNotification, logLevel);
}
