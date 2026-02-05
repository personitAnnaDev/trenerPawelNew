/**
 * @vitest-environment jsdom
 * Tests for share/copy utility functions
 * Issue #3: Copy link fails on iOS Safari
 * Issue #2: PDF download fails on iOS Safari
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isIOS,
  isIOSSafari,
  canShare,
  canShareUrl,
  shareOrCopyText,
  shareOrDownloadFile,
  blobToFile,
} from '@/utils/shareUtils';

describe('shareUtils - iOS Detection', () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  describe('isIOS()', () => {
    it('should detect iPhone', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        },
        writable: true,
        configurable: true,
      });
      expect(isIOS()).toBe(true);
    });

    it('should detect iPad', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        },
        writable: true,
        configurable: true,
      });
      expect(isIOS()).toBe(true);
    });

    it('should NOT detect Android', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        },
        writable: true,
        configurable: true,
      });
      expect(isIOS()).toBe(false);
    });

    it('should NOT detect Desktop', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        writable: true,
        configurable: true,
      });
      expect(isIOS()).toBe(false);
    });
  });

  describe('isIOSSafari()', () => {
    it('should detect iPhone Safari', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        },
        writable: true,
        configurable: true,
      });
      expect(isIOSSafari()).toBe(true);
    });

    it('should NOT detect iPhone Chrome', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1',
        },
        writable: true,
        configurable: true,
      });
      expect(isIOSSafari()).toBe(false);
    });

    it('should NOT detect Desktop Safari', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
        },
        writable: true,
        configurable: true,
      });
      expect(isIOSSafari()).toBe(false);
    });
  });
});

describe('shareUtils - canShare detection', () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  describe('canShare()', () => {
    it('should return true when navigator.share exists', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          share: vi.fn(),
        },
        writable: true,
        configurable: true,
      });
      expect(canShare()).toBe(true);
    });

    it('should return false when navigator.share does not exist', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });
      expect(canShare()).toBe(false);
    });
  });

  describe('canShareUrl()', () => {
    it('should return true when canShare returns true for URL', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          share: vi.fn(),
          canShare: vi.fn().mockReturnValue(true),
        },
        writable: true,
        configurable: true,
      });
      expect(canShareUrl('https://example.com')).toBe(true);
    });

    it('should return false when canShare is not available', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });
      expect(canShareUrl('https://example.com')).toBe(false);
    });
  });
});

describe('shareUtils - shareOrCopyText', () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it('should use Web Share API on iOS when available', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        share: mockShare,
        canShare: vi.fn().mockReturnValue(true),
      },
      writable: true,
      configurable: true,
    });

    const result = await shareOrCopyText('https://example.com', { title: 'Test' });

    expect(mockShare).toHaveBeenCalled();
    expect(result.result).toBe('shared');
  });

  it('should fallback to clipboard on desktop', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        clipboard: {
          writeText: mockWriteText,
        },
      },
      writable: true,
      configurable: true,
    });

    const result = await shareOrCopyText('https://example.com');

    expect(mockWriteText).toHaveBeenCalledWith('https://example.com');
    expect(result.result).toBe('copied');
  });

  it('should handle user cancellation of share sheet', async () => {
    const mockShare = vi.fn().mockRejectedValue(new DOMException('Share canceled', 'AbortError'));

    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
        share: mockShare,
        canShare: vi.fn().mockReturnValue(true),
      },
      writable: true,
      configurable: true,
    });

    const result = await shareOrCopyText('https://example.com');

    expect(result.result).toBe('cancelled');
    expect(result.message).toContain('anulowane');
  });

  it('should return error when all methods fail', async () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Unknown)',
      },
      writable: true,
      configurable: true,
    });

    // Mock document.execCommand to fail
    const originalExecCommand = document.execCommand;
    document.execCommand = vi.fn().mockReturnValue(false);

    const result = await shareOrCopyText('https://example.com');

    expect(result.result).toBe('error');

    // Restore
    document.execCommand = originalExecCommand;
  });

  it('should use execCommand fallback when clipboard fails', async () => {
    const mockWriteText = vi.fn().mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));

    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
        clipboard: {
          writeText: mockWriteText,
        },
      },
      writable: true,
      configurable: true,
    });

    // Mock successful execCommand
    const originalExecCommand = document.execCommand;
    document.execCommand = vi.fn().mockReturnValue(true);

    const result = await shareOrCopyText('https://example.com');

    expect(result.result).toBe('copied');

    // Restore
    document.execCommand = originalExecCommand;
  });
});

describe('shareUtils - shareOrDownloadFile', () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    // Mock URL.createObjectURL
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it('should share file on iOS when Web Share API supports files', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        share: mockShare,
        canShare: vi.fn().mockReturnValue(true),
      },
      writable: true,
      configurable: true,
    });

    const result = await shareOrDownloadFile(file, 'test.pdf');

    expect(mockShare).toHaveBeenCalled();
    expect(result.result).toBe('shared');
  });

  it('should fallback to download on desktop', async () => {
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
      writable: true,
      configurable: true,
    });

    const result = await shareOrDownloadFile(file, 'test.pdf');

    // Desktop should return 'copied' (meaning downloaded)
    expect(result.result).toBe('copied');
    expect(result.message).toContain('pobrany');
  });

  it('should provide iOS-specific message on iOS Safari', async () => {
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        canShare: vi.fn().mockReturnValue(false), // File sharing not supported on old iOS
      },
      writable: true,
      configurable: true,
    });

    const result = await shareOrDownloadFile(file, 'test.pdf');

    // Should show iOS-specific instructions
    expect(result.result).toBe('shared'); // Opens in browser on iOS
    expect(result.message).toContain('udostępniania');
  });
});

describe('shareUtils - blobToFile', () => {
  it('should convert Blob to File with correct properties', () => {
    const blob = new Blob(['test content'], { type: 'application/pdf' });
    const file = blobToFile(blob, 'document.pdf');

    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('document.pdf');
    expect(file.type).toBe('application/pdf');
  });
});
