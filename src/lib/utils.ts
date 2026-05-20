import { isToday, isYesterday, isThisWeek, isThisMonth, format, formatDistanceToNow } from 'date-fns';
import type { DateGroup, Note } from '@/types';

export function getDateGroup(dateStr: string): DateGroup {
  const date = new Date(dateStr);
  if (isToday(date)) return 'today';
  if (isYesterday(date)) return 'yesterday';
  if (isThisWeek(date)) return 'this-week';
  if (isThisMonth(date)) return 'this-month';
  return 'earlier';
}

export function getDateGroupLabel(group: DateGroup): string {
  switch (group) {
    case 'today': return 'Today';
    case 'yesterday': return 'Yesterday';
    case 'this-week': return 'This Week';
    case 'this-month': return 'This Month';
    case 'earlier': return 'Earlier';
  }
}

export function groupNotesByDate(notes: Note[]): Map<DateGroup, Note[]> {
  const groups = new Map<DateGroup, Note[]>();
  const order: DateGroup[] = ['today', 'yesterday', 'this-week', 'this-month', 'earlier'];

  for (const g of order) groups.set(g, []);

  for (const note of notes) {
    const group = getDateGroup(note.updatedAt);
    groups.get(group)!.push(note);
  }

  // Remove empty groups
  for (const [key, value] of groups) {
    if (value.length === 0) groups.delete(key);
  }

  return groups;
}

export function formatNoteDate(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

export function formatFullDate(dateStr: string): string {
  return format(new Date(dateStr), 'MMM d, yyyy h:mm a');
}

export function formatTimestamp(): string {
  return format(new Date(), 'h:mm a');
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
