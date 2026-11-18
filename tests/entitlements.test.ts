import { describe, expect, it } from 'vitest';
import { TIER_LIMITS, resolveTier } from '../src/worker/entitlements';

describe('tier configuration', () => {
  it('defines the three monetisation tiers', () => {
    expect(Object.keys(TIER_LIMITS).sort()).toEqual(['business', 'free', 'professional']);
  });

  it('grows entitlements with tier', () => {
    expect(TIER_LIMITS.free.signals_lookback_days).toBe(7);
    expect(TIER_LIMITS.professional.signals_lookback_days).toBe(90);
    expect(TIER_LIMITS.business.signals_lookback_days).toBe(365);

    expect(TIER_LIMITS.free.expiry_window_days).toBe(90);
    expect(TIER_LIMITS.professional.expiry_window_days).toBe(180);
    expect(TIER_LIMITS.business.expiry_window_days).toBe(365);

    expect(TIER_LIMITS.free.export).toBe(false);
    expect(TIER_LIMITS.professional.export).toBe(true);
    expect(TIER_LIMITS.business.api_access).toBe(true);
    expect(TIER_LIMITS.free.api_access).toBe(false);
  });
});

describe('resolveTier (Release 1)', () => {
  it('resolves every request to FREE while there is no authentication', async () => {
    const resolved = await resolveTier({} as Env);
    expect(resolved.tier).toBe('free');
    expect(resolved.limits).toBe(TIER_LIMITS.free);
  });

  it('honours the dev-only TIER_OVERRIDE preview seam', async () => {
    const pro = await resolveTier({ TIER_OVERRIDE: 'professional' } as Env);
    expect(pro.tier).toBe('professional');
    expect(pro.limits).toBe(TIER_LIMITS.professional);
    expect(pro.limits.view_enrichment).toBe(true);
  });
});
