import { DEFAULT_CONFIG, createConfig, NotificationLogger, type LogLevel } from '../config';

describe('DEFAULT_CONFIG', () => {
  it('should have correct default values', () => {
    expect(DEFAULT_CONFIG).toEqual({
      MAX_HISTORY_SIZE: 1000,
      BATCH_SIZE: 10,
      BATCH_TIMEOUT: 100,
      LOG_LEVEL: 'info',
    });
  });
});

describe('createConfig', () => {
  it('should return default config when no overrides provided', () => {
    const config = createConfig();
    expect(config).toEqual({
      logLevel: 'info',
      maxHistorySize: 1000,
      batchSize: 10,
      batchTimeout: 100,
    });
  });

  it('should override specific values', () => {
    const config = createConfig({
      logLevel: 'debug',
      maxHistorySize: 500,
    });
    expect(config).toEqual({
      logLevel: 'debug',
      maxHistorySize: 500,
      batchSize: 10,
      batchTimeout: 100,
    });
  });

  it('should override all values', () => {
    const config = createConfig({
      logLevel: 'error',
      maxHistorySize: 2000,
      batchSize: 20,
      batchTimeout: 200,
    });
    expect(config).toEqual({
      logLevel: 'error',
      maxHistorySize: 2000,
      batchSize: 20,
      batchTimeout: 200,
    });
  });
});

describe('NotificationLogger', () => {
  let consoleSpy: {
    log: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    };
  });

  afterEach(() => {
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  describe('debug level', () => {
    it('should log all levels', () => {
      const logger = new NotificationLogger('debug');
      
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleSpy.log).toHaveBeenCalledTimes(2); // debug and info
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('info level', () => {
    it('should log info, warn, and error', () => {
      const logger = new NotificationLogger('info');
      
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleSpy.log).toHaveBeenCalledTimes(1); // info only
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('warn level', () => {
    it('should log warn and error only', () => {
      const logger = new NotificationLogger('warn');
      
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('error level', () => {
    it('should log error only', () => {
      const logger = new NotificationLogger('error');
      
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('silent level', () => {
    it('should not log anything', () => {
      const logger = new NotificationLogger('silent');
      
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });
  });

  describe('message formatting', () => {
    it('should format messages with prefix', () => {
      const logger = new NotificationLogger('debug');
      
      logger.debug('test message');
      
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '[NotificationSystem:DEBUG] test message'
      );
    });

    it('should include data when provided', () => {
      const logger = new NotificationLogger('debug');
      const data = { test: 'data' };
      
      logger.debug('test message', data);
      
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '[NotificationSystem:DEBUG] test message',
        data
      );
    });
  });
});
