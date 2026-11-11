import { describe, expect, it } from 'vitest';
import { computeBid } from './bid';

describe('computeBid', () => {
  it('uses 60% of retail as the max total and $5 less as the max bid', () => {
    expect(computeBid({ retail: 100, mystery: false })).toMatchObject({
      maxTotal: 60,
      maxBid: 55,
      skip: false,
    });
  });

  it('rounds to cents', () => {
    expect(computeBid({ retail: 79.99, mystery: false })).toMatchObject({
      maxTotal: 47.99,
      maxBid: 42.99,
    });
  });

  it('caps mystery bottles at a $10 bid', () => {
    const r = computeBid({ retail: 150, mystery: true });
    expect(r).toMatchObject({ maxBid: 10, maxTotal: 15 });
    expect(r?.explanation).toMatch(/Mystery cap/);
  });

  it('keeps a lower retail-based bid for a cheap mystery bottle', () => {
    expect(computeBid({ retail: 20, mystery: true })).toMatchObject({ maxTotal: 12, maxBid: 7 });
  });

  it('gives a mystery bottle with no retail the $10 cap', () => {
    expect(computeBid({ retail: null, mystery: true })).toMatchObject({ maxBid: 10, maxTotal: 15 });
  });

  it('says skip when 60% of retail does not cover the fee allowance', () => {
    const r = computeBid({ retail: 8, mystery: false });
    expect(r).toMatchObject({ maxBid: 0, skip: true });
  });

  it('returns null with nothing to go on', () => {
    expect(computeBid({ retail: null, mystery: false })).toBeNull();
    expect(computeBid({ retail: 0, mystery: false })).toBeNull();
    expect(computeBid({ retail: Number.NaN, mystery: false })).toBeNull();
  });
});
