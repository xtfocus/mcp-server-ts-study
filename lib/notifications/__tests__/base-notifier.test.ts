import { BaseNotificationHandler, createBaseNotifier } from '../base-notifier';
import type { ProgressNotification } from '@modelcontextprotocol/sdk/types.js';

// Mock the sendNotification function
const mockSendNotification = jest.fn();

describe('BaseNotificationHandler', () => {
  let notifier: BaseNotificationHandler;
  const testToken = 'test-token-123';

  beforeEach(() => {
    mockSendNotification.mockClear();
    notifier = new (class extends BaseNotificationHandler {
      // Concrete implementation for testing
    })(testToken, mockSendNotification, 'debug');
  });

  describe('constructor', () => {
    it('should initialize with correct token and sendNotification function', () => {
      expect(notifier).toBeDefined();
      expect(notifier.isActive()).toBe(true);
    });
  });

  describe('notify', () => {
    it('should send notification with message and data', async () => {
      const message = 'Test notification';
      const data = { test: 'data' };

      await notifier.notify(message, data);

      expect(mockSendNotification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken: testToken,
          progress: 0,
          message: `${message} (${JSON.stringify(data)})`,
        },
      });
    });

    it('should send notification with message only', async () => {
      const message = 'Test notification';

      await notifier.notify(message);

      expect(mockSendNotification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken: testToken,
          progress: 0,
          message: message,
        },
      });
    });

    it('should not send notification if not active', async () => {
      await notifier.complete();
      await notifier.notify('Should not send');

      expect(mockSendNotification).toHaveBeenCalledTimes(1); // Only the complete call
    });
  });

  describe('complete', () => {
    it('should send completion notification and mark as completed', async () => {
      const message = 'Operation completed';

      await notifier.complete(message);

      expect(mockSendNotification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken: testToken,
          progress: 1,
          message: message,
        },
      });
      expect(notifier.isActive()).toBe(false);
    });

    it('should use default message if none provided', async () => {
      await notifier.complete();

      expect(mockSendNotification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken: testToken,
          progress: 1,
          message: 'Completed',
        },
      });
    });

    it('should not send notification if already completed', async () => {
      await notifier.complete('First completion');
      await notifier.complete('Second completion');

      expect(mockSendNotification).toHaveBeenCalledTimes(1);
    });
  });

  describe('error', () => {
    it('should send error notification and mark as errored', async () => {
      const error = new Error('Test error');

      await notifier.error(error);

      expect(mockSendNotification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken: testToken,
          progress: 0,
          message: 'Error: Test error',
        },
      });
      expect(notifier.isActive()).toBe(false);
    });

    it('should not send notification if already errored', async () => {
      const error1 = new Error('First error');
      const error2 = new Error('Second error');

      await notifier.error(error1);
      await notifier.error(error2);

      expect(mockSendNotification).toHaveBeenCalledTimes(1);
    });
  });

  describe('isActive', () => {
    it('should return true initially', () => {
      expect(notifier.isActive()).toBe(true);
    });

    it('should return false after completion', async () => {
      await notifier.complete();
      expect(notifier.isActive()).toBe(false);
    });

    it('should return false after error', async () => {
      await notifier.error(new Error('Test error'));
      expect(notifier.isActive()).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return correct initial status', () => {
      const status = notifier.getStatus();
      expect(status).toEqual({
        isCompleted: false,
        isErrored: false,
        isActive: true,
      });
    });

    it('should return correct status after completion', async () => {
      await notifier.complete();
      const status = notifier.getStatus();
      expect(status).toEqual({
        isCompleted: true,
        isErrored: false,
        isActive: false,
      });
    });

    it('should return correct status after error', async () => {
      await notifier.error(new Error('Test error'));
      const status = notifier.getStatus();
      expect(status).toEqual({
        isCompleted: false,
        isErrored: true,
        isActive: false,
      });
    });
  });
});

describe('createBaseNotifier', () => {
  it('should create notifier when both parameters provided', () => {
    const notifier = createBaseNotifier('test-token', mockSendNotification);
    expect(notifier).toBeDefined();
    expect(notifier?.isActive()).toBe(true);
  });

  it('should return null when progressToken is missing', () => {
    const notifier = createBaseNotifier(undefined, mockSendNotification);
    expect(notifier).toBeNull();
  });

  it('should return null when sendNotification is missing', () => {
    const notifier = createBaseNotifier('test-token', undefined);
    expect(notifier).toBeNull();
  });

  it('should return null when both parameters are missing', () => {
    const notifier = createBaseNotifier(undefined, undefined);
    expect(notifier).toBeNull();
  });
});
