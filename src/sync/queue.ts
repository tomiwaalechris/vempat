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
  const tx = db.transaction('syncQueue', 'readwrite');
  const store = tx.objectStore('syncQueue');

  let cursor = await store.openCursor();
  const now = Date.now();
  while (cursor) {
    const key = cursor.primaryKey as number;
    const item: any = cursor.value;

    if (item.failed) {
      cursor = await cursor.continue();
      continue;
    }

    if (item.nextAttemptAt && item.nextAttemptAt > Date.now()) {
      cursor = await cursor.continue();
      continue;
    }

    try {
      await handler(item);
      await cursor.delete();
    } catch (err) {
      const attempts = (item.attempts || 0) + 1;
      // exponential backoff: base * 2^(attempts-1)
      const backoff = Math.min(maxBackoff, baseDelay * Math.pow(2, attempts - 1));
      const nextAttemptAt = Date.now() + backoff;
      const failed = attempts >= maxAttempts;
      const updated = { ...item, attempts, nextAttemptAt, failed };
      await cursor.update(updated);
      if (failed) console.warn('Giving up sync entry after max attempts', key, item);
    }

    cursor = await cursor.continue();
  }

  await tx.done;
}

export async function enqueueLocalOperation(entry: { op: string; store: string; key: string | null; payload: any }) {
  return enqueueSync({ ...entry, createdAt: Date.now(), attempts: 0, nextAttemptAt: Date.now(), failed: false });
}

export async function getQueueStats() {
  const db = await getDB();
  const all = await db.getAll('syncQueue');
  const total = all.length;
  const failed = all.filter((e: any) => e.failed).length;
  const pending = all.filter((e: any) => !e.failed).length;
  return { total, pending, failed };
}
