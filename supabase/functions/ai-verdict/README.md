# ai-verdict (placeholder, not built)

**Version 1 has no AI.** This folder marks where an AI verdict would live if it is
added later. Nothing here is deployed.

The rule for any future version: the model API key lives only in Supabase secrets
(`supabase secrets set ...`) and is read inside this Edge Function. It never goes
in the browser bundle, in `.env.local`, or in the GitHub Actions variables.

Sketch of the flow:

1. The browser calls `supabase.functions.invoke('ai-verdict', { body: { scentId } })`
   with the signed-in user's session.
2. The function creates a Supabase client with the caller's JWT (not the
   service-role key), so row-level security still limits it to that user's rows.
3. It loads the scent and the user's taste profile, calls the model, and returns
   `{ verdict, reason }` using the same verdict values as `src/domain/verdict.ts`.
4. The UI shows it beside the rules-based verdict, labelled as AI.

The client-side hook is `src/ai/aiVerdict.ts`, currently switched off.
