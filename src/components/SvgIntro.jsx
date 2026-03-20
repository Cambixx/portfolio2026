import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import './SvgIntro.css';

gsap.registerPlugin(useGSAP);

// ─── Constants ───────────────────────────────────────────────────────
const SCROLL_SPEED_MOUSE = 0.00032;
const SCROLL_SPEED_TOUCH = 0.00085;
const PARTICLE_COUNT = 80;
const PARTICLE_TRAIL_LENGTH = 8;

const colors = {
    primary: '#5227FF',
    red: '#FF3366',
    yellow: '#FFD500',
    cyan: '#00E5FF',
    green: '#00E676',
};
const palette = [colors.cyan, colors.yellow, colors.red, colors.green, colors.primary];

// ─── Particle class ──────────────────────────────────────────────────
class Particle {
    constructor(i, total, isMobile) {
        const angle = (i / total) * Math.PI * 2;
        const dist = 150 + Math.random() * 200;
        this.x = Math.cos(angle) * dist;
        this.y = Math.sin(angle) * dist;
        this.originX = this.x;
        this.originY = this.y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.radius = isMobile ? (1 + Math.random() * 1.5) : (1.5 + Math.random() * 2.5);
        this.color = palette[i % palette.length];
        this.orbitRadius = dist;
        this.orbitAngle = angle;
        this.orbitSpeed = 0.003 + Math.random() * 0.008;
        this.trail = [];
        this.alpha = 0;
        this.targetAlpha = 0;
        this.phase = Math.random() * Math.PI * 2;
        this.convergeFactor = 0;
        this.exploded = false;
        this.explodeVx = (Math.random() - 0.5) * 20;
        this.explodeVy = (Math.random() - 0.5) * 20;
    }
}

// ─── Main Component ──────────────────────────────────────────────────
export default function SvgIntro({ onComplete, initialProgress = 0 }) {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const textLayerRef = useRef(null);
    const hudRef = useRef(null);
    const lightingRef = useRef(null);
    const shockwaveRef = useRef(null);
    const letterRefs = useRef([]);
    const subtitleRef = useRef(null);
    const scanLineRef = useRef(null);
    const flashRef = useRef(null);
    const progressRef = useRef(initialProgress);
    const progressBarRef = useRef(null);
    const phaseTextRef = useRef(null);
    const counterRef = useRef(null);

    const [isMobile, setIsMobile] = useState(false);
    const isCompleted = useRef(false);
    const touchStartY = useRef(0);
    const mousePos = useRef({ x: 0, y: 0 });
    const particles = useRef([]);
    const rafId = useRef(null);
    const canvasSize = useRef({ w: 0, h: 0 });

    const NAME = 'CARLOS RÁBAGO';
    const letters = useMemo(() => NAME.split(''), []);

    // ─── Mobile detection ────────────────────────────────────────────
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // ─── Initialize particles ────────────────────────────────────────
    useEffect(() => {
        const count = isMobile ? Math.floor(PARTICLE_COUNT * 0.5) : PARTICLE_COUNT;
        particles.current = Array.from({ length: count }, (_, i) => new Particle(i, count, isMobile));
    }, [isMobile]);

    // ─── Canvas setup & resize ───────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            const w = window.innerWidth;
            const h = window.innerHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);
            canvasSize.current = { w, h };
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    // ─── Mouse tracking ──────────────────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            mousePos.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener('mousemove', handler);
        return () => window.removeEventListener('mousemove', handler);
    }, []);

    // ─── Scroll handlers ─────────────────────────────────────────────
    const advanceProgress = useCallback((delta) => {
        if (isCompleted.current) return;
        progressRef.current = Math.min(1, Math.max(0, progressRef.current + delta));
    }, []);

    const handleWheel = useCallback((e) => {
        advanceProgress(e.deltaY * SCROLL_SPEED_MOUSE);
    }, [advanceProgress]);

    const handleTouchStart = useCallback((e) => {
        touchStartY.current = e.touches[0].clientY;
    }, []);

    const handleTouchMove = useCallback((e) => {
        const currentY = e.touches[0].clientY;
        const deltaY = touchStartY.current - currentY;
        touchStartY.current = currentY;
        advanceProgress(deltaY * SCROLL_SPEED_TOUCH);
    }, [advanceProgress]);

    // ─── Phase labels ────────────────────────────────────────────────
    const getPhaseLabel = (p) => {
        if (p < 0.10) return '> INITIALIZING SEQUENCE...';
        if (p < 0.25) return '> DEPLOYING PARTICLES...';
        if (p < 0.45) return '> ESTABLISHING ORBIT...';
        if (p < 0.58) return '> CONVERGING FIELD...';
        if (p < 0.74) return '> IMPACT DETECTED!';
        if (p < 0.95) return '> IDENTITY REVEALED';
        return '> SEQUENCE COMPLETE';
    };

    // ─── Easing helpers ──────────────────────────────────────────────
    const smoothstep = (edge0, edge1, x) => {
        const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return t * t * (3 - 2 * t);
    };

    const elasticOut = (t) => {
        if (t === 0 || t === 1) return t;
        return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
    };

    // ─── Main animation loop (Canvas + DOM updates) ──────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let time = 0;

        const animate = () => {
            const p = progressRef.current;
            const { w, h } = canvasSize.current;
            const cx = w / 2;
            const cy = h / 2;
            time += 0.016;

            // ── Clear canvas ──
            ctx.clearRect(0, 0, w, h);

            // ── Update & Draw Particles ──
            const genesisAlpha = smoothstep(0.0, 0.12, p);
            const orbitFactor = smoothstep(0.12, 0.35, p);
            const converge = smoothstep(0.35, 0.55, p);
            const impactProg = smoothstep(0.55, 0.62, p);
            const explodeProg = smoothstep(0.58, 0.65, p);
            const fadeOutProg = smoothstep(0.62, 0.72, p);

            const mouseOffsetX = mousePos.current.x - cx;
            const mouseOffsetY = mousePos.current.y - cy;

            // ── Fusion energy buildup ──
            const fusionEnergy = smoothstep(0.38, 0.55, p);
            const preFusion = smoothstep(0.30, 0.45, p);

            particles.current.forEach((pt) => {
                // Phase: Genesis — fade in
                pt.targetAlpha = genesisAlpha * (1 - fadeOutProg);
                // During convergence, particles get BRIGHTER
                if (converge > 0 && !pt.exploded) {
                    pt.targetAlpha = Math.min(1, pt.targetAlpha * (1 + converge * 1.5));
                }
                pt.alpha += (pt.targetAlpha - pt.alpha) * 0.08;

                // Phase: Orbit + Convergence with acceleration
                if (orbitFactor > 0 && impactProg < 1) {
                    // Speed increases exponentially during convergence
                    const speedBoost = 1 + orbitFactor * 3 + converge * converge * 12;
                    pt.orbitAngle += pt.orbitSpeed * speedBoost;

                    // Shrink radius — accelerating pull toward center
                    const convergePow = converge * converge * converge; // cubic for dramatic acceleration
                    const shrink = 1 - convergePow * 0.95;
                    const targetX = Math.cos(pt.orbitAngle) * pt.orbitRadius * shrink;
                    const targetY = Math.sin(pt.orbitAngle) * pt.orbitRadius * shrink;

                    // Lerp speed increases as particles get closer (they snap in faster)
                    const lerpSpeed = 0.06 + converge * 0.12;
                    pt.x += (targetX - pt.x) * lerpSpeed;
                    pt.y += (targetY - pt.y) * lerpSpeed;
                }

                // Phase: Impact — explode outward
                if (impactProg > 0.5 && !pt.exploded) {
                    pt.exploded = true;
                    // Explosion force scales with how close particle was to center
                    const distFromCenter = Math.sqrt(pt.x * pt.x + pt.y * pt.y);
                    const explosionMult = Math.max(1, 3 - distFromCenter / 50);
                    pt.vx = pt.explodeVx * explosionMult;
                    pt.vy = pt.explodeVy * explosionMult;
                }
                if (pt.exploded) {
                    pt.x += pt.vx;
                    pt.y += pt.vy;
                    pt.vx *= 0.95;
                    pt.vy *= 0.95;
                }

                // Cursor magnetism (subtle pull)
                if (!pt.exploded && p > 0.05 && p < 0.6) {
                    const dx = mouseOffsetX - pt.x;
                    const dy = mouseOffsetY - pt.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 200) {
                        const force = (1 - dist / 200) * 0.5;
                        pt.x += dx * force * 0.02;
                        pt.y += dy * force * 0.02;
                    }
                }

                // Trail update — trails get LONGER during convergence for speed lines effect
                const maxTrail = PARTICLE_TRAIL_LENGTH + Math.floor(converge * 12);
                pt.trail.unshift({ x: pt.x, y: pt.y });
                while (pt.trail.length > maxTrail) pt.trail.pop();

                // Draw trail
                if (pt.alpha > 0.01) {
                    // During convergence, draw motion-streak trails instead of dots
                    if (converge > 0.3 && pt.trail.length > 2 && !pt.exploded) {
                        ctx.beginPath();
                        ctx.moveTo(cx + pt.trail[pt.trail.length - 1].x, cy + pt.trail[pt.trail.length - 1].y);
                        for (let t = pt.trail.length - 2; t >= 0; t--) {
                            ctx.lineTo(cx + pt.trail[t].x, cy + pt.trail[t].y);
                        }
                        ctx.strokeStyle = pt.color;
                        ctx.globalAlpha = pt.alpha * 0.4 * converge;
                        ctx.lineWidth = pt.radius * 0.8;
                        ctx.lineCap = 'round';
                        ctx.stroke();
                    } else {
                        // Normal dot trails
                        for (let t = pt.trail.length - 1; t >= 0; t--) {
                            const trailAlpha = (1 - t / pt.trail.length) * pt.alpha * 0.3;
                            const trailR = pt.radius * (1 - t / pt.trail.length) * 0.6;
                            ctx.beginPath();
                            ctx.arc(cx + pt.trail[t].x, cy + pt.trail[t].y, Math.max(0.5, trailR), 0, Math.PI * 2);
                            ctx.fillStyle = pt.color;
                            ctx.globalAlpha = trailAlpha;
                            ctx.fill();
                        }
                    }

                    // Draw main particle — grows slightly during fusion
                    const fusionScale = 1 + fusionEnergy * 0.6;
                    const pulse = (1 + Math.sin(time * 3 + pt.phase) * 0.15) * fusionScale;
                    ctx.beginPath();
                    ctx.arc(cx + pt.x, cy + pt.y, pt.radius * pulse, 0, Math.PI * 2);
                    ctx.fillStyle = pt.color;
                    ctx.globalAlpha = pt.alpha;
                    ctx.fill();

                    // Glow — intensifies during fusion
                    const glowMult = 3 + fusionEnergy * 4;
                    ctx.beginPath();
                    ctx.arc(cx + pt.x, cy + pt.y, pt.radius * pulse * glowMult, 0, Math.PI * 2);
                    const glow = ctx.createRadialGradient(
                        cx + pt.x, cy + pt.y, 0,
                        cx + pt.x, cy + pt.y, pt.radius * pulse * glowMult
                    );
                    glow.addColorStop(0, pt.color);
                    glow.addColorStop(1, 'transparent');
                    ctx.fillStyle = glow;
                    ctx.globalAlpha = pt.alpha * (0.15 + fusionEnergy * 0.35);
                    ctx.fill();
                }
            });

            ctx.globalAlpha = 1;

            // ── Energy arcs between nearby particles during convergence ──
            if (preFusion > 0.1 && impactProg < 0.8) {
                const arcAlpha = preFusion * (1 - impactProg) * 0.3;
                const pts = particles.current;
                for (let i = 0; i < pts.length; i++) {
                    if (pts[i].alpha < 0.05) continue;
                    for (let j = i + 1; j < pts.length; j++) {
                        if (pts[j].alpha < 0.05) continue;
                        const dx = pts[i].x - pts[j].x;
                        const dy = pts[i].y - pts[j].y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        // Connection threshold shrinks as fusion increases
                        const threshold = 120 - fusionEnergy * 70;
                        if (dist < threshold) {
                            const strength = (1 - dist / threshold);
                            ctx.beginPath();
                            ctx.moveTo(cx + pts[i].x, cy + pts[i].y);
                            // Curved arc with slight randomness for electrical feel
                            const midX = (pts[i].x + pts[j].x) / 2 + (Math.random() - 0.5) * 10 * fusionEnergy;
                            const midY = (pts[i].y + pts[j].y) / 2 + (Math.random() - 0.5) * 10 * fusionEnergy;
                            ctx.quadraticCurveTo(cx + midX, cy + midY, cx + pts[j].x, cy + pts[j].y);
                            ctx.strokeStyle = pts[i].color;
                            ctx.globalAlpha = arcAlpha * strength;
                            ctx.lineWidth = 0.5 + fusionEnergy;
                            ctx.stroke();
                        }
                    }
                }
                ctx.globalAlpha = 1;
            }

            // ── Fusion energy core at center ──
            if (fusionEnergy > 0.01 && impactProg < 0.9) {
                const coreRadius = 8 + fusionEnergy * 45;
                const corePulse = 1 + Math.sin(time * 8) * 0.15 * fusionEnergy;
                const coreAlpha = fusionEnergy * (1 - impactProg) * 0.8;

                // Inner white-hot core
                ctx.beginPath();
                ctx.arc(cx, cy, coreRadius * corePulse * 0.3, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = coreAlpha;
                ctx.fill();

                // Mid core with primary color
                const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius * corePulse);
                coreGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
                coreGrad.addColorStop(0.3, colors.primary);
                coreGrad.addColorStop(0.6, colors.cyan);
                coreGrad.addColorStop(1, 'transparent');
                ctx.beginPath();
                ctx.arc(cx, cy, coreRadius * corePulse, 0, Math.PI * 2);
                ctx.fillStyle = coreGrad;
                ctx.globalAlpha = coreAlpha * 0.7;
                ctx.fill();

                // Outer glow halo
                const haloGrad = ctx.createRadialGradient(cx, cy, coreRadius * 0.5, cx, cy, coreRadius * corePulse * 3);
                haloGrad.addColorStop(0, 'rgba(82,39,255,0.3)');
                haloGrad.addColorStop(0.5, 'rgba(0,229,255,0.1)');
                haloGrad.addColorStop(1, 'transparent');
                ctx.beginPath();
                ctx.arc(cx, cy, coreRadius * corePulse * 3, 0, Math.PI * 2);
                ctx.fillStyle = haloGrad;
                ctx.globalAlpha = coreAlpha * 0.5;
                ctx.fill();

                ctx.globalAlpha = 1;
            }

            // ── Orbit rings (faint) ──
            const ringAlpha = smoothstep(0.08, 0.25, p) * (1 - smoothstep(0.45, 0.55, p));
            if (ringAlpha > 0.01) {
                for (let r = 0; r < 4; r++) {
                    const radius = 60 + r * 80;
                    const rotation = time * (r % 2 === 0 ? 0.3 : -0.3);
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(rotation);
                    ctx.beginPath();
                    ctx.arc(0, 0, radius, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
                    ctx.globalAlpha = ringAlpha;
                    ctx.lineWidth = 1;
                    ctx.setLineDash([10 + r * 12, 20 + r * 15]);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.restore();
                }
            }

            // ── Shockwave rings ──
            if (impactProg > 0 && impactProg < 1) {
                for (let s = 0; s < 3; s++) {
                    const delay = s * 0.08;
                    const sp = Math.max(0, Math.min(1, (impactProg - delay) / (1 - delay)));
                    if (sp <= 0) continue;
                    const radius = sp * (250 + s * 80);
                    const alpha = (1 - sp) * 0.6;
                    ctx.beginPath();
                    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                    ctx.strokeStyle = s === 0 ? colors.primary : s === 1 ? colors.cyan : colors.yellow;
                    ctx.globalAlpha = alpha;
                    ctx.lineWidth = 3 - s;
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            }

            // ── DOM Updates (throttled to avoid layout thrash) ──
            // Lighting overlay
            if (lightingRef.current) {
                const lightIntensity = smoothstep(0.0, 0.15, p) * (1 - smoothstep(0.85, 1.0, p));
                const impactFlare = impactProg > 0 && impactProg < 1 ? (1 - impactProg) * 0.4 : 0;
                const totalIntensity = Math.min(1, lightIntensity * 0.3 + impactFlare);
                lightingRef.current.style.opacity = totalIntensity;
                lightingRef.current.style.background = `radial-gradient(ellipse 600px 400px at ${mousePos.current.x}px ${mousePos.current.y}px, rgba(82,39,255,${0.15 + impactFlare}), transparent 70%)`;
            }

            // Screen flash
            if (flashRef.current) {
                const flashIntensity = impactProg > 0.4 && impactProg < 0.7
                    ? Math.sin((impactProg - 0.4) / 0.3 * Math.PI) * 0.6 : 0;
                flashRef.current.style.opacity = flashIntensity;
            }

            // Camera shake
            if (containerRef.current) {
                if (impactProg > 0.3 && impactProg < 0.8) {
                    const shakeIntensity = (1 - Math.abs(impactProg - 0.55) / 0.25) * 6;
                    const sx = (Math.random() - 0.5) * shakeIntensity;
                    const sy = (Math.random() - 0.5) * shakeIntensity;
                    containerRef.current.style.transform = `translate(${sx}px, ${sy}px)`;
                } else {
                    containerRef.current.style.transform = 'translate(0,0)';
                }
            }

            // Text reveal (letters) — starts AFTER particles have fully faded
            const textRevealStart = 0.72;
            const textRevealEnd = 0.88;
            const exitStart = 0.94;
            const exitEnd = 1.0;

            letterRefs.current.forEach((el, i) => {
                if (!el) return;
                const delay = i * 0.006;
                const revealProg = smoothstep(textRevealStart + delay, textRevealStart + 0.08 + delay, p);
                const exitProg = smoothstep(exitStart, exitEnd, p);
                const visible = revealProg * (1 - exitProg);

                // 3D assembly: letters come from random 3D positions
                const fromY = (1 - revealProg) * (i % 2 === 0 ? -120 : 120);
                const fromRotateX = (1 - revealProg) * (30 - i * 4);
                const fromRotateY = (1 - revealProg) * ((i - 6) * 8);
                const fromZ = (1 - revealProg) * (-200 - i * 20);
                const exitScale = 1 + exitProg * 0.3;
                const exitBlur = exitProg * 15;

                // RGB split on entry
                const rgbSplit = revealProg > 0 && revealProg < 0.8
                    ? (1 - revealProg / 0.8) * 3 : 0;

                el.style.transform = `
                    perspective(800px)
                    translateY(${fromY + exitProg * (i % 2 === 0 ? -40 : 40)}px)
                    translateZ(${fromZ}px)
                    rotateX(${fromRotateX}deg)
                    rotateY(${fromRotateY}deg)
                    scale(${exitScale})
                `;
                el.style.opacity = visible;
                el.style.filter = exitProg > 0 ? `blur(${exitBlur}px)` : 'none';
                el.style.textShadow = rgbSplit > 0.1
                    ? `${rgbSplit}px 0 rgba(255,51,102,0.6), ${-rgbSplit}px 0 rgba(0,229,255,0.6)` : 'none';
            });

            // Subtitle
            if (subtitleRef.current) {
                const subReveal = smoothstep(0.86, 0.91, p);
                const subExit = smoothstep(0.95, 1.0, p);
                subtitleRef.current.style.opacity = subReveal * (1 - subExit);
                subtitleRef.current.style.transform = `translateY(${(1 - subReveal) * 20}px)`;
            }

            // Scan line
            if (scanLineRef.current) {
                const scanProg = smoothstep(0.74, 0.86, p);
                const scanExit = smoothstep(0.92, 0.97, p);
                scanLineRef.current.style.opacity = (scanProg > 0 ? 0.6 : 0) * (1 - scanExit);
                scanLineRef.current.style.setProperty('--scan-progress', scanProg);
            }

            // Progress bar
            if (progressBarRef.current) {
                progressBarRef.current.style.transform = `scaleX(${p})`;
                progressBarRef.current.style.backgroundColor = p > 0.75 ? '#fff' : colors.cyan;
            }

            // Phase text
            if (phaseTextRef.current) {
                const newLabel = getPhaseLabel(p);
                if (phaseTextRef.current.textContent !== newLabel) {
                    phaseTextRef.current.textContent = newLabel;
                }
            }

            // Counter
            if (counterRef.current) {
                counterRef.current.textContent = `${Math.floor(p * 100).toString().padStart(3, '0')}%`;
            }

            // Completion
            if (p >= 1 && !isCompleted.current) {
                isCompleted.current = true;
                if (onComplete) onComplete();
            }

            rafId.current = requestAnimationFrame(animate);
        };

        rafId.current = requestAnimationFrame(animate);
        return () => {
            if (rafId.current) cancelAnimationFrame(rafId.current);
        };
    }, [onComplete, isMobile, letters]);

    // ─── GSAP entry animations for HUD elements ─────────────────────
    useGSAP(() => {
        const tl = gsap.timeline({ delay: 0.3 });

        // HUD slides up
        tl.fromTo(hudRef.current,
            { y: 40, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
        );

        // Scroll indicator pulse
        tl.fromTo('.scroll-indicator-new',
            { opacity: 0, y: -10 },
            { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
            '-=0.4'
        );
    }, { scope: containerRef });

    // ─── Letter spacing calculation ──────────────────────────────────
    const getLetterStyle = useCallback((i) => {
        const spacing = isMobile ? 22 : 48;
        const totalWidth = (letters.length - 1) * spacing;
        const x = i * spacing - totalWidth / 2;
        return {
            left: `calc(50% + ${x}px)`,
            transform: 'translateX(-50%)',
        };
    }, [letters.length, isMobile]);

    return (
        <motion.div
            className="svg-intro-v2"
            ref={containerRef}
            initial={{ opacity: 1 }}
            exit={{
                opacity: 0,
                scale: 0.92,
                filter: 'blur(20px)',
            }}
            transition={{ duration: 0.7, ease: 'backIn' }}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
        >
            {/* ── Dynamic Lighting Layer ── */}
            <div className="intro-lighting" ref={lightingRef} />

            {/* ── Screen Flash ── */}
            <div className="intro-flash" ref={flashRef} />

            {/* ── Canvas Particle System ── */}
            <canvas ref={canvasRef} className="intro-canvas" />

            {/* ── 3D Text Layer ── */}
            <div className="intro-text-layer" ref={textLayerRef}>
                <div className="intro-text-container">
                    {/* Main name letters */}
                    <div className="intro-letters-row">
                        {letters.map((char, i) => (
                            <span
                                key={i}
                                ref={(el) => (letterRefs.current[i] = el)}
                                className={`intro-letter ${char === ' ' ? 'intro-letter--space' : ''}`}
                                style={getLetterStyle(i)}
                            >
                                {char === ' ' ? '\u00A0' : char}
                            </span>
                        ))}
                    </div>

                    {/* Scan line */}
                    <div className="intro-scan-line" ref={scanLineRef}>
                        <div className="intro-scan-line__track" />
                        <div className="intro-scan-line__head" />
                    </div>

                    {/* Subtitle */}
                    <div className="intro-subtitle" ref={subtitleRef}>
                        <span className="intro-subtitle__bracket">[</span>
                        CREATIVE ENGINEER
                        <span className="intro-subtitle__bracket">]</span>
                    </div>
                </div>
            </div>

            {/* ── Terminal HUD Panel ── */}
            <div className="intro-hud" ref={hudRef}>
                <div className="intro-hud__status">
                    <div className="intro-hud__dot" />
                    <span className="intro-hud__phase" ref={phaseTextRef}>
                        {'> INITIALIZING SEQUENCE...'}
                    </span>
                </div>
                <div className="intro-hud__right">
                    <span className="intro-hud__counter" ref={counterRef}>000%</span>
                    <div className="intro-hud__progress-track">
                        <div className="intro-hud__progress-fill" ref={progressBarRef} />
                    </div>
                </div>
            </div>

            {/* ── Scroll Indicator ── */}
            <div className={`scroll-indicator-new ${progressRef.current > 0.05 ? 'scroll-indicator-new--hidden' : ''}`}>
                <div className="scroll-indicator-new__text">SCROLL TO BEGIN</div>
                <div className="scroll-indicator-new__mouse">
                    <div className="scroll-indicator-new__wheel" />
                </div>
            </div>
        </motion.div>
    );
}
