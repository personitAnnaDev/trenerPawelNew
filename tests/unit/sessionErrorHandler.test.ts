import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock supabase - must use inline factory for hoisting
vi.mock("@/utils/supabase", () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

// Import after mocks are set up
import { supabase } from "@/utils/supabase";
import { toast } from "sonner";
import {
  isRLSError,
  isSessionExpiredError,
  handleSessionExpiredError,
} from "@/utils/sessionErrorHandler";

describe("sessionErrorHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the debounce flag by waiting
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("isRLSError", () => {
    it("should detect RLS policy violation error", () => {
      const error = new Error(
        'new row violates row-level security policy for table "meals"'
      );
      expect(isRLSError(error)).toBe(true);
    });

    it("should detect RLS error with different table name", () => {
      const error = new Error(
        'new row violates row-level security policy for table "clients"'
      );
      expect(isRLSError(error)).toBe(true);
    });

    it("should detect RLS error case-insensitively", () => {
      const error = new Error(
        'New Row Violates Row-Level Security Policy for table "meals"'
      );
      expect(isRLSError(error)).toBe(true);
    });

    it("should return false for non-RLS errors", () => {
      const error = new Error("Network request failed");
      expect(isRLSError(error)).toBe(false);
    });

    it("should return false for null/undefined", () => {
      expect(isRLSError(null)).toBe(false);
      expect(isRLSError(undefined)).toBe(false);
    });

    it("should handle error object with message property", () => {
      const error = {
        message: 'new row violates row-level security policy for table "meals"',
      };
      expect(isRLSError(error)).toBe(true);
    });

    it("should handle string error", () => {
      const error =
        'new row violates row-level security policy for table "meals"';
      expect(isRLSError(error)).toBe(true);
    });
  });

  describe("isSessionExpiredError", () => {
    it("should detect JWT expired error", () => {
      const error = new Error("JWT expired");
      expect(isSessionExpiredError(error)).toBe(true);
    });

    it("should detect invalid token error", () => {
      const error = new Error("Invalid JWT token");
      expect(isSessionExpiredError(error)).toBe(true);
    });

    it("should detect session not found error", () => {
      const error = new Error("Session not found");
      expect(isSessionExpiredError(error)).toBe(true);
    });

    it("should detect auth session missing error", () => {
      const error = new Error("Auth session missing!");
      expect(isSessionExpiredError(error)).toBe(true);
    });

    it("should return false for RLS error (handled separately)", () => {
      const error = new Error(
        'new row violates row-level security policy for table "meals"'
      );
      expect(isSessionExpiredError(error)).toBe(false);
    });

    it("should return false for regular errors", () => {
      const error = new Error("Something went wrong");
      expect(isSessionExpiredError(error)).toBe(false);
    });
  });

  describe("handleSessionExpiredError", () => {
    it("should sign out user and show toast for RLS error", async () => {
      const error = new Error(
        'new row violates row-level security policy for table "meals"'
      );

      const result = await handleSessionExpiredError(error);

      expect(result).toBe(true);
      expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
      expect(toast.error).toHaveBeenCalledWith(
        "Sesja wygasła. Zaloguj się ponownie.",
        expect.any(Object)
      );

      // Advance timers to reset debounce
      vi.advanceTimersByTime(1100);
    });

    it("should sign out user and show toast for JWT expired error", async () => {
      // Reset debounce first
      vi.advanceTimersByTime(1100);

      const error = new Error("JWT expired");

      const result = await handleSessionExpiredError(error);

      expect(result).toBe(true);
      expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
      expect(toast.error).toHaveBeenCalledWith(
        "Sesja wygasła. Zaloguj się ponownie.",
        expect.any(Object)
      );

      vi.advanceTimersByTime(1100);
    });

    it("should return false and not sign out for regular errors", async () => {
      vi.advanceTimersByTime(1100);

      const error = new Error("Network error");

      const result = await handleSessionExpiredError(error);

      expect(result).toBe(false);
      expect(supabase.auth.signOut).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("should handle sign out failure gracefully", async () => {
      vi.advanceTimersByTime(1100);

      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({
        error: new Error("Sign out failed"),
      });
      const error = new Error(
        'new row violates row-level security policy for table "meals"'
      );

      const result = await handleSessionExpiredError(error);

      // Should still return true (error was session-related)
      expect(result).toBe(true);
      expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
      // Toast should still show
      expect(toast.error).toHaveBeenCalled();

      vi.advanceTimersByTime(1100);
    });

    it("should not show multiple toasts for rapid consecutive calls (debounce)", async () => {
      vi.advanceTimersByTime(1100);

      const error = new Error(
        'new row violates row-level security policy for table "meals"'
      );

      // First call - should handle
      const result1 = await handleSessionExpiredError(error);
      expect(result1).toBe(true);

      // Immediate second call - should be debounced
      const result2 = await handleSessionExpiredError(error);
      expect(result2).toBe(true);

      // Third call - should also be debounced
      const result3 = await handleSessionExpiredError(error);
      expect(result3).toBe(true);

      // Should only show toast once (debounced)
      expect(toast.error).toHaveBeenCalledTimes(1);
      expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    });
  });
});
