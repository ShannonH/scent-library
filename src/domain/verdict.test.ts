import { describe, expect, it } from 'vitest';
import { EMPTY_PROFILE, type TasteProfile } from '../types';
import { STARTER_PROFILE } from './starterProfile';
import { computeVerdict, VERDICT_LABEL, type Verdict } from './verdict';

const profile: TasteProfile = {
  likes: ['bergamot', 'pear', 'jasmine', 'sandalwood', 'musk'],
  dislikes: ['patchouli', 'rose'],
  flags: ['powdery', 'aldehydes', 'oud'],
  lead_only_flags: ['oud'],
  lounge_cues: ['vanilla', 'caramel'],
};

const scent = (top: string[], heart: string[] = [], base: string[] = []) => ({
  top_notes: top,
  heart_notes: heart,
  base_notes: base,
});

describe('computeVerdict', () => {
  it('is Mystery when there are no notes', () => {
    const r = computeVerdict(scent([]), profile);
    expect(r.verdict).toBe('mystery');
    expect(r.reason).toMatch(/No notes/);
  });

  it('is Mystery when notes exist but none are in the profile', () => {
    expect(computeVerdict(scent(['cardamom']), profile).verdict).toBe('mystery');
  });

  it('is Mystery for any card when the profile is empty', () => {
    expect(computeVerdict(scent(['bergamot']), EMPTY_PROFILE).verdict).toBe('mystery');
  });

  it('is Yes with two likes and no flags', () => {
    const r = computeVerdict(scent(['bergamot'], ['jasmine']), profile);
    expect(r.verdict).toBe('yes');
    expect(r.reason).toBe('Hits your likes: bergamot and jasmine.');
  });

  it('is Leaning yes with a single like', () => {
    expect(computeVerdict(scent(['pear']), profile).verdict).toBe('leaning_yes');
  });

  it('never says Yes when a flag is present, however many likes', () => {
    const r = computeVerdict(
      scent(['bergamot', 'pear'], ['jasmine', 'aldehydes'], ['sandalwood', 'musk']),
      profile,
    );
    expect(r.score).toBe(3);
    expect(r.verdict).toBe('leaning_yes');
    expect(r.reason).toMatch(/outweigh aldehydes/);
  });

  it('is No for a flag on its own', () => {
    const r = computeVerdict(scent(['aldehydes']), profile);
    expect(r.verdict).toBe('no');
    expect(r.reason).toBe('Flagged: aldehydes.');
  });

  it('is Leaning no when a dislike cancels a like', () => {
    const r = computeVerdict(scent(['bergamot'], ['rose']), profile);
    expect(r.verdict).toBe('leaning_no');
    expect(r.reason).toBe('rose cancels out bergamot.');
  });

  it('matches whole words only', () => {
    expect(computeVerdict(scent(['rosewood']), profile).verdict).toBe('mystery');
    expect(computeVerdict(scent(['white musk', 'Bergamot']), profile).verdict).toBe('yes');
  });

  it('only counts lead-only flags when the note leads', () => {
    const trace = computeVerdict(scent(['pear'], [], ['sandalwood', 'oud']), profile);
    expect(trace.flags).toHaveLength(0);
    expect(trace.ignored.map((m) => m.term)).toEqual(['oud']);
    expect(trace.verdict).toBe('yes');

    const leading = computeVerdict(scent(['oud', 'pear']), profile);
    expect(leading.flags.map((m) => m.term)).toEqual(['oud']);
    expect(leading.verdict).toBe('leaning_no');
  });

  it('does not count a flagged note as a like too', () => {
    const r = computeVerdict(scent(['aldehydes'], [], ['powdery musk']), profile);
    expect(r.likes).toHaveLength(0);
    expect(r.flags.map((m) => m.term)).toEqual(['powdery', 'aldehydes']);
    expect(r.reason).toBe('Flagged: powdery musk and aldehydes.');
    // ...but a like on a different note still counts.
    const mixed = computeVerdict(scent(['bergamot'], [], ['powdery musk', 'white musk']), profile);
    expect(mixed.likes.map((m) => m.note)).toEqual(['bergamot', 'white musk']);
  });

  it('treats lounge cues as never negative and suggests Lounge', () => {
    const p: TasteProfile = { ...profile, dislikes: ['vanilla'] };
    const r = computeVerdict(scent(['pear'], [], ['vanilla', 'musk']), p);
    expect(r.dislikes).toHaveLength(0);
    expect(r.verdict).toBe('yes');
    expect(r.suggestedPurpose).toBe('lounge');
    expect(r.reason).toMatch(/point to Lounge/);
  });

  it('works with the starter profile', () => {
    const r = computeVerdict(
      scent(['mandarin', 'pear'], ['orange blossom'], ['sandalwood', 'amber']),
      STARTER_PROFILE,
    );
    expect(r.verdict).toBe('yes');
    expect(
      computeVerdict(scent(['aldehydes'], ['iris'], ['powdery musk']), STARTER_PROFILE).verdict,
    ).toBe('no');
  });
});

/**
 * Property check: across every combination of matches, the header (verdict)
 * and the reason must tell the same story.
 */
describe('verdict and reason never contradict', () => {
  const likes = ['l1', 'l2', 'l3', 'l4'];
  const dislikes = ['d1', 'd2', 'd3'];
  const flags = ['f1', 'f2'];
  const p: TasteProfile = { ...EMPTY_PROFILE, likes, dislikes, flags };
  const positive: Verdict[] = ['yes', 'leaning_yes'];
  const negative: Verdict[] = ['no', 'leaning_no'];

  for (let nl = 0; nl <= likes.length; nl++) {
    for (let nd = 0; nd <= dislikes.length; nd++) {
      for (let nf = 0; nf <= flags.length; nf++) {
        const notes = [...likes.slice(0, nl), ...dislikes.slice(0, nd), ...flags.slice(0, nf)];
        it(`${nl} likes / ${nd} dislikes / ${nf} flags`, () => {
          const r = computeVerdict(scent(notes.length ? notes : ['unrelated']), p);
          const negatives = r.flags.length + r.dislikes.length;
          expect(VERDICT_LABEL[r.verdict]).toBeTruthy();
          expect(r.reason.length).toBeGreaterThan(0);

          if (positive.includes(r.verdict)) {
            expect(r.score).toBeGreaterThan(0);
            expect(r.likes.length).toBeGreaterThan(0);
            expect(r.reason).not.toMatch(/^Flagged|tips it towards no|cancels out/);
            for (const m of r.likes) expect(r.reason).toContain(m.note);
          }
          if (r.verdict === 'yes') expect(r.flags).toHaveLength(0);
          if (negative.includes(r.verdict)) {
            expect(r.score).toBeLessThanOrEqual(0);
            expect(negatives).toBeGreaterThan(0);
            expect(r.reason).not.toMatch(/^Hits your likes|outweigh/);
            for (const m of [...r.flags, ...r.dislikes]) expect(r.reason).toContain(m.note);
          }
          if (r.verdict === 'mystery') {
            expect(r.likes.length + negatives).toBe(0);
          } else {
            expect(r.likes.length + negatives).toBeGreaterThan(0);
          }
        });
      }
    }
  }
});
