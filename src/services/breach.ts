import { HIBP_RANGE_ENDPOINT } from '../constants';
import type { BreachResult } from '../types';

export class BreachCheckError extends Error {
  readonly code: 'unavailable' | 'network' | 'timeout' | 'response';

  constructor(code: 'unavailable' | 'network' | 'timeout' | 'response', message: string) {
    super(message);
    this.name = 'BreachCheckError';
    this.code = code;
  }
}

export interface BreachCheckOptions {
  fetchImpl?: typeof fetch;
  digest?: (value: string) => Promise<ArrayBuffer>;
  timeoutMs?: number;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

async function defaultDigest(value: string): Promise<ArrayBuffer> {
  if (!globalThis.crypto?.subtle) {
    throw new BreachCheckError(
      'unavailable',
      'This browser does not expose SubtleCrypto, so the local SHA-1 digest cannot be computed. No request was made.',
    );
  }
  return globalThis.crypto.subtle.digest('SHA-1', new TextEncoder().encode(value));
}

/**
 * Implements the Pwned Passwords range protocol:
 * 1. SHA-1 the candidate locally.
 * 2. Send only the first five hex characters (20 bits) of the digest.
 * 3. Compare the returned suffixes entirely inside this browser.
 *
 * The full digest and the plaintext never enter the request URL or body.
 */
export async function checkPwnedPassword(
  password: string,
  options: BreachCheckOptions = {},
): Promise<BreachResult> {
  if (password.length === 0) {
    throw new BreachCheckError('unavailable', 'There is no candidate to check.');
  }

  const digest = options.digest ?? defaultDigest;
  let hash: string;
  try {
    hash = toHex(await digest(password));
  } catch (error) {
    if (error instanceof BreachCheckError) throw error;
    throw new BreachCheckError(
      'unavailable',
      'The local SHA-1 digest could not be computed. No request was made.',
    );
  }

  if (!/^[0-9A-F]{40}$/.test(hash)) {
    throw new BreachCheckError(
      'unavailable',
      'The local digest was not a valid SHA-1 hash. No request was made.',
    );
  }

  const rangeUrl = buildRangeRequestUrl(hash);
  const suffix = hash.slice(5);
  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), options.timeoutMs ?? 12_000);

  let response: Response;
  try {
    response = await fetchImpl(rangeUrl, {
      method: 'GET',
      headers: { 'Add-Padding': 'true' },
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    });
  } catch {
    if (controller.signal.aborted) {
      throw new BreachCheckError(
        'timeout',
        'The breach service did not respond in time. No password or full hash was sent.',
      );
    }
    throw new BreachCheckError(
      'network',
      'The breach service could not be reached. No password or full hash was sent.',
    );
  } finally {
    globalThis.clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new BreachCheckError(
      'response',
      `The breach service returned HTTP ${response.status}. No password or full hash was sent.`,
    );
  }

  let body: string;
  try {
    body = await response.text();
  } catch {
    throw new BreachCheckError(
      'response',
      'The breach service response could not be read. No password or full hash was sent.',
    );
  }

  let count = 0;
  for (const line of body.split(/\r?\n/)) {
    const delimiter = line.indexOf(':');
    if (delimiter === -1) continue;
    const returnedSuffix = line.slice(0, delimiter).trim().toUpperCase();
    const returnedCount = Number.parseInt(line.slice(delimiter + 1).trim(), 10);
    if (returnedSuffix === suffix) {
      count = Number.isFinite(returnedCount) && returnedCount > 0 ? returnedCount : 0;
      break;
    }
  }

  return {
    found: count > 0,
    count,
    checkedAt: new Date(),
  };
}

/** Exposed for tests and for the transparency panel. */
export function buildRangeRequestUrl(hash: string): string {
  if (!/^[0-9A-Fa-f]{40}$/.test(hash)) {
    throw new Error('A complete SHA-1 digest is required.');
  }
  return `${HIBP_RANGE_ENDPOINT}${hash.slice(0, 5).toUpperCase()}`;
}
