import { describe, expect, it } from 'vitest';
import { normalizeCode } from './auth';

describe('normalizeCode', () => {
  it.each([
    ['123456', '123456'],
    [' 123 456 ', '123456'],
    ['123-456', '123456'],
    ['12345678', '12345678'],
    ['12345', null],
    ['12345678901', null],
    ['12a456', null],
    ['', null],
  ])('%j → %j', (input, expected) => {
    expect(normalizeCode(input)).toBe(expected);
  });
});
