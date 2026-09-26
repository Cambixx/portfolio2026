import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { DEFAULT_PALETTE } from '../config/palette';

/**
 * Fixed particle field that re-forms into a different shape for each section
 * as the page scrolls. Every point carries one target position per formation;
 * the shader blends between the two formations either side of the current
 * scroll stage, so the CPU only updates a handful of uniforms per frame.
 */

// Sections in page order; formation N is shown while section N is on screen.
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

const FORMATIONS = [grid, sphere, rings, helix, cube, wave];

const vertexShader = /* glsl */ `
    attribute vec3 p0;
    attribute vec3 p1;
    attribute vec3 p2;
    attribute vec3 p3;
    attribute vec3 p4;
    attribute vec3 p5;
    attribute vec4 aRnd; // x size, y delay, z alpha, w phase

    uniform float uStage;
    uniform float uTime;
    uniform float uSize;
    uniform float uPixelRatio;
    uniform float uMotion;

    varying float vAlpha;
    varying float vEdge;

    vec3 pick(float i) {
        if (i < 0.5) return p0;
        if (i < 1.5) return p1;
        if (i < 2.5) return p2;
        if (i < 3.5) return p3;
        if (i < 4.5) return p4;
        return p5;
    }

    void main() {
        float i = floor(uStage);
        float f = uStage - i;

        // Each point leaves on its own delay so the shape dissolves and
        // re-forms instead of sliding across as one rigid block.
        float delay = aRnd.y * 0.45;
        float t = clamp((f - delay) / 0.55, 0.0, 1.0);
        t = t * t * (3.0 - 2.0 * t);

        vec3 pos = mix(pick(i), pick(min(i + 1.0, 5.0)), t);

        // Lift off the path mid-flight, so the transition reads as scatter.
        vec3 dir = vec3(sin(aRnd.w * 6.283), cos(aRnd.w * 5.1), sin(aRnd.w * 3.7));
        pos += dir * sin(t * 3.14159) * 1.6;

        // Idle drift keeps a settled formation alive.
        pos += uMotion * 0.12 * vec3(
            sin(uTime * 0.6 + aRnd.w * 10.0),
            cos(uTime * 0.5 + aRnd.w * 8.0),
            sin(uTime * 0.4 + aRnd.w * 6.0)
        );

        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;

        float size = uSize * mix(0.35, 1.6, aRnd.x * aRnd.x);
        gl_PointSize = size * uPixelRatio * (50.0 / -mv.z);

        // 0 at screen centre, 1 at the edges: drives the hot-to-dim falloff.
        vEdge = smoothstep(0.15, 1.05, length(gl_Position.xy / gl_Position.w));
        vAlpha = mix(0.35, 1.0, aRnd.z);
    }
`;

const fragmentShader = /* glsl */ `
    uniform vec3 uColor;
    uniform vec3 uColorDim;

    varying float vAlpha;
    varying float vEdge;

    void main() {
        float r = length(gl_PointCoord - 0.5);
        if (r > 0.5) discard;
        float soft = smoothstep(0.5, 0.38, r);
        vec3 color = mix(uColor, uColorDim, vEdge);
        gl_FragColor = vec4(color, vAlpha * soft * mix(1.0, 0.55, vEdge));
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
    const stage = useRef(0);
    const { width, height } = useStableViewport();
    const boundaries = useSectionBoundaries();
    const gl = useThree((s) => s.gl);

    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        FORMATIONS.forEach((build, i) => {
            geo.setAttribute(`p${i}`, new THREE.BufferAttribute(build(count, width, height, mulberry32(i + 1)), 3));
        });
        // three needs a `position` attribute for bounds; the shader never reads it.
        geo.setAttribute('position', geo.getAttribute('p0'));

        const rnd = mulberry32(99);
        const extra = new Float32Array(count * 4);
        for (let i = 0; i < extra.length; i++) extra[i] = rnd();
        geo.setAttribute('aRnd', new THREE.BufferAttribute(extra, 4));
        return geo;
    }, [count, width, height]);

    useEffect(() => () => geometry.dispose(), [geometry]);

    const uniforms = useMemo(() => {
        const hot = new THREE.Color(color);
        // Edge colour: the accent pulled most of the way to a warm grey, so the
        // outer field stays visible without competing with the centre.
        const dim = hot.clone().lerp(new THREE.Color('#5c574a'), 0.72);
        return {
            uStage: { value: 0 },
            uTime: { value: 0 },
            uSize: { value: pointSize },
            uPixelRatio: { value: gl.getPixelRatio() },
            uMotion: { value: reduceMotion ? 0 : 1 },
            uColor: { value: hot },
            uColorDim: { value: dim },
        };
    }, [color, pointSize, reduceMotion, gl]);

    useFrame((state, delta) => {
        const vh = window.innerHeight;
        const centre = window.scrollY + vh * 0.5;

        // Each boundary contributes one full stage, ramped over 0.8 of a
        // viewport: it starts as the next section's top enters the bottom of
        // the screen and completes once that top is near the top of it.
        let target = 0;
        for (const top of boundaries.current) {
            target += THREE.MathUtils.clamp((centre - (top - vh * 0.5)) / (vh * 0.8), 0, 1);
        }
        target = Math.min(target, FORMATIONS.length - 1);

        stage.current = THREE.MathUtils.damp(stage.current, target, 5, delta);

        const points = pointsRef.current;
        const material = materialRef.current;
        if (!points || !material) return;
        material.uniforms.uStage.value = stage.current;
        material.uniforms.uTime.value = state.clock.elapsedTime;

        // Gentle sway for the 3D shapes; the flat grid and wave stay square
        // to the screen at either end of the page.
        const s = stage.current;
        const sway = reduceMotion ? 0 : Math.min(s, 1) * Math.min(FORMATIONS.length - 1 - s, 1);
        const t = state.clock.elapsedTime;
        const ry = sway * Math.sin(t * 0.15) * 0.3 + state.pointer.x * 0.12;
        const rx = sway * Math.sin(t * 0.11) * 0.12 - state.pointer.y * 0.08;
        points.rotation.y = THREE.MathUtils.damp(points.rotation.y, ry, 3, delta);
        points.rotation.x = THREE.MathUtils.damp(points.rotation.x, rx, 3, delta);
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
    pointSize = 3.2,
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
