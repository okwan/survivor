/**
 * Item art: potion / currency pickup art, scroll icons, the pet's animations and the enchant effect. Everything is optional; an empty
 * ItemArt answers null for every lookup and the renderer keeps its placeholder pickups. Placeholder textures for scrolls and the pet
 * are drawn here so that those still show without art.
 */
import { ImageSource, Texture } from 'pixi.js';
import type { ScrollDef } from '../game/scrolls.ts';
import type { Anim } from './art.ts';

export interface PetArt {
  name: string;
  stand: Anim | null;
  move: Anim | null;
  jump: Anim | null;
}

const SCROLL_SIZE = 40;
const FIELD_ROLES = ['fieldApple', 'fieldCoupon', 'fieldElixir', 'fieldClock', 'fieldKeg'] as const;

export class ItemArt {
  /** icon keys that loaded, for the bot hook: 'potion.red', 'meso.bronze', 'scroll.2040000', 'pet.move', 'enchant.success' ... */
  keys: string[] = [];
  private icons = new Map<string, Anim>();
  private scrollIcons = new Map<string, Anim>();
  private roles: ItemIconKeys = {};
  pet: PetArt | null = null;
  enchantSuccess: Anim | null = null;
  enchantFailure: Anim | null = null;
  private scrollTexs = new Map<string, Texture>();
  private fallbackScroll: Texture | null = null;
  private fallbackPet: Texture | null = null;

  /** @internal filled by buildItemArt */
  setIcons(roles: ItemIconKeys, icons: Map<string, Anim>, scrollIcons: Map<string, Anim>) {
    this.roles = roles;
    this.icons = icons;
    this.scrollIcons = scrollIcons;
  }

  private role(k: keyof ItemIconKeys): Anim | null {
    const id = this.roles[k];
    return (id && this.icons.get(id)) || null;
  }

  /** Red Potion, or White Potion for a bigger heal */
  potion(value: number): Texture | null {
    const a = (value >= 0.5 ? this.role('potionWhite') : null) ?? this.role('potionRed') ?? this.role('potionOrange');
    return a?.tex[0] ?? null;
  }
  /** Power Elixir (the Elixir when that is all there is) */
  elixir(): Texture | null {
    return (this.role('elixirPower') ?? this.role('elixir'))?.tex[0] ?? null;
  }
  /** meso coin by value (bronze for small piles, gold from 4 up); animated */
  meso(value: number): Anim | null {
    return (value >= 4 ? this.role('mesoGold') ?? this.role('mesoBronze') : this.role('mesoBronze') ?? this.role('mesoGold')) ?? null;
  }
  bag(): Anim | null {
    return this.role('mesoBag') ?? this.role('mesoBundle');
  }
  /** Gachapon Ticket icon for the boss capsule (null: the renderer draws a two-colour ball) */
  gacha(): Texture | null {
    return this.role('gacha')?.tex[0] ?? null;
  }
  /** Icon of field item n (Apple, Coupon, Elixir, Clock, Keg), null when it was not extracted (the renderer draws a placeholder) */
  field(n: number): Texture | null {
    return this.role(FIELD_ROLES[n])?.tex[0] ?? null;
  }
  /** The field item icon as a data URL for the HUD buff chips (null without the art) */
  fieldUrl(n: number): string | null {
    return this.urlOf(this.field(n));
  }
  /** Safety Charm icon as a data URL for the camp shop (null without the art: the shop draws a placeholder tile) */
  reviveUrl(): string | null {
    return this.urlOf(this.role('metaRevive')?.tex[0] ?? null);
  }
  /** The same icon as a data URL for the DOM reveal panel (null without the art) */
  gachaUrl(): string | null {
    return this.urlOf(this.gacha());
  }
  private urlOf(t: Texture | null): string | null {
    const src = t?.source.resource as CanvasImageSource | undefined;
    if (!t || !src) return null;
    try {
      const f = t.frame;
      const c = document.createElement('canvas');
      c.width = f.width; c.height = f.height;
      c.getContext('2d')!.drawImage(src, f.x, f.y, f.width, f.height, 0, 0, f.width, f.height);
      return c.toDataURL();
    } catch {
      return null;
    }
  }

  /** Glowing texture for a scroll lying on the ground (cached); its own icon when extracted, else a drawn scroll. */
  scrollTexture(d: ScrollDef): Texture {
    let t = this.scrollTexs.get(d.id);
    if (!t) {
      const icon = this.scrollIcons.get(d.id);
      t = new Texture({ source: new ImageSource({ resource: drawScroll(icon ? icon.tex[0] : null), scaleMode: 'nearest' }) });
      this.scrollTexs.set(d.id, t);
    }
    return t;
  }

  /** The drawn scroll, for the pickup of a scroll without an icon of its own. */
  placeholderScroll(): Texture {
    return (this.fallbackScroll ??= new Texture({ source: new ImageSource({ resource: drawScroll(null), scaleMode: 'nearest' }) }));
  }

  /** A small orange cat (faces left like the extracted sprites) for play without the pet's art. */
  placeholderPet(): Texture {
    if (!this.fallbackPet) {
      const c = document.createElement('canvas');
      c.width = 40; c.height = 34;
      const g = c.getContext('2d')!;
      g.fillStyle = '#e8923c';
      g.strokeStyle = '#7a4010';
      g.lineWidth = 2;
      g.beginPath(); g.ellipse(20, 22, 13, 9, 0, 0, 7); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(11, 14, 8, 7, 0, 0, 7); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(5, 9); g.lineTo(6, 2); g.lineTo(11, 8); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(12, 8); g.lineTo(17, 2); g.lineTo(17, 10); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#222';
      g.fillRect(7, 13, 2, 3); g.fillRect(13, 13, 2, 3);
      g.strokeStyle = '#e8923c'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(32, 20); g.quadraticCurveTo(40, 14, 36, 8); g.stroke();
      this.fallbackPet = new Texture({ source: new ImageSource({ resource: c, scaleMode: 'nearest' }) });
    }
    return this.fallbackPet;
  }
}

/** A scroll icon (or a drawn parchment roll) centred on a canvas with a soft glow, like the gear drops. */
function drawScroll(icon: Texture | null): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = SCROLL_SIZE;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  const mid = SCROLL_SIZE / 2;
  const grad = g.createRadialGradient(mid, mid, 2, mid, mid, mid);
  grad.addColorStop(0, 'rgba(160,230,255,0.8)');
  grad.addColorStop(1, 'rgba(160,230,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, SCROLL_SIZE, SCROLL_SIZE);
  const src = icon?.source.resource as CanvasImageSource | undefined;
  if (icon && src) {
    const f = icon.frame;
    const k = Math.min(1, (SCROLL_SIZE - 6) / Math.max(f.width, f.height));
    const w = Math.round(f.width * k), h = Math.round(f.height * k);
    g.drawImage(src, f.x, f.y, f.width, f.height, Math.round(mid - w / 2), Math.round(mid - h / 2), w, h);
  } else {
    g.fillStyle = '#f3e3b0';
    g.strokeStyle = '#8a6a30';
    g.lineWidth = 2;
    g.beginPath(); g.roundRect(mid - 9, mid - 12, 18, 24, 3); g.fill(); g.stroke();
    g.fillStyle = '#b84a3a';
    g.fillRect(mid - 11, mid - 4, 22, 5);
    g.strokeStyle = '#8a6a30'; g.lineWidth = 1;
    for (const y of [-8, 8]) { g.beginPath(); g.moveTo(mid - 5, mid + y); g.lineTo(mid + 5, mid + y); g.stroke(); }
  }
  return c;
}


/** Item icon ids by role, filled by an art pack. */
export interface ItemIconKeys {
  /** Red / Orange / White Potion (2000000..2000002) and Elixir / Power Elixir (2000004, 2000005); each a single frame */
  potionRed?: string;
  potionOrange?: string;
  potionWhite?: string;
  elixir?: string;
  elixirPower?: string;
  /** Meso bronze / gold / bundle / bag (09000000..09000003): animated, frames 0..n of the action */
  mesoBronze?: string;
  mesoGold?: string;
  mesoBundle?: string;
  mesoBag?: string;
  /** Gachapon Ticket (Cash/0522.img/05220000): the boss capsule, a single frame */
  gacha?: string;
  /** Field items: Apple (Consume 2010000), 2x EXP Coupon, Warrior Elixir, Ludibrium Clock, Powder Keg; a single frame each */
  fieldApple?: string;
  fieldCoupon?: string;
  fieldElixir?: string;
  fieldClock?: string;
  fieldKeg?: string;
  /** Safety Charm (Cash 5130000), the camp shop's revive; a single frame */
  metaRevive?: string;
}
