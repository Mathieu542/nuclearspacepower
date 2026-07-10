import { nuclearMass } from './physics/nuclear.js';
import { solarMass } from './physics/solar.js';
import { initControls } from './ui/controls.js';
import { renderCards, renderVerdict } from './ui/cards.js';
import { renderWinnerMap } from './ui/charts.js';
import { renderOrbitView } from './ui/orbitView.js';
import { initReveal } from './ui/reveal.js';

function recompute(state) {
  const nuc = nuclearMass(state);
  const sol = solarMass(state);
  renderCards(state, nuc, sol);
  renderVerdict(nuc, sol);
  renderWinnerMap(state);
  renderOrbitView(state);
}

initReveal();
initControls(recompute);
