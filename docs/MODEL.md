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
| `m_sys` | System margin (fraction) | mission slider |

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
   - reactor + conversion: `m_core = P / sp` with `sp` the specific power
     (W/kg, excluding radiator and shielding);
   - radiator: `m_rad = A · ρ_rad` (kg/m²);
   - shield: fixed slider value (shadow shield for uncrewed electronics).
5. Total: `(m_core + m_rad + m_shield) · (1 + m_sys)`.

Known simplifications: no scale effect on specific power, no reactivity loss
over life, no conduction gradient between the cycle and the radiator surface.

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
6. PMAD: `m_pmad = ρ_pmad · P` (kg/kWe).
7. Total: `(m_array + m_batt + m_pmad) · (1 + m_sys)`.

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
