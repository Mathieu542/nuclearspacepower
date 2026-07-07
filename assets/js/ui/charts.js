import { nuclearMass } from '../physics/nuclear.js';
import { solarMass } from '../physics/solar.js';
import { fmtKg } from './format.js';

const $ = (id) => document.getElementById(id);
const W = 560, H = 260, PAD = { l: 56, r: 14, t: 14, b: 26 };

function svgLine(points) {
  return points.map((pt, i) => (i === 0 ? 'M' : 'L') + pt[0].toFixed(1) + ',' + pt[1].toFixed(1)).join(' ');
}

function axes(xLabels, yMaxLabel) {
  let s = '';
  s += `<line x1="${PAD.l}" y1="${H - PAD.b}" x2="${W - PAD.r}" y2="${H - PAD.b}" stroke="#e2ded2"/>`;
  s += `<line x1="${PAD.l}" y1="${PAD.t}" x2="${PAD.l}" y2="${H - PAD.b}" stroke="#e2ded2"/>`;
  for (const xl of xLabels) {
    s += `<text class="axis-label" x="${xl.x}" y="${H - PAD.b + 16}" text-anchor="middle">${xl.t}</text>`;
  }
  s += `<text class="axis-label" x="${PAD.l - 6}" y="${PAD.t + 4}" text-anchor="end">${yMaxLabel}</text>`;
  s += `<text class="axis-label" x="${PAD.l - 6}" y="${H - PAD.b + 4}" text-anchor="end">0</text>`;
  return s;
}

export function renderPowerChart(p, breakEvenKw) {
  const pMin = 5, pMax = 1000, N = 40;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    pts.push(10 ** (Math.log10(pMin) + ((Math.log10(pMax) - Math.log10(pMin)) * i) / N));
  }
  const nucVals = pts.map((P) => nuclearMass({ ...p, power: P }).total);
  const solVals = pts.map((P) => solarMass({ ...p, power: P }).total);
  const yMax = Math.max(...nucVals, ...solVals) * 1.08;

  const xToPx = (P) => PAD.l + ((W - PAD.l - PAD.r) * (Math.log10(P) - Math.log10(pMin))) / (Math.log10(pMax) - Math.log10(pMin));
  const yToPx = (v) => H - PAD.b - (H - PAD.b - PAD.t) * (v / yMax);

  const nucPts = pts.map((P, i) => [xToPx(P), yToPx(nucVals[i])]);
  const solPts = pts.map((P, i) => [xToPx(P), yToPx(solVals[i])]);

  let s = '<g>';
  s += axes([
    { x: xToPx(10), t: '10 kW' }, { x: xToPx(100), t: '100 kW' }, { x: xToPx(1000), t: '1 MW' },
  ], fmtKg(yMax));
  s += `<line x1="${xToPx(p.power)}" y1="${PAD.t}" x2="${xToPx(p.power)}" y2="${H - PAD.b}" stroke="#c9c4b3" stroke-dasharray="3,3"/>`;
  if (breakEvenKw != null && breakEvenKw >= pMin && breakEvenKw <= pMax) {
    const bx = xToPx(breakEvenKw);
    const by = yToPx(nuclearMass({ ...p, power: breakEvenKw }).total);
    s += `<circle cx="${bx}" cy="${by}" r="4.5" fill="none" stroke="#1c1e24" stroke-width="1.5"/>`;
    s += `<text class="axis-label" x="${bx}" y="${by - 10}" text-anchor="middle">break-even</text>`;
  }
  s += `<path d="${svgLine(nucPts)}" fill="none" stroke="var(--nuclear)" stroke-width="2"/>`;
  s += `<path d="${svgLine(solPts)}" fill="none" stroke="var(--solar)" stroke-width="2"/>`;
  s += '</g>';
  $('chartPower').innerHTML = s;
}

export function renderAltChart(p) {
  const hMin = 300, hMax = 35786, N = 60; // LEO → GEO, log axis
  const l0 = Math.log10(hMin), l1 = Math.log10(hMax);
  const hs = [];
  for (let i = 0; i <= N; i++) hs.push(10 ** (l0 + ((l1 - l0) * i) / N));

  const nucTotal = nuclearMass(p).total; // altitude-independent
  const solVals = hs.map((hh) => solarMass(p, hh, p.beta).total);
  const yMax = Math.max(nucTotal, ...solVals) * 1.08;

  const xToPx = (hh) => PAD.l + ((W - PAD.l - PAD.r) * (Math.log10(hh) - l0)) / (l1 - l0);
  const yToPx = (v) => H - PAD.b - (H - PAD.b - PAD.t) * (v / yMax);

  const solPts = hs.map((hh, i) => [xToPx(hh), yToPx(solVals[i])]);
  const nucPts = [[xToPx(hMin), yToPx(nucTotal)], [xToPx(hMax), yToPx(nucTotal)]];

  let s = '<g>';
  s += axes([
    { x: xToPx(500), t: 'LEO' }, { x: xToPx(3300), t: 'MEO' }, { x: xToPx(35786), t: 'GEO' },
  ], fmtKg(yMax));
  s += `<line x1="${xToPx(p.alt)}" y1="${PAD.t}" x2="${xToPx(p.alt)}" y2="${H - PAD.b}" stroke="#c9c4b3" stroke-dasharray="3,3"/>`;
  s += `<path d="${svgLine(nucPts)}" fill="none" stroke="var(--nuclear)" stroke-width="2"/>`;
  s += `<path d="${svgLine(solPts)}" fill="none" stroke="var(--solar)" stroke-width="2"/>`;
  s += '</g>';
  $('chartAlt').innerHTML = s;
}
