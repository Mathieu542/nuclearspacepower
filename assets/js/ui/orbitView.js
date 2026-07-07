import { RE } from '../physics/constants.js';
import { periodSeconds, eclipseFraction } from '../physics/orbit.js';
import { fmt } from './format.js';

const $ = (id) => document.getElementById(id);

// viewBox geometry — Earth and orbit radii are drawn to true relative scale.
const CX = 150, CY = 155;
const EARTH_R = 58;

function polar(cx, cy, r, angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
}

/** Polyline through a circular arc — avoids SVG large-arc/sweep-flag bookkeeping. */
function arcPolyline(cx, cy, r, a0Deg, a1Deg, steps = 28) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0Deg + ((a1Deg - a0Deg) * i) / steps;
    pts.push(polar(cx, cy, r, a));
  }
  return pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(2) + ',' + p[1].toFixed(2)).join(' ');
}

export function renderOrbitView(p) {
  const svg = $('orbitView');
  if (!svg) return;

  const T = periodSeconds(p.alt);
  const fe = eclipseFraction(p.alt, p.beta);
  const orbitR = EARTH_R * (RE + p.alt) / RE;
  const shadowHalfDeg = fe * 180;

  // Duration of one on-screen loop scales with the true orbital period —
  // lower orbits visibly move faster, per Kepler's third law.
  const animDur = Math.max(4, Math.min(16, T / 500));

  let s = '';

  // Sun rays (left → right, toward Earth)
  const sunX0 = 4;
  const sunXEnd = CX - EARTH_R - 6;
  [-42, 0, 42].forEach((dy) => {
    s += `<line x1="${sunX0}" y1="${CY + dy}" x2="${sunXEnd}" y2="${CY + dy}" stroke="#e8b84b" stroke-width="1.5" marker-end="url(#sunArrow)"/>`;
  });
  s += `<circle cx="14" cy="${CY - 78}" r="7" fill="#e8b84b"/>`;
  s += `<text class="axis-label" x="14" y="${CY - 92}" text-anchor="middle">Sun</text>`;

  // Cylindrical shadow band (matches the physics model's shadow assumption)
  const shadowXEnd = Math.min(392, CX + orbitR + 30);
  s += `<rect x="${CX}" y="${CY - EARTH_R}" width="${(shadowXEnd - CX).toFixed(1)}" height="${2 * EARTH_R}" fill="#5c5f6b" opacity="0.14"/>`;

  // Orbit circle
  s += `<circle cx="${CX}" cy="${CY}" r="${orbitR.toFixed(1)}" fill="none" stroke="#c9c4b3" stroke-width="1.4" stroke-dasharray="3,4"/>`;

  // Eclipse arc, centered away from the Sun (angle 0 = toward +x, behind Earth)
  if (fe > 0.001) {
    s += `<path d="${arcPolyline(CX, CY, orbitR, shadowHalfDeg, -shadowHalfDeg)}" fill="none" stroke="var(--nuclear-dark)" stroke-width="4" stroke-linecap="round"/>`;
  }

  // Earth
  s += `<circle cx="${CX}" cy="${CY}" r="${EARTH_R}" fill="var(--solar)"/>`;
  s += `<circle cx="${CX}" cy="${CY}" r="${EARTH_R}" fill="none" stroke="var(--solar-dark)" stroke-width="1.5"/>`;

  // Altitude callout
  const [ax, ay] = polar(CX, CY, EARTH_R, 58);
  const [bx, by] = polar(CX, CY, orbitR, 58);
  s += `<line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="var(--text-faint)" stroke-width="1" stroke-dasharray="2,2"/>`;
  s += `<text class="axis-label" x="${(bx + 8).toFixed(1)}" y="${(by - 6).toFixed(1)}">h = ${fmt(p.alt)} km</text>`;

  // Satellite, animated around the orbit
  const [satX, satY] = polar(CX, CY, orbitR, 0);
  s += `<g>
    <circle cx="${satX.toFixed(1)}" cy="${satY.toFixed(1)}" r="5" fill="var(--text)"/>
    <animateTransform attributeName="transform" type="rotate" from="0 ${CX} ${CY}" to="360 ${CX} ${CY}" dur="${animDur.toFixed(1)}s" repeatCount="indefinite"/>
  </g>`.replace(/\n\s*/g, '');

  s += `<defs><marker id="sunArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#e8b84b"/></marker></defs>`;

  svg.innerHTML = s;

  $('o-orbit-period').textContent = fmt(T / 60, 1) + ' min';
  $('o-orbit-eclipse').textContent = fmt(fe * 100, 1) + '% of orbit';
  $('o-orbit-speed').textContent = fmt((2 * Math.PI * (RE + p.alt)) / T, 2) + ' km/s';
}
