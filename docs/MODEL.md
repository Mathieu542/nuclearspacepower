# Physics model — Orbital Power Mass Comparison

First-order launch-mass model comparing a **fission power system** and a
**solar array + battery** system for the same electrical payload in a circular
Earth orbit. All equations are implemented in `assets/js/physics/`.

## Notation

| Symbol | Meaning | Source |
|---|---|---|
| `P` | Required electrical payload power (W) | mission slider |
| `h` | Circular orbit altitude (km) | mission slider |
| `β` | **Worst-case** orbit beta angle over the mission (deg) | mission slider |
| `L` | Mission lifetime (yr) | mission slider |

The altitude slider runs on a **logarithmic** scale from 300 km (LEO) to
35 786 km (GEO). Launch-cost and system-margin parameters were removed: for
the technologies compared here, launch cost is not a discriminating factor, so
the model reports launch **mass** only.

**Beta convention.** On a real mission β drifts through the year (solar
declination ± nodal precession), so a single fixed β would under-size the
battery whenever the mission passes through lower β than the chosen value.
The slider is therefore defined as the **minimum |β| reached over the
mission**: all eclipse-driven sizing (battery capacity, array recharge power)
is computed at this worst case. The 3D view animates the seasonal drift above
that floor to make the geometry visible; the displayed eclipse metrics stay at
the sizing point.

## Orbital geometry (`orbit.js`)

Orbital period of a circular orbit:

```
T = 2π √((Re + h)³ / μ)
```

Eclipse fraction with a cylindrical Earth-shadow model (no penumbra):

```
fe = arccos( √((Re+h)² − Re²) / (Re+h) / cos β ) / π
```

clamped to 0 when the argument ≥ 1 (fully sunlit orbit, e.g. dawn-dusk SSO
at β → 90°).

## Nuclear system (`nuclear.js`)

Altitude-independent by construction — that is the architectural argument.

1. Thermal power: `P_th = P / η` with `η` the thermal-to-electric conversion
   efficiency (thermoelectric ≈ 6 %, Brayton ≈ 25 %, Stirling ≈ 35 %).
2. Waste heat: `P_waste = P_th − P`.
3. Radiator area from radiative balance (Stefan-Boltzmann, hot-side
   temperature `T_rad`, emissivity `ε`, deep-space sink assumed at 0 K):
   `A = P_waste / (ε σ T_rad⁴)`.
4. Masses:
   - reactor core: `m_core = P_th / sp_th`, sized by **thermal** power with
     `sp_th` the core specific power (W_th/kg, bare fuel + structure only —
     excludes conversion equipment, radiator, shielding). Slider range spans
     Kilopower-class (~30 W_th/kg, a deliberately simple, low-density core)
     up to compact fast-spectrum designs like SP-100 (~1050 W_th/kg — its
     858-pin UN-fueled core, 35×40 cm, produces 2.5 MWth per Demuth, "SP100
     Space Reactor Design", Progress in Nuclear Energy 42(3), 2003);
   - power conversion equipment: `m_conv = P · ρ_conv` (kg/kWe), sized by
     **electrical** output — the turbine/alternator or Stirling convertors;
   - radiator: `m_rad = A · ρ_rad` (kg/m²);
   - shield: fixed slider value (shadow shield for uncrewed electronics).
5. Total: `m_core + m_conv + m_rad + m_shield`.

The core/conversion split is deliberate: the fission core is sized by the
thermal power it must produce, while the conversion hardware is sized by
electrical output. A single "reactor + conversion" specific-power figure
would make the conversion-efficiency slider change only the waste heat and
radiator, never the reactor mass — decoupled from reality. With the split,
lowering `η` increases `P_th` for the same `P`, directly growing `m_core`.

Power management & distribution (regulation/distribution hardware downstream
of the power source) is **not modeled** — it is common to both architectures
once electricity exists and is not a discriminating factor between them.

Known simplifications: no scale effect on specific power beyond the core, no
reactivity loss over life, no conduction gradient between the cycle and the
radiator surface, shield mass does not scale with thermal power or altitude
(fixed slider).

## Solar + battery system (`solar.js`)

Sized for steady periodic operation: the array powers the payload in sunlight
**and** recharges the battery before the next eclipse.

1. Energy drawn per eclipse: `E_ecl = P · t_ecl` with `t_ecl = fe · T`.
2. Round-trip battery efficiency `η_rt` is split evenly between charge and
   discharge: `η_1way = √η_rt`.
3. Battery capacity, limited by depth of discharge `DOD`:
   `E_batt = E_ecl / η_1way / DOD` → `m_batt = E_batt / e_batt` (Wh/kg).
4. Array power needed at end of life:
   `P_array = P + (E_ecl / η_1way) / t_sun`.
5. Linear degradation `d` per year, capped at 90 % total:
   `P_BOL = P_array / (1 − min(0.9, d·L))` → `m_array = P_BOL / sp_array`.
6. Total: `m_array + m_batt`.

**Deployed panel area (display only).** `A_panel = P_BOL / q` where `q` is the
array **areal power density** (W/m², AM0 begin-of-life). `q` is a standalone
slider (150–450 W/m², fixed range, independent of the mass-side specific-power
slider) that does not feed back into any mass.

The range is anchored to the solar constant (~1360 W/m² at 1 AU) times real
cell efficiency (~30–34 %), less deployed-array packing/integration losses:
ROSA (ISS, 2021+, 33.7 %-efficient IMM cells) already publishes 200–300 W/m²
BOL, and current telecom satellites operate around 300 W/m², short of the
~460 W/m² bare-cell theoretical ceiling once losses are counted.

Known simplifications: no cycle-life degradation of the battery, no dedicated
thermal radiator (Starlink-style backside rejection assumed), linear cell
degradation.

## Break-even (`analysis.js`)

The break-even power is found by log-space bisection of
`m_nuclear(P) − m_solar(P)` over 1 kWe – 10 MWe, all other parameters held.

## Validation against real projects

The nuclear model was checked against four documented space-reactor power
systems spanning 0.5–100 kWe and three conversion technologies. With each
project's published electrical power and conversion efficiency, and
technology-appropriate radiator/shield values, the model reproduces the
published **total system mass** to within ~1 %. Each is available as a preset.

| Project | Pe | η | Published mass | Model | Source |
|---|---|---|---|---|---|
| SNAP-10A (flew, 1965) | 0.5 kWe | 1.6 % | ~431 kg | 430 kg | thermoelectric, 30 kWth |
| TOPAZ-II / Yenisei | 5.8 kWe | 5.0 % | ~1061 kg | 1061 kg | thermionic, Soviet |
| Kilopower 10 kWe | 10 kWe | 25 % | ~1500 kg | 1500 kg | Stirling, NASA design |
| SP-100 | 100 kWe | 4.2 % | 4518 kg | 4518 kg | Demuth (2003) |

Two independent cross-checks fall out of the radiator sub-model (which is not
fitted to any of these): at SP-100 parameters it predicts **105 m²** of
radiator vs the paper's **107 m²**, and at SNAP-10A parameters **5.3 m²** vs
the flight unit's ~5.9 m² — i.e. the Stefan-Boltzmann sizing is right, not just
the fitted totals.

Range coverage found two gaps at the low end, now fixed: the electrical-power
slider was raised in span (now **log, 0.5 kWe – 1 MWe**) to reach SNAP-10A and
the 1 kWe Kilopower point, and the conversion-efficiency floor was lowered from
3 % to **1 %** to reach SNAP-class thermoelectric conversion. Reactor core
specific power (20–1047 W_th/kg), radiator temperature (400–900 K) and shield
mass (0–2000 kg) already covered every project, with SP-100 sitting right at
the core-specific-power ceiling by construction.

## Planned refinements (v2 candidates)

- Nonlinear reactor scaling law (specific power improving with unit size).
- Shield mass scaling with reactor thermal power.
- Battery cycle-life sizing (LEO ≈ 5 800 cycles/yr) coupled to DOD.
- Van Allen belt dose → solar degradation as a function of altitude.
- Sun-tracking vs body-mounted array pointing losses.
- Reactor radiator sink temperature (albedo + Earth IR) vs altitude.
