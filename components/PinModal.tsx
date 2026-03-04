import React, { useState, useRef, useEffect } from 'react';
import { Shield, X, Loader2 } from 'lucide-react';

interface PinModalProps {
  onSuccess: (token: string) => void;
  onClose: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({ onSuccess, onClose }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!pin.trim() || loading) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();

      if (!res.ok) {
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setError(data.error || 'Authentication failed');
        setPin('');
        return;
      }

      onSuccess(data.token);
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className={`glass-card rounded-2xl border border-amber-500/30 p-8 w-full max-w-sm mx-4 ${
          shake ? 'animate-shake' : ''
        }`}
        style={shake ? { animation: 'shake 0.5s ease-in-out' } : {}}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600/30 rounded-lg border border-amber-500/30">
              <Shield className="text-amber-400" size={22} />
            </div>
            <div>
              <h2 className="font-orbitron font-bold text-amber-100 text-lg">Admin Access</h2>
              <p className="text-[11px] text-slate-500">Enter password to continue</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <input
            ref={inputRef}
            type="password"
            maxLength={20}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Enter password..."
            className="w-full bg-slate-900/60 border border-white/10 focus:border-amber-500/50 rounded-xl py-3 px-4 text-center text-lg text-amber-100 focus:outline-none transition-all font-mono"
          />

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!pin.trim() || loading}
            className="w-full py-3 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 rounded-xl text-amber-100 font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}
            {loading ? 'Authenticating...' : 'Enter Admin Mode'}
          </button>
        </div>
      </div>
    </div>
  );
};
