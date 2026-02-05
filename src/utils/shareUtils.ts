/**
 * Share/Copy utility functions for iOS Safari compatibility
 * Issue #3: Copy link fails on iOS Safari - use Web Share API as fallback
 * Issue #2: PDF download fails on iOS - use Web Share API for files
 */

import { logger } from '@/utils/logger';

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'error';

export interface ShareOrCopyResult {
  result: ShareResult;
  message: string;
}

/**
 * Detect if running on iOS (iPhone, iPad, iPod)
 */
export const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

/**
 * Detect if running on iOS Safari specifically
 */
export const isIOSSafari = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIOSDevice = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
  return isIOSDevice && isSafari;
};

/**
 * Check if Web Share API is available
 */
export const canShare = (): boolean => {
  return typeof navigator !== 'undefined' &&
         typeof navigator.share === 'function';
};

/**
 * Check if Web Share API can share specific data (URL)
 */
export const canShareUrl = (url: string): boolean => {
  if (!canShare()) return false;
  try {
    return navigator.canShare?.({ url }) ?? false;
  } catch {
    return false;
  }
};

/**
 * Check if Web Share API can share files
 */
export const canShareFiles = (files: File[]): boolean => {
  if (!canShare()) return false;
  try {
    return navigator.canShare?.({ files }) ?? false;
  } catch {
    return false;
  }
};

/**
 * Share or copy text/URL with automatic fallback
 * Priority:
 * 1. Web Share API (iOS) - opens share sheet, user can copy from there
 * 2. Clipboard API (modern browsers)
 * 3. execCommand fallback (legacy browsers)
 *
 * @param text - Text to share/copy
 * @param options - Share options (title, text for share sheet)
 */
export const shareOrCopyText = async (
  text: string,
  options?: { title?: string; shareText?: string }
): Promise<ShareOrCopyResult> => {
  const { title = 'Udostępnij', shareText } = options || {};

  // 1. Try Web Share API first on iOS (more reliable than clipboard on iOS Safari)
  if (isIOS() && canShare()) {
    try {
      await navigator.share({
        url: text,
        title,
        text: shareText,
      });
      logger.debug('[shareUtils] Web Share API succeeded');
      return {
        result: 'shared',
        message: 'Link udostępniony pomyślnie',
      };
    } catch (error) {
      // User cancelled share sheet - not an error
      if (error instanceof DOMException && error.name === 'AbortError') {
        logger.debug('[shareUtils] User cancelled share sheet');
        return {
          result: 'cancelled',
          message: 'Udostępnianie anulowane',
        };
      }
      // Other share error - fall through to clipboard
      logger.warn('[shareUtils] Web Share API failed, trying clipboard', error);
    }
  }

  // 2. Try Clipboard API
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      logger.debug('[shareUtils] Clipboard API succeeded');
      return {
        result: 'copied',
        message: 'Link skopiowany do schowka',
      };
    } catch (error) {
      logger.warn('[shareUtils] Clipboard API failed', error);

      // Provide specific message for permission errors
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        // Try fallback before giving up
      }
    }
  }

  // 3. Fallback: execCommand (for very old browsers)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);

    if (successful) {
      logger.debug('[shareUtils] execCommand fallback succeeded');
      return {
        result: 'copied',
        message: 'Link skopiowany do schowka',
      };
    }
  } catch (error) {
    logger.error('[shareUtils] execCommand fallback failed', error);
  }

  // All methods failed
  logger.error('[shareUtils] All copy methods failed');
  return {
    result: 'error',
    message: 'Nie udało się skopiować linku. Spróbuj użyć przycisku udostępniania w przeglądarce.',
  };
};

/**
 * Share a file using Web Share API (iOS) or trigger download (other browsers)
 *
 * @param file - File to share
 * @param filename - Filename for download fallback
 * @returns Result of the operation
 */
export const shareOrDownloadFile = async (
  file: File,
  filename: string
): Promise<ShareOrCopyResult> => {
  // Check if we can share files (iOS Safari 15+)
  if (isIOS() && canShareFiles([file])) {
    try {
      await navigator.share({
        files: [file],
        title: filename,
      });
      logger.debug('[shareUtils] File shared via Web Share API');
      return {
        result: 'shared',
        message: 'Plik udostępniony. Wybierz "Zapisz do Plików" aby zapisać.',
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          result: 'cancelled',
          message: 'Udostępnianie anulowane',
        };
      }
      logger.warn('[shareUtils] File share failed, falling back to download', error);
    }
  }

  // Fallback: standard download (works on desktop, Android, non-Safari iOS)
  try {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    logger.debug('[shareUtils] File download triggered');

    // On iOS Safari, download attribute doesn't work - provide helpful message
    if (isIOSSafari()) {
      return {
        result: 'shared', // PDF opens in browser on iOS
        message: 'PDF otwarty. Kliknij ikonę udostępniania → "Zapisz do Plików"',
      };
    }

    return {
      result: 'copied', // 'copied' means downloaded in this context
      message: 'Plik został pobrany',
    };
  } catch (error) {
    logger.error('[shareUtils] File download failed', error);
    return {
      result: 'error',
      message: 'Nie udało się pobrać pliku. Spróbuj ponownie.',
    };
  }
};

/**
 * Create a File from Blob with proper type
 */
export const blobToFile = (blob: Blob, filename: string): File => {
  return new File([blob], filename, { type: blob.type });
};
