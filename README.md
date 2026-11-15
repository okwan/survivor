# Survivor (working title)

An original survivor game for Steam, set in a cozy-dark storybook fantasy world. TypeScript + Vite + PixiJS 8.

The engine started as Oscar's MapleStory fan prototype (`okwan/ms-survivor`). Everything that came from MapleStory or
that downloaded MapleStory files has been removed or is being replaced; see **IP cleanup** below. Systems from
`okwan/sc2-survivor` (3-card rarity draws, reroll/banish, dash, zones with timed bosses, endless mode, lairs and
caches, talent trees, mutators, daily runs, achievements) are ported in next.

## Play locally

```bash
npm install
npm run dev      # http://localhost:5173  (add ?bot for the debug hooks on window.game)
npm test         # headless simulation, balance and UI tests
npm run build    # production build in dist/
```

## Layout

```
src/
  game/    pure simulation (no DOM, no Pixi): runs headlessly in Node for tests, the bot and balance probes
  render/  Pixi renderer and procedural placeholder textures
  ui/      DOM HUD, menus and windows
  art/     art types; an art pack will fill GameArt (none ships yet, so everything uses placeholders)
  audio/   music and sound-effect players (silent until we have our own sounds)
scripts/   tests (test-*.ts) and balance probes (balance-*.ts)
```

## IP cleanup

Done in this repository:

- No asset pipeline: the scripts that downloaded a MapleStory client and extracted its sprites, sounds and UI are gone,
  along with the runtime loaders for them, the MapleStory login screens, the character-look system and the UI-skin
  slot detection.
- Branding: the title, icon, save keys and the visible menu terms (shop, bestiary, talents, currency) are neutral.

Still to replace in the content pass, before anything is published:

- `src/game/data.ts` and the files that read it: class, job, skill, mob, boss and region names, the MapleStory skill
  and mob ids they carry, and item / scroll / gear names and stats.
- The balance numbers, which were taken from another fan game (Azeroth Survivors); retune them with the balance
  probes against our own targets.
- Monster and boss names are original now; their numeric ids (keys for the bestiary and saves) still come from the old data.

Art and audio must be our own or carry a license that allows commercial use; record each source here when added.

## Credits and licenses

- **Sprites:** Kenney's *Tiny Dungeon* and *Tiny Town* packs, by Kenney (www.kenney.nl), CC0 1.0 (public domain, commercial
  use allowed). Files in `public/sprites/`, license in `public/sprites/LICENSE.txt`. Taken from the
  `shorepine/kenney` mirror of the Kenney library.
- **Isometric art:** heroes, monsters and props are pre-rendered from Kenney's 3D kits (*Graveyard Kit*, *Mini Dungeon*,
  *Mini Characters*, *Cube Pets*, *Nature Kit*), CC0 1.0. The source models are in `tools/bake/models/` and
  `npm run bake` renders them into `public/baked/` (8 directions, walk, idle and attack frames) with three.js in
  headless Chromium. Change the camera, lights or outline in `tools/bake/bake.mjs` and re-bake.
- **Font:** Pixelify Sans by Stefie Justprince, SIL Open Font License 1.1, via `@fontsource/pixelify-sans`.

These are a strong starting point, not the final look: a Steam release should commission or buy a consistent,
larger sprite set (heroes with walk and attack animations, bosses, effects) in the same style.
