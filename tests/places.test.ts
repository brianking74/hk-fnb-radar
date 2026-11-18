import { describe, expect, it } from 'vitest';
import { cuisineFromPrimary, cuisineFromTypes, pickBestMatch, type PlacesCandidate } from '../src/worker/enrich/places';

function cand(name: string): PlacesCandidate {
  return {
    displayName: name,
    formattedAddress: null,
    types: [],
    primaryType: null,
    websiteUri: null,
    nationalPhoneNumber: null,
    googleMapsUri: null
  };
}

describe('pickBestMatch', () => {
  it('prefers the strongest name match, not result rank', () => {
    // Licence name has a typo twin ranked first and the exact match second.
    const best = pickBestMatch('A. KASHMIR CURRY HOUSE ALIBABA', null, [
      cand('Kasmir Curry House'),
      cand('A Kashmir Curry House')
    ]);
    expect(best?.displayName).toBe('A Kashmir Curry House');
  });

  it('rejects candidates with no distinctive shared token', () => {
    expect(pickBestMatch('GOLDEN DRAGON RESTAURANT', null, [cand('Silver Phoenix Lounge')])).toBeNull();
  });

  it('ignores generic tokens (ltd, hong kong, restaurant)', () => {
    const best = pickBestMatch('MEAT CUISINE HIRO LIMITED', null, [cand('Meat Cuisine Hiro')]);
    expect(best?.displayName).toBe('Meat Cuisine Hiro');
  });

  it('uses Traditional Chinese containment when EN tokens fail', () => {
    const best = pickBestMatch('( NO RECORD FOUND)', '海港酒家', [cand('海港酒家'), cand('其他餐廳')]);
    expect(best?.displayName).toBe('海港酒家');
  });

  it('returns null for an empty candidate list', () => {
    expect(pickBestMatch('Anything', null, [])).toBeNull();
  });
});

describe('cuisine extraction', () => {
  it('strips the trailing kind from primaryTypeDisplayName', () => {
    expect(cuisineFromPrimary('North Indian restaurant')).toBe('North Indian');
    expect(cuisineFromPrimary('Coffee shop')).toBe('Coffee');
    expect(cuisineFromPrimary('Bar')).toBe(null); // too short after strip
  });

  it('falls back to the most specific *_restaurant type', () => {
    expect(
      cuisineFromTypes(['point_of_interest', 'thai_restaurant', 'restaurant', 'food', 'establishment'])
    ).toBe('Thai');
    expect(cuisineFromTypes(['establishment', 'food'])).toBe(null);
  });
});
