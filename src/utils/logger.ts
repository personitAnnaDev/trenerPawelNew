/**
 * Logger utility with dev/prod split
 *
 * In development:
 * - All log levels (debug, info, warn, error) write to console
 *
 * In production:
 * - All log levels are no-op (empty functions)
 * - Additional safety: Vite drop_console plugin removes all console.* calls
 *
 * Usage:
 * ```typescript
 * import { logger } from '@/utils/logger';
 *
 * logger.debug('Debug info', data);
 * logger.info('Info message', data);
 * logger.warn('Warning', data);
 * logger.error('Error occurred', error);
 * ```
 *
 * Benefits:
 * 1. Centralized logging control
 * 2. Zero production logs (security + performance)
 * 3. Type-safe API
 * 4. No runtime overhead in production (dead code elimination)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */

const isDev = import.meta.env.DEV;

/**
 * Logger interface
 */
export interface Logger {
  log: (...args: any[]) => void;
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

/**
 * Development logger - logs to console
 */
const devLogger: Logger = {
  log: (...args: any[]) => console.log(...args),
  debug: (...args: any[]) => console.debug(...args),
  info: (...args: any[]) => console.info(...args),
  warn: (...args: any[]) => console.warn(...args),
  error: (...args: any[]) => console.error(...args),
};

/**
 * Production logger - no-op (empty functions)
 * Note: Vite will additionally strip all console.* calls via drop_console plugin
 */
const prodLogger: Logger = {
  log: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

/**
 * Exported logger instance
 * - Dev mode: logs to console
 * - Prod mode: no-op (dead code eliminated)
 */
export const logger: Logger = isDev ? devLogger : prodLogger;

/**
 * Performance timing utility for measuring operation durations
 *
 * Usage:
 * ```typescript
 * const timer = perfTimer('restoreDietSnapshot');
 * // ... operation
 * timer.end(); // logs: [PERF] restoreDietSnapshot: 1234ms
 *
 * // Or with checkpoint:
 * timer.checkpoint('delete phase'); // logs intermediate time
 * timer.end();
 * ```
 */
export interface PerfTimer {
  checkpoint: (label: string) => number;
  end: () => number;
}

export const perfTimer = (operationName: string): PerfTimer => {
  const startTime = performance.now();
  let lastCheckpoint = startTime;

  if (isDev) {
    devLogger.log(`[PERF] ⏱️ ${operationName} START`);
  }

  return {
    checkpoint: (label: string): number => {
      if (!isDev) return 0;

      const now = performance.now();
      const sinceStart = Math.round(now - startTime);
      const sinceLastCheckpoint = Math.round(now - lastCheckpoint);
      lastCheckpoint = now;

      devLogger.log(`[PERF] 📍 ${operationName} → ${label}: ${sinceLastCheckpoint}ms (total: ${sinceStart}ms)`);
      return sinceLastCheckpoint;
    },
    end: (): number => {
      if (!isDev) return 0;

      const duration = Math.round(performance.now() - startTime);
      const emoji = duration > 1000 ? '🔴' : duration > 500 ? '🟡' : '🟢';
      devLogger.log(`[PERF] ${emoji} ${operationName} END: ${duration}ms`);
      return duration;
    }
  };
};
