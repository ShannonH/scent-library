import type { Dupe, DupeLevel, Scent, ScentInput, TasteProfile } from '../types';

export interface SessionUser {
  id: string;
  email: string | null;
}

/**
 * Everything the UI needs from a backend. Two implementations:
 * - SupabaseStore: real accounts, rows protected by row-level security.
 * - LocalStore: demo mode, data lives in this browser's localStorage only.
 */
export interface Store {
  readonly mode: 'supabase' | 'demo';

  currentUser(): Promise<SessionUser | null>;
  onAuthChange(cb: (user: SessionUser | null) => void): void;
  /** Emails a sign-in link and a one-time code (if the email template includes it). */
  sendMagicLink(email: string): Promise<void>;
  /**
   * Signs in with the code from that email. Needed for iPhone home-screen apps,
   * which don't share storage with Safari, so a clicked link signs in Safari instead.
   */
  verifyEmailCode(email: string, code: string): Promise<void>;
  signInWithProvider(provider: 'google' | 'apple'): Promise<void>;
  signOut(): Promise<void>;

  getProfile(): Promise<TasteProfile>;
  saveProfile(profile: TasteProfile): Promise<void>;

  listScents(): Promise<Scent[]>;
  getScent(id: string): Promise<Scent | null>;
  createScent(input: ScentInput): Promise<Scent>;
  updateScent(id: string, input: ScentInput): Promise<Scent>;
  deleteScent(id: string): Promise<void>;

  /** Upload an already-resized photo; returns the value to store in `photo_path`. */
  uploadPhoto(file: Blob): Promise<string>;
  deletePhoto(path: string): Promise<void>;
  /** Turn a stored `photo_path` into something an <img> can show. */
  photoUrl(path: string): Promise<string | null>;

  listDupes(): Promise<Dupe[]>;
  createDupe(originalId: string, dupeId: string, level: DupeLevel): Promise<Dupe>;
  deleteDupe(id: string): Promise<void>;
}

/** The editable fields of a saved scent (drops id and timestamps). */
export function toInput(s: Scent): ScentInput {
  return {
    name: s.name,
    brand: s.brand,
    gender: s.gender,
    top_notes: s.top_notes,
    heart_notes: s.heart_notes,
    base_notes: s.base_notes,
    status: s.status,
    have: s.have,
    smelled: s.smelled,
    price: s.price,
    where_seen: s.where_seen,
    own_notes: s.own_notes,
    purposes: s.purposes,
    photo_path: s.photo_path,
  };
}

export function emptyScentInput(): ScentInput {
  return {
    name: '',
    brand: '',
    gender: 'unknown',
    top_notes: [],
    heart_notes: [],
    base_notes: [],
    status: 'curious',
    have: false,
    smelled: false,
    price: null,
    where_seen: '',
    own_notes: '',
    purposes: [],
    photo_path: null,
  };
}
