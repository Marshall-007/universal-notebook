import Dexie, { type Table } from 'dexie';
import type { Note, Notebook, Tag, NoteTag, NoteVersion, CustomTemplate, SyncQueueItem } from '@/types';

export class UniversalNotebookDB extends Dexie {
  notebooks!: Table<Notebook>;
  notes!: Table<Note>;
  tags!: Table<Tag>;
  noteTags!: Table<NoteTag>;
  noteVersions!: Table<NoteVersion>;
  customTemplates!: Table<CustomTemplate>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('UniversalNotebookDB');
    this.version(1).stores({
      notebooks: 'id, userId, name, sortOrder, updatedAt',
      notes: 'id, userId, notebookId, title, templateType, isPinned, isArchived, createdAt, updatedAt, deletedAt',
      tags: 'id, userId, name',
      noteTags: '[noteId+tagId], noteId, tagId',
      noteVersions: 'id, noteId, createdAt',
      customTemplates: 'id, userId, category, createdAt',
      syncQueue: 'id, table, recordId, operation, timestamp',
    });
  }
}

export const db = new UniversalNotebookDB();

// Helper functions
export async function addToSyncQueue(
  table: string,
  recordId: string,
  operation: 'create' | 'update' | 'delete',
  data: Record<string, unknown>
) {
  await db.syncQueue.add({
    id: crypto.randomUUID(),
    table,
    recordId,
    operation,
    data,
    timestamp: new Date().toISOString(),
    retries: 0,
  });
}

export async function clearSyncQueue() {
  await db.syncQueue.clear();
}

export async function getSyncQueueItems() {
  return db.syncQueue.orderBy('timestamp').toArray();
}

export async function removeSyncQueueItem(id: string) {
  await db.syncQueue.delete(id);
}

export async function clearAllData() {
  await db.notebooks.clear();
  await db.notes.clear();
  await db.tags.clear();
  await db.noteTags.clear();
  await db.noteVersions.clear();
  await db.customTemplates.clear();
  await db.syncQueue.clear();
}
