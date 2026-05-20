import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useNotesStore } from '@/stores/notesStore';
import { useAppStore } from '@/stores/appStore';
import {
  BookOpen, Plus, ChevronRight, Settings, LogOut, Moon, Sun,
  PanelLeftClose, PanelLeftOpen, Archive, Trash2, Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  onNewNotebook: () => void;
  onNavigate: (page: string) => void;
  currentPage: string;
}

export function Sidebar({ onNewNotebook, onNavigate, currentPage }: SidebarProps) {
  const { user, signOut } = useAuthStore();
  const { notebooks, activeNotebookId, setActiveNotebook, loadNotes } = useNotesStore();
  const { isSidebarOpen, toggleSidebar, settings, updateSettings } = useAppStore();

  const handleNotebookClick = async (notebookId: string | null) => {
    setActiveNotebook(notebookId);
    if (user) await loadNotes(user.id, notebookId);
    onNavigate('notes');
  };

  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <>
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 sm:hidden" onClick={toggleSidebar} />
      )}

      <aside
        className={cn(
          'fixed sm:relative z-50 sm:z-auto h-full flex flex-col bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 transition-all duration-300',
          isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full sm:w-0 sm:-translate-x-0'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-800">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-primary-500" />
            <span className="font-semibold text-sm">Universal Notebook</span>
          </div>
          <button onClick={toggleSidebar} className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-800">
            <PanelLeftClose size={16} className="text-surface-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          {/* Quick links */}
          <div className="space-y-0.5 mb-4">
            <SidebarItem
              icon={<BookOpen size={16} />}
              label="All Notes"
              active={currentPage === 'notes' && !activeNotebookId}
              onClick={() => handleNotebookClick(null)}
            />
            <SidebarItem
              icon={<Star size={16} />}
              label="Pinned"
              active={currentPage === 'pinned'}
              onClick={() => onNavigate('pinned')}
            />
            <SidebarItem
              icon={<Archive size={16} />}
              label="Archive"
              active={currentPage === 'archive'}
              onClick={() => onNavigate('archive')}
            />
            <SidebarItem
              icon={<Trash2 size={16} />}
              label="Trash"
              active={currentPage === 'trash'}
              onClick={() => onNavigate('trash')}
            />
          </div>

          {/* Notebooks */}
          <div className="mb-2">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-medium text-surface-400 uppercase tracking-wider">Notebooks</span>
              <button
                onClick={onNewNotebook}
                className="p-0.5 rounded hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-400 hover:text-surface-600"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-0.5">
              {notebooks.map((nb) => (
                <SidebarItem
                  key={nb.id}
                  icon={<span className="text-sm">{nb.icon}</span>}
                  label={nb.name}
                  active={activeNotebookId === nb.id}
                  onClick={() => handleNotebookClick(nb.id)}
                  color={nb.color}
                />
              ))}
              {notebooks.length === 0 && (
                <p className="text-xs text-surface-400 px-2 py-2">No notebooks yet</p>
              )}
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-surface-200 dark:border-surface-800 space-y-1">
          <button
            onClick={() => updateSettings({ theme: isDark ? 'light' : 'dark' })}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button
            onClick={() => onNavigate('settings')}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
          >
            <Settings size={14} />
            Settings
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm text-accent-rose hover:bg-rose-50 dark:hover:bg-rose-900/20"
          >
            <LogOut size={14} />
            Sign Out
          </button>
          {user && (
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
                  {user.displayName?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-surface-500 truncate">{user.email}</span>
            </div>
          )}
        </div>
      </aside>

      {/* Collapsed toggle */}
      {!isSidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-30 p-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-sm hover:bg-surface-50 dark:hover:bg-surface-700 sm:relative sm:top-auto sm:left-auto sm:m-2"
        >
          <PanelLeftOpen size={16} className="text-surface-500" />
        </button>
      )}
    </>
  );
}

function SidebarItem({ icon, label, active, onClick, color }: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors',
        active
          ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300 font-medium'
          : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
      )}
    >
      {color && (
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      )}
      {!color && icon}
      <span className="truncate">{label}</span>
    </button>
  );
}
