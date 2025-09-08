import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
// Note: NotificationService is available but not used in simplified decorators
import { BaseNotificationHandler } from '../notifications/base-notifier';
import { ProgressTracker, HierarchicalProgressTracker } from '../notifications/progress-tracker';
import type { TaskPhase } from '../notifications/types';

/**
 * Simplified decorator system with only 3 core decorators
 */

// Utility function to delay execution
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generic notification decorator - for any type of notification
 * Use when you need flexibility and don't want assumptions about task nature
 */
export function withNotifications<T>(
  fn: (notifier: BaseNotificationHandler | null, args: any) => Promise<T>
) {
  return async (request: CallToolRequest, extra: any) => {
    const progressToken = request.params?._meta?.progressToken;
    const notifier = progressToken && extra?.sendNotification 
      ? new (class extends BaseNotificationHandler {
          // Concrete implementation of the abstract base class
        })(progressToken, extra.sendNotification)
      : null;
    
    try {
      return await fn(notifier, request.params?.arguments || {});
    } catch (error) {
      if (notifier) {
        await notifier.error(error as Error);
      }
      throw error;
    } finally {
      if (notifier) {
        await notifier.complete();
      }
    }
  };
}

/**
 * Step-based progress tracking decorator
 * Use when you know the number of steps or want simple progress updates
 */
export function withProgressTracking<T>(
  fn: (tracker: ProgressTracker | null, args: any) => Promise<T>
) {
  return async (request: CallToolRequest, extra: any) => {
    const progressToken = request.params?._meta?.progressToken;
    const tracker = progressToken && extra?.sendNotification 
      ? new ProgressTracker(progressToken, extra.sendNotification)
      : null;
    
    try {
      return await fn(tracker, request.params?.arguments || {});
    } catch (error) {
      if (tracker) {
        await tracker.error(error as Error);
      }
      throw error;
    } finally {
      if (tracker) {
        await tracker.complete();
      }
    }
  };
}

/**
 * Phase-based progress tracking decorator
 * Use for complex operations with multiple phases and weighted progress
 */
export function withPhases<T>(
  phases: TaskPhase[],
  fn: (tracker: HierarchicalProgressTracker | null, args: any) => Promise<T>
) {
  return async (request: CallToolRequest, extra: any) => {
    const progressToken = request.params?._meta?.progressToken;
    const tracker = progressToken && extra?.sendNotification 
      ? new HierarchicalProgressTracker(progressToken, extra.sendNotification, phases)
      : null;
    
    try {
      return await fn(tracker, request.params?.arguments || {});
    } catch (error) {
      if (tracker) {
        await tracker.error(error as Error);
      }
      throw error;
    } finally {
      if (tracker) {
        await tracker.complete();
      }
    }
  };
}

/**
 * Utility for creating phase definitions
 */
export function createPhases(...phases: Array<{ name: string; weight: number; description?: string }>): TaskPhase[] {
  return phases;
}

/**
 * Utility for creating equally weighted phases
 */
export function createEqualPhases(phaseNames: string[]): TaskPhase[] {
  const weight = 1 / phaseNames.length;
  return phaseNames.map(name => ({ name, weight }));
}
