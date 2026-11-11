/*
 * ─────────────────────────────────────────────────────────────────────────────
 *  FUTURE AI VERDICTS — NOT ENABLED IN THIS VERSION
 * ─────────────────────────────────────────────────────────────────────────────
 *  Version 1 uses only the rules-based verdict in src/domain/verdict.ts.
 *
 *  If AI verdicts are added later, they must run server-side, for example as a
 *  Supabase Edge Function (see supabase/functions/ai-verdict/README.md), so the
 *  model API key lives in Supabase secrets and never in this client bundle.
 *  The browser would call it with the user's own session token:
 *
 *    const { data } = await supabase.functions.invoke('ai-verdict', {
 *      body: { scentId },
 *    });
 *
 *  The Edge Function would load the scent and profile with the caller's JWT
 *  (so RLS still applies), call the model, and return { verdict, reason } in
 *  the same shape as VerdictResult so the UI can show it beside the rules one.
 *
 *  Until then this always returns null and the UI never calls the network.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { Verdict } from '../domain/verdict';

export interface AiVerdict {
  verdict: Verdict;
  reason: string;
}

export const AI_VERDICTS_ENABLED = false;

export async function fetchAiVerdict(scentId: string): Promise<AiVerdict | null> {
  if (!AI_VERDICTS_ENABLED) return null;
  throw new Error(`AI verdicts are not implemented yet (scent ${scentId})`);
}
