import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Web Crypto API
const mockCrypto = {
  getRandomValues: vi.fn((array: Uint8Array) => {
    // Fill with pseudo-random values for testing
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
};

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
});

// Mock window.crypto for browser environment
Object.defineProperty(window, 'crypto', {
  value: mockCrypto,
  writable: true,
});

// Mock document.execCommand for clipboard fallback
Object.defineProperty(document, 'execCommand', {
  value: vi.fn(() => true),
  writable: true,
});