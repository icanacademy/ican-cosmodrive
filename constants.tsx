
import React from 'react';
import {
  Folder,
  FileText,
  FileImage,
  FileVideo,
  Table,
  File,
  Home,
  Users,
  Music,
  Archive,
  Presentation,
  Shield,
} from 'lucide-react';
import { NavItem } from './types';

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'All Files', icon: <Home size={20} />, path: '/' },
  { id: 'materials', label: 'ICAN Materials', icon: <Folder size={20} />, path: '/ICAN-MATERIALS' },
];

export const ADMIN_NAV: NavItem = {
  id: 'admin',
  label: 'Admin Panel',
  icon: <Shield size={20} />,
};

export const getIconForType = (type: string) => {
  switch (type) {
    case 'folder': return <Folder className="text-blue-400 fill-blue-400/20" />;
    case 'pdf': return <FileText className="text-red-400" />;
    case 'doc': return <FileText className="text-blue-500" />;
    case 'spreadsheet': return <Table className="text-emerald-400" />;
    case 'presentation': return <Presentation className="text-amber-400" />;
    case 'image': return <FileImage className="text-purple-400" />;
    case 'video': return <FileVideo className="text-orange-400" />;
    case 'audio': return <Music className="text-pink-400" />;
    case 'archive': return <Archive className="text-yellow-400" />;
    default: return <File className="text-gray-400" />;
  }
};
