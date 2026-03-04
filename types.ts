
import React from 'react';

export type FileType = 'folder' | 'pdf' | 'doc' | 'image' | 'video' | 'spreadsheet' | 'presentation' | 'audio' | 'archive' | 'file';

export interface CosmoFile {
  name: string;
  type: FileType;
  size?: string | null;
  sizeBytes?: number | null;
  lastModified: string;
  path: string;
  isDir: boolean;
  volume?: string | null;
}

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}
