/** Bid-limit rules for live-auction shopping. */
export const BID_RULES = {
  /** Never pay more than this share of retail, all-in (bid + shipping/fees). */
  maxTotalShare: 0.6,
  /** Room left for shipping/fees between the max bid and the max total. */
  feeAllowance: 5,
  /** Mystery bottles are capped at this bid. */
  mysteryCap: 10,
} as const;

export interface BidInput {
  /** Retail price; null when unknown. */
  retail: number | null;
  mystery: boolean;
}

export interface BidResult {
  maxTotal: number;
  maxBid: number;
  /** Plain-language explanation of how the numbers were reached. */
  explanation: string;
  /** True when the rules leave nothing to bid. */
  skip: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
export const money = (n: number) => `$${n.toFixed(2)}`;

/**
 * Max total = 60% of retail; max bid = max total − $5; mystery bottles are
 * capped at a $10 bid. Returns null when there is nothing to calculate from.
 */
export function computeBid({ retail, mystery }: BidInput): BidResult | null {
  const hasRetail = retail !== null && Number.isFinite(retail) && retail > 0;
  if (!hasRetail && !mystery) return null;

  const { maxTotalShare, feeAllowance, mysteryCap } = BID_RULES;
  let maxTotal: number;
  let maxBid: number;
  let explanation: string;

  if (hasRetail) {
    maxTotal = round2(retail * maxTotalShare);
    maxBid = Math.max(0, round2(maxTotal - feeAllowance));
    explanation = `60% of ${money(retail)} retail is ${money(maxTotal)} all-in; minus ${money(feeAllowance)} for fees leaves a ${money(maxBid)} bid.`;
  } else {
    maxBid = mysteryCap;
    maxTotal = mysteryCap + feeAllowance;
    explanation = `Mystery bottle with no retail price: bid up to ${money(mysteryCap)}.`;
  }

  if (hasRetail && mystery && maxBid > mysteryCap) {
    maxBid = mysteryCap;
    maxTotal = mysteryCap + feeAllowance;
    explanation += ` Mystery cap applies, so bid no more than ${money(mysteryCap)}.`;
  }

  const skip = maxBid <= 0;
  if (skip) explanation += ' That leaves nothing to bid, so skip it.';
  return { maxTotal, maxBid, explanation, skip };
}
