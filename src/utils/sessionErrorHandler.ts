import { supabase } from "@/utils/supabase";
import { toast } from "sonner";

/**
 * Debounce flag to prevent multiple toasts for rapid consecutive errors
 */
let isHandlingSessionError = false;

/**
 * Extracts error message from various error formats
 */
function getErrorMessage(error: unknown): string {
  if (error === null || error === undefined) {
    return "";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

/**
 * Checks if error is a Row-Level Security policy violation
 * This typically happens when session expires and auth.uid() returns NULL
 */
export function isRLSError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes("row-level security policy");
}

/**
 * Checks if error is a session/JWT expired error
 */
export function isSessionExpiredError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();

  const sessionErrorPatterns = [
    "jwt expired",
    "invalid jwt",
    "session not found",
    "auth session missing",
    "refresh_token_not_found",
    "invalid refresh token",
  ];

  return sessionErrorPatterns.some((pattern) => message.includes(pattern));
}

/**
 * Handles session expired errors by signing out user and showing toast
 * Returns true if the error was session-related and handled, false otherwise
 */
export async function handleSessionExpiredError(error: unknown): Promise<boolean> {
  // Check if this is a session-related error
  if (!isRLSError(error) && !isSessionExpiredError(error)) {
    return false;
  }

  // Debounce - prevent multiple toasts for rapid consecutive calls
  if (isHandlingSessionError) {
    return true;
  }

  isHandlingSessionError = true;

  try {
    // Show toast first (user feedback is priority)
    toast.error("Sesja wygasła. Zaloguj się ponownie.", {
      duration: 5000,
      id: "session-expired", // Prevent duplicate toasts
    });

    // Sign out user (clears local session, triggers redirect via AuthContext)
    await supabase.auth.signOut();
  } finally {
    // Reset debounce flag after a short delay
    setTimeout(() => {
      isHandlingSessionError = false;
    }, 1000);
  }

  return true;
}

/**
 * Global error handler for QueryClient
 * Use this in QueryClient's mutation/query error handlers
 */
export async function handleQueryError(error: unknown): Promise<void> {
  const wasSessionError = await handleSessionExpiredError(error);

  // If it was a session error, don't log it as a regular error
  // The session expiry is handled gracefully
  if (wasSessionError) {
    return;
  }

  // For non-session errors, let the normal error handling proceed
  // (logging happens in the existing QueryClient handlers)
}
