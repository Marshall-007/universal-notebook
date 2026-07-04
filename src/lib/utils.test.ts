import { describe, it, expect } from 'vitest';
import { getDateGroup, groupNotesByDate, cn } from './utils';
import { makeNote } from '@/test/factories';

const DAY = 24 * 60 * 60 * 1000;

describe('getDateGroup', () => {
  it('classifies now as today', () => {
    expect(getDateGroup(new Date().toISOString())).toBe('today');
  });

  it('classifies ~1 day ago as yesterday', () => {
    expect(getDateGroup(new Date(Date.now() - DAY).toISOString())).toBe('yesterday');
  });

  it('classifies ~400 days ago as earlier', () => {
    expect(getDateGroup(new Date(Date.now() - 400 * DAY).toISOString())).toBe('earlier');
  });
});

describe('groupNotesByDate', () => {
  it('groups notes and drops empty groups, keeping chronological order', () => {
    const notes = [
      makeNote({ updatedAt: new Date().toISOString() }),
      makeNote({ updatedAt: new Date(Date.now() - 400 * DAY).toISOString() }),
    ];
    const groups = groupNotesByDate(notes);
    const keys = [...groups.keys()];
    expect(keys).toEqual(['today', 'earlier']);
    expect(groups.get('today')).toHaveLength(1);
    expect(groups.get('earlier')).toHaveLength(1);
    expect(groups.has('yesterday')).toBe(false);
  });
});

describe('cn', () => {
  it('joins truthy class names and drops falsy ones', () => {
    expect(cn('a', false, 'b', null, undefined, 'c')).toBe('a b c');
  });
});
