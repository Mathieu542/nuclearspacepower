import { PARAMS, PRESETS, defaultState } from '../config.js';

/**
 * Builds every slider from the PARAMS registry into its group container,
 * keeps model state in sync, mirrors state into the URL hash so a tuned
 * scenario can be shared by link, and wires preset/reset buttons.
 */
export function initControls(onChange) {
  const state = defaultState();
  const byId = Object.fromEntries(PARAMS.map((p) => [p.id, p]));
  const inputs = {};

  // --- restore state from URL hash (#power=100&alt=550...) ---
  const hash = new URLSearchParams(location.hash.slice(1));
  for (const [k, v] of hash) {
    const def = byId[k];
    if (!def) continue;
    const raw = Math.min(def.max, Math.max(def.min, parseFloat(v)));
    if (isFinite(raw)) state[k] = raw * (def.scale ?? 1);
  }

  function rawValue(def) {
    return state[def.id] / (def.scale ?? 1);
  }

  function syncHash() {
    const parts = [];
    for (const def of PARAMS) {
      const raw = rawValue(def);
      if (raw !== def.value) parts.push(`${def.id}=${+raw.toFixed(4)}`);
    }
    history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname + location.search);
  }

  // --- build slider fields ---
  for (const def of PARAMS) {
    const container = document.querySelector(`[data-params="${def.group}"]`);
    const field = document.createElement('div');
    field.className = 'field';
    const valClass = def.group === 'solar' ? 'field-val solar-v' : 'field-val';
    field.innerHTML = `
      <div class="field-top">
        <span class="field-label">${def.label}${def.note ? `<br><span class="field-note">${def.note}</span>` : ''}</span>
        <span class="${valClass}" id="v-${def.id}"></span>
      </div>
      <input type="range" id="in-${def.id}" min="${def.min}" max="${def.max}" step="${def.step}">
      <div class="range-marks">${def.marks.map((m) => `<span>${m}</span>`).join('')}</div>`;
    container.appendChild(field);

    const input = field.querySelector('input');
    const readout = field.querySelector(`#v-${def.id}`);
    inputs[def.id] = { input, readout, def };
    input.value = rawValue(def);
    readout.textContent = def.fmt(+input.value);

    input.addEventListener('input', () => {
      state[def.id] = +input.value * (def.scale ?? 1);
      readout.textContent = def.fmt(+input.value);
      syncHash();
      onChange(state);
    });
  }

  function setState(partialRaw) {
    for (const [k, raw] of Object.entries(partialRaw)) {
      const def = byId[k];
      if (!def) continue;
      state[k] = raw * (def.scale ?? 1);
      inputs[k].input.value = raw;
      inputs[k].readout.textContent = def.fmt(raw);
    }
    syncHash();
    onChange(state);
  }

  // --- presets ---
  const presetBar = document.getElementById('presets');
  if (presetBar) {
    for (const preset of PRESETS) {
      const btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.innerHTML = `<b>${preset.label}</b><span>${preset.desc}</span>`;
      btn.addEventListener('click', () => {
        const defaults = {};
        for (const def of PARAMS) defaults[def.id] = def.value;
        setState({ ...defaults, ...preset.values });
      });
      presetBar.appendChild(btn);
    }
    const reset = document.createElement('button');
    reset.className = 'preset-btn reset';
    reset.innerHTML = `<b>Reset</b><span>back to defaults</span>`;
    reset.addEventListener('click', () => {
      const defaults = {};
      for (const def of PARAMS) defaults[def.id] = def.value;
      setState(defaults);
    });
    presetBar.appendChild(reset);
  }

  onChange(state);
  return state;
}
