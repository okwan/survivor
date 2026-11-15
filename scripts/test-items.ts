// Run: node --experimental-strip-types scripts/test-items.ts
// Items: scrolls (rates, upgrade slots, damage), the pet, and the Monster Book (bonus cap, save round trip).
import assert from 'node:assert/strict';
import { botInput } from '../src/game/bot.ts';
import { BOOK_BONUS_CAP, BOOK_MOBS, bookBonus, bookCounts, cardTier, mergeBook, sanitizeBook } from '../src/game/book.ts';
import { GearPool } from '../src/game/gear.ts';
import { PET_LEASH } from '../src/game/pet.ts';
import { ScrollPool, scrollGain, slotsLeft } from '../src/game/scrolls.ts';
import type { ScrollDef } from '../src/game/scrolls.ts';
import { Sim } from '../src/game/sim.ts';
import { MESO, SCROLL } from '../src/game/types.ts';

let checks = 0;
const ok = (c: unknown, m: string) => { checks++; assert.ok(c, m); };
const eq = (a: unknown, b: unknown, m: string) => { checks++; assert.deepEqual(a, b, m); };

const mk = (pct: number): ScrollDef => ({ id: 't', name: `Scroll for One-Handed Sword for ATT ${pct}%`, slot: 'weapon', wclass: 'warrior', stat: 'pad', pct, gain: scrollGain('pad', pct) });

// ---- scroll rates ----
{
  const pool = GearPool.placeholder();
  for (const pct of [100, 60, 10]) {
    let wins = 0;
    const N = 3000;
    const s = new Sim(7, 'warrior');
    for (let i = 0; i < N; i++) {
      s.equip(pool.get('phweapon1t2')!);
      if (s.useScroll(mk(pct)) === 'success') wins++;
    }
    const rate = wins / N;
    const [lo, hi] = pct === 100 ? [1, 1] : pct === 60 ? [0.55, 0.65] : [0.07, 0.13];
    ok(rate >= lo && rate <= hi, `${pct}% scroll succeeded ${(rate * 100).toFixed(1)}% of ${N}`);
  }
}
// ---- slots stop at 0, failure uses a slot without gain ----
{
  const pool = GearPool.fromManifest({ iconAtlas: '', items: { '01302100': { slot: 'weapon', name: 'Test Sword', level: 0, job: 1, tuc: 3, stats: { pad: 20 } } } });
  const s = new Sim(3, 'warrior', { pool });
  s.giveGear('01302100');
  eq(slotsLeft(s.equipped.weapon!), 3, 'tuc from the manifest');
  const base = s.might;
  eq(s.useScroll(mk(100)), 'success', 'first scroll works');
  ok(s.might > base, 'a weapon ATT scroll raises damage');
  eq(s.equipped.weapon!.up!.plus, 1, '+1');
  eq(s.useScroll(mk(100)), 'success', 'second');
  eq(s.useScroll(mk(100)), 'success', 'third');
  const m3 = s.might;
  eq(slotsLeft(s.equipped.weapon!), 0, 'no slots left');
  eq(s.useScroll(mk(100)), 'noslots', 'a fourth scroll is refused');
  eq([s.equipped.weapon!.up!.plus, s.might], [3, m3], 'tuc stops at 0: nothing changed');
  eq(pool.get('01302100')!.up, undefined, 'the pool item is not changed');
  ok(s.notes.some((n) => n.text.includes('+3')), 'toast "<item> +n"');
  // a failure uses a slot and gains nothing
  const s2 = new Sim(4, 'warrior', { pool });
  s2.giveGear('01302100');
  let r = '';
  for (let i = 0; i < 200 && r !== 'failed'; i++) { s2.equip(pool.get('01302100')!); r = s2.useScroll(mk(10)); }
  eq(r, 'failed', 'a 10% scroll fails eventually');
  eq([s2.equipped.weapon!.up!.plus, slotsLeft(s2.equipped.weapon!)], [0, 2], 'failure: slot used, no gain');
  ok(s2.notes.some((n) => n.text === 'The scroll failed.'), 'failure toast');
  eq(new Sim(1, 'warrior').useScroll(mk(100)), 'noitem', 'nothing worn: refused');
}
// ---- scroll drops and pickup ----
{
  const s = new Sim(5, 'warrior');
  s.giveGear('phweapon1t1');
  const d = s.scrollPool.roll((s as any).itemRng, s.equipped, 'warrior')!;
  eq(d.slot, 'weapon', 'rolls for a slot of the worn gear');
  const boss = { x: 3, y: 0, hp: 5, maxHp: 5, speed: 0, dmg: 0, r: 1, xp: 1, tier: 29, boss: 0, big: true, add: false, alive: true, hitCd: 9, slowT: 0, stunT: 0, rootT: 0, weakT: 0, flash: 0, facing: 1, phase: 0, moving: false, berserk: false, age: 0, novaT: 0, castT: 0, summonT: 0, idx: -1 };
  s.enemies.push(boss);
  s.crit = 0;
  s.hit(boss, 1e6);
  ok(s.pickups.filter((p) => p.kind === SCROLL).length === 1, 'a boss drops one scroll');
  for (let i = 0; i < 240; i++) s.tick();
  ok(s.notes.some((n) => /\+1|failed/.test(n.text)) || s.upgradeVersion > 0, 'the scroll was applied on pickup');
  // normal rate ~0.3%
  let scrolls = 0, kills = 0;
  for (const seed of [31, 32]) {
    const t = new Sim(seed, 'warrior');
    t.god = true;
    for (let i = 0; i < 480 * 60 && !t.over; i++) {
      if (t.offer) { t.pick(0); continue; }
      const inp = botInput(t, 1);
      t.setInput(inp.x, inp.y);
      t.tick();
    }
    scrolls += t.scrollDrops - t.bossKills; kills += t.kills - t.bossKills;
  }
  ok(kills > 500 && scrolls / kills < 0.02, `scroll rate ${scrolls}/${kills}`);
  eq(ScrollPool.placeholder().real, false, 'placeholder scrolls without a manifest');
  eq(ScrollPool.fromManifest({ '2040000': { name: 'Scroll for Helmet for DEF 60%', slot: 'cap', stat: 'pdd', pct: 60 } }).real, true, 'manifest scrolls');
}
// ---- pet ----
{
  const s = new Sim(8, 'warrior', { pet: true });
  s.god = true;
  ok(!!s.pet, 'the pet exists when asked for');
  (s as any).dropPickup(MESO, 5, 0, 3);
  (s as any).dropPickup(MESO, -4, 3, 2);
  let maxD = 0;
  for (let i = 0; i < 600; i++) {
    s.tick();
    maxD = Math.max(maxD, Math.hypot(s.pet!.x - s.px, s.pet!.y - s.py));
  }
  ok(s.pet!.collected >= 2, 'the pet collected both mesos');
  ok(s.mesos >= 5 && !(s.pickups.some((p) => p.kind === MESO && p.x === 5 && p.y === 0)), 'and the sim paid them');
  ok(maxD <= PET_LEASH, `pet stayed within ${maxD.toFixed(2)} tiles`);
  // follows a moving hero, faces its travel direction, never strays
  const t = new Sim(9, 'thief', { pet: true });
  t.god = true;
  maxD = 0;
  let faced = 0;
  for (let i = 0; i < 60 * 120; i++) {
    if (t.offer) { t.pick(0); continue; }
    const a = i / 90;
    t.setInput(Math.cos(a) * 1.0 + 0.5, Math.sin(a) * 0.3);
    t.tick();
    maxD = Math.max(maxD, Math.hypot(t.pet!.x - t.px, t.pet!.y - t.py));
    if (t.pet!.moving && t.pet!.facing === (t.px > t.pet!.x ? 1 : -1)) faced++;
  }
  ok(maxD < 10, `pet never leaves 10 tiles (max ${maxD.toFixed(2)})`);
  ok(faced > 100, 'the pet faces the way it travels');
  eq(new Sim(1, 'warrior').pet, null, 'no pet by default');
}
// ---- Monster Book ----
{
  eq([cardTier(0), cardTier(1), cardTier(4), cardTier(5)], ['none', 'grey', 'grey', 'gold'], 'card tiers');
  const book: Record<string, number> = {};
  BOOK_MOBS.forEach((m, i) => { book[String(m.id)] = i < 10 ? 5 : 2; });
  eq(bookCounts(book), { collected: BOOK_MOBS.length, complete: 10 }, 'counts');
  ok(Math.abs(bookBonus(book) - 0.1) < 1e-9, '10 complete cards: +10%');
  const all: Record<string, number> = Object.fromEntries(BOOK_MOBS.map((m) => [String(m.id), 9]));
  eq(bookBonus(all), BOOK_BONUS_CAP, 'capped at +25%');
  const a = new Sim(2, 'warrior');
  const b = new Sim(2, 'warrior', { book: all });
  const c = new Sim(2, 'warrior', { bookBonus: 5 });
  ok(Math.abs(b.might - a.might - 0.25) < 1e-9 && Math.abs(c.might - b.might) < 1e-9, 'the sim takes the bonus, capped');
  // a first kill makes a card
  const s = new Sim(2, 'warrior');
  const e = { x: 1, y: 0, hp: 1, maxHp: 1, speed: 0, dmg: 0, r: 0.6, xp: 1, tier: 0, boss: -1, big: false, add: false, alive: true, hitCd: 9, slowT: 0, stunT: 0, rootT: 0, weakT: 0, flash: 0, facing: 1, phase: 0, moving: false, berserk: false, age: 0, novaT: 0, castT: 0, summonT: 0, idx: -1 };
  s.enemies.push(e);
  s.hit(e, 1e6);
  eq(s.book['100100'], 1, 'a kill is counted by mob id');
  ok(s.notes.some((n) => n.text === 'New card: Cellar Rat'), 'new card toast');
  eq(mergeBook({ '1': 3, '2': 1 }, { '1': 2, '3': 4 }), { '1': 3, '2': 1, '3': 4 }, 'merge keeps the larger count');
  eq(sanitizeBook({ '100100': 7.9, x: 3, '5': -1, '6': 'a' }), { '100100': 7 }, 'junk entries are dropped');
  // save round trip (a fake localStorage)
  const store = new Map<string, string>();
  (globalThis as any).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
  const { loadSave, writeSave } = await import('../src/ui/save.ts');
  const sv = loadSave();
  eq([sv.settings.pet, sv.book], [true, {}], 'a fresh save has the pet on and an empty book');
  sv.book = book;
  sv.settings.pet = false;
  writeSave(sv);
  const back = loadSave();
  eq(back.book, book, 'the book survives a save round trip');
  eq(back.settings.pet, false, 'the pet setting too');
  ok(Math.abs(bookBonus(back.book) - 0.1) < 1e-9, 'and its bonus');
  store.set('survivor-save-v1', JSON.stringify({ mesos: 3 }));
  eq(loadSave().book, {}, 'an old save without a book loads');
}

console.log(`test-items: ok (${checks} checks)`);
