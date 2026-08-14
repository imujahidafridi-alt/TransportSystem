import { getDb } from './db';

/**
 * Database initialization & seeding helper.
 * User data persistence is strictly protected — no deletion occurs on startup.
 */
export function seedInitialDataIfNeeded(): void {
  // No-op: Data is persistent across all app restarts.
}
