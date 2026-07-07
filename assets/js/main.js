import { nuclearMass } from './physics/nuclear.js';
import { solarMass } from './physics/solar.js';
import { breakEvenPower } from './physics/analysis.js';
import { initControls } from './ui/controls.js';
import { renderCards, renderVerdict } from './ui/cards.js';
import { renderPowerChart, renderAltChart } from './ui/charts.js';
import { renderOrbitView } from './ui/orbitView.js';

function recompute(state) {
  const nuc = nuclearMass(state);
  const sol = solarMass(state);
  const be = breakEvenPower(state);
  renderCards(state, nuc, sol);
  renderVerdict(nuc, sol, be);
  renderPowerChart(state, be);
  renderAltChart(state);
  renderOrbitView(state);
}

initControls(recompute);
