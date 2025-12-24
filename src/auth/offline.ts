import { getDB } from '../db/index';

export async function cacheUserProfile(user: { uid: string; email?: string }, meta: { name: string; role: string }) {
  const db = await getDB();
  const profile = { id: user.uid, name: meta.name, role: meta.role, email: user.email };
  await db.put('users', profile as any);
}

export async function getCachedUserByEmail(email: string) {
  if (!email) return null;
  const db = await getDB();
  const all = await db.getAll('users');
  return all.find((u: any) => u.email === email) || null;
}

export async function getCachedUserById(uid: string) {
  if (!uid) return null;
  const db = await getDB();
  return db.get('users', uid as any);
}
