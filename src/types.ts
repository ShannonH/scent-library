export const STATUSES = ['curious', 'love', 'fine', 'nope', 'hell no', 'predicted-no'] as const;
export type Status = (typeof STATUSES)[number];

export const GENDERS = ['feminine', 'masculine', 'unisex', 'unknown'] as const;
export type Gender = (typeof GENDERS)[number];

export const PURPOSES = ['armor', 'lounge'] as const;
/** Armor = out in the world. Lounge = at home. */
export type Purpose = (typeof PURPOSES)[number];

export const DUPE_LEVELS = ['dupe_of', 'has_dna_of', 'inspired_by'] as const;
export type DupeLevel = (typeof DUPE_LEVELS)[number];

export const DUPE_LEVEL_LABEL: Record<DupeLevel, string> = {
  dupe_of: 'Dupe of',
  has_dna_of: 'Has DNA of',
  inspired_by: 'Inspired by',
};

export interface Scent {
  id: string;
  name: string;
  brand: string;
  gender: Gender;
  top_notes: string[];
  heart_notes: string[];
  base_notes: string[];
  status: Status;
  have: boolean;
  smelled: boolean;
  /** Retail price in the user's currency; null when unknown. */
  price: number | null;
  where_seen: string;
  own_notes: string;
  purposes: Purpose[];
  /** Storage path (Supabase) or data: URL (demo mode); null when no photo. */
  photo_path: string | null;
  created_at: string;
  updated_at: string;
}

export type ScentInput = Omit<Scent, 'id' | 'created_at' | 'updated_at'>;

export interface Dupe {
  id: string;
  /** The perfume being imitated. */
  original_id: string;
  /** The perfume that imitates it. */
  dupe_id: string;
  level: DupeLevel;
  created_at: string;
}

export type RuleKind = 'like' | 'dislike' | 'flag';

export interface TasteProfile {
  likes: string[];
  dislikes: string[];
  flags: string[];
  /** Flags that only count when the note leads (top notes, or first note of a layer). */
  lead_only_flags: string[];
  /** Cozy/gourmand cues: never negative, they just suggest Lounge. */
  lounge_cues: string[];
}

export const EMPTY_PROFILE: TasteProfile = {
  likes: [],
  dislikes: [],
  flags: [],
  lead_only_flags: [],
  lounge_cues: [],
};
