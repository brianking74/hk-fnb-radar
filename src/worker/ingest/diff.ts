// Keyset diff between two daily snapshots of one dataset.
// A keyset maps licence number -> fingerprint of the watched fields.

export interface KeysetDiff {
  /** Present now, absent from the previous snapshot. */
  added: string[];
  /** Present in both, but the fingerprint changed. */
  changed: string[];
  /** In the previous snapshot, no longer appearing now. */
  removed: string[];
}

export function diffKeysets(previous: Record<string, string>, current: Record<string, string>): KeysetDiff {
  const added: string[] = [];
  const changed: string[] = [];
  for (const [licno, fp] of Object.entries(current)) {
    const prev = previous[licno];
    if (prev === undefined) {
      added.push(licno);
    } else if (prev !== fp) {
      changed.push(licno);
    }
  }
  const removed = Object.keys(previous).filter((licno) => !(licno in current));
  return { added, changed, removed };
}
