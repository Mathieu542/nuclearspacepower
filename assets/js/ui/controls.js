import { PARAMS, PRESETS, defaultState } from '../config.js';

// Log-scale sliders use a fixed-resolution normalized track [0..STEPS].
const LOG_STEPS = 1000;

/**
 * Builds every slider from the PARAMS registry into its group container,
 * keeps model state in sync, mirrors state into the URL hash so a tuned
 * scenario can be shared by link, wires preset/reset buttons, and supports
 * logarithmic sliders plus sliders whose range depends on another parameter.
 */
export function initControls(onChange) {
  const state = defaultState();
  const byId = Object.fromEntries(PARAMS.map((p) => [p.id, p]));
  const inputs = {};

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
    const valClass = (def.group === 'solar' || def.group === 'solarArea') ? 'field-val solar-v' : 'field-val';
    field.innerHTML = `
      <div class="field-top">
        <span class="field-label">${def.label}${def.note ? `<br><span class="field-note">${def.note}</span>` : ''}</span>
        <span class="${valClass}" id="v-${def.id}"></span>
      </div>
      <input type="range" id="in-${def.id}">
      <div class="range-marks" id="marks-${def.id}">${def.marks.map((m) => `<span>${m}</span>`).join('')}</div>`;
    container.appendChild(field);

    const input = field.querySelector('input');
    const readout = field.querySelector(`#v-${def.id}`);
    inputs[def.id] = { input, readout, def, marksEl: field.querySelector(`#marks-${def.id}`) };

    if (def.log) {
      input.min = 0; input.max = LOG_STEPS; input.step = 1;
    } else {
      input.min = def.min; input.max = def.max; input.step = def.step;
    }
    input.value = valToPos(def, rawValue(def));
    readout.textContent = def.fmt(rawValue(def));

    input.addEventListener('input', () => {
      const val = posToVal(def, +input.value);
      state[def.id] = val * (def.scale ?? 1);
      readout.textContent = def.fmt(val);
      // A parent slider may reshape a dependent slider's range live.
      PARAMS.filter((d) => d.rangeFrom === def.id).forEach(applyDynamicRange);
      syncHash();
      onChange(state);
    });
  }

  // ---- reshape a dependent slider's range from its parent's value ----
  function applyDynamicRange(def) {
    const parentVal = state[def.rangeFrom] / (byId[def.rangeFrom].scale ?? 1);
    const r = def.rangeFn(parentVal);
    def.min = r.min; def.max = r.max;
    const ctrl = inputs[def.id];
    const clamped = Math.min(r.max, Math.max(r.min, rawValue(def)));
    state[def.id] = clamped * (def.scale ?? 1);
    ctrl.input.min = def.min; ctrl.input.max = def.max;
    ctrl.input.value = clamped;
    ctrl.readout.textContent = def.fmt(clamped);
    // Refresh numeric edge marks (keep any qualitative middle label).
    const marks = ctrl.marksEl.querySelectorAll('span');
    if (marks.length === 3) {
      marks[0].textContent = `${r.min} W/m²`;
      marks[2].textContent = `${r.max} W/m²`;
    }
  }

  for (const def of PARAMS) buildField(def);
  PARAMS.filter((d) => d.rangeFn).forEach(applyDynamicRange);

  // ---- apply a full/partial state (presets, reset) ----
  function setState(partialRaw) {
    for (const [k, raw] of Object.entries(partialRaw)) {
      const def = byId[k];
      if (!def) continue;
      const clamped = Math.min(def.max, Math.max(def.min, raw));
      state[k] = clamped * (def.scale ?? 1);
      inputs[k].input.value = valToPos(def, clamped);
      inputs[k].readout.textContent = def.fmt(clamped);
    }
    PARAMS.filter((d) => d.rangeFn).forEach(applyDynamicRange);
    syncHash();
    onChange(state);
  }

  // ---- presets ----
  const presetBar = document.getElementById('presets');
  if (presetBar) {
    const defaults = () => Object.fromEntries(PARAMS.map((d) => [d.id, d.value]));
    for (const preset of PRESETS) {
      const btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.innerHTML = `<b>${preset.label}</b><span>${preset.desc}</span>`;
      btn.addEventListener('click', () => setState({ ...defaults(), ...preset.values }));
      presetBar.appendChild(btn);
    }
    const reset = document.createElement('button');
    reset.className = 'preset-btn reset';
    reset.innerHTML = `<b>Reset</b><span>back to defaults</span>`;
    reset.addEventListener('click', () => setState(defaults()));
    presetBar.appendChild(reset);
  }

  onChange(state);
  return state;
}
