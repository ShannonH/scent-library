/** Split a free-text note list ("bergamot, pear; white musk") into clean notes. */
export function parseNotes(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[,;\n]/)) {
    const note = raw.trim().replace(/\s+/g, ' ');
    const key = note.toLowerCase();
    if (note && !seen.has(key)) {
      seen.add(key);
      out.push(note);
    }
  }
  return out;
}

export function formatNotes(notes: readonly string[]): string {
  return notes.join(', ');
}

export function normalize(term: string): string {
  return term
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Does a rule term match a note? Whole-word match, so "musk" matches "white musk"
 * but "rose" does not match "rosewood". A trailing "s" is tolerated either way
 * ("aldehyde" ~ "aldehydes").
 */
export function termMatchesNote(term: string, note: string): boolean {
  const t = normalize(term);
  const n = normalize(note);
  if (!t || !n) return false;
  const words = n.split(' ');
  const termWords = t.split(' ');
  const same = (a: string, b: string) => a === b || a + 's' === b || a === b + 's';
  for (let i = 0; i + termWords.length <= words.length; i++) {
    if (termWords.every((w, j) => same(w, words[i + j] ?? ''))) return true;
  }
  return false;
}
