import { createCipheriv, randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';

describe('API key encryption', () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
  });

  it('encrypts new values with authenticated AES-GCM', async () => {
    const { decrypt, encrypt } = await import('./encryption.js');
    const encrypted = encrypt('sk-ant-test-value');

    expect(encrypted.startsWith('v1:')).toBe(true);
    expect(decrypt(encrypted)).toBe('sk-ant-test-value');
  });

  it('keeps legacy AES-CBC ciphertext readable', async () => {
    const { decrypt } = await import('./encryption.js');
    const key = Buffer.from(process.env.ENCRYPTION_KEY ?? '', 'hex');
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', key, iv);
    const ciphertext = Buffer.concat([cipher.update('legacy-key', 'utf8'), cipher.final()]);
    const legacyValue = `${iv.toString('hex')}:${ciphertext.toString('hex')}`;

    expect(decrypt(legacyValue)).toBe('legacy-key');
  });
});
