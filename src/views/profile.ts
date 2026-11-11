import { errorMessage, field, h, mount, toast } from '../dom';
import { formatNotes, parseNotes } from '../domain/notes';
import { STARTER_PROFILE } from '../domain/starterProfile';
import { WEIGHTS } from '../domain/verdict';
import type { TasteProfile } from '../types';
import { loading, type Ctx } from './common';

const FIELDS: { key: keyof TasteProfile; label: string; hint: string }[] = [
  { key: 'likes', label: 'Likes', hint: `Notes you enjoy. Each match counts +${WEIGHTS.like}.` },
  {
    key: 'dislikes',
    label: 'Dislikes',
    hint: `Notes you'd rather avoid. Each match counts ${WEIGHTS.dislike}.`,
  },
  {
    key: 'flags',
    label: 'Flags',
    hint: `Deal-breakers. Each match counts ${WEIGHTS.flag}, and a flag means it can't be a full Yes.`,
  },
  {
    key: 'lead_only_flags',
    label: 'Flags that only count when they lead',
    hint: 'Also list them under Flags. They only count in the top notes or as the first note of a layer; a trace in the base is ignored.',
  },
  {
    key: 'lounge_cues',
    label: 'Lounge cues',
    hint: 'Cozy or gourmand notes. Never negative: they just suggest the scent is for Lounge (at home).',
  },
];

export async function renderProfile(ctx: Ctx): Promise<void> {
  mount(ctx.root, loading());
  const [profile, user] = await Promise.all([ctx.store.getProfile(), ctx.store.currentUser()]);

  const fill = (p: TasteProfile) => {
    for (const { key } of FIELDS) {
      const el = form.elements.namedItem(key);
      if (el instanceof HTMLTextAreaElement) el.value = formatNotes(p[key]);
    }
  };

  const form: HTMLFormElement = h(
    'form',
    { class: 'stack form' },
    h('h1', null, 'My taste'),
    h(
      'p',
      { class: 'muted' },
      'The “Is this for me?” verdict matches each card’s notes against these lists. Separate notes with commas.',
    ),
    ...FIELDS.map(({ key, label, hint }) =>
      h(
        'label',
        null,
        h('span', null, label),
        h('textarea', { name: key, rows: 3, value: formatNotes(profile[key]) }),
        h('small', { class: 'muted' }, hint),
      ),
    ),
    h(
      'div',
      { class: 'actions' },
      h('button', { type: 'submit', class: 'primary' }, 'Save taste'),
      h(
        'button',
        {
          type: 'button',
          onclick: () => {
            if (
              confirm(
                'Replace these lists with the example starter profile? Nothing is saved until you press Save.',
              )
            )
              fill(STARTER_PROFILE);
          },
        },
        'Load example profile',
      ),
    ),
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const read = (key: keyof TasteProfile) => parseNotes(field(form, key));
    const next: TasteProfile = {
      likes: read('likes'),
      dislikes: read('dislikes'),
      flags: read('flags'),
      lead_only_flags: read('lead_only_flags'),
      lounge_cues: read('lounge_cues'),
    };
    // A lead-only flag must also be a flag, or it would never count.
    const flags = new Set(next.flags.map((f) => f.toLowerCase()));
    const missing = next.lead_only_flags.filter((f) => !flags.has(f.toLowerCase()));
    next.flags = [...next.flags, ...missing];
    try {
      await ctx.store.saveProfile(next);
      fill(next);
      toast('Taste saved');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  });

  const account = h(
    'section',
    { class: 'panel stack' },
    h('h3', null, 'Account'),
    ctx.store.mode === 'demo'
      ? h(
          'p',
          { class: 'muted small' },
          'Demo mode: data is stored only in this browser. Signing out erases it.',
        )
      : h('p', { class: 'muted small' }, `Signed in as ${user?.email ?? 'unknown'}`),
    h(
      'button',
      {
        type: 'button',
        onclick: async () => {
          try {
            await ctx.store.signOut();
          } catch (err) {
            toast(errorMessage(err), 'error');
          }
        },
      },
      ctx.store.mode === 'demo' ? 'Reset demo' : 'Sign out',
    ),
  );

  mount(ctx.root, h('div', { class: 'stack' }, form, account));
}
