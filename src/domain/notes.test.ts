import { describe, expect, it } from 'vitest';
import { parseNotes, termMatchesNote } from './notes';

describe('parseNotes', () => {
  it('splits on commas, semicolons and newlines, trims and de-duplicates', () => {
    expect(parseNotes(' bergamot, Pear;  white   musk\nbergamot ,, ')).toEqual([
      'bergamot',
      'Pear',
      'white musk',
    ]);
  });
});

describe('termMatchesNote', () => {
  it.each([
    ['musk', 'white musk', true],
    ['rose', 'rosewood', false],
    ['aldehyde', 'Aldehydes', true],
    ['orange blossom', 'Orange Blossom absolute', true],
    ['orange blossom', 'blood orange', false],
    ['creme brulee', 'Crème brûlée', true],
    ['', 'musk', false],
  ])('%s vs %s → %s', (term, note, expected) => {
    expect(termMatchesNote(term, note)).toBe(expected);
  });
});
