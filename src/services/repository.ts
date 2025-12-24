import { Product, Sale } from '../../types';
import * as db from '../db/index';
import { enqueueLocalOperation, processQueue, getQueueStats } from '../sync/queue';

/**
 * Repository: high-level data APIs for UI to use.
 * - Persists to local IndexedDB immediately
 * - Enqueues remote sync operations
 */

export async function createProduct(product: Product) {
  await db.addItem(product);
  await enqueueLocalOperation({ op: 'create', store: 'items', key: product.id, payload: product });
}

export async function updateProduct(product: Product) {
  await db.addItem(product);
  await enqueueLocalOperation({ op: 'update', store: 'items', key: product.id, payload: product });
}

export async function deleteProduct(productId: string) {
  await db.deleteItem(productId);
  await enqueueLocalOperation({ op: 'delete', store: 'items', key: productId, payload: null });
}

export async function listProducts() {
  return db.getAllItems();
}

export async function createReceipt(sale: Sale) {
  await db.addReceipt(sale);
  await enqueueLocalOperation({ op: 'create', store: 'receipts', key: sale.id, payload: sale });
}

export async function listReceipts() {
  return db.getReceipts();
}

// Trigger processing of the local queue using a provided remote handler.
export async function syncNow(handler: (entry: any) => Promise<any>) {
  return processQueue(handler);
}

export async function getQueueInfo() {
  return getQueueStats();
}
