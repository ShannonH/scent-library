import { LocalStore } from './localStore';
import type { Store } from './store';
import { SupabaseStore } from './supabaseStore';

export type AuthProvider = 'google' | 'apple';

/** Google/Apple buttons only appear once they are enabled in Supabase and listed here. */
export function enabledProviders(): AuthProvider[] {
  const raw: string = import.meta.env.VITE_AUTH_PROVIDERS ?? '';
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is AuthProvider => s === 'google' || s === 'apple');
}

/** Supabase when configured at build time, otherwise the in-browser demo. */
export function createStore(): Store {
  const url: string | undefined = import.meta.env.VITE_SUPABASE_URL;
  const key: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (url && key) {
    const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).href;
    return new SupabaseStore(url, key, redirectTo);
  }
  return new LocalStore(window.localStorage);
}
