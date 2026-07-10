import * as THREE from '../vendor/three.module.js';
import { RE } from '../physics/constants.js';
import { periodSeconds, eclipseFraction } from '../physics/orbit.js';
import { fmt } from './format.js';

const TEX = 'assets/textures/';
const $ = (id) => document.getElementById(id);

let scene, camera, renderer, earth, earthTilt, clouds, atmosphere, orbitGroup, orbitRing, sat;
let latest = null;       // most recent mission state
let camDist = 6;         // current + target camera distance (auto-framed)
let camTarget = 6;
let satAngle = 0;        // radians around the orbit
let started = false;
const SUN = new THREE.Vector3(1, 0, 0); // sunlight travels along +X
const SIDEREAL_DAY_S = 86164;           // Earth's inertial rotation period (s)
const SEASON_PERIOD_S = 180;            // one seasonal "year" on screen (s)
const OBLIQUITY = (23.4 * Math.PI) / 180; // Earth axial tilt
const EARTH_SPIN_EXTRA = 0.8;           // extra low-orbit spin liveliness, → 0 at GEO
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const _axis = new THREE.Vector3();      // scratch vector for the seasonal axis

/** Build the scene once. Safe to call repeatedly (guarded). */
function init() {
  const host = $('earth3d');
  if (!host || started) return;
  started = true;

  const w = host.clientWidth || 480;
  const h = host.clientHeight || 420;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, w / h, 0.01, 2000);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  host.appendChild(renderer.domElement);

  // Lighting: a strong "sun" plus a faint fill so the night side isn't pure black.
  const sun = new THREE.DirectionalLight(0xfff5e8, 3.0);
  sun.position.copy(SUN).multiplyScalar(50);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x223046, 0.5));

  const loader = new THREE.TextureLoader();
  const tryLoad = (file) => loader.load(TEX + file, undefined, undefined, () => {});

  // Earth + clouds ride a tilt group so the spin axis can carry the 23.4°
  // obliquity and nod seasonally. Purely cosmetic — the eclipse geometry uses
  // the sun/orbit only and never reads Earth's rendered orientation.
  earthTilt = new THREE.Group();
  scene.add(earthTilt);

  // Earth (radius = 1 unit).
  const earthMat = new THREE.MeshPhongMaterial({
    map: tryLoad('earth_atmos_2048.jpg'),
    normalMap: tryLoad('earth_normal_2048.jpg'),
    normalScale: new THREE.Vector2(0.85, 0.85),
    specularMap: tryLoad('earth_specular_2048.jpg'),
    specular: new THREE.Color(0x333844),
    shininess: 18,
  });
  earth = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), earthMat);
  earthTilt.add(earth);

  // Cloud shell.
  clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.012, 48, 48),
    new THREE.MeshPhongMaterial({ map: tryLoad('earth_clouds_1024.png'), transparent: true, opacity: 0.8, depthWrite: false }),
  );
  earthTilt.add(clouds);

  // Atmosphere halo — additive back-side shell for a soft blue limb.
  atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.06, 48, 48),
    new THREE.ShaderMaterial({
      transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
      vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vN; void main(){ float i = pow(0.72 - dot(vN, vec3(0,0,1)), 2.2); gl_FragColor = vec4(0.32,0.6,1.0,1.0) * i; }`,
    }),
  );
  scene.add(atmosphere);

  // Starfield.
  const starGeo = new THREE.BufferGeometry();
  const starN = 1400, starPos = new Float32Array(starN * 3);
  for (let i = 0; i < starN; i++) {
    const r = 120 + Math.random() * 300;
    const th = Math.acos(2 * Math.random() - 1), ph = Math.random() * Math.PI * 2;
    starPos[i * 3] = r * Math.sin(th) * Math.cos(ph);
    starPos[i * 3 + 1] = r * Math.sin(th) * Math.sin(ph);
    starPos[i * 3 + 2] = r * Math.cos(th);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, sizeAttenuation: false })));

  // Orbit (ring + satellite) grouped so we can tilt the whole plane by beta.
  orbitGroup = new THREE.Group();
  scene.add(orbitGroup);
  orbitRing = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.75 }),
  );
  orbitGroup.add(orbitRing);
  sat = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  orbitGroup.add(sat);

  camera.position.set(0, 1.6, camDist);
  camera.lookAt(0, 0, 0);

  new ResizeObserver(() => resize()).observe(host);
  window.addEventListener('resize', resize);
  animate();
}

function resize() {
  const host = $('earth3d');
  if (!host || !renderer) return;
  const w = host.clientWidth, h = host.clientHeight;
  if (w === 0 || h === 0) return;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

const SUNLIT_RGB = [1, 1, 1];
const SHADOW_RGB = [0.85, 0.45, 0.05]; // matches the satellite's eclipse color (#d9720c)

/**
 * Rebuild the orbit ring geometry at a given radius, coloring the arc that
 * falls inside Earth's cylindrical shadow — the same shadow model the
 * physics uses. Colors are computed per-vertex in the (untilted) local frame
 * by applying the same beta rotation the group itself will render with, so
 * the visible tint always matches the actual 3D geometry.
 */
function setOrbitRadius(orbitR, betaDeg) {
  const seg = 160, pos = new Float32Array((seg + 1) * 3), col = new Float32Array((seg + 1) * 3);
  const rot = new THREE.Euler(0, 0, -(betaDeg * Math.PI) / 180);
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const lx = Math.cos(a) * orbitR, lz = Math.sin(a) * orbitR;
    pos[i * 3] = lx; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = lz;

    const world = new THREE.Vector3(lx, 0, lz).applyEuler(rot);
    const eclipsed = world.x < 0 && Math.sqrt(world.y * world.y + world.z * world.z) < 1;
    const c = eclipsed ? SHADOW_RGB : SUNLIT_RGB;
    col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
  }
  orbitRing.geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  orbitRing.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
  orbitRing.geometry.computeBoundingSphere();
}

const clock = new THREE.Clock();
let seasonT = 0;      // drives the slow seasonal beta drift
let shownBeta = null; // beta currently rendered (ring colors + plane tilt)

/**
 * The orbit plane is not frozen: beta drifts over the mission (solar
 * declination + nodal precession). The slider sets the WORST CASE (the
 * sizing point); the view slowly sweeps beta between that worst case and
 * a higher value so the geometry is visibly seasonal. The drift runs at the
 * seasonal timescale (SEASON_PERIOD_S) — deliberately far slower than the
 * orbit, so it reads as a slow seasonal effect rather than a per-orbit wobble.
 */
function currentBeta() {
  const base = latest.beta;
  const amp = Math.min(90 - base, 23.4);
  return base + amp * (1 - Math.cos((2 * Math.PI * seasonT) / SEASON_PERIOD_S)) / 2;
}

function animate() {
  requestAnimationFrame(animate);
  if (!latest) { renderer.render(scene, camera); return; }
  const dt = clock.getDelta();
  seasonT += dt;

  // Satellite advances at a rate tied to the true orbital period, clamped so
  // both a ~90-min LEO pass and a 24-h GEO orbit stay watchable on screen.
  const T = periodSeconds(latest.alt);
  const orbitR = (RE + latest.alt) / RE;
  const dSat = dt * (2 * Math.PI) / Math.max(6, Math.min(26, T / 260));
  satAngle += dSat;

  // Earth co-rotates with the (prograde) satellite at the TRUE ratio of
  // Earth-rotations per orbit (T / sidereal day). A mild extra spin is added
  // at low altitude — where the true rate is imperceptibly slow — and tapers
  // to zero at GEO, so a geostationary satellite still hangs over one spot.
  const boost = 1 + EARTH_SPIN_EXTRA * (1 - Math.min(1, T / SIDEREAL_DAY_S));
  const dEarth = dSat * (T / SIDEREAL_DAY_S) * boost;
  earth.rotation.y -= dEarth;
  clouds.rotation.y -= dEarth * 1.05; // clouds drift a touch faster

  // Seasonal nod of the spin axis (sun-fixed frame): the axis sweeps a 23.4°
  // cone around the ecliptic normal once per on-screen "year" — same seasonal
  // cause as the beta drift, now made visible on the globe itself.
  const seasonPhase = (2 * Math.PI * seasonT) / SEASON_PERIOD_S;
  _axis.set(Math.sin(OBLIQUITY) * Math.cos(seasonPhase), Math.cos(OBLIQUITY), Math.sin(OBLIQUITY) * Math.sin(seasonPhase));
  earthTilt.quaternion.setFromUnitVectors(Y_AXIS, _axis);

  // Seasonal drift of the orbit plane (ring rebuilt only when beta moves).
  const beta = currentBeta();
  if (shownBeta === null || Math.abs(beta - shownBeta) > 0.15) {
    shownBeta = beta;
    setOrbitRadius(orbitR, beta);
    orbitGroup.rotation.set(0, 0, -(beta * Math.PI) / 180);
  }

  // Position in the (untilted) orbit plane, then the group tilt applies beta.
  const local = new THREE.Vector3(Math.cos(satAngle) * orbitR, 0, Math.sin(satAngle) * orbitR);
  sat.position.copy(local);
  const world = local.clone().applyEuler(orbitGroup.rotation);

  // Eclipse test — cylindrical shadow, same model as the physics.
  const behind = world.dot(SUN) < 0;
  const perp = Math.sqrt(world.lengthSq() - world.dot(SUN) ** 2);
  const eclipsed = behind && perp < 1;
  sat.material.color.set(eclipsed ? 0xd9720c : 0xffffff);

  // Smoothly ease the camera toward the framing distance for this altitude.
  camDist += (camTarget - camDist) * Math.min(1, dt * 3);
  camera.position.set(0, camDist * 0.28, camDist);
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}

/** Public entry point — called on every parameter change. */
export function renderOrbitView(state) {
  init();
  latest = state;
  if (!started) return;

  const orbitR = (RE + state.alt) / RE;
  // Snap the view back to the worst-case beta (the sizing point); the
  // animation loop then resumes the seasonal drift from there.
  shownBeta = null;
  seasonT = 0;
  setOrbitRadius(orbitR, state.beta);
  orbitGroup.rotation.set(0, 0, -(state.beta * Math.PI) / 180);
  camTarget = Math.max(3.0, orbitR * 2.3 + 1.2);

  // Metrics stay at the worst-case beta — that's what sizes the system.
  const T = periodSeconds(state.alt);
  const fe = eclipseFraction(state.alt, state.beta);
  $('o-orbit-period').textContent = T >= 7200 ? fmt(T / 3600, 2) + ' h' : fmt(T / 60, 1) + ' min';
  $('o-orbit-eclipse').textContent = fmt(fe * 100, 1) + '% of orbit (worst β)';
  $('o-orbit-speed').textContent = fmt((2 * Math.PI * (RE + state.alt)) / T, 2) + ' km/s';
}
