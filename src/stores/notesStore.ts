import { create } from 'zustand';
import { db, addToSyncQueue } from '@/lib/db';
import { syncEngine } from '@/lib/sync';
import type { Note, Notebook, Tag } from '@/types';

interface NotesState {
  notes: Note[];
  notebooks: Notebook[];
  tags: Tag[];
  activeNotebookId: string | null;
  activeNoteId: string | null;
  isLoading: boolean;

  // Notebooks
  loadNotebooks: (userId: string) => Promise<void>;
  createNotebook: (notebook: Omit<Notebook, 'createdAt' | 'updatedAt' | '_synced'>) => Promise<Notebook>;
  updateNotebook: (id: string, updates: Partial<Notebook>) => Promise<void>;
  deleteNotebook: (id: string) => Promise<void>;
  setActiveNotebook: (id: string | null) => void;

  // Notes
  loadNotes: (userId: string, notebookId?: string | null) => Promise<void>;
  createNote: (note: Omit<Note, 'createdAt' | 'updatedAt' | '_synced' | '_localOnly'>) => Promise<Note>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  archiveNote: (id: string) => Promise<void>;
  setActiveNote: (id: string | null) => void;

  // Tags
  loadTags: (userId: string) => Promise<void>;
  createTag: (tag: Omit<Tag, 'id'>) => Promise<Tag>;
}

export const useNotesStore = create<NotesState>()((set, get) => ({
  notes: [],
  notebooks: [],
  tags: [],
  activeNotebookId: null,
  activeNoteId: null,
  isLoading: false,

  // Notebooks
  loadNotebooks: async (userId) => {
    const notebooks = await db.notebooks
      .where('userId')
      .equals(userId)
      .sortBy('sortOrder');
    set({ notebooks });
  },

  createNotebook: async (notebook) => {
    const now = new Date().toISOString();
    const newNotebook: Notebook = {
      ...notebook,
      createdAt: now,
      updatedAt: now,
      _synced: false,
    };
    await db.notebooks.add(newNotebook);
    await addToSyncQueue('notebooks', newNotebook.id, 'create', newNotebook as unknown as Record<string, unknown>);
    syncEngine.processQueue();
    set({ notebooks: [...get().notebooks, newNotebook] });
    return newNotebook;
  },

  updateNotebook: async (id, updates) => {
    const now = new Date().toISOString();
    const updatedData = { ...updates, updatedAt: now, _synced: false };
    await db.notebooks.update(id, updatedData);
    await addToSyncQueue('notebooks', id, 'update', updatedData as unknown as Record<string, unknown>);
    syncEngine.processQueue();
    set({
      notebooks: get().notebooks.map((nb) => (nb.id === id ? { ...nb, ...updatedData } : nb)),
    });
  },

  deleteNotebook: async (id) => {
    await db.notebooks.delete(id);
    await addToSyncQueue('notebooks', id, 'delete', {});
    syncEngine.processQueue();
    set({ notebooks: get().notebooks.filter((nb) => nb.id !== id) });
  },

  setActiveNotebook: (id) => set({ activeNotebookId: id }),

  // Notes
  loadNotes: async (userId, notebookId) => {
    set({ isLoading: true });
    let notes: Note[];
    if (notebookId) {
      notes = await db.notes
        .where('userId')
        .equals(userId)
        .and((n) => n.notebookId === notebookId && !n.deletedAt && !n.isArchived)
        .toArray();
    } else {
      notes = await db.notes
        .where('userId')
        .equals(userId)
        .and((n) => !n.deletedAt && !n.isArchived)
        .toArray();
    }
    // Sort: pinned first, then by updatedAt desc
    notes.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    set({ notes, isLoading: false });
  },

  createNote: async (note) => {
    const now = new Date().toISOString();
    const newNote: Note = {
      ...note,
      createdAt: now,
      updatedAt: now,
      _synced: false,
      _localOnly: false,
    };
    await db.notes.add(newNote);
    await addToSyncQueue('notes', newNote.id, 'create', newNote as unknown as Record<string, unknown>);
    syncEngine.processQueue();
    set({ notes: [newNote, ...get().notes] });
    return newNote;
  },

  updateNote: async (id, updates) => {
    const now = new Date().toISOString();
    const updatedData = { ...updates, updatedAt: now, _synced: false };
    await db.notes.update(id, updatedData);
    await addToSyncQueue('notes', id, 'update', updatedData as unknown as Record<string, unknown>);
    syncEngine.processQueue();
    set({
      notes: get().notes.map((n) => (n.id === id ? { ...n, ...updatedData } : n)),
    });
  },

  deleteNote: async (id) => {
    const now = new Date().toISOString();
    await db.notes.update(id, { deletedAt: now });
    await addToSyncQueue('notes', id, 'delete', {});
    syncEngine.processQueue();
    set({ notes: get().notes.filter((n) => n.id !== id) });
  },

  togglePin: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    await get().updateNote(id, { isPinned: !note.isPinned });
  },

  archiveNote: async (id) => {
    await get().updateNote(id, { isArchived: true });
    set({ notes: get().notes.filter((n) => n.id !== id) });
  },

  setActiveNote: (id) => set({ activeNoteId: id }),

  // Tags
  loadTags: async (userId) => {
    const tags = await db.tags.where('userId').equals(userId).toArray();
    set({ tags });
  },

  createTag: async (tag) => {
    const newTag: Tag = { ...tag, id: crypto.randomUUID() };
    await db.tags.add(newTag);
    set({ tags: [...get().tags, newTag] });
    return newTag;
  },
}));
