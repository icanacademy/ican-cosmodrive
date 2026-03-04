import React, { useState, useRef, useEffect } from 'react';
import { Pencil, X, Loader2 } from 'lucide-react';

interface RenameDialogProps {
  currentName: string;
  filePath: string;
  adminToken: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const RenameDialog: React.FC<RenameDialogProps> = ({ currentName, filePath, adminToken, onSuccess, onCancel }) => {
  const [newName, setNewName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      // Select name without extension
      const dotIdx = currentName.lastIndexOf('.');
      inputRef.current.setSelectionRange(0, dotIdx > 0 ? dotIdx : currentName.length);
    }
  }, [currentName]);

  const handleRename = async () => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === currentName || loading) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
        body: JSON.stringify({ path: filePath, newName: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rename failed');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="glass-card rounded-2xl border border-blue-500/30 p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg border border-blue-500/30">
              <Pencil className="text-blue-400" size={18} />
            </div>
            <h2 className="font-semibold text-slate-100">Rename</h2>
          </div>
          <button onClick={onCancel} className="p-1 text-slate-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          className="w-full bg-slate-900/60 border border-white/10 focus:border-blue-500/50 rounded-xl py-3 px-4 text-sm text-slate-200 focus:outline-none transition-all"
        />

        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 bg-slate-800/60 hover:bg-slate-700/60 border border-white/10 rounded-xl text-slate-300 text-sm font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleRename}
            disabled={!newName.trim() || newName.trim() === currentName || loading}
            className="flex-1 py-2.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 rounded-xl text-blue-100 text-sm font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? 'Renaming...' : 'Rename'}
          </button>
        </div>
      </div>
    </div>
  );
};
