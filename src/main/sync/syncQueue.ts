import { getDb } from '../database/db';
import { SyncQueueItem } from '../../shared/types';
import { cryptoRandomUUID } from '../utils/uuid';
import { uploadToR2 } from './r2Client';

export function enqueueSyncOperation(operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'BACKUP', entity: string, entityId: string, payload: any): void {
  try {
    const db = getDb();
    const id = cryptoRandomUUID();
    const now = new Date().toISOString();
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);

    db.prepare(`
      INSERT INTO sync_queue (id, operation, entity, entity_id, payload, status, attempts, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'PENDING', 0, ?, ?)
    `).run(id, operation, entity, entityId, payloadStr, now, now);

    // Trigger async processing non-blockingly
    setTimeout(() => {
      processPendingSyncQueue().catch((err) => console.error('[SyncQueue] Background processing error:', err));
    }, 100);
  } catch (err) {
    console.error('[SyncQueue] Failed to enqueue operation:', err);
  }
}

export async function processPendingSyncQueue(): Promise<void> {
  const db = getDb();
  const pendingItems = db.prepare(`
    SELECT id, operation, entity, entity_id as entityId, payload, status, attempts, created_at as createdAt, updated_at as updatedAt
    FROM sync_queue
    WHERE status = 'PENDING' OR status = 'FAILED'
    ORDER BY created_at ASC
    LIMIT 10
  `).all() as SyncQueueItem[];

  if (pendingItems.length === 0) return;

  for (const item of pendingItems) {
    if (item.attempts >= 5) continue; // Skip item after max attempts

    try {
      db.prepare("UPDATE sync_queue SET status = 'PROCESSING', attempts = attempts + 1, updated_at = ? WHERE id = ?")
        .run(new Date().toISOString(), item.id);

      // Upload change object to Cloudflare R2 if configured
      const key = `sync/${item.entity.toLowerCase()}/${item.entityId}_${Date.now()}.json`;
      await uploadToR2(key, item.payload);

      db.prepare("UPDATE sync_queue SET status = 'COMPLETED', updated_at = ? WHERE id = ?")
        .run(new Date().toISOString(), item.id);
    } catch (err: any) {
      console.warn(`[SyncQueue] Item ${item.id} sync postponed: ${err.message || err}`);
      db.prepare("UPDATE sync_queue SET status = 'FAILED', last_error = ?, updated_at = ? WHERE id = ?")
        .run(String(err.message || err), new Date().toISOString(), item.id);
    }
  }
}

export function getSyncQueueStatus(): { pendingCount: number; failedCount: number } {
  const db = getDb();
  const pendingCount = (db.prepare("SELECT COUNT(*) as c FROM sync_queue WHERE status = 'PENDING' OR status = 'PROCESSING'").get() as { c: number }).c;
  const failedCount = (db.prepare("SELECT COUNT(*) as c FROM sync_queue WHERE status = 'FAILED'").get() as { c: number }).c;
  return { pendingCount, failedCount };
}
