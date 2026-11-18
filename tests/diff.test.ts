import { describe, expect, it } from 'vitest';
import { diffKeysets } from '../src/worker/ingest/diff';

describe('diffKeysets', () => {
  it('detects added, changed and removed licence numbers', () => {
    const diff = diffKeysets(
      { A: 'fp-a', B: 'fp-b', C: 'fp-c' },
      { A: 'fp-a', B: 'fp-b2', D: 'fp-d' }
    );
    expect(diff.added).toEqual(['D']);
    expect(diff.changed).toEqual(['B']);
    expect(diff.removed).toEqual(['C']);
  });

  it('returns nothing when the datasets are identical (safe re-run)', () => {
    const keyset = { A: 'fp-a', B: 'fp-b' };
    const diff = diffKeysets(keyset, { ...keyset });
    expect(diff).toEqual({ added: [], changed: [], removed: [] });
  });

  it('treats an empty previous keyset as all-added (baseline)', () => {
    const diff = diffKeysets({}, { A: 'fp-a', B: 'fp-b' });
    expect(diff.added).toEqual(['A', 'B']);
    expect(diff.changed).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  it('a record that reappears after absence is "added" again', () => {
    // Snapshot 1: {A}. Snapshot 2: {} (A no longer appearing). Snapshot 3: {A}.
    const diff = diffKeysets({}, { A: 'fp-a' });
    expect(diff.added).toEqual(['A']);
  });
});
