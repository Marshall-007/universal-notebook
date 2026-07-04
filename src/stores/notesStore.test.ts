import { describe, it, expect, beforeEach } from 'vitest';
import { db, clearAllData } from '@/lib/db';
import { useNotesStore, type NotesView } from './notesStore';
import { makeNote } from '@/test/factories';

const initial = {
  notes: [] as ReturnType<typeof makeNote>[],
  notebooks: [],
  tags: [],
  activeNotebookId: null,
  activeNoteId: null,
  currentView: 'active' as NotesView,
  isLoading: false,
};

const store = () => useNotesStore.getState();

beforeEach(async () => {
  await clearAllData();
  useNotesStore.setState({ ...initial });
});

describe('notesStore CRUD', () => {
  it('createNote persists to db (unsynced) and adds to the list', async () => {
    await store().createNote(makeNote({ id: 'a', title: 'Alpha' }));
    expect(store().notes.map((n) => n.id)).toContain('a');
    const row = await db.notes.get('a');
    expect(row?.title).toBe('Alpha');
    expect(row?._synced).toBe(false);
  });

  it('updateNote updates store and db', async () => {
    await store().createNote(makeNote({ id: 'a', title: 'Alpha' }));
    await store().updateNote('a', { title: 'Beta' });
    expect(store().notes.find((n) => n.id === 'a')?.title).toBe('Beta');
    expect((await db.notes.get('a'))?.title).toBe('Beta');
  });

  it('deleteNote soft-deletes: removed from the list, deletedAt set in db', async () => {
    await store().createNote(makeNote({ id: 'a' }));
    await store().deleteNote('a');
    expect(store().notes.find((n) => n.id === 'a')).toBeUndefined();
    expect((await db.notes.get('a'))?.deletedAt).toBeTruthy();
  });

  it('restoreNote clears deletedAt', async () => {
    await store().createNote(makeNote({ id: 'a' }));
    await store().deleteNote('a');
    await store().restoreNote('a');
    expect((await db.notes.get('a'))?.deletedAt).toBeNull();
  });

  it('archive then unarchive toggles isArchived', async () => {
    await store().createNote(makeNote({ id: 'a' }));
    await store().archiveNote('a');
    expect((await db.notes.get('a'))?.isArchived).toBe(true);
    await store().unarchiveNote('a');
    expect((await db.notes.get('a'))?.isArchived).toBe(false);
  });

  it('togglePin flips the pin flag', async () => {
    await store().createNote(makeNote({ id: 'a', isPinned: false }));
    await store().togglePin('a');
    expect((await db.notes.get('a'))?.isPinned).toBe(true);
  });
});

describe('notesStore views', () => {
  beforeEach(async () => {
    await db.notes.bulkAdd([
      makeNote({ id: 'active' }),
      makeNote({ id: 'pinned', isPinned: true }),
      makeNote({ id: 'archived', isArchived: true }),
      makeNote({ id: 'trashed', deletedAt: new Date().toISOString() }),
    ]);
  });

  it('active view excludes archived and trashed', async () => {
    await store().loadNotes('user-1', null, 'active');
    expect(store().notes.map((n) => n.id).sort()).toEqual(['active', 'pinned']);
  });

  it('pinned view shows only pinned', async () => {
    await store().loadNotes('user-1', null, 'pinned');
    expect(store().notes.map((n) => n.id)).toEqual(['pinned']);
  });

  it('archived view shows only archived', async () => {
    await store().loadNotes('user-1', null, 'archived');
    expect(store().notes.map((n) => n.id)).toEqual(['archived']);
  });

  it('trash view shows only deleted', async () => {
    await store().loadNotes('user-1', null, 'trash');
    expect(store().notes.map((n) => n.id)).toEqual(['trashed']);
  });

  it('sorts pinned notes ahead of unpinned', async () => {
    await store().loadNotes('user-1', null, 'active');
    expect(store().notes[0].id).toBe('pinned');
  });
});

describe('notesStore remote reconciliation', () => {
  it('applyRemoteNote adds a note that matches the active view', () => {
    store().applyRemoteNote(makeNote({ id: 'r' }));
    expect(store().notes.map((n) => n.id)).toContain('r');
  });

  it('applyRemoteNote removes a note deleted elsewhere', () => {
    useNotesStore.setState({ ...initial, notes: [makeNote({ id: 'r' })] });
    store().applyRemoteNote(makeNote({ id: 'r', deletedAt: new Date().toISOString() }));
    expect(store().notes.find((n) => n.id === 'r')).toBeUndefined();
  });

  it('removeLocalNote drops the note from the list', () => {
    useNotesStore.setState({ ...initial, notes: [makeNote({ id: 'r' })] });
    store().removeLocalNote('r');
    expect(store().notes).toHaveLength(0);
  });
});
