import React from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  title: string;
  items: string[];
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ title, items, onConfirm, onCancel, loading }) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="glass-card rounded-2xl border border-red-500/30 p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600/20 rounded-lg border border-red-500/30">
              <AlertTriangle className="text-red-400" size={20} />
            </div>
            <h2 className="font-semibold text-red-100">{title}</h2>
          </div>
          <button onClick={onCancel} className="p-1 text-slate-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="mb-5 max-h-48 overflow-y-auto space-y-1">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/40 rounded-lg text-sm text-slate-300">
              <span className="truncate">{item}</span>
            </div>
          ))}
        </div>

        <p className="text-slate-400 text-sm mb-5">This action cannot be undone.</p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 bg-slate-800/60 hover:bg-slate-700/60 border border-white/10 rounded-xl text-slate-300 text-sm font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 bg-red-600/30 hover:bg-red-600/50 border border-red-500/40 rounded-xl text-red-100 text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};
