import React, { useState } from 'react';
import { loginHOD, isMockMode } from '../firebase';
import { Lock, User, AlertCircle, Loader2, Key } from 'lucide-react';

function AdminLogin({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const user = await loginHOD(username.trim(), password);
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 rounded-3xl glass-panel-glow border border-studio-accent-purple/20 relative overflow-hidden">
      {/* Glow highlight */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-studio-accent-purple to-transparent"></div>

      <div className="space-y-6">
        {/* Title */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-studio-accent-purple/10 flex items-center justify-center border border-studio-accent-purple/20 text-studio-accent-purple">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">HOD Master Access</h2>
          <p className="text-sm text-slate-400">Authenticate to manage lab workstations & settings</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm animate-shake">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">HOD Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <User className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="vfxdept"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl studio-input text-slate-100 placeholder:text-slate-650 text-sm"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Security Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl studio-input text-slate-100 placeholder:text-slate-650 text-sm"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-studio-accent-purple to-violet-600 hover:from-studio-accent-purple/95 hover:to-violet-600/95 text-white font-semibold rounded-xl transition duration-350 flex items-center justify-center gap-2 shadow-glow-purple disabled:opacity-50 disabled:pointer-events-none mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Authenticating...
              </>
            ) : (
              'Access Control Console'
            )}
          </button>
        </form>

        {/* Mock Mode Credentials Assistant */}
        {isMockMode && (
          <div className="p-4 rounded-2xl bg-studio-900 border border-white/5 flex gap-3 text-xs text-slate-400">
            <Key className="h-4 w-4 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="font-semibold text-slate-300">Lab Simulation Credentials:</p>
              <p className="mt-1 font-mono text-[11px] text-slate-400">
                Username: <span className="text-amber-400">vfxdept</span><br />
                Pass: <span className="text-amber-400">admin0461</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminLogin;
