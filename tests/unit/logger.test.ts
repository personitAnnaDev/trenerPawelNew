import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for logger utility
 *
 * Logger should:
 * 1. Log to console in development mode
 * 2. NOT log to console in production mode
 * 3. Support all log levels: debug, info, warn, error
 * 4. Handle multiple arguments
 */

describe('logger utility', () => {
  // Store original console methods
  const originalConsole = {
    debug: console.debug,
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  beforeEach(() => {
    // Mock console methods
    console.debug = vi.fn();
    console.log = vi.fn();
    console.info = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    // Restore original console methods
    console.debug = originalConsole.debug;
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    vi.clearAllMocks();
  });

  describe('development mode', () => {
    it('should log debug messages in development', async () => {
      // Import logger (tests run in dev mode, so logger will log)
      const { logger } = await import('@/utils/logger');

      logger.debug('Debug message', { foo: 'bar' });

      expect(console.debug).toHaveBeenCalledWith('Debug message', { foo: 'bar' });
    });

    it('should log info messages in development', async () => {
      const { logger } = await import('@/utils/logger');

      logger.info('Info message', 123);

      expect(console.info).toHaveBeenCalledWith('Info message', 123);
    });

    it('should log warn messages in development', async () => {
      const { logger } = await import('@/utils/logger');

      logger.warn('Warning message', new Error('test'));

      expect(console.warn).toHaveBeenCalledWith('Warning message', expect.any(Error));
    });

    it('should log error messages in development', async () => {
      const { logger } = await import('@/utils/logger');

      const error = new Error('Test error');
      logger.error('Error message', error);

      expect(console.error).toHaveBeenCalledWith('Error message', error);
    });

    it('should handle multiple arguments', async () => {
      const { logger } = await import('@/utils/logger');

      logger.info('Message', 'arg1', 'arg2', { data: 'test' });

      expect(console.info).toHaveBeenCalledWith('Message', 'arg1', 'arg2', { data: 'test' });
    });
  });

  describe('production mode (skipped - requires build environment)', () => {
    it.skip('should NOT log debug in production', () => {
      // NOTE: Testing production mode requires actual build environment
      // because import.meta.env.DEV is replaced at build time by Vite.
      // This test is skipped in unit tests.
      // Production logging is verified in:
      // 1. Build output verification (FAZA 4 QA)
      // 2. Manual testing in production build
    });

    it.skip('should NOT log info in production', () => {
      // See note above
    });

    it.skip('should NOT log warn in production', () => {
      // See note above
    });

    it.skip('should NOT log error in production', () => {
      // See note above
    });
  });

  describe('edge cases', () => {
    it('should handle undefined arguments', async () => {
      const { logger } = await import('@/utils/logger');

      logger.debug(undefined);
      logger.info(undefined);
      logger.warn(undefined);
      logger.error(undefined);

      expect(console.debug).toHaveBeenCalledWith(undefined);
      expect(console.info).toHaveBeenCalledWith(undefined);
      expect(console.warn).toHaveBeenCalledWith(undefined);
      expect(console.error).toHaveBeenCalledWith(undefined);
    });

    it('should handle null arguments', async () => {
      const { logger } = await import('@/utils/logger');

      logger.debug(null);

      expect(console.debug).toHaveBeenCalledWith(null);
    });

    it('should handle no arguments', async () => {
      const { logger } = await import('@/utils/logger');

      logger.debug();
      logger.info();
      logger.warn();
      logger.error();

      expect(console.debug).toHaveBeenCalled();
      expect(console.info).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });
});
