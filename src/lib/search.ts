import Fuse from 'fuse.js';
import { db } from './db';
import type { Note, SearchResult } from '@/types';

const fuseOptions = {
  keys: [
    { name: 'title', weight: 2 },
    { name: 'contentText', weight: 1 },
  ],
  includeScore: true,
  includeMatches: true,
  threshold: 0.3,
  minMatchCharLength: 2,
};

export async function searchNotes(query: string, userId: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const notes = await db.notes
    .where('userId')
    .equals(userId)
    .and((n) => !n.deletedAt && !n.isArchived)
    .toArray();

  const fuse = new Fuse(notes, fuseOptions);
  const results = fuse.search(query);

  return results.map((result) => {
    const matches = result.matches || [];
    const bestMatch = matches[0];
    let matchedText = '';

    if (bestMatch?.value) {
      const start = Math.max(0, (bestMatch.indices?.[0]?.[0] || 0) - 40);
      const end = Math.min(bestMatch.value.length, (bestMatch.indices?.[0]?.[1] || 0) + 60);
      matchedText = (start > 0 ? '...' : '') + bestMatch.value.slice(start, end) + (end < bestMatch.value.length ? '...' : '');
    }

    return {
      note: result.item,
      matchedText,
      score: 1 - (result.score || 0),
    };
  });
}

export async function searchByDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Note[]> {
  return db.notes
    .where('userId')
    .equals(userId)
    .and((n) => !n.deletedAt && n.createdAt >= startDate && n.createdAt <= endDate)
    .toArray();
}

export async function getRecentNotes(userId: string, limit = 10): Promise<Note[]> {
  return db.notes
    .where('userId')
    .equals(userId)
    .and((n) => !n.deletedAt && !n.isArchived)
    .reverse()
    .sortBy('updatedAt')
    .then((notes) => notes.slice(0, limit));
}
