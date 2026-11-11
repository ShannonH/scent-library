import { h, mount } from '../dom';
import { computeVerdict, VERDICT_LABEL, type Verdict } from '../domain/verdict';
import { href } from '../router';
import { PURPOSES, STATUSES, type Scent, type TasteProfile } from '../types';
import {
  loading,
  photo,
  PURPOSE_LABEL,
  purposeChips,
  STATUS_LABEL,
  statusBadge,
  verdictBadge,
  type Ctx,
} from './common';

interface Filters {
  q: string;
  status: string;
  verdict: string;
  purpose: string;
  owned: string;
}

const FILTER_KEY = 'scent-library-filters';

function loadFilters(): Filters {
  const blank = { q: '', status: '', verdict: '', purpose: '', owned: '' };
  try {
    return { ...blank, ...(JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? '{}') as Filters) };
  } catch {
    return blank;
  }
}

function matches(s: Scent, verdict: Verdict, f: Filters): boolean {
  const text = [s.name, s.brand, ...s.top_notes, ...s.heart_notes, ...s.base_notes]
    .join(' ')
    .toLowerCase();
  if (f.q && !text.includes(f.q.toLowerCase())) return false;
  if (f.status && s.status !== f.status) return false;
  if (f.verdict && verdict !== f.verdict) return false;
  if (f.purpose && !s.purposes.includes(f.purpose as Scent['purposes'][number])) return false;
  if (f.owned === 'have' && !s.have) return false;
  if (f.owned === 'smelled' && !s.smelled) return false;
  if (f.owned === 'unsmelled' && s.smelled) return false;
  return true;
}

export async function renderLibrary(ctx: Ctx): Promise<void> {
  mount(ctx.root, loading());
  const [scents, profile] = await Promise.all([ctx.store.listScents(), ctx.store.getProfile()]);
  const filters = loadFilters();
  const list = h('ul', { class: 'card-list' });
  const count = h('p', { class: 'muted small' });

  const draw = () => {
    try {
      sessionStorage.setItem(FILTER_KEY, JSON.stringify(filters));
    } catch {
      // Private mode: filters just won't be remembered.
    }
    const rows = scents
      .map((s) => ({ s, r: computeVerdict(s, profile) }))
      .filter(({ s, r }) => matches(s, r.verdict, filters));
    count.textContent = `${rows.length} of ${scents.length} scents`;
    list.replaceChildren(
      ...rows.map(({ s, r }) =>
        h(
          'li',
          null,
          h(
            'a',
            { class: 'card', href: href({ name: 'scent', id: s.id }) },
            photo(ctx.store, s.photo_path, '', 'thumb'),
            h(
              'div',
              { class: 'card-body' },
              h('strong', { class: 'card-name' }, s.name),
              h('span', { class: 'muted small' }, s.brand),
              h(
                'div',
                { class: 'badges' },
                verdictBadge(r),
                statusBadge(s.status),
                ...purposeChips(s.purposes),
              ),
            ),
          ),
        ),
      ),
    );
  };

  const select = (key: keyof Filters, label: string, options: [string, string][]) =>
    h(
      'select',
      {
        'aria-label': label,
        onchange: (e: Event) => {
          filters[key] = (e.target as HTMLSelectElement).value;
          draw();
        },
      },
      h('option', { value: '' }, label),
      ...options.map(([v, t]) => h('option', { value: v, selected: filters[key] === v }, t)),
    );

  mount(
    ctx.root,
    h(
      'div',
      { class: 'stack' },
      profileNudge(profile),
      h('input', {
        type: 'search',
        placeholder: 'Search name, brand or note',
        'aria-label': 'Search',
        value: filters.q,
        oninput: (e: Event) => {
          filters.q = (e.target as HTMLInputElement).value;
          draw();
        },
      }),
      h(
        'div',
        { class: 'filters' },
        select(
          'verdict',
          'Any verdict',
          (Object.keys(VERDICT_LABEL) as Verdict[]).map((v) => [v, VERDICT_LABEL[v]]),
        ),
        select(
          'status',
          'Any status',
          STATUSES.map((s) => [s, STATUS_LABEL[s]]),
        ),
        select(
          'purpose',
          'Armor or Lounge',
          PURPOSES.map((p) => [p, PURPOSE_LABEL[p]]),
        ),
        select('owned', 'Have / smelled', [
          ['have', 'I have it'],
          ['smelled', 'Smelled'],
          ['unsmelled', 'Not smelled yet'],
        ]),
      ),
      count,
      scents.length === 0
        ? h(
            'div',
            { class: 'empty' },
            h('p', null, 'Your library is empty.'),
            h('a', { class: 'button', href: href({ name: 'new' }) }, 'Add your first scent'),
          )
        : list,
    ),
  );
  draw();
}

function profileNudge(p: TasteProfile): HTMLElement | null {
  if (p.likes.length + p.flags.length + p.dislikes.length > 0) return null;
  return h(
    'div',
    { class: 'notice' },
    'Every verdict says Mystery until you set up your taste. ',
    h('a', { href: href({ name: 'profile' }) }, 'Add your likes and flags'),
    '.',
  );
}
