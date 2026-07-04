import { supabase, isSupabaseConfigured } from './supabase';
import { db, getSyncQueueItems, removeSyncQueueItem } from './db';
import { useNotesStore } from '@/stores/notesStore';
import type { Note, Notebook, SyncStatus } from '@/types';

type SyncStatusListener = (status: SyncStatus) => void;

const PAGE_SIZE = 1000;

class SyncEngine {
  private listeners: Set<SyncStatusListener> = new Set();
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;
  private realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
  private userId: string | null = null;

  constructor() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processQueue();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners('offline');
    });
  }

  subscribe(listener: SyncStatusListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(status: SyncStatus) {
    this.listeners.forEach((l) => l(status));
  }

  getStatus(): SyncStatus {
    if (!this.isOnline) return 'offline';
    if (this.isSyncing) return 'syncing';
    return 'synced';
  }

  async initialize(userId: string) {
    if (!isSupabaseConfigured()) {
      this.userId = userId;
      return;
    }
    // Idempotency guard: repeated SIGNED_IN events (tab focus, token refresh,
    // StrictMode double-invoke) must not stack realtime channels or re-pull.
    if (this.userId === userId && this.realtimeChannel) return;

    this.userId = userId;

    // Initial full sync from server
    await this.pullFromServer();

    // Subscribe to realtime changes
    this.subscribeToRealtime();

    // Process any pending offline changes
    await this.processQueue();
  }

  async cleanup() {
    this.userId = null;
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  private subscribeToRealtime() {
    if (!this.userId || !isSupabaseConfigured()) return;

    // Tear down any existing channel first so a re-subscribe cannot orphan it.
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }

    this.realtimeChannel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes', filter: `user_id=eq.${this.userId}` },
        (payload) => this.handleRealtimeChange('notes', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notebooks', filter: `user_id=eq.${this.userId}` },
        (payload) => this.handleRealtimeChange('notebooks', payload)
      )
      .subscribe();
  }

  private async handleRealtimeChange(
    table: string,
    payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }
  ) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (table === 'notes') {
      switch (eventType) {
        case 'INSERT':
        case 'UPDATE': {
          const note = this.mapNoteFromServer(newRecord);
          if (await this.applyServerNote(note)) {
            useNotesStore.getState().applyRemoteNote(note);
          }
          break;
        }
        case 'DELETE':
          if (oldRecord?.id) {
            await db.notes.delete(oldRecord.id as string);
            useNotesStore.getState().removeLocalNote(oldRecord.id as string);
          }
          break;
      }
    } else if (table === 'notebooks') {
      switch (eventType) {
        case 'INSERT':
        case 'UPDATE': {
          const notebook = this.mapNotebookFromServer(newRecord);
          if (await this.applyServerNotebook(notebook)) {
            useNotesStore.getState().applyRemoteNotebook(notebook);
          }
          break;
        }
        case 'DELETE':
          if (oldRecord?.id) {
            await db.notebooks.delete(oldRecord.id as string);
            useNotesStore.getState().removeLocalNotebook(oldRecord.id as string);
          }
          break;
      }
    }

    this.notifyListeners(this.getStatus());
  }

  // Write a server note into Dexie unless the local copy has unsynced edits
  // pending (last-write-wins would otherwise clobber the newer local body).
  // Returns true if the write was applied.
  private async applyServerNote(note: Note): Promise<boolean> {
    const local = await db.notes.get(note.id);
    if (local && local._synced === false) return false;
    await db.notes.put(note);
    return true;
  }

  private async applyServerNotebook(notebook: Notebook): Promise<boolean> {
    const local = await db.notebooks.get(notebook.id);
    if (local && local._synced === false) return false;
    await db.notebooks.put(notebook);
    return true;
  }

  async processQueue() {
    if (!this.isOnline || this.isSyncing || !isSupabaseConfigured()) return;

    this.isSyncing = true;
    this.notifyListeners('syncing');
    let hadError = false;

    try {
      const items = await getSyncQueueItems();

      for (const item of items) {
        try {
          await this.processQueueItem(item);
          await removeSyncQueueItem(item.id);
        } catch (error) {
          console.error('Sync queue item failed:', error);
          // Increment retry count, drop after 5 retries so a permanently
          // rejected item (e.g. constraint violation) cannot wedge the queue.
          if (item.retries >= 5) {
            await removeSyncQueueItem(item.id);
          } else {
            await db.syncQueue.update(item.id, { retries: item.retries + 1 });
            hadError = true;
          }
        }
      }
    } finally {
      this.isSyncing = false;
      if (hadError) {
        this.notifyListeners('error');
      } else {
        this.notifyListeners(this.isOnline ? 'synced' : 'offline');
      }
    }
  }

  private async processQueueItem(item: { table: string; operation: string; recordId: string; data: Record<string, unknown> }) {
    const { table, operation, recordId, data } = item;

    switch (operation) {
      case 'create': {
        const { error } = await supabase.from(table).upsert(this.mapToServer(data));
        if (error) throw error;
        break;
      }
      case 'update': {
        const { error } = await supabase.from(table).update(this.mapToServer(data)).eq('id', recordId);
        if (error) throw error;
        break;
      }
      case 'delete': {
        if (table === 'notes') {
          // Soft delete
          const { error } = await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', recordId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from(table).delete().eq('id', recordId);
          if (error) throw error;
        }
        break;
      }
    }

    // Mark the local record as synced once the push has been accepted.
    if (operation !== 'delete') {
      if (table === 'notes') {
        await db.notes.update(recordId, { _synced: true }).catch(() => {});
      } else if (table === 'notebooks') {
        await db.notebooks.update(recordId, { _synced: true }).catch(() => {});
      }
    }
  }

  async pullFromServer() {
    if (!this.userId || !isSupabaseConfigured()) return;

    try {
      // Pull notebooks (paginated so large accounts aren't truncated at the
      // server's default max-rows cap).
      const notebooks = await this.pullAll<Record<string, unknown>>((from, to) =>
        supabase
          .from('notebooks')
          .select('*')
          .eq('user_id', this.userId as string)
          .order('updated_at')
          .range(from, to)
      );
      if (notebooks) {
        const serverIds = new Set(notebooks.map((nb) => nb.id as string));
        for (const nb of notebooks) {
          await this.applyServerNotebook(this.mapNotebookFromServer(nb));
        }
        await this.reconcileDeletedNotebooks(serverIds);
      }

      // Pull notes (exclude deleted), also paginated.
      const notes = await this.pullAll<Record<string, unknown>>((from, to) =>
        supabase
          .from('notes')
          .select('*')
          .eq('user_id', this.userId as string)
          .is('deleted_at', null)
          .order('updated_at')
          .range(from, to)
      );
      if (notes) {
        const serverIds = new Set(notes.map((n) => n.id as string));
        for (const note of notes) {
          await this.applyServerNote(this.mapNoteFromServer(note));
        }
        await this.reconcileDeletedNotes(serverIds);
      }

      // Refresh the in-memory store from the reconciled local DB.
      const state = useNotesStore.getState();
      if (state.activeNoteId === null) {
        await state.loadNotebooks(this.userId);
        await state.loadNotes(this.userId, state.activeNotebookId);
      }
    } catch (error) {
      console.error('Pull from server failed:', error);
    }
  }

  // Page through a select query until a short page signals the end.
  private async pullAll<T>(
    query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
  ): Promise<T[]> {
    const all: T[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await query(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < PAGE_SIZE) break;
    }
    return all;
  }

  // Remove locally-cached notes that no longer exist server-side (deleted on
  // another device while we missed the realtime event). Never touch records
  // with unsynced local edits still pending in the queue.
  private async reconcileDeletedNotes(serverIds: Set<string>) {
    if (!this.userId) return;
    const local = await db.notes.where('userId').equals(this.userId).toArray();
    const stale = local.filter((n) => !serverIds.has(n.id) && n._synced !== false && !n.deletedAt);
    for (const n of stale) {
      await db.notes.delete(n.id);
      useNotesStore.getState().removeLocalNote(n.id);
    }
  }

  private async reconcileDeletedNotebooks(serverIds: Set<string>) {
    if (!this.userId) return;
    const local = await db.notebooks.where('userId').equals(this.userId).toArray();
    const stale = local.filter((nb) => !serverIds.has(nb.id) && nb._synced !== false);
    for (const nb of stale) {
      await db.notebooks.delete(nb.id);
      useNotesStore.getState().removeLocalNotebook(nb.id);
    }
  }

  private mapToServer(data: Record<string, unknown>): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('_')) continue; // Skip local-only fields
      // Convert camelCase to snake_case
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      mapped[snakeKey] = value;
    }
    return mapped;
  }

  private mapNoteFromServer(record: Record<string, unknown>): Note {
    return {
      id: record.id as string,
      userId: record.user_id as string,
      notebookId: (record.notebook_id as string) || null,
      title: (record.title as string) || '',
      contentJson: (record.content_json as Record<string, unknown>) || {},
      contentText: (record.content_text as string) || '',
      templateType: record.template_type as Note['templateType'],
      isPinned: (record.is_pinned as boolean) || false,
      isArchived: (record.is_archived as boolean) || false,
      createdAt: record.created_at as string,
      updatedAt: record.updated_at as string,
      deletedAt: (record.deleted_at as string) || null,
      _synced: true,
    };
  }

  private mapNotebookFromServer(record: Record<string, unknown>): Notebook {
    return {
      id: record.id as string,
      userId: record.user_id as string,
      name: (record.name as string) || '',
      color: (record.color as string) || '#5c7cfa',
      icon: (record.icon as string) || '📓',
      sortOrder: (record.sort_order as number) || 0,
      createdAt: record.created_at as string,
      updatedAt: record.updated_at as string,
      _synced: true,
    };
  }
}

export const syncEngine = new SyncEngine();
