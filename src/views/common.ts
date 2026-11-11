import type { Store } from '../data/store';
import { h } from '../dom';
import { VERDICT_LABEL, type NoteMatch, type VerdictResult } from '../domain/verdict';
import type { Purpose, Scent, Status } from '../types';

export interface Ctx {
  store: Store;
  root: HTMLElement;
}

export const STATUS_LABEL: Record<Status, string> = {
  curious: 'Curious',
  love: 'Love',
  fine: 'Fine',
  nope: 'Nope',
  'hell no': 'Hell no',
  'predicted-no': 'Predicted no',
};

export const PURPOSE_LABEL: Record<Purpose, string> = {
  armor: 'Armor',
  lounge: 'Lounge',
};

export const PURPOSE_HINT: Record<Purpose, string> = {
  armor: 'out in the world',
  lounge: 'at home',
};

export function verdictBadge(r: VerdictResult): HTMLElement {
  return h('span', { class: `badge verdict-${r.verdict}` }, VERDICT_LABEL[r.verdict]);
}

export function statusBadge(s: Status): HTMLElement {
  return h('span', { class: `badge status-${s.replace(/\s/g, '-')}` }, STATUS_LABEL[s]);
}

export function purposeChips(purposes: readonly Purpose[]): HTMLElement[] {
  return purposes.map((p) => h('span', { class: `chip purpose-${p}` }, PURPOSE_LABEL[p]));
}

/** Header and reason come from one VerdictResult, so they always agree. */
export function verdictPanel(r: VerdictResult): HTMLElement {
  const group = (label: string, cls: string, matches: NoteMatch[]) =>
    matches.length === 0
      ? null
      : h(
          'div',
          { class: 'match-group' },
          h('span', { class: 'match-label' }, label),
          ...matches.map((m) =>
            h(
              'span',
              { class: `chip ${cls}`, title: `${m.layer} note, matches “${m.term}”` },
              m.note,
            ),
          ),
        );
  return h(
    'section',
    { class: `verdict-panel verdict-${r.verdict}`, 'aria-label': 'Is this for me?' },
    h('p', { class: 'verdict-eyebrow' }, 'Is this for me?'),
    h('h2', { class: 'verdict-title' }, VERDICT_LABEL[r.verdict]),
    h('p', { class: 'verdict-reason' }, r.reason),
    group('Likes', 'like', r.likes),
    group('Flags', 'flag', r.flags),
    group('Dislikes', 'dislike', r.dislikes),
    group('Lounge cues', 'lounge', r.lounge),
    group('Not leading, ignored', 'ignored', r.ignored),
  );
}

export function photo(store: Store, path: string | null, alt: string, cls = 'photo'): HTMLElement {
  if (!path) return h('div', { class: `${cls} placeholder`, 'aria-hidden': 'true' }, '✦');
  const img = h('img', { class: cls, alt, loading: 'lazy', decoding: 'async' });
  store
    .photoUrl(path)
    .then((url) => {
      if (url) img.src = url;
    })
    .catch(() => img.replaceWith(h('div', { class: `${cls} placeholder` }, '✦')));
  return img;
}

export function scentTitle(s: Pick<Scent, 'name' | 'brand'>): string {
  return s.brand ? `${s.name} — ${s.brand}` : s.name;
}

export function loading(): HTMLElement {
  return h('p', { class: 'muted center' }, 'Loading…');
}
