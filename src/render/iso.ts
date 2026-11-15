// The ground, shadows and prop mix for the isometric (baked) look.
import { Texture } from 'pixi.js';
import { canvas } from './textures.ts';

/** a soft dark ellipse for under units (flattened to the isometric ground) */
export function shadowTexture(): Texture {
  const W = 128, H = 64;
  const [c, ctx] = canvas(W, H);
  ctx.translate(W / 2, H / 2);
  ctx.scale(1, 0.5);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, W / 2);
  g.addColorStop(0, 'rgba(6,4,14,0.55)');
  g.addColorStop(0.55, 'rgba(6,4,14,0.35)');
  g.addColorStop(1, 'rgba(6,4,14,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, W / 2, 0, Math.PI * 2);
  ctx.fill();
  return Texture.from(c);
}

/** seeded value noise that wraps every `period` cells, so the tile is seamless */
function noise(period: number, seed: number) {
  const v = new Float32Array(period * period);
  let s = seed;
  for (let i = 0; i < v.length; i++) { s = (Math.imul(s, 1664525) + 1013904223) | 0; v[i] = (s >>> 0) / 4294967296; }
  const at = (x: number, y: number) => v[((y % period) + period) % period * period + (((x % period) + period) % period)];
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

/**
 * The night meadow: mossy grass in soft blotches, worn earth patches and specks of flowers and pebbles.
 * Painted per pixel into a seamless 512 px tile (shown at half size, like the other textures).
 */
export function groundTexture(): Texture {
  const S = 512;
  const [c, ctx] = canvas(S, S);
  const img = ctx.createImageData(S, S);
  const n1 = noise(4, 7), n2 = noise(8, 21), n3 = noise(16, 99), n4 = noise(32, 5), dirtN = noise(6, 333);
  const grassA = [46, 74, 52], grassB = [64, 98, 60], moss = [38, 62, 58], dirt = [92, 74, 58];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S;
      const big = n1(u * 4, v * 4) * 0.55 + n2(u * 8, v * 8) * 0.3 + n3(u * 16, v * 16) * 0.15;
      const fine = n4(u * 32, v * 32);
      const d = dirtN(u * 6, v * 6) * 0.75 + n3(u * 16 + 3, v * 16 + 9) * 0.25;
      let r = grassA[0] + (grassB[0] - grassA[0]) * big, g = grassA[1] + (grassB[1] - grassA[1]) * big, b = grassA[2] + (grassB[2] - grassA[2]) * big;
      // cool moss in the low spots
      const m = Math.max(0, 0.45 - big) * 1.6;
      r += (moss[0] - r) * m; g += (moss[1] - g) * m; b += (moss[2] - b) * m;
      // worn earth patches with a soft edge
      const de = Math.min(1, Math.max(0, (d - 0.66) * 7));
      r += (dirt[0] - r) * de; g += (dirt[1] - g) * de; b += (dirt[2] - b) * de;
      // a little grain
      const k = 0.9 + fine * 0.2;
      const i = (y * S + x) * 4;
      img.data[i] = r * k; img.data[i + 1] = g * k; img.data[i + 2] = b * k; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // blades of grass: short strokes, lit on top (wrapped at the edges)
  let s = 12345;
  const rnd = () => { s = (Math.imul(s, 1103515245) + 12345) | 0; return ((s >>> 0) % 100000) / 100000; };
  const wrap = (fn: (ox: number, oy: number) => void) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) fn(ox, oy); };
  for (let i = 0; i < 1100; i++) {
    const x = rnd() * S, y = rnd() * S, h = 5 + rnd() * 7, lean = (rnd() - 0.5) * 6;
    const light = rnd() < 0.5;
    ctx.strokeStyle = light ? 'rgba(120,160,96,0.55)' : 'rgba(22,40,30,0.55)';
    ctx.lineWidth = 2;
    wrap((ox, oy) => { ctx.beginPath(); ctx.moveTo(x + ox, y + oy); ctx.lineTo(x + ox + lean, y + oy - h); ctx.stroke(); });
  }
  const specks: [string, number, number][] = [['rgba(214,200,255,0.8)', 40, 2.2], ['rgba(255,214,120,0.8)', 30, 2], ['rgba(150,140,130,0.7)', 60, 2.6]];
  for (const [col, count, r] of specks) {
    ctx.fillStyle = col;
    for (let i = 0; i < count; i++) {
      const x = rnd() * S, y = rnd() * S;
      wrap((ox, oy) => { ctx.beginPath(); ctx.ellipse(x + ox, y + oy, r, r * 0.7, 0, 0, Math.PI * 2); ctx.fill(); });
    }
  }
  return Texture.from(c);
}

/** big props by group: [weight, ids] */
const GROUPS: [number, string[]][] = [
  [34, ['pine', 'pine', 'pine-crooked', 'tree-pine-round', 'tree-pine-tall', 'tree-oak', 'tree-default', 'tree-fat', 'tree-detailed', 'pine-fall']],
  [16, ['grave-round', 'grave-cross', 'grave-broken', 'grave-deco', 'cross-wood', 'grave-round']],
  [14, ['bush', 'bush-large', 'bush', 'mushrooms-red', 'mushrooms-tan']],
  [12, ['rocks', 'rocks-tall', 'rock-large', 'trunk', 'stump', 'log', 'debris']],
  [8, ['pumpkin', 'pumpkin-carved', 'pumpkin-tall', 'urn']],
  [8, ['lantern', 'lightpost', 'candles', 'fire-basket', 'campfire']],
  [5, ['fence', 'iron-fence', 'crypt', 'barrel']],
];
const TOTAL = GROUPS.reduce((a, g) => a + g[0], 0);

/** a big prop from two hashes in 0..1 */
export function pickProp(h1: number, h2: number): string {
  let w = h1 * TOTAL;
  for (const [gw, ids] of GROUPS) {
    if (w < gw) return ids[Math.floor(h2 * ids.length) % ids.length];
    w -= gw;
  }
  return 'pine';
}

const TUFTS = ['flower-purple', 'flower-red', 'mushroom', 'rock-small', 'flower-purple'];
export function pickTuft(h: number): string {
  return TUFTS[Math.floor(h * TUFTS.length) % TUFTS.length];
}

/** props that give light: [tint, height of the flame above the foot in px, glow scale] */
export const BAKED_LIGHTS: Record<string, [number, number, number]> = {
  lantern: [0xffb050, 14, 1.6],
  lightpost: [0xffc070, 58, 2.2],
  candles: [0xffa040, 8, 1.3],
  'fire-basket': [0xff8a30, 10, 2.4],
  campfire: [0xff8030, 6, 2.6],
  'pumpkin-carved': [0xff9a30, 8, 1.2],
  'pumpkin-tall': [0xff9a30, 9, 1.2],
};
