import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/stores/appStore';

export function useKeyboard() {
  const { toggleCommandPalette, toggleSidebar } = useAppStore();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isMod = e.metaKey || e.ctrlKey;

    // Cmd/Ctrl + K — Command palette (works even while editing)
    if (isMod && e.key === 'k') {
      e.preventDefault();
      toggleCommandPalette();
      return;
    }

    // Don't hijack formatting shortcuts (e.g. Cmd/Ctrl+B bold) while the user
    // is typing in an input, textarea, or the rich-text editor.
    const target = e.target as HTMLElement | null;
    if (target && (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return;
    }

    // Cmd/Ctrl + B — Toggle sidebar
    if (isMod && e.key === 'b') {
      e.preventDefault();
      toggleSidebar();
    }

    // Cmd/Ctrl + N — New note (handled by parent)
    // Cmd/Ctrl + Shift + F — Focus mode (handled by parent)
    // Escape — Close modals
  }, [toggleCommandPalette, toggleSidebar]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
