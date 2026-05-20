import { useAppStore } from '@/stores/appStore';
import { useAuthStore } from '@/stores/authStore';
import { Moon, Sun, Monitor, Type, Maximize } from 'lucide-react';
import type { ThemeMode } from '@/types';

export function SettingsPage() {
  const { settings, updateSettings } = useAppStore();
  const { user } = useAuthStore();

  const themes: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun size={16} /> },
    { value: 'dark', label: 'Dark', icon: <Moon size={16} /> },
    { value: 'system', label: 'System', icon: <Monitor size={16} /> },
  ];

  return (
    <div className="max-w-lg mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-surface-500 mt-1">Customize your notebook experience</p>
      </div>

      {/* Account */}
      <section>
        <h2 className="text-sm font-medium text-surface-400 uppercase tracking-wider mb-3">Account</h2>
        <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                {user?.displayName?.[0]?.toUpperCase() || user?.email[0].toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium">{user?.displayName || 'User'}</p>
              <p className="text-xs text-surface-400">{user?.email}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Theme */}
      <section>
        <h2 className="text-sm font-medium text-surface-400 uppercase tracking-wider mb-3">Appearance</h2>
        <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Theme</label>
            <div className="flex gap-2">
              {themes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => updateSettings({ theme: t.value })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-colors ${
                    settings.theme === t.value
                      ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Type size={14} />
              Font Size: {settings.fontSize}px
            </label>
            <input
              type="range"
              min="12"
              max="24"
              value={settings.fontSize}
              onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
              className="w-full accent-primary-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-2">
              <Maximize size={14} />
              Focus Mode
            </label>
            <button
              onClick={() => updateSettings({ focusMode: !settings.focusMode })}
              className={`w-10 h-6 rounded-full transition-colors ${
                settings.focusMode ? 'bg-primary-500' : 'bg-surface-300 dark:bg-surface-600'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow-sm mx-1 transition-transform ${settings.focusMode ? 'translate-x-4' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* Keyboard Shortcuts */}
      <section>
        <h2 className="text-sm font-medium text-surface-400 uppercase tracking-wider mb-3">Keyboard Shortcuts</h2>
        <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-4">
          <div className="space-y-2 text-sm">
            {[
              ['⌘ K', 'Search / Command palette'],
              ['⌘ B', 'Toggle sidebar'],
              ['⌘ N', 'New note'],
              ['⌘ ⇧ F', 'Focus mode'],
            ].map(([keys, desc]) => (
              <div key={keys} className="flex items-center justify-between py-1">
                <span className="text-surface-600 dark:text-surface-400">{desc}</span>
                <kbd className="text-xs px-2 py-0.5 bg-surface-100 dark:bg-surface-800 rounded border border-surface-200 dark:border-surface-700 text-surface-500 font-mono">{keys}</kbd>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section>
        <div className="text-center text-xs text-surface-400 space-y-1">
          <p>Universal Notebook v1.0.0</p>
          <p>Your notes, everywhere. Synced across all devices.</p>
        </div>
      </section>
    </div>
  );
}
