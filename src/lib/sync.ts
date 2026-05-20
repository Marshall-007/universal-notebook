import { supabase, isSupabaseConfigured } from './supabase';
import { db, getSyncQueueItems, removeSyncQueueItem } from './db';
import type { Note, Notebook, SyncStatus } from '@/types';

type SyncStatusListener = (status: SyncStatus) => void;

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
    this.userId = userId;
    if (!isSupabaseConfigured()) return;

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
        case 'UPDATE':
          await db.notes.put(this.mapNoteFromServer(newRecord));
          break;
        case 'DELETE':
          if (oldRecord?.id) await db.notes.delete(oldRecord.id as string);
          break;
      }
    } else if (table === 'notebooks') {
      switch (eventType) {
        case 'INSERT':
        case 'UPDATE':
          await db.notebooks.put(this.mapNotebookFromServer(newRecord));
          break;
        case 'DELETE':
          if (oldRecord?.id) await db.notebooks.delete(oldRecord.id as string);
          break;
      }
    }

    this.notifyListeners('synced');
  }

  async processQueue() {
    if (!this.isOnline || this.isSyncing || !isSupabaseConfigured()) return;

    this.isSyncing = true;
    this.notifyListeners('syncing');

    try {
      const items = await getSyncQueueItems();

      for (const item of items) {
        try {
          await this.processQueueItem(item);
          await removeSyncQueueItem(item.id);
        } catch (error) {
          console.error('Sync queue item failed:', error);
          // Increment retry count, skip after 5 retries
          if (item.retries >= 5) {
            await removeSyncQueueItem(item.id);
          } else {
            await db.syncQueue.update(item.id, { retries: item.retries + 1 });
          }
        }
      }
    } finally {
      this.isSyncing = false;
      this.notifyListeners(this.isOnline ? 'synced' : 'offline');
    }
  }

  private async processQueueItem(item: { table: string; operation: string; recordId: string; data: Record<string, unknown> }) {
    const { table, operation, recordId, data } = item;

    switch (operation) {
      case 'create':
        await supabase.from(table).upsert(this.mapToServer(data));
        break;
      case 'update':
        await supabase.from(table).update(this.mapToServer(data)).eq('id', recordId);
        break;
      case 'delete':
        if (table === 'notes') {
          // Soft delete
          await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', recordId);
        } else {
          await supabase.from(table).delete().eq('id', recordId);
        }
        break;
    }
  }

  async pullFromServer() {
    if (!this.userId || !isSupabaseConfigured()) return;

    try {
      // Pull notebooks
      const { data: notebooks } = await supabase
        .from('notebooks')
        .select('*')
        .eq('user_id', this.userId);

      if (notebooks) {
        for (const nb of notebooks) {
          await db.notebooks.put(this.mapNotebookFromServer(nb));
        }
      }

      // Pull notes (exclude deleted)
      const { data: notes } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', this.userId)
        .is('deleted_at', null);

      if (notes) {
        for (const note of notes) {
          await db.notes.put(this.mapNoteFromServer(note));
        }
      }
    } catch (error) {
      console.error('Pull from server failed:', error);
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
