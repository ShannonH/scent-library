import { CODE_MAX, CODE_MIN, normalizeCode } from '../auth';
import { enabledProviders, type AuthProvider } from '../data';
import { errorMessage, field, h, mount, toast } from '../dom';
import type { Ctx } from './common';

const PROVIDER_LABEL: Record<AuthProvider, string> = {
  google: 'Continue with Google',
  apple: 'Continue with Apple',
};

/**
 * Step 2: the email has both a link and a code. The link is easiest on a
 * computer; the code is what works inside an iPhone home-screen app.
 */
function codeStep(ctx: Ctx, email: string, resend: (email: string) => Promise<void>): HTMLElement {
  const code = h('input', {
    name: 'code',
    inputmode: 'numeric',
    autocomplete: 'one-time-code',
    pattern: '[0-9 \\-]*',
    maxlength: String(CODE_MAX + 4),
    placeholder: '123456',
    class: 'code-input',
  });

  const form: HTMLFormElement = h(
    'form',
    { class: 'stack form' },
    h(
      'p',
      { class: 'notice', 'aria-live': 'polite' },
      'We emailed ',
      h('strong', null, email),
      '. Click the link in it, or type the code from it here.',
    ),
    h('label', null, h('span', null, 'Code from the email'), code),
    h('button', { type: 'submit', class: 'primary' }, 'Sign in'),
    h(
      'small',
      { class: 'muted' },
      'Using the app from your iPhone home screen? Use the code: the link opens Safari, which signs in Safari instead of the app.',
    ),
    h(
      'div',
      { class: 'actions' },
      h(
        'button',
        {
          type: 'button',
          class: 'link',
          onclick: () =>
            resend(email)
              .then(() => toast('New email sent'))
              .catch((err: unknown) => toast(errorMessage(err), 'error')),
        },
        'Send a new email',
      ),
      h(
        'button',
        { type: 'button', class: 'link', onclick: () => renderSignIn(ctx) },
        'Use a different email',
      ),
    ),
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = normalizeCode(code.value);
    if (!token) {
      toast(`Enter the ${CODE_MIN}-digit code from the email`, 'error');
      return;
    }
    const button = form.querySelector<HTMLButtonElement>('button[type=submit]');
    if (button) button.disabled = true;
    try {
      // On success the auth listener in main.ts swaps in the library.
      await ctx.store.verifyEmailCode(email, token);
    } catch (err) {
      toast(errorMessage(err), 'error');
      if (button) button.disabled = false;
    }
  });

  queueMicrotask(() => code.focus());
  return form;
}

export function renderSignIn(ctx: Ctx): void {
  const demo = ctx.store.mode === 'demo';

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
      demo ? 'Try the demo' : 'Email me a sign-in code',
    ),
  );

  const send = async (email: string) => {
    await ctx.store.sendMagicLink(email);
    if (!demo) form.replaceWith(codeStep(ctx, email, send));
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = field(form, 'email').trim();
    if (!demo && !email) {
      toast('Enter your email', 'error');
      return;
    }
    const button = form.querySelector<HTMLButtonElement>('button[type=submit]');
    if (button) button.disabled = true;
    try {
      await send(email);
    } catch (err) {
      toast(errorMessage(err), 'error');
      if (button) button.disabled = false;
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
