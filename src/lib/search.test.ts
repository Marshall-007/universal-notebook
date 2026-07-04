import { describe, it, expect, beforeEach } from 'vitest';
import { db, clearAllData } from './db';
import { getRecentNotes, searchNotes } from './search';
import { makeNote } from '@/test/factories';

beforeEach(async () => {
  await clearAllData();
});

describe('getRecentNotes', () => {
  it('returns the most recently updated notes first (regression: was oldest-first)', async () => {
    const base = Date.now();
    await db.notes.bulkAdd([
      makeNote({ id: 'old', updatedAt: new Date(base - 3000).toISOString() }),
      makeNote({ id: 'newest', updatedAt: new Date(base).toISOString() }),
      makeNote({ id: 'mid', updatedAt: new Date(base - 1000).toISOString() }),
    ]);
    const recent = await getRecentNotes('user-1', 10);
    expect(recent.map((n) => n.id)).toEqual(['newest', 'mid', 'old']);
  });

  it('respects the limit', async () => {
    await db.notes.bulkAdd(
      Array.from({ length: 5 }, (_, i) =>
        makeNote({ id: `n${i}`, updatedAt: new Date(Date.now() - i * 1000).toISOString() })
      )
    );
    expect(await getRecentNotes('user-1', 3)).toHaveLength(3);
  });

  it('excludes deleted and archived notes', async () => {
    await db.notes.bulkAdd([
      makeNote({ id: 'live' }),
      makeNote({ id: 'gone', deletedAt: new Date().toISOString() }),
      makeNote({ id: 'filed', isArchived: true }),
    ]);
    const recent = await getRecentNotes('user-1', 10);
    expect(recent.map((n) => n.id)).toEqual(['live']);
  });
});

describe('searchNotes', () => {
  beforeEach(async () => {
    await db.notes.bulkAdd([
      makeNote({ id: 'm', title: 'Meeting', contentText: 'quarterly planning agenda' }),
      makeNote({ id: 'j', title: 'Journal', contentText: 'grateful for coffee' }),
    ]);
  });

  it('returns no results for an empty query', async () => {
    expect(await searchNotes('   ', 'user-1')).toEqual([]);
  });

  it('finds a note by title keyword', async () => {
    const results = await searchNotes('meeting', 'user-1');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].note.id).toBe('m');
    expect(results[0].score).toBeGreaterThan(0);
  });
});
