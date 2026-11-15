// Renders the CC0 Kenney 3D models into 2D sprite sheets from a fixed isometric camera.
// Driven by tools/bake/run.cjs through Playwright; every function here is called from there.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

/** camera: 45 degrees around, 35 degrees down (close to the classic 2:1 isometric look) */
const YAW = Math.PI / 4;
const PITCH = (35 * Math.PI) / 180;
const DIST = 60;

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
// storybook night: a warm key light, a cool sky fill and a blue rim from behind
scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x4a3a50, 1.9));
const key = new THREE.DirectionalLight(0xffe4c0, 3.0);
key.position.set(-4, 10, 6);
scene.add(key);
const rim = new THREE.DirectionalLight(0x9ab8ff, 1.8);
rim.position.set(6, 5, -8);
scene.add(rim);

const camDir = new THREE.Vector3(Math.sin(YAW) * Math.cos(PITCH), Math.sin(PITCH), Math.cos(YAW) * Math.cos(PITCH));
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
camera.position.copy(camDir).multiplyScalar(DIST);
camera.lookAt(0, 0, 0);
camera.updateMatrixWorld();
const camRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
const camFwdGround = new THREE.Vector3(-camDir.x, 0, -camDir.z).normalize();

const loader = new GLTFLoader();
const cache = new Map();
function load(url) {
  if (!cache.has(url)) cache.set(url, new Promise((res, rej) => loader.load(url, res, undefined, rej)));
  return cache.get(url);
}

/** model yaw that makes it face screen direction (sx, sy), y down */
function yawFor(sx, sy) {
  const g = camRight.clone().multiplyScalar(sx).add(camFwdGround.clone().multiplyScalar(-sy / Math.sin(PITCH)));
  return Math.atan2(g.x, g.z);
}

function tintModel(root, tint, emissive) {
  if (tint == null && emissive == null) return;
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const out = mats.map((m) => {
      const c = m.clone();
      if (tint != null) c.color.multiply(new THREE.Color(tint));
      if (emissive != null) { c.emissive = new THREE.Color(emissive[0]); c.emissiveIntensity = emissive[1]; }
      return c;
    });
    o.material = Array.isArray(o.material) ? out : out[0];
  });
}

/** sets the ortho frustum so a cell of w x h px shows the origin at (w/2, footY*h), ppu px per unit */
function frame(w, h, footY, ppu) {
  renderer.setSize(w, h, false);
  camera.left = -w / 2 / ppu; camera.right = w / 2 / ppu;
  camera.top = (footY * h) / ppu; camera.bottom = -((1 - footY) * h) / ppu;
  camera.updateProjectionMatrix();
}

/** draws the last render into ctx at (x, y) with a dark outline of `ow` px */
function blitOutlined(ctx, x, y, w, h, ow, outline) {
  const src = renderer.domElement;
  if (ow > 0) {
    const m = document.createElement('canvas');
    m.width = w; m.height = h;
    const mc = m.getContext('2d');
    mc.drawImage(src, 0, 0);
    mc.globalCompositeOperation = 'source-in';
    mc.fillStyle = outline;
    mc.fillRect(0, 0, w, h);
    for (let dx = -ow; dx <= ow; dx++) for (let dy = -ow; dy <= ow; dy++) {
      if (dx * dx + dy * dy > ow * ow + 1 || (!dx && !dy)) continue;
      ctx.drawImage(m, x + dx, y + dy);
    }
  }
  ctx.drawImage(src, x, y);
}

/** bounding box of a model in world units: { w, h, d } */
window.probe = async (urls) => {
  const out = {};
  for (const u of urls) {
    const g = await load(u);
    const b = new THREE.Box3().setFromObject(g.scene);
    const s = b.getSize(new THREE.Vector3());
    out[u] = { w: +s.x.toFixed(3), h: +s.y.toFixed(3), d: +s.z.toFixed(3), clips: g.animations.map((a) => a.name + ':' + a.duration.toFixed(2)) };
  }
  return out;
};

/**
 * A character sheet. job: { url, scale, cell:[w,h], footY, ppu, dirs, anims: { name: { clip, frames, fps, loop } }, tint, emissive, outline }
 * Rows are anim-major then direction (dir 0 = screen right, then clockwise in 360/dirs steps); columns are frames.
 */
window.bakeChar = async (job) => {
  const g = await load(job.url);
  const root = SkeletonUtils.clone(g.scene);
  tintModel(root, job.tint, job.emissive);
  root.scale.setScalar(job.scale ?? 1);
  const holder = new THREE.Group();
  holder.add(root);
  scene.add(holder);
  const mixer = new THREE.AnimationMixer(root);
  const [w, h] = job.cell;
  frame(w, h, job.footY, job.ppu);
  const names = Object.keys(job.anims);
  const cols = Math.max(...names.map((n) => job.anims[n].frames));
  const rows = names.length * job.dirs;
  const sheet = document.createElement('canvas');
  sheet.width = cols * w; sheet.height = rows * h;
  const ctx = sheet.getContext('2d');
  const meta = { cell: [w, h], anchor: [0.5, job.footY], dirs: job.dirs, cols, anims: {} };
  let row = 0;
  for (const n of names) {
    const a = job.anims[n];
    const clip = g.animations.find((c) => c.name === a.clip);
    mixer.stopAllAction();
    const act = clip ? mixer.clipAction(clip) : null;
    if (act) { act.reset(); act.play(); }
    meta.anims[n] = { row, frames: a.frames, fps: a.fps, loop: a.loop !== false };
    for (let d = 0; d < job.dirs; d++) {
      const ang = (d / job.dirs) * Math.PI * 2;
      holder.rotation.y = yawFor(Math.cos(ang), Math.sin(ang));
      for (let f = 0; f < a.frames; f++) {
        if (act) {
          const dur = clip.duration;
          const t = a.loop !== false ? (f / a.frames) * dur : (f / Math.max(1, a.frames - 1)) * dur * 0.999;
          mixer.setTime(t);
        }
        renderer.render(scene, camera);
        blitOutlined(ctx, f * w, row * h, w, h, job.outline ?? 2, 'rgba(26,18,36,0.8)');
      }
      row++;
    }
  }
  scene.remove(holder);
  return { png: sheet.toDataURL('image/webp', 0.9), meta };
};

/**
 * Static props packed into one atlas. job: { ppu, outline, items: [{ id, url, scale, yaw, tint, emissive }] }
 * Each item gets a tight cell; its anchor is the model origin (the foot).
 */
window.bakeProps = async (job) => {
  const pad = 6;
  const shots = [];
  for (const it of job.items) {
    const g = await load(it.url);
    const root = g.scene.clone(true);
    tintModel(root, it.tint, it.emissive);
    root.scale.setScalar(it.scale ?? 1);
    root.rotation.y = it.yaw ?? 0;
    scene.add(root);
    root.updateMatrixWorld(true);
    // screen extent of the bounding box corners
    const b = new THREE.Box3().setFromObject(root);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    const camUp = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z);
      const sx = p.dot(camRight) * job.ppu, sy = -p.dot(camUp) * job.ppu;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    const half = Math.ceil(Math.max(-x0, x1)) + pad;
    const w = half * 2;
    const top = Math.ceil(-y0) + pad, bot = Math.ceil(Math.max(0, y1)) + pad;
    const h = top + bot;
    frame(w, h, top / h, job.ppu);
    renderer.render(scene, camera);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    blitOutlined(c.getContext('2d'), 0, 0, w, h, job.outline ?? 2, 'rgba(26,18,36,0.8)');
    shots.push({ id: it.id, c, w, h, ax: 0.5, ay: top / h });
    scene.remove(root);
  }
  // shelf packing, 2048 wide
  const W = 2048;
  let x = 0, y = 0, rowH = 0;
  const pos = [];
  for (const s of shots) {
    if (x + s.w > W) { x = 0; y += rowH; rowH = 0; }
    pos.push([x, y]);
    x += s.w; rowH = Math.max(rowH, s.h);
  }
  const atlas = document.createElement('canvas');
  atlas.width = W; atlas.height = y + rowH;
  const ctx = atlas.getContext('2d');
  const meta = {};
  shots.forEach((s, i) => {
    ctx.drawImage(s.c, pos[i][0], pos[i][1]);
    meta[s.id] = { x: pos[i][0], y: pos[i][1], w: s.w, h: s.h, ax: s.ax, ay: +s.ay.toFixed(4) };
  });
  return { png: atlas.toDataURL('image/webp', 0.9), meta };
};

window.ready = true;
