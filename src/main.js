import * as THREE from 'three';
import './style.css';

const $ = (s, root = document) => root.querySelector(s);
const ui = $('#ui');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080a18);
scene.fog = new THREE.FogExp2(0x080a18, 0.0026);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 700);
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
$('#game').appendChild(renderer.domElement);
const clock = new THREE.Clock();
scene.add(new THREE.HemisphereLight(0x7183c7, 0x17121f, 1.15));
const moon = new THREE.DirectionalLight(0xa6b6ff, 1.5);
moon.position.set(-80, 120, 35);
moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024);
moon.shadow.camera.left = moon.shadow.camera.bottom = -150;
moon.shadow.camera.right = moon.shadow.camera.top = 150;
scene.add(moon);
const cityGlow = new THREE.PointLight(0x713bdf, 95, 170);
cityGlow.position.set(-8, 24, 0);
scene.add(cityGlow);
const mat = (color, roughness = .7, metalness = 0, emissive = 0, emissiveIntensity = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity });
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const box = (parent, x, y, z, sx, sy, sz, material, cast = false) => {
  const mesh = new THREE.Mesh(boxGeo, material);
  mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz);
  mesh.castShadow = cast; mesh.receiveShadow = true; parent.add(mesh); return mesh;
};
const glow = (color, intensity = 1.8) => mat(color, .35, .15, color, intensity);
const M = {
  road: mat(0x171925, .95), ground: mat(0x0b0d17), lane: mat(0x777587, .8, 0, 0x454251, .2),
  purple: glow(0xa34bff, 2.2), cyan: glow(0x29ddf3, 2.2), red: glow(0xff285e, 2), white: mat(0xe4e4ed, .4, .25),
  dark: mat(0x11131d), glass: mat(0x111a2a, .18, .55), curb: mat(0x353544)
};
const buildings = [], traffic = [], pedestrians = [];
box(scene, 0, -1, 0, 480, 1, 480, M.ground);
// A navigable 6-by-6 street grid, with painted lane dashes and cross streets.
for (let p = -180; p <= 180; p += 60) {
  box(scene, p, .01, 0, 14, .08, 480, M.road);
  box(scene, 0, .01, p, 480, .08, 14, M.road);
  for (let k = -225; k < 225; k += 14) {
    box(scene, p, .07, k, .14, .018, 4.2, M.lane);
    box(scene, k, .07, p, 4.2, .018, .14, M.lane);
  }
}
const facades = [0x182338, 0x20243a, 0x25263a, 0x162c3b, 0x252239].map(c => mat(c, .48, .35));
const winMats = [glow(0xffd697, .68), glow(0x80eaff, .62)];
const winData = [[], []];
const dummy = new THREE.Object3D();
for (let bx = -150; bx <= 150; bx += 60) for (let bz = -150; bz <= 150; bz += 60) {
  const cx = bx + 30, cz = bz + 30;
  if (Math.abs(cx) < 30 && Math.abs(cz) < 30) continue;
  const count = 2 + (Math.abs(bx + bz) % 3);
  for (let n = 0; n < count; n++) {
    const x = cx + (n - (count - 1) / 2) * 13, z = cz + (n % 2 ? 8 : -8);
    const w = 9, d = 10, h = 22 + Math.abs(Math.floor(x * 3 + z)) % 6 * 8 + ((Math.abs(cx) < 80 && Math.abs(cz) < 80) ? 35 : 0);
    const b = box(scene, x, h / 2, z, w, h, d, facades[Math.abs(Math.floor(x + z)) % facades.length], true);
    buildings.push(b);
    box(scene, x, h + .35, z, w + .5, .6, d + .5, mat(0x374057, .45, .45));
    if (h > 48) {
      box(scene, x - w / 2, h * .55, z, .12, h * .8, .15, n % 2 ? M.cyan : M.purple);
      box(scene, x, h + .8, z, w * .55, .16, d * .55, n % 2 ? M.cyan : M.purple);
    }
    for (let fy = 5; fy < h - 4; fy += 4.3) for (let fx = -w / 2 + 1; fx < w / 2 - .5; fx += 2.2) {
      if (Math.random() < .28) continue;
      const type = Math.random() < .33 ? 1 : 0;
      for (const side of [-1, 1]) winData[type].push([x + fx, fy, z + side * (d / 2 + .03), 1.35, 1.5, .06]);
    }
    if (h > 60) { box(scene, x, h + 2.5, z, 1.5, 3, 1.5, M.curb); box(scene, x, h + 5, z, .1, 5, .1, M.white); }
  }
  // Lit storefronts add a human scale beneath the towers.
  box(scene, cx, 3, cz + 17, 18, 6, 7, mat(0x252337, .55, .2), true);
  box(scene, cx, 5.7, cz + 13.35, 16, .45, .12, (cx + cz) % 2 ? M.cyan : M.purple);
  for (let j = 0; j < 3; j++) box(scene, cx - 6 + j * 6, 2.3, cz + 13.25, 4, 3.8, .12, mat(0x172b3b, .18, .45, 0x183a62, .7));
}
for (let i = 0; i < 2; i++) {
  const batch = new THREE.InstancedMesh(boxGeo, winMats[i], winData[i].length);
  winData[i].forEach((v, n) => { dummy.position.set(v[0], v[1], v[2]); dummy.scale.set(v[3], v[4], v[5]); dummy.updateMatrix(); batch.setMatrixAt(n, dummy.matrix); });
  batch.instanceMatrix.needsUpdate = true; scene.add(batch);
}
// Central garage and skyline spire are primary landmarks.
const garage = new THREE.Group(); garage.position.set(-8, 0, 0); scene.add(garage);
box(garage, 0, 5, 0, 24, 10, 19, mat(0x232333, .55, .3), true);
box(garage, 0, 2.5, 9.7, 18, 5, .3, M.dark);
box(garage, 0, 7, 9.7, 20, .7, .35, M.purple);
box(garage, 0, 8.3, 9.7, 14, .12, .3, M.cyan);
for (let y = 2; y < 7; y += 1.3) box(garage, 0, y, 9.9, 17, .04, .05, M.white);
box(scene, 0, 48, -62, 21, 96, 21, mat(0x182337, .25, .6), true);
box(scene, 0, 98, -62, 8, 7, 8, M.purple); box(scene, 0, 105, -62, .3, 10, .3, M.cyan);
for (let y = 8; y < 92; y += 8) box(scene, 0, y, -51.2, 18, .24, .12, y % 16 ? M.cyan : M.purple);

const carCatalog = [
  { id: 'Vanta R', type: 'SUPERCAR', price: 0, color: 0x9b59ff, speed: 45, accel: 25, handling: 2.5, mass: 1, shape: 'low' },
  { id: 'Apex GT', type: 'TRACK COUPE', price: 3200, color: 0xe9e6ef, speed: 56, accel: 30, handling: 2.8, mass: .86, shape: 'sleek' },
  { id: 'Titan X', type: 'LUXURY SUV', price: 5100, color: 0x20cad8, speed: 39, accel: 19, handling: 1.35, mass: 1.55, shape: 'suv' },
  { id: 'Orion S', type: 'GRAND TOURER', price: 7400, color: 0xf55378, speed: 52, accel: 26, handling: 2.05, mass: 1.13, shape: 'gt' },
  { id: 'Phantom 9', type: 'HYPERSPORT', price: 11000, color: 0xffbd63, speed: 68, accel: 36, handling: 2.35, mass: .92, shape: 'hyper' }
];
const savedProgress = (() => {
  try { return JSON.parse(localStorage.getItem('neon-district-save') || '{}') || {}; }
  catch { return {}; }
})();
const owned = new Set(['Vanta R', ...(Array.isArray(savedProgress.owned) ? savedProgress.owned : [])]);
function createCar(def, paint = def.color) {
  const g = new THREE.Group();
  g.userData = { def, paint, speed: 0, heading: 0, upgrades: { engine: 0, handling: 0 }, wheelStyle: false };
  const bodymat = mat(paint, .25, .65), tiremat = mat(0x090a0d, .86, .05), rimMat = mat(0x9ca5b9, .23, .8);
  const suv = def.shape === 'suv', width = suv ? 2.1 : 1.92, length = 4.5, height = suv ? 1.55 : .8;
  box(g, 0, .62, 0, width, height, length, bodymat, true);
  box(g, 0, .98, -.35, width * .82, .42, length * .48, bodymat, true);
  box(g, 0, 1.25, .25, width * .7, .58, length * .43, M.glass);
  box(g, 0, 1.56, .23, width * .64, .09, length * .38, bodymat);
  for (const s of [-1, 1]) {
    box(g, s * (width / 2 + .03), .4, 0, .08, .18, length * .68, bodymat);
    box(g, s * .62, .78, -length / 2 - .03, .48, .14, .07, M.cyan);
    box(g, s * .66, .76, length / 2 + .03, .4, .14, .07, M.red);
  }
  const wheels = [];
  for (const x of [-width * .53, width * .53]) for (const z of [-length * .31, length * .31]) {
    const wheel = new THREE.Group(); wheel.position.set(x, .38, z); g.add(wheel);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(.37, .37, .22, 14), tiremat); tire.rotation.z = Math.PI / 2; wheel.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .23, 8), rimMat); rim.rotation.z = Math.PI / 2; wheel.add(rim);
    if (z < 0) wheel.userData.steer = true; wheels.push(wheel);
  }
  g.userData.wheels = wheels;
  for (const x of [-.65, .65]) {
    const lamp = new THREE.SpotLight(0xa6eaff, 23, 45, .42, .5, 1.2);
    lamp.position.set(x, .85, -2.15); lamp.target.position.set(x, .2, -12); g.add(lamp, lamp.target);
  }
  return g;
}
function parkCar(def, x, z, heading = 0) { const car = createCar(def); car.position.set(x, 0, z); car.rotation.y = heading; car.userData.heading = heading; scene.add(car); return car; }
const parkedCars = carCatalog.map((c, i) => {
  const car = parkCar(c, -20 + i * 4.5, 29, -Math.PI / 2);
  car.visible = owned.has(c.id);
  return car;
});
for (let i = 0; i < 8; i++) {
  const def = carCatalog[(i + 1) % carCatalog.length], car = createCar(def, [0x283a54, 0x713b76, 0x3b5660, 0x6a364d][i % 4]);
  car.userData.ai = true; car.userData.route = i * 54; car.userData.aiSpeed = 7 + i % 4 * 1.5;
  car.position.set(-210 + i * 48, 0, i % 2 ? -60 : 0); car.rotation.y = Math.PI / 2; scene.add(car); traffic.push(car);
}
const skin = mat(0xb77f69), jacket = mat(0x171927, .48, .12), pants = mat(0x242638);
const character = new THREE.Group(); scene.add(character);
const torso = new THREE.Group(); character.add(torso);
const torsoMesh = new THREE.Mesh(new THREE.CapsuleGeometry(.43, .7, 4, 8), jacket); torsoMesh.position.y = 1.28; torso.add(torsoMesh);
const head = new THREE.Mesh(new THREE.SphereGeometry(.27, 12, 10), skin); head.position.y = 2; torso.add(head);
const limbGeo = new THREE.CapsuleGeometry(.13, .5, 3, 7);
function limb(x, y, material) { const pivot = new THREE.Group(); pivot.position.set(x, y, 0); torso.add(pivot); const mesh = new THREE.Mesh(limbGeo, material); mesh.position.y = -.37; pivot.add(mesh); return pivot; }
const legL = limb(-.22, .95, pants), legR = limb(.22, .95, pants), armL = limb(-.52, 1.63, jacket), armR = limb(.52, 1.63, jacket);
const player = { pos: new THREE.Vector3(-22, 0, 26), vel: new THREE.Vector3(), heading: 0, crouched: false, walking: false };
const marker = new THREE.Group(); scene.add(marker);
const markerRing = new THREE.Mesh(new THREE.TorusGeometry(2.2, .09, 8, 30), M.cyan); markerRing.rotation.x = Math.PI / 2; marker.add(markerRing);
const markerBeam = new THREE.Mesh(new THREE.CylinderGeometry(.15, .85, 4, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0x59e8f4, transparent: true, opacity: .16, side: THREE.DoubleSide })); markerBeam.position.y = 2; marker.add(markerBeam);

const objectives = [
  { title: 'FIRST LIGHT', detail: 'Take a car from the bay and reach Crescent Plaza.', x: 0, z: 32, reward: 650, kind: 'drive' },
  { title: 'NEON RUN', detail: 'Reach the Crescent Plaza before the clock runs out.', x: 60, z: -60, reward: 1100, kind: 'reach' },
  { title: 'NIGHT SHIFT', detail: 'Reach the Skyline overlook before the clock runs out.', x: 0, z: -40, reward: 1750, kind: 'reach' },
  { title: 'DISTRICT TOUR', detail: 'Take a victory lap around the city.', x: -181, z: 181, reward: 2200, kind: 'reach' }
];
let missionIndex = Math.max(0, Number(savedProgress.missionIndex) || 0), missionActive = false, missionComplete = false;
let money = savedProgress.money == null ? 1200 : Math.max(0, Number(savedProgress.money) || 0), xp = Math.max(0, Number(savedProgress.xp) || 0);
let activeCar = null, selectedCar = parkedCars.find(car => car.userData.def.id === savedProgress.selectedCar && owned.has(car.userData.def.id)) || parkedCars[0], gameStarted = false, paused = false, garageOpen = false, missionTimer = 0;
for (const car of parkedCars) {
  const saved = savedProgress.upgrades?.[car.userData.def.id];
  if (saved) car.userData.upgrades = { engine: Math.max(0, Math.min(3, Number(saved.engine) || 0)), handling: Math.max(0, Math.min(3, Number(saved.handling) || 0)) };
}
let cameraYaw = 0, cameraPitch = .13, dayClock = 0, toastTimer = 0, interactTarget = null;
let walkTime = 0, nitro = 100, currentScreen = 'menu';
const keys = new Set();
const clamp = THREE.MathUtils.clamp;
const fmt = value => Math.floor(value).toLocaleString('en-US');

ui.innerHTML = `
  <section class="screen" id="menu-screen"><div class="menu-copy">
    <div class="eyebrow">OPEN-WORLD NIGHT DRIVE · DISTRICT 09</div>
    <h1 class="brand">NEON<span>DISTRICT</span></h1>
    <p class="subtitle">The city is yours after dark. Explore the streets, earn your name, and build a garage that owns the skyline.</p>
    <div class="menu-actions"><button class="btn primary" id="start-btn">ENTER THE DISTRICT <span>→</span></button><button class="btn" id="how-btn">HOW TO PLAY</button></div>
    <div class="menu-note">WASD MOVE · E INTERACT · SHIFT SPRINT / NITRO · ESC PAUSE</div>
  </div><div class="menu-card"><div class="label">TONIGHT'S OUTLOOK</div><div class="weather">✦ &nbsp; CLEAR / 18°</div><div class="menu-stat"><span>ACTIVE DISTRICT</span><b>NEON CENTRAL</b></div><div class="menu-stat"><span>STREETS OPEN</span><b>36 BLOCKS</b></div><div class="menu-stat"><span>LOCAL TIME</span><b>23:48</b></div></div></section>
  <section class="game-hud hidden" id="hud"><div class="topbar"><div><div class="hud-brand">NEON <span>DISTRICT</span></div><div class="district">NEON CENTRAL · SECTOR 09</div></div><div class="wallet"><span class="label">CREDITS</span><b id="money">1,200</b><button class="icon-btn" id="pause-btn" aria-label="Pause">Ⅱ</button></div></div>
    <div class="mission-card"><div class="label" id="mission-label">AVAILABLE CONTRACT</div><b id="mission-title">FIRST LIGHT</b><p id="mission-text">Find the Vanta R and take it for a spin.</p><div class="mission-footer"><span id="mission-distance">CONTRACT READY</span><span id="mission-reward">+650 CR</span></div></div>
    <div class="minimap"><div class="map-title">DISTRICT MAP <span>● LIVE</span></div><div class="map-grid"><i class="map-player"></i><i class="map-objective"></i><i class="map-garage"></i></div><div class="map-legend"><span>YOU</span><span>OBJECTIVE</span><span>GARAGE</span></div></div>
    <div class="prompt hidden" id="prompt"></div><div class="toast hidden" id="toast"></div>
    <div class="vehicle-hud hidden" id="vehicle-hud"><div class="vehicle-name" id="vehicle-name">VANTA R</div><div class="speed"><b id="speed">000</b><span>KM/H</span></div><div class="vehicle-bottom"><span id="gear">D · SPORT</span><span class="nitro-meter"><i id="nitro-fill"></i></span></div></div>
    <div class="controls-hint" id="controls-hint">W A S D &nbsp; MOVE <span>·</span> E &nbsp; INTERACT <span>·</span> SHIFT &nbsp; SPRINT <span>·</span> SPACE &nbsp; JUMP <span>·</span> C &nbsp; CROUCH</div>
    <div class="touch-controls" id="touch-controls"><div class="stick" data-stick><i></i></div><div class="touch-actions"><button data-action="interact">E</button><button data-action="jump">↑</button><button data-action="sprint">⚡</button></div></div>
  </section>
  <section class="modal hidden" id="modal"><div class="modal-panel"><button class="modal-close" id="modal-close">×</button><div id="modal-content"></div></div></section>
  <section class="screen pause-screen hidden" id="pause-screen"><div class="pause-panel"><div class="eyebrow">TAKE A BREATHER</div><h2>PAUSED<span>.</span></h2><p>Your city will wait.</p><button class="btn primary" id="resume-btn">BACK TO THE STREETS</button><button class="btn" id="settings-btn">SETTINGS</button><button class="btn" id="quit-btn">RETURN TO TITLE</button></div></section>`;

const hud = $('#hud'), modal = $('#modal'), modalContent = $('#modal-content'), promptEl = $('#prompt'), toastEl = $('#toast');
const moneyEl = $('#money'), missionTitleEl = $('#mission-title'), missionTextEl = $('#mission-text');
function showToast(message) { toastEl.textContent = message; toastEl.classList.remove('hidden'); toastTimer = 2.8; }
function saveProgress() {
  try {
    localStorage.setItem('neon-district-save', JSON.stringify({
      money, xp, missionIndex, owned: [...owned], selectedCar: selectedCar?.userData.def.id || 'Vanta R',
      upgrades: Object.fromEntries(parkedCars.map(car => [car.userData.def.id, car.userData.upgrades]))
    }));
  } catch { /* The game remains playable when storage is unavailable. */ }
}
function setMoney(value) { money = Math.max(0, Math.floor(value)); moneyEl.textContent = fmt(money); saveProgress(); }
function updateMissionPanel() {
  const mission = objectives[missionIndex % objectives.length];
  $('#mission-label').textContent = missionActive ? `CONTRACT ${String(missionIndex + 1).padStart(2, '0')} · IN PROGRESS` : 'AVAILABLE CONTRACT';
  missionTitleEl.textContent = mission.title; missionTextEl.textContent = mission.detail;
  $('#mission-reward').textContent = `+${fmt(mission.reward)} CR`;
  $('#mission-distance').textContent = missionActive ? 'OBJECTIVE LIVE' : 'CONTRACT READY';
}
function startGame() {
  gameStarted = true; paused = false; currentScreen = 'game';
  $('#menu-screen').classList.add('hidden'); $('#pause-screen').classList.add('hidden'); hud.classList.remove('hidden');
  moneyEl.textContent = fmt(money);
  updateMissionPanel(); showToast('Welcome to Neon Central. Start the contract at the cyan beacon, then take a car.');
}
function showModal(html) { modalContent.innerHTML = html; modal.classList.remove('hidden'); }
function closeModal() { modal.classList.add('hidden'); garageOpen = false; }
function openPause() { if (!gameStarted || garageOpen) return; paused = true; $('#pause-screen').classList.remove('hidden'); }
function resumeGame() { paused = false; $('#pause-screen').classList.add('hidden'); }
function openSettings() {
  showModal(`<div class="eyebrow">PREFERENCES</div><h2>SETTINGS<span>.</span></h2><p class="modal-lede">Tune the district to your setup.</p><label class="setting-row">Camera sensitivity<input id="sensitivity" type="range" min="30" max="150" value="90"></label><label class="setting-row">Render quality<select id="quality"><option value="1">Performance</option><option value="1.25" selected>Balanced</option><option value="1.5">High</option></select></label><div class="modal-actions"><button class="btn primary" id="settings-done">DONE</button></div>`);
  $('#settings-done').onclick = () => { const ratio = Number($('#quality').value); renderer.setPixelRatio(Math.min(devicePixelRatio, ratio)); renderer.setSize(innerWidth, innerHeight); closeModal(); };
}
function renderGarage() {
  garageOpen = true;
  const cars = carCatalog.map(def => {
    const isOwned = owned.has(def.id), isCurrent = selectedCar?.userData.def.id === def.id;
    return `<article class="car-option ${isCurrent ? 'selected' : ''}"><div class="car-swatch" style="--car-color:#${def.color.toString(16).padStart(6,'0')}"></div><div class="car-info"><b>${def.id}</b><span>${def.type} · ${def.speed} KM/H</span></div><div class="car-price">${isOwned ? (isCurrent ? 'IN USE' : 'OWNED') : `${fmt(def.price)} CR`}</div><button class="btn small ${isOwned ? '' : 'primary'}" data-car="${def.id}">${isOwned ? 'SELECT' : 'BUY'}</button></article>`;
  }).join('');
  showModal(`<div class="eyebrow">NEON CENTRAL · SERVICE BAY</div><h2>YOUR GARAGE<span>.</span></h2><p class="modal-lede">Choose a ride. Tune it up. Take it outside.</p><div class="garage-balance">AVAILABLE CREDITS <b>${fmt(money)} CR</b></div><div class="car-list">${cars}</div><div class="upgrade-row"><span><b>PERFORMANCE TUNING</b><small>ENGINE +12% SPEED · HANDLING +10%</small></span><button class="btn small" id="upgrade-engine">ENGINE · 900 CR</button><button class="btn small" id="upgrade-handling">HANDLING · 700 CR</button></div><div class="modal-actions"><button class="btn" id="garage-close">CLOSE GARAGE</button></div>`);
  for (const button of modalContent.querySelectorAll('[data-car]')) button.onclick = () => {
    const def = carCatalog.find(c => c.id === button.dataset.car);
    if (!owned.has(def.id)) { if (money < def.price) { showToast('Not enough credits. Complete a contract to earn more.'); return; } owned.add(def.id); setMoney(money - def.price); showToast(`${def.id} added to your collection.`); }
    selectedCar = parkedCars[carCatalog.indexOf(def)];
    selectedCar.visible = true; selectedCar.userData.speed = 0;
    selectedCar.position.set(-20 + carCatalog.indexOf(def) * 4.5, 0, 29);
    selectedCar.userData.heading = -Math.PI / 2; selectedCar.rotation.y = -Math.PI / 2;
    $('#vehicle-name').textContent = def.id.toUpperCase(); saveProgress(); closeModal(); showToast(`${def.id} selected. Find it at the garage bay.`);
  };
  $('#garage-close').onclick = closeModal;
  $('#upgrade-engine').onclick = () => purchaseUpgrade('engine', 900);
  $('#upgrade-handling').onclick = () => purchaseUpgrade('handling', 700);
}
function purchaseUpgrade(kind, price) {
  if (!selectedCar) { showToast('Select an owned vehicle first.'); return; }
  if (money < price) { showToast('Not enough credits.'); return; }
  const upgrades = selectedCar.userData.upgrades;
  if (upgrades[kind] >= 3) { showToast(`${kind} tuning is already maxed.`); return; }
  upgrades[kind]++; setMoney(money - price); saveProgress(); showToast(`${kind.toUpperCase()} tuning installed · LEVEL ${upgrades[kind]}`); renderGarage();
}
function interact() {
  if (!gameStarted || paused || garageOpen) return;
  if (interactTarget?.type === 'car') {
    const car = interactTarget.car;
    if (activeCar === car) exitCar(); else enterCar(car);
  } else if (interactTarget?.type === 'garage') renderGarage();
  else if (interactTarget?.type === 'mission') beginMission();
}
function beginMission() {
  if (!missionActive) {
    missionActive = true; missionComplete = false; missionTimer = 140;
    const objective = objectives[missionIndex % objectives.length];
    marker.position.set(objective.x, .15, objective.z);
    updateMissionPanel(); showToast(`${objective.title} started. Follow the cyan beacon.`);
  } else showToast('Follow the objective beacon to complete the contract.');
}
function finishMission() {
  const objective = objectives[missionIndex % objectives.length];
  missionActive = false; missionComplete = true; setMoney(money + objective.reward); xp += 250;
  showToast(`${objective.title} complete · +${fmt(objective.reward)} CR · +250 XP`);
  missionIndex++; saveProgress(); updateMissionPanel();
  marker.position.set(-18, .15, 31);
}
function enterCar(car) {
  activeCar = car; car.userData.speed = 0; character.visible = false;
  $('#vehicle-hud').classList.remove('hidden'); $('#controls-hint').textContent = 'W / ↑ ACCELERATE · S / ↓ BRAKE · A D STEER · SHIFT NITRO · E EXIT · ESC PAUSE';
  $('#vehicle-name').textContent = car.userData.def.id.toUpperCase(); showToast(`You're in the ${car.userData.def.id}. Keep it clean out there.`);
}
function exitCar() {
  if (!activeCar) return;
  const car = activeCar; car.userData.speed = 0;
  const side = new THREE.Vector3(1.7, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.userData.heading);
  player.pos.set(car.position.x + side.x, 0, car.position.z + side.z); player.heading = car.userData.heading;
  activeCar = null; character.visible = true; $('#vehicle-hud').classList.add('hidden');
  $('#controls-hint').textContent = 'W A S D  ·  MOVE     E  ·  INTERACT     SHIFT  ·  SPRINT     SPACE  ·  JUMP     C  ·  CROUCH';
  showToast('Back on foot. Your car is parked nearby.');
}
$('#start-btn').onclick = startGame;
$('#how-btn').onclick = () => showModal(`<div class="eyebrow">QUICK START</div><h2>OWN THE NIGHT<span>.</span></h2><p class="modal-lede">Explore freely, hop into any parked car, and take contracts for credits. Use the central neon garage to switch vehicles and tune your ride.</p><div class="key-list"><span><b>W A S D</b> Move / steer</span><span><b>E</b> Interact / enter / exit</span><span><b>SHIFT</b> Sprint / nitro</span><span><b>SPACE · C</b> Jump · crouch</span><span><b>ESC</b> Pause</span></div><div class="modal-actions"><button class="btn primary" id="how-close">GOT IT</button></div>`);
$('#pause-btn').onclick = openPause; $('#resume-btn').onclick = resumeGame; $('#settings-btn').onclick = openSettings;
$('#quit-btn').onclick = () => {
  paused = false; gameStarted = false; currentScreen = 'menu'; missionActive = false;
  if (activeCar) { activeCar.userData.speed = 0; activeCar = null; character.visible = true; }
  $('#vehicle-hud').classList.add('hidden'); $('#pause-screen').classList.add('hidden'); hud.classList.add('hidden');
  $('#menu-screen').classList.remove('hidden'); marker.position.set(-18, .15, 31); saveProgress();
};
$('#modal-close').onclick = closeModal;
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
ui.addEventListener('click', e => { if (e.target.id === 'how-close') closeModal(); });

const buildingBounds = buildings.map(b => ({ x: b.position.x, z: b.position.z, hx: b.scale.x / 2 + .7, hz: b.scale.z / 2 + .7, y: b.scale.y }));
function resolveBuildings(pos, radius = .55) {
  for (const b of buildingBounds) {
    if (pos.y > b.y + 1) continue;
    const dx = pos.x - b.x, dz = pos.z - b.z;
    if (Math.abs(dx) < b.hx + radius && Math.abs(dz) < b.hz + radius) {
      const px = b.hx + radius - Math.abs(dx), pz = b.hz + radius - Math.abs(dz);
      if (px < pz) pos.x += Math.sign(dx || 1) * px; else pos.z += Math.sign(dz || 1) * pz;
    }
  }
  pos.x = clamp(pos.x, -226, 226); pos.z = clamp(pos.z, -226, 226);
}
function addPedestrian(x, z, phase) {
  const group = new THREE.Group(); group.position.set(x, 0, z); scene.add(group);
  const coat = mat([0x4c446e, 0x287a83, 0x943858, 0x967039][Math.floor(Math.random() * 4)], .65, .05);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.24, .65, 3, 7), coat); body.position.y = .92; group.add(body);
  const face = new THREE.Mesh(new THREE.SphereGeometry(.16, 8, 7), skin); face.position.y = 1.48; group.add(face);
  const neon = box(group, 0, 1.42, -.14, .3, .035, .035, Math.random() > .5 ? M.cyan : M.purple); neon.material = neon.material;
  pedestrians.push({ group, phase, speed: .45 + Math.random() * .45, radius: 5 + Math.random() * 2 });
}
for (let i = 0; i < 22; i++) {
  const road = Math.floor(Math.random() * 7) * 60 - 180;
  const lane = Math.floor(Math.random() * 6) * 60 - 150;
  addPedestrian(road + (Math.random() < .5 ? -10 : 10), lane + (Math.random() < .5 ? -12 : 12), Math.random() * Math.PI * 2);
}
function nearestInteraction() {
  let nearest = null, dist = Infinity;
  const px = activeCar ? activeCar.position.x : player.pos.x, pz = activeCar ? activeCar.position.z : player.pos.z;
  const garageDist = Math.hypot(px + 8, pz - 11);
  if (!activeCar && garageDist < 8) { nearest = { type: 'garage', distance: garageDist }; dist = garageDist; }
  const target = missionActive ? marker.position : new THREE.Vector3(-18, .1, 31);
  const missionDist = Math.hypot(px - target.x, pz - target.z);
  // The contract beacon takes precedence over the tightly parked cars around it.
  if (!activeCar && !missionActive && missionDist < 7) { nearest = { type: 'mission', distance: missionDist }; dist = missionDist; }
  if (activeCar) {
    nearest = { type: 'car', car: activeCar, distance: 0 };
    dist = 0;
  } else if (nearest?.type !== 'mission') for (const car of parkedCars) {
    if (!car.visible) continue;
    const d = Math.hypot(px - car.position.x, pz - car.position.z);
    if (d < 4.8 && d < dist) { nearest = { type: 'car', car, distance: d }; dist = d; }
  }
  interactTarget = nearest;
  if (nearest) {
    let prompt;
    if (nearest.type === 'car') prompt = nearest.car === activeCar ? '[ E ]  EXIT VEHICLE' : `[ E ]  DRIVE ${nearest.car.userData.def.id.toUpperCase()}`;
    else if (nearest.type === 'garage') prompt = '[ E ]  OPEN NEON GARAGE';
    else prompt = '[ E ]  START CONTRACT';
    promptEl.textContent = prompt; promptEl.classList.remove('hidden');
  } else promptEl.classList.add('hidden');
  $('#mission-distance').textContent = missionActive
    ? `${Math.max(0, Math.round(missionDist))} M · ${Math.floor(missionTimer / 60)}:${String(Math.floor(missionTimer % 60)).padStart(2, '0')}`
    : 'CONTRACT READY';
  const miniX = clamp((px + 230) / 460 * 100, 4, 96), miniY = clamp((pz + 230) / 460 * 100, 4, 96);
  $('.map-player').style.left = `${miniX}%`; $('.map-player').style.top = `${miniY}%`;
  const ox = missionActive ? marker.position.x : -18, oz = missionActive ? marker.position.z : 31;
  $('.map-objective').style.left = `${clamp((ox + 230) / 460 * 100, 4, 96)}%`; $('.map-objective').style.top = `${clamp((oz + 230) / 460 * 100, 4, 96)}%`;
  $('.map-garage').style.left = '48%'; $('.map-garage').style.top = '50%';
}
function updateOnFoot(dt) {
  let ix = 0, iz = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) iz -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) iz += 1;
  ix += touchX; iz += touchY;
  const mag = Math.hypot(ix, iz); if (mag > 1) { ix /= mag; iz /= mag; }
  const sin = Math.sin(cameraYaw), cos = Math.cos(cameraYaw);
  const dx = ix * cos + iz * -sin, dz = ix * sin + iz * cos;
  const moving = mag > .08;
  const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight') || touchSprint;
  player.crouched = keys.has('KeyC');
  const speed = player.crouched ? 2.1 : sprint ? 9.5 : 5.2;
  player.vel.x = THREE.MathUtils.damp(player.vel.x, dx * speed, moving ? 12 : 10, dt);
  player.vel.z = THREE.MathUtils.damp(player.vel.z, dz * speed, moving ? 12 : 10, dt);
  player.pos.x += player.vel.x * dt; player.pos.z += player.vel.z * dt;
  resolveBuildings(player.pos, .58);
  player.walking = moving;
  if (moving) {
    player.heading = Math.atan2(-dx, -dz);
    walkTime += dt * (sprint ? 12 : 8);
    legL.rotation.x = Math.sin(walkTime) * .55; legR.rotation.x = -Math.sin(walkTime) * .55;
    armL.rotation.x = -Math.sin(walkTime) * .42; armR.rotation.x = Math.sin(walkTime) * .42;
  } else { legL.rotation.x *= .75; legR.rotation.x *= .75; armL.rotation.x *= .75; armR.rotation.x *= .75; }
  const grounded = player.pos.y <= 0.001;
  if (grounded && jumpQueued) { jumpVelocity = 7.6; jumpQueued = false; }
  player.pos.y = Math.max(0, player.pos.y + jumpVelocity * dt);
  if (player.pos.y === 0) jumpVelocity = 0; else jumpVelocity -= 18 * dt;
  torso.position.y = player.crouched ? -.45 : 0;
  character.position.set(player.pos.x, player.pos.y, player.pos.z); character.rotation.y = player.heading;
}
function updateCar(dt) {
  if (!activeCar) return;
  const data = activeCar.userData, upgrades = data.upgrades;
  const def = data.def, forward = keys.has('KeyW') || keys.has('ArrowUp') || touchY < -.2;
  const reverse = keys.has('KeyS') || keys.has('ArrowDown') || touchY > .2;
  const steer = (keys.has('KeyA') || keys.has('ArrowLeft') ? -1 : 0) + (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) + touchX;
  const boosting = (keys.has('ShiftLeft') || keys.has('ShiftRight') || touchSprint) && nitro > 0 && Math.abs(data.speed) > 2;
  const maxSpeed = def.speed * (1 + upgrades.engine * .12) * (boosting ? 1.45 : 1);
  if (forward) data.speed += def.accel * (1 + upgrades.engine * .08) * dt;
  else if (reverse) data.speed -= def.accel * .8 * dt;
  else data.speed = THREE.MathUtils.damp(data.speed, 0, 1.1, dt);
  data.speed = clamp(data.speed, -def.speed * .34, maxSpeed);
  if (boosting) nitro = Math.max(0, nitro - 29 * dt); else nitro = Math.min(100, nitro + 10 * dt);
  const normalized = clamp(Math.abs(data.speed) / Math.max(1, maxSpeed), 0, 1);
  data.heading += steer * def.handling * (1 + upgrades.handling * .1) * (0.25 + normalized) * dt * Math.sign(data.speed || 1);
  activeCar.rotation.y = data.heading; activeCar.userData.heading = data.heading;
  for (const wheel of data.wheels) { wheel.rotation.x -= data.speed * dt / .37; if (wheel.userData.steer) wheel.rotation.y = -steer * .32; }
  const oldX = activeCar.position.x, oldZ = activeCar.position.z;
  activeCar.position.x += -Math.sin(data.heading) * data.speed * dt;
  activeCar.position.z += -Math.cos(data.heading) * data.speed * dt;
  const test = activeCar.position.clone(); resolveBuildings(test, 1.25);
  if (test.x !== activeCar.position.x || test.z !== activeCar.position.z) { data.speed *= -.22; activeCar.position.set(test.x, 0, test.z); }
  activeCar.position.y = 0; player.pos.set(activeCar.position.x, 0, activeCar.position.z);
  $('#speed').textContent = String(Math.round(Math.abs(data.speed) * 3.6)).padStart(3, '0');
  $('#gear').textContent = data.speed < -1 ? 'R · SPORT' : boosting ? 'D · BOOST' : 'D · SPORT';
  $('#nitro-fill').style.width = `${nitro}%`;
  if (Math.hypot(activeCar.position.x - oldX, activeCar.position.z - oldZ) > .02) { /* motion intentionally stays quiet */ }
}
let jumpQueued = false, jumpVelocity = 0, touchX = 0, touchY = 0, touchSprint = false;
const stick = $('[data-stick]');
if (stick) {
  let pointer = null;
  const moveStick = event => {
    const rect = stick.getBoundingClientRect();
    touchX = clamp((event.clientX - rect.left - rect.width / 2) / (rect.width * .35), -1, 1);
    touchY = clamp((event.clientY - rect.top - rect.height / 2) / (rect.height * .35), -1, 1);
    stick.style.setProperty('--stick-x', `${touchX * 28}px`); stick.style.setProperty('--stick-y', `${touchY * 28}px`);
  };
  stick.addEventListener('pointerdown', event => { pointer = event.pointerId; stick.setPointerCapture(pointer); moveStick(event); });
  stick.addEventListener('pointermove', event => { if (pointer === event.pointerId) moveStick(event); });
  const resetStick = () => { pointer = null; touchX = touchY = 0; stick.style.setProperty('--stick-x', '0px'); stick.style.setProperty('--stick-y', '0px'); };
  stick.addEventListener('pointerup', resetStick); stick.addEventListener('pointercancel', resetStick);
}
for (const button of ui.querySelectorAll('[data-action]')) {
  const action = button.dataset.action;
  const down = event => { event.preventDefault(); if (action === 'interact') interact(); if (action === 'jump') jumpQueued = true; if (action === 'sprint') touchSprint = true; };
  const up = () => { if (action === 'sprint') touchSprint = false; };
  button.addEventListener('pointerdown', down); button.addEventListener('pointerup', up); button.addEventListener('pointercancel', up); button.addEventListener('pointerleave', up);
}
window.addEventListener('keydown', event => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
  keys.add(event.code);
  if (event.repeat) return;
  if (event.code === 'KeyE') interact();
  if (event.code === 'Space') jumpQueued = true;
  if (event.code === 'Escape') {
    if (!modal.classList.contains('hidden')) closeModal();
    else if (paused) resumeGame(); else openPause();
  }
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => { keys.clear(); touchSprint = false; });
renderer.domElement.addEventListener('click', () => {
  if (gameStarted && !paused && document.pointerLockElement !== renderer.domElement && matchMedia('(pointer:fine)').matches) renderer.domElement.requestPointerLock?.();
});
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement) return; });
document.addEventListener('mousemove', event => {
  if (document.pointerLockElement === renderer.domElement && gameStarted && !paused) {
    cameraYaw -= event.movementX * .0024; cameraPitch = clamp(cameraPitch + event.movementY * .0012, -.12, .48);
  }
});
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight);
});
const cameraTarget = new THREE.Vector3();
function updateCamera(dt) {
  const inCar = !!activeCar;
  const subject = inCar ? activeCar.position : player.pos;
  const yaw = inCar ? activeCar.userData.heading + cameraYaw : cameraYaw;
  const distance = inCar ? 10 : 7.3;
  const height = inCar ? 4.2 : 5.2;
  const desired = new THREE.Vector3(subject.x + Math.sin(yaw) * distance, subject.y + height, subject.z + Math.cos(yaw) * distance);
  camera.position.lerp(desired, 1 - Math.exp(-5.5 * dt));
  cameraTarget.set(subject.x, subject.y + (inCar ? 1 : 1.25), subject.z);
  camera.lookAt(cameraTarget);
}
function updateWorld(dt) {
  dayClock += dt;
  const cycle = (Math.sin(dayClock * .025 - .8) + 1) / 2;
  const night = 1 - cycle * .24;
  moon.intensity = .65 + night * .9; cityGlow.intensity = 70 + night * 35;
  const sky = new THREE.Color(0x080a18).lerp(new THREE.Color(0x201c39), cycle * .42);
  scene.background.copy(sky); scene.fog.color.copy(sky);
  marker.rotation.y += dt * 1.1; markerBeam.material.opacity = .12 + Math.sin(dayClock * 3) * .045;
  markerRing.scale.setScalar(1 + Math.sin(dayClock * 2.8) * .07);
  for (const pedestrian of pedestrians) {
    const a = pedestrian.phase + dayClock * pedestrian.speed * .14;
    pedestrian.group.position.x += Math.cos(a) * pedestrian.speed * dt;
    pedestrian.group.position.z += Math.sin(a) * pedestrian.speed * dt;
    pedestrian.group.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
    if (Math.random() < .0008) pedestrian.phase += Math.PI * (Math.random() > .5 ? 1 : -1);
  }
  for (const car of traffic) {
    car.position.x -= car.userData.aiSpeed * dt;
    if (car.position.x < -235) car.position.x = 235;
    car.userData.wheels.forEach(wheel => wheel.rotation.x -= car.userData.aiSpeed * dt / .37);
  }
}
let lastInteractionTick = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), .04);
  updateWorld(dt);
  if (gameStarted && !paused && !garageOpen) {
    if (activeCar) updateCar(dt); else updateOnFoot(dt);
    if (missionActive) {
      missionTimer -= dt;
      if (missionTimer <= 0) { missionActive = false; marker.position.set(-18, .15, 31); updateMissionPanel(); showToast('Contract expired. Return to the cyan beacon to try again.'); }
      const target = marker.position;
      const distance = Math.hypot((activeCar ? activeCar.position.x : player.pos.x) - target.x, (activeCar ? activeCar.position.z : player.pos.z) - target.z);
      const objective = objectives[missionIndex % objectives.length];
      if (distance < 7 && (objective.kind !== 'drive' || activeCar)) finishMission();
    }
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) toastEl.classList.add('hidden'); }
    nearestInteraction(); updateCamera(dt);
  } else updateCamera(dt);
  renderer.render(scene, camera);
}
marker.position.set(-18, .15, 31);
character.position.set(player.pos.x, player.pos.y, player.pos.z);
camera.position.set(player.pos.x, 6, player.pos.z + 8); camera.lookAt(player.pos.x, 1, player.pos.z);
updateMissionPanel(); animate();


