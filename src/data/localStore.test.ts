import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStore } from './localStore';
import { emptyScentInput } from './store';

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

describe('LocalStore (demo mode)', () => {
  let n = 0;
  let store: LocalStore;
  beforeEach(() => {
    n = 0;
    store = new LocalStore(
      new MemoryStorage(),
      () => `id-${++n}`,
      () => `2026-02-0${n}T00:00:00.000Z`,
    );
  });

  it('starts signed out, and signing in loads the demo cards', async () => {
    expect(await store.currentUser()).toBeNull();
    await store.sendMagicLink();
    expect(await store.currentUser()).toEqual({ id: 'demo', email: null });
    expect((await store.listScents()).length).toBeGreaterThan(0);
  });

  it('creates, updates and deletes a scent', async () => {
    await store.sendMagicLink();
    const created = await store.createScent({ ...emptyScentInput(), name: 'Test', brand: 'Me' });
    expect(await store.getScent(created.id)).toMatchObject({ name: 'Test' });

    await store.updateScent(created.id, { ...emptyScentInput(), name: 'Renamed', brand: 'Me' });
    expect((await store.getScent(created.id))?.name).toBe('Renamed');

    await store.deleteScent(created.id);
    expect(await store.getScent(created.id)).toBeNull();
  });

  it('removes dupe links when either scent is deleted', async () => {
    await store.sendMagicLink();
    const a = await store.createScent({ ...emptyScentInput(), name: 'A' });
    const b = await store.createScent({ ...emptyScentInput(), name: 'B' });
    await store.createDupe(a.id, b.id, 'inspired_by');
    expect((await store.listDupes()).some((d) => d.dupe_id === b.id)).toBe(true);
    await store.deleteScent(a.id);
    expect((await store.listDupes()).some((d) => d.dupe_id === b.id)).toBe(false);
  });

  it('rejects self-links and duplicate links', async () => {
    await store.sendMagicLink();
    const a = await store.createScent({ ...emptyScentInput(), name: 'A' });
    const b = await store.createScent({ ...emptyScentInput(), name: 'B' });
    await expect(store.createDupe(a.id, a.id, 'dupe_of')).rejects.toThrow(/itself/);
    await store.createDupe(a.id, b.id, 'dupe_of');
    await expect(store.createDupe(a.id, b.id, 'has_dna_of')).rejects.toThrow(/already/);
  });

  it('wipes demo data on sign-out', async () => {
    await store.sendMagicLink();
    await store.saveProfile({
      likes: ['x'],
      dislikes: [],
      flags: [],
      lead_only_flags: [],
      lounge_cues: [],
    });
    await store.signOut();
    await store.sendMagicLink();
    expect((await store.getProfile()).likes).not.toEqual(['x']);
  });
});
