/**
 * Pixel art for the player and the weapons, drawn facing right.
 *
 * Each sprite is a grid of palette letters ('.' is empty). The game plots
 * them one pixel at a time: the body is mirrored when facing left, and the
 * weapons are turned toward the cursor by sampling the grid (nearest pixel),
 * so they stay crisp at any angle instead of smearing.
 */

// Monochrome, like the site: four greys, a dark visor.
export const PALETTE = {
    W: 0xffffff,
    L: 0xcfcfcf,
    M: 0x8f8f8f,
    D: 0x4f4f4f,
    V: 0x161616,
};

/** 0xRRGGBB → the 0xAABBGGRR the level's pixel buffer uses. */
export const toPixel = (rgb) => (0xff000000 | ((rgb & 0xff) << 16) | (rgb & 0xff00) | ((rgb >> 16) & 0xff)) >>> 0;

const parse = (rows) => {
    const pixels = [];
    rows.forEach((row, y) => {
        [...row].forEach((ch, x) => {
            if (ch in PALETTE) pixels.push({ x, y, c: toPixel(PALETTE[ch]) });
        });
    });
    return { w: Math.max(...rows.map((r) => r.length)), h: rows.length, pixels };
};

// ── Player ── 13 × 20, drawn over the 7 × 20 hitbox with column 6 on its
// centre. Helmet with a visor (and its glint), jetpack on the back (the
// left, facing right), belt, jointed legs and boots.
const HEAD = [
    '.....LWWL....',
    '...LWWWWWWL..',
    '..LWWWWWWWWL.',
    '..WWWWWVVVVW.',
    '..WWWWVWVVVW.',
    '..WWWWVVVVVW.',
    '..LWWWWVVVVL.',
    '...LWWWWWWL..',
    '..DDLLWWWL...',
    '.DMMDWWWWWL..',
    '.DMMDWWLWWL..',
    '.DLMDWLWWLL..',
    '.DMMDLWWLL...',
    '..DDMMLLLM...',
];

const LEGS = {
    stand: ['....LW.WL....', '....LW.WL....', '....LW.WL....', '....MW.WM....', '...DDD.DDD...', '...DDD.DDD...'],
    runA: ['....LW.WL....', '...LW...WL...', '...LW...WL...', '..LW.....WL..', '..LW.....WL..', '.DDD.....DDD.'],
    runB: ['....LWWL.....', '....LWWL.....', '....LW.WL....', '....LW..WL...', '....LW..DDD..', '...DDD.......'],
    runC: ['....LW.WL....', '....WL.LW....', '...WL...LW...', '..WL.....LW..', '..W.......W..', '.DDD.....DDD.'],
    air: ['....LW.WL....', '...LW...WL...', '...LW....WL..', '..LW......W..', '..DD......DDD', '.............'],
};

export const BODY = Object.fromEntries(
    Object.entries(LEGS).map(([pose, legs]) => [pose, parse([...HEAD, ...legs])])
);
export const RUN_CYCLE = ['runA', 'runB', 'runC', 'runB'];
export const BODY_ORIGIN = 6;
// Where the arm starts, and where the jetpack nozzle sits (sprite coordinates).
export const SHOULDER = { x: 7, y: 10 };
export const NOZZLE = { x: 2, y: 14 };

// ── Weapons ── `grip` is the pixel in the hand, `muzzle` the tip that fires.
export const WEAPON_ART = {
    blaster: {
        rows: [
            '.DMMMMMW',
            '.DLLLLD.',
            '.DD.....',
            '..D.....',
        ],
        grip: { x: 1, y: 2 },
        muzzle: { x: 7, y: 0 },
    },
    rocket: {
        rows: [
            '....DD.......',
            'DMMMMMMMMMMMD',
            'DLLLLLLLLLLLW',
            'DMMMMMMMMMMMD',
            '....DD.......',
        ],
        grip: { x: 4, y: 4 },
        muzzle: { x: 12, y: 2 },
    },
    grenade: {
        rows: [
            '.DM.',
            'MLLM',
            'LWLM',
            'MLLM',
            '.MM.',
        ],
        // Held out in front of the hand, clear of the body.
        grip: { x: -1, y: 2 },
        muzzle: { x: 4, y: 2 },
    },
    laser: {
        rows: [
            '...DDDD.....',
            'DMMMMMMMMLWW',
            'DDLLLDDDDMM.',
            '.D.DD.......',
        ],
        grip: { x: 3, y: 3 },
        muzzle: { x: 11, y: 1 },
    },
};

for (const art of Object.values(WEAPON_ART)) {
    Object.assign(art, parse(art.rows));
    // Pixels keyed by their offset from the grip, for sampling the turned sprite.
    art.lookup = new Map(art.pixels.map((p) => [(p.x - art.grip.x) * 64 + (p.y - art.grip.y), p.c]));
}

/**
 * The weapon turned to `angle` around its grip, as [dx, dy, colour] offsets
 * from the hand. Sampled backwards from every pixel of the turned sprite's
 * bounds, so no holes open up at odd angles. When aiming left the sprite is
 * flipped first, so the weapon never ends up upside down.
 */
export function turnWeapon(art, angle, flip, out) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const { lookup } = art;
    const reach = Math.ceil(Math.hypot(art.w, art.h));
    for (let dy = -reach; dy <= reach; dy++) {
        for (let dx = -reach; dx <= reach; dx++) {
            const sx = Math.round(dx * cos + dy * sin);
            let sy = Math.round(-dx * sin + dy * cos);
            if (flip) sy = -sy;
            const c = lookup.get(sx * 64 + sy);
            if (c !== undefined) out.push(dx, dy, c);
        }
    }
    return out;
}

/** Where the muzzle ends up, relative to the hand, for the same turn. */
export function muzzleOffset(art, angle, flip) {
    const mx = art.muzzle.x - art.grip.x;
    const my = (art.muzzle.y - art.grip.y) * (flip ? -1 : 1);
    return { x: mx * Math.cos(angle) - my * Math.sin(angle), y: mx * Math.sin(angle) + my * Math.cos(angle) };
}

/** Paints a weapon as an icon for the HUD slots, `scale` CSS px per pixel. */
export function paintIcon(canvas, id, scale = 4) {
    const art = WEAPON_ART[id];
    canvas.width = art.w + 2;
    canvas.height = art.h + 2;
    canvas.style.width = `${canvas.width * scale}px`;
    canvas.style.height = `${canvas.height * scale}px`;
    const ctx = canvas.getContext('2d');
    for (const p of art.pixels) {
        const rgb = p.c & 0xffffff;
        ctx.fillStyle = `rgb(${rgb & 0xff}, ${(rgb >> 8) & 0xff}, ${(rgb >> 16) & 0xff})`;
        ctx.fillRect(p.x + 1, p.y + 1, 1, 1);
    }
}
