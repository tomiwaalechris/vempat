import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserRole } from '../types';
import { SECRET_SUPERADMIN_CODE } from '../constants';

const RegistrationView = ({ onRegister }: { onRegister: (name: string, email?: string) => void }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !password.trim() || !code.trim()) return setError('Name, email, password and code required');
    const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRe.test(email)) return setError('Enter a valid email address');
    if (code !== SECRET_SUPERADMIN_CODE) return setError('Invalid registration code');
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      try {
        await setDoc(doc(db, 'users', cred.user.uid), { name, email, role: UserRole.SUPER_ADMIN, createdAt: new Date().toISOString() });
      } catch (e) {
        console.error('failed to create super admin user doc', e);
        setError('Failed to register. Check console.');
        setLoading(false);
        return;
      }
      onRegister(name, email);
      window.location.hash = '';
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-600 to-blue-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-12 animate-in zoom-in-95 duration-500">
        <div className="text-center mb-6">
          <h2 className="text-xl font-black">Hidden Super Admin Registration</h2>
          <p className="text-sm text-slate-500">Enter the secret code to register a Super Admin.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-bold text-slate-600">Full name</label>
          <input aria-label="Full name" type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border rounded-2xl" />

          <label className="block text-sm font-bold text-slate-600">Email address</label>
          <input aria-label="Email address" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border rounded-2xl" />

          <label className="block text-sm font-bold text-slate-600">Password</label>
          <input aria-label="Password" type="password" placeholder="Password for account" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border rounded-2xl" />

          <label className="block text-sm font-bold text-slate-600">Registration code</label>
          <input aria-label="Registration code" type="text" placeholder="Secret registration code" value={code} onChange={e => setCode(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border rounded-2xl" />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold">{loading ? 'Registering...' : 'Register Super Admin'}</button>
            <button type="button" onClick={() => { window.location.hash=''; }} className="py-3 px-4 bg-slate-100 rounded-2xl">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegistrationView;
