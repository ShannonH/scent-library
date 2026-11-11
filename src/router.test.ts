import { describe, expect, it } from 'vitest';
import { href, parseRoute } from './router';

describe('router', () => {
  it.each([
    ['', { name: 'library' }],
    ['#/', { name: 'library' }],
    ['#/scent/abc', { name: 'scent', id: 'abc' }],
    ['#/edit/abc', { name: 'edit', id: 'abc' }],
    ['#/edit', { name: 'library' }],
    ['#/new', { name: 'new' }],
    ['#/profile', { name: 'profile' }],
    ['#/dupes', { name: 'dupes' }],
    ['#/bids', { name: 'bids' }],
    ['#/nonsense', { name: 'library' }],
  ])('parses %s', (hash, route) => {
    expect(parseRoute(hash)).toEqual(route);
  });

  it('round-trips', () => {
    expect(parseRoute(href({ name: 'scent', id: 'x-1' }))).toEqual({ name: 'scent', id: 'x-1' });
  });
});
