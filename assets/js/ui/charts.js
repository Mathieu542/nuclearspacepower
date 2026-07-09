import { nuclearMass } from '../physics/nuclear.js';
import { solarMass } from '../physics/solar.js';

const $ = (id) => document.getElementById(id);
const W = 560, H = 260, PAD = { l: 52, r: 14, t: 16, b: 30 };
const PLOT_W = W - PAD.l - PAD.r, PLOT_H = H - PAD.b - PAD.t;

const NUC_RGB = '217,114,12';  // --nuclear
const SOL_RGB = '28,111,214';  // --solar

const log10 = Math.log10;

/* =====================================================================
 * Winner map over beta angle × altitude, at the CURRENT power and
 * technology. Fixing power removes the axis whose variation was really
 * just the fixed-shield amortization; what's left is the pure eclipse
 * trade — solar carries a battery (and oversized array) wherever the
 * orbit is eclipsed, so it is heaviest at low altitude and low beta and
 * lightest near the terminator / high altitude. The reactor mass is
 * constant across the plane, so each cell simply asks whether the
 * eclipse penalty is enough to tip the balance. The tint deepens with
 * how decisive the win is; the ring is the current operating point.
 * ===================================================================== */
export function renderWinnerMap(p) {
  const hMin = 300, hMax = 35786, bMin = 0, bMax = 90;
  const ly0 = log10(hMin), ly1 = log10(hMax);
  const COLS = 52, ROWS = 30;

  const xToPx = (b) => PAD.l + (PLOT_W * (b - bMin)) / (bMax - bMin);
  const yToPx = (h) => PAD.t + PLOT_H * (1 - (log10(h) - ly0) / (ly1 - ly0));

  // Reactor mass is fixed across the whole plane (power + tech held).
  const nuc = nuclearMass(p).total;

  const cellW = PLOT_W / COLS + 0.5;
  let cells = '';
  let anyNuc = false, anySol = false;
  for (let r = 0; r < ROWS; r++) {
    // Altitude band for this row, mapped through yToPx so the shading
    // shares the axis orientation (LEO at the bottom, GEO at the top).
    const hCenter = 10 ** (ly0 + ((ly1 - ly0) * (r + 0.5)) / ROWS);
    const hHi = 10 ** (ly0 + ((ly1 - ly0) * (r + 1)) / ROWS);
    const hLo = 10 ** (ly0 + ((ly1 - ly0) * r) / ROWS);
    const yTop = yToPx(hHi);
    const cellH = yToPx(hLo) - yToPx(hHi) + 0.5;
    for (let c = 0; c < COLS; c++) {
      const beta = bMin + ((bMax - bMin) * (c + 0.5)) / COLS;
      const sol = solarMass(p, hCenter, beta).total;
      const nucWins = nuc < sol;
      if (nucWins) anyNuc = true; else anySol = true;
      const ratio = nucWins ? sol / nuc : nuc / sol;
      const a = Math.min(0.5, 0.1 + 0.4 * Math.min(1, log10(ratio) / 1.1));
      const rgb = nucWins ? NUC_RGB : SOL_RGB;
      const xL = PAD.l + (PLOT_W * c) / COLS;
      cells += `<rect x="${xL.toFixed(1)}" y="${yTop.toFixed(1)}" width="${cellW.toFixed(1)}" height="${cellH.toFixed(1)}" fill="rgba(${rgb},${a.toFixed(3)})"/>`;
    }
  }

  let s = `<g>${cells}`;
  s += `<rect x="${PAD.l}" y="${PAD.t}" width="${PLOT_W}" height="${PLOT_H}" fill="none" stroke="#e2ded2"/>`;
  for (const [b, t] of [[0, 'β 0°'], [45, 'β 45°'], [90, 'β 90°']]) {
    const anchor = b === 0 ? 'start' : b === 90 ? 'end' : 'middle';
    s += `<text class="axis-label" x="${xToPx(b).toFixed(1)}" y="${H - PAD.b + 16}" text-anchor="${anchor}">${t}</text>`;
  }
  for (const [h, t] of [[500, 'LEO'], [3300, 'MEO'], [35786, 'GEO']]) {
    s += `<text class="axis-label" x="${PAD.l - 6}" y="${(yToPx(h) + 3).toFixed(1)}" text-anchor="end">${t}</text>`;
  }

  // When one architecture wins over the whole plane, say so — a uniform
  // map is itself the message ("at this power & tech, orbit doesn't flip it").
  if (anyNuc !== anySol) {
    const who = anyNuc ? 'Nuclear' : 'Solar';
    s += `<text x="${(PAD.l + PLOT_W / 2).toFixed(1)}" y="${(PAD.t + 16).toFixed(1)}" text-anchor="middle" style="font:600 11px var(--mono,monospace);fill:#1c1e24;opacity:.7">${who} lighter across all orbits</text>`;
  }

  // Current operating point (clamped into the plotted beta range).
  const cx = xToPx(Math.max(bMin, Math.min(bMax, p.beta)));
  const cy = yToPx(Math.max(hMin, Math.min(hMax, p.alt)));
  s += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="5" fill="#fff" stroke="#1c1e24" stroke-width="1.5"/>`;
  s += '</g>';
  $('chartWinner').innerHTML = s;
}
