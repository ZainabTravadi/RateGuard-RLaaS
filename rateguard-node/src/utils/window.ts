/**
 * Parse window strings like '1m', '10s', '1h' into seconds.
 */
export function parseWindowToSeconds(input: string | number | undefined, fallback = 60): number {
  if (typeof input === 'number') return Math.max(1, Math.floor(input));
  if (!input || typeof input !== 'string') return fallback;

  const trimmed = input.trim().toLowerCase();
  const m = trimmed.match(/^(\d+)\s*s$/);
  if (m) return Number(m[1]);
  const mm = trimmed.match(/^(\d+)\s*m$/);
  if (mm) return Number(mm[1]) * 60;
  const h = trimmed.match(/^(\d+)\s*h$/);
  if (h) return Number(h[1]) * 3600;
  const d = trimmed.match(/^(\d+)\s*d$/);
  if (d) return Number(d[1]) * 86400;

  // bare number
  const n = Number(trimmed);
  if (!Number.isNaN(n)) return Math.max(1, Math.floor(n));

  return fallback;
}
