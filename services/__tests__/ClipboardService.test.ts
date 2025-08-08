import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ClipboardServiceImpl } from '../ClipboardService';

// Mock the navigator.clipboard API
const mockClipboard = {
  writeText: vi.fn()
};

// Mock navigator.permissions
const mockPermissions = {
  query: vi.fn()
};

// Mock document.execCommand
const mockExecCommand = vi.fn();

describe('ClipboardService', () => {
  let clipboardService: ClipboardServiceImpl;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup navigator mocks
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true,
      configurable: true
    });
    
    Object.defineProperty(navigator, 'permissions', {
      value: mockPermissions,
      writable: true,
      configurable: true
    });
    
    // Mock document.execCommand
    vi.spyOn(document, 'execCommand').mockImplementation(mockExecCommand);
    
    // Create fresh instance
    clipboardService = ClipboardServiceImpl.getInstance();
  });

  afterEach(() => {
    // Cleanup any pending timeouts
    if (clipboardService) {
      clipboardService.cleanup();
    }
    
    // Restore all mocks
    vi.restoreAllMocks();
  });

  describe('isSupported', () => {
    it('should return true when clipboard API is available', () => {
      const isSupported = clipboardService.isSupported();
      expect(isSupported).toBe(true);
    });

    it('should return false when clipboard API is not available', () => {
      // Delete the clipboard property to simulate it not being available
      delete (navigator as any).clipboard;
      
      // Create a new service instance to test with the modified navigator
      const testService = new (ClipboardServiceImpl as any)();
      const isSupported = testService.isSupported();
      expect(isSupported).toBe(false);
    });

    it('should return false when writeText is not available', () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: {},
        writable: true,
        configurable: true
      });
      
      const isSupported = clipboardService.isSupported();
      expect(isSupported).toBe(false);
    });
  });

  describe('copy', () => {
    it('should copy text to clipboard successfully using modern API', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);
      
      const result = await clipboardService.copy('test text');
      
      expect(result).toBe(true);
      expect(mockClipboard.writeText).toHaveBeenCalledWith('test text');
    });

    it('should return false for empty text', async () => {
      const result = await clipboardService.copy('');
      
      expect(result).toBe(false);
      expect(mockClipboard.writeText).not.toHaveBeenCalled();
    });

    it('should use fallback when modern API fails', async () => {
      mockClipboard.writeText.mockRejectedValue(new Error('Permission denied'));
      mockExecCommand.mockReturnValue(true);
      
      // Mock DOM methods for fallback
      const mockTextarea = {
        focus: vi.fn(),
        select: vi.fn(),
        setSelectionRange: vi.fn(),
        style: {},
        setAttribute: vi.fn(),
        value: ''
      };
      
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockTextarea as any);
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockTextarea as any);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockTextarea as any);
      
      const result = await clipboardService.copy('test text');
      
      expect(result).toBe(true);
      expect(mockExecCommand).toHaveBeenCalledWith('copy');
      expect(createElementSpy).toHaveBeenCalledWith('textarea');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('should use fallback when clipboard API is not supported', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
        configurable: true
      });
      
      mockExecCommand.mockReturnValue(true);
      
      const mockTextarea = {
        focus: vi.fn(),
        select: vi.fn(),
        setSelectionRange: vi.fn(),
        style: {},
        setAttribute: vi.fn(),
        value: ''
      };
      
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockTextarea as any);
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockTextarea as any);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockTextarea as any);
      
      const result = await clipboardService.copy('test text');
      
      expect(result).toBe(true);
      expect(mockExecCommand).toHaveBeenCalledWith('copy');
      
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('should return false when both modern API and fallback fail', async () => {
      mockClipboard.writeText.mockRejectedValue(new Error('Permission denied'));
      mockExecCommand.mockReturnValue(false);
      
      const mockTextarea = {
        focus: vi.fn(),
        select: vi.fn(),
        setSelectionRange: vi.fn(),
        style: {},
        setAttribute: vi.fn(),
        value: ''
      };
      
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockTextarea as any);
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockTextarea as any);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockTextarea as any);
      
      const result = await clipboardService.copy('test text');
      
      expect(result).toBe(false);
      
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('should handle clipboard options with autoClean', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);
      
      const result = await clipboardService.copy('test text', {
        autoClean: true,
        cleanupDelay: 100,
        showFeedback: true
      });
      
      expect(result).toBe(true);
      expect(mockClipboard.writeText).toHaveBeenCalledWith('test text');
      
      // Wait for cleanup to be scheduled
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Cleanup should have been called
      expect(mockClipboard.writeText).toHaveBeenCalledWith('');
    });
  });

  describe('hasClipboardPermission', () => {
    it('should return true when permission is granted', async () => {
      mockPermissions.query.mockResolvedValue({ state: 'granted' });
      
      const hasPermission = await clipboardService.hasClipboardPermission();
      
      expect(hasPermission).toBe(true);
      expect(mockPermissions.query).toHaveBeenCalledWith({ name: 'clipboard-write' });
    });

    it('should return true when permission is prompt', async () => {
      mockPermissions.query.mockResolvedValue({ state: 'prompt' });
      
      const hasPermission = await clipboardService.hasClipboardPermission();
      
      expect(hasPermission).toBe(true);
    });

    it('should return false when permission is denied', async () => {
      mockPermissions.query.mockResolvedValue({ state: 'denied' });
      
      const hasPermission = await clipboardService.hasClipboardPermission();
      
      expect(hasPermission).toBe(false);
    });

    it('should return false when clipboard is not supported', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
        configurable: true
      });
      
      const hasPermission = await clipboardService.hasClipboardPermission();
      
      expect(hasPermission).toBe(false);
    });

    it('should return true when permissions API is not supported', async () => {
      mockPermissions.query.mockRejectedValue(new Error('Not supported'));
      
      const hasPermission = await clipboardService.hasClipboardPermission();
      
      expect(hasPermission).toBe(true);
    });
  });

  describe('getClipboardErrorMessage', () => {
    it('should return specific message for NotAllowedError', () => {
      const error = new Error('Permission denied');
      error.name = 'NotAllowedError';
      
      const message = clipboardService.getClipboardErrorMessage(error);
      
      expect(message).toContain('Clipboard access denied');
    });

    it('should return specific message for NotFoundError', () => {
      const error = new Error('Not found');
      error.name = 'NotFoundError';
      
      const message = clipboardService.getClipboardErrorMessage(error);
      
      expect(message).toContain('Clipboard API not found');
    });

    it('should return specific message for SecurityError', () => {
      const error = new Error('Security error');
      error.name = 'SecurityError';
      
      const message = clipboardService.getClipboardErrorMessage(error);
      
      expect(message).toContain('Clipboard access blocked for security reasons');
    });

    it('should return specific message for execCommand errors', () => {
      const error = new Error('execCommand failed');
      
      const message = clipboardService.getClipboardErrorMessage(error);
      
      expect(message).toContain('Clipboard operation failed');
    });

    it('should return generic message for unknown errors', () => {
      const error = new Error('Unknown error');
      
      const message = clipboardService.getClipboardErrorMessage(error);
      
      expect(message).toContain('Failed to copy to clipboard');
    });

    it('should handle non-Error objects', () => {
      const message = clipboardService.getClipboardErrorMessage('string error');
      
      expect(message).toContain('Failed to copy to clipboard');
    });
  });

  describe('scheduleCleanup', () => {
    it('should schedule clipboard cleanup with modern API', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);
      
      clipboardService.scheduleCleanup(100);
      
      // Wait for cleanup to execute
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(mockClipboard.writeText).toHaveBeenCalledWith('');
    });

    it('should schedule cleanup with fallback when modern API not supported', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
        configurable: true
      });
      
      mockExecCommand.mockReturnValue(true);
      
      const mockTextarea = {
        focus: vi.fn(),
        select: vi.fn(),
        setSelectionRange: vi.fn(),
        style: {},
        setAttribute: vi.fn(),
        value: ''
      };
      
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockTextarea as any);
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockTextarea as any);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockTextarea as any);
      
      clipboardService.scheduleCleanup(100);
      
      // Wait for cleanup to execute
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(mockExecCommand).toHaveBeenCalledWith('copy');
      
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('should handle cleanup errors silently', async () => {
      mockClipboard.writeText.mockRejectedValue(new Error('Cleanup failed'));
      
      expect(() => {
        clipboardService.scheduleCleanup(100);
      }).not.toThrow();
      
      // Wait for cleanup attempt
      await new Promise(resolve => setTimeout(resolve, 150));
    });
  });

  describe('cleanup', () => {
    it('should cleanup pending timeouts', () => {
      clipboardService.scheduleCleanup(1000);
      clipboardService.scheduleCleanup(2000);
      
      expect(() => {
        clipboardService.cleanup();
      }).not.toThrow();
    });

    it('should handle multiple cleanup calls', () => {
      clipboardService.scheduleCleanup(1000);
      
      expect(() => {
        clipboardService.cleanup();
        clipboardService.cleanup();
      }).not.toThrow();
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ClipboardServiceImpl.getInstance();
      const instance2 = ClipboardServiceImpl.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});