import {
  EMPTY_PROFILE,
  type Dupe,
  type DupeLevel,
  type Scent,
  type ScentInput,
  type TasteProfile,
} from '../types';
import { DEMO_DUPES, DEMO_PROFILE, DEMO_SCENTS } from './demoData';
import type { SessionUser, Store } from './store';

interface DemoState {
  profile: TasteProfile;
  scents: Scent[];
  dupes: Dupe[];
}

const KEY = 'scent-library-demo-v1';
const DEMO_USER: SessionUser = { id: 'demo', email: null };

type KeyValue = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read photo'));
    reader.readAsDataURL(blob);
  });
}

/** Demo mode: no account, no network; everything stays in this browser. */
export class LocalStore implements Store {
  readonly mode = 'demo' as const;
  private signedIn = false;
  private listeners: ((u: SessionUser | null) => void)[] = [];

  constructor(
    private readonly storage: KeyValue,
    private readonly newId: () => string = () => crypto.randomUUID(),
    private readonly now: () => string = () => new Date().toISOString(),
  ) {
    this.signedIn = storage.getItem(KEY) !== null;
  }

  private read(): DemoState {
    const raw = this.storage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DemoState;
    return { profile: DEMO_PROFILE, scents: DEMO_SCENTS, dupes: DEMO_DUPES };
  }

  private write(state: DemoState): void {
    this.storage.setItem(KEY, JSON.stringify(state));
  }

  async currentUser() {
    return this.signedIn ? DEMO_USER : null;
  }
  onAuthChange(cb: (u: SessionUser | null) => void) {
    this.listeners.push(cb);
  }
  private emit() {
    for (const cb of this.listeners) cb(this.signedIn ? DEMO_USER : null);
  }
  /** Demo mode has no email: "signing in" just opens the demo library. */
  async sendMagicLink() {
    this.write(this.read());
    this.signedIn = true;
    this.emit();
  }
  async verifyEmailCode() {
    throw new Error('Demo mode has no email codes. Press “Try the demo” instead.');
  }
  async signInWithProvider() {
    await this.sendMagicLink();
  }
  /** Signing out of the demo also wipes its data, so it can be restarted fresh. */
  async signOut() {
    this.storage.removeItem(KEY);
    this.signedIn = false;
    this.emit();
  }

  async getProfile() {
    return { ...EMPTY_PROFILE, ...this.read().profile };
  }
  async saveProfile(profile: TasteProfile) {
    const s = this.read();
    this.write({ ...s, profile });
  }

  async listScents() {
    return [...this.read().scents].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }
  async getScent(id: string) {
    return this.read().scents.find((x) => x.id === id) ?? null;
  }
  async createScent(input: ScentInput) {
    const s = this.read();
    const t = this.now();
    const scent: Scent = { ...input, id: this.newId(), created_at: t, updated_at: t };
    this.write({ ...s, scents: [...s.scents, scent] });
    return scent;
  }
  async updateScent(id: string, input: ScentInput) {
    const s = this.read();
    const old = s.scents.find((x) => x.id === id);
    if (!old) throw new Error('Scent not found');
    const scent: Scent = { ...old, ...input, updated_at: this.now() };
    this.write({ ...s, scents: s.scents.map((x) => (x.id === id ? scent : x)) });
    return scent;
  }
  async deleteScent(id: string) {
    const s = this.read();
    this.write({
      ...s,
      scents: s.scents.filter((x) => x.id !== id),
      // Mirrors the ON DELETE CASCADE in the SQL migration.
      dupes: s.dupes.filter((d) => d.original_id !== id && d.dupe_id !== id),
    });
  }

  async uploadPhoto(file: Blob) {
    return blobToDataUrl(file);
  }
  async deletePhoto() {
    // Demo photos are stored inline on the card; nothing separate to delete.
  }
  async photoUrl(path: string) {
    return path;
  }

  async listDupes() {
    return this.read().dupes;
  }
  async createDupe(originalId: string, dupeId: string, level: DupeLevel) {
    if (originalId === dupeId) throw new Error('A scent cannot be a dupe of itself');
    const s = this.read();
    const ids = new Set(s.scents.map((x) => x.id));
    if (!ids.has(originalId) || !ids.has(dupeId)) throw new Error('Scent not found');
    if (s.dupes.some((d) => d.original_id === originalId && d.dupe_id === dupeId)) {
      throw new Error('Those two are already linked');
    }
    const dupe: Dupe = {
      id: this.newId(),
      original_id: originalId,
      dupe_id: dupeId,
      level,
      created_at: this.now(),
    };
    this.write({ ...s, dupes: [...s.dupes, dupe] });
    return dupe;
  }
  async deleteDupe(id: string) {
    const s = this.read();
    this.write({ ...s, dupes: s.dupes.filter((d) => d.id !== id) });
  }
}
