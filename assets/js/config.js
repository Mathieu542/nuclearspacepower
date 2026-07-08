/**
 * Central parameter registry. Every slider on the page is generated from
 * this file — to add, remove, or re-range a parameter, edit it here only.
 *
 * Fields:
 *   id      state key (used by the physics modules)
 *   group   'mission' | 'nuclear' | 'solar'  → render container
 *   label   main label (HTML allowed)
 *   note    optional smaller second line under the label
 *   min/max/step/value   slider range and default (in display units)
 *   scale   multiplier applied when reading the slider into model state
 *           (e.g. 0.01 turns a % slider into a fraction)
 *   log     true → slider position is logarithmic between min and max
 *   fmt     function slider-value → display string
 *   marks   [left, middle, right] tick captions — the middle one sits at the
 *           geometric (log) or arithmetic (linear) midpoint of the range
 *   rangeFrom / rangeFn  dynamic range: recompute {min,max,value} from another
 *           parameter's live value (used by the areal-power slider)
 *   highlight  render with emphasis (used for the standalone areal-power slider)
 *   refs    optional [{value, label}] reference points rendered as small
 *           ticks positioned proportionally under the track (e.g. a named
 *           real-world data point that isn't one of the 3 edge/mid marks)
 */

const pct = (v) => `${v}%`;

/**
 * Plausible areal power density band (W/m², AM0 begin-of-life) for a given
 * array specific power (W/kg). Lighter, higher-W/kg arrays tend to use thinner
 * substrates with a different cell mix than heavy rigid panels, so the
 * realistic W/m² band shifts with the chosen technology. Anchored to real
 * space-array classes (ISS rigid Si, Starlink, ROSA-class flexible, advanced
 * IMM) and interpolated linearly in specific power.
 */
export function arealPowerRange(ssp) {
  const anchors = [
    { sp: 25, min: 70, max: 150 },   // ISS-class rigid silicon
    { sp: 36.5, min: 80, max: 175 }, // Starlink V2 Mini
    { sp: 100, min: 110, max: 250 }, // ROSA-class flexible
    { sp: 200, min: 160, max: 320 }, // advanced IMM / thin flexible
  ];
  const lerp = (a, b, t) => a + (b - a) * t;
  let lo = anchors[0], hi = anchors[anchors.length - 1];
  for (let i = 0; i < anchors.length - 1; i++) {
    if (ssp >= anchors[i].sp && ssp <= anchors[i + 1].sp) {
      lo = anchors[i]; hi = anchors[i + 1]; break;
    }
  }
  const t = hi.sp === lo.sp ? 0 : (Math.min(Math.max(ssp, anchors[0].sp), hi.sp) - lo.sp) / (hi.sp - lo.sp);
  const min = Math.round(lerp(lo.min, hi.min, t));
  const max = Math.round(lerp(lo.max, hi.max, t));
  return { min, max, value: Math.round((min + max) / 2) };
}

export const PARAMS = [
  // ---------- mission (shared) ----------
  {
    id: 'power', group: 'mission',
    label: 'Required electrical power',
    min: 5, max: 1000, step: 5, value: 100,
    fmt: (v) => `${v.toLocaleString('en-US')} kWe${v >= 1000 ? ` (${(v / 1000).toFixed(2)} MWe)` : ''}`,
    marks: ['5 kW', '~500 kW', '1 MW'],
  },
  {
    id: 'alt', group: 'mission',
    label: 'Orbital altitude (circular)',
    min: 300, max: 35786, step: 1, value: 550, log: true,
    fmt: (v) => `${Math.round(v).toLocaleString('en-US')} km`,
    marks: ['LEO 300', 'MEO ~3,300', 'GEO 35,786'],
  },
  {
    id: 'beta', group: 'mission',
    label: 'Orbit beta angle (sun geometry)',
    min: 0, max: 90, step: 1, value: 15,
    fmt: (v) => `${v}°`,
    marks: ['0° worst case', '45°', '90° terminator'],
  },
  {
    id: 'life', group: 'mission',
    label: 'Mission lifetime',
    min: 1, max: 12, step: 1, value: 5,
    fmt: (v) => `${v} yr`,
    marks: ['1 yr', '6 yr', '12 yr'],
  },
  {
    id: 'pmad', group: 'mission',
    label: 'Power management & distribution',
    note: '(regulation + distribution downstream of either power source — shared)',
    min: 1, max: 15, step: 0.5, value: 5,
    fmt: (v) => `${v} kg/kWe`,
    marks: ['1', '8 kg/kWe', '15'],
  },

  // ---------- nuclear ----------
  {
    id: 'nsp', group: 'nuclear',
    label: 'Reactor core specific power',
    note: '(thermal — fuel + structure, excl. conversion/radiator/shield)',
    min: 20, max: 200, step: 1, value: 80,
    fmt: (v) => `${v} W_th/kg`,
    marks: ['Compact ~40', '~110 W_th/kg', 'High density 200'],
  },
  {
    id: 'neta', group: 'nuclear',
    label: 'Thermal-to-electric conversion efficiency',
    min: 3, max: 35, step: 1, value: 25, scale: 0.01,
    fmt: pct,
    marks: ['Thermoelectric 3%', '19%', 'Stirling 35%'],
  },
  {
    id: 'nconv', group: 'nuclear',
    label: 'Power conversion equipment specific mass',
    note: '(turbine/alternator or Stirling convertors, sized by electrical output)',
    min: 2, max: 25, step: 0.5, value: 8,
    fmt: (v) => `${v} kg/kWe`,
    marks: ['Turbo-alternator ~3', '~13.5 kg/kWe', 'Static convertors 25'],
  },
  {
    id: 'nrad', group: 'nuclear',
    label: 'Radiator specific mass',
    min: 2, max: 14, step: 0.5, value: 6,
    fmt: (v) => `${v} kg/m²`,
    marks: ['Light 2', '8 kg/m²', 'Rugged 14'],
  },
  {
    id: 'ntemp', group: 'nuclear',
    label: 'Radiator hot-side temperature',
    min: 400, max: 900, step: 10, value: 600,
    fmt: (v) => `${v} K`,
    marks: ['400 K', '650 K', '900 K'],
  },
  {
    id: 'neps', group: 'nuclear',
    label: 'Radiator emissivity',
    min: 0.6, max: 0.98, step: 0.01, value: 0.85,
    fmt: (v) => v.toFixed(2),
    marks: ['0.60', '0.79', '0.98'],
  },
  {
    id: 'nshield', group: 'nuclear',
    label: 'Shield mass (electronics protection, uncrewed)',
    min: 0, max: 2000, step: 10, value: 300,
    fmt: (v) => `${v.toLocaleString('en-US')} kg`,
    marks: ['0 (none)', '1,000 kg', '2,000 kg'],
  },

  // ---------- solar ----------
  {
    id: 'ssp', group: 'solar',
    label: 'Array specific power',
    min: 25, max: 200, step: 0.5, value: 36.5,
    fmt: (v) => `${v} W/kg`,
    marks: ['ISS/Starlink ~30', '~113 W/kg', 'Advanced 200'],
    refs: [{ value: 75, label: 'ISS ROSA (~75)' }],
  },
  {
    id: 'sbat', group: 'solar',
    label: 'Battery energy density',
    min: 100, max: 450, step: 5, value: 200,
    fmt: (v) => `${v} Wh/kg`,
    marks: ['Li-ion 150', '~275 Wh/kg', 'Future Li-S 450'],
  },
  {
    id: 'sdod', group: 'solar',
    label: 'Max depth of discharge (DOD)',
    min: 40, max: 95, step: 1, value: 80, scale: 0.01,
    fmt: pct,
    marks: ['40%', '~68%', '95%'],
  },
  {
    id: 'seff', group: 'solar',
    label: 'Battery round-trip efficiency (charge+discharge)',
    min: 70, max: 98, step: 1, value: 90, scale: 0.01,
    fmt: pct,
    marks: ['70%', '84%', '98%'],
  },
  {
    id: 'sdeg', group: 'solar',
    label: 'Solar cell degradation',
    note: '(modern triple-junction cells; higher for orbits crossing the Van Allen belts)',
    min: 0.3, max: 4, step: 0.1, value: 1, scale: 0.01,
    fmt: (v) => `${v.toFixed(1)}%/yr`,
    marks: ['LEO-typical 0.3', '~2.2%/yr', 'Belt-crossing 4'],
  },

  // ---------- solar: display only, sizes panel area (grouped with the
  // other solar sliders, visually set apart via `highlight`) ----------
  {
    id: 'arealPower', group: 'solar', highlight: true,
    label: 'Array areal power density',
    note: 'sizes the deployed panel area only — no effect on mass',
    min: 80, max: 175, step: 1, value: 125,
    rangeFrom: 'ssp', rangeFn: arealPowerRange,
    fmt: (v) => `${Math.round(v)} W/m²`,
    marks: ['thin-film', 'typical', 'multi-junction'],
  },
];

/**
 * Mission presets: named partial states applied on top of defaults.
 * Any parameter not listed keeps its default value.
 */
export const PRESETS = [
  {
    id: 'starlink', label: 'Starlink-class bus',
    desc: '20 kWe comms sat, 550 km, current solar tech',
    values: { power: 20, alt: 550, beta: 15, life: 5, ssp: 36.5 },
  },
  {
    id: 'datacenter', label: '1 MW orbital datacenter',
    desc: 'The McCalip scenario — 1 MWe continuous at 550 km',
    values: { power: 1000, alt: 550, beta: 15, life: 8 },
  },
  {
    id: 'kilopower', label: 'Kilopower-class demo',
    desc: '10 kWe, conservative reactor tech (Stirling, low specific power)',
    values: { power: 10, nsp: 5, neta: 25, nshield: 150, life: 10 },
  },
  {
    id: 'megawatt-nuclear', label: 'MWe nuclear tug tech',
    desc: '500 kWe with Brayton-class reactor assumptions',
    values: { power: 500, nsp: 25, neta: 30, ntemp: 700, nshield: 1000 },
  },
  {
    id: 'geo', label: 'GEO communications',
    desc: 'Geostationary — long eclipse-free spans, deep gravity well',
    values: { alt: 35786, beta: 15, power: 25 },
  },
  {
    id: 'terminator', label: 'Dawn-dusk SSO',
    desc: 'β=90° — no eclipse, solar at its absolute best',
    values: { beta: 90, alt: 800 },
  },
];

/** Default state: every param at its default, model-scaled. */
export function defaultState() {
  const s = {};
  for (const p of PARAMS) s[p.id] = p.value * (p.scale ?? 1);
  return s;
}
