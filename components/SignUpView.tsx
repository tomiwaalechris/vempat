import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserRole } from '../types';

const SignUpView = ({ onSignUp }: { onSignUp: (role: UserRole, name: string) => void }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !password.trim()) return setError('Name, email and password required');
    if (password !== confirm) return setError('Passwords do not match');
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      try {
        await setDoc(doc(db, 'users', cred.user.uid), { name, email, role: UserRole.SALES, createdAt: new Date().toISOString() });
      } catch (e) {
        console.error('failed to create user doc', e);
      }
      onSignUp(UserRole.SALES, name);
    } catch (err: any) {
      console.error('signup failed', err);
      setError(err?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-600 to-blue-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-12 animate-in zoom-in-95 duration-500">
        <div className="text-center mb-6">
          <h2 className="text-xl font-black">Create Account</h2>
          <p className="text-sm text-slate-500">Create an account to access Vempat.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border rounded-2xl" />
          <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border rounded-2xl" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border rounded-2xl" />
          <input type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border rounded-2xl" />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold">{loading ? 'Creating...' : 'Create Account'}</button>
            <button type="button" onClick={() => { window.location.hash = ''; }} className="py-3 px-4 bg-slate-100 rounded-2xl">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUpView;
