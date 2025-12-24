import React, { useState } from 'react';
import { User, Lock, Loader2, ArrowRight } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { getCachedUserByEmail } from '../src/auth/offline';
import SignUpView from './SignUpView.tsx';

const LoginView = ({ onLogin }: { onLogin: (role: any, name: string) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSignUp, setShowSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error('signIn failed', err);
      // If network error or offline, try offline cached user
      const isNetworkErr = !navigator.onLine || (err && err.code === 'auth/network-request-failed');
      if (isNetworkErr) {
        const cached = await getCachedUserByEmail(email);
        if (cached) {
          // notify parent to set offline user
          onLogin(cached.role, cached.name);
          return;
        }
      }
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (showSignUp) return <SignUpView onSignUp={(role, name) => { setShowSignUp(false); onLogin(role, name); }} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-600 to-blue-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-12 animate-in zoom-in-95 duration-500">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-sky-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-sky-600/30 mx-auto mb-4">
            <svg className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">VEMPAT</h1>
          <p className="text-slate-500 mt-2 font-medium">Cloud Inventory System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                placeholder="Email address"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-sky-500/20 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400"
                value={email}
                onChange={(e) => {setEmail(e.target.value); setError('');}}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                placeholder="Password"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-sky-500/20 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400"
                value={password}
                onChange={(e) => {setPassword(e.target.value); setError('');}}
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm font-bold text-center px-4">{error}</p>}

          <div className="flex gap-2 items-center justify-between">
            <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-2xl shadow-xl shadow-sky-600/20 flex items-center justify-center gap-2 group transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Access System <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
          </button>
            <button type="button" onClick={() => setShowSignUp(true)} className="text-sm text-slate-500 underline ml-2">Sign up</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginView;
