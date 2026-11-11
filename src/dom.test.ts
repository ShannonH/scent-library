// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { h } from './dom';

describe('h()', () => {
  it('sets value on textareas and inputs', () => {
    expect(h('textarea', { value: 'pear, musk' }).value).toBe('pear, musk');
    expect(h('input', { value: 'Moonlit' }).value).toBe('Moonlit');
  });

  it('renders user text as text, never as markup', () => {
    const el = h('p', null, '<img src=x onerror=alert(1)>');
    expect(el.children).toHaveLength(0);
    expect(el.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('handles booleans, classes and listeners', () => {
    let clicked = 0;
    const el = h('input', {
      type: 'checkbox',
      checked: true,
      disabled: false,
      class: 'a b',
      onclick: () => clicked++,
    });
    el.click();
    expect(el.className).toBe('a b');
    expect(el.disabled).toBe(false);
    expect(clicked).toBe(1);
  });

  it('skips null, undefined and false children', () => {
    expect(h('div', null, null, undefined, false, 'x', 0).textContent).toBe('x0');
  });
});
