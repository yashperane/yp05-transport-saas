import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Truck, Lock, Mail, AlertCircle, KeyRound, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('owner@sherkar.local');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(identifier, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickFill = (email) => {
    setIdentifier(email);
    setPassword('Password123!');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-sky-600 flex items-center justify-center text-white shadow-xl shadow-sky-600/30">
            <Truck className="w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-extrabold text-white tracking-tight">
          Transport SaaS Project
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Secure Authentication & Role-Based Access Control (RBAC)
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 space-y-6">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Email or Phone Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. owner@sherkar.local"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-60 transition"
            >
              {submitting ? 'Authenticating...' : 'Sign In to Workspace'}
            </button>
          </form>

          {/* Quick Login Test Accounts helper for development testing */}
          <div className="border-t border-slate-800 pt-5 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Quick Test Accounts (Password: Password123!)
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('owner@sherkar.local')}
                className="p-2 text-left bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition"
              >
                <div className="font-semibold text-sky-400">Sherkar (Owner)</div>
                <div className="text-[10px] text-slate-500">owner@sherkar.local</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('dispatcher@sherkar.local')}
                className="p-2 text-left bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition"
              >
                <div className="font-semibold text-teal-400">Dispatcher</div>
                <div className="text-[10px] text-slate-500">dispatcher@sherkar.local</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('driver1@sherkar.local')}
                className="p-2 text-left bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition"
              >
                <div className="font-semibold text-emerald-400">Driver 1</div>
                <div className="text-[10px] text-slate-500">driver1@sherkar.local</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('companyadmin@tataprojects.local')}
                className="p-2 text-left bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition"
              >
                <div className="font-semibold text-amber-400">Company Admin</div>
                <div className="text-[10px] text-slate-500">companyadmin@tataprojects.local</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
