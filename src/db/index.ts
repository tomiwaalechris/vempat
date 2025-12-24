import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Product, Sale } from '../../types';

interface VempatDB extends DBSchema {
  items: {
    key: string;
    value: Product;
    indexes: { 'by-brand': string };
  };
  receipts: {
    key: string;
    value: Sale;
    indexes: { 'by-date': string };
  };
  users: {
    key: string;
    value: { id: string; name: string; role: string };
  };
  syncQueue: {
    key: number;
    value: {
      id?: number;
      op: 'create' | 'update' | 'delete';
      store: string;
      key: string | null;
      payload: any;
      createdAt: number;
      attempts?: number;
      nextAttemptAt?: number;
      failed?: boolean;
    };
    indexes: { 'by-createdAt': number };
  };
}

let dbPromise: Promise<IDBPDatabase<VempatDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<VempatDB>('vempat-db', 1, {
      upgrade(db) {
        const items = db.createObjectStore('items', { keyPath: 'id' });
        items.createIndex('by-brand', 'brand');

        const receipts = db.createObjectStore('receipts', { keyPath: 'id' });
        receipts.createIndex('by-date', 'date');

        db.createObjectStore('users', { keyPath: 'id' });

        const queue = db.createObjectStore('syncQueue', { autoIncrement: true });
        queue.createIndex('by-createdAt', 'createdAt');
      }
    });
  }
  return dbPromise;
}

// Items
export async function addItem(item: Product) {
  const db = await getDB();
  await db.put('items', item);
}

export async function getItem(id: string) {
  const db = await getDB();
  return db.get('items', id);
}

export async function getAllItems() {
  const db = await getDB();
  return db.getAll('items');
}

export async function deleteItem(id: string) {
  const db = await getDB();
  return db.delete('items', id);
}

// Receipts
export async function addReceipt(sale: Sale) {
  const db = await getDB();
  await db.put('receipts', sale);
}

export async function getReceipts() {
  const db = await getDB();
  return db.getAll('receipts');
}

// Sync queue
export async function enqueueSync(entry: Omit<VempatDB['syncQueue']['value'], 'id'>) {
  const db = await getDB();
  const now = Date.now();
  const record = {
    ...entry,
    attempts: entry.attempts || 0,
    createdAt: entry.createdAt || now,
    nextAttemptAt: entry.nextAttemptAt || now,
    failed: entry.failed || false
  };
  const id = await db.add('syncQueue', record as any);
  return id;
}

export async function getSyncQueue() {
  const db = await getDB();
  return db.getAll('syncQueue');
}

export async function removeSyncEntry(key: number) {
  const db = await getDB();
  return db.delete('syncQueue', key);
}

export async function updateSyncEntry(key: number, patch: Partial<VempatDB['syncQueue']['value']>) {
  const db = await getDB();
  const cur = await db.get('syncQueue', key as any);
  if (!cur) return;
  const updated = { ...cur, ...patch } as VempatDB['syncQueue']['value'];
  await db.put('syncQueue', updated, key as any);
}
