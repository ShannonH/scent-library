import { enabledProviders, type AuthProvider } from '../data';
import { errorMessage, field, h, mount, toast } from '../dom';
import type { Ctx } from './common';

const PROVIDER_LABEL: Record<AuthProvider, string> = {
  google: 'Continue with Google',
  apple: 'Continue with Apple',
};

export function renderSignIn(ctx: Ctx): void {
  const demo = ctx.store.mode === 'demo';
  const status = h('p', { class: 'muted small', 'aria-live': 'polite' });

  const form: HTMLFormElement = h(
    'form',
    { class: 'stack form' },
    demo
      ? null
      : h(
          'label',
          null,
          h('span', null, 'Email'),
          h('input', {
            name: 'email',
            type: 'email',
            required: true,
            autocomplete: 'email',
            inputmode: 'email',
            placeholder: 'you@example.com',
          }),
        ),
    h(
      'button',
      { type: 'submit', class: 'primary' },
      demo ? 'Try the demo' : 'Email me a sign-in link',
    ),
    status,
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = field(form, 'email').trim();
    if (!demo && !email) {
      toast('Enter your email', 'error');
      return;
    }
    try {
      await ctx.store.sendMagicLink(email);
      if (!demo) status.textContent = `Check ${email} for a sign-in link. You can close this tab.`;
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  });

  // Google/Apple: enabled per deployment via VITE_AUTH_PROVIDERS once configured in Supabase.
  const providers = demo ? [] : enabledProviders();

  mount(
    ctx.root,
    h(
      'div',
      { class: 'signin stack' },
      h('h1', { class: 'brand-title' }, 'Scent Library'),
      h(
        'p',
        { class: 'lede' },
        'Keep track of perfumes, write down what you notice, and get a quick “is this for me?” read based on your own likes and flags.',
      ),
      demo
        ? h(
            'p',
            { class: 'notice' },
            'Demo mode: no Supabase project is configured, so everything stays in this browser.',
          )
        : null,
      form,
      ...providers.map((p) =>
        h(
          'button',
          {
            type: 'button',
            onclick: () =>
              ctx.store
                .signInWithProvider(p)
                .catch((err: unknown) => toast(errorMessage(err), 'error')),
          },
          PROVIDER_LABEL[p],
        ),
      ),
    ),
  );
}
