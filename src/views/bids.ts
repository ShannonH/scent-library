import { h, mount } from '../dom';
import { BID_RULES, computeBid, money } from '../domain/bid';
import { href } from '../router';
import { loading, type Ctx } from './common';

export async function renderBids(ctx: Ctx): Promise<void> {
  mount(ctx.root, loading());
  const scents = await ctx.store.listScents();
  const out = h('div', { class: 'bid-result', 'aria-live': 'polite' });
  const retail = h('input', {
    type: 'number',
    inputmode: 'decimal',
    min: '0',
    step: '0.01',
    placeholder: 'e.g. 120',
    'aria-label': 'Retail price',
  });
  const mystery = h('input', { type: 'checkbox' });

  const draw = () => {
    const value = retail.value.trim() === '' ? null : Number(retail.value);
    const r = computeBid({ retail: value, mystery: mystery.checked });
    out.replaceChildren(
      r
        ? h(
            'div',
            null,
            h('p', { class: 'big' }, r.skip ? 'Skip it' : `Max bid ${money(r.maxBid)}`),
            h('p', null, `Max total, all-in: ${money(r.maxTotal)}`),
            h('p', { class: 'muted small' }, r.explanation),
          )
        : h('p', { class: 'muted' }, 'Enter a retail price, or tick Mystery bottle.'),
    );
  };
  retail.addEventListener('input', draw);
  mystery.addEventListener('change', draw);

  const wishlist = scents
    .filter((s) => !s.have && s.price !== null && s.status !== 'nope' && s.status !== 'hell no')
    .map((s) => ({ s, r: computeBid({ retail: s.price, mystery: false }) }))
    .filter((x) => x.r !== null);

  mount(
    ctx.root,
    h(
      'div',
      { class: 'stack' },
      h('h1', null, 'Bid calculator'),
      h(
        'section',
        { class: 'panel stack' },
        h('label', null, h('span', null, 'Retail price'), retail),
        h('label', { class: 'check' }, mystery, 'Mystery bottle'),
        out,
        h(
          'p',
          { class: 'muted small' },
          `Rules: max total is ${BID_RULES.maxTotalShare * 100}% of retail; max bid is that minus ${money(BID_RULES.feeAllowance)} for fees; mystery bottles are capped at a ${money(BID_RULES.mysteryCap)} bid.`,
        ),
      ),
      wishlist.length
        ? h(
            'section',
            { class: 'panel' },
            h('h3', null, 'From your library'),
            h(
              'table',
              { class: 'bid-table' },
              h(
                'thead',
                null,
                h(
                  'tr',
                  null,
                  h('th', null, 'Scent'),
                  h('th', null, 'Retail'),
                  h('th', null, 'Max bid'),
                ),
              ),
              h(
                'tbody',
                null,
                ...wishlist.map(({ s, r }) =>
                  h(
                    'tr',
                    null,
                    h('td', null, h('a', { href: href({ name: 'scent', id: s.id }) }, s.name)),
                    h('td', null, money(s.price ?? 0)),
                    h('td', null, r && !r.skip ? money(r.maxBid) : 'Skip'),
                  ),
                ),
              ),
            ),
          )
        : null,
    ),
  );
  draw();
}
