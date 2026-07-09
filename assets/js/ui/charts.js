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

/* =====================================================================
 * Winner map over electrical power × altitude.
 * "Who is lighter" is really a 2-D question. Each cell is shaded by the
 * winning architecture, its opacity growing with how decisive the win is
 * (mass ratio). The crisp separatrix is the break-even contour; the ring
 * is the current operating point. This is the map SP-100-era trade
 * studies drew to bound where reactors pay off.
 * ===================================================================== */
export function renderWinnerMap(p) {
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

  const cellW = PLOT_W / COLS + 0.5;
  let cells = '';
  for (let r = 0; r < ROWS; r++) {
    // Altitude band for this row; map to pixels via yToPx so the shading
    // shares the axis' orientation (LEO at the bottom, GEO at the top) —
    // and therefore lines up with the break-even contour and axis labels.
    const hCenter = 10 ** (ly0 + ((ly1 - ly0) * (r + 0.5)) / ROWS);
    const hHi = 10 ** (ly0 + ((ly1 - ly0) * (r + 1)) / ROWS);
    const hLo = 10 ** (ly0 + ((ly1 - ly0) * r) / ROWS);
    const yTop = yToPx(hHi);
    const cellH = yToPx(hLo) - yToPx(hHi) + 0.5;
    for (let c = 0; c < COLS; c++) {
      const sol = solarMass(p, hCenter, p.beta).total;
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
  $('chartWinner').innerHTML = s;
}
