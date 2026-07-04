import { createClient } from '@supabase/supabase-js';

// Backend config is injected at build time via VITE_SUPABASE_* env vars (see
// .env.example). When they are absent the app falls back to placeholders and
// runs fully offline in "demo mode" — it never silently writes to a shared
// backend. For a real deployment, provide the env vars (locally in .env, or as
// CI build secrets) pointing at YOUR own Supabase project.
const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'placeholder-key';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || PLACEHOLDER_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || PLACEHOLDER_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export const isSupabaseConfigured = () => {
  return (
    !!import.meta.env.VITE_SUPABASE_URL &&
    !!import.meta.env.VITE_SUPABASE_ANON_KEY &&
    supabaseUrl !== PLACEHOLDER_URL &&
    supabaseAnonKey !== PLACEHOLDER_KEY &&
    supabaseUrl.startsWith('http')
  );
};
