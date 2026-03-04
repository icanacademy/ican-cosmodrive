
import React, { useState, useRef } from 'react';
import { CosmoFile } from '../types';
import { getIconForType } from '../constants';
import {
  LayoutGrid, List, Download, FolderOpen, FolderPlus, Upload, X, Loader2, HardDrive,
  Trash2, Pencil, FolderInput, CheckSquare, Square, MinusSquare,
} from 'lucide-react';

interface FileViewProps {
  files: CosmoFile[];
  currentPath: string;
  onFileClick: (file: CosmoFile) => void;
  onRefresh: () => void;
  onUpload: (files: FileList) => void;
  uploading: boolean;
  isAdmin?: boolean;
  selectedFiles?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
  onDelete?: (paths: string[]) => void;
  onRename?: (file: CosmoFile) => void;
  onMove?: (paths: string[]) => void;
}

export const FileView: React.FC<FileViewProps> = ({
  files, currentPath, onFileClick, onRefresh, onUpload, uploading,
  isAdmin, selectedFiles, onSelectionChange, onDelete, onRename, onMove,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [folderName, setFolderName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selected = selectedFiles || new Set<string>();

  const toggleSelect = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSelectionChange) return;
    const next = new Set(selected);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    onSelectionChange(next);
  };

  const selectAll = () => {
    if (!onSelectionChange) return;
    if (selected.size === files.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(files.map(f => f.path)));
    }
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    const newPath = currentPath === '/' ? `/${folderName.trim()}` : `${currentPath}/${folderName.trim()}`;
    try {
      const res = await fetch('/api/mkdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newPath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFolderName('');
      setShowNewFolder(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to create folder');
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onUpload(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const allSelected = files.length > 0 && selected.size === files.length;
  const someSelected = selected.size > 0 && selected.size < files.length;

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto relative">

      {/* Admin Toolbar */}
      {isAdmin && (
        <div className="flex items-center gap-3 mb-4 glass-card p-3 rounded-xl border border-amber-500/20">
          <button
            onClick={selectAll}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-300 hover:text-amber-100 bg-slate-800/40 hover:bg-amber-600/20 border border-white/5 hover:border-amber-500/30 rounded-lg transition-all"
          >
            {allSelected ? <CheckSquare size={16} className="text-amber-400" /> : someSelected ? <MinusSquare size={16} className="text-amber-400" /> : <Square size={16} />}
            <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
          </button>

          {selected.size > 0 && (
            <>
              <span className="text-xs text-amber-300 font-semibold">{selected.size} selected</span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => onMove?.([...selected])}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-amber-100 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 rounded-lg transition-all"
                >
                  <FolderInput size={15} />
                  <span>Move</span>
                </button>
                <button
                  onClick={() => onDelete?.([...selected])}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-100 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg transition-all"
                >
                  <Trash2 size={15} />
                  <span>Delete</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Standard Toolbar */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-500">
            {files.length} item{files.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewFolder(!showNewFolder)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-300 hover:text-blue-100 bg-slate-800/40 hover:bg-blue-600/20 border border-white/5 hover:border-blue-500/30 rounded-xl transition-all"
          >
            <FolderPlus size={16} />
            <span className="hidden sm:inline">New Folder</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-100 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl transition-all disabled:opacity-50"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            <span className="hidden sm:inline">{uploading ? 'Uploading...' : 'Upload'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />

          <div className="flex bg-slate-800/50 p-1 rounded-lg border border-white/5 ml-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* New Folder input */}
      {showNewFolder && (
        <div className="flex items-center gap-2 mb-4 glass-card p-3 rounded-xl border border-blue-500/30">
          <FolderPlus size={18} className="text-blue-400 shrink-0" />
          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            placeholder="Folder name..."
            autoFocus
            className="flex-1 bg-transparent border-none text-sm text-slate-200 focus:outline-none placeholder-slate-500"
          />
          <button
            onClick={handleCreateFolder}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
          >
            Create
          </button>
          <button
            onClick={() => { setShowNewFolder(false); setFolderName(''); }}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Empty state */}
      {files.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FolderOpen size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-orbitron">Empty sector</p>
            <p className="text-slate-600 text-sm mt-1">Drop files here or click Upload</p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {files.map((file) => {
            const isSelected = selected.has(file.path);
            return (
              <div
                key={file.path}
                onClick={() => onFileClick(file)}
                className={`group glass-card hover:bg-white/10 p-4 rounded-2xl transition-all hover:scale-[1.02] cursor-pointer border ${
                  isSelected ? 'border-amber-500/50 bg-amber-600/10' : 'border-white/5 hover:border-blue-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {isAdmin && (
                      <button
                        onClick={(e) => toggleSelect(file.path, e)}
                        className="text-slate-500 hover:text-amber-400 transition-colors"
                      >
                        {isSelected ? <CheckSquare size={18} className="text-amber-400" /> : <Square size={18} />}
                      </button>
                    )}
                    <div className="p-3 bg-slate-900/50 rounded-xl group-hover:bg-blue-600/20 transition-colors">
                      {getIconForType(file.type)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isAdmin && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); onRename?.(file); }}
                          className="p-1.5 rounded-lg hover:bg-blue-600/20 text-slate-400 hover:text-blue-300 transition-all"
                          title="Rename"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onMove?.([file.path]); }}
                          className="p-1.5 rounded-lg hover:bg-amber-600/20 text-slate-400 hover:text-amber-300 transition-all"
                          title="Move"
                        >
                          <FolderInput size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete?.([file.path]); }}
                          className="p-1.5 rounded-lg hover:bg-red-600/20 text-slate-400 hover:text-red-300 transition-all"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                    {!file.isDir && !isAdmin && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Download size={16} className="text-slate-400" />
                      </div>
                    )}
                  </div>
                </div>
                <h3 className="font-semibold text-slate-100 mb-1 truncate">{file.name}</h3>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{file.lastModified}</span>
                  <div className="flex items-center gap-2">
                    {file.volume && (
                      <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                        file.volume === 'HDD 1' ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-400'
                      }`}>
                        <HardDrive size={9} />
                        {file.volume}
                      </span>
                    )}
                    <span>{file.size || (file.isDir ? 'Folder' : '--')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 text-[12px] text-slate-500 uppercase tracking-widest font-bold">
                {isAdmin && <th className="px-3 py-4 w-10" />}
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4 hidden lg:table-cell">Volume</th>
                <th className="px-6 py-4 hidden md:table-cell">Last Modified</th>
                <th className="px-6 py-4 hidden sm:table-cell">Size</th>
                {isAdmin && <th className="px-4 py-4 w-28">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {files.map((file) => {
                const isSelected = selected.has(file.path);
                return (
                  <tr
                    key={file.path}
                    onClick={() => onFileClick(file)}
                    className={`group transition-colors cursor-pointer ${
                      isSelected ? 'bg-amber-600/10 hover:bg-amber-600/15' : 'hover:bg-white/5'
                    }`}
                  >
                    {isAdmin && (
                      <td className="px-3 py-3">
                        <button
                          onClick={(e) => toggleSelect(file.path, e)}
                          className="text-slate-500 hover:text-amber-400 transition-colors"
                        >
                          {isSelected ? <CheckSquare size={18} className="text-amber-400" /> : <Square size={18} />}
                        </button>
                      </td>
                    )}
                    <td className="px-6 py-3 flex items-center gap-3">
                      <span className="p-2 bg-slate-900/50 rounded-lg group-hover:bg-blue-600/20 transition-colors">
                        {getIconForType(file.type)}
                      </span>
                      <span className="font-medium text-slate-200">{file.name}</span>
                    </td>
                    <td className="px-6 py-3 hidden lg:table-cell">
                      {file.volume ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          file.volume === 'HDD 1' ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-400'
                        }`}>
                          <HardDrive size={10} />
                          {file.volume}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-sm">--</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-slate-400 text-sm hidden md:table-cell">{file.lastModified}</td>
                    <td className="px-6 py-3 text-slate-400 text-sm hidden sm:table-cell">{file.size || (file.isDir ? '--' : '--')}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); onRename?.(file); }}
                            className="p-1.5 rounded-lg hover:bg-blue-600/20 text-slate-500 hover:text-blue-300 transition-all"
                            title="Rename"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onMove?.([file.path]); }}
                            className="p-1.5 rounded-lg hover:bg-amber-600/20 text-slate-500 hover:text-amber-300 transition-all"
                            title="Move"
                          >
                            <FolderInput size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDelete?.([file.path]); }}
                            className="p-1.5 rounded-lg hover:bg-red-600/20 text-slate-500 hover:text-red-300 transition-all"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
