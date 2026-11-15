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
- The placeholder art drawn in `src/render/textures.ts` (snails, mushrooms and similar mob shapes) and the CSS skin.

Art and audio must be our own or carry a license that allows commercial use; record each source here when added.
