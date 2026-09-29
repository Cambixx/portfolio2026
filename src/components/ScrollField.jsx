import { useEffect, useRef } from 'react';
// Named imports only: they let the bundler drop the parts of three the field
// never touches (a namespace import would keep the whole library).
import {
    BufferAttribute,
    BufferGeometry,
    Color,
    DynamicDrawUsage,
    MathUtils,
    PerspectiveCamera,
    Points,
    Scene,
    ShaderMaterial,
    Vector2,
    WebGLRenderer,
} from 'three';
import { DEFAULT_PALETTE } from '../config/palette';
import { fieldState, getNamePoints, subscribeNamePoints } from './fieldState';

/**
 * Fixed particle field that re-forms into a different shape for each section.
 * Every point carries one target position per formation. Moving to a new
 * formation is a timed, eased transition rather than a scroll scrub: all
 * points travel together along a shared arc from wherever they are now, so
 * the motion stays smooth however unevenly the page is scrolled. At rest the
 * points breathe in size instead of drifting, and light up around the cursor.
 *
 * The first four formations belong to the intro (hanging dust, the dense
 * core it collapses into, the core blown apart, then the name); the intro
 * picks them and hands over at the hero grid, from where the section on
 * screen decides.
 */

// Sections in page order; section N shows formation SITE_OFFSET + N.
const SECTION_IDS = ['hero', 'projects', 'experience', 'education', 'stack', 'contact'];

// Seeded so a resize rebuilds the same layout instead of reshuffling every point.
function mulberry32(seed) {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function rotate(out, rx, ry) {
    const cx = Math.cos(rx), sx = Math.sin(rx);
    const cy = Math.cos(ry), sy = Math.sin(ry);
    for (let i = 0; i < out.length; i += 3) {
        const x = out[i], y = out[i + 1], z = out[i + 2];
        const y1 = y * cx - z * sx;
        const z1 = y * sx + z * cx;
        out[i] = x * cy + z1 * sy;
        out[i + 1] = y1;
        out[i + 2] = -x * sy + z1 * cy;
    }
    return out;
}

// ── Formations ── each returns count*3 positions in world units at z≈0,
// sized from the visible viewport (W × H) so they frame on any screen.

function cloud(n, W, H, rnd) {
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
        out[i * 3] = (rnd() - 0.5) * W * 1.6;
        out[i * 3 + 1] = (rnd() - 0.5) * H * 1.6;
        out[i * 3 + 2] = (rnd() - 0.5) * 30;
    }
    return out;
}

/**
 * Intro opening: faint dust hanging across the whole space and at every
 * depth, some of it right in front of the camera.
 */
function dust(n, W, H, rnd) {
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
        out[i * 3] = (rnd() - 0.5) * W * 1.5;
        out[i * 3 + 1] = (rnd() - 0.5) * H * 1.5;
        out[i * 3 + 2] = -30 + rnd() * 65;
    }
    return out;
}

/** Every point collapsed into a small, dense core. */
function core(n, W, H, rnd) {
    const out = new Float32Array(n * 3);
    const R = Math.min(W, H) * 0.035;
    for (let i = 0; i < n; i++) {
        // Cubed radius packs the points toward the centre, so the core glows.
        const r = R * Math.pow(rnd(), 3);
        const theta = rnd() * Math.PI * 2;
        const phi = Math.acos(2 * rnd() - 1);
        out[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        out[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        out[i * 3 + 2] = r * Math.cos(phi);
    }
    return out;
}

/**
 * The core blown apart: points in every direction and at every depth, many
 * past the screen edge and some almost at the camera, so they sweep past the
 * viewer as large out-of-focus embers.
 */
function burst(n, W, H, rnd) {
    const out = new Float32Array(n * 3);
    const R = Math.max(W, H);
    for (let i = 0; i < n; i++) {
        const theta = rnd() * Math.PI * 2;
        const phi = Math.acos(2 * rnd() - 1);
        const r = R * (0.25 + 0.75 * Math.sqrt(rnd()));
        out[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        out[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.7;
        // The camera sits at z = 50; stop short of it.
        out[i * 3 + 2] = Math.min(r * Math.cos(phi) * 0.8, 42);
    }
    return out;
}

/**
 * The intro name, from pixels sampled off the real DOM text so the particles
 * land exactly where the heading is laid out. Until those arrive (or if the
 * intro never ran) it falls back to the cloud.
 */
function name(n, W, H, rnd, points) {
    if (!points?.length) return cloud(n, W, H, rnd);
    const out = new Float32Array(n * 3);
    const m = points.length / 2;
    for (let i = 0; i < n; i++) {
        const j = i % m;
        // Points beyond the sample count reuse a pixel; nudge them off it.
        const spread = i < m ? 0 : 0.06;
        out[i * 3] = (points[j * 2] - 0.5) * W + (rnd() - 0.5) * spread;
        out[i * 3 + 1] = (0.5 - points[j * 2 + 1]) * H + (rnd() - 0.5) * spread;
        out[i * 3 + 2] = (rnd() - 0.5) * 0.4;
    }
    return out;
}

// ── Shape toolkit ── the section formations are assembled from simple parts
// (strokes, rings, patches, balls). Each part says how big it is and how to
// draw one random point on it; points are shared out in proportion to size,
// so every part of a figure reads at the same density.

const TAU = Math.PI * 2;

function jitter(p, t, rnd) {
    if (!t) return p;
    return [p[0] + (rnd() - 0.5) * t, p[1] + (rnd() - 0.5) * t, p[2] + (rnd() - 0.5) * t];
}

/** Straight stroke from a to b, `t` thick. */
function seg(a, b, t = 0) {
    return {
        size: Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]),
        at(rnd) {
            const k = rnd();
            return jitter([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k], t, rnd);
        },
    };
}

/** Stroke drawn as dashes `dash` long with equal gaps. */
function dashed(a, b, dash, t = 0) {
    const line = seg(a, b, t);
    return {
        size: line.size / 2,
        at(rnd) {
            let k;
            do k = rnd(); while (((k * line.size) / dash) % 2 > 1);
            const p = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
            return jitter(p, t, rnd);
        },
    };
}

/** Ellipse around c, radii rx/ry along the unit vectors u/v. */
function ellipse(c, rx, ry, u = [1, 0, 0], v = [0, 1, 0], t = 0) {
    return {
        // Ramanujan's approximation of the perimeter.
        size: Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry))),
        at(rnd) {
            const a = rnd() * TAU;
            const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
            return jitter([c[0] + u[0] * x + v[0] * y, c[1] + u[1] * x + v[1] * y, c[2] + u[2] * x + v[2] * y], t, rnd);
        },
    };
}

const ring = (c, r, u, v, t) => ellipse(c, r, r, u, v, t);

/** Filled rectangle, sparser than a stroke by `density`. */
function patch(c, w, h, u = [1, 0, 0], v = [0, 1, 0], density = 0.15) {
    return {
        size: w * h * density,
        at(rnd) {
            const x = (rnd() - 0.5) * w, y = (rnd() - 0.5) * h;
            return [c[0] + u[0] * x + v[0] * y, c[1] + u[1] * x + v[1] * y, c[2] + u[2] * x + v[2] * y];
        },
    };
}

/** Solid ball; `size` is given directly, as a stroke length's worth of points. */
function ball(c, r, size) {
    return {
        size,
        at(rnd) {
            const d = r * Math.cbrt(rnd());
            const th = rnd() * TAU, ph = Math.acos(2 * rnd() - 1);
            return [c[0] + d * Math.sin(ph) * Math.cos(th), c[1] + d * Math.sin(ph) * Math.sin(th), c[2] + d * Math.cos(ph)];
        },
    };
}

/** Rectangle outline in the xy plane. */
const frame = (cx, cy, w, h, t) => {
    const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
    return [
        seg([x0, y0, 0], [x1, y0, 0], t), seg([x1, y0, 0], [x1, y1, 0], t),
        seg([x1, y1, 0], [x0, y1, 0], t), seg([x0, y1, 0], [x0, y0, 0], t),
    ];
};

/** Wraps a part so its points are passed through `f`. */
const moved = (part, f) => ({ size: part.size, at: (rnd) => f(part.at(rnd)) });

/** Shares `n` points across `parts`; a part with `fraction` takes that share outright. */
function build(n, rnd, parts) {
    const out = new Float32Array(n * 3);
    const fixed = parts.reduce((sum, p) => sum + (p.fraction ? Math.round(n * p.fraction) : 0), 0);
    const total = parts.reduce((sum, p) => sum + (p.fraction ? 0 : p.size), 0);
    let i = 0;
    parts.forEach((part, index) => {
        let share = part.fraction ? Math.round(n * part.fraction) : Math.round(((n - fixed) * part.size) / total);
        if (index === parts.length - 1) share = n - i;
        for (let k = 0; k < share && i < n; k++, i++) out.set(part.at(rnd), i * 3);
    });
    return out;
}

// ── Section formations ──

/** Hero — `</>`, the frontend mark, with a little ambient dust around it. */
function codeMark(n, W, H, rnd) {
    const u = Math.min(H * 0.2, (W * 0.8) / 3.8);
    const t = u * 0.09;
    const p = (x, y) => [x * u, y * u, 0];
    return build(n, rnd, [
        seg(p(-0.9, 0.85), p(-1.85, 0), t), seg(p(-1.85, 0), p(-0.9, -0.85), t),
        seg(p(0.4, 1.05), p(-0.4, -1.05), t),
        seg(p(0.9, 0.85), p(1.85, 0), t), seg(p(1.85, 0), p(0.9, -0.85), t),
        {
            fraction: 0.12,
            at: (r) => [(r() - 0.5) * W * 1.2, (r() - 0.5) * H * 1.2, -12 + r() * 22],
        },
    ]);
}

/** Projects — a fanned gallery of three browser windows. */
function gallery(n, W, H, rnd) {
    const portrait = W < H;
    const ww = portrait ? W * 0.72 : Math.min((W * 0.9) / 2.3, H * 0.55);
    const wh = ww * 0.62;
    const t = ww * 0.006;
    const x0 = -ww / 2, y0 = -wh / 2, y1 = wh / 2;
    const bar = y1 - wh * 0.13;

    const windowParts = () => [
        ...frame(0, 0, ww, wh, t),
        seg([x0, bar, 0], [-x0, bar, 0], t),
        ...[0, 1, 2].map((k) => ring([x0 + ww * (0.05 + k * 0.045), (bar + y1) / 2, 0], ww * 0.012)),
        // Page: a hero banner, two lines of copy and a row of cards.
        patch([0, bar - wh * 0.2, 0], ww * 0.86, wh * 0.22, undefined, undefined, 0.35),
        seg([x0 + ww * 0.07, bar - wh * 0.42, 0], [x0 + ww * 0.55, bar - wh * 0.42, 0], t),
        seg([x0 + ww * 0.07, bar - wh * 0.5, 0], [x0 + ww * 0.4, bar - wh * 0.5, 0], t),
        ...[0, 1, 2].flatMap((k) => frame(x0 + ww * (0.2 + k * 0.3), y0 + wh * 0.17, ww * 0.24, wh * 0.2, t)),
    ];

    const place = ({ x = 0, y = 0, z = 0, ry = 0, k = 1 }) => ([px, py, pz]) => {
        const c = Math.cos(ry), s = Math.sin(ry);
        return [(px * c + pz * s) * k + x, py * k + y, (-px * s + pz * c) * k + z];
    };
    const layout = portrait
        ? // Tall screens: a diagonal cascade, each window a step back.
          [
              { x: ww * 0.1, y: wh * 0.75, z: -8, k: 0.85 },
              { x: 0, y: 0, z: -3, k: 0.92 },
              { x: -ww * 0.1, y: -wh * 0.75, z: 2 },
          ]
        : // Like a carousel: the front window in full, smaller ones set back
          // and turned toward it on either side, overlapping only at the edges.
          [
              { x: -ww * 0.98, z: -8, ry: 0.6, k: 0.78 },
              { x: ww * 0.98, z: -8, ry: -0.6, k: 0.78 },
              { x: 0, z: 3 },
          ];
    const parts = layout.flatMap((spot) => windowParts().map((part) => moved(part, place(spot))));
    return rotate(build(n, rnd, parts), 0.08, 0);
}

/** Experience — a rising career line: five milestones, Iberia to Doers DF. */
function trajectory(n, W, H, rnd) {
    const L = Math.min(W * (W < H ? 0.82 : 0.62), H * 1.15);
    const h = L * 0.42;
    const t = L * 0.004;
    const base = -0.55 * h;
    const nodes = [-0.4, -0.28, -0.12, 0.1, 0.42].map((y, i) => [(-0.5 + i * 0.25) * L, y * h, 0]);

    const parts = [seg([-0.54 * L, base, 0], [0.54 * L, base, 0], t)];
    nodes.forEach((node, i) => {
        if (i > 0) parts.push(seg(nodes[i - 1], node, t));
        const last = i === nodes.length - 1;
        parts.push(ring(node, L * (last ? 0.03 : 0.02), undefined, undefined, t));
        parts.push(ball(node, L * 0.006, L * 0.03));
        parts.push(dashed([node[0], node[1] - L * 0.025, 0], [node[0], base, 0], L * 0.012, t));
        // The current role gets a halo.
        if (last) parts.push(ring(node, L * 0.055, undefined, undefined, t));
    });
    return rotate(build(n, rnd, parts), 0.12, -0.22);
}

/** Education — a graduation cap, tassel and all. */
function gradCap(n, W, H, rnd) {
    const a = Math.min(H * 0.5, W * 0.5);
    const hA = a / 2;
    const t = a * 0.006;
    const slab = -a * 0.035;
    const flat = [[1, 0, 0], [0, 0, 1]];
    const r = a * 0.3;
    const corner = (y) => [[-hA, y, -hA], [hA, y, -hA], [hA, y, hA], [-hA, y, hA]];
    const outline = (y) => corner(y).map((c, i, all) => seg(c, all[(i + 1) % 4], t));
    const knot = [hA * 0.92, a * 0.01, hA * 0.92];

    const parts = [
        ...outline(0),
        ...outline(slab),
        patch([0, 0, 0], a, a, ...flat, 0.04),
        // Skull: a band under the board and its lower rim. The upper rim is
        // hidden by the board on a real cap, and drawn here it reads as clutter.
        ring([0, -a * 0.36, 0], r * 0.95, ...flat, t),
        {
            size: TAU * r * a * 0.32 * 0.08,
            at: (rr) => {
                const ang = rr() * TAU, y = slab - rr() * a * 0.325;
                return [Math.cos(ang) * r, y, Math.sin(ang) * r];
            },
        },
        ball([0, a * 0.02, 0], a * 0.03, a * 0.1),
        // Tassel: cord to the corner, a drop, then the fringe.
        seg([0, a * 0.02, 0], knot, t),
        seg(knot, [knot[0], -a * 0.42, knot[2]], t),
        {
            size: a * 0.5,
            at: (rr) => {
                const k = rr(), ang = rr() * TAU, rad = k * a * 0.065;
                return [knot[0] + Math.cos(ang) * rad, -a * 0.42 - k * a * 0.16, knot[2] + Math.sin(ang) * rad];
            },
        },
    ];

    const out = build(n, rnd, parts);
    // Lift it so the cap, not the board, sits at the centre of the screen.
    for (let i = 1; i < out.length; i += 3) out[i] += a * 0.15;
    // Turn the board into a diamond, then tip its far edge up just enough to
    // show the top: seen from higher, the skull shows through the board.
    return rotate(rotate(out, 0, Math.PI / 4), 0.26, 0);
}

/** Stack — an atom of three tilted orbits around a nucleus (React's mark). */
function atom(n, W, H, rnd) {
    const Ro = Math.min(W * 0.4, H * 0.42);
    const ro = Ro * 0.36;
    const t = Ro * 0.008;
    const tilt = 0.35;
    const parts = [ball([0, 0, 0], Ro * 0.09, Ro * 1.1)];
    [0, 1, 2].forEach((k) => {
        const a = (k * Math.PI) / 3;
        const u = [Math.cos(a), Math.sin(a), 0];
        // Each orbit leans a little out of the screen plane, so they cross in depth.
        const v = [-Math.sin(a) * Math.cos(tilt), Math.cos(a) * Math.cos(tilt), Math.sin(tilt) * (k % 2 ? 1 : -1)];
        parts.push(ellipse([0, 0, 0], Ro, ro, u, v, t));
        // An electron riding each orbit.
        const e = 0.6 + k * 2.1;
        const pos = [0, 1, 2].map((i) => u[i] * Math.cos(e) * Ro + v[i] * Math.sin(e) * ro);
        parts.push(ball(pos, Ro * 0.03, Ro * 0.12));
    });
    return rotate(build(n, rnd, parts), 0.25, 0.2);
}

function wave(n, W, H) {
    const out = new Float32Array(n * 3);
    const R = Math.min(W, H);
    const w = W * 1.3, d = R * 1.4;
    const rows = Math.max(1, Math.round(Math.sqrt(n / (w / d))));
    const cols = Math.ceil(n / rows);
    for (let i = 0; i < n; i++) {
        const x = -w / 2 + ((i % cols) / (cols - 1)) * w;
        const z = -d / 2 + (Math.floor(i / cols) / (rows - 1)) * d;
        out[i * 3] = x;
        out[i * 3 + 1] = Math.sin(x * 0.22) * Math.cos(z * 0.28) * R * 0.07 - H * 0.12;
        out[i * 3 + 2] = z;
    }
    return rotate(out, 0.55, 0);
}

const FORMATIONS = [dust, core, burst, name, codeMark, gallery, trajectory, gradCap, atom, wave];
const DUST_FORMATION = 0;
const NAME_FORMATION = 3;
// Formation shown at the top of the page, where the intro hands over.
const SITE_OFFSET = 4;
// Formations with real depth; they sway gently, the flat ones stay square.
const DEPTH_FORMATIONS = new Set([5, 6, 7, 8]);
// Seconds a section change takes.
const SECTION_TRANSITION = 1.4;

const EASINGS = {
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    outQuart: (t) => 1 - Math.pow(1 - t, 4),
};

/**
 * How a transition travels. `scatter` is the sideways bow as a share of the
 * viewport width, `arcZ` how far points lift toward the camera mid-flight.
 */
const SECTION_MOTION = { ease: 'inOutCubic', scatter: 0.2, arcZ: 0 };

const vertexShader = /* glsl */ `
    attribute vec3 aStart; // where each point set off from, rewritten on every retarget
    attribute vec3 p0;
    attribute vec3 p1;
    attribute vec3 p2;
    attribute vec3 p3;
    attribute vec3 p4;
    attribute vec3 p5;
    attribute vec3 p6;
    attribute vec3 p7;
    attribute vec3 p8;
    attribute vec3 p9;
    attribute vec4 aRnd; // x size + depth lift, y arc offset x, z alpha, w arc offset y + phase

    uniform float uTo;
    uniform float uTransition; // eased 0 → 1
    uniform float uScatter;
    uniform float uArcZ;
    uniform float uTime;
    uniform float uSize;
    uniform float uPixelRatio;
    uniform float uMotion;
    uniform float uFocus;
    uniform float uLit;
    uniform float uDepth;
    uniform float uCharge;      // pre-blast fizz on the core
    uniform float uSweep;       // world x of the light sweep
    uniform float uSweepOn;
    uniform vec2 uPointer;      // -1 … 1
    uniform vec2 uMouse;        // pointer in world units at z = 0
    uniform float uParallax;
    uniform float uHighlightRadius;

    varying float vAlpha;
    varying float vIntensity;
    varying float vSweep;

    const float PI = 3.141592653589793;

    vec3 pick(float i) {
        if (i < 0.5) return p0;
        if (i < 1.5) return p1;
        if (i < 2.5) return p2;
        if (i < 3.5) return p3;
        if (i < 4.5) return p4;
        if (i < 5.5) return p5;
        if (i < 6.5) return p6;
        if (i < 7.5) return p7;
        if (i < 8.5) return p8;
        return p9;
    }

    void main() {
        float t = uTransition;
        float arc = sin(t * PI);
        vec3 pos = mix(aStart, pick(uTo), t);

        // Travel as one body: each point bows out by its own offset mid-flight
        // and lands back on the shape, so the field swells and re-gathers.
        pos.xy += (vec2(aRnd.y, aRnd.w) - 0.5) * uScatter * arc;
        pos.z += aRnd.x * uArcZ * arc;
        // Charge: the core swells into a crackling sphere, each point pulsing
        // outward along its own direction on its own beat.
        vec3 dir = normalize(vec3(aRnd.y, aRnd.w, aRnd.x) - 0.5 + 0.0001);
        float crackle = 0.5 + 0.5 * sin(uTime * 45.0 + aRnd.w * 20.0);
        pos += dir * uCharge * crackle * mix(1.0, 4.0, aRnd.z);

        // Depth parallax: nearer points follow the cursor further.
        pos.xy += uPointer * pos.z * uParallax;

        vec4 world = modelMatrix * vec4(pos, 1.0);
        vec4 view = viewMatrix * world;
        gl_Position = projectionMatrix * view;

        // At rest the points breathe in size, each on its own phase.
        float pulse = sin(uTime * 2.0 + aRnd.w * 2.0 * PI) * 0.5 + 0.5;
        float breathe = mix(1.0, mix(0.45, 1.15, pulse), uMotion);
        // In the intro, points near the camera grow into large embers.
        float depth = mix(1.0, clamp(50.0 / -view.z, 0.3, 7.0), uDepth);
        // A band of light crossing the name, lifting size and colour.
        vSweep = uSweepOn * exp(-pow((world.x - uSweep) / 3.0, 2.0));
        // Mostly fine points with a few large ones, which carry the glow;
        // smaller on the name, where large ones blur the letter strokes.
        float size = uSize * mix(0.45, 1.9, aRnd.x * aRnd.x * aRnd.x) * breathe * depth
            * mix(1.0, 0.5, uFocus) * (1.0 + vSweep);
        gl_PointSize = size * uPixelRatio;

        // Lit near the cursor, dim beyond it; the intro stays lit throughout.
        vIntensity = max(smoothstep(uHighlightRadius, 0.0, distance(world.xy, uMouse)), uLit);
        vAlpha = mix(mix(0.5, 0.75, uFocus), 1.0, aRnd.z);
    }
`;

const fragmentShader = /* glsl */ `
    uniform vec3 uColor;
    uniform vec3 uColorDim;

    varying float vAlpha;
    varying float vIntensity;
    varying float vSweep;

    uniform float uOpacity;

    void main() {
        float r = length(gl_PointCoord - 0.5);
        if (r > 0.5) discard;
        float soft = smoothstep(0.5, 0.38, r);
        vec3 color = mix(uColorDim, uColor, vIntensity);
        // The sweep runs the accent up to white, tinted by the accent.
        color = mix(color, mix(vec3(1.0), uColor, 0.2), vSweep * 0.85);
        gl_FragColor = vec4(color, vAlpha * soft * mix(0.55, 1.0, vIntensity) * uOpacity);
        // THREE.Color stores the palette in linear space; without converting
        // back the amber accent renders as a darker red-orange.
        #include <colorspace_fragment>
    }
`;

const FOV = 35;
const CAMERA_Z = 50;
// Above 1.5× the extra pixels cost fill rate without making points sharper.
const MAX_PIXEL_RATIO = 1.5;

/** Visible size, in world units, of the plane at z = 0 for a given aspect. */
function viewportAt(aspect) {
    const height = 2 * Math.tan(MathUtils.degToRad(FOV / 2)) * CAMERA_Z;
    return { width: height * aspect, height };
}

/**
 * Builds the particle field inside `host` with three.js directly: a single
 * points object needs no scene graph library, and a plain render loop keeps
 * per-frame work to what the field actually does. Returns controls for the
 * React wrapper below.
 */
function createField(host, { count, pointSize, color, reduceMotion, namePoints: initialNamePoints }) {
    const renderer = new WebGLRenderer({ antialias: false, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    const canvas = renderer.domElement;
    canvas.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none';
    host.appendChild(canvas);

    const scene = new Scene();
    const camera = new PerspectiveCamera(FOV, 1, 0.1, 1000);
    camera.position.set(0, 0, CAMERA_Z);

    const hot = new Color(color);
    // Dim colour: the accent pulled most of the way to a neutral grey, so the
    // field away from the cursor stays visible without competing. Neutral,
    // not warm, so it sits under any palette without turning muddy.
    const dim = hot.clone().lerp(new Color('#58585c'), 0.6);
    const material = new ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        uniforms: {
            uTo: { value: 0 },
            uTransition: { value: 1 },
            uScatter: { value: 0 },
            uArcZ: { value: 0 },
            uTime: { value: 0 },
            uSize: { value: pointSize },
            uPixelRatio: { value: renderer.getPixelRatio() },
            uMotion: { value: reduceMotion ? 0 : 1 },
            uFocus: { value: 0 },
            uLit: { value: 1 },
            uDepth: { value: 1 },
            uCharge: { value: 0 },
            uOpacity: { value: 1 },
            uSweep: { value: 0 },
            uSweepOn: { value: 0 },
            uPointer: { value: new Vector2() },
            uMouse: { value: new Vector2() },
            uParallax: { value: reduceMotion ? 0 : 0.06 },
            uHighlightRadius: { value: 1 },
            uColor: { value: hot },
            uColorDim: { value: dim },
        },
    });
    const u = material.uniforms;

    const points = new Points(new BufferGeometry(), material);
    points.frustumCulled = false;
    scene.add(points);

    // ── State ──────────────────────────────────────────────────────────
    // `view` is the viewport the formations were built for; it only follows
    // real resizes (see resize()), not the mobile address bar.
    let view = { width: 1, height: 1 };
    let namePoints = initialNamePoints;
    // The running transition: target formation, timing, how it travels, and
    // the eased progress last drawn (needed to capture positions on a retarget).
    const tr = { to: 0, start: 0, duration: 0, eased: 1, motion: SECTION_MOTION };
    const pointer = new Vector2();
    const mouse = new Vector2();
    let sway = 0, focus = 0, lit = 1, depth = 1;
    let boundaries = [];

    // ── Geometry ───────────────────────────────────────────────────────
    function rebuildGeometry() {
        const geo = new BufferGeometry();
        FORMATIONS.forEach((build, i) => {
            const positions = build(count, view.width, view.height, mulberry32(i + 1), namePoints);
            geo.setAttribute(`p${i}`, new BufferAttribute(positions, 3));
        });
        // A rebuilt geometry starts settled on the current formation.
        const start = new BufferAttribute(geo.getAttribute(`p${tr.to}`).array.slice(), 3);
        start.setUsage(DynamicDrawUsage);
        geo.setAttribute('aStart', start);
        // three needs a `position` attribute for bounds; the shader never reads it.
        geo.setAttribute('position', geo.getAttribute('p0'));

        const rnd = mulberry32(99);
        const extra = new Float32Array(count * 4);
        for (let i = 0; i < extra.length; i++) extra[i] = rnd();
        geo.setAttribute('aRnd', new BufferAttribute(extra, 4));

        points.geometry.dispose();
        points.geometry = geo;
        tr.eased = 1;
        tr.duration = 0;
    }

    // ── Sizing ─────────────────────────────────────────────────────────
    function resize() {
        const w = host.clientWidth || window.innerWidth;
        const h = host.clientHeight || window.innerHeight;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
        renderer.setSize(w, h, false);
        u.uPixelRatio.value = renderer.getPixelRatio();
        camera.aspect = w / h;
        camera.updateProjectionMatrix();

        // Mobile browsers resize the viewport as the address bar shows and
        // hides mid-scroll; rebuilding every formation on each of those
        // would stutter, so small height changes are ignored.
        const next = viewportAt(w / h);
        const widthChanged = Math.abs(next.width - view.width) > 0.01;
        const heightChanged = Math.abs(next.height - view.height) / view.height > 0.15;
        if (widthChanged || heightChanged) {
            view = next;
            rebuildGeometry();
        }
    }

    // Document-space tops of every section after the first. Content height
    // shifts with image loads and language switches, hence the observer.
    function measureSections() {
        boundaries = SECTION_IDS.slice(1)
            .map((id) => document.getElementById(id))
            .filter(Boolean)
            .map((el) => el.getBoundingClientRect().top + window.scrollY);
    }

    const onPointerMove = (e) => {
        pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    };

    // ── Frame ──────────────────────────────────────────────────────────
    function update(now, delta) {
        const { width, height } = view;

        // Which formation should be on screen, and how fast.
        let desired;
        let duration;
        if (fieldState.introActive) {
            desired = fieldState.introTarget;
            duration = fieldState.introDuration;
        } else {
            // The section whose area holds a line 60% down the viewport.
            const line = window.scrollY + window.innerHeight * 0.6;
            desired = SITE_OFFSET;
            for (const top of boundaries) if (top <= line) desired++;
            duration = SECTION_TRANSITION;
        }
        if (reduceMotion) duration = 0;

        if (desired !== tr.to) {
            // Capture where every point is right now, with the same offsets
            // the shader applies, as the new start: a change mid-flight then
            // carries on without a jump.
            const geo = points.geometry;
            const start = geo.getAttribute('aStart');
            const s = start.array;
            const to = geo.getAttribute(`p${tr.to}`).array;
            const rnd = geo.getAttribute('aRnd').array;
            const e = tr.eased;
            const arc = Math.sin(e * Math.PI);
            const scatter = tr.motion.scatter * width * arc;
            const lift = tr.motion.arcZ * arc;
            for (let i = 0; i < count; i++) {
                const k = i * 3;
                s[k] += (to[k] - s[k]) * e + (rnd[i * 4 + 1] - 0.5) * scatter;
                s[k + 1] += (to[k + 1] - s[k + 1]) * e + (rnd[i * 4 + 3] - 0.5) * scatter;
                s[k + 2] += (to[k + 2] - s[k + 2]) * e + rnd[i * 4] * lift;
            }
            start.needsUpdate = true;
            const motion = fieldState.introActive ? { ...SECTION_MOTION, ...fieldState.introMotion } : SECTION_MOTION;
            Object.assign(tr, { to: desired, start: now, duration, motion });
        }

        const raw = tr.duration > 0 ? MathUtils.clamp((now - tr.start) / tr.duration, 0, 1) : 1;
        tr.eased = (EASINGS[tr.motion.ease] ?? EASINGS.inOutCubic)(raw);

        u.uTo.value = tr.to;
        u.uTransition.value = tr.eased;
        u.uScatter.value = tr.motion.scatter * width;
        u.uArcZ.value = tr.motion.arcZ;
        u.uTime.value = now;
        u.uHighlightRadius.value = Math.min(width, height) * 0.65;

        // The cursor, eased, drives both the highlight and the parallax.
        mouse.x = MathUtils.damp(mouse.x, pointer.x, 4, delta);
        mouse.y = MathUtils.damp(mouse.y, pointer.y, 4, delta);
        u.uPointer.value.copy(mouse);
        u.uMouse.value.set((mouse.x * width) / 2, (mouse.y * height) / 2);

        // Intro-only looks: fully lit, depth-scaled points, a tighter name.
        const inIntro = tr.to < SITE_OFFSET;
        focus = MathUtils.damp(focus, tr.to === NAME_FORMATION ? 1 : 0, 3, delta);
        // Dust is faint; points heat up as they gather and stay lit until the grid.
        const litTarget = tr.to === DUST_FORMATION ? 0.3 : inIntro ? 1 : 0;
        lit = MathUtils.damp(lit, litTarget, 2.5, delta);
        depth = MathUtils.damp(depth, inIntro ? 1 : 0, 2, delta);
        u.uFocus.value = focus;
        u.uLit.value = lit;
        u.uDepth.value = depth;
        u.uCharge.value = fieldState.charge;
        u.uOpacity.value = fieldState.opacity;

        // The light sweep: 0 → 1 carries it from off the left edge to off the right.
        const sweep = fieldState.sweep;
        u.uSweepOn.value = sweep > 0 && sweep < 1 ? 1 : 0;
        u.uSweep.value = (sweep * 1.3 - 0.65) * width;

        // Gentle sway for the shapes with depth; the flat ones stay square.
        const swayTarget = !reduceMotion && DEPTH_FORMATIONS.has(tr.to) ? 1 : 0;
        sway = MathUtils.damp(sway, swayTarget, 2, delta);
        points.rotation.y = sway * Math.sin(now * 0.15) * 0.3;
        points.rotation.x = sway * Math.sin(now * 0.11) * 0.12;

        // Impact shake, decayed by the intro.
        const shake = fieldState.shake * 0.5;
        points.position.set((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, 0);
    }

    let rafId = 0;
    let t0 = -1;
    let last = 0;
    function frame(ms) {
        rafId = requestAnimationFrame(frame);
        if (t0 < 0) t0 = last = ms;
        // Capped so a return from a background tab eases in rather than jumps.
        const delta = Math.min((ms - last) / 1000, 0.1);
        last = ms;
        update((ms - t0) / 1000, delta);
        renderer.render(scene, camera);
    }

    // ── Start ──────────────────────────────────────────────────────────
    resize();
    measureSections();
    const hostObserver = new ResizeObserver(resize);
    hostObserver.observe(host);
    const contentObserver = new ResizeObserver(measureSections);
    contentObserver.observe(document.body);
    window.addEventListener('resize', measureSections);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    rafId = requestAnimationFrame(frame);

    return {
        setNamePoints(next) {
            namePoints = next;
            rebuildGeometry();
        },
        dispose() {
            cancelAnimationFrame(rafId);
            hostObserver.disconnect();
            contentObserver.disconnect();
            window.removeEventListener('resize', measureSections);
            window.removeEventListener('pointermove', onPointerMove);
            points.geometry.dispose();
            material.dispose();
            renderer.dispose();
            renderer.forceContextLoss();
            canvas.remove();
        },
    };
}

/** React wrapper: owns the host element and the field's lifetime. */
export default function ScrollField({
    count = 4000,
    pointSize = 4,
    color = DEFAULT_PALETTE.accent,
}) {
    const hostRef = useRef(null);

    useEffect(() => {
        const field = createField(hostRef.current, {
            count,
            pointSize,
            color,
            reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            namePoints: getNamePoints(),
        });
        // The intro publishes the sampled name once its font is ready.
        const unsubscribe = subscribeNamePoints(() => field.setNamePoints(getNamePoints()));
        return () => {
            unsubscribe();
            field.dispose();
        };
    }, [count, pointSize, color]);

    return <div ref={hostRef} style={{ width: '100%', height: '100%' }} />;
}
