# Physics model — Orbital Power Mass Comparison

First-order launch-mass model comparing a **fission power system** and a
**solar array + battery** system for the same electrical payload in a circular
Earth orbit. All equations are implemented in `assets/js/physics/`.

## Notation

| Symbol | Meaning | Source |
|---|---|---|
| `P` | Required electrical payload power (W) | mission slider |
| `h` | Circular orbit altitude (km) | mission slider |
| `β` | Orbit beta angle (deg) | mission slider |
| `L` | Mission lifetime (yr) | mission slider |
| `ρ_pmad` | Power management & distribution specific mass (kg/kWe) | mission slider |

The altitude slider runs on a **logarithmic** scale from 300 km (LEO) to
35 786 km (GEO). Launch-cost and system-margin parameters were removed: for
the technologies compared here, launch cost is not a discriminating factor, so
the model reports launch **mass** only.

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
     `sp_th` the core specific power (W_th/kg, fuel + structure only —
     excludes conversion equipment, radiator, shielding);
   - power conversion equipment: `m_conv = P · ρ_conv` (kg/kWe), sized by
     **electrical** output — the turbine/alternator or Stirling convertors;
   - radiator: `m_rad = A · ρ_rad` (kg/m²);
   - shield: fixed slider value (shadow shield for uncrewed electronics);
   - power management & distribution: `m_pmad = P · ρ_pmad` (kg/kWe) —
     **shared with the solar architecture**, see below.
5. Total: `m_core + m_conv + m_rad + m_shield + m_pmad`.

The core/conversion split is deliberate: the fission core is sized by the
thermal power it must produce, while the conversion hardware is sized by
electrical output. A single "reactor + conversion" specific-power figure
would make the conversion-efficiency slider change only the waste heat and
radiator, never the reactor mass — decoupled from reality. With the split,
lowering `η` increases `P_th` for the same `P`, directly growing `m_core`.

PMAD (regulation and distribution hardware downstream of the power source) is
charged with the same specific mass on both architectures — once electricity
exists, the equipment that regulates and distributes it to the bus and payload
is functionally the same problem, not specific to how the electricity was
generated. It used to be a solar-only parameter; that was an oversight, not a
deliberate asymmetry.

Known simplifications: no scale effect on specific power, no reactivity loss
over life, no conduction gradient between the cycle and the radiator surface,
shield mass does not scale with thermal power or altitude (fixed slider).

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
6. PMAD: `m_pmad = ρ_pmad · P` (kg/kWe) — same shared parameter as the
   nuclear architecture.
7. Total: `m_array + m_batt + m_pmad`.

**Deployed panel area (display only).** `A_panel = P_BOL / q` where `q` is the
array **areal power density** (W/m², AM0 begin-of-life). `q` is a standalone
slider that does not feed back into any mass; its range is set from the chosen
array specific power (W/kg) by `arealPowerRange()`, interpolating real
space-array classes (ISS rigid silicon → Starlink → ROSA-class flexible →
advanced IMM) so the two solar technology parameters stay mutually consistent.

Known simplifications: no cycle-life degradation of the battery, no dedicated
thermal radiator (Starlink-style backside rejection assumed), linear cell
degradation.

## Break-even (`analysis.js`)

The break-even power is found by log-space bisection of
`m_nuclear(P) − m_solar(P)` over 1 kWe – 10 MWe, all other parameters held.

## Planned refinements (v2 candidates)

- Nonlinear reactor scaling law (specific power improving with unit size).
- Shield mass scaling with reactor thermal power.
- Battery cycle-life sizing (LEO ≈ 5 800 cycles/yr) coupled to DOD.
- Van Allen belt dose → solar degradation as a function of altitude.
- Sun-tracking vs body-mounted array pointing losses.
- Reactor radiator sink temperature (albedo + Earth IR) vs altitude.
