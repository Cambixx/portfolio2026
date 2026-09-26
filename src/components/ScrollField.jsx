import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import * as THREE from 'three';
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
 * The first two formations belong to the intro (a scattered cloud, then the
 * name); the intro picks them and hands over at the hero grid, from where
 * the section on screen decides.
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
    const K = THREE.MathUtils.clamp(Math.round(L / (rad * 0.28)) + 1, 6, 16);
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

const FORMATIONS = [cloud, name, grid, sphere, rings, helix, cube, wave];
// Formation shown at the top of the page, where the intro hands over.
const SITE_OFFSET = 2;
// Formations with real depth; they sway gently, the flat ones stay square.
const DEPTH_FORMATIONS = new Set([3, 4, 5, 6]);
const NAME_FORMATION = 1;
// Seconds a section change takes.
const SECTION_TRANSITION = 1.4;

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

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
    attribute vec4 aRnd; // x size, y arc offset x, z alpha, w arc offset y + phase

    uniform float uTo;
    uniform float uTransition; // eased 0 → 1
    uniform float uScatter;
    uniform float uTime;
    uniform float uSize;
    uniform float uPixelRatio;
    uniform float uMotion;
    uniform float uFocus;
    uniform vec2 uPointer;      // -1 … 1
    uniform vec2 uMouse;        // pointer in world units at z = 0
    uniform float uParallax;
    uniform float uHighlightRadius;

    varying float vAlpha;
    varying float vIntensity;

    const float PI = 3.141592653589793;

    vec3 pick(float i) {
        if (i < 0.5) return p0;
        if (i < 1.5) return p1;
        if (i < 2.5) return p2;
        if (i < 3.5) return p3;
        if (i < 4.5) return p4;
        if (i < 5.5) return p5;
        if (i < 6.5) return p6;
        return p7;
    }

    void main() {
        vec3 pos = mix(aStart, pick(uTo), uTransition);

        // Travel as one body: each point bows out by its own offset mid-flight
        // and lands back on the shape, so the field swells and re-gathers.
        pos.xy += (vec2(aRnd.y, aRnd.w) - 0.5) * uScatter * sin(uTransition * PI);

        // Depth parallax: nearer points follow the cursor further.
        pos.xy += uPointer * pos.z * uParallax;

        vec4 world = modelMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * viewMatrix * world;

        // At rest the points breathe in size, each on its own phase.
        float pulse = sin(uTime * 2.0 + aRnd.w * 2.0 * PI) * 0.5 + 0.5;
        float breathe = mix(1.0, mix(0.45, 1.15, pulse), uMotion);
        // Smaller points on the name: large ones blur the letter strokes.
        // Mostly fine points with a few large ones, which carry the glow.
        float size = uSize * mix(0.45, 1.9, aRnd.x * aRnd.x * aRnd.x) * breathe * mix(1.0, 0.5, uFocus);
        gl_PointSize = size * uPixelRatio;

        // Lit near the cursor, dim beyond it; the whole name stays lit.
        vIntensity = max(smoothstep(uHighlightRadius, 0.0, distance(world.xy, uMouse)), uFocus);
        vAlpha = mix(mix(0.5, 0.75, uFocus), 1.0, aRnd.z);
    }
`;

const fragmentShader = /* glsl */ `
    uniform vec3 uColor;
    uniform vec3 uColorDim;

    varying float vAlpha;
    varying float vIntensity;

    void main() {
        float r = length(gl_PointCoord - 0.5);
        if (r > 0.5) discard;
        float soft = smoothstep(0.5, 0.38, r);
        vec3 color = mix(uColorDim, uColor, vIntensity);
        gl_FragColor = vec4(color, vAlpha * soft * mix(0.55, 1.0, vIntensity));
        // THREE.Color stores the palette in linear space; without converting
        // back the amber accent renders as a darker red-orange.
        #include <colorspace_fragment>
    }
`;

/**
 * Viewport in world units, ignoring small height changes. Mobile browsers
 * resize the viewport as the address bar shows and hides mid-scroll; rebuilding
 * every formation on each of those would stutter.
 */
function useStableViewport() {
    const viewport = useThree((s) => s.viewport);
    const [stable, setStable] = useState({ width: viewport.width, height: viewport.height });

    // Adjusted during render rather than in an effect, so a real resize
    // re-renders once instead of painting a stale frame first.
    const widthChanged = Math.abs(viewport.width - stable.width) > 0.01;
    const heightChanged = Math.abs(viewport.height - stable.height) / stable.height > 0.15;
    if (widthChanged || heightChanged) setStable({ width: viewport.width, height: viewport.height });

    return stable;
}

/** Document-space tops of every section after the first, kept current. */
function useSectionBoundaries() {
    const boundaries = useRef([]);

    useEffect(() => {
        const measure = () => {
            boundaries.current = SECTION_IDS.slice(1)
                .map((id) => document.getElementById(id))
                .filter(Boolean)
                .map((el) => el.getBoundingClientRect().top + window.scrollY);
        };
        measure();
        // Content height shifts with image loads and language switches.
        const ro = new ResizeObserver(measure);
        ro.observe(document.body);
        window.addEventListener('resize', measure);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, []);

    return boundaries;
}

function Field({ count, pointSize, color, reduceMotion }) {
    const pointsRef = useRef(null);
    const materialRef = useRef(null);
    // The running transition: target formation, start time, length, and the
    // eased progress last drawn (needed to capture positions on a retarget).
    const transition = useRef({ geometry: null, to: 0, start: 0, duration: 0, eased: 1 });
    const mouse = useRef(new THREE.Vector2());
    const sway = useRef(0);
    const focus = useRef(0);
    const { width, height } = useStableViewport();
    const boundaries = useSectionBoundaries();
    const gl = useThree((s) => s.gl);
    const namePoints = useSyncExternalStore(subscribeNamePoints, getNamePoints);

    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        FORMATIONS.forEach((build, i) => {
            const positions = build(count, width, height, mulberry32(i + 1), namePoints);
            geo.setAttribute(`p${i}`, new THREE.BufferAttribute(positions, 3));
        });
        const start = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
        start.setUsage(THREE.DynamicDrawUsage);
        geo.setAttribute('aStart', start);
        // three needs a `position` attribute for bounds; the shader never reads it.
        geo.setAttribute('position', geo.getAttribute('p0'));

        const rnd = mulberry32(99);
        const extra = new Float32Array(count * 4);
        for (let i = 0; i < extra.length; i++) extra[i] = rnd();
        geo.setAttribute('aRnd', new THREE.BufferAttribute(extra, 4));
        return geo;
    }, [count, width, height, namePoints]);

    useEffect(() => () => geometry.dispose(), [geometry]);

    const uniforms = useMemo(() => {
        const hot = new THREE.Color(color);
        // Dim colour: the accent pulled most of the way to a warm grey, so the
        // field away from the cursor stays visible without competing.
        const dim = hot.clone().lerp(new THREE.Color('#5c574a'), 0.6);
        return {
            uTo: { value: 0 },
            uTransition: { value: 1 },
            uScatter: { value: 0 },
            uTime: { value: 0 },
            uSize: { value: pointSize },
            uPixelRatio: { value: gl.getPixelRatio() },
            uMotion: { value: reduceMotion ? 0 : 1 },
            uFocus: { value: 0 },
            uPointer: { value: new THREE.Vector2() },
            uMouse: { value: new THREE.Vector2() },
            uParallax: { value: reduceMotion ? 0 : 0.06 },
            uHighlightRadius: { value: 1 },
            uColor: { value: hot },
            uColorDim: { value: dim },
        };
    }, [color, pointSize, reduceMotion, gl]);

    useFrame((state, delta) => {
        const points = pointsRef.current;
        const material = materialRef.current;
        if (!points || !material) return;
        const now = state.clock.elapsedTime;
        const tr = transition.current;
        const start = geometry.getAttribute('aStart');
        const scatter = width * 0.2;

        // A rebuilt geometry starts settled on the current formation.
        if (tr.geometry !== geometry) {
            start.array.set(geometry.getAttribute(`p${tr.to}`).array);
            start.needsUpdate = true;
            Object.assign(tr, { geometry, eased: 1, duration: 0 });
        }

        // Which formation should be on screen, and how fast to get there.
        let desired;
        let duration;
        if (fieldState.introActive) {
            desired = fieldState.introTarget;
            duration = fieldState.introDuration;
        } else {
            // The section whose area holds a line 60% down the viewport.
            const line = window.scrollY + window.innerHeight * 0.6;
            desired = SITE_OFFSET + boundaries.current.filter((top) => top <= line).length;
            duration = SECTION_TRANSITION;
        }
        if (reduceMotion) duration = 0;

        if (desired !== tr.to) {
            // Capture where every point is right now (arc included) as the new
            // start, so a change mid-flight carries on without a jump.
            const s = start.array;
            const to = geometry.getAttribute(`p${tr.to}`).array;
            const rnd = geometry.getAttribute('aRnd').array;
            const arc = Math.sin(tr.eased * Math.PI) * scatter;
            for (let i = 0; i < count; i++) {
                const k = i * 3;
                s[k] += (to[k] - s[k]) * tr.eased + (rnd[i * 4 + 1] - 0.5) * arc;
                s[k + 1] += (to[k + 1] - s[k + 1]) * tr.eased + (rnd[i * 4 + 3] - 0.5) * arc;
                s[k + 2] += (to[k + 2] - s[k + 2]) * tr.eased;
            }
            start.needsUpdate = true;
            Object.assign(tr, { to: desired, start: now, duration });
        }

        const raw = tr.duration > 0 ? THREE.MathUtils.clamp((now - tr.start) / tr.duration, 0, 1) : 1;
        tr.eased = easeInOutCubic(raw);

        const u = material.uniforms;
        u.uTo.value = tr.to;
        u.uTransition.value = tr.eased;
        u.uScatter.value = scatter;
        u.uTime.value = now;
        u.uHighlightRadius.value = Math.min(width, height) * 0.65;

        // The cursor, eased, drives both the highlight and the parallax.
        mouse.current.x = THREE.MathUtils.damp(mouse.current.x, state.pointer.x, 4, delta);
        mouse.current.y = THREE.MathUtils.damp(mouse.current.y, state.pointer.y, 4, delta);
        u.uPointer.value.copy(mouse.current);
        u.uMouse.value.set((mouse.current.x * width) / 2, (mouse.current.y * height) / 2);

        focus.current = THREE.MathUtils.damp(focus.current, tr.to === NAME_FORMATION ? 1 : 0, 3, delta);
        u.uFocus.value = focus.current;

        // Gentle sway for the shapes with depth; the flat ones stay square.
        const swayTarget = !reduceMotion && DEPTH_FORMATIONS.has(tr.to) ? 1 : 0;
        sway.current = THREE.MathUtils.damp(sway.current, swayTarget, 2, delta);
        points.rotation.y = sway.current * Math.sin(now * 0.15) * 0.3;
        points.rotation.x = sway.current * Math.sin(now * 0.11) * 0.12;
    });

    return (
        <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                transparent
                depthWrite={false}
            />
        </points>
    );
}

export default function ScrollField({
    count = 4000,
    pointSize = 4,
    color = DEFAULT_PALETTE.accent,
}) {
    const reduceMotion = useMemo(
        () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        []
    );

    return (
        <Canvas
            dpr={[1, 1.5]}
            camera={{ position: [0, 0, 50], fov: 35 }}
            gl={{ antialias: false, alpha: true }}
            style={{ pointerEvents: 'none' }}
            eventSource={typeof document !== 'undefined' ? document.getElementById('root') : undefined}
            eventPrefix="client"
        >
            <Field count={count} pointSize={pointSize} color={color} reduceMotion={reduceMotion} />
        </Canvas>
    );
}
