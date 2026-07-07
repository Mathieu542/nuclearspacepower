export function fmt(n, d = 0) {
  if (!isFinite(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function fmtKg(n) {
  if (!isFinite(n)) return '—';
  if (Math.abs(n) >= 1e6) return fmt(n / 1e6, 2) + ' kt';
  if (Math.abs(n) >= 1000) return fmt(n / 1000, 2) + ' t';
  return fmt(n, 0) + ' kg';
}

export function fmtUSD(n) {
  if (!isFinite(n)) return '—';
  if (n >= 1e9) return '$' + fmt(n / 1e9, 2) + 'B';
  if (n >= 1e6) return '$' + fmt(n / 1e6, 2) + 'M';
  return '$' + fmt(n, 0);
}
