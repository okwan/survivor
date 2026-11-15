// Bakes the 3D models in tools/bake/models into sprite sheets in public/baked.
// Usage: node tools/bake/run.cjs   (needs Playwright's Chromium)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const serve = require('./serve.cjs');

const OUT = path.resolve(__dirname, '../../public/baked');
const M = (p) => `/tools/bake/models/${p}.glb`;
/** render px per model unit; textures show at 1/2 in game */
const PPU = 100;

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
  { id: 'bunny', url: M('cube-pets/animal-bunny'), scale: 0.42, anims: PET_MOB },
  { id: 'chick', url: M('cube-pets/animal-chick'), scale: 0.36, anims: PET_MOB },
  { id: 'hog', url: M('cube-pets/animal-hog'), scale: 0.48, anims: PET_MOB },
  { id: 'crab', url: M('cube-pets/animal-crab'), scale: 0.42, anims: PET_MOB },
  { id: 'bee', url: M('cube-pets/animal-bee'), scale: 0.4, anims: PET_MOB },
  { id: 'polar', url: M('cube-pets/animal-polar'), scale: 0.56, anims: PET_MOB },
  { id: 'lion', url: M('cube-pets/animal-lion'), scale: 0.52, anims: PET_MOB },
  { id: 'tiger', url: M('cube-pets/animal-tiger'), scale: 0.52, anims: PET_MOB },
];

const P = (id, url, scale = 1, yaw = 0) => ({ id, url: M(url), scale, yaw });
const PROPS = [
  P('pine', 'graveyard/pine', 0.82), P('pine-crooked', 'graveyard/pine-crooked', 0.82), P('pine-fall', 'graveyard/pine-fall', 0.82),
  P('tree-oak', 'nature/tree_oak_dark', 1.5), P('tree-default', 'nature/tree_default_dark', 1.4), P('tree-fat', 'nature/tree_fat_darkh', 1.5),
  P('tree-detailed', 'nature/tree_detailed_dark', 1.5), P('tree-pine-round', 'nature/tree_pineRoundA', 1.5), P('tree-pine-tall', 'nature/tree_pineTallA_detailed', 1.5),
  P('grave-round', 'graveyard/gravestone-round', 1, 0.3), P('grave-cross', 'graveyard/gravestone-cross', 1, -0.4), P('grave-broken', 'graveyard/gravestone-broken', 1, 0.8),
  P('grave-deco', 'graveyard/gravestone-decorative', 1, -0.2), P('cross-wood', 'graveyard/cross-wood', 1, 0.5),
  P('pumpkin', 'graveyard/pumpkin', 1.2, 0.4), P('pumpkin-carved', 'graveyard/pumpkin-carved', 1.2, 0.7), P('pumpkin-tall', 'graveyard/pumpkin-tall-carved', 1.2, 0.6),
  P('lantern', 'graveyard/lantern-candle', 1.1), P('lightpost', 'graveyard/lightpost-single', 1, 0.6), P('candles', 'graveyard/candle-multiple', 1.4),
  P('fence', 'graveyard/fence-damaged', 1, 0.2), P('iron-fence', 'graveyard/iron-fence-damaged', 1, -0.3), P('crypt', 'graveyard/crypt-small', 1, 0.2),
  P('rocks', 'graveyard/rocks', 1, 0.3), P('rocks-tall', 'graveyard/rocks-tall', 1, 1.1), P('trunk', 'graveyard/trunk', 1, 0.5),
  P('fire-basket', 'graveyard/fire-basket', 1.2), P('urn', 'graveyard/urn-round', 1.1), P('debris', 'graveyard/debris', 1, 0.4),
  P('mushrooms-red', 'nature/mushroom_redGroup', 1.6), P('mushrooms-tan', 'nature/mushroom_tanGroup', 1.6), P('mushroom', 'nature/mushroom_red', 1.6),
  P('bush', 'nature/plant_bushDetailed', 1.3), P('bush-large', 'nature/plant_bushLarge', 1.6), P('rock-large', 'nature/rock_largeA', 1.2, 0.4),
  P('rock-small', 'nature/rock_smallC', 1.3), P('stump', 'nature/stump_round', 1.5), P('log', 'nature/log', 1.5, 1.2),
  P('grass', 'nature/grass_large', 1.4), P('flower-purple', 'nature/flower_purpleA', 1.5), P('flower-red', 'nature/flower_redA', 1.5),
  P('campfire', 'nature/campfire_stones', 1.4),
  P('chest', 'mini-dungeon/chest', 1, 0.6), P('barrel', 'mini-dungeon/barrel', 1, 0.2), P('coin', 'mini-dungeon/coin', 0.7, 0.5),
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
    const job = { ...c, ppu: PPU, dirs: 8, cell: hero ? [104, 112] : [96, 104], footY: 0.86, outline: 2 };
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
