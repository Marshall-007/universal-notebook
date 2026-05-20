import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useSearch } from '@/hooks/useSearch';
import { useAuthStore } from '@/stores/authStore';
import { useNotesStore } from '@/stores/notesStore';
import { formatNoteDate } from '@/lib/utils';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNote: (noteId: string) => void;
}

export function CommandPalette({ isOpen, onClose, onSelectNote }: CommandPaletteProps) {
  const { user } = useAuthStore();
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, search, isSearching, clearResults } = useSearch(user?.id || '');

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setInputValue('');
      clearResults();
    }
  }, [isOpen, clearResults]);

  useEffect(() => {
    const timer = setTimeout(() => {
      search(inputValue);
    }, 200);
    return () => clearTimeout(timer);
  }, [inputValue, search]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white dark:bg-surface-900 rounded-xl shadow-2xl overflow-hidden animate-slide-up border border-surface-200 dark:border-surface-700">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-200 dark:border-surface-800">
          <Search size={18} className="text-surface-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search notes by keyword, title, or content..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-surface-400"
          />
          {inputValue && (
            <button onClick={() => { setInputValue(''); clearResults(); }} className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-800">
              <X size={14} className="text-surface-400" />
            </button>
          )}
          <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 bg-surface-100 dark:bg-surface-800 rounded border border-surface-200 dark:border-surface-700 text-surface-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {isSearching && (
            <div className="px-4 py-6 text-center text-sm text-surface-400">Searching...</div>
          )}
          {!isSearching && inputValue && results.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-surface-400">No results found</div>
          )}
          {!isSearching && results.length > 0 && (
            <div className="py-2">
              {results.map(({ note, matchedText, score }) => (
                <button
                  key={note.id}
                  onClick={() => { onSelectNote(note.id); onClose(); }}
                  className="w-full px-4 py-3 text-left hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{note.title || 'Untitled'}</span>
                    <span className="text-[10px] text-surface-400 flex-shrink-0 ml-2">{formatNoteDate(note.updatedAt)}</span>
                  </div>
                  {matchedText && (
                    <p className="text-xs text-surface-500 dark:text-surface-400 line-clamp-2">{matchedText}</p>
                  )}
                </button>
              ))}
            </div>
          )}
          {!inputValue && (
            <div className="px-4 py-6 text-center text-sm text-surface-400">
              <p>Type to search across all your notes</p>
              <p className="text-[10px] mt-1 text-surface-300">Search by title, content, tags, or timestamps</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
