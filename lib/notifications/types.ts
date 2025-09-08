import type { ProgressNotification } from '@modelcontextprotocol/sdk/types.js';

export interface NotificationParams {
  progressToken?: string | number;
  progress?: number;
  total?: number;
  message?: string;
  data?: any;
}

export interface StatusNotification {
  method: 'notifications/status';
  params: {
    type: 'info' | 'warning' | 'error' | 'success';
    message: string;
    data?: any;
    timestamp?: string;
  };
}

export interface ResultChunkNotification {
  method: 'notifications/result_chunk';
  params: {
    progressToken: string | number;
    chunk: any;
    message?: string;
    total?: number;
  };
}

export type AnyNotification = ProgressNotification | StatusNotification | ResultChunkNotification;

export interface NotificationServiceConfig {
  batchSize?: number;
  batchTimeout?: number;
  maxHistorySize?: number;
}

export interface ProgressUpdate {
  timestamp: string;
  progress: number;
  total?: number;
  message?: string;
}

export interface TaskPhase {
  name: string;
  weight: number;
  description?: string;
}

