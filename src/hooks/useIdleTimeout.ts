import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 5 * 60 * 1000; // Show warning 5 minutes before logout

interface UseIdleTimeoutOptions {
  timeout?: number;
  warningBefore?: number;
  enabled?: boolean;
}

interface UseIdleTimeoutReturn {
  showWarning: boolean;
  secondsRemaining: number;
  stayActive: () => void;
}

export function useIdleTimeout(options: UseIdleTimeoutOptions = {}): UseIdleTimeoutReturn {
  const {
    timeout = IDLE_TIMEOUT_MS,
    warningBefore = WARNING_BEFORE_MS,
    enabled = true,
  } = options;

  const { user, signOut } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  // All refs - no dependencies issues
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const warningRef = useRef<ReturnType<typeof setTimeout>>();
  const countdownRef = useRef<ReturnType<typeof setInterval>>();
  const lastActivityRef = useRef<number>(Date.now());
  const signOutRef = useRef(signOut);
  const timeoutMsRef = useRef(timeout);
  const warningBeforeRef = useRef(warningBefore);

  // Keep refs updated (no effect re-runs)
  signOutRef.current = signOut;
  timeoutMsRef.current = timeout;
  warningBeforeRef.current = warningBefore;

  const clearTimers = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const startTimers = () => {
    clearTimers();
    lastActivityRef.current = Date.now();
    const t = timeoutMsRef.current;
    const w = warningBeforeRef.current;

    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsRemaining(Math.floor(w / 1000));
      countdownRef.current = setInterval(() => {
        setSecondsRemaining(prev => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }, t - w);

    timeoutRef.current = setTimeout(() => {
      logger.debug('[IdleTimeout] Timeout - signing out');
      signOutRef.current();
    }, t);
  };

  const stayActive = () => {
    setShowWarning(false);
    startTimers();
  };

  // Single effect - only depends on enabled and user existence
  useEffect(() => {
    if (!enabled || !user) {
      clearTimers();
      setShowWarning(false);
      return;
    }

    logger.debug('[IdleTimeout] Initialized');

    let lastThrottle = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastThrottle > 30000) {
        lastThrottle = now;
        logger.debug('[IdleTimeout] Activity detected');
        startTimers();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastActivityRef.current;
        const t = timeoutMsRef.current;
        const w = warningBeforeRef.current;

        logger.debug('[IdleTimeout] Tab visible, elapsed:', Math.floor(elapsed / 1000), 's');

        if (elapsed >= t) {
          signOutRef.current();
        } else if (elapsed >= t - w) {
          setShowWarning(true);
          setSecondsRemaining(Math.floor((t - elapsed) / 1000));
          clearTimers();
          timeoutRef.current = setTimeout(() => signOutRef.current(), t - elapsed);
        }
      }
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibility);

    startTimers();

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibility);
      clearTimers();
    };
  }, [enabled, !!user]); // Only re-run when enabled changes or user logs in/out

  return { showWarning, secondsRemaining, stayActive };
}
