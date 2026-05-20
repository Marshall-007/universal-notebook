import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SyncStatus, ThemeMode, AppSettings } from '@/types';

interface AppState {
  syncStatus: SyncStatus;
  settings: AppSettings;
  isSidebarOpen: boolean;
  isCommandPaletteOpen: boolean;

  setSyncStatus: (status: SyncStatus) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  applyTheme: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      syncStatus: 'synced',
      settings: {
        theme: 'system' as ThemeMode,
        fontSize: 16,
        focusMode: false,
        defaultNotebook: null,
      },
      isSidebarOpen: true,
      isCommandPaletteOpen: false,

      setSyncStatus: (syncStatus) => set({ syncStatus }),

      updateSettings: (updates) => {
        set({ settings: { ...get().settings, ...updates } });
        get().applyTheme();
      },

      toggleSidebar: () => set({ isSidebarOpen: !get().isSidebarOpen }),
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),

      toggleCommandPalette: () => set({ isCommandPaletteOpen: !get().isCommandPaletteOpen }),
      setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),

      applyTheme: () => {
        const { theme } = get().settings;
        const root = document.documentElement;

        if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      },
    }),
    {
      name: 'app-settings',
      partialize: (state) => ({ settings: state.settings, isSidebarOpen: state.isSidebarOpen }),
    }
  )
);
