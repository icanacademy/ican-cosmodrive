import React, { useState, useEffect, useCallback } from 'react';
import { FolderInput, X, Loader2, ChevronRight, Folder, Home } from 'lucide-react';

interface TreeNode {
  name: string;
  path: string;
  hasChildren: boolean;
  children?: TreeNode[];
  loaded?: boolean;
  expanded?: boolean;
}

interface MoveDialogProps {
  items: string[];
  adminToken: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const MoveDialog: React.FC<MoveDialogProps> = ({ items, adminToken, onSuccess, onCancel }) => {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [selected, setSelected] = useState('/');
  const [loading, setLoading] = useState(false);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState('');

  const fetchChildren = useCallback(async (parentPath: string): Promise<TreeNode[]> => {
    const res = await fetch(`/api/admin/tree?path=${encodeURIComponent(parentPath)}`, {
      headers: { 'X-Admin-Token': adminToken },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.folders.map((f: any) => ({
      ...f,
      children: [],
      loaded: false,
      expanded: false,
    }));
  }, [adminToken]);

  useEffect(() => {
    setLoading(true);
    fetchChildren('/').then(nodes => {
      setTree(nodes);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [fetchChildren]);

  const toggleNode = async (nodePath: string) => {
    const update = async (nodes: TreeNode[]): Promise<TreeNode[]> => {
      const result: TreeNode[] = [];
      for (const node of nodes) {
        if (node.path === nodePath) {
          if (!node.loaded && node.hasChildren) {
            const children = await fetchChildren(node.path);
            result.push({ ...node, expanded: true, loaded: true, children });
          } else {
            result.push({ ...node, expanded: !node.expanded });
          }
        } else {
          const updatedChildren = node.children ? await update(node.children) : [];
          result.push({ ...node, children: updatedChildren });
        }
      }
      return result;
    };
    setTree(await update(tree));
  };

  const handleMove = async () => {
    if (moving) return;
    setMoving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
        body: JSON.stringify({ paths: items, destination: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Move failed');

      const failed = data.results?.filter((r: any) => !r.ok) || [];
      if (failed.length > 0) {
        setError(`Failed to move ${failed.length} item(s): ${failed[0].error}`);
        setMoving(false);
        return;
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message);
      setMoving(false);
    }
  };

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const isSelected = selected === node.path;
    // Don't show folders being moved as destinations
    const isItemBeingMoved = items.some(p => node.path.startsWith(p));
    if (isItemBeingMoved) return null;

    return (
      <div key={node.path}>
        <button
          onClick={() => setSelected(node.path)}
          className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg text-sm transition-all ${
            isSelected
              ? 'bg-amber-600/20 text-amber-100 border border-amber-500/30'
              : 'text-slate-300 hover:bg-white/5'
          }`}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
        >
          {node.hasChildren ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggleNode(node.path); }}
              className="p-0.5 hover:bg-white/10 rounded transition-colors"
            >
              <ChevronRight
                size={14}
                className={`text-slate-500 transition-transform ${node.expanded ? 'rotate-90' : ''}`}
              />
            </button>
          ) : (
            <span className="w-5" />
          )}
          <Folder size={16} className="text-blue-400 shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
        {node.expanded && node.children?.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="glass-card rounded-2xl border border-amber-500/30 p-6 w-full max-w-lg mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600/20 rounded-lg border border-amber-500/30">
              <FolderInput className="text-amber-400" size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-100">Move {items.length} item{items.length !== 1 ? 's' : ''}</h2>
              <p className="text-[11px] text-slate-500">Select destination folder</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1 text-slate-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Destination selector */}
        <div className="bg-slate-900/40 rounded-xl border border-white/5 max-h-72 overflow-y-auto p-2 mb-4">
          {/* Root option */}
          <button
            onClick={() => setSelected('/')}
            className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg text-sm transition-all ${
              selected === '/'
                ? 'bg-amber-600/20 text-amber-100 border border-amber-500/30'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <span className="w-5" />
            <Home size={16} className="text-slate-400 shrink-0" />
            <span>Root</span>
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="text-slate-500 animate-spin" />
            </div>
          ) : (
            tree.map(node => renderNode(node))
          )}
        </div>

        <div className="text-xs text-slate-500 mb-4">
          Moving to: <span className="text-amber-300 font-mono">{selected}</span>
        </div>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={moving}
            className="flex-1 py-2.5 bg-slate-800/60 hover:bg-slate-700/60 border border-white/10 rounded-xl text-slate-300 text-sm font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={moving}
            className="flex-1 py-2.5 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 rounded-xl text-amber-100 text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {moving ? <Loader2 size={16} className="animate-spin" /> : <FolderInput size={16} />}
            {moving ? 'Moving...' : 'Move Here'}
          </button>
        </div>
      </div>
    </div>
  );
};
