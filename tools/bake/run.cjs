// Bakes the 3D models in tools/bake/models into sprite sheets in public/baked.
// Usage: node tools/bake/run.cjs   (needs Playwright's Chromium)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const serve = require('./serve.cjs');

const OUT = path.resolve(__dirname, '../../public/baked');
const M = (p) => `/tools/bake/models/${p}.glb`;
/** render px per model unit; textures show at 1/2 in game */
const PPU = 140;

const HERO_ANIMS = {
  idle: { clip: 'idle', frames: 4, fps: 5 },
  walk: { clip: 'walk', frames: 8, fps: 13 },
  attack: { clip: 'attack-melee-right', frames: 6, fps: 16, loop: false },
};
const HUMAN_MOB = {
  walk: { clip: 'walk', frames: 6, fps: 11 },
  attack: { clip: 'attack-melee-right', frames: 4, fps: 12, loop: false },
};
const PET_MOB = {
  walk: { clip: 'walk', frames: 6, fps: 12 },
  attack: { clip: 'run', frames: 4, fps: 12 },
};

const CHARS = [
  // heroes
  { id: 'hero-warrior', url: M('mini-dungeon/character-human'), anims: HERO_ANIMS },
  { id: 'hero-magician', url: M('mini-characters/character-female-b'), anims: HERO_ANIMS },
  { id: 'hero-bowman', url: M('mini-characters/character-male-e'), anims: HERO_ANIMS },
  { id: 'hero-thief', url: M('mini-characters/character-male-d'), anims: HERO_ANIMS },
  { id: 'hero-pirate', url: M('mini-characters/character-female-e'), anims: HERO_ANIMS },
  // monsters (tinted per tier in game)
  { id: 'zombie', url: M('graveyard/character-zombie'), anims: HUMAN_MOB },
  { id: 'skeleton', url: M('graveyard/character-skeleton'), anims: HUMAN_MOB },
  { id: 'ghost', url: M('graveyard/character-ghost'), anims: HUMAN_MOB },
  { id: 'vampire', url: M('graveyard/character-vampire'), anims: HUMAN_MOB },
  { id: 'keeper', url: M('graveyard/character-keeper'), anims: HUMAN_MOB },
  { id: 'orc', url: M('mini-dungeon/character-orc'), anims: HUMAN_MOB },
  { id: 'bandit', url: M('mini-characters/character-male-c'), anims: HUMAN_MOB },
  { id: 'witch', url: M('mini-characters/character-female-c'), anims: HUMAN_MOB },
];

const P = (id, url, scale = 1, yaw = 0) => ({ id, url: M(url), scale, yaw });
const PROPS = [
  P('pine', 'graveyard/pine', 0.9), P('pine-b', 'graveyard/pine', 0.75, 1.2), P('pine-crooked', 'graveyard/pine-crooked', 0.85), P('pine-fall', 'graveyard/pine-fall', 0.8),
  P('grave-round', 'graveyard/gravestone-round', 1, 0.3), P('grave-cross', 'graveyard/gravestone-cross', 1, -0.4), P('grave-broken', 'graveyard/gravestone-broken', 1, 0.8),
  P('grave-deco', 'graveyard/gravestone-decorative', 1, -0.2), P('cross-wood', 'graveyard/cross-wood', 1, 0.5),
  P('pumpkin', 'graveyard/pumpkin', 1.1, 0.4), P('pumpkin-carved', 'graveyard/pumpkin-carved', 1.1, 0.7), P('pumpkin-tall', 'graveyard/pumpkin-tall-carved', 1.1, 0.6),
  P('lantern', 'graveyard/lantern-candle', 1), P('lightpost', 'graveyard/lightpost-single', 1, 0.6), P('candles', 'graveyard/candle-multiple', 1.3),
  P('fence', 'graveyard/fence-damaged', 1, 0.2), P('iron-fence', 'graveyard/iron-fence-damaged', 1, -0.3), P('crypt', 'graveyard/crypt-small', 1, 0.2),
  P('rocks', 'graveyard/rocks', 1, 0.3), P('rocks-tall', 'graveyard/rocks-tall', 1, 1.1), P('trunk', 'graveyard/trunk', 1, 0.5),
  P('fire-basket', 'graveyard/fire-basket', 1.1), P('urn', 'graveyard/urn-round', 1), P('debris', 'graveyard/debris', 1, 0.4),
  P('barrel', 'mini-dungeon/barrel', 1, 0.2), P('chest', 'mini-dungeon/chest', 1, 0.6),
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const s = await serve();
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  p.on('pageerror', (e) => console.error('page error', e.message));
  await p.goto(`http://localhost:${s.address().port}/tools/bake/bake.html`);
  await p.waitForFunction('window.ready');
  const index = { chars: {}, props: 'props' };
  const only = process.argv[2];
  for (const c of CHARS) {
    if (only && !c.id.includes(only)) continue;
    const hero = c.id.startsWith('hero-');
    const job = { ...c, ppu: PPU, dirs: 8, cell: hero ? [140, 150] : [132, 142], footY: 0.86, outline: 2 };
    const r = await p.evaluate((j) => window.bakeChar(j), job);
    fs.writeFileSync(path.join(OUT, c.id + '.webp'), Buffer.from(r.png.split(',')[1], 'base64'));
    index.chars[c.id] = r.meta;
    console.log('char', c.id);
  }
  if (!only) {
    const r = await p.evaluate((j) => window.bakeProps(j), { ppu: PPU, outline: 2, items: PROPS });
    fs.writeFileSync(path.join(OUT, 'props.webp'), Buffer.from(r.png.split(',')[1], 'base64'));
    index.propFrames = r.meta;
    fs.writeFileSync(path.join(OUT, 'baked.json'), JSON.stringify(index));
    console.log('props', Object.keys(r.meta).length);
  }
  await b.close();
  s.close();
})();
