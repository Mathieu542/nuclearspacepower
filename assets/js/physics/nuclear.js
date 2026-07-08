import { SIGMA } from './constants.js';

/**
 * First-order mass model of a fission power system: reactor core sized by
 * thermal power, power-conversion equipment sized by electrical output,
 * radiator sized by radiative balance (Stefan-Boltzmann), fixed shadow-shield
 * mass.
 *
 * The core/conversion split matters physically: the fission core (fuel,
 * structure) is sized by the thermal power it must produce, while the
 * turbine/alternator (or Stirling convertors) are sized by electrical output.
 * Keeping them coupled through a single electric specific-power figure would
 * make the conversion-efficiency slider only affect waste heat, never mass —
 * which is not physically consistent.
 *
 * Power management & distribution is not modeled — it's common to both
 * architectures and not a discriminating factor between them.
 *
 * Altitude-independent by design — that is the architectural point.
 *
 * @param {object} p model state (see config.js for field definitions)
 * @returns breakdown and total mass in kg
 */
export function nuclearMass(p) {
  const Pw = p.power * 1000;                 // required electrical power, W
  const pThermal = Pw / p.neta;              // reactor thermal power, W
  const pWaste = pThermal - Pw;              // heat to reject, W
  const aRad = pWaste / (p.neps * SIGMA * p.ntemp ** 4); // radiator area, m^2
  const mRad = aRad * p.nrad;
  const mCore = pThermal / p.nsp;            // fission core, sized by thermal power
  const mConv = p.power * p.nconv;           // power conversion equipment, sized by electrical output
  const mShield = p.nshield;
  const subtotal = mCore + mConv + mRad + mShield;
  const total = subtotal * (1 + (p.margin ?? 0));
  return { pThermal, pWaste, aRad, mRad, mCore, mConv, mShield, subtotal, total };
}
