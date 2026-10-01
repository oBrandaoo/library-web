import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { books, coverUrl, workUrl } from './catalog.js';
import './style.css';
import './characters.css';
import './basement.css';

const $ = (selector) => document.querySelector(selector);
const sceneElement = $('#scene');
const loading = $('#loading');
const welcome = $('#welcome');
const hud = $('#hud');
const bookPanel = $('#book-panel');
const characterPanel = $('#character-panel');
const helpPanel = $('#help-panel');
const prompt = $('#book-prompt');
const isTouch = matchMedia('(pointer: coarse)').matches;

function drawWrapped(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const words = text.split(' ');
  let line = '';
  let lines = 0;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      ctx.fillText(line, x, y + lines * lineHeight);
      lines++;
      line = word;
      if (lines >= maxLines) return;
    } else line = candidate;
  }
  if (line) ctx.fillText(line, x, y + lines * lineHeight);
}

function canvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function makeSpine(book) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = book.color; ctx.fillRect(0, 0, 128, 512);
  ctx.fillStyle = '#d7b77e'; ctx.fillRect(10, 18, 108, 3); ctx.fillRect(10, 491, 108, 3);
  ctx.strokeStyle = '#d7b77ebb'; ctx.strokeRect(15, 32, 98, 447);
  ctx.save(); ctx.translate(64, 256); ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#f1e9d7'; ctx.font = '500 29px Georgia, serif'; ctx.textAlign = 'center';
  ctx.fillText(book.title.length > 24 ? `${book.title.slice(0, 22)}…` : book.title, 0, 9, 395);
  ctx.restore();
  return canvasTexture(canvas);
}

books.forEach((book) => { book.spine = makeSpine(book); book.cover = null; book.coverStatus = 'loading'; book.coverMaterials = []; });

const coverLoader = new THREE.TextureLoader();
coverLoader.setCrossOrigin('anonymous');
function loadCovers() {
  books.forEach((book) => {
    coverLoader.load(coverUrl(book), (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      book.cover = texture;
      book.coverStatus = 'ready';
      for (const material of book.coverMaterials) { material.map = texture; material.color.set('#ffffff'); material.needsUpdate = true; }
      if (currentBook === book) $('#cover-status').textContent = '';
    }, undefined, () => {
      book.coverStatus = 'error';
      if (currentBook === book) $('#cover-status').textContent = 'Capa indisponível no momento';
    });
  });
}

function createWoodTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#513b29'; ctx.fillRect(0, 0, 512, 512);
  let seed = 19;
  const random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  for (let row = 0; row < 8; row++) {
    const y = row * 64;
    ctx.fillStyle = row % 2 ? '#59402c' : '#4b3526'; ctx.fillRect(0, y, 512, 62);
    ctx.fillStyle = '#251d18'; ctx.fillRect(0, y + 61, 512, 3);
    const seam = row % 2 ? 164 : 338;
    ctx.fillRect(seam, y, 2, 63);
    for (let i = 0; i < 31; i++) {
      ctx.strokeStyle = `rgba(${random() > .5 ? '194,139,88' : '23,17,12'},${.04 + random() * .14})`;
      ctx.lineWidth = 1 + random() * 2;
      const yy = y + random() * 58;
      ctx.beginPath(); ctx.moveTo(0, yy); ctx.bezierCurveTo(130, yy + random() * 6, 345, yy - random() * 5, 512, yy + random() * 3); ctx.stroke();
    }
  }
  const texture = canvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 8);
  return texture;
}

function createConcreteTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#46514b'; ctx.fillRect(0, 0, 512, 512);
  let seed = 804;
  const random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  for (let i = 0; i < 6400; i++) {
    const shade = random() > .5 ? '206,218,194' : '22,37,32';
    ctx.fillStyle = `rgba(${shade},${.018 + random() * .065})`;
    ctx.fillRect(random() * 512, random() * 512, 1 + random() * 8, 1 + random() * 5);
  }
  for (let i = 0; i < 14; i++) {
    const x = random() * 512, y = random() * 512;
    ctx.strokeStyle = 'rgba(16,27,24,.15)'; ctx.lineWidth = .5 + random();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - .5) * 90, y + random() * 100); ctx.stroke();
  }
  const texture = canvasTexture(canvas); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(3, 4);
  return texture;
}

function makeStreetBackdrop() {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const sky = ctx.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, '#14242b'); sky.addColorStop(.62, '#2a3a3d'); sky.addColorStop(1, '#302b24');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, 1024, 512);
  const buildings = [[0, 215, 205], [193, 190, 145], [328, 240, 220], [541, 180, 175], [711, 210, 170], [864, 175, 210]];
  buildings.forEach(([x, width, top], index) => {
    ctx.fillStyle = index % 2 ? '#263334' : '#222c2d'; ctx.fillRect(x, top, width, 335);
    ctx.fillStyle = '#667171'; ctx.fillRect(x + 8, top + 9, width - 16, 5);
    for (let row = 0; row < 5; row++) for (let col = 0; col < Math.floor(width / 38); col++) {
      ctx.fillStyle = (row + col + index) % 3 === 0 ? '#b29a68' : '#3c5050';
      ctx.fillRect(x + 17 + col * 38, top + 29 + row * 48, 18, 28);
      ctx.fillStyle = '#19292a'; ctx.fillRect(x + 25 + col * 38, top + 29 + row * 48, 2, 28);
    }
  });
  ctx.fillStyle = '#121b1d'; ctx.fillRect(0, 432, 1024, 80);
  ctx.fillStyle = '#7d6a4e'; ctx.fillRect(0, 433, 1024, 3);
  for (const x of [130, 742]) {
    ctx.fillStyle = '#151d1d'; ctx.fillRect(x, 180, 6, 262);
    const glow = ctx.createRadialGradient(x + 3, 205, 2, x + 3, 205, 60);
    glow.addColorStop(0, '#e7c4839a'); glow.addColorStop(1, '#e7c48300');
    ctx.fillStyle = glow; ctx.fillRect(x - 57, 145, 120, 120);
    ctx.fillStyle = '#ecd4a3'; ctx.fillRect(x - 5, 193, 16, 9);
  }
  return canvasTexture(canvas);
}

function makeLabel(text, width = 512, height = 128, color = '#e8d7b5', bg = '#203230') {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#c6a575'; ctx.lineWidth = 2; ctx.strokeRect(10, 10, width - 20, height - 20);
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${height * .35}px Georgia,serif`;
  ctx.fillText(text, width / 2, height / 2, width - 42);
  return canvasTexture(canvas);
}

let renderer, scene, camera, controls, previewRenderer, previewScene, previewCamera, previewBook;
let basementDoorPivot = null, basementDoorLeaf = null, cageDoorPivot = null, cageDoorLeaf = null;
let basementDoorOpen = false, cageDoorOpen = false;
let previewCoverPivot = null, previewCoverMaterial = null, previewSourceBook = null, previewOpen = false;
let previewPageTextures = [];
let started = false, currentBook = null, focusedBook = null, focusedCharacter = null, focusedAction = null, currentCharacter = null, hoverMesh = null, helpOpen = false;
let suppressUnlock = false, lastTime = performance.now(), previewDrag = false, previewLastX = 0, touchLook = null, touchMoved = false;
const keys = new Set();
const interactive = [];
const characterMeshes = [];
const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);
const collisionBoxes = [];
const previewCanvas = $('#book-viewer');
const discoveredBooks = new Set();
let displayedLocation = '';
const people = [
  { id: 'joe', name: 'Joe Goldberg', role: 'Na bancada central da Mooney’s', image: '/characters/joe.png', x: .45, z: .82,
    line: 'A primeira visita sempre começa com uma escolha. Paula Fox está logo ali.', bookId: 'OL67368W' },
  { id: 'beck', name: 'Guinevere Beck', role: 'Entre as estantes de ficção', image: '/characters/beck.png', x: 4.1, z: 6.4,
    line: 'Estou procurando Paula Fox. Me disseram que Desperate Characters está por aqui.', bookId: 'OL67368W' },
];

function box(width, height, depth, material, x, y, z, cast = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z); mesh.castShadow = cast; mesh.receiveShadow = true; scene.add(mesh); return mesh;
}

function plane(width, height, material, x, y, z, rotationY = 0) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.set(x, y, z); mesh.rotation.y = rotationY; mesh.receiveShadow = true; scene.add(mesh); return mesh;
}

function makeRoom() {
  scene.background = new THREE.Color('#101914');
  scene.fog = new THREE.Fog('#142019', 19, 40);
  const floorMaterial = new THREE.MeshStandardMaterial({ map: createWoodTexture(), roughness: .82, metalness: .04 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 32), floorMaterial); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wall = new THREE.MeshStandardMaterial({ color: '#29352e', roughness: .96 });
  const wallDark = new THREE.MeshStandardMaterial({ color: '#16201c', roughness: .96 });
  const trim = new THREE.MeshStandardMaterial({ color: '#493424', roughness: .72 });
  const brass = new THREE.MeshStandardMaterial({ color: '#ae8953', roughness: .35, metalness: .7 });
  box(8.65, 7, .3, wall, -5.675, 3.5, -16, false);
  box(8.65, 7, .3, wall, 5.675, 3.5, -16, false);
  box(2.7, 3.65, .3, wall, 0, 5.18, -16, false);
  box(.3, 7, 32, wall, -10, 3.5, 0, false); box(.3, 7, 32, wall, 10, 3.5, 0, false);
  box(20, .3, 32, wallDark, 0, 7, 0, false);
  // The shopfront faces York Avenue, as it does on the set.
  const street = new THREE.MeshBasicMaterial({ map: makeStreetBackdrop(), side: THREE.DoubleSide, fog: false });
  plane(20, 7, street, 0, 3.5, 19.8, Math.PI);
  const windowGlass = new THREE.MeshPhysicalMaterial({ color: '#658a88', transparent: true, opacity: .19, roughness: .14, metalness: .05, depthWrite: false, side: THREE.DoubleSide });
  for (const x of [-6.45, 6.45]) {
    box(5.9, 5.35, .045, windowGlass, x, 3.45, 15.82, false);
    for (const dx of [-3.05, 0, 3.05]) box(.11, 5.55, .13, trim, x + dx, 3.48, 15.7);
    box(6.05, .1, .13, trim, x, 3.55, 15.69);
  }
  box(2.9, 5.4, .04, windowGlass, 0, 3.42, 15.83, false);
  for (const x of [-1.52, 0, 1.52]) box(.09, 5.5, .14, trim, x, 3.42, 15.71);
  box(2.9, .08, .13, trim, 0, 3.55, 15.7);
  for (const x of [-2.47, 2.47]) box(1.88, 5.5, .2, trim, x, 3.42, 15.75);
  box(20, .94, .24, trim, 0, 6.55, 15.68);
  box(20, .21, .23, trim, 0, .24, 15.69);
  box(.045, .42, .13, brass, .92, 1.73, 15.59);
  const doorSign = new THREE.MeshBasicMaterial({ map: makeLabel("MOONEY'S", 512, 120, '#e9d8bb', '#30251f'), side: THREE.DoubleSide });
  plane(1.63, .38, doorSign, 0, 2.88, 15.58, Math.PI);
  const storefrontSign = new THREE.MeshBasicMaterial({ map: makeLabel("MOONEY'S · RARE & USED", 768, 140, '#eadcc5', '#2b211b'), side: THREE.DoubleSide });
  plane(7.6, .8, storefrontSign, 0, 6.46, 15.52, Math.PI);
  const streetGlow = new THREE.PointLight('#a3b8ae', 8, 11); streetGlow.position.set(0, 3.8, 14.5); scene.add(streetGlow);
  for (const x of [-9.8, 9.8]) { box(.12, 1.1, 31.8, trim, x, .58, 0, false); box(.1, .09, 31.8, brass, x * .991, 1.15, 0, false); }
  for (const x of [-5.64, 5.64]) box(8.65, .18, .16, trim, x, .13, -15.75, false);
  for (const z of [-14, -7, 0, 7, 14]) {
    box(19.7, .26, .28, trim, 0, 6.73, z, false);
    for (const x of [-9.5, 9.5]) box(.2, 6.6, .24, trim, x, 3.4, z, false);
  }
  for (let i = 0; i < 10; i++) { const x = -9 + i * 2; box(.095, .1, 31.7, trim, x, 6.78, 0, false); }

  const wornRunner = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 8.1), new THREE.MeshStandardMaterial({ color: '#4b302e', roughness: 1 }));
  wornRunner.rotation.x = -Math.PI / 2; wornRunner.position.set(0, .018, 9.1); wornRunner.receiveShadow = true; scene.add(wornRunner);
  for (const x of [-1.21, 1.21]) box(.025, .006, 7.95, brass, x, .021, 9.1, false);

  // The back wall is the visual destination for the walk through the room.
  const glass = new THREE.MeshStandardMaterial({ color: '#0b2f34', emissive: '#153c44', emissiveIntensity: .75, metalness: .25, roughness: .3 });
  const archiveMaterials = ['#724939', '#445c56', '#866b4c', '#4c5362', '#654553'].map(color => new THREE.MeshStandardMaterial({ color, roughness: .8 }));
  for (const x of [-4.8, 4.8]) {
    box(2.7, 3.4, .06, glass, x, 3.75, -15.78, false);
    box(2.86, .12, .22, brass, x, 5.52, -15.65); box(2.86, .12, .22, brass, x, 1.98, -15.65);
    for (const dx of [-1.42, 1.42]) box(.12, 3.58, .21, brass, x + dx, 3.75, -15.65);
    box(.08, 3.45, .15, brass, x, 3.75, -15.59); box(2.7, .08, .15, brass, x, 3.8, -15.59);
    for (const y of [2.45, 3.47, 4.48]) {
      box(2.6, .07, .3, trim, x, y - .43, -15.42);
      for (let i = 0; i < 12; i++) {
        const width = .13 + (i % 3) * .035;
        box(width, .64 + (i % 4) * .055, .24,
          archiveMaterials[(i + (x < 0 ? 0 : 2)) % archiveMaterials.length],
          x - 1.15 + i * .205, y, -15.34, false);
      }
    }
    const glow = new THREE.PointLight('#47818a', 3.5, 8); glow.position.set(x, 4, -15); scene.add(glow);
  }
  const signMat = new THREE.MeshBasicMaterial({ map: makeLabel('RARE BOOKS · FIRST EDITIONS', 768, 140, '#f2e4ca', '#1d2c25'), side: THREE.DoubleSide });
  plane(5.9, 1.07, signMat, 0, 4.65, -15.79);
  box(6.2, 1.25, .09, trim, 0, 4.65, -15.87);
  for (const x of [-3.2, 3.2]) box(.06, 1.25, .12, brass, x, 4.65, -15.75);

  // The rear door opens onto the stairs rather than pretending to be the cage.
  for (const x of [-1.35, 1.35]) box(.18, 3.42, .26, trim, x, 1.72, -15.61);
  box(2.88, .18, .26, trim, 0, 3.43, -15.61);
  const doorWood = new THREE.MeshStandardMaterial({ color: '#423026', roughness: .9 });
  basementDoorPivot = new THREE.Group(); basementDoorPivot.position.set(-1.25, 0, -15.48); scene.add(basementDoorPivot);
  const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.17, .11), doorWood);
  doorLeaf.position.set(1.25, 1.62, 0); doorLeaf.castShadow = true;
  doorLeaf.userData.action = 'basement-door'; basementDoorPivot.add(doorLeaf); interactive.push(doorLeaf);
  basementDoorLeaf = doorLeaf;
  for (const localX of [.38, 1.25, 2.12]) {
    const batten = new THREE.Mesh(new THREE.BoxGeometry(.045, 2.92, .025), trim);
    batten.position.set(localX, 1.62, .069); basementDoorPivot.add(batten);
  }
  const handle = new THREE.Mesh(new THREE.SphereGeometry(.105, 12, 8), brass);
  handle.position.set(2.17, 1.56, .15); basementDoorPivot.add(handle);
  const archiveMat = new THREE.MeshBasicMaterial({ map: makeLabel('ACESSO AO PORÃO', 512, 100, '#e8d2b4', '#17251f'), side: THREE.DoubleSide });
  plane(1.94, .36, archiveMat, 0, 3.78, -15.46);
  const redBulb = new THREE.Mesh(new THREE.SphereGeometry(.09, 12, 8), new THREE.MeshBasicMaterial({ color: '#a83439' }));
  redBulb.position.set(0, 3.8, -15.42); scene.add(redBulb);
  const redGlow = new THREE.PointLight('#9b3237', 2.4, 3); redGlow.position.set(0, 3.8, -15.2); scene.add(redGlow);

  const ambient = new THREE.HemisphereLight('#c0d5cb', '#3a271d', 1.75); scene.add(ambient);
  const fill = new THREE.DirectionalLight('#e6d4b4', 1.1); fill.position.set(1, 6, 9); scene.add(fill);
  for (const z of [9, 2, -5, -12]) addPendant(z);
}

function addPendant(z) {
  const brass = new THREE.MeshStandardMaterial({ color: '#9b7746', metalness: .74, roughness: .33 });
  const shade = new THREE.MeshStandardMaterial({ color: '#d2bd8b', emissive: '#b18d57', emissiveIntensity: .26, side: THREE.DoubleSide });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, 1.1, 8), brass); stem.position.set(0, 6.33, z); scene.add(stem);
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(.19, .55, .32, 32, 1, true), shade); shell.position.set(0, 5.64, z); scene.add(shell);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.21, .21, .06, 24), brass); cap.position.set(0, 5.82, z); scene.add(cap);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.12, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffdaa3' })); bulb.position.set(0, 5.47, z); scene.add(bulb);
  const light = new THREE.PointLight('#ffd5a2', 24, 10, 2); light.position.set(0, 5.44, z); light.castShadow = z === 2; light.shadow.mapSize.set(512, 512); scene.add(light);
}

function addShelves() {
  const wood = new THREE.MeshStandardMaterial({ color: '#48301f', roughness: .76 });
  const woodLight = new THREE.MeshStandardMaterial({ color: '#6b4b31', roughness: .72 });
  const brass = new THREE.MeshStandardMaterial({ color: '#b18c58', roughness: .35, metalness: .7 });
  const colors = ['#613e39','#99745a','#465e52','#324a5a','#7a6244','#5c4a68','#9c6a52','#4f6964','#765a44','#383f50'];
  const decorative = colors.map(color => ({ material: new THREE.MeshStandardMaterial({ color, roughness: .78 }), transforms: [] }));
  let seed = 77;
  const random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const segments = [-11.55, -4.48, 2.58, 9.65];
  const categories = ['Raridades', 'Ficção', 'Clássicos', 'Literatura'];
  for (const side of [-1, 1]) {
    for (let segment = 0; segment < 4; segment++) {
      const z = segments[segment], x = side * 8.67;
      box(1.42, 5.65, .15, wood, side * 9.34, 2.9, z);
      for (const end of [-1, 1]) box(1.45, 5.75, .13, woodLight, x, 2.9, z + end * 3.06);
      for (let level = 0; level < 6; level++) {
        const y = .25 + level * 1.01;
        box(1.55, .11, 6.2, woodLight, x, y, z);
        box(.035, .035, 6.15, brass, side * 7.91, y + .052, z);
      }
      box(1.6, .32, 6.35, wood, x, 5.98, z);
      const labelMat = new THREE.MeshBasicMaterial({ map: makeLabel(categories[segment]), side: THREE.DoubleSide });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, .8), labelMat);
      sign.position.set(side * 7.86, 5.55, z); sign.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2; scene.add(sign);
      for (let level = 0; level < 5; level++) {
        let local = -2.85;
        while (local < 2.75) {
          const thickness = .11 + random() * .11;
          const height = .57 + random() * .27;
          const depth = .31 + random() * .12;
          const group = decorative[Math.floor(random() * decorative.length)];
          group.transforms.push({ x: side * (8.16 + depth / 2), y: .31 + level * 1.01 + height / 2, z: z + local + thickness / 2, depth, height, thickness, lean: random() < .06 ? (random() - .5) * .12 : 0 });
          local += thickness + .018 + random() * .018;
        }
      }
    }
  }
  const dummy = new THREE.Object3D();
  for (const group of decorative) {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), group.material, group.transforms.length);
    group.transforms.forEach((item, i) => { dummy.position.set(item.x, item.y, item.z); dummy.rotation.set(item.lean, 0, 0); dummy.scale.set(item.depth, item.height, item.thickness); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); });
    mesh.instanceMatrix.needsUpdate = true; mesh.castShadow = false; mesh.receiveShadow = true; scene.add(mesh);
  }
}

function addDisplayTable(x, z) {
  const wood = new THREE.MeshStandardMaterial({ color: '#5f412a', roughness: .65 });
  const inset = new THREE.MeshStandardMaterial({ color: '#906b45', roughness: .7 });
  const brass = new THREE.MeshStandardMaterial({ color: '#b39460', metalness: .55, roughness: .37 });
  box(4.6, .22, 2.05, wood, x, .9, z); box(4.35, .025, 1.82, inset, x, 1.025, z);
  for (const dx of [-1.9, 1.9]) for (const dz of [-.72, .72]) { box(.25, .83, .25, wood, x + dx, .415, z + dz); box(.31, .06, .31, brass, x + dx, .12, z + dz); }
  box(4.45, .045, .04, brass, x, .805, z + 1.015); box(4.45, .045, .04, brass, x, .805, z - 1.015);
  collisionBoxes.push({ minX: x - 2.63, maxX: x + 2.63, minZ: z - 1.35, maxZ: z + 1.35 });
}

function bookMaterials(book, spineAtPositiveX = false) {
  const cover = new THREE.MeshStandardMaterial({ color: book.cover ? '#ffffff' : book.color, map: book.cover, roughness: .7 });
  book.coverMaterials.push(cover);
  const spine = new THREE.MeshStandardMaterial({ map: book.spine, roughness: .72 });
  const pages = new THREE.MeshStandardMaterial({ color: '#e8ddc7', roughness: .92 });
  const back = new THREE.MeshStandardMaterial({ color: book.color, roughness: .75 });
  return spineAtPositiveX ? [spine, back, pages, pages, cover, back] : [back, spine, pages, pages, cover, back];
}

function addBook(book, x, y, z, place = 'display', side = -1) {
  let mesh;
  if (place === 'display') {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(.7, .97, .105), bookMaterials(book));
    mesh.position.set(x, y, z); mesh.rotation.y = x < 0 ? .16 : -.16;
    const stand = new THREE.Mesh(new THREE.BoxGeometry(.73, .045, .22), new THREE.MeshStandardMaterial({ color: '#a88758', metalness: .45, roughness: .5 }));
    stand.position.set(x, y - .5, z + .035); scene.add(stand);
  } else {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(.39, .83, .23), bookMaterials(book, side === -1));
    mesh.position.set(side * 8.04, y, z);
  }
  mesh.castShadow = true; mesh.userData.book = book; scene.add(mesh); interactive.push(mesh); return mesh;
}

function addDetails() {
  addDisplayTable(-4.6, 6.2); addDisplayTable(4.6, -5.75);
  const displayX = [-1.55, -.52, .52, 1.55];
  displayX.forEach((x, index) => addBook(books[index], x - 4.6, 1.52, 6.22));
  displayX.forEach((x, index) => addBook(books[index + 4], x + 4.6, 1.52, -5.73));
  const segments = [-11.55, -4.48, 2.58, 9.65];
  for (let sideIndex = 0; sideIndex < 2; sideIndex++) {
    const side = sideIndex === 0 ? -1 : 1;
    for (let segment = 0; segment < 4; segment++) {
      const base = 8 + sideIndex * 12 + segment * 3;
      [-2.05, 0, 2.05].forEach((offset, index) =>
        addBook(books[base + index], 0, 1.7 + index * 1.01, segments[segment] + offset, 'shelf', side));
    }
  }
  const plantMat = new THREE.MeshStandardMaterial({ color: '#324f3c', roughness: .8, side: THREE.DoubleSide });
  const potMat = new THREE.MeshStandardMaterial({ color: '#9a7756', roughness: .91 });
  for (const [x, z] of [[-6.5, 12], [6.5, 12], [-6.5, -13.7], [6.5, -13.7]]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(.42, .29, .7, 12), potMat); pot.position.set(x, .38, z); scene.add(pot);
    for (let i = 0; i < 9; i++) { const leaf = new THREE.Mesh(new THREE.ConeGeometry(.2, .95 + (i % 3) * .2, 5), plantMat); leaf.position.set(x + Math.cos(i * 2.4) * .24, 1.05 + (i % 2) * .17, z + Math.sin(i * 2.4) * .24); leaf.rotation.z = Math.cos(i * 2.4) * .45; leaf.rotation.x = Math.sin(i * 2.4) * .45; scene.add(leaf); }
  }
}

function addMooneysDetails() {
  const darkWood = new THREE.MeshStandardMaterial({ color: '#422c20', roughness: .76 });
  const wornWood = new THREE.MeshStandardMaterial({ color: '#76543a', roughness: .75 });
  const metal = new THREE.MeshStandardMaterial({ color: '#8a7960', metalness: .55, roughness: .5 });
  const greenGlass = new THREE.MeshStandardMaterial({ color: '#326b55', emissive: '#1a4b38', emissiveIntensity: .32, roughness: .3, metalness: .15 });

  // The central counter is the store's anchor, with room to circulate on both sides.
  const counterZ = 2.25;
  box(5.3, .98, 1.65, darkWood, 0, .54, counterZ);
  box(5.55, .14, 1.82, wornWood, 0, 1.08, counterZ);
  const curvedEnd = box(.9, .97, 1.5, darkWood, -2.68, .54, counterZ); curvedEnd.rotation.y = -.3;
  box(5.4, .04, .055, metal, 0, .95, counterZ + .84);
  for (let x = -2.5; x < 2.55; x += .31) box(.025, .7, .045, wornWood, x, .52, counterZ + .835, false);
  const counterSign = new THREE.MeshBasicMaterial({ map: makeLabel("MOONEY'S", 512, 120, '#e5d5b8', '#362b24'), side: THREE.DoubleSide });
  plane(2.3, .48, counterSign, 0, .54, counterZ + .88);
  collisionBoxes.push({ minX: -3.25, maxX: 3.05, minZ: counterZ - 1.1, maxZ: counterZ + 1.1 });

  const register = box(.8, .32, .52, metal, -1.55, 1.31, counterZ - .24);
  register.rotation.y = -.15;
  box(.48, .12, .07, darkWood, -1.55, 1.55, counterZ - .13);
  for (let i = 0; i < 10; i++) box(.045, .018, .04, darkWood, -1.78 + (i % 5) * .1, 1.49, counterZ + .08 + Math.floor(i / 5) * .075);
  const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .75, 8), metal); lampStem.position.set(1.75, 1.55, counterZ - .34); scene.add(lampStem);
  const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(.15, .42, .23, 24), greenGlass); lampShade.position.set(1.75, 1.92, counterZ - .34); scene.add(lampShade);
  const deskLight = new THREE.PointLight('#e5c988', 11, 3.5); deskLight.position.set(1.75, 1.75, counterZ - .2); scene.add(deskLight);
  for (let i = 0; i < 3; i++) {
    const stack = box(.65 + i * .08, .08, .45 + i * .04, new THREE.MeshStandardMaterial({ color: ['#6b3d37', '#4c5d54', '#7a654c'][i], roughness: .8 }), .15, 1.2 + i * .09, counterZ + .2);
    stack.rotation.y = -.12 + i * .07;
  }
  // A ledger, brass bell and pencil cup give the counter a working-bookshop feel.
  box(.72, .035, .5, new THREE.MeshStandardMaterial({ color: '#a99470', roughness: .95 }), .88, 1.18, counterZ + .05).rotation.y = .13;
  const bell = new THREE.Mesh(new THREE.SphereGeometry(.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), metal);
  bell.position.set(-.88, 1.2, counterZ + .08); scene.add(bell);
  box(.29, .018, .29, metal, -.88, 1.16, counterZ + .08);
  const pencilCup = new THREE.Mesh(new THREE.CylinderGeometry(.12, .1, .23, 10), darkWood);
  pencilCup.position.set(2.24, 1.25, counterZ + .24); scene.add(pencilCup);
  for (let i = 0; i < 4; i++) {
    const pencil = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .35 + i * .035, 6), metal);
    pencil.position.set(2.17 + i * .045, 1.47, counterZ + .22 + (i % 2) * .04);
    pencil.rotation.z = (i - 1.5) * .12; scene.add(pencil);
  }

  // Low glass cabinets make the centre of the store feel lived in without closing the aisles.
  const caseGlass = new THREE.MeshPhysicalMaterial({ color: '#a1b6a9', transparent: true, opacity: .18, roughness: .08, depthWrite: false, side: THREE.DoubleSide });
  for (const [x, z] of [[-4.85, -9.35], [4.85, -3.3]]) {
    box(2.8, .72, 1.15, darkWood, x, .37, z);
    box(2.95, .075, 1.3, wornWood, x, .77, z);
    box(2.75, .52, 1.1, caseGlass, x, 1.08, z, false);
    box(2.95, .045, 1.3, metal, x, 1.36, z);
    for (const dx of [-1.4, 1.4]) for (const dz of [-.59, .59]) box(.035, .55, .035, metal, x + dx, 1.08, z + dz);
    collisionBoxes.push({ minX: x - 1.7, maxX: x + 1.7, minZ: z - .9, maxZ: z + .9 });
  }

  // A rolling ladder is one of the set's recognizable bookstore details.
  for (const x of [-7.82, -7.2]) {
    const rail = box(.09, 5.55, .1, wornWood, x, 2.78, -7.95);
    rail.rotation.x = -.13;
  }
  for (let step = 0; step < 12; step++) box(.67, .07, .25, wornWood, -7.51, .38 + step * .43, -7.67 - step * .055);
  const wheelMat = new THREE.MeshStandardMaterial({ color: '#171f1d', roughness: .8 });
  for (const x of [-7.82, -7.2]) { const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .09, 12), wheelMat); wheel.rotation.z = Math.PI / 2; wheel.position.set(x, .13, -7.65); scene.add(wheel); }

  // The set's spiral stair reads as a sculptural detail in the back corner.
  const stairX = 6, stairZ = -11.55;
  const stairPole = new THREE.Mesh(new THREE.CylinderGeometry(.09, .11, 5.7, 14), metal);
  stairPole.position.set(stairX, 2.86, stairZ); scene.add(stairPole);
  for (let i = 0; i < 13; i++) {
    const angle = i * .47 - 1.5;
    const step = box(1.12, .085, .37, wornWood,
      stairX + Math.cos(angle) * .58, .27 + i * .4, stairZ + Math.sin(angle) * .58);
    step.rotation.y = -angle;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.023, .023, .72, 6), metal);
    post.position.set(stairX + Math.cos(angle) * 1.08, .65 + i * .4, stairZ + Math.sin(angle) * 1.08);
    scene.add(post);
  }
  collisionBoxes.push({ minX: 4.66, maxX: 7.26, minZ: -12.94, maxZ: -10.15 });

  // A book cart fills the aisle beside Beck without blocking the route to the basement.
  const cartX = 6.15, cartZ = 9.45;
  for (const y of [.3, .9, 1.5]) box(1.15, .075, .63, wornWood, cartX, y, cartZ);
  for (const x of [cartX - .55, cartX + .55]) for (const z of [cartZ - .29, cartZ + .29]) {
    box(.045, 1.48, .045, metal, x, .82, z);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .07, 12), wheelMat);
    wheel.rotation.z = Math.PI / 2; wheel.position.set(x, .13, z); scene.add(wheel);
  }
  for (let i = 0; i < 10; i++) {
    const cover = new THREE.MeshStandardMaterial({ color: ['#675347', '#324d48', '#67563d', '#463c54'][i % 4], roughness: .83 });
    box(.085, .36 + (i % 3) * .045, .35, cover, cartX - .45 + i * .1, 1.12, cartZ, false);
  }
  collisionBoxes.push({ minX: 5.35, maxX: 6.95, minZ: 8.85, maxZ: 10.05 });

  // A small bronze bust sits over the glass cabinet.
  const bronze = new THREE.MeshStandardMaterial({ color: '#897051', metalness: .45, roughness: .62 });
  box(.48, .15, .43, wornWood, 4.8, 1.5, -3.3);
  const bustShoulders = new THREE.Mesh(new THREE.SphereGeometry(.29, 12, 8), bronze);
  bustShoulders.scale.set(1.1, .46, .56); bustShoulders.position.set(4.8, 1.7, -3.3); scene.add(bustShoulders);
  const bustHead = new THREE.Mesh(new THREE.SphereGeometry(.19, 12, 10), bronze);
  bustHead.scale.y = 1.26; bustHead.position.set(4.8, 2.02, -3.3); scene.add(bustHead);

  const motes = new Float32Array(260 * 3);
  let seed = 14;
  const random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  for (let i = 0; i < 260; i++) { motes[i * 3] = (random() - .5) * 15; motes[i * 3 + 1] = 1 + random() * 5; motes[i * 3 + 2] = -15 + random() * 28; }
  const dust = new THREE.BufferGeometry(); dust.setAttribute('position', new THREE.BufferAttribute(motes, 3));
  scene.add(new THREE.Points(dust, new THREE.PointsMaterial({ color: '#d9c9a7', size: .018, transparent: true, opacity: .27, depthWrite: false })));
}

function makeBasement() {
  const concrete = new THREE.MeshStandardMaterial({ map: createConcreteTexture(), color: '#a2a69b', roughness: 1 });
  const darkConcrete = new THREE.MeshStandardMaterial({ color: '#252f2b', roughness: 1 });
  const iron = new THREE.MeshStandardMaterial({ color: '#39433f', metalness: .62, roughness: .48 });
  const agedWood = new THREE.MeshStandardMaterial({ color: '#49392a', roughness: .88 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#bed4c8', transparent: true, opacity: .12, roughness: .12, metalness: .08, depthWrite: false, side: THREE.DoubleSide });
  const glassDoor = new THREE.MeshPhysicalMaterial({ color: '#cce0d2', transparent: true, opacity: .18, roughness: .1, metalness: .04, depthWrite: false, side: THREE.DoubleSide });

  // A narrow stairwell descends continuously from the rear door.
  for (const x of [-1.37, 1.37]) box(.24, 7.75, 6.55, concrete, x, -.35, -19.2, false);
  box(2.95, .2, 6.7, darkConcrete, 0, 3.58, -19.2, false);
  for (let i = 0; i < 12; i++) {
    const z = -16.12 - i * .53, top = -(i + 1) * .35;
    box(2.43, .16, .56, concrete, 0, top - .08, z);
    box(2.43, .35, .07, darkConcrete, 0, top - .175, z - .27, false);
    box(2.42, .025, .035, iron, 0, top + .007, z + .27, false);
  }
  const up = new THREE.Vector3(0, 1, 0);
  for (const x of [-1.18, 1.18]) {
    const start = new THREE.Vector3(x, 1.02, -16.05), end = new THREE.Vector3(x, -3.16, -22.05);
    const direction = end.clone().sub(start), rail = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, direction.length(), 8), iron);
    rail.position.copy(start).add(end).multiplyScalar(.5);
    rail.quaternion.setFromUnitVectors(up, direction.normalize()); scene.add(rail);
  }

  const basementFloor = new THREE.Mesh(new THREE.PlaneGeometry(14.8, 16.1), concrete);
  basementFloor.rotation.x = -Math.PI / 2; basementFloor.position.set(0, -4.2, -30.15);
  basementFloor.receiveShadow = true; scene.add(basementFloor);
  for (const x of [-7.4, 7.4]) box(.25, 6.8, 16.1, concrete, x, -.8, -30.15, false);
  box(14.8, 6.8, .25, concrete, 0, -.8, -38.15, false);
  for (const x of [-4.35, 4.35]) box(6.05, 6.8, .25, concrete, x, -.8, -22.16, false);
  box(14.8, .25, 16.1, darkConcrete, 0, 2.67, -30.15, false);
  for (let z = -23; z > -38; z -= 1.5) box(14.5, .006, .018, darkConcrete, 0, -4.185, z, false);

  // Metal-framed glass room: visitors can open its door and walk inside.
  const cageFront = -28.65, cageBack = -35.25, cageCenter = -31.95;
  for (const x of [-3.25, 3.25]) {
    box(.045, 3.55, 6.6, glass, x, -2.35, cageCenter, false);
    for (const z of [-35.25, -33.6, -31.95, -30.3, -28.65]) box(.07, 3.65, .08, iron, x, -2.35, z);
    box(.09, .08, 6.7, iron, x, -.54, cageCenter); box(.09, .08, 6.7, iron, x, -4.16, cageCenter);
  }
  box(6.5, 3.55, .045, glass, 0, -2.35, cageBack, false);
  for (const x of [-3.25, -1.63, 0, 1.63, 3.25]) box(.07, 3.65, .08, iron, x, -2.35, cageBack);
  box(6.5, .08, .09, iron, 0, -.54, cageBack); box(6.5, .08, .09, iron, 0, -4.16, cageBack);
  for (const x of [-1.98, 1.98]) box(2.55, 3.55, .045, glass, x, -2.35, cageFront, false);
  for (const x of [-3.25, -.7, .7, 3.25]) box(.075, 3.65, .1, iron, x, -2.35, cageFront);
  box(6.5, .08, .1, iron, 0, -.54, cageFront); box(6.5, .08, .1, iron, 0, -4.16, cageFront);
  cageDoorPivot = new THREE.Group(); cageDoorPivot.position.set(-.66, 0, cageFront + .09); scene.add(cageDoorPivot);
  cageDoorLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.32, 3.42, .05), glassDoor);
  cageDoorLeaf.position.set(.66, -2.35, 0); cageDoorLeaf.userData.action = 'cage-door';
  cageDoorPivot.add(cageDoorLeaf); interactive.push(cageDoorLeaf);
  for (const localX of [.02, 1.3]) {
    const upright = new THREE.Mesh(new THREE.BoxGeometry(.06, 3.48, .08), iron);
    upright.position.set(localX, -2.35, .035); cageDoorPivot.add(upright);
  }
  const cageHandle = new THREE.Mesh(new THREE.BoxGeometry(.06, .42, .08), iron);
  cageHandle.position.set(1.1, -2.35, .095); cageDoorPivot.add(cageHandle);
  const cageLock = new THREE.Mesh(new THREE.BoxGeometry(.19, .23, .14), iron);
  cageLock.position.set(1.2, -2.68, .12); cageDoorPivot.add(cageLock);
  const doorCrossbar = new THREE.Mesh(new THREE.BoxGeometry(1.25, .055, .08), iron);
  doorCrossbar.position.set(.66, -2.74, .055); cageDoorPivot.add(doorCrossbar);
  const cageSign = new THREE.MeshBasicMaterial({ map: makeLabel('QUARTO DE VIDRO', 512, 100, '#c8dfd3', '#1b2c2a'), side: THREE.DoubleSide });
  plane(2.85, .43, cageSign, 0, -.2, cageFront + .1);
  collisionBoxes.push(
    { minX: -3.48, maxX: -3.04, minZ: cageBack - .16, maxZ: cageFront + .16 },
    { minX: 3.04, maxX: 3.48, minZ: cageBack - .16, maxZ: cageFront + .16 },
    { minX: -3.3, maxX: 3.3, minZ: cageBack - .2, maxZ: cageBack + .16 },
    { minX: -3.3, maxX: -.7, minZ: cageFront - .2, maxZ: cageFront + .2 },
    { minX: .7, maxX: 3.3, minZ: cageFront - .2, maxZ: cageFront + .2 },
    { minX: -.7, maxX: .7, minZ: cageFront - .2, maxZ: cageFront + .2, action: 'cage-door' }
  );

  const booksMetal = ['#75634d', '#58473f', '#4a5d56', '#73514b', '#59616b'].map(color => new THREE.MeshStandardMaterial({ color, roughness: .82 }));
  for (const y of [-3.78, -2.74, -1.7]) {
    box(5.55, .11, .55, agedWood, 0, y, -34.55);
    for (let i = 0; i < 27; i++) {
      box(.16, .62 + (i % 4) * .055, .3, booksMetal[i % booksMetal.length], -2.58 + i * .195, y + .39, -34.48, false);
    }
  }
  for (const x of [-2.78, 2.78]) box(.12, 2.75, .65, agedWood, x, -2.56, -34.55);
  const cageRug = new THREE.Mesh(new THREE.PlaneGeometry(4.35, 3.1), new THREE.MeshStandardMaterial({ color: '#493b38', roughness: 1 }));
  cageRug.rotation.x = -Math.PI / 2; cageRug.position.set(0, -4.183, -31.62); scene.add(cageRug);
  box(2.15, .1, .95, agedWood, 0, -3.25, -31.92);
  for (const x of [-.92, .92]) for (const z of [-32.3, -31.55]) box(.1, .84, .1, iron, x, -3.69, z);
  collisionBoxes.push({ minX: -1.32, maxX: 1.32, minZ: -32.62, maxZ: -31.25 });
  addBook(books[6], -.5, -2.67, -31.88);
  addBook(books[29], .5, -2.67, -31.88);
  box(.63, .08, .65, agedWood, 1.95, -3.43, -30.85);
  for (const x of [1.72, 2.18]) box(.08, .65, .08, iron, x, -3.8, -30.85);

  // Restoration bench, boxes, pipes and cold light age the basement.
  box(2.55, .12, 1.16, agedWood, -5.4, -3.38, -26.2);
  for (const x of [-6.48, -4.32]) for (const z of [-26.65, -25.75]) box(.11, .75, .11, iron, x, -3.8, z);
  collisionBoxes.push({ minX: -6.8, maxX: -4, minZ: -27.05, maxZ: -25.35 });
  for (let i = 0; i < 5; i++) {
    const paper = box(.42, .012, .31, new THREE.MeshStandardMaterial({ color: i % 2 ? '#b7aa8a' : '#d1c4a6', roughness: 1 }), -6.1 + i * .33, -3.29 + i * .014, -26.12 + (i % 2) * .1, false);
    paper.rotation.y = i * .12;
  }
  box(.35, .44, .34, iron, -4.56, -3.09, -26.45);
  for (const [x, z] of [[5.8, -25.7], [5.2, -36.1], [-5.9, -35.9]]) {
    for (let i = 0; i < 3; i++) box(.75, .46, .58, agedWood, x + (i % 2) * .18, -3.95 + i * .45, z + (i % 2) * .1);
  }
  for (const x of [-6.95, 6.95]) {
    box(.08, .08, 14.8, iron, x, 1.15, -30);
    for (const z of [-25, -29, -33, -37]) box(.16, .13, .3, iron, x, 1.15, z);
  }
  for (const z of [-25.5, -31.8, -36.5]) {
    box(1.4, .06, .13, new THREE.MeshBasicMaterial({ color: '#b9d6c6' }), 0, 2.46, z, false);
    const light = new THREE.PointLight(z === -31.8 ? '#86b7aa' : '#9fae9f', z === -31.8 ? 24 : 10, 10);
    light.position.set(0, 2.2, z); scene.add(light);
  }
  const insideLight = new THREE.PointLight('#d0e3ce', 12, 5.6);
  insideLight.position.set(0, -1.38, -32.9); scene.add(insideLight);
  const benchLight = new THREE.PointLight('#c8ab78', 7, 4); benchLight.position.set(-5.3, -1.9, -26); scene.add(benchLight);
}

function addCharacters() {
  const loader = new THREE.TextureLoader();
  collisionBoxes.push({ minX: 3.57, maxX: 4.63, minZ: 5.93, maxZ: 6.87 });
  const beckLight = new THREE.PointLight('#e2c89e', 5, 5); beckLight.position.set(4.1, 3.25, 6.4); scene.add(beckLight);
  people.forEach((person, index) => {
    loader.load(person.image, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      const material = new THREE.MeshStandardMaterial({ map: texture, transparent: true, alphaTest: .12, side: THREE.DoubleSide, depthWrite: true, roughness: 1 });
      const figure = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.25), material);
      figure.position.set(person.x, 1.14, person.z);
      figure.castShadow = true;
      figure.userData.character = person;
      figure.userData.baseY = 1.14;
      figure.userData.phase = index * 1.7;
      scene.add(figure); interactive.push(figure); characterMeshes.push(figure);
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(.55, 32), new THREE.MeshBasicMaterial({ color: '#0b110e', transparent: true, opacity: .36, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2; shadow.scale.y = .55;
      shadow.position.set(person.x, .027, person.z); scene.add(shadow);
    }, undefined, (error) => console.warn(`Imagem indisponível: ${person.name}`, error));
  });
}

function setupPreview() {
  previewRenderer = new THREE.WebGLRenderer({ canvas: previewCanvas, alpha: true, antialias: true });
  previewRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  previewRenderer.outputColorSpace = THREE.SRGBColorSpace;
  previewScene = new THREE.Scene();
  previewCamera = new THREE.PerspectiveCamera(34, 1, .1, 20); previewCamera.position.set(0, 0, 5.7);
  previewScene.add(new THREE.AmbientLight('#ffffff', 2.1));
  const light = new THREE.DirectionalLight('#fff2d3', 3.5); light.position.set(-2, 4, 5); previewScene.add(light);
  previewBook = new THREE.Group(); previewScene.add(previewBook);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.05, 40), new THREE.MeshBasicMaterial({ color: '#3a3128', transparent: true, opacity: .12, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.52; previewScene.add(shadow);
}

function makeInteriorTexture(book, side) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 720;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#eee4cf'; ctx.fillRect(0, 0, 512, 720);
  ctx.fillStyle = '#d9cbae'; ctx.fillRect(side === 'left' ? 0 : 476, 0, 36, 720);
  ctx.strokeStyle = '#a89a7e'; ctx.lineWidth = 2; ctx.strokeRect(38, 36, 436, 648);
  ctx.fillStyle = '#7b6550'; ctx.font = '600 18px DM Sans, sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(side === 'left' ? 'SOBRE A OBRA' : 'EM YOU', 58, 94);
  ctx.fillStyle = '#302d27'; ctx.font = '42px Georgia, serif';
  drawWrapped(ctx, book.title, 58, 166, 390, 49, 3);
  ctx.fillStyle = '#695b4a'; ctx.font = '22px Georgia, serif'; ctx.fillText(book.author, 58, 310, 390);
  ctx.strokeStyle = '#b6a98e'; ctx.beginPath(); ctx.moveTo(58, 345); ctx.lineTo(450, 345); ctx.stroke();
  ctx.fillStyle = '#3e4037'; ctx.font = '22px Georgia, serif';
  if (side === 'left') drawWrapped(ctx, book.description, 58, 398, 390, 32, 7);
  else {
    ctx.fillText(`Temporada ${book.season}`, 58, 407);
    ctx.fillText(`Primeira publicação: ${book.year}`, 58, 455);
    ctx.font = '18px DM Sans, sans-serif'; ctx.fillStyle = '#786e5e';
    drawWrapped(ctx, book.moment, 58, 520, 390, 28, 5);
  }
  const texture = canvasTexture(canvas); previewPageTextures.push(texture); return texture;
}

function clearPreview() {
  if (previewSourceBook && previewCoverMaterial) previewSourceBook.coverMaterials = previewSourceBook.coverMaterials.filter((material) => material !== previewCoverMaterial);
  previewBook.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry.dispose();
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) material.dispose();
  });
  previewBook.clear();
  previewPageTextures.forEach((texture) => texture.dispose()); previewPageTextures = [];
  previewCoverPivot = null; previewCoverMaterial = null; previewSourceBook = null;
}

function buildPreview(book) {
  clearPreview();
  const paper = new THREE.MeshStandardMaterial({ color: '#eee4cf', roughness: .88 });
  const edge = new THREE.MeshStandardMaterial({ color: '#cfc1a9', roughness: .9 });
  const rightPage = new THREE.MeshStandardMaterial({ map: makeInteriorTexture(book, 'right'), roughness: .92 });
  const insideCover = new THREE.MeshStandardMaterial({ map: makeInteriorTexture(book, 'left'), roughness: .92 });
  const pageBlock = new THREE.Mesh(new THREE.BoxGeometry(1.36, 1.97, .18), [edge, edge, paper, paper, rightPage, paper]);
  previewBook.add(pageBlock);
  const backBoard = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2, .035), new THREE.MeshStandardMaterial({ color: book.color, roughness: .8 }));
  backBoard.position.z = -.12; previewBook.add(backBoard);
  previewCoverPivot = new THREE.Group(); previewCoverPivot.position.set(-.7, 0, .115); previewBook.add(previewCoverPivot);
  previewCoverMaterial = new THREE.MeshStandardMaterial({ color: book.cover ? '#ffffff' : book.color, map: book.cover, roughness: .66 });
  book.coverMaterials.push(previewCoverMaterial); previewSourceBook = book;
  const cover = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2, .04), [paper, paper, paper, paper, previewCoverMaterial, insideCover]);
  cover.position.set(.7, 0, 0); previewCoverPivot.add(cover);
  previewBook.rotation.set(.04, -.36, 0);
  previewBook.position.x = 0;
  previewOpen = false; $('#open-book').textContent = 'Abrir modelo'; $('#open-book').setAttribute('aria-pressed', 'false');
}

function resize() {
  if (!renderer) return;
  const width = sceneElement.clientWidth, height = sceneElement.clientHeight;
  camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false);
  if (previewRenderer) { const w = previewCanvas.clientWidth, h = previewCanvas.clientHeight; previewCamera.aspect = w / h; previewCamera.updateProjectionMatrix(); previewRenderer.setSize(w, h, false); }
}

function setPanelState(panel, open) { panel.classList.toggle('open', open); panel.setAttribute('aria-hidden', String(!open)); }

function openCharacter(character) {
  if (!character) return;
  if (currentBook) closeBook(false);
  if (helpOpen) closeHelp(false);
  currentCharacter = character;
  history.replaceState(null, '', `${location.pathname}${location.search}#personagem=${character.id}`);
  $('#character-name').textContent = character.name;
  $('#character-role').textContent = character.role;
  $('#character-line').textContent = character.line;
  $('#character-book').dataset.workId = character.bookId;
  suppressUnlock = !!controls?.isLocked; controls?.unlock();
  characterPanel.inert = false;
  setPanelState(characterPanel, true);
  document.body.classList.add('character-open');
  $('#close-character').focus();
}

function closeCharacter(relock = true) {
  currentCharacter = null;
  syncBookUrl(null);
  setPanelState(characterPanel, false);
  characterPanel.inert = true;
  document.body.classList.remove('character-open');
  if (relock && started && !isTouch) controls.lock();
}

function syncBookUrl(book, opened = false) {
  const hash = book ? `#livro=${book.workId}${opened ? '&aberto=1' : ''}` : '';
  history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
}

function openHelp() {
  if (currentBook) closeBook(false);
  if (currentCharacter) closeCharacter(false);
  helpOpen = true; suppressUnlock = !!controls?.isLocked; controls?.unlock(); setPanelState(helpPanel, true);
}

function closeHelp(relock = true) {
  helpOpen = false; setPanelState(helpPanel, false);
  if (relock && started && !isTouch) controls.lock();
}

function openBook(book) {
  if (!book) return;
  if (currentCharacter) closeCharacter(false);
  syncBookUrl(book);
  currentBook = book; helpOpen = false; setPanelState(helpPanel, false);
  suppressUnlock = !!controls?.isLocked; controls?.unlock();
  discoveredBooks.add(book.workId);
  $('#discovery-progress').textContent = `${discoveredBooks.size} de ${books.length} referências descobertas`;
  $('#book-category').textContent = book.category;
  $('#book-season').textContent = `Temporada ${book.season}`;
  $('#book-moment').textContent = book.moment;
  $('#book-position').textContent = `${String(books.indexOf(book) + 1).padStart(2, '0')} / ${books.length}`;
  $('#book-title').textContent = book.title;
  $('#book-author').textContent = book.author;
  $('#book-description').textContent = book.description;
  $('#book-year').textContent = `Publicado em ${book.year}`;
  $('#book-source').href = workUrl(book);
  $('#cover-status').textContent = book.coverStatus === 'ready' ? '' : book.coverStatus === 'error' ? 'Capa indisponível no momento' : 'Carregando capa real...';
  $('#book-scrim').classList.add('open');
  setPanelState(bookPanel, true);
  buildPreview(book);
  $('#close-book').focus();
  requestAnimationFrame(resize);
}

function closeBook(relock = true) {
  currentBook = null; setPanelState(bookPanel, false); $('#book-scrim').classList.remove('open');
  syncBookUrl(null);
  if (relock && started && !isTouch) controls.lock();
}

function floorHeightAt(z) {
  if (z >= -15.65) return 0;
  if (z <= -22.2) return -4.2;
  return -4.2 * (-15.65 - z) / 6.55;
}

function moveAllowed(x, z) {
  if (z > 15.05 || z < -37.6) return false;
  if (z >= -15.6 && (x < -7.2 || x > 7.2)) return false;
  if (z < -15.6 && z > -22.2 && (!basementDoorOpen || Math.abs(x) > 1.1)) return false;
  if (z <= -22.2 && Math.abs(x) > 6.9) return false;
  for (const b of collisionBoxes) {
    if (b.action === 'cage-door' && cageDoorOpen) continue;
    if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ) return false;
  }
  return true;
}

function updateMovement(delta) {
  if (!started || currentBook || currentCharacter || helpOpen || !keys.size) return;
  const forward = new THREE.Vector3(); camera.getWorldDirection(forward); forward.y = 0; forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
  const motion = new THREE.Vector3();
  if (keys.has('KeyW') || keys.has('ArrowUp') || keys.has('forward')) motion.add(forward);
  if (keys.has('KeyS') || keys.has('ArrowDown') || keys.has('backward')) motion.sub(forward);
  if (keys.has('KeyD') || keys.has('ArrowRight') || keys.has('right')) motion.add(right);
  if (keys.has('KeyA') || keys.has('ArrowLeft') || keys.has('left')) motion.sub(right);
  if (!motion.lengthSq()) return;
  motion.normalize().multiplyScalar((keys.has('ShiftLeft') ? 5.5 : 3.25) * Math.min(delta, .05));
  if (moveAllowed(camera.position.x + motion.x, camera.position.z)) camera.position.x += motion.x;
  if (moveAllowed(camera.position.x, camera.position.z + motion.z)) camera.position.z += motion.z;
  camera.position.y = floorHeightAt(camera.position.z) + 1.7 + Math.sin(performance.now() * .01) * .012;
}

function updateFocus() {
  if (!started || currentBook || currentCharacter || helpOpen) { prompt.hidden = true; focusedBook = null; focusedCharacter = null; focusedAction = null; return; }
  raycaster.setFromCamera(center, camera); raycaster.far = 4.2;
  const hit = raycaster.intersectObjects(interactive, false)[0];
  const mesh = hit?.object || null;
  focusedBook = mesh?.userData.book || null;
  focusedCharacter = mesh?.userData.character || null;
  focusedAction = mesh?.userData.action || null;
  prompt.hidden = (!focusedBook && !focusedCharacter && !focusedAction) || isTouch;
  if (!prompt.hidden) prompt.querySelector('.prompt-label').textContent = focusedAction === 'basement-door' ? 'Abrir porta do porão'
    : focusedAction === 'cage-door' ? 'Abrir quarto de vidro'
      : focusedCharacter ? `Conversar com ${focusedCharacter.name.split(' ')[0]}` : 'Examinar livro';
  if (hoverMesh !== mesh) {
    if (hoverMesh) hoverMesh.scale.setScalar(1);
    if (mesh) mesh.scale.setScalar(1.07);
    hoverMesh = mesh;
  }
}

function animate(now) {
  requestAnimationFrame(animate);
  const delta = (now - lastTime) / 1000; lastTime = now;
  updateMovement(delta); updateFocus();
  if (basementDoorPivot) basementDoorPivot.rotation.y += ((basementDoorOpen ? 1.48 : 0) - basementDoorPivot.rotation.y) * Math.min(1, delta * 3.8);
  if (cageDoorPivot) cageDoorPivot.rotation.y += ((cageDoorOpen ? -1.42 : 0) - cageDoorPivot.rotation.y) * Math.min(1, delta * 3.8);
  const locationName = camera.position.z < -22.2 ? 'Porão · quarto de vidro' : camera.position.z < -15.65 ? 'Escada para o porão' : "Mooney's · térreo";
  if (displayedLocation !== locationName) { displayedLocation = locationName; $('#location-label').textContent = locationName; }
  for (const figure of characterMeshes) {
    figure.position.y = figure.userData.baseY + Math.sin(now * .0013 + figure.userData.phase) * .008;
    figure.lookAt(camera.position.x, figure.position.y, camera.position.z);
  }
  renderer.render(scene, camera);
  if (previewRenderer && currentBook) {
    if (previewCoverPivot) previewCoverPivot.rotation.y += ((previewOpen ? -2.75 : 0) - previewCoverPivot.rotation.y) * Math.min(1, delta * 8);
    previewBook.position.x += ((previewOpen ? .67 : 0) - previewBook.position.x) * Math.min(1, delta * 8);
    previewRenderer.render(previewScene, previewCamera);
  }
}

function playDoorChime() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const audio = new AudioContextClass();
  [784, 1047].forEach((frequency, index) => {
    const start = audio.currentTime + index * .16;
    const tone = audio.createOscillator();
    const volume = audio.createGain();
    tone.type = 'sine'; tone.frequency.value = frequency;
    volume.gain.setValueAtTime(0, start);
    volume.gain.linearRampToValueAtTime(.035, start + .018);
    volume.gain.exponentialRampToValueAtTime(.001, start + .7);
    tone.connect(volume).connect(audio.destination);
    tone.start(start); tone.stop(start + .72);
  });
  setTimeout(() => audio.close(), 1100);
}

function openWorldDoor(action) {
  const isBasement = action === 'basement-door';
  const leaf = isBasement ? basementDoorLeaf : cageDoorLeaf;
  if (!leaf || (isBasement ? basementDoorOpen : cageDoorOpen)) return;
  if (isBasement) basementDoorOpen = true; else cageDoorOpen = true;
  const index = interactive.indexOf(leaf);
  if (index !== -1) interactive.splice(index, 1);
  focusedAction = null; prompt.hidden = true;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const audio = new AudioContextClass(), tone = audio.createOscillator(), gain = audio.createGain();
  tone.type = 'sawtooth'; tone.frequency.setValueAtTime(145, audio.currentTime);
  tone.frequency.exponentialRampToValueAtTime(64, audio.currentTime + .48);
  gain.gain.setValueAtTime(.011, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .5);
  tone.connect(gain).connect(audio.destination); tone.start(); tone.stop(audio.currentTime + .52);
  setTimeout(() => audio.close(), 700);
}

function setupInteractions() {
  $('#enter-button').addEventListener('click', () => { playDoorChime(); started = true; welcome.classList.add('hidden'); document.body.classList.add('exploring'); hud.setAttribute('aria-hidden', 'false'); if (!isTouch) controls.lock(); });
  $('#pause-button').addEventListener('click', openHelp);
  $('#help-button').addEventListener('click', openHelp);
  $('#close-help').addEventListener('click', () => closeHelp());
  $('#resume-button').addEventListener('click', () => { if (!started) { started = true; welcome.classList.add('hidden'); document.body.classList.add('exploring'); hud.setAttribute('aria-hidden', 'false'); } closeHelp(); });
  $('#close-book').addEventListener('click', () => closeBook());
  $('#book-scrim').addEventListener('click', () => closeBook());
  $('#open-book').addEventListener('click', () => {
    previewOpen = !previewOpen;
    if (previewOpen) previewBook.rotation.y = .08;
    $('#open-book').textContent = previewOpen ? 'Fechar modelo' : 'Abrir modelo';
    $('#open-book').setAttribute('aria-pressed', String(previewOpen));
    syncBookUrl(currentBook, previewOpen);
  });
  $('#next-book').addEventListener('click', () => openBook(books[(books.indexOf(currentBook) + 1) % books.length]));
  $('#close-character').addEventListener('click', () => closeCharacter());
  $('#character-book').addEventListener('click', () => openBook(books.find((book) => book.workId === $('#character-book').dataset.workId)));
  window.addEventListener('keydown', (event) => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code)) event.preventDefault();
    if (event.code === 'Escape') { if (currentBook) closeBook(false); else if (currentCharacter) closeCharacter(false); else if (helpOpen) closeHelp(false); else if (started) openHelp(); return; }
    keys.add(event.code);
    if (event.code === 'KeyE' && focusedBook && !currentBook && !helpOpen) openBook(focusedBook);
    else if (event.code === 'KeyE' && focusedCharacter && !currentCharacter && !helpOpen) openCharacter(focusedCharacter);
    else if (event.code === 'KeyE' && focusedAction && !currentBook && !currentCharacter && !helpOpen) openWorldDoor(focusedAction);
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());
  controls.addEventListener('unlock', () => { if (suppressUnlock) { suppressUnlock = false; return; } if (started && !currentBook && !helpOpen && !isTouch) openHelp(); });
  sceneElement.addEventListener('click', (event) => {
    if (!started || currentBook || currentCharacter || helpOpen) return;
    if (isTouch) {
      if (touchMoved) { touchMoved = false; return; }
      const point = new THREE.Vector2(event.clientX / innerWidth * 2 - 1, -(event.clientY / innerHeight) * 2 + 1);
      raycaster.setFromCamera(point, camera); raycaster.far = 5;
      const hit = raycaster.intersectObjects(interactive, false)[0];
      if (hit?.object.userData.book) openBook(hit.object.userData.book);
      else if (hit?.object.userData.character) openCharacter(hit.object.userData.character);
      else if (hit?.object.userData.action) openWorldDoor(hit.object.userData.action);
    } else if (focusedBook) openBook(focusedBook);
    else if (focusedCharacter) openCharacter(focusedCharacter);
    else if (focusedAction) openWorldDoor(focusedAction);
    else if (!controls.isLocked) controls.lock();
  });
  sceneElement.addEventListener('pointerdown', (event) => { if (!isTouch || !started || currentBook || currentCharacter || helpOpen) return; touchMoved = false; touchLook = { x: event.clientX, y: event.clientY, id: event.pointerId }; });
  sceneElement.addEventListener('pointermove', (event) => {
    if (!touchLook || event.pointerId !== touchLook.id || !started || currentBook || currentCharacter || helpOpen) return;
    const dx = event.clientX - touchLook.x, dy = event.clientY - touchLook.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) touchMoved = true;
    camera.rotation.order = 'YXZ'; camera.rotation.y -= dx * .003; camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - dy * .003, -1.25, 1.25);
    touchLook.x = event.clientX; touchLook.y = event.clientY;
  });
  sceneElement.addEventListener('pointerup', () => { touchLook = null; });
  sceneElement.addEventListener('pointercancel', () => { touchLook = null; touchMoved = false; });
  for (const button of document.querySelectorAll('[data-move]')) {
    const value = button.dataset.move;
    button.addEventListener('pointerdown', (event) => { event.preventDefault(); button.setPointerCapture(event.pointerId); keys.add(value); });
    button.addEventListener('pointerup', () => keys.delete(value));
    button.addEventListener('pointercancel', () => keys.delete(value));
  }
  previewCanvas.addEventListener('pointerdown', (event) => { previewDrag = true; previewLastX = event.clientX; previewCanvas.setPointerCapture(event.pointerId); });
  previewCanvas.addEventListener('pointermove', (event) => { if (!previewDrag) return; previewBook.rotation.y += (event.clientX - previewLastX) * .012; previewLastX = event.clientX; });
  previewCanvas.addEventListener('pointerup', () => { previewDrag = false; });
  previewCanvas.addEventListener('pointercancel', () => { previewDrag = false; });
  window.addEventListener('resize', resize);
}

function init() {
  try {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, 1, .08, 65);
    camera.position.set(0, 1.7, 11.8); camera.lookAt(0, 1.78, -3);
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.31;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    sceneElement.appendChild(renderer.domElement);
    controls = new PointerLockControls(camera, renderer.domElement);
    controls.pointerSpeed = .72;
    makeRoom(); addShelves(); addDetails(); addMooneysDetails(); makeBasement(); addCharacters(); setupPreview(); setupInteractions(); resize(); loadCovers();
    const linkedParams = new URLSearchParams(location.hash.slice(1));
    const linkedWork = linkedParams.get('livro');
    const linkedBook = books.find((book) => book.workId === linkedWork);
    const linkedCharacter = people.find((person) => person.id === linkedParams.get('personagem'));
    const linkedBasement = linkedParams.has('porao') || linkedParams.has('quarto');
    if (linkedBook || linkedCharacter || linkedBasement || linkedParams.has('explorar')) {
      started = true; welcome.classList.add('hidden'); document.body.classList.add('exploring'); hud.setAttribute('aria-hidden', 'false');
      if (linkedParams.get('olhar') === 'rua') camera.lookAt(0, 2.9, 18);
      if (linkedBasement) {
        basementDoorOpen = true; basementDoorPivot.rotation.y = 1.48;
        interactive.splice(interactive.indexOf(basementDoorLeaf), 1);
        if (linkedParams.has('quarto')) {
          cageDoorOpen = true; cageDoorPivot.rotation.y = -1.42;
          interactive.splice(interactive.indexOf(cageDoorLeaf), 1);
          camera.position.set(0, -2.5, -30.05); camera.lookAt(0, -2.1, -34.6);
        } else { camera.position.set(0, -2.5, -24.1); camera.lookAt(0, -2.2, -31.8); }
      } else if (linkedBook) {
        openBook(linkedBook);
        if (linkedParams.get('aberto') === '1') { previewOpen = true; previewBook.rotation.y = .08; $('#open-book').textContent = 'Fechar modelo'; $('#open-book').setAttribute('aria-pressed', 'true'); syncBookUrl(linkedBook, true); }
      } else if (linkedCharacter) {
        camera.lookAt(linkedCharacter.x, 1.55, linkedCharacter.z);
        openCharacter(linkedCharacter);
      }
    }
    requestAnimationFrame(animate);
    requestAnimationFrame(() => { loading.classList.add('done'); setTimeout(() => loading.remove(), 700); });
  } catch (error) { console.error(error); loading.remove(); $('#unsupported').hidden = false; }
}

init();
