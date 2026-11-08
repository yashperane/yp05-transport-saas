import React, { useState } from 'react';
import { companyApi } from '../services/companyApi.js';
import { KeyRound, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export default function AcceptInviteModal({ isOpen, onClose }) {
  const [tokenInput, setTokenInput] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await companyApi.acceptInvitation({
        token: tokenInput.trim(),
        password,
      });
      setSuccess('Account activated successfully! You can now log in with your email and new password.');
      setTokenInput('');
      setPassword('');
    } catch (err) {
      setError(err.message || 'Failed to activate invitation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-sky-400" />
            Accept Team Invitation
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xs">
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Paste the invitation token provided by your company admin or transport operator to set your password and activate your account.
        </p>

        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Invitation Token</label>
            <input
              type="text"
              required
              placeholder="e.g. 32-character token"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Set New Password</label>
            <input
              type="password"
              required
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-700 rounded-lg text-slate-400 hover:bg-slate-800"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold shadow disabled:opacity-50"
            >
              {loading ? 'Activating...' : 'Activate Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
