import type { Note } from '@/types';

let seq = 0;

// Deterministic note factory for tests. Override any field as needed.
export function makeNote(overrides: Partial<Note> = {}): Note {
  seq += 1;
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? `note-${seq}`,
    userId: overrides.userId ?? 'user-1',
    notebookId: overrides.notebookId ?? null,
    title: overrides.title ?? `Test note ${seq}`,
    contentJson: overrides.contentJson ?? {},
    contentText: overrides.contentText ?? '',
    templateType: overrides.templateType ?? null,
    isPinned: overrides.isPinned ?? false,
    isArchived: overrides.isArchived ?? false,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    deletedAt: overrides.deletedAt ?? null,
    _synced: overrides._synced ?? true,
  };
}
