import { nuclearMass } from './nuclear.js';
import { solarMass } from './solar.js';

/**
 * Break-even electrical power (kWe) at which nuclear and solar total masses
 * cross, all other parameters held at their current values.
 * Returns null if there is no crossing inside [pMin, pMax].
 */
export function breakEvenPower(p, pMin = 1, pMax = 10000) {
  const diff = (P) =>
    nuclearMass({ ...p, power: P }).total - solarMass({ ...p, power: P }).total;
  let lo = pMin, hi = pMax;
  const dLo = diff(lo), dHi = diff(hi);
  if (dLo * dHi > 0) return null; // no sign change → no crossing in range
  for (let i = 0; i < 60; i++) {
    const mid = Math.sqrt(lo * hi); // bisect in log space
    if (diff(lo) * diff(mid) <= 0) hi = mid; else lo = mid;
  }
  return Math.sqrt(lo * hi);
}
