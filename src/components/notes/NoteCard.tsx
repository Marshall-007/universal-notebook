import { Pin, Archive, Trash2, MoreVertical, RotateCcw, ArchiveRestore } from 'lucide-react';
import { formatNoteDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Note } from '@/types';
import type { NotesView } from '@/stores/notesStore';
import { useState, useRef, useEffect } from 'react';

interface NoteCardProps {
  note: Note;
  isActive: boolean;
  view?: NotesView;
  onClick: () => void;
  onPin: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onRestore?: () => void;
  onUnarchive?: () => void;
  onPermanentDelete?: () => void;
}

export function NoteCard({
  note,
  isActive,
  view = 'active',
  onClick,
  onPin,
  onArchive,
  onDelete,
  onRestore,
  onUnarchive,
  onPermanentDelete,
}: NoteCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const preview = note.contentText?.slice(0, 120) || 'Empty note';

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative p-3 rounded-lg border cursor-pointer transition-all animate-fade-in',
        isActive
          ? 'border-primary-300 bg-primary-50/50 dark:border-primary-700 dark:bg-primary-900/10 shadow-sm'
          : 'border-transparent hover:border-surface-200 dark:hover:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800/50'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            {note.isPinned && <Pin size={12} className="text-primary-500 flex-shrink-0" />}
            <h3 className="text-sm font-medium truncate">
              {note.title || 'Untitled'}
            </h3>
          </div>
          <p className="text-xs text-surface-500 dark:text-surface-400 line-clamp-2 mb-1.5">
            {preview}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-surface-400">{formatNoteDate(note.updatedAt)}</span>
            {note.templateType && (
              <span className="text-[10px] px-1.5 py-0.5 bg-surface-100 dark:bg-surface-800 rounded text-surface-500">
                {note.templateType}
              </span>
            )}
          </div>
        </div>

        {/* Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-surface-200 dark:hover:bg-surface-700 transition-opacity"
          >
            <MoreVertical size={14} className="text-surface-400" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-6 w-40 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-lg py-1 z-10 animate-fade-in">
              {view === 'trash' ? (
                <>
                  <MenuButton icon={RotateCcw} label="Restore" onClick={(e) => { e.stopPropagation(); onRestore?.(); setShowMenu(false); }} />
                  <MenuButton icon={Trash2} label="Delete forever" onClick={(e) => { e.stopPropagation(); onPermanentDelete?.(); setShowMenu(false); }} danger />
                </>
              ) : view === 'archived' ? (
                <>
                  <MenuButton icon={ArchiveRestore} label="Unarchive" onClick={(e) => { e.stopPropagation(); onUnarchive?.(); setShowMenu(false); }} />
                  <MenuButton icon={Trash2} label="Delete" onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false); }} danger />
                </>
              ) : (
                <>
                  <MenuButton icon={Pin} label={note.isPinned ? 'Unpin' : 'Pin'} onClick={(e) => { e.stopPropagation(); onPin(); setShowMenu(false); }} />
                  <MenuButton icon={Archive} label="Archive" onClick={(e) => { e.stopPropagation(); onArchive(); setShowMenu(false); }} />
                  <MenuButton icon={Trash2} label="Delete" onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false); }} danger />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuButton({ icon: Icon, label, onClick, danger }: {
  icon: React.ComponentType<{ size?: number | string }>;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-surface-100 dark:hover:bg-surface-700',
        danger ? 'text-accent-rose' : 'text-surface-600 dark:text-surface-300'
      )}
    >
      <Icon size={12} />
      {label}
    </button>
  );
}
