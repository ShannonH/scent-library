import type { Dupe, Scent, TasteProfile } from '../types';
import { STARTER_PROFILE } from '../domain/starterProfile';

/*
 * Demo-mode sample data. Every perfume, brand and note list here is invented
 * for the demo; none of it comes from a perfume database or a real product.
 */

const T = '2026-01-01T12:00:00.000Z';

function demo(id: string, fields: Partial<Scent> & Pick<Scent, 'name' | 'brand'>): Scent {
  return {
    id,
    gender: 'unisex',
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
    created_at: T,
    updated_at: T,
    ...fields,
  };
}

export const DEMO_PROFILE: TasteProfile = STARTER_PROFILE;

export const DEMO_SCENTS: Scent[] = [
  demo('demo-1', {
    name: 'Moonlit Orchard',
    brand: 'Imaginary House',
    gender: 'feminine',
    top_notes: ['pear', 'bergamot'],
    heart_notes: ['jasmine'],
    base_notes: ['sandalwood', 'white musk'],
    status: 'love',
    have: true,
    smelled: true,
    price: 120,
    where_seen: 'Demo department store',
    own_notes: 'Made-up demo card. Bright and quiet at the same time.',
    purposes: ['armor'],
  }),
  demo('demo-2', {
    name: 'Orchard Echo',
    brand: 'Pretend Perfumery',
    gender: 'feminine',
    top_notes: ['pear', 'mandarin'],
    heart_notes: ['orange blossom'],
    base_notes: ['musk'],
    status: 'curious',
    price: 30,
    where_seen: 'A demo live sale',
    own_notes: 'Demo card: a budget take on Moonlit Orchard.',
    purposes: ['armor'],
  }),
  demo('demo-3', {
    name: 'Velvet Library',
    brand: 'Fictional Parfums',
    top_notes: ['aldehydes'],
    heart_notes: ['iris', 'violet'],
    base_notes: ['powdery musk'],
    status: 'predicted-no',
    price: 160,
  }),
  demo('demo-4', {
    name: 'Sunday Caramel',
    brand: 'Imaginary House',
    top_notes: ['mandarin'],
    heart_notes: ['caramel', 'praline'],
    base_notes: ['vanilla', 'amber'],
    status: 'fine',
    smelled: true,
    price: 85,
    purposes: ['lounge'],
  }),
  demo('demo-5', {
    name: 'Ember Road',
    brand: 'Storybook Scents',
    gender: 'masculine',
    top_notes: ['oud', 'saffron'],
    heart_notes: ['rose'],
    base_notes: ['leather'],
    status: 'nope',
    smelled: true,
  }),
  demo('demo-6', {
    name: 'Mystery Bottle No. 7',
    brand: 'Unknown',
    status: 'curious',
    own_notes: 'Demo card with no notes yet, so the verdict is Mystery.',
  }),
];

export const DEMO_DUPES: Dupe[] = [
  {
    id: 'demo-dupe-1',
    original_id: 'demo-1',
    dupe_id: 'demo-2',
    level: 'dupe_of',
    created_at: T,
  },
];
