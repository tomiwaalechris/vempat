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

  const collection = store; // map directly to firestore collection names
  try {
    if (op === 'create' || op === 'update') {
      const ref = doc(firestore, collection, String(key));
      await setDoc(ref, payload, { merge: true });
    } else if (op === 'delete') {
      const ref = doc(firestore, collection, String(key));
      await deleteDoc(ref);
    } else {
      throw new Error('Unknown op ' + op);
    }
    return true;
  } catch (err) {
    // in case of transient failures, re-enqueue with backoff handled elsewhere
    console.warn('remoteHandler error', err);
    throw err;
  }
}

/** Helper to enqueue local operation (exported for other modules) */
export { enqueueLocalOperation };
