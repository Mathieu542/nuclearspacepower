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

  // Split the round-trip loss evenly between charge and discharge.
  const etaOneWay = Math.sqrt(p.seff);
  const eEclipseWh = Pw * tEclipse_h;
  const eBattNeededWh = tEclipse_h > 0 ? eEclipseWh / etaOneWay / p.sdod : 0;
  const mBattery = eBattNeededWh / p.sbat;

  let pArrayNeeded;
  if (tSun_h > 0) {
    const pRecharge = eEclipseWh / etaOneWay / tSun_h;
    pArrayNeeded = Pw + pRecharge;
  } else {
    pArrayNeeded = Pw; // always sunlit
  }
  const degradTotal = Math.min(0.9, p.sdeg * p.life);
  const pArrayBOL = pArrayNeeded / (1 - degradTotal);
  const mArray = pArrayBOL / p.ssp;
  const mPmad = p.spmad * p.power;

  const subtotal = mArray + mBattery + mPmad;
  const total = subtotal * (1 + (p.margin ?? 0));
  return {
    mArray, mBattery, mPmad, subtotal, total,
    fe, tEclipse_h, tSun_h, T, eBattNeededWh, pArrayBOL,
  };
}
