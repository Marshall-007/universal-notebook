import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useNotesStore } from '@/stores/notesStore';
import { useAppStore } from '@/stores/appStore';
import { useKeyboard } from '@/hooks/useKeyboard';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { SyncIndicator } from '@/components/layout/SyncIndicator';
import { NoteCard } from '@/components/notes/NoteCard';
import { TemplateGallery } from '@/components/notes/TemplateGallery';
import { CommandPalette } from '@/components/search/CommandPalette';
import { TipTapEditor } from '@/components/editor/TipTapEditor';
import { MindMap } from '@/components/editor/MindMap';
import { getTemplate } from '@/templates';
import { groupNotesByDate, getDateGroupLabel } from '@/lib/utils';
import { db } from '@/lib/db';
import type { TemplateType, Note } from '@/types';
import { Plus, Search, ArrowLeft } from 'lucide-react';

type Page = 'notes' | 'editor' | 'search' | 'notebooks' | 'settings' | 'pinned' | 'archive' | 'trash';

export function Dashboard() {
  const { user } = useAuthStore();
  const { notes, notebooks, loadNotes, loadNotebooks, createNote, updateNote, deleteNote, togglePin, archiveNote, activeNoteId, setActiveNote } = useNotesStore();
  const { isCommandPaletteOpen, setCommandPaletteOpen, settings } = useAppStore();
  const [currentPage, setCurrentPage] = useState<Page>('notes');
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showNewNotebookModal, setShowNewNotebookModal] = useState(false);

  useKeyboard();

  // Load data on mount
  useEffect(() => {
    if (user) {
      loadNotebooks(user.id);
      loadNotes(user.id);
    }
  }, [user, loadNotebooks, loadNotes]);

  const handleNewNote = useCallback(() => {
    setShowTemplateGallery(true);
  }, []);

  const handleTemplateSelect = useCallback(async (templateType: TemplateType) => {
    if (!user) return;
    const template = getTemplate(templateType);
    if (!template) return;

    const newNote = await createNote({
      id: crypto.randomUUID(),
      userId: user.id,
      notebookId: useNotesStore.getState().activeNotebookId,
      title: template.defaultTitle,
      contentJson: template.contentJson,
      contentText: '',
      templateType,
      isPinned: false,
      isArchived: false,
      deletedAt: null,
    });

    setEditingNote(newNote);
    setActiveNote(newNote.id);
    setCurrentPage('editor');
  }, [user, createNote, setActiveNote]);

  const handleNoteClick = useCallback(async (noteId: string) => {
    const note = await db.notes.get(noteId);
    if (note) {
      setEditingNote(note);
      setActiveNote(noteId);
      setCurrentPage('editor');
    }
  }, [setActiveNote]);

  const handleEditorUpdate = useCallback(async (json: Record<string, unknown>, text: string) => {
    if (editingNote) {
      await updateNote(editingNote.id, { contentJson: json, contentText: text });
      setEditingNote((prev) => prev ? { ...prev, contentJson: json, contentText: text } : null);
    }
  }, [editingNote, updateNote]);

  const handleTitleChange = useCallback(async (title: string) => {
    if (editingNote) {
      await updateNote(editingNote.id, { title });
      setEditingNote((prev) => prev ? { ...prev, title } : null);
    }
  }, [editingNote, updateNote]);

  const handleBackToNotes = useCallback(() => {
    setCurrentPage('notes');
    setEditingNote(null);
    setActiveNote(null);
  }, [setActiveNote]);

  const handleNavigate = useCallback((page: string) => {
    setCurrentPage(page as Page);
    if (page === 'notes' || page === 'pinned' || page === 'archive' || page === 'trash') {
      setEditingNote(null);
      setActiveNote(null);
    }
  }, [setActiveNote]);

  const dateGroups = groupNotesByDate(notes);

  return (
    <div className={`h-screen flex overflow-hidden ${settings.focusMode ? 'focus-mode' : ''}`}>
      {/* Sidebar — desktop */}
      <Sidebar
        onNewNotebook={() => setShowNewNotebookModal(true)}
        onNavigate={handleNavigate}
        currentPage={currentPage}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-800 bg-white/80 dark:bg-surface-900/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            {currentPage === 'editor' && (
              <button onClick={handleBackToNotes} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800">
                <ArrowLeft size={18} className="text-surface-500" />
              </button>
            )}
            <h1 className="text-lg font-semibold">
              {currentPage === 'editor' ? (
                <input
                  type="text"
                  value={editingNote?.title || ''}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Untitled"
                  className="bg-transparent outline-none w-full"
                />
              ) : currentPage === 'notes' ? 'All Notes' : currentPage === 'pinned' ? 'Pinned' : currentPage === 'archive' ? 'Archive' : currentPage === 'trash' ? 'Trash' : ''}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <SyncIndicator />
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-surface-400 bg-surface-100 dark:bg-surface-800 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
            >
              <Search size={12} />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline text-[10px] ml-1 px-1 bg-surface-200 dark:bg-surface-700 rounded">⌘K</kbd>
            </button>
            {currentPage !== 'editor' && (
              <button
                onClick={handleNewNote}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors shadow-sm"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">New</span>
              </button>
            )}
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          {currentPage === 'editor' && editingNote ? (
            editingNote.templateType === 'mind-map' ? (
              <MindMap
                initialNodes={(editingNote.contentJson as any)?.nodes}
                initialEdges={(editingNote.contentJson as any)?.edges}
                onUpdate={(nodes, edges) => handleEditorUpdate({ type: 'mindmap', nodes, edges }, '')}
              />
            ) : (
              <TipTapEditor
                content={editingNote.contentJson}
                onUpdate={handleEditorUpdate}
                placeholder="Start writing your thoughts..."
              />
            )
          ) : (
            <div className="h-full overflow-y-auto pb-20 sm:pb-4">
              {notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="w-16 h-16 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
                    <span className="text-3xl">📝</span>
                  </div>
                  <h2 className="text-lg font-medium mb-1">No notes yet</h2>
                  <p className="text-sm text-surface-400 mb-4">Create your first note to get started</p>
                  <button
                    onClick={handleNewNote}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    <Plus size={16} />
                    New Note
                  </button>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {Array.from(dateGroups.entries()).map(([group, groupNotes]) => (
                    <div key={group}>
                      <h3 className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2 px-1">
                        {getDateGroupLabel(group)}
                      </h3>
                      <div className="space-y-1">
                        {groupNotes.map((note) => (
                          <NoteCard
                            key={note.id}
                            note={note}
                            isActive={activeNoteId === note.id}
                            onClick={() => handleNoteClick(note.id)}
                            onPin={() => togglePin(note.id)}
                            onArchive={() => archiveNote(note.id)}
                            onDelete={() => deleteNote(note.id)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Mobile nav */}
      <MobileNav currentPage={currentPage} onNavigate={handleNavigate} onNewNote={handleNewNote} />

      {/* Modals */}
      <TemplateGallery
        isOpen={showTemplateGallery}
        onClose={() => setShowTemplateGallery(false)}
        onSelect={handleTemplateSelect}
      />
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectNote={handleNoteClick}
      />

      {/* New notebook modal */}
      {showNewNotebookModal && <NewNotebookModal onClose={() => setShowNewNotebookModal(false)} />}
    </div>
  );
}

function NewNotebookModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuthStore();
  const { createNotebook, notebooks } = useNotesStore();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#5c7cfa');
  const [icon, setIcon] = useState('📓');

  const colors = ['#5c7cfa', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1'];
  const icons = ['📓', '📗', '📕', '📙', '💼', '🎯', '💡', '🎨', '🔬', '📚', '✨', '🚀'];

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    await createNotebook({
      id: crypto.randomUUID(),
      userId: user.id,
      name: name.trim(),
      color,
      icon,
      sortOrder: notebooks.length,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-surface-900 rounded-xl shadow-2xl p-6 animate-slide-up">
        <h2 className="text-lg font-semibold mb-4">New Notebook</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Notebook"
              autoFocus
              className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1.5">Icon</label>
            <div className="flex flex-wrap gap-2">
              {icons.map((i) => (
                <button
                  key={i}
                  onClick={() => setIcon(i)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${icon === i ? 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-400' : 'hover:bg-surface-100 dark:hover:bg-surface-800'}`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1.5">Color</label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-primary-400' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg">Cancel</button>
          <button onClick={handleCreate} disabled={!name.trim()} className="px-4 py-2 text-sm text-white bg-primary-500 hover:bg-primary-600 rounded-lg disabled:opacity-50">Create</button>
        </div>
      </div>
    </div>
  );
}
