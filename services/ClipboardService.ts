import { ClipboardService, ClipboardOptions } from './interfaces';

export class ClipboardServiceImpl implements ClipboardService {
  private static instance: ClipboardServiceImpl;
  private cleanupTimeouts: Set<NodeJS.Timeout> = new Set();

  public static getInstance(): ClipboardServiceImpl {
    if (!ClipboardServiceImpl.instance) {
      ClipboardServiceImpl.instance = new ClipboardServiceImpl();
    }
    return ClipboardServiceImpl.instance;
  }

  isSupported(): boolean {
    return !!(typeof navigator !== 'undefined' && 
           navigator.clipboard && 
           typeof navigator.clipboard.writeText === 'function');
  }

  async copy(text: string, options: ClipboardOptions = {}): Promise<boolean> {
    const { autoClean = false, cleanupDelay = 30000, showFeedback = true } = options;

    if (!text) {
      console.warn('Cannot copy empty text to clipboard');
      return false;
    }

    try {
      if (this.isSupported()) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers or when clipboard API is not available
        await this.fallbackCopy(text);
      }

      // Schedule cleanup if requested
      if (autoClean) {
        this.scheduleCleanup(cleanupDelay);
      }

      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      
      // Try fallback if modern API failed
      if (this.isSupported()) {
        try {
          await this.fallbackCopy(text);
          
          if (autoClean) {
            this.scheduleCleanup(cleanupDelay);
          }
          
          return true;
        } catch (fallbackError) {
          console.error('Fallback copy also failed:', fallbackError);
        }
      }
      
      return false;
    }
  }

  scheduleCleanup(delay: number): void {
    const timeout = setTimeout(async () => {
      try {
        if (this.isSupported()) {
          await navigator.clipboard.writeText('');
        } else {
          // Try fallback cleanup
          await this.fallbackCopy('');
        }
      } catch (error) {
        // Silently fail - clipboard might be in use or permissions denied
      }
      this.cleanupTimeouts.delete(timeout);
    }, delay);

    this.cleanupTimeouts.add(timeout);
  }

  // Check if we have clipboard permissions
  async hasClipboardPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      // Check if we have permission to write to clipboard
      const permission = await navigator.permissions.query({ name: 'clipboard-write' as PermissionName });
      return permission.state === 'granted' || permission.state === 'prompt';
    } catch (error) {
      // Permissions API might not be supported, assume we can try
      return true;
    }
  }

  // Get detailed error information for better user feedback
  getClipboardErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError') {
        return 'Clipboard access denied. Please allow clipboard permissions in your browser settings.';
      }
      if (error.name === 'NotFoundError') {
        return 'Clipboard API not found. Your browser may not support this feature.';
      }
      if (error.name === 'SecurityError') {
        return 'Clipboard access blocked for security reasons. Try using HTTPS or check browser settings.';
      }
      if (error.message.includes('execCommand')) {
        return 'Clipboard operation failed. Please try copying manually.';
      }
    }
    return 'Failed to copy to clipboard. Please try again or copy manually.';
  }

  private async fallbackCopy(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if document.execCommand is available
      if (!document.execCommand) {
        reject(new Error('execCommand not supported'));
        return;
      }

      // Create a temporary textarea element
      const textarea = document.createElement('textarea');
      textarea.value = text;
      
      // Position off-screen but ensure it's still selectable
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      textarea.style.zIndex = '-1';
      
      // Ensure the textarea is focusable
      textarea.setAttribute('readonly', '');
      textarea.setAttribute('aria-hidden', 'true');
      
      document.body.appendChild(textarea);
      
      try {
        // Focus and select the text
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, text.length);
        
        // Attempt to copy
        const successful = document.execCommand('copy');
        
        if (successful) {
          resolve();
        } else {
          reject(new Error('execCommand copy returned false'));
        }
      } catch (error) {
        reject(error);
      } finally {
        // Clean up
        try {
          document.body.removeChild(textarea);
        } catch (cleanupError) {
          // Element might have been removed already
        }
        
        // Restore focus to previously active element if possible
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && activeElement !== textarea && activeElement.focus) {
          try {
            activeElement.focus();
          } catch (focusError) {
            // Focus restoration failed, continue silently
          }
        }
      }
    });
  }

  // Cleanup method to clear all pending timeouts
  public cleanup(): void {
    this.cleanupTimeouts.forEach(timeout => clearTimeout(timeout));
    this.cleanupTimeouts.clear();
  }
}