import * as THREE from '../vendor/three.module.js';
import { RE } from '../physics/constants.js';
import { periodSeconds, eclipseFraction } from '../physics/orbit.js';
import { fmt } from './format.js';

const TEX = 'assets/textures/';
const $ = (id) => document.getElementById(id);

let scene, camera, renderer, earth, clouds, atmosphere, orbitGroup, orbitRing, sat, shadowCyl;
let latest = null;       // most recent mission state
let camDist = 6;         // current + target camera distance (auto-framed)
let camTarget = 6;
let satAngle = 0;        // radians around the orbit
let started = false;
const SUN = new THREE.Vector3(1, 0, 0); // sunlight travels along +X

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
  scene.add(earth);

  // Cloud shell.
  clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.012, 48, 48),
    new THREE.MeshPhongMaterial({ map: tryLoad('earth_clouds_1024.png'), transparent: true, opacity: 0.8, depthWrite: false }),
  );
  scene.add(clouds);

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

  // Earth's cylindrical shadow (same model the physics uses) — radius = 1
  // Earth radius, extending away from the sun (-X). Built along local X so
  // only mesh.scale.x needs updating to change its length per altitude.
  // Radius is fractionally larger than Earth's to avoid z-fighting where the
  // two surfaces would otherwise be exactly coincident.
  const shadowGeo = new THREE.CylinderGeometry(1.012, 1.012, 1, 48, 1, true);
  shadowGeo.rotateZ(Math.PI / 2);
  shadowGeo.translate(-0.5, 0, 0);
  shadowCyl = new THREE.Mesh(
    shadowGeo,
    new THREE.MeshBasicMaterial({ color: 0x8fa0c0, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }),
  );
  scene.add(shadowCyl);

  // Orbit (ring + satellite) grouped so we can tilt the whole plane by beta.
  orbitGroup = new THREE.Group();
  scene.add(orbitGroup);
  orbitRing = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 }),
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

/** Rebuild the orbit ring geometry at a given radius (Earth radii units). */
function setOrbitRadius(orbitR) {
  const seg = 160, pos = new Float32Array((seg + 1) * 3);
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * orbitR;
    pos[i * 3 + 1] = 0;
    pos[i * 3 + 2] = Math.sin(a) * orbitR;
  }
  orbitRing.geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  orbitRing.geometry.computeBoundingSphere();
}

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  if (!latest) { renderer.render(scene, camera); return; }
  const dt = clock.getDelta();

  earth.rotation.y += dt * 0.03;
  clouds.rotation.y += dt * 0.037;

  // Satellite advances at a rate tied to the true orbital period.
  const T = periodSeconds(latest.alt);
  const orbitR = (RE + latest.alt) / RE;
  satAngle += dt * (2 * Math.PI) / Math.max(6, Math.min(26, T / 260));

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
  setOrbitRadius(orbitR);
  // Tilt the orbit plane so the sun-to-plane angle equals beta
  // (beta = 90° → plane faces the sun → no eclipse).
  orbitGroup.rotation.set(0, 0, -(state.beta * Math.PI) / 180);
  shadowCyl.scale.x = orbitR * 1.4 + 2;
  camTarget = Math.max(3.0, orbitR * 2.3 + 1.2);

  const T = periodSeconds(state.alt);
  const fe = eclipseFraction(state.alt, state.beta);
  $('o-orbit-period').textContent = T >= 7200 ? fmt(T / 3600, 2) + ' h' : fmt(T / 60, 1) + ' min';
  $('o-orbit-eclipse').textContent = fmt(fe * 100, 1) + '% of orbit';
  $('o-orbit-speed').textContent = fmt((2 * Math.PI * (RE + state.alt)) / T, 2) + ' km/s';
}
