import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-cbc';
const KEY_HEX_LENGTH = 64;
const IV_BYTE_LENGTH = 16;

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

export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_BYTE_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  return `${iv.toString('hex')}:${ciphertext.toString('hex')}`;
}

export function decrypt(value: string): string {
  const [ivHex, ciphertextHex] = value.split(':');
  if (!ivHex || !ciphertextHex) {
    throw new Error('Encrypted value must use "iv:ciphertext" format.');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  if (iv.length !== IV_BYTE_LENGTH) {
    throw new Error('Encrypted value contains an invalid IV.');
  }

  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
