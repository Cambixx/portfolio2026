import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { useContent } from '../i18n/useLanguage';
import { fieldState, introGoTo, setNamePoints } from './fieldState';
import './Intro.css';

const NAME = 'CARLOS RÁBAGO';
const COORDS = '40.4168° N, 3.7038° W';

/** Progress marks for each loading phase; the labels live in the ui bundle. */
const STEP_THRESHOLDS = [0, 30, 65, 90];

/**
 * Renders the laid-out name characters into an offscreen canvas and returns
 * every filled pixel, normalised to the background canvas and shuffled, as
 * [x, y, …] pairs. The particle field turns these into the name formation.
 */
function sampleName(root) {
    const chars = root.querySelectorAll('.intro__char');
    const bg = document.querySelector('.app-bg')?.getBoundingClientRect();
    if (!chars.length || !bg?.width) return null;

    // Half resolution: one sample per 2×2 CSS px is dense enough for the points.
    const scale = 0.5;
    const w = Math.ceil(bg.width * scale);
    const h = Math.ceil(bg.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'alphabetic';

    chars.forEach((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        ctx.font = `${cs.fontWeight} ${parseFloat(cs.fontSize) * scale}px ${cs.fontFamily}`;
        const m = ctx.measureText(el.textContent);
        // The glyph's content box sits centred in the line box the span reports.
        const ascent = m.fontBoundingBoxAscent;
        const descent = m.fontBoundingBoxDescent;
        const baseline = (r.top - bg.top) * scale + ((r.height * scale) - (ascent + descent)) / 2 + ascent;
        ctx.fillText(el.textContent, (r.left - bg.left) * scale, baseline);
    });

    const { data } = ctx.getImageData(0, 0, w, h);
    const points = [];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (data[(y * w + x) * 4 + 3] > 128) points.push(x / w, y / h);
        }
    }

    // Shuffle pairs so any prefix is an even spread over the whole name.
    for (let i = points.length / 2 - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [points[i * 2], points[j * 2]] = [points[j * 2], points[i * 2]];
        [points[i * 2 + 1], points[j * 2 + 1]] = [points[j * 2 + 1], points[i * 2 + 1]];
    }
    return Float32Array.from(points);
}

/**
 * High-End Cinematic Editorial Preloader
 *
 * The name is drawn by the site's own particle field rather than by HTML.
 * While the counter runs 000% → 100%, faint dust hanging in the dark is
 * pulled into a single core, which charges and blows apart toward the
 * viewer; each particle then finds its way back out of the chaos on its own
 * path and they land as the name; a band of light crosses it, then it breaks toward the viewer and
 * settles into the hero grid as the page reveals. The heading stays in the DOM, invisible, as the layout guide the
 * particles are sampled from and as the accessible name.
 * - Madrid local time clock HUD + live coordinates
 * - Precision hairline crosshairs & specialization badge
 */
export default function Intro({ onReveal, onComplete }) {
    const ui = useContent('ui');
    const rootRef = useRef(null);
    const tlRef = useRef(null);
    const revealed = useRef(false);
    const completed = useRef(false);

    // Track the phase by index, not by text, so the label follows the active
    // language even if it changes mid-animation.
    const [stepIndex, setStepIndex] = useState(0);
    const [currentTime, setCurrentTime] = useState('');

    const words = useMemo(() => NAME.split(' '), []);

    // Madrid local time clock
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const timeStr = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Europe/Madrid',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            }).format(now);
            setCurrentTime(`${timeStr} CET`);
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    // Interactive mouse glow
    useEffect(() => {
        const el = rootRef.current;
        if (!el) return;

        const handlePointerMove = (e) => {
            const rect = el.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            el.style.setProperty('--mx', `${x}%`);
            el.style.setProperty('--my', `${y}%`);
        };

        window.addEventListener('pointermove', handlePointerMove, { passive: true });
        return () => window.removeEventListener('pointermove', handlePointerMove);
    }, []);

    useEffect(() => {
        fieldState.introActive = true;
        fieldState.sweep = 0;
        fieldState.shake = 0;
        fieldState.charge = 0;
        // The field comes up from black once the timeline starts.
        fieldState.opacity = 0;
        introGoTo(0, 0);

        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) {
            fieldState.introActive = false;
            fieldState.opacity = 1;
            onReveal?.();
            onComplete?.();
            return;
        }

        let cancelled = false;
        let ctx;

        const start = () => {
            if (cancelled || !rootRef.current) return;
            setNamePoints(sampleName(rootRef.current));

            ctx = gsap.context(() => {
                const counter = { value: 0 };
                const counterEl = rootRef.current.querySelector('.intro__counter-num');

                const fireReveal = () => {
                    if (revealed.current) return;
                    revealed.current = true;
                    onReveal?.();
                };

                const fireComplete = () => {
                    if (completed.current) return;
                    completed.current = true;
                    // The field is on the hero grid now; hand it to the scroll.
                    fieldState.introActive = false;
                    onComplete?.();
                };

                const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
                tlRef.current = tl;
                if (import.meta.env.DEV) window.__introTimeline = tl;

                // Initial positions
                tl.set('.intro__center-glow', { scale: 0.2, opacity: 0 })
                    .set('.intro__flash', { opacity: 0 })
                    .set('.intro__role-pill', { opacity: 0, y: 14 })
                    .set('.intro__rule-wrap', { opacity: 0, scaleX: 0 })
                    .set(['.intro__hud-item', '.intro__skip-btn'], { opacity: 0, y: 8 })
                    .set('.intro__progress-fill', { scaleX: 0 });

                // Every beat is placed relative to the blast.
                const BANG = 2.4;
                const NAME_LANDS = BANG + 1.9;

                // 1. HUD elements fade in
                tl.to(['.intro__hud-item', '.intro__skip-btn'], {
                    opacity: 1,
                    y: 0,
                    duration: 0.7,
                    stagger: 0.04,
                    ease: 'power2.out',
                }, 0.05);

                // The counter runs across the whole build-up and reaches 100%
                // as the name lands.
                tl.to(counter, {
                    value: 100,
                    duration: NAME_LANDS - 0.1,
                    ease: 'power2.inOut',
                    onUpdate: () => {
                        const val = Math.round(counter.value);
                        if (counterEl) {
                            counterEl.textContent = String(val).padStart(3, '0');
                        }
                        let next = 0;
                        STEP_THRESHOLDS.forEach((threshold, i) => {
                            if (val >= threshold) next = i;
                        });
                        setStepIndex(next);
                    },
                }, 0.1)
                    .to('.intro__progress-fill', {
                        scaleX: 1,
                        duration: NAME_LANDS - 0.1,
                        ease: 'power2.inOut',
                    }, 0.1);

                // 2. Dust: faint particles hanging in the dark fade up.
                tl.to(fieldState, { opacity: 1, duration: 1.2, ease: 'power1.out' }, 0);

                // 3. Implosion: gravity takes hold, slowly at first and then
                //    ever faster, pulling everything into one core; the points
                //    heat up as they gather.
                tl.call(introGoTo, [1, 1.7, { ease: 'inExpo', scatter: 0.06 }], 0.35)
                    .to('.intro__center-glow', {
                        opacity: 0.5,
                        scale: 0.3,
                        duration: 1.7,
                        ease: 'power3.in',
                    }, 0.35);

                // 4. Charge: the new core swells and fizzes, and the shake
                //    builds toward the blast.
                tl.to(fieldState, { charge: 1, shake: 0.45, duration: 0.7, ease: 'power2.in' }, BANG - 0.7)
                    .to('.intro__center-glow', {
                        opacity: 1,
                        scale: 0.7,
                        duration: 0.7,
                        ease: 'power2.in',
                    }, BANG - 0.7);

                // 5. Big bang: the core blows apart, in every direction and
                //    toward the viewer, with a flash and a hard shake.
                tl.addLabel('bang', BANG)
                    .set(fieldState, { charge: 0, shake: 1 }, 'bang')
                    .call(introGoTo, [2, 0.9, { ease: 'outExpo', scatter: 0 }], 'bang')
                    .to('.intro__flash', { opacity: 1, duration: 0.06, ease: 'none' }, 'bang')
                    .to('.intro__flash', { opacity: 0, duration: 0.8, ease: 'power2.out' }, 'bang+=0.06')
                    .to(fieldState, { shake: 0, duration: 0.7, ease: 'power2.out' }, 'bang')
                    .to('.intro__center-glow', {
                        opacity: 0.35,
                        scale: 1.4,
                        duration: 0.8,
                        ease: 'power3.out',
                    }, 'bang');

                // 6. Chaos to order: before the blast settles, every particle
                //    takes its own wide, crossing path back — some swinging
                //    past the camera — and they all land as the name.
                tl.call(introGoTo, [3, 1.5, { scatter: 0.3, arcZ: 10 }], 'bang+=0.4')
                    .to('.intro__center-glow', {
                        opacity: 0.8,
                        scale: 1,
                        duration: 1.2,
                        ease: 'power2.out',
                    }, 'bang+=0.7');

                // 7. A band of light crosses the finished name
                tl.to(fieldState, {
                    sweep: 1,
                    duration: 0.85,
                    ease: 'power1.inOut',
                }, NAME_LANDS - 0.15);

                // 8. Center Hairline & Role Pill
                tl.to('.intro__rule-wrap', {
                    opacity: 1,
                    scaleX: 1,
                    duration: 0.8,
                    ease: 'expo.inOut',
                }, NAME_LANDS)
                    .to('.intro__role-pill', {
                        opacity: 1,
                        y: 0,
                        duration: 0.7,
                        ease: 'power3.out',
                    }, NAME_LANDS + 0.15);

                // 9. Hold on the name, then clear the HUD
                tl.to(['.intro__role-pill', '.intro__rule-wrap', '.intro__center-glow'], {
                    opacity: 0,
                    duration: 0.35,
                    ease: 'power2.in',
                }, NAME_LANDS + 0.7)
                    .to(['.intro__hud-item', '.intro__skip-btn', '.intro__progress'], {
                        opacity: 0,
                        duration: 0.3,
                        ease: 'power2.in',
                    }, NAME_LANDS + 0.75);

                // 10. Warp: the name breaks toward the viewer and settles into
                //     the hero grid as the page reveals.
                tl.addLabel('curtain', NAME_LANDS + 0.9)
                    .call(fireReveal, null, 'curtain')
                    .call(introGoTo, [4, 1.4, { scatter: 0.25, arcZ: 38 }], 'curtain')
                    .call(fireComplete, null, 'curtain+=1.4');
            }, rootRef);
        };

        // The name has to be laid out in its final font before it is sampled.
        document.fonts.ready.then(start);

        // Robust skip handling with activation delay to ignore page-load inertia
        let canSkip = false;
        const activationTimer = setTimeout(() => {
            canSkip = true;
        }, 500);

        const skip = () => {
            if (!canSkip) return;
            const tl = tlRef.current;
            if (!tl || revealed.current) return;
            if (tl.labels.curtain !== undefined && tl.time() < tl.labels.curtain) {
                tl.play('curtain');
            }
        };

        let wheelDelta = 0;
        const onWheel = (e) => {
            if (!canSkip) return;
            wheelDelta += Math.abs(e.deltaY);
            if (wheelDelta > 70) skip();
        };

        const onKey = (e) => {
            if (['Enter', ' ', 'Escape', 'ArrowDown'].includes(e.key)) skip();
        };

        window.addEventListener('wheel', onWheel, { passive: true });
        window.addEventListener('keydown', onKey);

        return () => {
            clearTimeout(activationTimer);
            window.removeEventListener('wheel', onWheel);
            window.removeEventListener('keydown', onKey);
            cancelled = true;
            ctx?.revert();
            // Reverting also rewinds the timeline's tweens on the shared field
            // state — opacity back to 0 among them — so hand the field to the
            // page fully visible and at rest.
            Object.assign(fieldState, { opacity: 1, charge: 0, shake: 0, sweep: 0 });
        };
    }, [onReveal, onComplete]);

    const handleSkipClick = (e) => {
        e.stopPropagation();
        const tl = tlRef.current;
        if (tl && !revealed.current) tl.play('curtain');
    };

    return (
        <aside className="intro" ref={rootRef} aria-label={ui.intro.aria}>
            <div className="intro__panel intro__panel--dark">
                {/* Visual backdrops */}
                <div className="intro__spotlight" aria-hidden="true" />
                <div className="intro__center-glow" aria-hidden="true" />
                <div className="intro__flash" aria-hidden="true" />

                {/* Top HUD: Brand & Skip */}
                <header className="intro__header">
                    <div className="intro__hud-item intro__hud-item--brand mono">
                        <span className="intro__status-dot" aria-hidden="true" />
                        <span className="intro__hud-bold">{ui.intro.badge}</span>
                        <span className="intro__hud-dim">//</span>
                        <span className="intro__hud-dim">{ui.intro.archive}</span>
                    </div>

                    <div className="intro__hud-item">
                        <button
                            type="button"
                            className="intro__skip-btn mono"
                            onClick={handleSkipClick}
                            aria-label={ui.intro.skipAria}
                        >
                            <span>{ui.intro.skip}</span>
                            <span className="intro__skip-shortcut">ESC</span>
                            <span className="intro__skip-arrow" aria-hidden="true">→</span>
                        </button>
                    </div>
                </header>

                {/* Central Typography Showcase */}
                <main className="intro__center">
                    <h1 className="intro__name" aria-label={NAME}>
                        {words.map((word, wi) => (
                            <span className="intro__word" key={wi}>
                                {Array.from(word).map((ch, ci) => (
                                    <span className="intro__char" key={ci}>{ch}</span>
                                ))}
                            </span>
                        ))}
                    </h1>

                    <div className="intro__rule-wrap" aria-hidden="true">
                        <span className="intro__crosshair-mark">+</span>
                        <div className="intro__rule-bar" />
                        <span className="intro__crosshair-mark">+</span>
                    </div>

                    <div className="intro__role-pill mono">
                        <span className="intro__role-badge">{ui.intro.specialization}</span>
                        <span className="intro__role-text">{ui.intro.role}</span>
                    </div>
                </main>

                {/* Bottom HUD: Progress & Local Time */}
                <footer className="intro__footer">
                    <div className="intro__hud-item intro__counter-block mono">
                        <div className="intro__counter-main">
                            <span className="intro__counter-num">000</span>
                            <span className="intro__counter-symbol">%</span>
                        </div>
                        <div className="intro__counter-status">
                            <span className="intro__status-label">{ui.intro.systemStatus}</span>
                            <span className="intro__status-val">{ui.intro.steps[stepIndex]}</span>
                        </div>
                    </div>

                    <div className="intro__hud-item intro__coords-block mono">
                        <div className="intro__coords-row">
                            <span className="intro__hud-bold">{ui.intro.location}</span>
                            <span className="intro__time-badge">{currentTime || 'MADRID'}</span>
                        </div>
                        <div className="intro__coords-sub">
                            <span className="intro__hud-dim">{COORDS}</span>
                        </div>
                    </div>
                </footer>

                {/* Shimmering Progress Bar */}
                <div className="intro__progress" aria-hidden="true">
                    <div className="intro__progress-fill">
                        <div className="intro__progress-spark" />
                    </div>
                </div>
            </div>
        </aside>
    );
}
