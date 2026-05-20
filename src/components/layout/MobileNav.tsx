import { Home, Search, Plus, BookOpen, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onNewNote: () => void;
}

export function MobileNav({ currentPage, onNavigate, onNewNote }: MobileNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-white/90 dark:bg-surface-900/90 backdrop-blur-md border-t border-surface-200 dark:border-surface-800">
      <div className="flex items-center justify-around py-2 px-4">
        <NavButton
          icon={Home}
          label="Home"
          active={currentPage === 'notes'}
          onClick={() => onNavigate('notes')}
        />
        <NavButton
          icon={Search}
          label="Search"
          active={currentPage === 'search'}
          onClick={() => onNavigate('search')}
        />
        <button
          onClick={onNewNote}
          className="w-12 h-12 -mt-4 rounded-full bg-primary-500 text-white shadow-lg flex items-center justify-center hover:bg-primary-600 active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>
        <NavButton
          icon={BookOpen}
          label="Notebooks"
          active={currentPage === 'notebooks'}
          onClick={() => onNavigate('notebooks')}
        />
        <NavButton
          icon={User}
          label="Profile"
          active={currentPage === 'settings'}
          onClick={() => onNavigate('settings')}
        />
      </div>
    </nav>
  );
}

function NavButton({ icon: Icon, label, active, onClick }: {
  icon: React.ComponentType<{ size?: number | string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors',
        active ? 'text-primary-500' : 'text-surface-400'
      )}
    >
      <Icon size={20} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
