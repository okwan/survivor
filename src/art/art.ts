/**
 * Art types shared by the renderer and UI. Every piece is optional: whatever is absent keeps its placeholder.
 * No art pack is loaded yet; GameArt is the shape our own art will fill.
 */
import { ImageSource, Rectangle, Texture } from 'pixi.js';
import type { ItemArt } from './item-art.ts';
import type { RegionArt } from './region-art.ts';

/** One frame of an atlas: rectangle, origin and delay (ms). */
export interface FrameRec {
  action: string;
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
  ox: number;
  oy: number;
  delay: number;
}

/** An atlas image (relative to the art base URL) and its frames. */
export interface AtlasRef {
  atlas: string;
  frames: FrameRec[];
}

/** A shopkeeper or other character portrait. */
export interface NpcRef extends AtlasRef {
  id: string;
  name: string;
}

export interface UiPiece {
  src: string;
  w: number;
  h: number;
  ox: number;
  oy: number;
  meta?: Record<string, number>;
  rects?: { x: number; y: number; w: number; h: number }[];
}

/** A frame sequence. cum[i] is the time (s) at which frame i ends; origin anchors are per frame (ratios of the frame size). */
export interface Anim {
  tex: Texture[];
  ax: number[];
  ay: number[];
  cum: number[];
  total: number;
}

export interface MobArt {
  stand: Anim | null;
  move: Anim | null;
  hit: Anim | null;
  die: Anim | null;
  attack: Anim | null;
  /** the ball a ranged mob shoots when the art has one */
  ball: Anim | null;
}

export interface SkillArt {
  ball: Anim | null;
  hit: Anim | null;
  effect: Anim | null;
}

/** Index of the frame showing at time t (seconds); loops, or holds the last frame when `loop` is false. */
export function frameAt(a: Anim, t: number, loop = true): number {
  const n = a.tex.length;
  if (n === 1) return 0;
  if (loop) t %= a.total;
  else if (t >= a.total) return n - 1;
  for (let i = 0; i < n; i++) if (t < a.cum[i]) return i;
  return n - 1;
}

/** Damage digits of one colour: digits[i] for 0-9 of the large first-digit set (`first`) and the smaller rest set (`rest`). */
export interface DigitSet {
  first: Texture[];
  rest: Texture[];
  /** crit spark, when the set has one */
  effect: Texture | null;
}

/** Damage number sets by colour name: red (hits on enemies), cri (crits), violet (damage to the player), blue. */
export type DamageArt = Record<'red' | 'cri' | 'violet' | 'blue', DigitSet | null>;

export interface MapObjArt {
  anim: Anim;
  weight: number;
  w: number;
  h: number;
}

export interface MapArt {
  /** seamless ground tile, or null when the tile set could not be extracted */
  ground: Texture | null;
  /** average ground colour as 0xRRGGBB (renderer background) */
  groundColor: number;
  objects: MapObjArt[];
  /** largest decoration frame, used to widen the culling margin */
  maxW: number;
  maxH: number;
}

export interface UiArt {
  /** URL prefix of the piece PNGs */
  base: string;
  /** only pieces whose PNG loaded */
  pieces: Record<string, UiPiece>;
}

export class GameArt {
  /** by ladder tier index, null where the mob has no extracted art */
  tiers: (MobArt | null)[] = [];
  /** by boss index */
  bosses: (MobArt | null)[] = [];
  /** attack skills by key */
  skills = new Map<string, SkillArt>();
  /** body actions per attack skill key (from the art pack); absent: the weapon's normal attack */
  skillActions = new Map<string, string[]>();
  /** icon URLs by skill/passive key */
  icons: Record<string, string> = {};
  bgm: { run: string | null; title: string | null } = { run: null, title: null };
  counts = { mobs: 0, skills: 0, icons: 0, objects: 0, digitSets: 0, uiPieces: 0 };
  map: MapArt | null = null;
  damage: DamageArt | null = null;
  /** LevelUp effect animation (origin at the player's feet) */
  levelUp: Anim | null = null;
  ui: UiArt | null = null;
  /** the seven run regions (ground, decor, banner names, music); empty when the manifest has none */
  regions: RegionArt[] = [];
  /** region tracks by region index (null: use the run track) */
  bgmRegions: (string | null)[] = [];
  /** sound effect URLs by key */
  sfx: Record<string, string> = {};
  /** potion / meso / scroll art, the pet and the enchant effect (null when the manifest has none) */
  items: ItemArt | null = null;
}

export function makeAnim(source: ImageSource, frames: FrameRec[], action: string): Anim | null {
  const list = frames.filter((f) => f.action === action).sort((a, b) => a.index - b.index);
  if (!list.length) return null;
  const a: Anim = { tex: [], ax: [], ay: [], cum: [], total: 0 };
  for (const f of list) {
    a.tex.push(new Texture({ source, frame: new Rectangle(f.x, f.y, f.w, f.h) }));
    a.ax.push(f.ox / f.w);
    a.ay.push(f.oy / f.h);
    a.total += Math.max(30, f.delay) / 1000;
    a.cum.push(a.total);
  }
  return a;
}

