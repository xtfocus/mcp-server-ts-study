import type { ProgressNotification } from '@modelcontextprotocol/sdk/types.js';
import type { ProgressUpdate, TaskPhase } from './types';
import { BaseNotificationHandler } from './base-notifier';
import { DEFAULT_CONFIG, type LogLevel } from './config';

/**
 * Step-based progress tracker that inherits from BaseNotificationHandler
 * Adds step counting and progress percentage functionality
 */
export class ProgressTracker extends BaseNotificationHandler {
  private currentProgress = 0;
  private total?: number;
  private history: ProgressUpdate[] = [];
  private maxHistorySize: number;

  constructor(
    progressToken: string | number,
    sendNotification: (notification: ProgressNotification) => Promise<void>,
    maxHistorySize: number = DEFAULT_CONFIG.MAX_HISTORY_SIZE,
    logLevel: LogLevel = 'info'
  ) {
    super(progressToken, sendNotification, logLevel);
    this.maxHistorySize = maxHistorySize;
    
    this.logger.debug(`ProgressTracker created with token: ${progressToken}, maxHistorySize: ${maxHistorySize}`);
  }

  /**
   * Increment progress by 1 step
   */
  async updateProgress(message?: string): Promise<void> {
    if (!this.isActive()) {
      this.logger.debug(`Skipping updateProgress - not active`);
      return;
    }
    
    this.currentProgress += 1;
    this.logger.debug(`updateProgress called: ${this.currentProgress}${this.total ? `/${this.total}` : ''} - ${message || 'No message'}`);
    await this.sendProgressNotification(message);
  }

  /**
   * Set specific progress values
   */
  async setProgress(current: number, total?: number, message?: string): Promise<void> {
    if (!this.isActive()) {
      this.logger.debug(`Skipping setProgress - not active`);
      return;
    }
    
    this.currentProgress = current;
    this.total = total;
    this.logger.debug(`setProgress called: ${current}${total ? `/${total}` : ''} - ${message || 'No message'}`);
    await this.sendProgressNotification(message);
  }

  /**
   * Set the total number of steps
   */
  async setTotal(total: number): Promise<void> {
    this.total = total;
    this.logger.debug(`setTotal called: ${total}`);
  }

  private async sendProgressNotification(message?: string): Promise<void> {
    try {
      const notification: ProgressNotification = {
        method: 'notifications/progress',
        params: {
          progressToken: this.progressToken,
          progress: this.currentProgress,
          ...(this.total && { total: this.total }),
          ...(message && { message }),
        },
      };

      this.logger.debug(`Sending progress notification:`, {
        token: this.progressToken,
        progress: this.currentProgress,
        total: this.total,
        message,
        isCompleted: this.isCompleted
      });

      // Add to history
      this.addToHistory({
        timestamp: new Date().toISOString(),
        progress: this.currentProgress,
        total: this.total,
        message,
      });

      await this.sendNotification(notification);
      this.logger.debug(`Progress notification sent successfully`);
    } catch (error) {
      // Silent fail - don't break execution
      this.logger.error('Failed to send progress notification:', {
        token: this.progressToken,
        progress: this.currentProgress,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  private addToHistory(update: ProgressUpdate): void {
    this.history.push(update);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift(); // Remove oldest
    }
  }

  getHistory(): ProgressUpdate[] {
    return [...this.history];
  }

  /**
   * Get current progress information
   */
  getCurrentProgress(): { current: number; total?: number; isCompleted: boolean; isErrored: boolean; isActive: boolean } {
    return {
      current: this.currentProgress,
      total: this.total,
      isCompleted: this.isCompleted,
      isErrored: this.isErrored,
      isActive: this.isActive(),
    };
  }
}

/**
 * Hierarchical progress tracker that inherits from BaseNotificationHandler
 * Adds phase-based progress with weighted calculations
 */
export class HierarchicalProgressTracker extends BaseNotificationHandler {
  private currentPhase: string = '';
  private phaseProgress: number = 0;
  private phases: TaskPhase[];
  private phaseWeights: Map<string, number> = new Map();
  private completedPhases: Set<string> = new Set();

  constructor(
    progressToken: string | number,
    sendNotification: (notification: ProgressNotification) => Promise<void>,
    phases: TaskPhase[],
    logLevel: LogLevel = 'info'
  ) {
    super(progressToken, sendNotification, logLevel);
    this.phases = phases;
    
    phases.forEach(phase => {
      this.phaseWeights.set(phase.name, phase.weight);
    });
    
    this.logger.debug(`HierarchicalProgressTracker created with token: ${progressToken}, phases:`, 
      phases.map(p => `${p.name}(${p.weight})`).join(', '));
  }

  /**
   * Start a new phase
   */
  async startPhase(phaseName: string, message?: string): Promise<void> {
    if (!this.isActive()) {
      this.logger.debug(`Skipping startPhase - not active`);
      return;
    }
    
    this.currentPhase = phaseName;
    this.phaseProgress = 0;
    this.logger.info(`Starting phase: ${phaseName} - ${message || 'Starting...'}`);
    
    // Use the base class notify method for phase start
    await this.notify(`Starting phase: ${phaseName}`, message);
  }

  /**
   * Update progress within the current phase
   */
  async updatePhaseProgress(progress: number, message?: string): Promise<void> {
    if (!this.isActive()) {
      this.logger.debug(`Skipping updatePhaseProgress - not active`);
      return;
    }
    
    this.phaseProgress = Math.min(progress, 1);
    const overallProgress = this.calculateOverallProgress();
    
    this.logger.debug(`Phase progress: ${this.currentPhase} = ${this.phaseProgress}, overall = ${overallProgress} - ${message || 'In progress'}`);
    
    try {
      const notification: ProgressNotification = {
        method: 'notifications/progress',
        params: {
          progressToken: this.progressToken,
          progress: overallProgress,
          message: `${this.currentPhase}: ${message || 'In progress'}`,
        },
      };

      await this.sendNotification(notification);
      this.logger.debug(`Phase progress notification sent successfully`);
    } catch (error) {
      this.logger.error('Failed to send phase progress notification:', {
        phase: this.currentPhase,
        progress: this.phaseProgress,
        overallProgress,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Complete a specific phase
   */
  async completePhase(phaseName: string, message?: string): Promise<void> {
    if (!this.isActive()) return;
    
    this.completedPhases.add(phaseName);
    this.phaseProgress = 1;
    
    if (this.completedPhases.size === this.phases.length) {
      await this.complete(message || 'All phases completed');
    } else {
      await this.updatePhaseProgress(1, message || 'Phase completed');
    }
  }

  /**
   * Calculate overall progress based on weighted phases
   */
  private calculateOverallProgress(): number {
    let totalWeightedProgress = 0;
    let totalWeight = 0;
    
    for (const [phase, weight] of this.phaseWeights) {
      let phaseProgress = 0;
      
      if (this.completedPhases.has(phase)) {
        phaseProgress = 1;
      } else if (phase === this.currentPhase) {
        phaseProgress = this.phaseProgress;
      }
      
      totalWeightedProgress += phaseProgress * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? totalWeightedProgress / totalWeight : 0;
  }

  /**
   * Get current phase information
   */
  getCurrentPhase(): { currentPhase: string; phaseProgress: number; completedPhases: string[]; totalPhases: number } {
    return {
      currentPhase: this.currentPhase,
      phaseProgress: this.phaseProgress,
      completedPhases: Array.from(this.completedPhases),
      totalPhases: this.phases.length,
    };
  }
}

/**
 * Factory function to create a step-based progress tracker
 */
export function createProgressTracker(
  progressToken: string | number | undefined,
  sendNotification: ((notification: ProgressNotification) => Promise<void>) | undefined,
  maxHistorySize?: number,
  logLevel: LogLevel = 'info'
): ProgressTracker | null {
  if (!progressToken || !sendNotification) {
    return null;
  }

  return new ProgressTracker(progressToken, sendNotification, maxHistorySize, logLevel);
}

/**
 * Factory function to create a hierarchical progress tracker
 */
export function createHierarchicalProgressTracker(
  progressToken: string | number | undefined,
  sendNotification: ((notification: ProgressNotification) => Promise<void>) | undefined,
  phases: TaskPhase[],
  logLevel: LogLevel = 'info'
): HierarchicalProgressTracker | null {
  if (!progressToken || !sendNotification) {
    return null;
  }

  return new HierarchicalProgressTracker(progressToken, sendNotification, phases, logLevel);
}
