import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db as firestore } from '../../firebase';
import { enqueueLocalOperation } from './queue';

/**
 * Remote handler for queued sync entries.
 * Expects entry: { op, store, key, payload }
 */
export async function remoteHandler(entry: any) {
  const { op, store, key, payload } = entry;
  if (!store) throw new Error('Missing store in sync entry');

  // Map local store names to Firebase collection names
  const collectionMap: { [key: string]: string } = {
    'items': 'products',
    'receipts': 'sales'
  };
  const collection = collectionMap[store] || store;
  try {
    console.log(`Syncing: ${op} ${collection}/${key}`);
    if (op === 'create' || op === 'update') {
      const ref = doc(firestore, collection, String(key));
      await setDoc(ref, payload, { merge: true });
      console.log(`✓ Synced: ${op} ${collection}/${key}`);
    } else if (op === 'delete') {
      const ref = doc(firestore, collection, String(key));
      await deleteDoc(ref);
      console.log(`✓ Deleted: ${collection}/${key}`);
    } else {
      throw new Error('Unknown op ' + op);
    }
    return true;
  } catch (err) {
    // in case of transient failures, re-enqueue with backoff handled elsewhere
    console.error(`✗ Sync failed for ${op} ${collection}/${key}:`, err);
    throw err;
  }
}

/** Helper to enqueue local operation (exported for other modules) */
export { enqueueLocalOperation };
