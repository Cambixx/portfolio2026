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

function grid(n, W, H, rnd) {
    const out = new Float32Array(n * 3);
    const w = W * 1.08, h = H * 1.08;
    const rows = Math.max(1, Math.round(Math.sqrt(n / (w / h))));
    const cols = Math.ceil(n / rows);
    for (let i = 0; i < n; i++) {
        const c = i % cols, r = Math.floor(i / cols);
        out[i * 3] = -w / 2 + ((c + 0.5) / cols) * w;
        out[i * 3 + 1] = h / 2 - ((r + 0.5) / rows) * h;
        out[i * 3 + 2] = (rnd() - 0.5) * 0.6;
    }
    return out;
}

function sphere(n, W, H, rnd) {
    const out = new Float32Array(n * 3);
    const R = Math.min(W, H) * 0.36;
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
        const y = 1 - ((i + 0.5) / n) * 2;
        const r = Math.sqrt(1 - y * y);
        const phi = i * golden;
        const k = R * (1 + (rnd() - 0.5) * 0.04);
        out[i * 3] = Math.cos(phi) * r * k;
        out[i * 3 + 1] = y * k;
        out[i * 3 + 2] = Math.sin(phi) * r * k;
    }
    return out;
}

function rings(n, W, H, rnd) {
    const out = new Float32Array(n * 3);
    const R = Math.min(W, H);
    const L = Math.min(W * 0.55, R * 1.2);
    const rad = R * 0.22;
    // Ring count follows the space available: 16 rings on a narrow phone
    // overlap four deep and read as a cloud. This keeps desktop at 16 and
    // gives every width the same spacing relative to the ring size.
    const K = MathUtils.clamp(Math.round(L / (rad * 0.28)) + 1, 6, 16);
    const perRing = Math.ceil(n / K);
    for (let i = 0; i < n; i++) {
        const k = i % K, j = Math.floor(i / K);
        const theta = (j / perRing) * Math.PI * 2;
        const r = rad * (1 + (rnd() - 0.5) * 0.04);
        out[i * 3] = -L / 2 + (k / (K - 1)) * L;
        out[i * 3 + 1] = Math.cos(theta) * r;
        out[i * 3 + 2] = Math.sin(theta) * r;
    }
    return rotate(out, 0.12, 0.35);
}

function helix(n, W, H, rnd) {
    const out = new Float32Array(n * 3);
    const R = Math.min(W, H);
    const L = Math.min(W * 0.62, R * 1.35);
    const rad = R * 0.17;
    const turns = 2.5;
    const half = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
        const s = Math.floor(i / 2) / half;
        const base = s * turns * Math.PI * 2;
        const x = -L / 2 + s * L;
        let y, z;
        if (rnd() < 0.18) {
            // Rung between the two strands at the same point along the axis.
            const u = rnd();
            const ya = Math.cos(base) * rad, za = Math.sin(base) * rad;
            y = ya + (-ya - ya) * u;
            z = za + (-za - za) * u;
        } else {
            const a = base + (i % 2) * Math.PI;
            y = Math.cos(a) * rad;
            z = Math.sin(a) * rad;
        }
        out[i * 3] = x;
        out[i * 3 + 1] = y + (rnd() - 0.5) * 0.4;
        out[i * 3 + 2] = z + (rnd() - 0.5) * 0.4;
    }
    return rotate(out, 0.2, 0.15);
}

function cube(n, W, H, rnd) {
    const out = new Float32Array(n * 3);
    const S = Math.min(W, H) * 0.44;
    const corners = [];
    for (const x of [-0.5, 0.5]) for (const y of [-0.5, 0.5]) for (const z of [-0.5, 0.5]) corners.push([x, y, z]);
    // The 12 edges join corners that differ on exactly one axis.
    const edges = [];
    for (let a = 0; a < 8; a++) {
        for (let b = a + 1; b < 8; b++) {
            const diff = corners[a].reduce((d, v, k) => d + (v !== corners[b][k]), 0);
            if (diff === 1) edges.push([corners[a], corners[b]]);
        }
    }
    for (let i = 0; i < n; i++) {
        const [a, b] = edges[i % 12];
        // Every third pass along the edges goes to a half-size inner cube.
        const scale = Math.floor(i / 12) % 3 === 0 ? 0.5 : 1;
        const u = rnd();
        for (let k = 0; k < 3; k++) {
            out[i * 3 + k] = (a[k] + (b[k] - a[k]) * u) * S * scale + (rnd() - 0.5) * 0.25;
        }
    }
    return rotate(out, 0.6, 0.75);
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

const FORMATIONS = [dust, core, burst, name, grid, sphere, rings, helix, cube, wave];
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
