import { describe, expect, it } from 'vitest';
import { assertSafeApiBaseUrl, normalizeApiBaseUrl } from './api-base-url.js';

describe('API base URL safety', () => {
  it('normalizes http(s) URLs and preserves provider paths', () => {
    expect(normalizeApiBaseUrl('https://open.bigmodel.cn/api/anthropic/')).toBe(
      'https://open.bigmodel.cn/api/anthropic'
    );
  });

  it('rejects localhost targets before outbound fetches', async () => {
    await expect(assertSafeApiBaseUrl('http://127.0.0.1:3001')).rejects.toThrow(
      /localhost|private/i
    );
    await expect(assertSafeApiBaseUrl('http://localhost:3001')).rejects.toThrow(
      /localhost|private/i
    );
  });

  it('rejects private network literal addresses', async () => {
    await expect(assertSafeApiBaseUrl('http://169.254.169.254/latest')).rejects.toThrow(
      /private/i
    );
    await expect(assertSafeApiBaseUrl('http://192.168.1.10')).rejects.toThrow(/private/i);
  });

  it('rejects IPv6-mapped IPv4 private addresses', async () => {
    await expect(assertSafeApiBaseUrl('http://[::ffff:127.0.0.1]:3000/test')).rejects.toThrow(
      /private/i
    );
  });
});
