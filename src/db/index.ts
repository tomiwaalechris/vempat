import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Product, Sale, StockMovement, Supplier, PurchaseOrder } from '../../types';

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
  stockMovements: {
    key: string;
    value: StockMovement;
    indexes: { 'by-timestamp': string; 'by-productId': string };
  };
  suppliers: {
    key: string;
    value: Supplier;
    indexes: { 'by-name': string };
  };
  purchaseOrders: {
    key: string;
    value: PurchaseOrder;
    indexes: { 'by-poNumber': string; 'by-status': string };
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

        const movements = db.createObjectStore('stockMovements', { keyPath: 'id' });
        movements.createIndex('by-timestamp', 'timestamp');
        movements.createIndex('by-productId', 'productId');

        const suppliers = db.createObjectStore('suppliers', { keyPath: 'id' });
        suppliers.createIndex('by-name', 'name');

        const pos = db.createObjectStore('purchaseOrders', { keyPath: 'id' });
        pos.createIndex('by-poNumber', 'poNumber');
        pos.createIndex('by-status', 'status');

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

// Stock Movements
export async function addStockMovement(movement: StockMovement) {
  const db = await getDB();
  await db.put('stockMovements', movement);
}

export async function getStockMovements() {
  const db = await getDB();
  return db.getAll('stockMovements');
}

export async function getStockMovementsByProduct(productId: string) {
  const db = await getDB();
  return db.getAllFromIndex('stockMovements', 'by-productId', productId);
}

export async function deleteStockMovement(id: string) {
  const db = await getDB();
  return db.delete('stockMovements', id);
}

// Suppliers
export async function addSupplier(supplier: Supplier) {
  const db = await getDB();
  await db.put('suppliers', supplier);
}

export async function getSuppliers() {
  const db = await getDB();
  return db.getAll('suppliers');
}

export async function getSupplier(id: string) {
  const db = await getDB();
  return db.get('suppliers', id);
}

export async function updateSupplier(supplier: Supplier) {
  const db = await getDB();
  await db.put('suppliers', supplier);
}

export async function deleteSupplier(id: string) {
  const db = await getDB();
  return db.delete('suppliers', id);
}

// Purchase Orders
export async function addPurchaseOrder(po: PurchaseOrder) {
  const db = await getDB();
  await db.put('purchaseOrders', po);
}

export async function getPurchaseOrders() {
  const db = await getDB();
  return db.getAll('purchaseOrders');
}

export async function getPurchaseOrder(id: string) {
  const db = await getDB();
  return db.get('purchaseOrders', id);
}

export async function updatePurchaseOrder(po: PurchaseOrder) {
  const db = await getDB();
  await db.put('purchaseOrders', po);
}

export async function deletePurchaseOrder(id: string) {
  const db = await getDB();
  return db.delete('purchaseOrders', id);
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
  const values = await db.getAll('syncQueue');
  const keys = await db.getAllKeys('syncQueue');
  // zip keys into values so callers have access to the record key
  return values.map((v, i) => ({ ...v, id: keys[i] })) as any;
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
