import { SIGMA } from './constants.js';

/**
 * First-order mass model of a fission power system:
 * reactor + power conversion sized by specific power, radiator sized by
 * radiative balance (Stefan-Boltzmann), fixed shadow-shield mass.
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
  const mCore = Pw / p.nsp;                  // reactor + conversion
  const mShield = p.nshield;
  const subtotal = mCore + mRad + mShield;
  const total = subtotal * (1 + p.margin);
  return { pThermal, pWaste, aRad, mRad, mCore, mShield, subtotal, total };
}
