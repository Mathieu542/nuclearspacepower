import { fmtKg } from './format.js';

/**
 * Short, sober tween for the mass totals: ~280 ms ease-out from the value
 * currently displayed to the new one. No count-up from zero on first render,
 * no overshoot — a slider drag reads as a value settling, not a slot machine.
 * Honors prefers-reduced-motion by snapping instantly.
 */
const anims = new WeakMap();
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DURATION = 280;

export function setKg(el, value, suffixHtml = '') {
  const a = anims.get(el) ?? { value };
  if (a.raf) cancelAnimationFrame(a.raf);
  const from = a.value;
  if (reduced || !isFinite(from) || Math.abs(value - from) < 1e-9) {
    a.value = value; a.raf = null; anims.set(el, a);
    el.innerHTML = fmtKg(value) + suffixHtml;
    return;
  }
  const t0 = performance.now();
  const step = (t) => {
    // Clamp low too: the first rAF timestamp can precede the performance.now()
    // captured above, and a negative k would dip the value below its start.
    const k = Math.min(1, Math.max(0, (t - t0) / DURATION));
    const e = 1 - Math.pow(1 - k, 3); // ease-out cubic
    a.value = from + (value - from) * e;
    el.innerHTML = fmtKg(a.value) + suffixHtml;
    a.raf = k < 1 ? requestAnimationFrame(step) : null;
  };
  a.raf = requestAnimationFrame(step);
  anims.set(el, a);
}
