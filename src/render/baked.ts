// Pre-rendered isometric art: sprite sheets baked from CC0 Kenney 3D models by tools/bake/run.cjs.
import { Rectangle, Texture } from 'pixi.js';

export interface BakedAnim {
  /** frames[dir][frame]; dir 0 faces screen right, then clockwise in 45 degree steps */
  frames: Texture[][];
  fps: number;
  loop: boolean;
}
export interface BakedChar {
  anims: Record<string, BakedAnim>;
  /** anchor at the feet */
  ax: number;
  ay: number;
  dirs: number;
}
export interface BakedProp { tex: Texture; ax: number; ay: number }
export interface Baked {
  chars: Record<string, BakedChar>;
  props: Record<string, BakedProp>;
}

interface CharMeta { cell: [number, number]; anchor: [number, number]; dirs: number; cols: number; anims: Record<string, { row: number; frames: number; fps: number; loop: boolean }> }
interface Index { chars: Record<string, CharMeta>; propFrames: Record<string, { x: number; y: number; w: number; h: number; ax: number; ay: number }> }

function image(url: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = url;
  });
}

/** Loads baked.json and its sheets; null when the bake is missing (the game then draws its flat sprites). */
export async function loadBaked(base = 'baked/', onProgress?: (k: number) => void): Promise<Baked | null> {
  let idx: Index;
  try {
    const r = await fetch(base + 'baked.json');
    if (!r.ok) return null;
    idx = await r.json();
  } catch {
    return null;
  }
  const out: Baked = { chars: {}, props: {} };
  const ids = Object.keys(idx.chars);
  let done = 0;
  const total = ids.length + 1;
  const tick = () => onProgress?.(++done / total);
  await Promise.all([
    ...ids.map(async (id) => {
      const im = await image(`${base}${id}.webp`);
      tick();
      if (!im) return;
      const m = idx.chars[id];
      const src = Texture.from(im).source;
      src.scaleMode = 'linear';
      const [w, h] = m.cell;
      const anims: Record<string, BakedAnim> = {};
      for (const [name, a] of Object.entries(m.anims)) {
        const frames: Texture[][] = [];
        for (let d = 0; d < m.dirs; d++) {
          const row: Texture[] = [];
          for (let f = 0; f < a.frames; f++) row.push(new Texture({ source: src, frame: new Rectangle(f * w, (a.row + d) * h, w, h) }));
          frames.push(row);
        }
        anims[name] = { frames, fps: a.fps, loop: a.loop };
      }
      out.chars[id] = { anims, ax: m.anchor[0], ay: m.anchor[1], dirs: m.dirs };
    }),
    (async () => {
      const im = await image(`${base}props.webp`);
      tick();
      if (!im) return;
      const src = Texture.from(im).source;
      for (const [id, f] of Object.entries(idx.propFrames)) {
        out.props[id] = { tex: new Texture({ source: src, frame: new Rectangle(f.x, f.y, f.w, f.h) }), ax: f.ax, ay: f.ay };
      }
    })(),
  ]);
  return out;
}

/** 8-way direction index of a screen vector (0 = right, 2 = down, 4 = left, 6 = up) */
export function dirOf(dx: number, dy: number, dirs = 8): number {
  const a = Math.atan2(dy, dx);
  return ((Math.round((a / (Math.PI * 2)) * dirs) % dirs) + dirs) % dirs;
}

/** the frame of `a` facing `dir` at time t (looping or held on the last frame) */
export function bakedFrame(a: BakedAnim, dir: number, t: number): Texture {
  const row = a.frames[dir] ?? a.frames[0];
  const n = row.length;
  let i = Math.floor(t * a.fps);
  i = a.loop ? i % n : Math.min(n - 1, i);
  return row[i];
}

/** Which baked model each monster tier and boss uses, with a tint and a size (1 = the model's baked size). */
export interface MobLook { model: string; tint: number; size: number; glow?: number }
const ML = (model: string, tint: number, size = 1, glow?: number): MobLook => ({ model, tint, size, glow });
export const MOB_MODELS: MobLook[] = [
  ML('zombie', 0xa8a8c0, 0.8),        // Crawler
  ML('skeleton', 0xc8b8b0, 0.75),     // Ash Imp
  ML('zombie', 0xffffff, 0.9),        // Shambler
  ML('skeleton', 0xc09870, 0.8),      // Mud Imp
  ML('skeleton', 0xffffff, 0.95),     // Bone Rattler
  ML('zombie', 0x9ad890, 0.95),       // Moss Shambler
  ML('orc', 0xffffff, 1),             // Brute
  ML('zombie', 0xffa080, 1),          // Ember Shambler
  ML('orc', 0xffd870, 1),             // Gilded Brute
  ML('zombie', 0xd0a0ff, 1),          // Venom Shambler
  ML('keeper', 0xffffff, 1),          // Grave Keeper
  ML('vampire', 0xa0c890, 1),         // Bramble Ghoul
  ML('bandit', 0xa098a8, 1),          // Bandit
  ML('skeleton', 0xa8d0ff, 1),        // Frost Bones
  ML('ghost', 0xb8a0ff, 0.95, 0x9070ff), // Dusk Wisp
  ML('orc', 0xd8d0c0, 1.05),          // Raider
  ML('orc', 0xff8070, 1.1),           // Berserker
  ML('vampire', 0xc8a8f0, 1.05),      // Cultist
  ML('orc', 0x8a88a8, 1.35),          // Gloom Ogre
  ML('zombie', 0x80b080, 1.35),       // Marsh Ghoul
  ML('ghost', 0xff9090, 1, 0xff4040), // Blood Wisp
  ML('orc', 0xff9060, 1.4),           // Ember Ogre
  ML('ghost', 0xa8e0ff, 1, 0x60c0ff), // Wisp
  ML('vampire', 0x8888a8, 1.35),      // Night Stalker
  ML('witch', 0xd0b0ff, 1.05, 0xb070ff), // Hex Witch
  ML('ghost', 0x9878c8, 1.1, 0x8040ff), // Wraith
  ML('orc', 0xb0b0b8, 1.45),          // Stone Ogre
  ML('skeleton', 0xe8e0d0, 1.5),      // Bone Colossus
  ML('orc', 0x90a0c0, 1.5),           // Iron Ogre
  ML('keeper', 0x7070c0, 1.5, 0x4060ff), // Abyss Knight
];
export const BOSS_MODELS: MobLook[] = [
  ML('keeper', 0xe0d0b0, 1.9),             // The Gravedigger
  ML('zombie', 0xc0e0a0, 2.0, 0x80ff60),   // The Rotting King
  ML('skeleton', 0xf0e8d0, 2.1),           // Old Bonejaw
  ML('vampire', 0xffffff, 2.1, 0xff3030),  // The Count
  ML('witch', 0xc090ff, 2.1, 0xff9a40),    // The Lantern Witch
  ML('ghost', 0x7060b0, 2.3, 0x7040ff),    // The Gloam
];
export const HERO_MODELS: Record<string, string> = {
  warrior: 'hero-warrior', magician: 'hero-magician', bowman: 'hero-bowman', thief: 'hero-thief', pirate: 'hero-pirate',
};
