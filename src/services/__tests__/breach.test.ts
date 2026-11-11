import { describe, expect, it, vi } from 'vitest';
import { BreachCheckError, buildRangeRequestUrl, checkPwnedPassword } from '../breach';

const SHA1_PASSWORD = '5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8';
const PREFIX = SHA1_PASSWORD.slice(0, 5);
const SUFFIX = SHA1_PASSWORD.slice(5);

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes.buffer;
}

function response(body: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  } as Response;
}

describe('Pwned Passwords range protocol', () => {
  it('sends only the five-character prefix, never the suffix or plaintext', async () => {
    const fetchMock = vi.fn(async () =>
      response(`${SUFFIX}:52372427\r\n0000000000000000000000000000000000A:12\r\n`),
    );

    const result = await checkPwnedPassword('password', {
      fetchImpl: fetchMock as unknown as typeof fetch,
      digest: async () => hexToBuffer(SHA1_PASSWORD),
    });

    expect(result.found).toBe(true);
    expect(result.count).toBe(52_372_427);

    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://api.pwnedpasswords.com/range/${PREFIX}`);
    expect(new URL(url).pathname).toBe(`/range/${PREFIX}`);
    expect(url).not.toContain(SUFFIX);
    expect((options.headers as Record<string, string>)['Add-Padding']).toBe('true');
    expect(options.body).toBeUndefined();
  });

  it('returns not-found when the suffix is absent', async () => {
    const result = await checkPwnedPassword('not-in-the-list', {
      fetchImpl: (async () =>
        response('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:1\r\n')) as typeof fetch,
      digest: async () => hexToBuffer(SHA1_PASSWORD),
    });
    expect(result.found).toBe(false);
    expect(result.count).toBe(0);
  });

  it('handles HTTP failures without leaking a hash or plaintext', async () => {
    const fetchMock = vi.fn(async () => response('unavailable', 503));
    await expect(
      checkPwnedPassword('password', {
        fetchImpl: fetchMock as unknown as typeof fetch,
        digest: async () => hexToBuffer(SHA1_PASSWORD),
      }),
    ).rejects.toMatchObject({ code: 'response' });
  });

  it('handles network failures safely', async () => {
    const error = await checkPwnedPassword('password', {
      fetchImpl: (async () => {
        throw new TypeError('network down');
      }) as typeof fetch,
      digest: async () => hexToBuffer(SHA1_PASSWORD),
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(BreachCheckError);
    expect((error as BreachCheckError).code).toBe('network');
    expect((error as Error).message).not.toContain(SHA1_PASSWORD);
    expect((error as Error).message).not.toContain(SUFFIX);
  });

  it('rejects an invalid digest instead of requesting a malformed range', async () => {
    await expect(
      checkPwnedPassword('password', {
        fetchImpl: (async () => response('')) as typeof fetch,
        digest: async () => hexToBuffer('00'),
      }),
    ).rejects.toMatchObject({ code: 'unavailable' });
  });

  it('builds a range URL only from a complete SHA-1 digest', () => {
    expect(buildRangeRequestUrl(SHA1_PASSWORD.toLowerCase())).toBe(
      `https://api.pwnedpasswords.com/range/${PREFIX}`,
    );
    expect(() => buildRangeRequestUrl('abc')).toThrow(/SHA-1/);
  });
});
