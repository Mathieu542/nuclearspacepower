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
 *   highlight  render with emphasis (used for the standalone areal-power slider)
 */

const pct = (v) => `${v}%`;

export const PARAMS = [
  // ---------- mission (shared) ----------
  {
    id: 'power', group: 'mission',
    label: 'Required electrical power',
    min: 0.5, max: 1000, step: 1, value: 100, log: true,
    fmt: (v) => {
      const s = v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString('en-US');
      return `${s} kWe${v >= 1000 ? ` (${(v / 1000).toFixed(2)} MWe)` : ''}`;
    },
    marks: ['0.5 kW', '~22 kW', '1 MW'],
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
    label: 'Worst-case beta angle over mission',
    note: '(β drifts seasonally; the solar system is sized at this worst case)',
    min: 0, max: 90, step: 1, value: 15,
    fmt: (v) => `${v}°`,
    marks: ['0° max eclipse', '45°', '90° terminator'],
  },
  {
    id: 'life', group: 'mission',
    label: 'Mission lifetime',
    min: 1, max: 12, step: 1, value: 5,
    fmt: (v) => `${v} yr`,
    marks: ['1 yr', '6 yr', '12 yr'],
  },

  // ---------- nuclear ----------
  {
    id: 'nsp', group: 'nuclear',
    label: 'Reactor core specific power',
    note: '(thermal, bare core)',
    min: 20, max: 2000, step: 1, value: 80, log: true,
    fmt: (v) => `${Math.round(v)} W_th/kg`,
    marks: ['Kilopower ~30', '~200 W_th/kg', 'Gas-cooled fast 2000'],
  },
  {
    id: 'neta', group: 'nuclear',
    label: 'Thermal-to-electric conversion efficiency',
    min: 1, max: 35, step: 1, value: 25, scale: 0.01,
    fmt: pct,
    marks: ['SNAP-class 1%', '18%', 'Stirling 35%'],
  },
  {
    id: 'nconv', group: 'nuclear',
    label: 'Power conversion equipment specific mass',
    min: 2, max: 45, step: 0.5, value: 8,
    fmt: (v) => `${v} kg/kWe`,
    marks: ['Turbo-alternator ~3', '~23.5 kg/kWe', 'Static convertors 45'],
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
    min: 400, max: 1000, step: 10, value: 600,
    fmt: (v) => `${v} K`,
    marks: ['400 K', '700 K', '1000 K'],
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
    note: '(BOL, deployed wing incl. structure — modern arrays only)',
    min: 60, max: 240, step: 1, value: 80,
    fmt: (v) => `${v} W/kg`,
    marks: ['Rigid ~70', 'ROSA ~150', 'Advanced 240'],
  },
  {
    id: 'sbat', group: 'solar',
    label: 'Battery pack energy density',
    note: '(assembled pack — incl. structure, BMS, thermal)',
    min: 100, max: 260, step: 5, value: 140,
    fmt: (v) => `${v} Wh/kg`,
    marks: ['Heritage ~100', '~180 Wh/kg', 'Advanced ~260'],
  },
  {
    id: 'sdod', group: 'solar',
    label: 'Max depth of discharge (DOD)',
    note: '(size to the orbit’s cycle count)',
    min: 40, max: 95, step: 1, value: 80, scale: 0.01,
    fmt: pct,
    marks: ['LEO ~40%', '68%', '95%'],
  },
  {
    id: 'seff', group: 'solar',
    label: 'Battery round-trip efficiency (charge+discharge)',
    min: 85, max: 98, step: 1, value: 90, scale: 0.01,
    fmt: pct,
    marks: ['Modern Li-ion 85%', '~92%', 'Ideal 98%'],
  },
  {
    id: 'sdeg', group: 'solar',
    label: 'Solar cell degradation',
    note: '(triple-junction cells; much higher for orbits crossing the Van Allen belts)',
    min: 0.3, max: 10, step: 0.1, value: 1, scale: 0.01,
    fmt: (v) => `${v.toFixed(1)}%/yr`,
    marks: ['LEO ~0.5', '~5%/yr', 'Belt-crossing 10'],
  },

  // ---------- solar: display only, sizes panel area (grouped with the
  // other solar sliders, visually set apart via `highlight`) ----------
  {
    id: 'arealPower', group: 'solar', highlight: true,
    label: 'Array areal power density',
    note: '(sizes panel area only)',
    min: 150, max: 450, step: 5, value: 300,
    fmt: (v) => `${Math.round(v)} W/m²`,
    marks: ['Basic ~150', 'Telecom sats ~300', 'Advanced ~450'],
  },
];

/**
 * References: single source of truth for the "References" section, rendered
 * into the page by JS as two sub-categories (nuclear, solar) with continuous
 * numbering. Presets link to entries here via their `ref` field (a click on
 * a preset's citation scrolls to the matching entry).
 */
export const REFERENCES = [
  // ---- nuclear ----
  {
    id: 'demuth2003', cat: 'nuclear',
    html: 'Demuth, S.F. (2003), <i>SP100 Space Reactor Design</i>, Progress in Nuclear Energy, 42(3), 323–359.',
    url: 'https://www.sciencedirect.com/science/article/abs/pii/S0149197003900035',
  },
  {
    id: 'voss1984', cat: 'nuclear',
    html: 'Voss, S.S. (1984), <i>SNAP Reactor Overview</i>, Air Force Weapons Laboratory, AFWL-TN-84-14.',
    url: 'https://apps.dtic.mil/sti/tr/pdf/ADA146831.pdf',
  },
  {
    id: 'elgenk2008', cat: 'nuclear',
    html: 'El-Genk, M.S. (2008), <i>Space nuclear reactor power system concepts with static and dynamic energy conversion</i>, Energy Conversion and Management, 49(3), 402–411.',
    url: 'https://www.sciencedirect.com/science/article/abs/pii/S0196890407003706',
  },
  {
    id: 'gibson2017', cat: 'nuclear',
    html: 'Gibson, M.A. et al. (2017), <i>NASA\'s Kilopower Reactor Development and the Path to Higher Power Missions</i>, IEEE Aerospace Conference, NASA/TM-2017-219467.',
    url: 'https://ntrs.nasa.gov/api/citations/20170002010/downloads/20170002010.pdf',
  },
  {
    id: 'bertrand2019', cat: 'nuclear',
    html: 'Bertrand, F., Droin, J.B. et al., <i>Pre-conceptual design of an electronuclear system for space applications (ECSPLORER)</i>, CEA / Annals of Nuclear Energy.',
    url: 'https://www.sciencedirect.com/science/article/abs/pii/S0306454923002256',
  },
  {
    id: 'koroteev2015', cat: 'nuclear',
    html: 'Koroteev, A.S. et al. (2015), <i>Nuclear power propulsion system for spacecraft</i>, Thermal Engineering, 62(13), 971–980.',
    url: 'https://www.researchgate.net/publication/286491960_Nuclear_power_propulsion_system_for_spacecraft',
  },
  // ---- solar ----
  {
    id: 'chamberlain2020', cat: 'solar',
    html: 'Chamberlain et al. (2020), <i>On-orbit flight testing of the Roll-Out Solar Array</i>, Acta Astronautica (open-access accepted manuscript).',
    url: 'https://www.sciencedirect.com/science/article/am/pii/S0094576520306196',
  },
  {
    id: 'nasasoa', cat: 'solar',
    html: 'NASA Ames, <i>State-of-the-Art of Small Spacecraft Technology — Power</i>: survey of flight solar array W/kg, W/m² and battery Wh/kg figures.',
    url: 'https://www.nasa.gov/smallsat-institute/sst-soa/power-subsystems/',
  },
  {
    id: 'jplsolar2017', cat: 'solar',
    html: 'NASA JPL (2017), <i>Solar Power Technologies for Future Planetary Science Missions</i>, JPL D-101316 — comparative survey of array specific power (W/kg) and areal power density (W/m²).',
    url: 'https://solarsystem.nasa.gov/system/downloadable_items/715_Solar_Power_Tech_Report_FINAL.PDF',
  },
];

/**
 * Mission presets: named partial states applied on top of defaults.
 * Any parameter not listed keeps its default value.
 *   kind  'scenario' (hypothetical mission) | 'machine' (real documented
 *         reactor the model reproduces) → rendered as two titled rows
 *   ref   optional REFERENCES id — shown as a citation link on the button
 */
export const PRESETS = [
  // ---- mission scenarios ----
  {
    id: 'starlink', kind: 'scenario', label: 'Starlink-class',
    desc: '3 kWe comms sat, 550 km, modern flat array',
    values: { power: 3, alt: 550, beta: 15, life: 5, ssp: 70 },
  },
  {
    id: 'datacenter', kind: 'scenario', label: '1 MW orbital datacenter',
    desc: 'Dawn-dusk SSO at 800 km — Brayton reactor vs modern arrays',
    values: { power: 1000, alt: 800, beta: 90, life: 8, nsp: 800, neta: 30, ntemp: 700, nshield: 1000 },
  },
  {
    id: 'geo', kind: 'scenario', label: 'GEO communications',
    desc: 'Geostationary — eclipse only in the equinox seasons (β≈0), deep gravity well',
    values: { alt: 35786, beta: 0, power: 30 },
  },

  // ---- real machines (model reproduces their published mass) ----
  // The reactor values are the historical/documented system; the solar side
  // is left at the modern defaults — the comparison is "this reactor vs the
  // solar array you'd actually fly today", not vs its own era's arrays.
  {
    id: 'snap10a', kind: 'machine', label: 'SNAP-10A (US AEC / USAF, flown 1965)',
    desc: '0.5 kWe thermoelectric, 30 kWth — 435 kg flown unit', ref: 'voss1984',
    values: { power: 0.5, neta: 1.67, nsp: 104, nconv: 25, nrad: 6, ntemp: 570, neps: 0.85, nshield: 100, life: 1 },
  },
  {
    id: 'topaz', kind: 'machine', label: 'TOPAZ-II / Yenisei (USSR, ground-qualified ~1990)',
    desc: '5.6 kWe thermionic, 115 kWth — 1061 kg, never flown', ref: 'elgenk2008',
    values: { power: 5.6, neta: 4.87, nsp: 132, nconv: 8, nrad: 6, ntemp: 750, neps: 0.85, nshield: 100, life: 3 },
  },
  {
    id: 'kilopower', kind: 'machine', label: 'Kilopower (NASA ground prototype, 2018)',
    desc: '10 kWe Stirling, 40 kWth — 1500 kg Mars design', ref: 'gibson2017',
    values: { power: 10, neta: 25, nsp: 177, nconv: 15, nrad: 6, ntemp: 450, neps: 0.85, nshield: 1030, life: 10 },
  },
  {
    id: 'sp100', kind: 'machine', label: 'SP-100 class (NASA concept, 1994)',
    desc: '100 kWe thermoelectric, UN-fueled fast core — 4518 kg', ref: 'demuth2003',
    values: { power: 100, nsp: 1047, neta: 4, nconv: 5, nrad: 6, ntemp: 820, neps: 0.85, nshield: 970, life: 7 },
  },
  {
    id: 'ecsplorer', kind: 'machine', label: 'Ecsplorer (CEA concept, 2019)',
    desc: '10 kWe thermoelectric, HALEU core', ref: 'bertrand2019',
    values: { power: 10, nsp: 433, neta: 2.94, nconv: 45, nrad: 8.5, ntemp: 700, neps: 0.85, nshield: 413, life: 7 },
  },
  {
    id: 'tem', kind: 'machine', label: 'TEM / YaDEU (Russia concept, 2015)',
    desc: '1 MWe He-Xe Brayton, droplet radiator vs advanced arrays', ref: 'koroteev2015',
    values: { power: 1000, neta: 26, nsp: 1900, nconv: 3, nrad: 2, ntemp: 600, neps: 0.85, nshield: 2000, life: 10,
              ssp: 200, sbat: 240, sdod: 90, seff: 95, sdeg: 0.5, arealPower: 450 },
  },
];

/** Default state: every param at its default, model-scaled. */
export function defaultState() {
  const s = {};
  for (const p of PARAMS) s[p.id] = p.value * (p.scale ?? 1);
  return s;
}
