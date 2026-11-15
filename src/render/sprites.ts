/**
 * Pixel sprites from Kenney's Tiny Dungeon and Tiny Town packs (CC0, public/sprites/LICENSE.txt), served from public/sprites/.
 * Loaded once at boot; textures.ts draws them into the game's textures at whole-number scales so the pixels stay crisp.
 * A sprite that fails to load is simply missing, and its texture falls back to the drawn placeholder.
 */
export type Sprites = Map<string, HTMLImageElement>;

/** td_NNNN: Tiny Dungeon tile, tt_NNNN: Tiny Town tile */
export const SPRITE_FILES = [
  'td_0084', 'td_0086', 'td_0087', 'td_0088', 'td_0089', 'td_0090', 'td_0096', 'td_0108', 'td_0109', 'td_0110', 'td_0111', 'td_0112',
  'td_0113', 'td_0114', 'td_0115', 'td_0116', 'td_0120', 'td_0121', 'td_0122', 'td_0123', 'td_0124', 'td_0064', 'td_0065', 'td_0063',
  'td_0082', 'td_0101', 'td_0102', 'td_0104', 'td_0107', 'td_0117', 'td_0118',
  'tt_0000', 'tt_0001', 'tt_0002', 'tt_0003', 'tt_0004', 'tt_0005', 'tt_0006', 'tt_0007', 'tt_0015', 'tt_0016', 'tt_0017', 'tt_0018',
  'tt_0027', 'tt_0028', 'tt_0029', 'tt_0092', 'tt_0093', 'tt_0094', 'tt_0106', 'tt_0107',
] as const;

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function loadSprites(base = 'sprites/'): Promise<Sprites> {
  const out: Sprites = new Map();
  await Promise.all(
    SPRITE_FILES.map(async (n) => {
      const img = await loadImage(`${base}${n}.png`);
      if (img) out.set(n, img);
    }),
  );
  return out;
}
