import { getDB, getSyncQueue, removeSyncEntry, updateSyncEntry, enqueueSync } from '../db/index';

/**
 * processQueue
 * - Iterates the `syncQueue` store using a cursor so we have access to keys
 * - Respects `nextAttemptAt` and `failed` flags
 * - On failure increments `attempts` and schedules `nextAttemptAt` with exponential backoff
 */
export async function processQueue(handler: (entry: any) => Promise<any>, opts?: { maxAttempts?: number; baseDelayMs?: number; maxBackoffMs?: number }) {
  const maxAttempts = opts?.maxAttempts ?? 6;
  const baseDelay = opts?.baseDelayMs ?? 1000; // 1s
  const maxBackoff = opts?.maxBackoffMs ?? 1000 * 60 * 60; // 1 hour

  const db = await getDB();

  // First, collect all entries that need processing (include IDB keys)
  const queue = await getSyncQueue();
  const now = Date.now();
  const entriesToProcess = queue.filter(item => {
    if (item.failed) return false;
    if (item.nextAttemptAt && item.nextAttemptAt > now) return false;
    return true;
  });

  // Process each entry and collect updates
  const updates: { key: any; action: 'delete' | 'update'; data?: any }[] = [];

  for (const item of entriesToProcess) {
    const key = item.id;
    try {
      console.log(`Processing queue item ${key}: ${item.op} ${item.store}`);
      await handler(item);
      updates.push({ key, action: 'delete' });
      console.log(`✓ Queue item ${key} processed successfully`);
    } catch (err) {
      const attempts = (item.attempts || 0) + 1;
      // exponential backoff: base * 2^(attempts-1)
      const backoff = Math.min(maxBackoff, baseDelay * Math.pow(2, attempts - 1));
      const nextAttemptAt = now + backoff;
      const failed = attempts >= maxAttempts;
      const updated = { ...item, attempts, nextAttemptAt, failed };
      updates.push({ key, action: 'update', data: updated });
      if (failed) console.warn('Giving up sync entry after max attempts', key, item);
      console.error(`✗ Queue item ${key} failed (attempt ${attempts}/${maxAttempts}):`, err);
    }
  }

  // Apply all updates in a single transaction
  if (updates.length > 0) {
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    
    for (const upd of updates) {
      if (upd.action === 'delete') {
        await store.delete(upd.key);
      } else if (upd.action === 'update') {
        await store.put(upd.data);
      }
    }
    
    await tx.done;
  }
}

export async function enqueueLocalOperation(entry: { op: string; store: string; key: string | null; payload: any }) {
  return enqueueSync({ ...entry, createdAt: Date.now(), attempts: 0, nextAttemptAt: Date.now(), failed: false });
}

export async function getQueueStats() {
  const all = await getSyncQueue();
  const total = all.length;
  const failed = all.filter((e: any) => e.failed).length;
  const pending = all.filter((e: any) => !e.failed).length;
  return { total, pending, failed };
}
