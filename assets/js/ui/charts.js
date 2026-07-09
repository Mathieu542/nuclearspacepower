import { nuclearMass } from '../physics/nuclear.js';
import { solarMass } from '../physics/solar.js';

const $ = (id) => document.getElementById(id);
const W = 560, H = 260, PAD = { l: 52, r: 14, t: 16, b: 30 };
const PLOT_W = W - PAD.l - PAD.r, PLOT_H = H - PAD.b - PAD.t;

const NUC_RGB = '217,114,12';  // --nuclear
const SOL_RGB = '28,111,214';  // --solar

function svgLine(points) {
  return points.map((pt, i) => (i === 0 ? 'M' : 'L') + pt[0].toFixed(1) + ',' + pt[1].toFixed(1)).join(' ');
}

const log10 = Math.log10;

/** kg/kWe axis labels: 10 → "10", 1000 → "1k". */
function fmtSpec(v) {
  if (v >= 1000) return (v / 1000).toLocaleString('en-US', { maximumFractionDigits: v >= 1e4 ? 0 : 1 }) + 'k';
  return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/* =====================================================================
 * CHART A — system specific mass (kg/kWe) vs electrical power, log-log.
 * The canonical space-power trade figure: absolute masses hide the low
 * end, but kg/kWe exposes it — the reactor's fixed-mass floor makes it
 * very heavy per kWe at low power, while solar stays roughly flat. Where
 * the two curves cross is the mass break-even.
 * ===================================================================== */
export function renderPowerChart(p, breakEvenKw) {
  const pMin = 0.5, pMax = 1000, N = 60;
  const lx0 = log10(pMin), lx1 = log10(pMax);
  const powers = [];
  for (let i = 0; i <= N; i++) powers.push(10 ** (lx0 + ((lx1 - lx0) * i) / N));

  const nucSpec = powers.map((P) => nuclearMass({ ...p, power: P }).total / P);
  const solSpec = powers.map((P) => solarMass({ ...p, power: P }).total / P);

  const all = [...nucSpec, ...solSpec].filter((v) => isFinite(v) && v > 0);
  const yLo = 10 ** Math.floor(log10(Math.min(...all)));
  const yHi = 10 ** Math.ceil(log10(Math.max(...all)));
  const ly0 = log10(yLo), ly1 = log10(yHi);

  const xToPx = (P) => PAD.l + (PLOT_W * (log10(P) - lx0)) / (lx1 - lx0);
  const yToPx = (v) => PAD.t + PLOT_H * (1 - (log10(v) - ly0) / (ly1 - ly0));

  let s = '<g>';
  // Y decade gridlines + labels.
  for (let d = ly0; d <= ly1 + 1e-9; d++) {
    const y = yToPx(10 ** d);
    s += `<line x1="${PAD.l}" y1="${y.toFixed(1)}" x2="${W - PAD.r}" y2="${y.toFixed(1)}" stroke="#eee9dc"/>`;
    s += `<text class="axis-label" x="${PAD.l - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end">${fmtSpec(10 ** d)}</text>`;
  }
  // Axes.
  s += `<line x1="${PAD.l}" y1="${H - PAD.b}" x2="${W - PAD.r}" y2="${H - PAD.b}" stroke="#e2ded2"/>`;
  s += `<line x1="${PAD.l}" y1="${PAD.t}" x2="${PAD.l}" y2="${H - PAD.b}" stroke="#e2ded2"/>`;
  s += `<text class="axis-label" x="${PAD.l - 6}" y="${PAD.t - 4}" text-anchor="end">kg/kWe</text>`;
  for (const [P, t] of [[1, '1 kW'], [10, '10 kW'], [100, '100 kW'], [1000, '1 MW']]) {
    s += `<text class="axis-label" x="${xToPx(P).toFixed(1)}" y="${H - PAD.b + 16}" text-anchor="middle">${t}</text>`;
  }
  // Current-power marker.
  s += `<line x1="${xToPx(p.power).toFixed(1)}" y1="${PAD.t}" x2="${xToPx(p.power).toFixed(1)}" y2="${H - PAD.b}" stroke="#c9c4b3" stroke-dasharray="3,3"/>`;
  // Break-even ring (specific masses are equal there, totals being equal).
  if (breakEvenKw != null && breakEvenKw >= pMin && breakEvenKw <= pMax) {
    const bx = xToPx(breakEvenKw);
    const by = yToPx(nuclearMass({ ...p, power: breakEvenKw }).total / breakEvenKw);
    s += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="4.5" fill="none" stroke="#1c1e24" stroke-width="1.5"/>`;
    s += `<text class="axis-label" x="${bx.toFixed(1)}" y="${(by - 10).toFixed(1)}" text-anchor="middle">break-even</text>`;
  }
  s += `<path d="${svgLine(powers.map((P, i) => [xToPx(P), yToPx(nucSpec[i])]))}" fill="none" stroke="rgb(${NUC_RGB})" stroke-width="2"/>`;
  s += `<path d="${svgLine(powers.map((P, i) => [xToPx(P), yToPx(solSpec[i])]))}" fill="none" stroke="rgb(${SOL_RGB})" stroke-width="2"/>`;
  s += '</g>';
  $('chartPower').innerHTML = s;
}

/* =====================================================================
 * CHART B — winner map over electrical power × altitude.
 * "Who is lighter" is really a 2-D question. Each cell is shaded by the
 * winning architecture, its opacity growing with how decisive the win is
 * (mass ratio). The crisp separatrix is the break-even contour; the ring
 * is the current operating point. This is the map SP-100-era trade
 * studies drew to bound where reactors pay off.
 * ===================================================================== */
export function renderAltChart(p) {
  const pMin = 0.5, pMax = 1000, hMin = 300, hMax = 35786;
  const lx0 = log10(pMin), lx1 = log10(pMax), ly0 = log10(hMin), ly1 = log10(hMax);
  const COLS = 52, ROWS = 30;

  const xToPx = (P) => PAD.l + (PLOT_W * (log10(P) - lx0)) / (lx1 - lx0);
  const yToPx = (h) => PAD.t + PLOT_H * (1 - (log10(h) - ly0) / (ly1 - ly0));

  // Column powers (cell centers) and the altitude-dependent solar mass.
  const colP = [], nucT = [];
  for (let c = 0; c < COLS; c++) {
    const P = 10 ** (lx0 + ((lx1 - lx0) * (c + 0.5)) / COLS);
    colP.push(P);
    nucT.push(nuclearMass({ ...p, power: P }).total);
  }

  const cellW = PLOT_W / COLS + 0.5, cellH = PLOT_H / ROWS + 0.5;
  let cells = '';
  for (let r = 0; r < ROWS; r++) {
    const h = 10 ** (ly0 + ((ly1 - ly0) * (r + 0.5)) / ROWS);
    const yTop = PAD.t + (PLOT_H * r) / ROWS;
    for (let c = 0; c < COLS; c++) {
      const sol = solarMass(p, h, p.beta).total;
      const nucWins = nucT[c] < sol;
      const ratio = nucWins ? sol / nucT[c] : nucT[c] / sol;
      const a = Math.min(0.5, 0.1 + 0.4 * Math.min(1, log10(ratio) / 1.1));
      const rgb = nucWins ? NUC_RGB : SOL_RGB;
      const xL = PAD.l + (PLOT_W * c) / COLS;
      cells += `<rect x="${xL.toFixed(1)}" y="${yTop.toFixed(1)}" width="${cellW.toFixed(1)}" height="${cellH.toFixed(1)}" fill="rgba(${rgb},${a.toFixed(3)})"/>`;
    }
  }

  // Break-even contour: per column, the altitude where nuclear == solar.
  // Solar mass decreases monotonically with altitude (eclipse shrinks), so
  // there is at most one crossing per column.
  const bePts = [];
  for (let c = 0; c < COLS; c++) {
    let lo = hMin, hi = hMax;
    const diff = (h) => nucT[c] - solarMass(p, h, p.beta).total;
    if (diff(lo) * diff(hi) > 0) continue; // no crossing in range
    for (let i = 0; i < 40; i++) {
      const mid = Math.sqrt(lo * hi);
      if (diff(lo) * diff(mid) <= 0) hi = mid; else lo = mid;
    }
    bePts.push([xToPx(colP[c]), yToPx(Math.sqrt(lo * hi))]);
  }

  let s = `<g>${cells}`;
  // Frame + axes.
  s += `<rect x="${PAD.l}" y="${PAD.t}" width="${PLOT_W}" height="${PLOT_H}" fill="none" stroke="#e2ded2"/>`;
  for (const [P, t] of [[1, '1 kW'], [10, '10 kW'], [100, '100 kW'], [1000, '1 MW']]) {
    s += `<text class="axis-label" x="${xToPx(P).toFixed(1)}" y="${H - PAD.b + 16}" text-anchor="middle">${t}</text>`;
  }
  for (const [h, t] of [[500, 'LEO'], [3300, 'MEO'], [35786, 'GEO']]) {
    s += `<text class="axis-label" x="${PAD.l - 6}" y="${(yToPx(h) + 3).toFixed(1)}" text-anchor="end">${t}</text>`;
  }
  // Break-even contour.
  if (bePts.length > 1) {
    s += `<path d="${svgLine(bePts)}" fill="none" stroke="#1c1e24" stroke-width="1.5" stroke-dasharray="4,3"/>`;
  }
  // Current operating point.
  const cx = xToPx(p.power), cy = yToPx(p.alt);
  s += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="5" fill="#fff" stroke="#1c1e24" stroke-width="1.5"/>`;
  s += '</g>';
  $('chartAlt').innerHTML = s;
}
