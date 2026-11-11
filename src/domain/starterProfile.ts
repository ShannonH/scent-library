import type { TasteProfile } from '../types';

/**
 * An optional starting point a user can load and then edit. It encodes one
 * common taste pattern: a fresh fruit/citrus opening, a quiet white-floral
 * heart and a soft woody/amber/musk base are likes; powdery, soapy, aldehydic,
 * iris-heavy or spice-heavy scents are flags; oud only counts when it leads.
 * Gourmand notes are never negative, they just mean Lounge.
 */
export const STARTER_PROFILE: TasteProfile = {
  likes: [
    'bergamot',
    'mandarin',
    'grapefruit',
    'lemon',
    'pear',
    'peach',
    'apple',
    'jasmine',
    'orange blossom',
    'tuberose',
    'gardenia',
    'sandalwood',
    'amber',
    'musk',
  ],
  dislikes: [],
  flags: ['powdery', 'soapy', 'aldehydes', 'iris', 'clove', 'cumin', 'oud'],
  lead_only_flags: ['oud'],
  lounge_cues: ['vanilla', 'caramel', 'tonka', 'praline', 'chocolate', 'coffee', 'honey'],
};
