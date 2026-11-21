// Google Places (New) enrichment: one searchText call per licence record,
// conservative name matching, and nothing stored without attribution.
// Cuisine comes from place types; website/phone contacts and the googleMapsUri
// are stored with source_name 'Google Places' + the place URI as source_url.

import type { Entity } from '../../shared/types';

const GENERIC_TOKENS = new Set([
  'RESTAURANT', 'LTD', 'LIMITED', 'COMPANY', 'CO', 'HK', 'HONG', 'KONG',
  'THE', 'AND', 'OF', 'NO', 'RECORD', 'FOUND', 'BAR', 'SHOP', 'STORE'
]);

function nameTokens(name: string): string[] {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !GENERIC_TOKENS.has(t));
}

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';

/** fetch with ONE retry, 5xx/network only. Never retry 429 — every successful
 * call is billed, and retry storms are how a run burns 30× its budget. */
async function fetchWithPlacesRetry(url: string, init: RequestInit): Promise<Response> {
  let res = await fetch(url, init);
  if (res.status >= 500) {
    await new Promise((r) => setTimeout(r, 1500));
    res = await fetch(url, init);
  }
  return res;
}

export interface PlacesCandidate {
  displayName: string;
  formattedAddress: string | null;
  types: string[];
  primaryType: string | null;
  websiteUri: string | null;
  nationalPhoneNumber: string | null;
  googleMapsUri: string | null;
}

interface PlacesSearchResponse {
  places?: {
    displayName?: { text?: string };
    formattedAddress?: string;
    types?: string[];
    primaryTypeDisplayName?: { text?: string };
    websiteUri?: string;
    nationalPhoneNumber?: string;
    googleMapsUri?: string;
  }[];
}

function isPlaceholder(name: string | null): boolean {
  if (!name) return true;
  const up = name.toUpperCase();
  return up.includes('NO RECORD FOUND') || up.trim().length < 2;
}

function overlapScore(a: string, b: string): { score: number; common: string[] } {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  const setB = new Set(tb);
  const common = ta.filter((t) => setB.has(t));
  const denom = Math.min(ta.length, tb.length);
  const score = denom === 0 ? 0 : common.length / denom;
  return { score, common };
}

/** Conservative match: strong name-token overlap with a distinctive token. */
export function pickBestMatch(
  entityName: string,
  entityNameTc: string | null,
  candidates: PlacesCandidate[]
): PlacesCandidate | null {
  let best: { cand: PlacesCandidate; score: number } | null = null;
  for (const cand of candidates) {
    const displayName = cand.displayName ?? '';
    const { score, common } = overlapScore(entityName, displayName);
    const hasDistinctive = common.some((t) => t.length >= 3);
    let effective = hasDistinctive ? score : 0;
    // Chinese-only fallback: substring containment of the TC name.
    if (effective === 0 && entityNameTc && displayName && entityNameTc.length >= 2) {
      if (displayName.includes(entityNameTc) || entityNameTc.includes(displayName)) {
        effective = 1;
      }
    }
    if (effective >= 0.5 && (!best || effective > best.score)) {
      best = { cand, score: effective };
    }
  }
  return best?.cand ?? null;
}

const GENERIC_TYPES = new Set([
  'restaurant', 'food', 'point_of_interest', 'establishment', 'meal_takeaway',
  'meal_delivery', 'store', 'lodging', 'night_club'
]);

/** primaryTypeDisplayName ("North Indian restaurant") -> "North Indian". */
export function cuisineFromPrimary(primary: string | null): string | null {
  if (!primary) return null;
  const cleaned = primary
    .replace(/\s*(restaurant|cafe|coffee shop|bar|food stand)$/i, '')
    .trim();
  if (cleaned.length >= 2) return cleaned;
  if (/^coffee shop$/i.test(primary)) return 'Coffee';
  return null;
}

/** Fallback: most specific *_restaurant type -> title-cased cuisine. */
export function cuisineFromTypes(types: string[]): string | null {
  const specific = types.find((t) => t.endsWith('_restaurant') && !GENERIC_TYPES.has(t));
  if (!specific) return null;
  const label = specific.replace(/_restaurant$/, '');
  return label
    .split('_')
    .map((w) => (w ? (w[0] ?? '').toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export interface PlacesMatch {
  cuisine: string | null;
  website: string | null;
  phone: string | null;
  mapsUri: string | null;
  matchedName: string;
  address: string | null;
}

export async function searchPlacesForEntity(
  apiKey: string,
  entity: Pick<Entity, 'name_en' | 'name_tc' | 'district_en' | 'address_en'>
): Promise<PlacesMatch | null> {
  const queryName = isPlaceholder(entity.name_en) ? null : entity.name_en;
  const useTc = queryName === null && !!entity.name_tc;
  const name = queryName ?? entity.name_tc;
  if (!name) return null;

  const parts = [name, entity.district_en, 'Hong Kong'].filter(Boolean);
  const textQuery = parts.join(', ');

  const res = await fetchWithPlacesRetry(PLACES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.displayName,places.formattedAddress,places.types,places.primaryTypeDisplayName,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri'
    },
    body: JSON.stringify({ textQuery, languageCode: 'en', regionCode: 'HK', pageSize: 8 })
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`places searchText HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as PlacesSearchResponse;
  const candidates: PlacesCandidate[] = (data.places ?? []).map((p) => ({
    displayName: p.displayName?.text ?? '',
    formattedAddress: p.formattedAddress ?? null,
    types: p.types ?? [],
    primaryType: p.primaryTypeDisplayName?.text ?? null,
    websiteUri: p.websiteUri ?? null,
    nationalPhoneNumber: p.nationalPhoneNumber ?? null,
    googleMapsUri: p.googleMapsUri ?? null
  }));

  const best = pickBestMatch(name, useTc ? name : entity.name_tc, candidates);
  if (!best) return null;

  const cuisine = cuisineFromPrimary(best.primaryType) ?? cuisineFromTypes(best.types);
  return {
    cuisine,
    website: best.websiteUri ?? null,
    phone: best.nationalPhoneNumber ?? null,
    mapsUri: best.googleMapsUri ?? null,
    matchedName: best.displayName,
    address: best.formattedAddress
  };
}
