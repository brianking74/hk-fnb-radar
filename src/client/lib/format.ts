// Date and number formatting helpers. Dates render as ISO input or
// '17 Jun 2027'; days-left comes from the server for ExpiryItem and is
// computed client-side only where the API does not supply it.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** Parses the date part of an ISO string ('2027-06-17T00:00:00Z' → parts). */
function parseIsoDateParts(iso: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const y = Number.parseInt(m[1] ?? '', 10);
  const month = Number.parseInt(m[2] ?? '', 10);
  const d = Number.parseInt(m[3] ?? '', 10);
  if (!Number.isFinite(y) || !Number.isFinite(month) || !Number.isFinite(d)) return null;
  if (month < 1 || month > 12) return null;
  return { y, m: month, d };
}

/** '2027-06-17' | '2027-06-17T09:30:00Z' → '17 Jun 2027'; null → '—'. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const parts = parseIsoDateParts(iso);
  if (!parts) return iso;
  const monthName = MONTHS[parts.m - 1] ?? '?';
  return `${parts.d} ${monthName} ${parts.y}`;
}

/** Whole days between two ISO date strings (calendar days, UTC-based). */
export function daysUntil(targetIso: string, fromIso: string = new Date().toISOString()): number {
  const a = parseIsoDateParts(targetIso);
  const b = parseIsoDateParts(fromIso);
  if (!a || !b) return 0;
  const toUtc = Date.UTC(a.y, a.m - 1, a.d);
  const fromUtc = Date.UTC(b.y, b.m - 1, b.d);
  return Math.round((toUtc - fromUtc) / 86_400_000);
}

/** Localised days-left text (0 → 'Expires today'). */
export function formatDaysLeft(days: number, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (days <= 0) return t('days_left.zero');
  if (days === 1) return t('days_left.one');
  return t('days_left.other', { count: days });
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/** First non-empty display name for an entity-like record. */
export function displayName(nameEn: string | null, nameTc: string | null, fallback: string): string {
  if (nameEn && nameEn.trim()) return nameEn;
  if (nameTc && nameTc.trim()) return nameTc;
  return fallback;
}

/** Total pages for a paginated response (minimum 1). */
export function totalPages(total: number, pageSize: number): number {
  if (pageSize < 1) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}
