import type { Purpose, Scent, TasteProfile } from '../types';
import { termMatchesNote } from './notes';

export type Verdict = 'yes' | 'leaning_yes' | 'leaning_no' | 'no' | 'mystery';

export const VERDICT_LABEL: Record<Verdict, string> = {
  yes: 'Yes',
  leaning_yes: 'Leaning yes',
  leaning_no: 'Leaning no',
  no: 'No',
  mystery: 'Mystery',
};

export type Layer = 'top' | 'heart' | 'base';

export interface NoteMatch {
  term: string;
  note: string;
  layer: Layer;
}

export interface VerdictResult {
  verdict: Verdict;
  /** One sentence, always derived from the same numbers as `verdict`. */
  reason: string;
  score: number;
  likes: NoteMatch[];
  dislikes: NoteMatch[];
  flags: NoteMatch[];
  /** Cozy/gourmand notes: neutral for scoring, they only suggest Lounge. */
  lounge: NoteMatch[];
  /** Lead-only flags that were present but not leading, so they did not count. */
  ignored: NoteMatch[];
  suggestedPurpose: Purpose | null;
}

export const WEIGHTS = { like: 1, dislike: -1, flag: -2 } as const;

type NotesOnly = Pick<Scent, 'top_notes' | 'heart_notes' | 'base_notes'>;

interface PlacedNote {
  note: string;
  layer: Layer;
  leads: boolean;
}

function placeNotes(scent: NotesOnly): PlacedNote[] {
  const layers: [Layer, string[]][] = [
    ['top', scent.top_notes],
    ['heart', scent.heart_notes],
    ['base', scent.base_notes],
  ];
  return layers.flatMap(([layer, notes]) =>
    notes.map((note, i) => ({ note, layer, leads: layer === 'top' || i === 0 })),
  );
}

/** Each rule term counts once, at its first (most prominent) matching note. */
function firstMatches(
  terms: readonly string[],
  notes: readonly PlacedNote[],
  accept: (n: PlacedNote, term: string) => boolean = () => true,
): NoteMatch[] {
  const out: NoteMatch[] = [];
  for (const term of terms) {
    const hit = notes.find((n) => termMatchesNote(term, n.note) && accept(n, term));
    if (hit) out.push({ term, note: hit.note, layer: hit.layer });
  }
  return out;
}

function list(matches: readonly NoteMatch[]): string {
  const names = matches.map((m) => m.note);
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * Rules-based "is this for me?" verdict. No AI: it matches the card's notes
 * against the user's own likes, dislikes and flags.
 *
 * Scoring: like +1, dislike −1, flag −2 (each rule counts once).
 *   - no notes, or nothing matches the profile → Mystery
 *   - score ≥ 2 and no flags                    → Yes
 *   - score ≥ 1                                 → Leaning yes
 *   - score ≤ −2                                → No
 *   - otherwise (0 or −1)                       → Leaning no
 * Lounge cues (gourmand/cozy) are never negative: a note that matches one is
 * exempt from dislikes and flags, and the card is nudged towards Lounge.
 *
 * The reason sentence is built from the same match lists that produced the
 * verdict, so the header and the reason can't disagree.
 */
export function computeVerdict(scent: NotesOnly, profile: TasteProfile): VerdictResult {
  const notes = placeNotes(scent);
  const lounge = firstMatches(profile.lounge_cues, notes);
  const isLounge = (n: PlacedNote) => profile.lounge_cues.some((c) => termMatchesNote(c, n.note));
  const leadOnly = new Set(profile.lead_only_flags.map((t) => t.toLowerCase()));

  const flagCounts = (n: PlacedNote, term: string) =>
    !isLounge(n) && (!leadOnly.has(term.toLowerCase()) || n.leads);
  const flags = firstMatches(profile.flags, notes, flagCounts);
  // A flagged note doesn't also count as a like: "powdery musk" is a powdery
  // note, not a musk win.
  const isFlagged = (n: PlacedNote) =>
    profile.flags.some((t) => termMatchesNote(t, n.note) && flagCounts(n, t));
  const likes = firstMatches(profile.likes, notes, (n) => !isFlagged(n));
  const dislikes = firstMatches(profile.dislikes, notes, (n) => !isLounge(n));
  const flaggedTerms = new Set(flags.map((f) => f.term));
  const ignored = firstMatches(
    profile.flags.filter((t) => leadOnly.has(t.toLowerCase()) && !flaggedTerms.has(t)),
    notes,
    (n) => !isLounge(n),
  );

  const score =
    likes.length * WEIGHTS.like + dislikes.length * WEIGHTS.dislike + flags.length * WEIGHTS.flag;
  const suggestedPurpose: Purpose | null = lounge.length > 0 ? 'lounge' : null;
  const base = { score, likes, dislikes, flags, lounge, ignored, suggestedPurpose };
  const negatives = [...flags, ...dislikes];
  const loungeNote = lounge.length > 0 ? ` Cozy notes (${list(lounge)}) point to Lounge.` : '';

  if (notes.length === 0) {
    return {
      ...base,
      verdict: 'mystery',
      reason: 'No notes entered yet, so there is nothing to match.',
    };
  }
  if (likes.length === 0 && negatives.length === 0) {
    return {
      ...base,
      verdict: 'mystery',
      reason: `None of these notes are in your likes, dislikes or flags yet.${loungeNote}`,
    };
  }
  if (score >= 2 && flags.length === 0) {
    const but = dislikes.length > 0 ? ` Minor dislike: ${list(dislikes)}.` : '';
    return {
      ...base,
      verdict: 'yes',
      reason: `Hits your likes: ${list(likes)}.${but}${loungeNote}`,
    };
  }
  if (score >= 1) {
    const but = negatives.length > 0 ? `, which outweigh ${list(negatives)}` : '';
    return {
      ...base,
      verdict: 'leaning_yes',
      reason: `Likes: ${list(likes)}${but}.${loungeNote}`,
    };
  }
  if (score <= -2) {
    const lead = flags.length > 0 ? `Flagged: ${list(flags)}` : `Dislikes: ${list(dislikes)}`;
    const rest = flags.length > 0 && dislikes.length > 0 ? `; also ${list(dislikes)}` : '';
    const despite = likes.length > 0 ? `, despite ${list(likes)}` : '';
    return { ...base, verdict: 'no', reason: `${lead}${rest}${despite}.${loungeNote}` };
  }
  // Here score is 0 or −1 and something matched, so there is at least one negative.
  const outcome = likes.length > 0 ? `cancels out ${list(likes)}` : 'tips it towards no';
  return { ...base, verdict: 'leaning_no', reason: `${list(negatives)} ${outcome}.${loungeNote}` };
}
