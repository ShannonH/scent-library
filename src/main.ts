import './styles.css';
import { createStore } from './data';
import type { SessionUser } from './data/store';
import { errorMessage, h, mount } from './dom';
import { href, parseRoute, type Route } from './router';
import { renderBids } from './views/bids';
import type { Ctx } from './views/common';
import { renderDetail } from './views/detail';
import { renderDupes } from './views/dupes';
import { renderForm } from './views/form';
import { renderLibrary } from './views/library';
import { renderProfile } from './views/profile';
import { renderSignIn } from './views/signin';

const app = document.getElementById('app');
if (!app) throw new Error('#app missing');

const store = createStore();
const main = h('main', { id: 'main', tabindex: '-1' });
const ctx: Ctx = { store, root: main };
let user: SessionUser | null = null;

const NAV: { route: Route; label: string; icon: string }[] = [
  { route: { name: 'library' }, label: 'Library', icon: '❖' },
  { route: { name: 'new' }, label: 'Add', icon: '+' },
  { route: { name: 'dupes' }, label: 'Dupes', icon: '⇄' },
  { route: { name: 'bids' }, label: 'Bids', icon: '$' },
  { route: { name: 'profile' }, label: 'My taste', icon: '♡' },
];

function nav(current: Route): HTMLElement {
  return h(
    'nav',
    { class: 'tabbar', 'aria-label': 'Main' },
    ...NAV.map(({ route, label, icon }) =>
      h(
        'a',
        {
          href: href(route),
          class: route.name === current.name ? 'active' : '',
          'aria-current': route.name === current.name ? 'page' : undefined,
        },
        h('span', { class: 'icon', 'aria-hidden': 'true' }, icon),
        h('span', null, label),
      ),
    ),
  );
}

async function render(): Promise<void> {
  if (!user) {
    mount(app as HTMLElement, main);
    renderSignIn(ctx);
    return;
  }
  const route = parseRoute(window.location.hash);
  const header = h(
    'header',
    { class: 'topbar' },
    h('a', { class: 'brand-title', href: href({ name: 'library' }) }, 'Scent Library'),
    store.mode === 'demo' ? h('span', { class: 'chip demo' }, 'Demo') : null,
  );
  mount(app as HTMLElement, header, main, nav(route));
  try {
    switch (route.name) {
      case 'library':
        return await renderLibrary(ctx);
      case 'scent':
        return await renderDetail(ctx, route.id);
      case 'new':
        return await renderForm(ctx, null);
      case 'edit':
        return await renderForm(ctx, route.id);
      case 'profile':
        return await renderProfile(ctx);
      case 'dupes':
        return await renderDupes(ctx);
      case 'bids':
        return await renderBids(ctx);
    }
  } catch (err) {
    mount(main, h('p', { class: 'notice error' }, `Something went wrong: ${errorMessage(err)}`));
  } finally {
    window.scrollTo(0, 0);
  }
}

const rerender = () => {
  render().catch((err: unknown) => console.error(err));
};
window.addEventListener('hashchange', rerender);
store.onAuthChange((u) => {
  const changed = u?.id !== user?.id;
  user = u;
  if (changed) rerender();
});

user = await store.currentUser();
await render();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
}
