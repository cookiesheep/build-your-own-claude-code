import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const GCM_ALGORITHM = 'aes-256-gcm';
const LEGACY_CBC_ALGORITHM = 'aes-256-cbc';
const CURRENT_VERSION = 'v1';
const KEY_HEX_LENGTH = 64;
const GCM_IV_BYTE_LENGTH = 12;
const GCM_AUTH_TAG_BYTE_LENGTH = 16;
const LEGACY_CBC_IV_BYTE_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required for API key encryption.');
  }

  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string.');
  }

  const keyBuffer = Buffer.from(key, 'hex');
  if (keyBuffer.length !== KEY_HEX_LENGTH / 2) {
    throw new Error('ENCRYPTION_KEY must decode to 32 bytes.');
  }

  return keyBuffer;
}

export function assertEncryptionConfig(): void {
  getEncryptionKey();
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(GCM_IV_BYTE_LENGTH);
  const cipher = createCipheriv(GCM_ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    CURRENT_VERSION,
    iv.toString('hex'),
    authTag.toString('hex'),
    ciphertext.toString('hex'),
  ].join(':');
}

function decryptLegacyCbc(value: string): string {
  const [ivHex, ciphertextHex] = value.split(':');
  if (!ivHex || !ciphertextHex) {
    throw new Error('Encrypted value must use "iv:ciphertext" format.');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  if (iv.length !== LEGACY_CBC_IV_BYTE_LENGTH) {
    throw new Error('Encrypted value contains an invalid IV.');
  }

  const decipher = createDecipheriv(LEGACY_CBC_ALGORITHM, getEncryptionKey(), iv);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

function decryptGcm(parts: string[]): string {
  const [, ivHex, authTagHex, ciphertextHex] = parts;
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error('Encrypted value must use "v1:iv:tag:ciphertext" format.');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  if (iv.length !== GCM_IV_BYTE_LENGTH || authTag.length !== GCM_AUTH_TAG_BYTE_LENGTH) {
    throw new Error('Encrypted value contains invalid AES-GCM metadata.');
  }

  const decipher = createDecipheriv(GCM_ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

export function decrypt(value: string): string {
  const parts = value.split(':');
  if (parts[0] === CURRENT_VERSION) {
    return decryptGcm(parts);
  }

  return decryptLegacyCbc(value);
}
