import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import {
  EMPTY_PROFILE,
  type Dupe,
  type DupeLevel,
  type Scent,
  type ScentInput,
  type TasteProfile,
} from '../types';
import type { SessionUser, Store } from './store';

export const PHOTO_BUCKET = 'scent-photos';

const toSessionUser = (u: User | null | undefined): SessionUser | null =>
  u ? { id: u.id, email: u.email ?? null } : null;

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  if (res.data === null) throw new Error('No data returned');
  return res.data;
}

/**
 * Real accounts. Uses only the public anon key: every table and the photo
 * bucket are locked down with row-level security (see supabase/migrations),
 * so a signed-in user can only ever read or write their own rows.
 */
export class SupabaseStore implements Store {
  readonly mode = 'supabase' as const;
  private readonly db: SupabaseClient;

  constructor(
    url: string,
    anonKey: string,
    private readonly redirectTo: string,
  ) {
    this.db = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }

  private async uid(): Promise<string> {
    const { data } = await this.db.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new Error('Not signed in');
    return id;
  }

  async currentUser() {
    const { data } = await this.db.auth.getSession();
    return toSessionUser(data.session?.user);
  }
  onAuthChange(cb: (u: SessionUser | null) => void) {
    this.db.auth.onAuthStateChange((_event, session) => cb(toSessionUser(session?.user)));
  }
  async sendMagicLink(email: string) {
    const { error } = await this.db.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: this.redirectTo },
    });
    if (error) throw new Error(error.message);
  }
  async verifyEmailCode(email: string, code: string) {
    const { error } = await this.db.auth.verifyOtp({ email, token: code, type: 'email' });
    if (error?.code === 'otp_expired' || /expired|invalid/i.test(error?.message ?? '')) {
      throw new Error(
        'That code didn’t work. It may have expired: send a new email and use the newest code.',
      );
    }
    if (error) throw new Error(error.message);
  }
  async signInWithProvider(provider: 'google' | 'apple') {
    const { error } = await this.db.auth.signInWithOAuth({
      provider,
      options: { redirectTo: this.redirectTo },
    });
    if (error) throw new Error(error.message);
  }
  async signOut() {
    const { error } = await this.db.auth.signOut();
    if (error) throw new Error(error.message);
  }

  async getProfile(): Promise<TasteProfile> {
    const { data, error } = await this.db
      .from('profiles')
      .select('likes, dislikes, flags, lead_only_flags, lounge_cues')
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { ...EMPTY_PROFILE, ...(data as Partial<TasteProfile> | null) };
  }
  async saveProfile(profile: TasteProfile) {
    const user_id = await this.uid();
    const { error } = await this.db.from('profiles').upsert({ user_id, ...profile });
    if (error) throw new Error(error.message);
  }

  async listScents() {
    return check<Scent[]>(
      await this.db.from('scents').select('*').order('updated_at', { ascending: false }),
    );
  }
  async getScent(id: string) {
    const { data, error } = await this.db.from('scents').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data as Scent | null;
  }
  async createScent(input: ScentInput) {
    return check<Scent>(await this.db.from('scents').insert(input).select().single());
  }
  async updateScent(id: string, input: ScentInput) {
    return check<Scent>(await this.db.from('scents').update(input).eq('id', id).select().single());
  }
  async deleteScent(id: string) {
    const scent = await this.getScent(id);
    const { error } = await this.db.from('scents').delete().eq('id', id);
    if (error) throw new Error(error.message);
    if (scent?.photo_path) await this.deletePhoto(scent.photo_path);
  }

  async uploadPhoto(file: Blob) {
    // The first folder must be the user's id: the storage policies check it.
    const path = `${await this.uid()}/${crypto.randomUUID()}.jpg`;
    const { error } = await this.db.storage
      .from(PHOTO_BUCKET)
      .upload(path, file, { contentType: 'image/jpeg', upsert: false });
    if (error) throw new Error(error.message);
    return path;
  }
  async deletePhoto(path: string) {
    const { error } = await this.db.storage.from(PHOTO_BUCKET).remove([path]);
    if (error) throw new Error(error.message);
  }
  async photoUrl(path: string) {
    // The bucket is private, so photos are shown through short-lived signed URLs.
    const { data, error } = await this.db.storage.from(PHOTO_BUCKET).createSignedUrl(path, 3600);
    return error ? null : data.signedUrl;
  }

  async listDupes() {
    return check<Dupe[]>(await this.db.from('dupes').select('*'));
  }
  async createDupe(originalId: string, dupeId: string, level: DupeLevel) {
    if (originalId === dupeId) throw new Error('A scent cannot be a dupe of itself');
    const res = await this.db
      .from('dupes')
      .insert({ original_id: originalId, dupe_id: dupeId, level })
      .select()
      .single();
    if (res.error?.code === '23505') throw new Error('Those two are already linked');
    return check<Dupe>(res);
  }
  async deleteDupe(id: string) {
    const { error } = await this.db.from('dupes').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}
