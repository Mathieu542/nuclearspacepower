import { PARAMS, PRESETS, REFERENCES, defaultState } from '../config.js';

// Log-scale sliders use a fixed-resolution normalized track [0..STEPS].
const LOG_STEPS = 1000;

/**
 * Builds every slider from the PARAMS registry into its group container,
 * keeps model state in sync, mirrors state into the URL hash so a tuned
 * scenario can be shared by link, wires the grouped preset/reset buttons,
 * and renders the References section from the REFERENCES registry.
 */
export function initControls(onChange) {
  const state = defaultState();
  const byId = Object.fromEntries(PARAMS.map((p) => [p.id, p]));
  const inputs = {};
  let activePresetBtn = null;
  function clearActivePreset() {
    if (activePresetBtn) { activePresetBtn.classList.remove('active'); activePresetBtn = null; }
  }

  // ---- fill the slider track up to the thumb with the group's color ----
  function updateFill(input) {
    const min = +input.min, max = +input.max;
    const pos = max > min ? (100 * (+input.value - min)) / (max - min) : 0;
    input.style.setProperty('--fill', `${pos}%`);
  }

  // ---- value <-> slider-position mapping (handles log sliders) ----
  function valToPos(def, val) {
    if (!def.log) return val;
    return (LOG_STEPS * Math.log(val / def.min)) / Math.log(def.max / def.min);
  }
  function posToVal(def, pos) {
    if (!def.log) return pos;
    return def.min * Math.pow(def.max / def.min, pos / LOG_STEPS);
  }

  // ---- restore state from URL hash (#power=100&alt=550...) ----
  const hash = new URLSearchParams(location.hash.slice(1));
  for (const [k, v] of hash) {
    const def = byId[k];
    if (!def) continue;
    const raw = Math.min(def.max, Math.max(def.min, parseFloat(v)));
    if (isFinite(raw)) state[k] = raw * (def.scale ?? 1);
  }

  const rawValue = (def) => state[def.id] / (def.scale ?? 1);

  function syncHash() {
    const parts = [];
    for (const def of PARAMS) {
      const raw = rawValue(def);
      if (Math.abs(raw - def.value) > 1e-9) parts.push(`${def.id}=${+raw.toFixed(4)}`);
    }
    history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname + location.search);
  }

  // ---- build one slider field ----
  function buildField(def) {
    const container = document.querySelector(`[data-params="${def.group}"]`);
    if (!container) return;
    const field = document.createElement('div');
    field.className = 'field' + (def.highlight ? ' field-highlight' : '');
    const valClass = def.group === 'solar' ? 'field-val solar-v' : 'field-val';
    field.innerHTML = `
      <div class="field-top">
        <span class="field-label">${def.label}${def.log ? ' <span class="log-tag">log scale</span>' : ''}${def.note ? `<br><span class="field-note">${def.note}</span>` : ''}</span>
        <span class="${valClass}" id="v-${def.id}"></span>
      </div>
      <div class="slider-wrap">
        <input type="range" id="in-${def.id}" class="range-${def.group}">
      </div>
      <div class="range-marks" id="marks-${def.id}">${def.marks.map((m) => `<span>${m}</span>`).join('')}</div>`;
    container.appendChild(field);

    const input = field.querySelector('input');
    const readout = field.querySelector(`#v-${def.id}`);
    inputs[def.id] = { input, readout, def };

    if (def.log) {
      input.min = 0; input.max = LOG_STEPS; input.step = 1;
    } else {
      input.min = def.min; input.max = def.max; input.step = def.step;
    }
    input.value = valToPos(def, rawValue(def));
    readout.textContent = def.fmt(rawValue(def));
    updateFill(input);

    input.addEventListener('input', () => {
      const val = posToVal(def, +input.value);
      state[def.id] = val * (def.scale ?? 1);
      readout.textContent = def.fmt(val);
      updateFill(input);
      clearActivePreset();
      syncHash();
      onChange(state);
    });
  }

  for (const def of PARAMS) buildField(def);

  // ---- apply a full/partial state (presets, reset) ----
  function setState(partialRaw) {
    for (const [k, raw] of Object.entries(partialRaw)) {
      const def = byId[k];
      if (!def) continue;
      const clamped = Math.min(def.max, Math.max(def.min, raw));
      state[k] = clamped * (def.scale ?? 1);
      inputs[k].input.value = valToPos(def, clamped);
      inputs[k].readout.textContent = def.fmt(clamped);
      updateFill(inputs[k].input);
    }
    syncHash();
    onChange(state);
  }

  // ---- references section (generated from the REFERENCES registry) ----
  const refsList = document.getElementById('refs-list');
  const refIndex = {}; // ref id → 1-based number, continuous across categories
  REFERENCES.forEach((r, i) => { refIndex[r.id] = i + 1; });
  if (refsList) {
    // Two sub-categories with numbering that continues from nuclear to solar.
    const cats = [['nuclear', 'Nuclear'], ['solar', 'Solar']];
    for (const [cat, title] of cats) {
      const items = REFERENCES.filter((r) => r.cat === cat);
      if (!items.length) continue;
      const h = document.createElement('h3');
      h.className = 'refs-cat';
      h.innerHTML = `<span class="dot ${cat}"></span> ${title}`;
      refsList.appendChild(h);
      const ol = document.createElement('ol');
      ol.className = 'refs';
      ol.start = refIndex[items[0].id]; // continue the running count
      for (const r of items) {
        const li = document.createElement('li');
        li.id = `ref-${r.id}`;
        // The whole citation is a link to the source PDF / publisher page.
        li.innerHTML = r.url
          ? `<a class="ref-link" href="${r.url}" target="_blank" rel="noopener">${r.html}</a>`
          : r.html;
        ol.appendChild(li);
      }
      refsList.appendChild(ol);
    }
  }

  // ---- presets: two titled rows (mission scenarios / real machines) ----
  const presetHost = document.getElementById('presets');
  if (presetHost) {
    const defaults = () => Object.fromEntries(PARAMS.map((d) => [d.id, d.value]));

    function makeButton(preset) {
      const btn = document.createElement('button');
      btn.className = 'preset-btn' + (preset.kind === 'machine' ? ' machine' : '');
      const cite = preset.ref && refIndex[preset.ref]
        ? ` <a class="preset-ref" href="#ref-${preset.ref}" title="source">[${refIndex[preset.ref]}]</a>` : '';
      btn.innerHTML = `<b>${preset.label}</b><span>${preset.desc}${cite}</span>`;
      btn.addEventListener('click', (e) => {
        if (e.target.closest('.preset-ref')) return; // citation click: navigate only
        clearActivePreset();
        btn.classList.add('active');
        activePresetBtn = btn;
        setState({ ...defaults(), ...preset.values });
      });
      return btn;
    }

    function makeGroup(title, presets) {
      const label = document.createElement('div');
      label.className = 'preset-group-label';
      label.textContent = title;
      presetHost.appendChild(label);
      const row = document.createElement('div');
      row.className = 'preset-bar';
      for (const p of presets) row.appendChild(makeButton(p));
      presetHost.appendChild(row);
      return row;
    }

    const scenarioRow = makeGroup('Mission scenarios', PRESETS.filter((p) => p.kind === 'scenario'));
    makeGroup('Real machines & concepts — matched to published figures', PRESETS.filter((p) => p.kind === 'machine'));

    const reset = document.createElement('button');
    reset.className = 'preset-btn reset';
    reset.innerHTML = `<b>Reset</b><span>back to defaults</span>`;
    reset.addEventListener('click', () => {
      clearActivePreset();
      reset.classList.add('active');
      activePresetBtn = reset;
      setState(defaults());
    });
    scenarioRow.appendChild(reset);
  }

  onChange(state);
  return state;
}
