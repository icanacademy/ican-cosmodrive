
import React from 'react';
import { NAV_ITEMS, ADMIN_NAV } from '../constants';
import { Rocket, HardDrive, LogOut } from 'lucide-react';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  activeNavId: string;
  isAdmin: boolean;
  onNavClick: (navId: string, navPath?: string) => void;
  onAdminLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPath, onNavigate, activeNavId, isAdmin, onNavClick, onAdminLogout }) => {
  return (
    <div className="w-64 h-full flex flex-col glass-card border-r border-white/5 p-4 hidden md:flex">
      {/* Logo/Branding */}
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="p-2 bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.6)]">
          <Rocket className="text-white" size={24} />
        </div>
        <h1 className="font-orbitron text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          CosmoDrive
        </h1>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-2">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold px-3 mb-3">Navigation</p>
        {NAV_ITEMS.map((item) => {
          const isActive = activeNavId === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavClick(item.id, item.path)}
              className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-blue-600/40 text-blue-100 shadow-[inset_0_0_10px_rgba(37,99,235,0.2)] border border-blue-500/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              {item.icon}
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          );
        })}

        {/* Management Section */}
        <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold px-3 mb-3 mt-6">Management</p>
        <button
          onClick={() => onNavClick(ADMIN_NAV.id)}
          className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${
            activeNavId === 'admin'
              ? 'bg-amber-600/30 text-amber-100 shadow-[inset_0_0_10px_rgba(217,119,6,0.2)] border border-amber-500/30'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
          }`}
        >
          {ADMIN_NAV.icon}
          <span className="font-medium text-sm">{ADMIN_NAV.label}</span>
          {isAdmin && (
            <span className="ml-auto w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>

        {/* Exit Admin button */}
        {isAdmin && (
          <button
            onClick={onAdminLogout}
            className="flex items-center gap-3 w-full p-3 rounded-xl transition-all text-red-400 hover:bg-red-600/10 hover:text-red-300"
          >
            <LogOut size={20} />
            <span className="font-medium text-sm">Exit Admin</span>
          </button>
        )}
      </nav>

      {/* NAS Info */}
      <div className="mt-auto pt-6 border-t border-white/5">
        <div className="flex items-center gap-3 mb-3 px-2">
          <HardDrive size={18} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-300">ICANdrive NAS</span>
        </div>
        <div className="px-2">
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>192.168.68.142 &mdash; Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
};
