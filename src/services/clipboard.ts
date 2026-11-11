export class ClipboardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClipboardError';
  }
}

function fallbackCopy(text: string): boolean {
  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') {
    return false;
  }
  const previouslyFocused = document.activeElement as HTMLElement | null;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.setAttribute('aria-hidden', 'true');
  textarea.style.position = 'fixed';
  textarea.style.inset = '0 auto auto -9999px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);

  try {
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea.remove();
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      try {
        previouslyFocused.focus();
      } catch {
        // Focus restoration is best-effort.
      }
    }
  }
}

/**
 * Copies on an explicit user action only. Clipboard history and synchronization
 * are controlled by the browser and operating system; this application does not
 * attempt to erase clipboard contents or claim that it can.
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (!text) {
    throw new ClipboardError('There is nothing to copy.');
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Some browsers expose the API but deny it outside a secure context.
    }
  }

  if (fallbackCopy(text)) return;

  throw new ClipboardError(
    'The browser blocked clipboard access. Select the value and copy it manually.',
  );
}
