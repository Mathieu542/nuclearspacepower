import { fmt, fmtKg } from './format.js';

const $ = (id) => document.getElementById(id);

function renderStack(prefix, segs, total, colorMap) {
  const bar = $(prefix + '-bar');
  const legend = $(prefix + '-legend');
  bar.innerHTML = '';
  legend.innerHTML = '';
  for (const s of segs) {
    const pct = total > 0 ? (s.val / total) * 100 : 0;
    const d = document.createElement('div');
    d.style.width = pct + '%';
    d.style.background = colorMap[s.key];
    bar.appendChild(d);
    const row = document.createElement('div');
    row.className = 'legend-row';
    row.innerHTML = `<span class="seg"><span class="sw" style="background:${colorMap[s.key]}"></span>${s.label}</span><span>${fmtKg(s.val)} · ${fmt(pct, 1)}%</span>`;
    legend.appendChild(row);
  }
}

function fmtArea(m2) {
  if (!isFinite(m2)) return '—';
  if (m2 >= 1e4) return fmt(m2 / 1e4, 2) + ' ha';
  return fmt(m2, 0) + ' m²';
}

/** Mini per-component bars for the result rail — each bar's width is relative
 * to the largest component in the same card, matching the reference site. */
function renderMiniBars(containerId, segs, colorMap) {
  const el = $(containerId);
  const maxVal = Math.max(...segs.map((s) => s.val), 1e-9);
  el.innerHTML = segs.map((s) => `
    <div class="mbar-row">
      <span class="mbar-label">${s.label}</span>
      <div class="mbar-track"><div class="mbar-fill" style="width:${(s.val / maxVal) * 100}%;background:${colorMap[s.key]}"></div></div>
      <span class="mbar-val">${fmtKg(s.val)}</span>
    </div>`).join('');
}

function renderRailMetrics(containerId, rows) {
  $(containerId).innerHTML = rows.map((r) => `<div class="rail-metric-row"><span class="k">${r.k}</span><span class="v">${r.v}</span></div>`).join('');
}

export function renderCards(p, nuc, sol) {
  // --- nuclear column ---
  $('n-total').innerHTML = fmtKg(nuc.total) + ' <small>total</small>';
  $('n-sub').textContent = `${fmt(p.power)} kWe · ${p.life} yr · ${fmt(p.alt)} km`;
  const nucSegs = [
    { key: 'core', label: 'Reactor core', val: nuc.mCore },
    { key: 'conv', label: 'Power conversion', val: nuc.mConv },
    { key: 'rad', label: 'Radiator', val: nuc.mRad },
    { key: 'shield', label: 'Shielding', val: nuc.mShield },
  ];
  const nucColors = { core: 'var(--nuclear)', conv: '#c98a2e', rad: '#b3690f', shield: '#8a5013' };
  renderStack('n', nucSegs, nuc.total, nucColors);
  $('n-kgkw').textContent = fmt(nuc.total / p.power, 1) + ' kg/kW';
  $('n-area').textContent = fmt(nuc.aRad, 0) + ' m²';
  $('n-thermal').textContent = fmt(nuc.pThermal / 1000, 0) + ' kWth';

  $('o-nth').textContent = fmt(nuc.pThermal / 1000, 1) + ' kWth';
  $('o-nwaste').textContent = fmt(nuc.pWaste / 1000, 1) + ' kWth';
  $('o-narea').textContent = fmt(nuc.aRad, 1) + ' m²';
  $('o-ncore').textContent = fmtKg(nuc.mCore);
  $('o-nconv').textContent = fmtKg(nuc.mConv);
  $('o-nradm').textContent = fmtKg(nuc.mRad);
  $('o-nshieldm').textContent = fmtKg(nuc.mShield);

  // --- solar column ---
  const panelArea = sol.pArrayBOL / p.arealPower; // m², display only
  $('s-total').innerHTML = fmtKg(sol.total) + ' <small>total</small>';
  $('s-sub').textContent = `${fmt(p.power)} kWe · ${p.life} yr · β=${fmt(p.beta)}°`;
  const solSegs = [
    { key: 'arr', label: 'Solar array', val: sol.mArray },
    { key: 'batt', label: 'Battery', val: sol.mBattery },
  ];
  const solColors = { arr: 'var(--solar)', batt: '#2f6fbf' };
  renderStack('s', solSegs, sol.total, solColors);
  $('s-kgkw').textContent = fmt(sol.total / p.power, 1) + ' kg/kW';
  $('s-eclipse').textContent = fmt(sol.fe * 100, 1) + '%';
  $('s-panelarea').textContent = fmtArea(panelArea);

  $('o-period').textContent = fmt(sol.T / 60, 1) + ' min';
  $('o-fe').textContent = `${fmt(sol.fe * 100, 1)}% (${fmt(sol.tEclipse_h * 60, 1)} min/orbit)`;
  $('o-ebatt').textContent = fmt(sol.eBattNeededWh, 0) + ' Wh';
  $('o-parray').textContent = fmt(sol.pArrayBOL / 1000, 2) + ' kWe (BOL)';
  $('o-sarr').textContent = fmtKg(sol.mArray);
  $('o-sbattm').textContent = fmtKg(sol.mBattery);
  $('o-parea').textContent = fmtArea(panelArea);

  // --- result rail (sticky sidebar on wide screens, bottom bar on narrow) ---
  $('rail-n-total').textContent = fmtKg(nuc.total);
  $('rail-n-total-sm').textContent = fmtKg(nuc.total);
  renderMiniBars('rail-n-bars', nucSegs, nucColors);
  renderRailMetrics('rail-n-metrics', [
    { k: 'kg / kWe', v: fmt(nuc.total / p.power, 1) },
    { k: 'Radiator area', v: fmt(nuc.aRad, 0) + ' m²' },
    { k: 'Thermal power', v: fmt(nuc.pThermal / 1000, 0) + ' kWth' },
  ]);

  $('rail-s-total').textContent = fmtKg(sol.total);
  $('rail-s-total-sm').textContent = fmtKg(sol.total);
  renderMiniBars('rail-s-bars', solSegs, solColors);
  renderRailMetrics('rail-s-metrics', [
    { k: 'kg / kWe', v: fmt(sol.total / p.power, 1) },
    { k: 'Orbit eclipse', v: fmt(sol.fe * 100, 1) + '%' },
    { k: 'Panel area', v: fmtArea(panelArea) },
  ]);
}

export function renderVerdict(nuc, sol, breakEvenKw) {
  const ratio = sol.total / nuc.total;
  let short;
  if (nuc.total < sol.total) {
    short = `<b class="win-nuclear">Nuclear</b> is <b>${fmt((ratio - 1) * 100)}% lighter</b>.`;
  } else {
    short = `<b class="win-solar">Solar + battery</b> is <b>${fmt((1 / ratio - 1) * 100)}% lighter</b>.`;
  }
  if (breakEvenKw != null) {
    short += `<br><span class="be">Break-even at ${breakEvenKw >= 1000 ? fmt(breakEvenKw / 1000, 2) + ' MWe' : fmt(breakEvenKw, 0) + ' kWe'}.</span>`;
  }
  $('rail-verdict-sm').innerHTML = short;
}
