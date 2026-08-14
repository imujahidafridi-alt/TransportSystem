import crypto from 'crypto';
import { getDb } from '../database/db';

export interface SecurityStatus {
  isPinSet: boolean;
  isEnabled: boolean;
  autoLockMinutes: number;
  isLockedOut: boolean;
  lockoutRemainingSeconds: number;
  remainingAttempts: number;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30000; // 30 seconds

function getSetting(key: string, defaultValue: string = ''): string {
  const db = getDb();
  const row = db.prepare('SELECT value FROM system_settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? row.value : defaultValue;
}

function setSetting(key: string, value: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO system_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}

function hashPin(pin: string, salt: string): string {
  return crypto.pbkdf2Sync(pin, salt, 100000, 64, 'sha512').toString('hex');
}

export function getSecurityStatus(): SecurityStatus {
  const pinHash = getSetting('security_pin_hash', '');
  const isEnabled = getSetting('security_pin_enabled', 'false') === 'true';
  const autoLockMinutes = parseInt(getSetting('security_auto_lock_minutes', '15'), 10);
  const failedAttempts = parseInt(getSetting('security_failed_attempts', '0'), 10);
  const lockoutUntil = parseInt(getSetting('security_lockout_until', '0'), 10);

  const now = Date.now();
  const isLockedOut = lockoutUntil > now;
  const lockoutRemainingSeconds = isLockedOut ? Math.ceil((lockoutUntil - now) / 1000) : 0;
  const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - failedAttempts);

  return {
    isPinSet: Boolean(pinHash),
    isEnabled: isEnabled && Boolean(pinHash),
    autoLockMinutes: isNaN(autoLockMinutes) ? 15 : autoLockMinutes,
    isLockedOut,
    lockoutRemainingSeconds,
    remainingAttempts,
  };
}

export function verifyPin(pin: string): {
  success: boolean;
  error?: string;
  remainingAttempts?: number;
  lockoutSeconds?: number;
} {
  const status = getSecurityStatus();
  if (status.isLockedOut) {
    return {
      success: false,
      error: `Too many failed attempts. Locked out for ${status.lockoutRemainingSeconds}s.`,
      lockoutSeconds: status.lockoutRemainingSeconds,
    };
  }

  const pinHash = getSetting('security_pin_hash', '');
  const salt = getSetting('security_pin_salt', '');

  if (!pinHash || !salt) {
    return { success: true }; // No PIN configured
  }

  const computedHash = hashPin(pin, salt);
  const isMatch = crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(pinHash, 'hex'));

  if (isMatch) {
    // Reset failed attempts on correct PIN
    setSetting('security_failed_attempts', '0');
    setSetting('security_lockout_until', '0');
    return { success: true };
  } else {
    // Increment failed attempts
    const currentFailed = parseInt(getSetting('security_failed_attempts', '0'), 10) + 1;
    setSetting('security_failed_attempts', currentFailed.toString());

    if (currentFailed >= MAX_FAILED_ATTEMPTS) {
      const lockoutExpiry = Date.now() + LOCKOUT_DURATION_MS;
      setSetting('security_lockout_until', lockoutExpiry.toString());
      return {
        success: false,
        error: 'Too many incorrect attempts. Locked out for 30 seconds.',
        lockoutSeconds: 30,
        remainingAttempts: 0,
      };
    }

    const remaining = MAX_FAILED_ATTEMPTS - currentFailed;
    return {
      success: false,
      error: `Incorrect PIN. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      remainingAttempts: remaining,
    };
  }
}

export function setPin(newPin: string): { success: boolean; error?: string } {
  if (!newPin || newPin.length < 4 || newPin.length > 8 || !/^\d+$/.test(newPin)) {
    return { success: false, error: 'PIN must be a 4 to 8 digit numeric passcode.' };
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPin(newPin, salt);

  setSetting('security_pin_hash', hash);
  setSetting('security_pin_salt', salt);
  setSetting('security_pin_enabled', 'true');
  setSetting('security_failed_attempts', '0');
  setSetting('security_lockout_until', '0');

  return { success: true };
}

export function changePin(currentPin: string, newPin: string): { success: boolean; error?: string } {
  const verify = verifyPin(currentPin);
  if (!verify.success) {
    return { success: false, error: verify.error || 'Current PIN is incorrect.' };
  }

  return setPin(newPin);
}

export function disablePin(currentPin: string): { success: boolean; error?: string } {
  const verify = verifyPin(currentPin);
  if (!verify.success) {
    return { success: false, error: verify.error || 'Current PIN is incorrect.' };
  }

  setSetting('security_pin_enabled', 'false');
  setSetting('security_failed_attempts', '0');
  setSetting('security_lockout_until', '0');

  return { success: true };
}

export function updateSecuritySettings(autoLockMinutes: number): { success: boolean } {
  setSetting('security_auto_lock_minutes', autoLockMinutes.toString());
  return { success: true };
}
