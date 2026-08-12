import crypto from 'crypto';

export function cryptoRandomUUID(): string {
  return crypto.randomUUID();
}
