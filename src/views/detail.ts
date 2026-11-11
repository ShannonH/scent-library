import { errorMessage, h, mount, toast } from '../dom';
import { computeBid, money } from '../domain/bid';
import { formatNotes } from '../domain/notes';
import { computeVerdict } from '../domain/verdict';
import { go, href } from '../router';
import { toInput } from '../data/store';
import { DUPE_LEVEL_LABEL, type Scent } from '../types';
import {
  loading,
  photo,
  PURPOSE_HINT,
  PURPOSE_LABEL,
  purposeChips,
  statusBadge,
  verdictPanel,
  type Ctx,
} from './common';

const GENDER_LABEL: Record<Scent['gender'], string> = {
  feminine: 'Feminine',
  masculine: 'Masculine',
  unisex: 'Unisex',
  unknown: '—',
};

export async function renderDetail(ctx: Ctx, id: string): Promise<void> {
  mount(ctx.root, loading());
  const [scent, profile, dupes, scents] = await Promise.all([
    ctx.store.getScent(id),
    ctx.store.getProfile(),
    ctx.store.listDupes(),
    ctx.store.listScents(),
  ]);
  if (!scent) {
    mount(ctx.root, h('p', { class: 'empty' }, 'That scent was not found.'));
    return;
  }
  const result = computeVerdict(scent, profile);
  const byId = new Map(scents.map((s) => [s.id, s]));
  const bid = computeBid({ retail: scent.price, mystery: false });

  const row = (label: string, value: Node | string | null) =>
    value === null || value === ''
      ? null
      : h('div', { class: 'row' }, h('dt', null, label), h('dd', null, value));

  const links = dupes
    .filter((d) => d.original_id === id || d.dupe_id === id)
    .map((d) => {
      const otherId = d.original_id === id ? d.dupe_id : d.original_id;
      const other = byId.get(otherId);
      if (!other) return null;
      // Read as a sentence: "<dupe> is a Dupe of <original>".
      const text =
        d.dupe_id === id
          ? [`This is ${DUPE_LEVEL_LABEL[d.level].toLowerCase()} `, other.name]
          : [`${other.name} is ${DUPE_LEVEL_LABEL[d.level].toLowerCase()} `, 'this'];
      return h(
        'li',
        null,
        h(
          'a',
          { href: href({ name: 'scent', id: other.id }) },
          text[0],
          h('strong', null, text[1]),
        ),
      );
    })
    .filter((x) => x !== null);

  const suggestLounge =
    result.suggestedPurpose === 'lounge' && !scent.purposes.includes('lounge')
      ? h(
          'button',
          {
            class: 'link',
            onclick: async () => {
              try {
                await ctx.store.updateScent(id, {
                  ...toInput(scent),
                  purposes: [...scent.purposes, 'lounge'],
                });
                toast('Tagged Lounge');
                await renderDetail(ctx, id);
              } catch (err) {
                toast(errorMessage(err), 'error');
              }
            },
          },
          'Tag it Lounge',
        )
      : null;

  mount(
    ctx.root,
    h(
      'article',
      { class: 'stack' },
      h(
        'header',
        { class: 'detail-head' },
        photo(ctx.store, scent.photo_path, `Photo of ${scent.name}`, 'hero'),
        h('div', null, h('h1', null, scent.name), h('p', { class: 'muted' }, scent.brand)),
        h('div', { class: 'badges' }, statusBadge(scent.status), ...purposeChips(scent.purposes)),
      ),
      verdictPanel(result),
      suggestLounge,
      h(
        'section',
        { class: 'panel' },
        h('h3', null, 'Notes'),
        h(
          'dl',
          null,
          row('Top', formatNotes(scent.top_notes) || '—'),
          row('Heart', formatNotes(scent.heart_notes) || '—'),
          row('Base', formatNotes(scent.base_notes) || '—'),
        ),
      ),
      h(
        'section',
        { class: 'panel' },
        h('h3', null, 'Details'),
        h(
          'dl',
          null,
          row('Gender', GENDER_LABEL[scent.gender]),
          row('Have it', scent.have ? 'Yes' : 'No'),
          row('Smelled', scent.smelled ? 'Yes' : 'No'),
          row('Retail', scent.price === null ? null : money(scent.price)),
          row('Where seen', scent.where_seen),
          row(
            'Purpose',
            scent.purposes.map((p) => `${PURPOSE_LABEL[p]} (${PURPOSE_HINT[p]})`).join(', '),
          ),
        ),
        scent.own_notes ? h('p', { class: 'own-notes' }, scent.own_notes) : null,
      ),
      bid
        ? h(
            'section',
            { class: 'panel' },
            h('h3', null, 'Bid limit'),
            h(
              'p',
              { class: 'bid-line' },
              h('strong', null, bid.skip ? 'Skip' : `Max bid ${money(bid.maxBid)}`),
              ` · max total ${money(bid.maxTotal)}`,
            ),
            h('p', { class: 'muted small' }, bid.explanation),
          )
        : null,
      h(
        'section',
        { class: 'panel' },
        h('h3', null, 'Dupes'),
        links.length
          ? h('ul', { class: 'plain' }, ...links)
          : h('p', { class: 'muted small' }, 'No dupe links yet.'),
        h('a', { href: href({ name: 'dupes' }) }, 'Manage dupe links'),
      ),
      h(
        'div',
        { class: 'actions' },
        h('a', { class: 'button', href: href({ name: 'edit', id }) }, 'Edit'),
        h(
          'button',
          {
            class: 'danger',
            onclick: async () => {
              if (!confirm(`Delete “${scent.name}”? This also removes its photo and dupe links.`))
                return;
              try {
                await ctx.store.deleteScent(id);
                toast('Deleted');
                go({ name: 'library' });
              } catch (err) {
                toast(errorMessage(err), 'error');
              }
            },
          },
          'Delete',
        ),
      ),
    ),
  );
}
