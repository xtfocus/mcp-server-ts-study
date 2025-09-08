import { ProgressTracker, createProgressTracker } from '../progress-tracker';
import type { ProgressNotification } from '@modelcontextprotocol/sdk/types.js';

// Mock the sendNotification function
const mockSendNotification = jest.fn();

describe('ProgressTracker', () => {
  let tracker: ProgressTracker;
  const testToken = 'test-token-123';

  beforeEach(() => {
    mockSendNotification.mockClear();
    tracker = new ProgressTracker(testToken, mockSendNotification, 100, 'debug');
  });

  describe('constructor', () => {
    it('should initialize with correct parameters', () => {
      expect(tracker).toBeDefined();
      expect(tracker.isActive()).toBe(true);
    });
  });

  describe('setTotal', () => {
    it('should set the total number of steps', async () => {
      await tracker.setTotal(10);
      // This method doesn't send notifications, just sets internal state
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
  });

  describe('updateProgress', () => {
    it('should increment progress and send notification', async () => {
      await tracker.setTotal(5);
      await tracker.updateProgress('Step 1');

      expect(mockSendNotification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken: testToken,
          progress: 1,
          total: 5,
          message: 'Step 1',
        },
      });
    });

    it('should increment progress without total', async () => {
      await tracker.updateProgress('Step 1');

      expect(mockSendNotification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken: testToken,
          progress: 1,
          message: 'Step 1',
        },
      });
    });

    it('should not send notification if not active', async () => {
      await tracker.complete();
      await tracker.updateProgress('Should not send');

      expect(mockSendNotification).toHaveBeenCalledTimes(1); // Only the complete call
    });
  });

  describe('setProgress', () => {
    it('should set specific progress values', async () => {
      await tracker.setProgress(3, 10, 'Halfway done');

      expect(mockSendNotification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken: testToken,
          progress: 3,
          total: 10,
          message: 'Halfway done',
        },
      });
    });

    it('should set progress without total', async () => {
      await tracker.setProgress(5, undefined, 'Custom progress');

      expect(mockSendNotification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken: testToken,
          progress: 5,
          message: 'Custom progress',
        },
      });
    });
  });

  describe('getCurrentProgress', () => {
    it('should return initial progress state', () => {
      const progress = tracker.getCurrentProgress();
      expect(progress).toEqual({
        current: 0,
        total: undefined,
        isCompleted: false,
        isErrored: false,
        isActive: true,
      });
    });

    it('should return updated progress state', async () => {
      await tracker.setTotal(10);
      await tracker.setProgress(3, 10, 'Test');

      const progress = tracker.getCurrentProgress();
      expect(progress).toEqual({
        current: 3,
        total: 10,
        isCompleted: false,
        isErrored: false,
        isActive: true,
      });
    });
  });

  describe('getHistory', () => {
    it('should return empty history initially', () => {
      const history = tracker.getHistory();
      expect(history).toEqual([]);
    });

    it('should return progress history', async () => {
      await tracker.setProgress(1, 5, 'Step 1');
      await tracker.setProgress(2, 5, 'Step 2');

      const history = tracker.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0]).toMatchObject({
        progress: 1,
        total: 5,
        message: 'Step 1',
      });
      expect(history[1]).toMatchObject({
        progress: 2,
        total: 5,
        message: 'Step 2',
      });
    });

    it('should respect maxHistorySize', async () => {
      const smallTracker = new ProgressTracker(testToken, mockSendNotification, 2, 'debug');
      
      await smallTracker.setProgress(1, 5, 'Step 1');
      await smallTracker.setProgress(2, 5, 'Step 2');
      await smallTracker.setProgress(3, 5, 'Step 3');

      const history = smallTracker.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].progress).toBe(2); // First step should be removed
      expect(history[1].progress).toBe(3);
    });
  });

  describe('inheritance from BaseNotificationHandler', () => {
    it('should support notify method', async () => {
      await tracker.notify('Custom notification', { test: 'data' });

      expect(mockSendNotification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken: testToken,
          progress: 0,
          message: 'Custom notification ({"test":"data"})',
        },
      });
    });

    it('should support complete method', async () => {
      await tracker.complete('All done');

      expect(mockSendNotification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken: testToken,
          progress: 1,
          message: 'All done',
        },
      });
    });

    it('should support error method', async () => {
      const error = new Error('Test error');
      await tracker.error(error);

      expect(mockSendNotification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken: testToken,
          progress: 0,
          message: 'Error: Test error',
        },
      });
    });
  });
});

describe('createProgressTracker', () => {
  it('should create tracker when parameters provided', () => {
    const tracker = createProgressTracker('test-token', mockSendNotification, 100);
    expect(tracker).toBeDefined();
    expect(tracker?.isActive()).toBe(true);
  });

  it('should return null when progressToken is missing', () => {
    const tracker = createProgressTracker(undefined, mockSendNotification);
    expect(tracker).toBeNull();
  });

  it('should return null when sendNotification is missing', () => {
    const tracker = createProgressTracker('test-token', undefined);
    expect(tracker).toBeNull();
  });

  it('should use default maxHistorySize when not provided', () => {
    const tracker = createProgressTracker('test-token', mockSendNotification);
    expect(tracker).toBeDefined();
  });
});
