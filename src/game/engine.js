import { PIX } from './rasterize';

/**
 * The game: a pixel stick figure running, jumping and jetpacking through the
 * rasterised page, blowing holes in it.
 *
 * Everything happens in game pixels (PIX CSS pixels each) on one flat
 * Uint32 map of the level. Each frame the visible band of that map is copied
 * into the screen buffer in one go, the moving parts are plotted on top as
 * single pixels, and the buffer goes to the canvas with one putImageData.
 * Empty pixels stay transparent, so the particle field shows through.
 */

const STEP = 1 / 60;

// Player
const P_W = 5;
const P_H = 12;
const GRAVITY = 0.22;
const MAX_FALL = 5.5;
const RUN = 1.6;
const JUMP = -3.9;
const STEP_UP = 3;
const FUEL = 110;
const THRUST = 0.42;
const MAX_RISE = 2.6;

// Debris: flying pixels, some of which settle as rubble.
const MAX_DEBRIS = 4000;
// Rubble is marked with alpha 254, so the destruction count only ever
// counts pixels of the original page.
const PAGE_ALPHA = 255;
const RUBBLE = 0xfe000000;

const WHITE = 0xffffffff;
const BLACK = 0xff000000;
const GREY = 0xffa0a0a0;
const DARK = 0xff5b5b5b;

export const WEAPONS = [
    { id: 'blaster', cooldown: 7 },
    { id: 'rocket', cooldown: 42 },
    { id: 'grenade', cooldown: 34 },
    { id: 'laser', cooldown: 0 },
];

const KEYS = {
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    jump: ['Space', 'KeyW', 'ArrowUp'],
};
const HANDLED = new Set([...KEYS.left, ...KEYS.right, ...KEYS.jump, 'ArrowDown', 'KeyS']);

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function createGame({ level, canvas, scrollY, reduceMotion, sfx, onHud, onWeapon, onMute, onExit }) {
    const { px, width: W, height: H, solid: total } = level;
    const ctx = canvas.getContext('2d');

    let vh = 0;
    let frame = null;
    let frame32 = null;
    const resize = () => {
        vh = Math.min(Math.ceil(window.innerHeight / PIX), H);
        canvas.width = W;
        canvas.height = vh;
        canvas.style.width = `${W * PIX}px`;
        canvas.style.height = `${vh * PIX}px`;
        frame = ctx.createImageData(W, vh);
        frame32 = new Uint32Array(frame.data.buffer);
    };
    resize();

    const solidAt = (x, y) => {
        if (x < 0 || x >= W || y < 0 || y >= H) return true;
        return px[y * W + x] !== 0;
    };
    const free = (x, y) => {
        for (let j = 0; j < P_H; j++) {
            for (let i = 0; i < P_W; i++) if (solidAt(x + i, y + j)) return false;
        }
        return true;
    };

    // ── State ──
    let camF = clamp(Math.round(scrollY / PIX), 0, H - vh);
    let camY = Math.round(camF);
    let tick = 0;
    let destroyed = 0;
    let weapon = 0;
    let cooldown = 0;
    let altCooldown = 0;
    let shake = 0;
    let beam = null;

    const player = { x: 0, y: 0, vx: 0, vy: 0, rx: 0, ry: 0, ground: false, coyote: 0, fuel: FUEL, jumpHeld: false, face: 1, jetting: false };
    const keys = new Set();
    const mouse = { x: W / 2, y: vh / 2, fire: false, alt: false };
    const shots = [];
    const rings = [];

    // Spawn a third of the way down the screen, nudged to the nearest gap.
    {
        const sx = Math.floor(W / 2 - P_W / 2);
        const sy = camY + Math.floor(vh * 0.3);
        let found = false;
        for (let d = 0; d < vh && !found; d++) {
            for (const y of [sy - d, sy + d]) {
                if (y >= 0 && y + P_H < H && free(sx, y)) {
                    player.x = sx;
                    player.y = y;
                    found = true;
                    break;
                }
            }
        }
        if (!found) {
            // Solid all the way: clear a pocket to stand in.
            player.x = sx;
            player.y = sy;
            for (let j = -2; j < P_H + 2; j++) for (let i = -2; i < P_W + 2; i++) {
                const x = sx + i, y = sy + j;
                if (x >= 0 && x < W && y >= 0 && y < H) px[y * W + x] = 0;
            }
        }
    }

    // ── Debris ──
    const dx = new Float32Array(MAX_DEBRIS);
    const dy = new Float32Array(MAX_DEBRIS);
    const dvx = new Float32Array(MAX_DEBRIS);
    const dvy = new Float32Array(MAX_DEBRIS);
    const dlife = new Int16Array(MAX_DEBRIS);
    const dcol = new Uint32Array(MAX_DEBRIS);
    const dstick = new Uint8Array(MAX_DEBRIS);
    let debris = 0;

    const spawn = (x, y, vx, vy, life, color, stick) => {
        // When full, recycle a random piece rather than drop the new one.
        const i = debris < MAX_DEBRIS ? debris++ : Math.floor(Math.random() * MAX_DEBRIS);
        dx[i] = x; dy[i] = y; dvx[i] = vx; dvy[i] = vy;
        dlife[i] = life; dcol[i] = color; dstick[i] = stick ? 1 : 0;
    };

    const removeDebris = (i) => {
        const last = --debris;
        dx[i] = dx[last]; dy[i] = dy[last]; dvx[i] = dvx[last]; dvy[i] = dvy[last];
        dlife[i] = dlife[last]; dcol[i] = dcol[last]; dstick[i] = dstick[last];
    };

    const inPlayer = (x, y) => x >= player.x - 1 && x <= player.x + P_W && y >= player.y - 1 && y <= player.y + P_H;

    const updateDebris = () => {
        for (let i = debris - 1; i >= 0; i--) {
            dvy[i] = Math.min(dvy[i] + 0.15, 6);
            const nx = dx[i] + dvx[i];
            const ny = dy[i] + dvy[i];
            const fx = Math.floor(nx), fy = Math.floor(ny);
            if (fx < 0 || fx >= W || fy >= H) {
                removeDebris(i);
                continue;
            }
            if (fy >= 0 && solidAt(fx, fy)) {
                const cx = Math.floor(dx[i]), cy = Math.floor(dy[i]);
                const slow = Math.abs(dvy[i]) < 2.2 && Math.abs(dvx[i]) < 1.6;
                // Landing softly on something: settle as rubble.
                if (dstick[i] && slow && cy >= 0 && !solidAt(cx, cy) && solidAt(cx, cy + 1) && !inPlayer(cx, cy) && Math.random() < 0.6) {
                    px[cy * W + cx] = (dcol[i] & 0x00ffffff) | RUBBLE;
                    removeDebris(i);
                    continue;
                }
                dvy[i] *= -0.3;
                dvx[i] *= 0.55;
            } else {
                dx[i] = nx;
                dy[i] = ny;
            }
            if (--dlife[i] <= 0) removeDebris(i);
        }
    };

    // ── Destruction ──
    const carve = (cx, cy, r, chance, power) => {
        cx = Math.round(cx);
        cy = Math.round(cy);
        let removed = 0;
        for (let oy = -r; oy <= r; oy++) {
            const y = cy + oy;
            if (y < 0 || y >= H) continue;
            // A little noise on each row keeps the crater edges ragged.
            const span = Math.floor(Math.sqrt(r * r - oy * oy) + (Math.random() - 0.5) * 1.4);
            for (let ox = -span; ox <= span; ox++) {
                const x = cx + ox;
                if (x < 0 || x >= W) continue;
                const i = y * W + x;
                const c = px[i];
                if (!c) continue;
                if (c >>> 24 === PAGE_ALPHA) destroyed++;
                px[i] = 0;
                removed++;
                if (Math.random() < chance) {
                    const d = Math.hypot(ox, oy) || 1;
                    const sp = power * (0.35 + Math.random() * 0.9);
                    spawn(x, y, (ox / d) * sp + (Math.random() - 0.5), (oy / d) * sp - Math.random() * power * 0.7,
                        50 + Math.random() * 90, c | 0xff000000, true);
                }
            }
        }
        return removed;
    };

    const explode = (x, y, r) => {
        carve(x, y, r, 0.35, 2.6);
        rings.push({ x, y, r, t: 0, life: 16 });
        for (let k = 0; k < r * 2; k++) {
            const a = Math.random() * Math.PI * 2, sp = Math.random() * 2.5;
            spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 1, 12 + Math.random() * 14, k % 3 ? WHITE : GREY, false);
        }
        // Knockback, strong enough to rocket-jump.
        const pcx = player.x + P_W / 2, pcy = player.y + P_H / 2;
        const reach = r * 2.4;
        const d = Math.hypot(pcx - x, pcy - y);
        if (d < reach) {
            const k = (1 - d / reach) * 5.5;
            player.vx += ((pcx - x) / (d || 1)) * k;
            player.vy += ((pcy - y) / (d || 1)) * k - k * 0.3;
            player.ground = false;
        }
        shake = Math.min(shake + r * 0.18, 7);
        sfx.boom(r);
    };

    // ── Weapons ──
    const aim = () => {
        const sx = player.x + P_W / 2, sy = player.y + 4;
        const ax = mouse.x - sx, ay = mouse.y + camY - sy;
        const d = Math.hypot(ax, ay) || 1;
        return { sx, sy, ux: ax / d, uy: ay / d };
    };

    const fire = () => {
        const { sx, sy, ux, uy } = aim();
        const mx = sx + ux * 7, my = sy + uy * 7;
        const id = WEAPONS[weapon].id;
        if (id === 'blaster') {
            const spread = (Math.random() - 0.5) * 0.06;
            shots.push({ type: 'bullet', x: mx, y: my, vx: (ux - uy * spread) * 7, vy: (uy + ux * spread) * 7, life: 90 });
            sfx.shot();
        } else if (id === 'rocket') {
            shots.push({ type: 'rocket', x: mx, y: my, vx: ux * 2.2, vy: uy * 2.2, life: 400 });
            sfx.launch();
        } else if (id === 'grenade') {
            throwGrenade(mx, my, ux, uy);
        }
        cooldown = WEAPONS[weapon].cooldown;
    };

    const throwGrenade = (x, y, ux, uy) => {
        shots.push({ type: 'grenade', x, y, vx: ux * 4.4 + player.vx * 0.5, vy: uy * 4.4 - 0.8, life: 100 });
        sfx.toss();
    };

    // The laser eats into whatever it touches first, a little every frame.
    const fireLaser = () => {
        const { sx, sy, ux, uy } = aim();
        let x = sx + ux * 7, y = sy + uy * 7;
        for (let k = 0; k < 700; k++) {
            const fx = Math.floor(x), fy = Math.floor(y);
            if (fx < 0 || fx >= W || fy < 0 || fy >= H) break;
            if (px[fy * W + fx]) {
                carve(fx, fy, 2, 0.5, 1.3);
                for (let s = 0; s < 2; s++) {
                    spawn(fx, fy, -ux * Math.random() * 2 + (Math.random() - 0.5) * 2, -uy * Math.random() * 2 - Math.random(), 8 + Math.random() * 10, WHITE, false);
                }
                break;
            }
            x += ux;
            y += uy;
        }
        beam = { x0: sx + ux * 7, y0: sy + uy * 7, x1: x, y1: y };
        sfx.laser();
    };

    const updateShots = () => {
        for (let i = shots.length - 1; i >= 0; i--) {
            const s = shots[i];
            if (s.type === 'rocket') {
                const speed = Math.hypot(s.vx, s.vy);
                if (speed < 7) { s.vx *= 1.07; s.vy *= 1.07; }
                if (tick % 2 === 0) spawn(s.x - s.vx, s.y - s.vy, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4 - 0.2, 14 + Math.random() * 10, DARK, false);
            } else if (s.type === 'grenade') {
                s.vy = Math.min(s.vy + 0.16, 6);
                s.vx *= 0.995;
            }

            const steps = Math.max(1, Math.ceil(Math.max(Math.abs(s.vx), Math.abs(s.vy))));
            let hit = false;
            for (let k = 0; k < steps; k++) {
                const nx = s.x + s.vx / steps, ny = s.y + s.vy / steps;
                if (ny < 0 && s.type !== 'grenade') { s.life = 0; break; }
                if (ny >= 0 && solidAt(Math.floor(nx), Math.floor(ny))) {
                    if (s.type === 'grenade') {
                        const hx = solidAt(Math.floor(nx), Math.floor(s.y));
                        const hy = solidAt(Math.floor(s.x), Math.floor(ny));
                        if (hx || !hy) s.vx *= -0.45;
                        if (hy || !hx) s.vy *= -0.45;
                        s.vx *= 0.8;
                        if (Math.abs(s.vy) > 0.6) sfx.bounce();
                        break;
                    }
                    s.x = nx;
                    s.y = ny;
                    hit = true;
                    break;
                }
                s.x = nx;
                s.y = ny;
            }

            if (hit) {
                if (s.type === 'bullet') {
                    carve(s.x, s.y, 3, 0.45, 1.6);
                    sfx.hit();
                } else {
                    explode(s.x, s.y, 17);
                }
                shots.splice(i, 1);
                continue;
            }
            if (--s.life <= 0) {
                if (s.type === 'grenade') explode(s.x, s.y, 22);
                shots.splice(i, 1);
            }
        }
    };

    // ── Player ──
    const pressed = (names) => names.some((k) => keys.has(k));

    const moveX = (v) => {
        player.rx += v;
        let m = Math.round(player.rx);
        player.rx -= m;
        const s = Math.sign(m);
        while (m) {
            if (free(player.x + s, player.y)) {
                player.x += s;
            } else {
                // Walk up small steps: the edges of letters, rubble, craters.
                let stepped = false;
                for (let k = 1; k <= STEP_UP && player.ground; k++) {
                    if (free(player.x + s, player.y - k)) {
                        player.x += s;
                        player.y -= k;
                        stepped = true;
                        break;
                    }
                }
                if (!stepped) {
                    player.vx = 0;
                    player.rx = 0;
                    return;
                }
            }
            m -= s;
        }
    };

    const moveY = (v) => {
        player.ry += v;
        let m = Math.round(player.ry);
        player.ry -= m;
        const s = Math.sign(m);
        while (m) {
            if (free(player.x, player.y + s)) {
                player.y += s;
            } else {
                player.vy = 0;
                player.ry = 0;
                return;
            }
            m -= s;
        }
    };

    const updatePlayer = () => {
        const dir = (pressed(KEYS.right) ? 1 : 0) - (pressed(KEYS.left) ? 1 : 0);
        const accel = player.ground ? 0.4 : 0.22;
        if (dir) {
            const along = player.vx * dir;
            if (along < RUN) player.vx = dir * Math.min(along + accel, RUN);
        } else {
            player.vx *= player.ground ? 0.6 : 0.96;
        }
        // Knockback can push past running speed; let it bleed off.
        if (Math.abs(player.vx) > RUN) player.vx *= player.ground ? 0.85 : 0.985;
        if (Math.abs(player.vx) < 0.05) player.vx = 0;

        const jump = pressed(KEYS.jump);
        if (jump && !player.jumpHeld && (player.ground || player.coyote > 0)) {
            player.vy = JUMP;
            player.ground = false;
            player.coyote = 0;
            sfx.jump();
        }
        player.vy = Math.min(player.vy + GRAVITY, MAX_FALL);

        // Holding jump once the jump runs out of lift fires the jetpack.
        player.jetting = jump && !player.ground && player.vy > -1.2 && player.fuel > 0;
        if (player.jetting) {
            player.vy = Math.max(player.vy - THRUST, -MAX_RISE);
            player.fuel -= 1;
            const bx = player.x + P_W / 2 - player.face * 2;
            spawn(bx, player.y + 8, (Math.random() - 0.5) * 0.6, 1.2 + Math.random(), 6 + Math.random() * 8, tick % 2 ? WHITE : GREY, false);
        }
        player.jumpHeld = jump;

        moveX(player.vx);
        moveY(player.vy);

        player.ground = !free(player.x, player.y + 1);
        if (player.ground) {
            player.coyote = 6;
            player.fuel = Math.min(FUEL, player.fuel + 2);
        } else if (player.coyote > 0) {
            player.coyote--;
        }

        const lookX = mouse.x - (player.x + P_W / 2);
        if (Math.abs(lookX) > 1) player.face = Math.sign(lookX);
    };

    // ── Render ──
    const plot = (x, y, c) => {
        x = Math.floor(x);
        y = Math.floor(y) - camY;
        if (x < 0 || x >= W || y < 0 || y >= vh) return;
        frame32[y * W + x] = c;
    };

    const line = (x0, y0, x1, y1, c, out) => {
        x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
        const ddx = Math.abs(x1 - x0), ddy = -Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let err = ddx + ddy;
        for (;;) {
            out ? out.push(x0, y0, c) : plot(x0, y0, c);
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 >= ddy) { err += ddy; x0 += sx; }
            if (e2 <= ddx) { err += ddx; y0 += sy; }
        }
    };

    const drawPlayer = () => {
        const pts = [];
        const cx = player.x + 2, top = player.y;
        // Head
        for (let j = 0; j < 3; j++) for (let i = -1; i <= 1; i++) pts.push(cx + i, top + j, WHITE);
        // Jetpack, on the back
        const bx = cx - player.face * 2;
        for (let j = 4; j < 7; j++) pts.push(bx, top + j, GREY);
        // Body
        line(cx, top + 3, cx, top + 7, WHITE, pts);
        // Legs: a four-frame run, a stance, and a tuck in the air
        const RUN_CYCLE = [[-2, 2], [-1, 1], [2, -2], [1, -1]];
        let feet = [-2, 2], footY = top + 11;
        if (!player.ground) {
            feet = [-1, 2];
            footY = top + 10;
        } else if (Math.abs(player.vx) > 0.2) {
            feet = RUN_CYCLE[Math.floor(tick / 5) % 4];
        }
        line(cx, top + 7, cx + feet[0], footY, WHITE, pts);
        line(cx, top + 7, cx + feet[1], footY, WHITE, pts);
        // Arm and gun, toward the cursor
        const { ux, uy } = aim();
        const hx = cx + ux * 3, hy = top + 4 + uy * 3;
        line(cx, top + 4, hx, hy, WHITE, pts);
        line(hx, hy, hx + ux * 3, hy + uy * 3, GREY, pts);

        // A black outline keeps the figure readable over white blocks.
        const taken = new Set();
        for (let k = 0; k < pts.length; k += 3) taken.add(pts[k] * 65536 + pts[k + 1]);
        for (let k = 0; k < pts.length; k += 3) {
            const x = pts[k], y = pts[k + 1];
            for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                if (!taken.has((x + ox) * 65536 + y + oy)) plot(x + ox, y + oy, BLACK);
            }
        }
        for (let k = 0; k < pts.length; k += 3) plot(pts[k], pts[k + 1], pts[k + 2]);
    };

    const drawCrosshair = () => {
        const x = Math.floor(mouse.x), y = Math.floor(mouse.y);
        if (y < 0 || y >= vh || x < 0 || x >= W) return;
        const under = frame32[y * W + x];
        const bright = under && ((under & 0xff) + ((under >> 8) & 0xff) + ((under >> 16) & 0xff)) > 380;
        const c = bright ? BLACK : WHITE;
        for (const [ox, oy] of [[2, 0], [3, 0], [-2, 0], [-3, 0], [0, 2], [0, 3], [0, -2], [0, -3]]) plot(x + ox, y + oy + camY, c);
        plot(x, y + camY, c);
    };

    const render = () => {
        const start = camY * W;
        frame32.set(px.subarray(start, start + W * vh));

        for (let i = 0; i < debris; i++) plot(dx[i], dy[i], dcol[i]);

        for (const s of shots) {
            if (s.type === 'bullet') {
                plot(s.x, s.y, WHITE);
                plot(s.x - s.vx * 0.3, s.y - s.vy * 0.3, GREY);
            } else if (s.type === 'rocket') {
                plot(s.x, s.y, WHITE); plot(s.x + 1, s.y, WHITE); plot(s.x, s.y + 1, WHITE); plot(s.x + 1, s.y + 1, GREY);
            } else {
                const blink = s.life < 30 && tick % 6 < 3;
                const c = blink ? WHITE : GREY;
                plot(s.x, s.y, c); plot(s.x + 1, s.y, c); plot(s.x, s.y + 1, c); plot(s.x + 1, s.y + 1, c);
            }
        }

        if (beam) {
            line(beam.x0, beam.y0, beam.x1, beam.y1, tick % 4 < 2 ? WHITE : GREY);
            beam = null;
        }

        for (let i = rings.length - 1; i >= 0; i--) {
            const ring = rings[i];
            const k = ring.t / ring.life;
            if (ring.t < 3) {
                const rr = ring.r * 0.7;
                for (let oy = -rr; oy <= rr; oy++) {
                    const span = Math.sqrt(rr * rr - oy * oy);
                    for (let ox = -span; ox <= span; ox++) plot(ring.x + ox, ring.y + oy, WHITE);
                }
            }
            const rr = ring.r * (0.5 + k * 0.9);
            const n = Math.ceil(rr * 6.3);
            const c = k < 0.5 ? WHITE : GREY;
            for (let a = 0; a < n; a++) {
                const ang = (a / n) * Math.PI * 2;
                plot(ring.x + Math.cos(ang) * rr, ring.y + Math.sin(ang) * rr, c);
            }
            if (++ring.t >= ring.life) rings.splice(i, 1);
        }

        drawPlayer();
        drawCrosshair();
        ctx.putImageData(frame, 0, 0);

        if (!reduceMotion && shake > 0.2) {
            const sx = Math.round((Math.random() - 0.5) * shake) * PIX;
            const sy = Math.round((Math.random() - 0.5) * shake) * PIX;
            canvas.style.transform = `translate(${sx}px, ${sy}px)`;
        } else {
            canvas.style.transform = '';
        }
    };

    // ── Loop ──
    const update = () => {
        tick++;
        updatePlayer();

        if (cooldown > 0) cooldown--;
        if (altCooldown > 0) altCooldown--;
        if (mouse.fire) {
            if (WEAPONS[weapon].id === 'laser') fireLaser();
            else if (cooldown <= 0) fire();
        }
        if (mouse.alt && altCooldown <= 0) {
            const { sx, sy, ux, uy } = aim();
            throwGrenade(sx + ux * 7, sy + uy * 7, ux, uy);
            altCooldown = WEAPONS[2].cooldown;
        }

        updateShots();
        updateDebris();
        shake *= 0.86;

        // The camera leads a little toward where you aim.
        const target = player.y + P_H / 2 - vh / 2 + (mouse.y - vh / 2) * 0.3;
        camF += (target - camF) * 0.12;
        camF = clamp(camF, 0, H - vh);
        camY = Math.round(camF);

        if (tick % 6 === 0) onHud({ destroyed: total ? destroyed / total : 0, fuel: player.fuel / FUEL });
    };

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now) => {
        acc += Math.min((now - last) / 1000, 0.1);
        last = now;
        while (acc >= STEP) {
            update();
            acc -= STEP;
        }
        render();
        raf = requestAnimationFrame(loop);
    };

    // ── Input ──
    const setWeapon = (i) => {
        weapon = (i + WEAPONS.length) % WEAPONS.length;
        cooldown = Math.min(cooldown, 10);
        onWeapon(weapon);
    };

    const exit = () => onExit(camY * PIX);

    const onKeyDown = (e) => {
        if (e.code === 'Escape') {
            e.preventDefault();
            exit();
            return;
        }
        if (e.code.startsWith('Digit')) {
            const n = Number(e.code.slice(5)) - 1;
            if (n >= 0 && n < WEAPONS.length) setWeapon(n);
            return;
        }
        if (e.code === 'KeyM') {
            onMute(sfx.toggleMute());
            return;
        }
        if (HANDLED.has(e.code)) {
            e.preventDefault();
            keys.add(e.code);
        }
    };
    const onKeyUp = (e) => keys.delete(e.code);
    const onBlur = () => {
        keys.clear();
        mouse.fire = mouse.alt = false;
    };

    const toGame = (e) => {
        const r = canvas.getBoundingClientRect();
        mouse.x = (e.clientX - r.left) / PIX;
        mouse.y = (e.clientY - r.top) / PIX;
    };
    const onPointerDown = (e) => {
        toGame(e);
        if (e.button === 0) mouse.fire = true;
        if (e.button === 2) mouse.alt = true;
        canvas.setPointerCapture?.(e.pointerId);
    };
    const onPointerUp = (e) => {
        if (e.button === 0) mouse.fire = false;
        if (e.button === 2) mouse.alt = false;
    };
    const onWheel = (e) => {
        e.preventDefault();
        if (Math.abs(e.deltaY) < 4) return;
        setWeapon(weapon + Math.sign(e.deltaY));
    };
    const onResize = () => {
        // A new width would need a new level; a new height only a new view.
        if (Math.ceil(document.documentElement.clientWidth / PIX) !== W) exit();
        else resize();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('pointermove', toGame);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('resize', onResize);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    raf = requestAnimationFrame(loop);

    return {
        setWeapon,
        exit,
        toggleMute: () => onMute(sfx.toggleMute()),
        destroy() {
            cancelAnimationFrame(raf);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', onBlur);
            window.removeEventListener('pointermove', toGame);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('resize', onResize);
            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('wheel', onWheel);
        },
    };
}
