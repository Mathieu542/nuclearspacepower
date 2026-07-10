import { periodSeconds, eclipseFraction } from './orbit.js';

/**
 * First-order mass model of a photovoltaic + battery power system.
 * The array must power the payload in sunlight AND recharge the battery
 * before the next eclipse (steady periodic operation). The array is
 * oversized at BOL to hold end-of-life power after linear degradation.
 *
 * @param {object} p    model state (see config.js)
 * @param {number} h    altitude override, km (defaults to p.alt)
 * @param {number} beta beta angle override, deg (defaults to p.beta)
 * @returns breakdown and total mass in kg
 */
export function solarMass(p, h = p.alt, beta = p.beta) {
  const T = periodSeconds(h);
  const fe = eclipseFraction(h, beta);
  const tEclipse_h = (fe * T) / 3600;
  const tSun_h = ((1 - fe) * T) / 3600;
  const Pw = p.power * 1000;

  // Battery capacity: the cells must deliver the eclipse energy through the
  // discharge leg only, so divide by the one-way (discharge) efficiency √η_rt.
  const etaOneWay = Math.sqrt(p.seff);
  const eEclipseWh = Pw * tEclipse_h;
  const eBattNeededWh = tEclipse_h > 0 ? eEclipseWh / etaOneWay / p.sdod : 0;
  const mBattery = eBattNeededWh / p.sbat;

  let pArrayNeeded;
  if (tSun_h > 0) {
    // Array recharge power: restoring the cells costs the FULL round-trip loss
    // (charge leg to refill + discharge leg already spent), so divide by η_rt.
    const pRecharge = eEclipseWh / p.seff / tSun_h;
    pArrayNeeded = Pw + pRecharge;
  } else {
    pArrayNeeded = Pw; // always sunlit
  }
  const degradTotal = Math.min(0.9, p.sdeg * p.life);
  const pArrayBOL = pArrayNeeded / (1 - degradTotal);
  const mArray = pArrayBOL / p.ssp;

  const subtotal = mArray + mBattery;
  const total = subtotal;
  return {
    mArray, mBattery, subtotal, total,
    fe, tEclipse_h, tSun_h, T, eBattNeededWh, pArrayBOL,
  };
}
