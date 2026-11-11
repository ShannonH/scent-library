import { errorMessage, field, h, mount, toast } from '../dom';
import { href } from '../router';
import { DUPE_LEVEL_LABEL, DUPE_LEVELS, type DupeLevel } from '../types';
import { loading, scentTitle, type Ctx } from './common';

export async function renderDupes(ctx: Ctx): Promise<void> {
  mount(ctx.root, loading());
  const [scents, dupes] = await Promise.all([ctx.store.listScents(), ctx.store.listDupes()]);
  const byId = new Map(scents.map((s) => [s.id, s]));
  const sorted = [...scents].sort((a, b) => a.name.localeCompare(b.name));

  const scentSelect = (name: string, label: string) =>
    h(
      'label',
      null,
      h('span', null, label),
      h(
        'select',
        { name, required: true },
        h('option', { value: '' }, 'Choose…'),
        ...sorted.map((s) => h('option', { value: s.id }, scentTitle(s))),
      ),
    );

  const form: HTMLFormElement = h(
    'form',
    { class: 'panel stack form' },
    h('h3', null, 'Link a dupe'),
    scentSelect('dupe', 'This scent…'),
    h(
      'label',
      null,
      h('span', null, '…is'),
      h(
        'select',
        { name: 'level' },
        ...DUPE_LEVELS.map((l) => h('option', { value: l }, DUPE_LEVEL_LABEL[l])),
      ),
    ),
    scentSelect('original', '…this original'),
    h('button', { type: 'submit', class: 'primary' }, 'Add link'),
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const original = field(form, 'original');
    const dupe = field(form, 'dupe');
    if (!original || !dupe) {
      toast('Pick both scents', 'error');
      return;
    }
    try {
      await ctx.store.createDupe(original, dupe, field(form, 'level') as DupeLevel);
      toast('Linked');
      await renderDupes(ctx);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  });

  const rows = dupes
    .map((d) => ({ d, o: byId.get(d.original_id), x: byId.get(d.dupe_id) }))
    .filter((r) => r.o && r.x)
    .sort((a, b) => (a.o?.name ?? '').localeCompare(b.o?.name ?? ''));

  mount(
    ctx.root,
    h(
      'div',
      { class: 'stack' },
      h('h1', null, 'Dupes'),
      scents.length < 2
        ? h('p', { class: 'notice' }, 'Add at least two scents to link a dupe to its original.')
        : form,
      rows.length === 0
        ? h('p', { class: 'muted' }, 'No dupe links yet.')
        : h(
            'ul',
            { class: 'dupe-list' },
            ...rows.map(({ d, o, x }) =>
              h(
                'li',
                { class: 'panel dupe-row' },
                h(
                  'p',
                  null,
                  h('a', { href: href({ name: 'scent', id: d.dupe_id }) }, x?.name ?? ''),
                  h('span', { class: `chip level-${d.level}` }, DUPE_LEVEL_LABEL[d.level]),
                  h('a', { href: href({ name: 'scent', id: d.original_id }) }, o?.name ?? ''),
                ),
                h(
                  'button',
                  {
                    class: 'link danger',
                    'aria-label': `Remove link between ${x?.name ?? ''} and ${o?.name ?? ''}`,
                    onclick: async () => {
                      try {
                        await ctx.store.deleteDupe(d.id);
                        await renderDupes(ctx);
                      } catch (err) {
                        toast(errorMessage(err), 'error');
                      }
                    },
                  },
                  'Remove',
                ),
              ),
            ),
          ),
    ),
  );
}
