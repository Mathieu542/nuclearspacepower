# Site architecture

Static site, zero build step, zero dependency — deployable as-is on GitHub
Pages or any static host. JavaScript is organized as native ES modules.

```
index.html                    page structure (containers only, no inline logic)
assets/
  css/main.css                all styling (design tokens in :root)
  js/
    main.js                   entry point: wires controls → physics → rendering
    config.js                 ★ single source of truth for every parameter
    physics/                  pure functions, no DOM — unit-testable
      constants.js            Re, μ, σ
      orbit.js                period, eclipse fraction
      nuclear.js              fission system mass model
      solar.js                PV + battery mass model
      analysis.js             break-even solver
    ui/                       DOM only, no physics
      format.js               number formatting (kg/t/kt, area, …)
      controls.js             slider generation (incl. log + dynamic-range), presets, URL-hash state
      cards.js                comparison columns + verdict + panel area
      charts.js               SVG sensitivity charts (log altitude axis)
      orbitView.js            Three.js 3D globe + orbit + eclipse marker
    vendor/
      three.module.js         Three.js r160 (vendored, no CDN)
  textures/                   NASA Blue Marble day/normal/specular + clouds
docs/
  MODEL.md                    equations and assumptions
  ARCHITECTURE.md             this file
legacy/
  orbital-power-mass-v1.html  original single-file prototype (reference)
```

## Key design decisions

- **`config.js` is the only place parameters live.** Every slider (label,
  range, default, unit formatting, tick captions) and every mission preset is
  declared there; `controls.js` generates the DOM from it. Adding a parameter
  = one entry in `PARAMS` + using it in a physics function.
- **Physics is DOM-free.** `physics/*` takes a plain state object and returns
  numbers, so models can be changed or tested without touching the UI.
- **State lives in the URL hash** (only non-default values), so any tuned
  scenario is shareable by copying the link.
- **No framework.** The interaction model (sliders → recompute → render) is
  simple enough that a framework would only add a build step. If the site
  grows (routing, several tools), migrating to Vite + a small framework is
  straightforward because physics/UI are already separated.

## Local development

Any static server works (ES modules require http://, not file://):

```
python3 -m http.server 8000
# → http://localhost:8000
```

## Deployment

GitHub Pages: Settings → Pages → deploy from branch, root of `main`.
