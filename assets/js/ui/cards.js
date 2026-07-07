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

export function renderCards(p, nuc, sol) {
  // --- nuclear column ---
  $('n-total').innerHTML = fmtKg(nuc.total) + ' <small>total</small>';
  $('n-sub').textContent = `${fmt(p.power)} kWe · ${p.life} yr · ${fmt(p.alt)} km`;
  renderStack('n', [
    { key: 'core', label: 'Reactor + conversion', val: nuc.mCore },
    { key: 'rad', label: 'Radiator', val: nuc.mRad },
    { key: 'shield', label: 'Shielding', val: nuc.mShield },
  ], nuc.total, { core: 'var(--nuclear)', rad: '#b3690f', shield: '#8a5013' });
  $('n-kgkw').textContent = fmt(nuc.total / p.power, 1) + ' kg/kW';
  $('n-area').textContent = fmt(nuc.aRad, 0) + ' m²';
  $('n-thermal').textContent = fmt(nuc.pThermal / 1000, 0) + ' kWth';

  $('o-nth').textContent = fmt(nuc.pThermal / 1000, 1) + ' kWth';
  $('o-nwaste').textContent = fmt(nuc.pWaste / 1000, 1) + ' kWth';
  $('o-narea').textContent = fmt(nuc.aRad, 1) + ' m²';
  $('o-ncore').textContent = fmtKg(nuc.mCore);
  $('o-nradm').textContent = fmtKg(nuc.mRad);
  $('o-nshieldm').textContent = fmtKg(nuc.mShield);

  // --- solar column ---
  const panelArea = sol.pArrayBOL / p.arealPower; // m², display only
  $('s-total').innerHTML = fmtKg(sol.total) + ' <small>total</small>';
  $('s-sub').textContent = `${fmt(p.power)} kWe · ${p.life} yr · β=${fmt(p.beta)}°`;
  renderStack('s', [
    { key: 'arr', label: 'Solar array', val: sol.mArray },
    { key: 'batt', label: 'Battery', val: sol.mBattery },
    { key: 'pmad', label: 'Power management (PMAD)', val: sol.mPmad },
  ], sol.total, { arr: 'var(--solar)', batt: '#2f6fbf', pmad: '#1b4f8f' });
  $('s-kgkw').textContent = fmt(sol.total / p.power, 1) + ' kg/kW';
  $('s-eclipse').textContent = fmt(sol.fe * 100, 1) + '%';
  $('s-panelarea').textContent = fmtArea(panelArea);

  $('o-period').textContent = fmt(sol.T / 60, 1) + ' min';
  $('o-fe').textContent = `${fmt(sol.fe * 100, 1)}% (${fmt(sol.tEclipse_h * 60, 1)} min/orbit)`;
  $('o-ebatt').textContent = fmt(sol.eBattNeededWh, 0) + ' Wh';
  $('o-parray').textContent = fmt(sol.pArrayBOL / 1000, 2) + ' kWe (BOL)';
  $('o-sarr').textContent = fmtKg(sol.mArray);
  $('o-sbattm').textContent = fmtKg(sol.mBattery);
  $('o-spmadm').textContent = fmtKg(sol.mPmad);
  $('o-parea').textContent = fmtArea(panelArea);
}

export function renderVerdict(nuc, sol, breakEvenKw) {
  const ratio = sol.total / nuc.total;
  let vtext;
  if (nuc.total < sol.total) {
    vtext = `At these parameters, <b class="win-nuclear">nuclear</b> is <b>${fmt((ratio - 1) * 100)}% lighter</b> than solar + battery (${fmtKg(nuc.total)} vs ${fmtKg(sol.total)}).`;
  } else {
    vtext = `At these parameters, <b class="win-solar">solar + battery</b> is <b>${fmt((1 / ratio - 1) * 100)}% lighter</b> than nuclear (${fmtKg(sol.total)} vs ${fmtKg(nuc.total)}).`;
  }
  if (breakEvenKw != null) {
    vtext += `<br><span class="be">Mass break-even at <b>${breakEvenKw >= 1000 ? fmt(breakEvenKw / 1000, 2) + ' MWe' : fmt(breakEvenKw, 0) + ' kWe'}</b> with the current assumptions.</span>`;
  } else {
    vtext += `<br><span class="be">No mass break-even within 1 kWe – 10 MWe at the current assumptions.</span>`;
  }
  $('verdict').innerHTML = vtext;
}
