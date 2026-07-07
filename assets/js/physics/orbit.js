import { RE, MU } from './constants.js';

/** Orbital period of a circular orbit at altitude h (km), in seconds. */
export function periodSeconds(h) {
  const r = RE + h;
  return 2 * Math.PI * Math.sqrt(r ** 3 / MU);
}

/**
 * Fraction of the orbit spent in Earth's shadow, cylindrical shadow model.
 * @param {number} h    circular orbit altitude, km
 * @param {number} beta orbit beta angle, degrees (0 = worst case, 90 = terminator)
 */
export function eclipseFraction(h, beta) {
  const r = RE + h;
  const x = Math.sqrt(Math.max(r * r - RE * RE, 0)) / r;
  const cosB = Math.cos((beta * Math.PI) / 180);
  if (cosB < 1e-6) return 0;
  const val = x / cosB;
  if (val >= 1) return 0; // fully sunlit orbit
  return Math.acos(val) / Math.PI;
}
