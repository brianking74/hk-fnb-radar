import type { Tier } from '../shared/types';

export interface TierLimits {
  /** How far back the signals feed reaches. */
  signals_lookback_days: number;
  max_page_size: number;
  export: boolean;
  /** How far ahead the expiry-watch window reaches. */
  expiry_window_days: number;
  saved_searches: number;
  api_access: boolean;
}

// Monetisation tiers (Release 2 — Stripe Checkout/Billing/Customer Portal).
// FREE      HK$0/month
// PROFESSIONAL HK$149/month
// BUSINESS  HK$299/month
export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: {
    signals_lookback_days: 7,
    max_page_size: 25,
    export: false,
    expiry_window_days: 90,
    saved_searches: 0,
    api_access: false
  },
  professional: {
    signals_lookback_days: 90,
    max_page_size: 100,
    export: true,
    expiry_window_days: 180,
    saved_searches: 25,
    api_access: false
  },
  business: {
    signals_lookback_days: 365,
    max_page_size: 100,
    export: true,
    expiry_window_days: 365,
    saved_searches: 200,
    api_access: true
  }
};

// Release 1: there are no authenticated users yet, so every request resolves
// to the FREE tier. Release 2 will resolve the tier from the `subscriptions`
// table (Stripe customer id -> active subscription), keeping enforcement
// entirely server-side.
export async function resolveTier(_db: D1Database): Promise<{ tier: Tier; limits: TierLimits }> {
  const tier: Tier = 'free';
  return { tier, limits: TIER_LIMITS[tier] };
}
