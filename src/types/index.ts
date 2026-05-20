export interface User {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Notebook {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _synced?: boolean;
}

export interface Note {
  id: string;
  userId: string;
  notebookId: string | null;
  title: string;
  contentJson: Record<string, unknown>;
  contentText: string;
  templateType: TemplateType | null;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  _synced?: boolean;
  _localOnly?: boolean;
}

export interface Tag {
  id: string;
  userId: string;
  name: string;
  color: string;
}

export interface NoteTag {
  noteId: string;
  tagId: string;
}

export interface NoteVersion {
  id: string;
  noteId: string;
  contentJson: Record<string, unknown>;
  createdAt: string;
}

export interface CustomTemplate {
  id: string;
  userId: string;
  name: string;
  description: string;
  contentJson: Record<string, unknown>;
  category: string;
  createdAt: string;
}

export type TemplateType =
  | 'quick-note'
  | 'checklist'
  | 'memo'
  | 'brain-dump'
  | 'mind-map'
  | 'meeting-notes'
  | 'journal'
  | 'cornell-notes';

export interface SyncQueueItem {
  id: string;
  table: string;
  recordId: string;
  operation: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: string;
  retries: number;
}

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings {
  theme: ThemeMode;
  fontSize: number;
  focusMode: boolean;
  defaultNotebook: string | null;
}

export interface SearchResult {
  note: Note;
  matchedText: string;
  score: number;
}

export type DateGroup = 'today' | 'yesterday' | 'this-week' | 'this-month' | 'earlier';
