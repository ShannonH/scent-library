import { emptyScentInput, toInput } from '../data/store';
import { checked, errorMessage, field, h, mount, toast } from '../dom';
import { formatNotes, parseNotes } from '../domain/notes';
import { computeVerdict } from '../domain/verdict';
import { resizePhoto } from '../photo';
import { go } from '../router';
import {
  GENDERS,
  PURPOSES,
  STATUSES,
  type Gender,
  type Purpose,
  type ScentInput,
  type Status,
} from '../types';
import {
  loading,
  photo,
  PURPOSE_HINT,
  PURPOSE_LABEL,
  STATUS_LABEL,
  verdictPanel,
  type Ctx,
} from './common';

function readForm(form: HTMLFormElement, photoPath: string | null): ScentInput {
  const priceText = field(form, 'price').trim();
  const price = priceText === '' ? null : Number(priceText);
  return {
    name: field(form, 'name').trim(),
    brand: field(form, 'brand').trim(),
    gender: field(form, 'gender') as Gender,
    top_notes: parseNotes(field(form, 'top_notes')),
    heart_notes: parseNotes(field(form, 'heart_notes')),
    base_notes: parseNotes(field(form, 'base_notes')),
    status: field(form, 'status') as Status,
    have: checked(form, 'have'),
    smelled: checked(form, 'smelled'),
    price: price !== null && Number.isFinite(price) && price >= 0 ? price : null,
    where_seen: field(form, 'where_seen').trim(),
    own_notes: field(form, 'own_notes').trim(),
    purposes: PURPOSES.filter((p) => checked(form, `purpose_${p}`)),
    photo_path: photoPath,
  };
}

export async function renderForm(ctx: Ctx, id: string | null): Promise<void> {
  mount(ctx.root, loading());
  const [existing, profile] = await Promise.all([
    id ? ctx.store.getScent(id) : Promise.resolve(null),
    ctx.store.getProfile(),
  ]);
  if (id && !existing) {
    mount(ctx.root, h('p', { class: 'empty' }, 'That scent was not found.'));
    return;
  }
  const initial = existing ? toInput(existing) : emptyScentInput();
  const oldPhoto = initial.photo_path;
  let pickedPhoto: Blob | null = null;
  let removePhoto = false;

  const label = (text: string, control: HTMLElement, hint?: string) =>
    h(
      'label',
      null,
      h('span', null, text),
      control,
      hint ? h('small', { class: 'muted' }, hint) : null,
    );

  const notesArea = (name: string, value: string[]) =>
    h('textarea', { name, rows: 2, placeholder: 'comma-separated', value: formatNotes(value) });

  const preview = h('div', { class: 'preview' });
  const photoBox = h(
    'div',
    { class: 'photo-box' },
    photo(ctx.store, oldPhoto, 'Current photo', 'hero'),
  );

  const form: HTMLFormElement = h(
    'form',
    { class: 'stack form', novalidate: true },
    h('h1', null, existing ? `Edit ${existing.name}` : 'Add a scent'),
    label(
      'Name',
      h('input', { name: 'name', required: true, value: initial.name, autocomplete: 'off' }),
    ),
    label('Brand', h('input', { name: 'brand', value: initial.brand, autocomplete: 'off' })),
    label(
      'Gender',
      h(
        'select',
        { name: 'gender' },
        ...GENDERS.map((g) =>
          h(
            'option',
            { value: g, selected: g === initial.gender },
            g === 'unknown' ? 'Not sure' : g[0]?.toUpperCase() + g.slice(1),
          ),
        ),
      ),
    ),
    h(
      'fieldset',
      null,
      h('legend', null, 'Notes'),
      label('Top', notesArea('top_notes', initial.top_notes)),
      label('Heart', notesArea('heart_notes', initial.heart_notes)),
      label('Base', notesArea('base_notes', initial.base_notes)),
      h('small', { class: 'muted' }, 'Type notes yourself, from the bottle, box or your own nose.'),
    ),
    preview,
    label(
      'Status',
      h(
        'select',
        { name: 'status' },
        ...STATUSES.map((s) =>
          h('option', { value: s, selected: s === initial.status }, STATUS_LABEL[s]),
        ),
      ),
    ),
    h(
      'div',
      { class: 'checks' },
      h(
        'label',
        { class: 'check' },
        h('input', { type: 'checkbox', name: 'have', checked: initial.have }),
        'I have it',
      ),
      h(
        'label',
        { class: 'check' },
        h('input', { type: 'checkbox', name: 'smelled', checked: initial.smelled }),
        'Smelled it',
      ),
    ),
    h(
      'fieldset',
      null,
      h('legend', null, 'Purpose'),
      h(
        'div',
        { class: 'checks' },
        ...PURPOSES.map((p: Purpose) =>
          h(
            'label',
            { class: 'check' },
            h('input', {
              type: 'checkbox',
              name: `purpose_${p}`,
              checked: initial.purposes.includes(p),
            }),
            `${PURPOSE_LABEL[p]} `,
            h('small', { class: 'muted' }, `(${PURPOSE_HINT[p]})`),
          ),
        ),
      ),
    ),
    label(
      'Retail price',
      h('input', {
        name: 'price',
        type: 'number',
        inputmode: 'decimal',
        min: '0',
        step: '0.01',
        value: initial.price === null ? '' : String(initial.price),
      }),
      'Used for the bid limit.',
    ),
    label('Where seen', h('input', { name: 'where_seen', value: initial.where_seen })),
    label('My notes', h('textarea', { name: 'own_notes', rows: 3, value: initial.own_notes })),
    h(
      'fieldset',
      null,
      h('legend', null, 'Photo'),
      photoBox,
      h('input', {
        type: 'file',
        accept: 'image/*',
        'aria-label': 'Choose a photo',
        onchange: async (e: Event) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return;
          try {
            pickedPhoto = await resizePhoto(file);
            removePhoto = false;
            const img = h('img', { class: 'hero', alt: 'New photo' });
            img.src = URL.createObjectURL(pickedPhoto);
            photoBox.replaceChildren(img);
          } catch (err) {
            toast(errorMessage(err), 'error');
          }
        },
      }),
      h(
        'button',
        {
          type: 'button',
          class: 'link',
          onclick: () => {
            pickedPhoto = null;
            removePhoto = true;
            photoBox.replaceChildren(photo(ctx.store, null, ''));
          },
        },
        'Remove photo',
      ),
      h(
        'small',
        { class: 'muted' },
        'Use your own photo. It is resized and location data is stripped.',
      ),
    ),
    h(
      'div',
      { class: 'actions' },
      h('button', { type: 'submit', class: 'primary' }, existing ? 'Save' : 'Add to library'),
      h('button', { type: 'button', onclick: () => history.back() }, 'Cancel'),
    ),
  );

  const updatePreview = () => {
    const r = computeVerdict(readForm(form, null), profile);
    preview.replaceChildren(verdictPanel(r));
  };
  form.addEventListener('input', updatePreview);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submit = form.querySelector<HTMLButtonElement>('button[type=submit]');
    if (!field(form, 'name').trim()) {
      toast('Give it a name first', 'error');
      return;
    }
    if (submit) submit.disabled = true;
    try {
      let photoPath = removePhoto ? null : oldPhoto;
      if (pickedPhoto) photoPath = await ctx.store.uploadPhoto(pickedPhoto);
      const input = readForm(form, photoPath);
      const saved = existing
        ? await ctx.store.updateScent(existing.id, input)
        : await ctx.store.createScent(input);
      if (oldPhoto && oldPhoto !== photoPath) {
        await ctx.store.deletePhoto(oldPhoto).catch(() => undefined);
      }
      toast('Saved');
      go({ name: 'scent', id: saved.id });
    } catch (err) {
      toast(errorMessage(err), 'error');
      if (submit) submit.disabled = false;
    }
  });

  mount(ctx.root, form);
  updatePreview();
}
