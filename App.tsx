
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { FileView } from './components/FileView';
import { PinModal } from './components/PinModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { RenameDialog } from './components/RenameDialog';
import { MoveDialog } from './components/MoveDialog';
import { CosmoFile } from './types';
import { Search, ChevronRight, Home, Loader2, Upload } from 'lucide-react';

const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState('/ICAN-MATERIALS');
  const [files, setFiles] = useState<CosmoFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dragCounter = useRef(0);

  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const [activeNavId, setActiveNavId] = useState('materials');
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // Dialog state
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [renameTarget, setRenameTarget] = useState<CosmoFile | null>(null);
  const [moveTargets, setMoveTargets] = useState<string[] | null>(null);

  // Restore admin token from sessionStorage
  useEffect(() => {
    const savedToken = sessionStorage.getItem('cosmo_admin_token');
    if (savedToken) {
      setAdminToken(savedToken);
      setIsAdmin(true);
    }
  }, []);

  const fetchFiles = useCallback(async (dirPath: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(dirPath)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load files');
      }
      const data = await res.json();
      setFiles(data.files);
      setCurrentPath(dirPath);
    } catch (err: any) {
      setError(err.message);
      setFiles([]);
    } finally {
      setLoading(false);
      setSelectedFiles(new Set());
    }
  }, []);

  useEffect(() => {
    fetchFiles('/ICAN-MATERIALS');
  }, [fetchFiles]);

  const navigateTo = (dirPath: string) => {
    setSearchQuery('');
    fetchFiles(dirPath);
  };

  const handleFileClick = (file: CosmoFile) => {
    if (file.isDir) {
      navigateTo(file.path);
    } else {
      window.open(`/api/download?path=${encodeURIComponent(file.path)}`, '_blank');
    }
  };

  const uploadFiles = useCallback(async (fileList: FileList) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < fileList.length; i++) {
      formData.append('files', fileList[i]);
    }
    try {
      const res = await fetch(`/api/upload?path=${encodeURIComponent(currentPath)}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchFiles(currentPath);
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [currentPath, fetchFiles]);

  // Admin handlers
  const handleAdminLogin = (token: string) => {
    setAdminToken(token);
    setIsAdmin(true);
    setShowPinModal(false);
    sessionStorage.setItem('cosmo_admin_token', token);
    // Navigate to root in admin mode
    setActiveNavId('admin');
    navigateTo('/');
  };

  const handleAdminLogout = () => {
    if (adminToken) {
      fetch('/api/admin/logout', {
        method: 'POST',
        headers: { 'X-Admin-Token': adminToken },
      }).catch(() => {});
    }
    setIsAdmin(false);
    setAdminToken('');
    setSelectedFiles(new Set());
    sessionStorage.removeItem('cosmo_admin_token');
    setActiveNavId('materials');
    navigateTo('/ICAN-MATERIALS');
  };

  const handleNavClick = (navId: string, navPath?: string) => {
    if (navId === 'admin') {
      if (!isAdmin) {
        setShowPinModal(true);
      } else {
        setActiveNavId('admin');
        navigateTo('/');
      }
      return;
    }
    setActiveNavId(navId);
    navigateTo(navPath || '/');
  };

  // Admin file operations
  const handleDeleteFiles = (paths: string[]) => {
    setConfirmDelete(paths);
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    setDeleteLoading(true);
    try {
      if (confirmDelete.length === 1) {
        const res = await fetch('/api/admin/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
          body: JSON.stringify({ path: confirmDelete[0] }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Delete failed');
      } else {
        const res = await fetch('/api/admin/bulk-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
          body: JSON.stringify({ paths: confirmDelete }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Bulk delete failed');
        const failed = data.results?.filter((r: any) => !r.ok) || [];
        if (failed.length > 0) {
          alert(`${failed.length} item(s) could not be deleted: ${failed[0].error}`);
        }
      }
      setConfirmDelete(null);
      setSelectedFiles(new Set());
      fetchFiles(currentPath);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRenameFile = (file: CosmoFile) => {
    setRenameTarget(file);
  };

  const handleMoveFiles = (paths: string[]) => {
    setMoveTargets(paths);
  };

  // Drag & drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    dragCounter.current = 0;
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      uploadFiles(droppedFiles);
    }
  };

  // Breadcrumbs
  const breadcrumbs = currentPath === '/'
    ? [{ label: 'Home', path: '/' }]
    : [
        { label: 'Home', path: '/' },
        ...currentPath.split('/').filter(Boolean).map((segment, i, arr) => ({
          label: segment,
          path: '/' + arr.slice(0, i + 1).join('/'),
        })),
      ];

  const filteredFiles = searchQuery
    ? files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  return (
    <div
      className="flex h-screen w-full relative overflow-hidden bg-black/40"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Full-screen drop overlay */}
      {dragging && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="border-2 border-dashed border-blue-400 rounded-3xl p-16 text-center">
            <Upload size={56} className="text-blue-400 mx-auto mb-4 animate-bounce" />
            <p className="text-blue-200 font-orbitron font-bold text-xl">Drop files to upload</p>
            <p className="text-slate-400 text-sm mt-2">Uploading to: {currentPath}</p>
          </div>
        </div>
      )}

      {/* Modals */}
      {showPinModal && (
        <PinModal
          onSuccess={handleAdminLogin}
          onClose={() => setShowPinModal(false)}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title={`Delete ${confirmDelete.length} item${confirmDelete.length !== 1 ? 's' : ''}?`}
          items={confirmDelete.map(p => p.split('/').pop() || p)}
          onConfirm={executeDelete}
          onCancel={() => setConfirmDelete(null)}
          loading={deleteLoading}
        />
      )}
      {renameTarget && (
        <RenameDialog
          currentName={renameTarget.name}
          filePath={renameTarget.path}
          adminToken={adminToken}
          onSuccess={() => { setRenameTarget(null); fetchFiles(currentPath); }}
          onCancel={() => setRenameTarget(null)}
        />
      )}
      {moveTargets && (
        <MoveDialog
          items={moveTargets}
          adminToken={adminToken}
          onSuccess={() => { setMoveTargets(null); setSelectedFiles(new Set()); fetchFiles(currentPath); }}
          onCancel={() => setMoveTargets(null)}
        />
      )}

      <Sidebar
        currentPath={currentPath}
        onNavigate={navigateTo}
        activeNavId={activeNavId}
        isAdmin={isAdmin}
        onNavClick={handleNavClick}
        onAdminLogout={handleAdminLogout}
      />

      <main className="flex-1 flex flex-col relative">
        {/* Admin mode banner */}
        {isAdmin && activeNavId === 'admin' && (
          <div className="bg-amber-600/15 border-b border-amber-500/30 px-6 py-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-200 text-xs font-semibold uppercase tracking-wider">Admin Mode Active</span>
          </div>
        )}

        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 glass-card sticky top-0 z-10">
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Traverse the archives..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/40 border border-white/5 rounded-full py-2 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:bg-slate-800/60 focus:border-blue-500/30 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 ml-6">
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-200">ICAN CosmoDrive</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-tighter">NAS File Explorer</p>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-blue-500/50 p-0.5 bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <span className="text-white font-orbitron font-bold text-sm">IC</span>
              </div>
            </div>
          </div>
        </header>

        {/* Breadcrumbs */}
        <div className="px-6 py-3 flex items-center gap-1 text-sm border-b border-white/5">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={crumb.path}>
              {i > 0 && <ChevronRight size={14} className="text-slate-600 mx-1" />}
              <button
                onClick={() => navigateTo(crumb.path)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all ${
                  i === breadcrumbs.length - 1
                    ? 'text-blue-400 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {i === 0 && <Home size={14} />}
                <span>{crumb.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {uploading && (
            <div className="mx-6 mt-4 glass-card p-3 rounded-xl border border-blue-500/30 flex items-center gap-3">
              <Loader2 size={18} className="text-blue-400 animate-spin shrink-0" />
              <p className="text-sm text-blue-200">Uploading files...</p>
            </div>
          )}
          {loading ? (
            <div className="flex-1 flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4">
                <Loader2 size={32} className="text-blue-400 animate-spin" />
                <p className="text-slate-400 text-sm font-orbitron">Scanning archives...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center h-full">
              <div className="glass-card p-8 rounded-2xl border border-red-500/30 text-center max-w-md">
                <p className="text-red-400 font-semibold mb-2">Navigation Error</p>
                <p className="text-slate-400 text-sm">{error}</p>
                <button
                  onClick={() => navigateTo('/')}
                  className="mt-4 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl text-blue-100 text-sm transition-all"
                >
                  Return to Home
                </button>
              </div>
            </div>
          ) : (
            <FileView
              files={filteredFiles}
              currentPath={currentPath}
              onFileClick={handleFileClick}
              onRefresh={() => fetchFiles(currentPath)}
              onUpload={uploadFiles}
              uploading={uploading}
              isAdmin={isAdmin && activeNavId === 'admin'}
              selectedFiles={selectedFiles}
              onSelectionChange={setSelectedFiles}
              onDelete={handleDeleteFiles}
              onRename={handleRenameFile}
              onMove={handleMoveFiles}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
