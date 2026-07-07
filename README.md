# Nuclear Space Power — Orbital Power Mass Comparison

Interactive first-order comparison of the **launch mass** required to power a
mission in Earth orbit with a **fission reactor** versus a **solar array +
battery** system, as a function of mission parameters (power, altitude, beta
angle, lifetime) and the technology assumptions of each pathway.

Layout inspired by [Andrew McCalip's orbital vs terrestrial data center
analysis](https://andrewmccalip.com/space-datacenters) — different subject,
different equations: mass, not cost.

## Features

- Sliders for every mission and technology parameter, recomputed live
- Mission presets (Starlink-class bus, 1 MW orbital datacenter, Kilopower
  demo, MWe nuclear tug, dawn-dusk SSO)
- Mass breakdown per subsystem, kg/kWe, launch cost estimate
- Break-even power computation and sensitivity charts (mass vs power,
  mass vs altitude)
- Shareable scenarios: the URL hash encodes every non-default parameter

## Run locally

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

(Any static server works; ES modules require http://, not file://.)

## Documentation

- [docs/MODEL.md](docs/MODEL.md) — physics model, equations, assumptions
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — code organization and how to
  add/modify parameters (start with `assets/js/config.js`)

## Status

First-order model. Planned refinements are listed at the end of
[docs/MODEL.md](docs/MODEL.md).
