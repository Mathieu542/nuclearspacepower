/**
 * Central parameter registry. Every slider on the page is generated from
 * this file — to add, remove, or re-range a parameter, edit it here only.
 *
 * Fields:
 *   id      state key (used by the physics modules)
 *   group   'mission' | 'nuclear' | 'solar'  → which panel it renders in
 *   label   main label (HTML allowed)
 *   note    optional smaller second line under the label
 *   min/max/step/value   slider range and default
 *   scale   multiplier applied when reading the slider into model state
 *           (e.g. 0.01 turns a % slider into a fraction)
 *   fmt     function slider-value → display string
 *   marks   [left, middle, right] tick captions under the slider
 */

const pct = (v) => `${v}%`;

export const PARAMS = [
  // ---------- mission (shared) ----------
  {
    id: 'power', group: 'mission',
    label: 'Required electrical power (payload)',
    min: 5, max: 2000, step: 5, value: 100,
    fmt: (v) => `${v.toLocaleString('en-US')} kWe${v >= 1000 ? ` (${(v / 1000).toFixed(2)} MWe)` : ''}`,
    marks: ['5 kW', '1 MW datacenter', '2 MW'],
  },
  {
    id: 'alt', group: 'mission',
    label: 'Orbital altitude (circular)',
    min: 350, max: 2000, step: 10, value: 550,
    fmt: (v) => `${v} km`,
    marks: ['ISS (400)', 'Starlink (550)', 'High SSO (2000)'],
  },
  {
    id: 'beta', group: 'mission',
    label: 'Orbit beta angle (sun geometry)',
    min: 0, max: 90, step: 1, value: 15,
    fmt: (v) => `${v}°`,
    marks: ['0° worst case', 'typical SSO', '90° terminator'],
  },
  {
    id: 'life', group: 'mission',
    label: 'Mission lifetime',
    min: 1, max: 12, step: 1, value: 5,
    fmt: (v) => `${v} yr`,
    marks: ['1 yr', '5 yr', '12 yr'],
  },
  {
    id: 'launch', group: 'mission',
    label: 'Launch cost to LEO',
    min: 200, max: 5000, step: 50, value: 1000,
    fmt: (v) => `$${v.toLocaleString('en-US')}/kg`,
    marks: ['Starship (~$200)', 'Falcon 9 (~$2700)', '$5000'],
  },
  {
    id: 'margin', group: 'mission',
    label: 'System margin (harness, structure, contingency)',
    min: 0, max: 40, step: 1, value: 18, scale: 0.01,
    fmt: pct,
    marks: ['0%', '20%', '40%'],
  },

  // ---------- nuclear ----------
  {
    id: 'nsp', group: 'nuclear',
    label: 'Specific power — reactor + conversion',
    note: '(excl. radiator, excl. shielding)',
    min: 2, max: 60, step: 1, value: 12,
    fmt: (v) => `${v} W/kg`,
    marks: ['Kilopower-class (~5)', 'MWe Brayton (~25)', 'Optimistic (60)'],
  },
  {
    id: 'neta', group: 'nuclear',
    label: 'Thermal-to-electric conversion efficiency',
    min: 5, max: 35, step: 1, value: 25, scale: 0.01,
    fmt: pct,
    marks: ['Thermoelectric (6%)', 'Brayton (25%)', 'Stirling (35%)'],
  },
  {
    id: 'nrad', group: 'nuclear',
    label: 'Radiator specific mass',
    min: 2, max: 14, step: 0.5, value: 6,
    fmt: (v) => `${v} kg/m²`,
    marks: ['Light heat pipes (2)', 'Typical (6)', 'Rugged (14)'],
  },
  {
    id: 'ntemp', group: 'nuclear',
    label: 'Radiator hot-side temperature',
    min: 400, max: 900, step: 10, value: 600,
    fmt: (v) => `${v} K`,
    marks: ['400 K', 'Brayton (600K)', '900 K'],
  },
  {
    id: 'neps', group: 'nuclear',
    label: 'Radiator emissivity',
    min: 0.6, max: 0.98, step: 0.01, value: 0.85,
    fmt: (v) => v.toFixed(2),
    marks: ['0.6', '0.85', '0.98'],
  },
  {
    id: 'nshield', group: 'nuclear',
    label: 'Shield mass (electronics protection, uncrewed)',
    min: 0, max: 2000, step: 10, value: 300,
    fmt: (v) => `${v.toLocaleString('en-US')} kg`,
    marks: ['0 (none)', 'Partial shadow shield', '2000 kg'],
  },

  // ---------- solar ----------
  {
    id: 'ssp', group: 'solar',
    label: 'Array specific power',
    min: 25, max: 200, step: 0.5, value: 36.5,
    fmt: (v) => `${v} W/kg`,
    marks: ['ISS (~30)', 'Starlink V2 Mini (36.5)', 'Advanced (200)'],
  },
  {
    id: 'sbat', group: 'solar',
    label: 'Battery energy density',
    min: 100, max: 450, step: 5, value: 200,
    fmt: (v) => `${v} Wh/kg`,
    marks: ['Li-ion (150)', 'Advanced Li-ion (200)', 'Future Li-S (450)'],
  },
  {
    id: 'sdod', group: 'solar',
    label: 'Max depth of discharge (DOD)',
    min: 40, max: 95, step: 1, value: 80, scale: 0.01,
    fmt: pct,
    marks: ['40%', '80%', '95%'],
  },
  {
    id: 'seff', group: 'solar',
    label: 'Battery round-trip efficiency (charge+discharge)',
    min: 70, max: 98, step: 1, value: 90, scale: 0.01,
    fmt: pct,
    marks: ['70%', '90%', '98%'],
  },
  {
    id: 'sdeg', group: 'solar',
    label: 'Solar cell degradation',
    min: 0.5, max: 8, step: 0.1, value: 2.5, scale: 0.01,
    fmt: (v) => `${v.toFixed(1)}%/yr`,
    marks: ['Radiation-hard (1)', 'Typical (2.5)', 'Polar orbit (8)'],
  },
  {
    id: 'spmad', group: 'solar',
    label: 'Power management (PMAD) specific mass',
    min: 1, max: 15, step: 0.5, value: 5,
    fmt: (v) => `${v} kg/kWe`,
    marks: ['1', '5', '15'],
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
