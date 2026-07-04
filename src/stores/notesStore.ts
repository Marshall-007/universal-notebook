import { create } from 'zustand';
import { db, addToSyncQueue } from '@/lib/db';
import { syncEngine } from '@/lib/sync';
import type { Note, Notebook, Tag } from '@/types';

export type NotesView = 'active' | 'pinned' | 'archived' | 'trash';

function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

interface NotesState {
  notes: Note[];
  notebooks: Notebook[];
  tags: Tag[];
  activeNotebookId: string | null;
  activeNoteId: string | null;
  currentView: NotesView;
  isLoading: boolean;

  // Notebooks
  loadNotebooks: (userId: string) => Promise<void>;
  createNotebook: (notebook: Omit<Notebook, 'createdAt' | 'updatedAt' | '_synced'>) => Promise<Notebook>;
  updateNotebook: (id: string, updates: Partial<Notebook>) => Promise<void>;
  deleteNotebook: (id: string) => Promise<void>;
  setActiveNotebook: (id: string | null) => void;

  // Notes
  loadNotes: (userId: string, notebookId?: string | null, view?: NotesView) => Promise<void>;
  createNote: (note: Omit<Note, 'createdAt' | 'updatedAt' | '_synced' | '_localOnly'>) => Promise<Note>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  restoreNote: (id: string) => Promise<void>;
  permanentlyDeleteNote: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  archiveNote: (id: string) => Promise<void>;
  unarchiveNote: (id: string) => Promise<void>;
  setActiveNote: (id: string | null) => void;

  // Remote reconciliation (driven by the sync engine)
  applyRemoteNote: (note: Note) => void;
  removeLocalNote: (id: string) => void;
  applyRemoteNotebook: (notebook: Notebook) => void;
  removeLocalNotebook: (id: string) => void;

  // Tags
  loadTags: (userId: string) => Promise<void>;
  createTag: (tag: Omit<Tag, 'id'>) => Promise<Tag>;
}

// Whether a note belongs in the currently displayed view.
function matchesView(note: Note, view: NotesView): boolean {
  switch (view) {
    case 'trash':
      return !!note.deletedAt;
    case 'archived':
      return !note.deletedAt && note.isArchived;
    case 'pinned':
      return !note.deletedAt && !note.isArchived && note.isPinned;
    case 'active':
    default:
      return !note.deletedAt && !note.isArchived;
  }
}

export const useNotesStore = create<NotesState>()((set, get) => ({
  notes: [],
  notebooks: [],
  tags: [],
  activeNotebookId: null,
  activeNoteId: null,
  currentView: 'active',
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
  loadNotes: async (userId, notebookId, view = 'active') => {
    set({ isLoading: true, currentView: view });
    const notes = await db.notes
      .where('userId')
      .equals(userId)
      .and((n) => {
        if (!matchesView(n, view)) return false;
        // Notebook filter only applies to the default active view.
        if (view === 'active' && notebookId) return n.notebookId === notebookId;
        return true;
      })
      .toArray();
    set({ notes: sortNotes(notes), isLoading: false });
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
    await db.notes.update(id, { deletedAt: now, _synced: false });
    await addToSyncQueue('notes', id, 'delete', {});
    syncEngine.processQueue();
    set({ notes: get().notes.filter((n) => n.id !== id) });
  },

  restoreNote: async (id) => {
    await get().updateNote(id, { deletedAt: null, isArchived: false });
    set({ notes: get().notes.filter((n) => n.id !== id) });
  },

  permanentlyDeleteNote: async (id) => {
    // Already soft-deleted server-side; just drop the local cache copy.
    await db.notes.delete(id);
    set({ notes: get().notes.filter((n) => n.id !== id) });
  },

  togglePin: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    await get().updateNote(id, { isPinned: !note.isPinned });
    // In the pinned view, unpinning should remove the note from the list.
    if (get().currentView === 'pinned' && note.isPinned) {
      set({ notes: get().notes.filter((n) => n.id !== id) });
    }
  },

  archiveNote: async (id) => {
    await get().updateNote(id, { isArchived: true });
    set({ notes: get().notes.filter((n) => n.id !== id) });
  },

  unarchiveNote: async (id) => {
    await get().updateNote(id, { isArchived: false });
    set({ notes: get().notes.filter((n) => n.id !== id) });
  },

  setActiveNote: (id) => set({ activeNoteId: id }),

  // Remote reconciliation — keep the visible list in sync with realtime/pull.
  applyRemoteNote: (note) => {
    const { notes, currentView } = get();
    const without = notes.filter((n) => n.id !== note.id);
    if (matchesView(note, currentView)) {
      set({ notes: sortNotes([...without, note]) });
    } else {
      set({ notes: without });
    }
  },

  removeLocalNote: (id) => {
    set({ notes: get().notes.filter((n) => n.id !== id) });
  },

  applyRemoteNotebook: (notebook) => {
    const without = get().notebooks.filter((nb) => nb.id !== notebook.id);
    set({ notebooks: [...without, notebook].sort((a, b) => a.sortOrder - b.sortOrder) });
  },

  removeLocalNotebook: (id) => {
    set({ notebooks: get().notebooks.filter((nb) => nb.id !== id) });
  },

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
