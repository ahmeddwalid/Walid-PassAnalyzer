import { webcrypto } from 'node:crypto';
import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Use the platform's real Web Crypto implementation. Generation and breach
// tests must exercise actual CSPRNG/digest behavior, not a Math.random mock.
Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  configurable: true,
});
Object.defineProperty(window, 'crypto', {
  value: webcrypto,
  configurable: true,
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

window.scrollTo = vi.fn();
Element.prototype.scrollIntoView = vi.fn();

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  value: ResizeObserverMock,
  configurable: true,
});

Object.defineProperty(globalThis, 'requestAnimationFrame', {
  writable: true,
  value: (callback: FrameRequestCallback) => window.setTimeout(() => callback(Date.now()), 0),
});

Object.defineProperty(globalThis, 'cancelAnimationFrame', {
  writable: true,
  value: (id: number) => window.clearTimeout(id),
});

/**
 * jsdom does not implement module workers. This test double exercises the same
 * worker message protocol as production, using the real zxcvbn model and the
 * same sanitized core function.
 */
class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  private analyzer: ((password: string, userInputs?: string[]) => unknown) | null = null;

  constructor() {
    void (async () => {
      try {
        const zxcvbnModule = await import('zxcvbn');
        const candidate =
          (zxcvbnModule as unknown as { default?: unknown }).default ?? zxcvbnModule;
        if (typeof candidate !== 'function') throw new Error('No model');
        this.analyzer = candidate as (password: string, userInputs?: string[]) => unknown;
        this.onmessage?.({ data: { type: 'ready' } } as MessageEvent);
      } catch {
        this.onerror?.(new ErrorEvent('error', { message: 'Fake worker failed' }));
      }
    })();
  }

  postMessage(message: unknown): void {
    const request = message as {
      type?: string;
      id?: number;
      password?: string;
      userInputs?: string[];
    };
    if (request.type !== 'analyze' || typeof request.id !== 'number') return;
    void (async () => {
      try {
        if (!this.analyzer) throw new Error('Model not loaded');
        const result = await import('./src/services/analysisCore').then(({ runModel }) =>
          runModel(request.password ?? '', request.userInputs ?? [], this.analyzer as never),
        );
        this.onmessage?.({
          data: { type: 'result', id: request.id, result },
        } as MessageEvent);
      } catch {
        this.onmessage?.({
          data: {
            type: 'error',
            id: request.id,
            message:
              'The strength model could not complete this assessment. The candidate was not logged or transmitted.',
          },
        } as MessageEvent);
      }
    })();
  }

  terminate(): void {}
}

Object.defineProperty(globalThis, 'Worker', {
  configurable: true,
  writable: true,
  value: FakeWorker,
});
