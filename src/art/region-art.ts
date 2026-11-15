/**
 * Per-region art types: ground texture, decor animations grouped by size class, music and banner names.
 */
import type { Texture } from 'pixi.js';
import type { Anim } from './art.ts';
import type { Have } from '../render/cluster.ts';

export interface DecorObj {
  anim: Anim;
  w: number;
  h: number;
}

export interface RegionArt {
  index: number;
  /** banner lines (street name over map name) */
  street: string;
  name: string;
  /** null: the renderer's default ground */
  ground: Texture | null;
  groundColor: number;
  /** decor by size class: [big, medium, small] */
  bySize: [DecorObj[], DecorObj[], DecorObj[]];
  have: Have;
  /** largest decor frame, for culling margins */
  maxW: number;
  maxH: number;
  /** track URL, or null for the run track */
  bgm: string | null;
}

