import { nuclearMass } from './physics/nuclear.js';
import { solarMass } from './physics/solar.js';
import { breakEvenPower } from './physics/analysis.js';
import { initControls } from './ui/controls.js';
import { renderCards, renderVerdict } from './ui/cards.js';
import { renderWinnerMap } from './ui/charts.js';
import { renderOrbitView } from './ui/orbitView.js';
import { initReveal } from './ui/reveal.js';

function recompute(state) {
  const nuc = nuclearMass(state);
  const sol = solarMass(state);
  const be = breakEvenPower(state);
  renderCards(state, nuc, sol);
  renderVerdict(nuc, sol, be);
  renderWinnerMap(state);
  renderOrbitView(state);
}

initReveal();
initControls(recompute);
