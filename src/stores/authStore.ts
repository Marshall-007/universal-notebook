import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { syncEngine } from '@/lib/sync';
import { clearAllData } from '@/lib/db';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      initialize: async () => {
        set({ isLoading: true });

        if (!isSupabaseConfigured()) {
          // Demo mode — create a local user
          const demoUser: User = {
            id: 'local-user',
            email: 'demo@notebook.local',
            displayName: 'Local User',
            createdAt: new Date().toISOString(),
          };
          set({ user: demoUser, isAuthenticated: true, isLoading: false });
          return;
        }

        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const user: User = {
              id: session.user.id,
              email: session.user.email || '',
              displayName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
              avatarUrl: session.user.user_metadata?.avatar_url,
              createdAt: session.user.created_at,
            };
            set({ user, isAuthenticated: true });
            await syncEngine.initialize(user.id);
          }
        } catch (error) {
          console.error('Auth initialization failed:', error);
        } finally {
          set({ isLoading: false });
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            const user: User = {
              id: session.user.id,
              email: session.user.email || '',
              displayName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
              avatarUrl: session.user.user_metadata?.avatar_url,
              createdAt: session.user.created_at,
            };
            set({ user, isAuthenticated: true });
            await syncEngine.initialize(user.id);
          } else if (event === 'SIGNED_OUT') {
            set({ user: null, isAuthenticated: false });
            await syncEngine.cleanup();
          }
        });
      },

      signUp: async (email, password, displayName) => {
        if (!isSupabaseConfigured()) {
          return { error: 'Supabase not configured. Running in demo mode.' };
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: displayName } },
        });
        if (error) return { error: error.message };
        return {};
      },

      signIn: async (email, password) => {
        if (!isSupabaseConfigured()) {
          // Demo mode
          const demoUser: User = {
            id: 'local-user',
            email,
            displayName: email.split('@')[0],
            createdAt: new Date().toISOString(),
          };
          set({ user: demoUser, isAuthenticated: true });
          return {};
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        return {};
      },

      signInWithGoogle: async () => {
        if (!isSupabaseConfigured()) {
          return { error: 'Supabase not configured. Running in demo mode.' };
        }
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin.startsWith('http') ? window.location.origin : 'https://eqpfuslldubeochedsol.supabase.co/auth/v1/callback' },
        });
        if (error) return { error: error.message };
        return {};
      },

      signOut: async () => {
        if (isSupabaseConfigured()) {
          await supabase.auth.signOut();
        }
        await syncEngine.cleanup();
        await clearAllData();
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
