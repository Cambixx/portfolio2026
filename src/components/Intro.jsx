import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { useContent } from '../i18n/useLanguage';
import './Intro.css';

const NAME = 'CARLOS RÁBAGO';
const COORDS = '40.4168° N, 3.7038° W';

/** Progress marks for each loading phase; the labels live in the ui bundle. */
const STEP_THRESHOLDS = [0, 30, 65, 90];

/**
 * High-End Cinematic Editorial Preloader
 *
 * Designed for creative technologists and luxury digital experiences.
 * - Smooth 000% → 100% tabular progression with phase indicators
 * - Character blur-fade typographic staging
 * - Madrid local time clock HUD + live coordinates
 * - Precision hairline crosshairs & specialization badge
 * - Laser scanline curtain unveil into 3D particle hero
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
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) {
            onReveal?.();
            onComplete?.();
            return;
        }

        const ctx = gsap.context(() => {
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
                onComplete?.();
            };

            const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
            tlRef.current = tl;
            if (import.meta.env.DEV) window.__introTimeline = tl;

            // Initial positions
            tl.set('.intro__char', { yPercent: 120, opacity: 0, filter: 'blur(10px)' })
                .set('.intro__center-glow', { scale: 0.6, opacity: 0 })
                .set('.intro__role-pill', { opacity: 0, y: 14 })
                .set('.intro__rule-wrap', { opacity: 0, scaleX: 0 })
                .set(['.intro__hud-item', '.intro__skip-btn'], { opacity: 0, y: 8 })
                .set('.intro__progress-fill', { scaleX: 0 });

            // 1. HUD elements fade in
            tl.to(['.intro__hud-item', '.intro__skip-btn'], {
                opacity: 1,
                y: 0,
                duration: 0.7,
                stagger: 0.04,
                ease: 'power2.out',
            }, 0.05);

            // 2. Counter progression (000 → 100) & Progress bar
            tl.to(counter, {
                value: 100,
                duration: 1.6,
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
                    duration: 1.6,
                    ease: 'power2.inOut',
                }, 0.1)
                .to('.intro__center-glow', {
                    opacity: 1,
                    scale: 1,
                    duration: 1.2,
                    ease: 'power2.out',
                }, 0.15);

            // 3. Typographic Reveal: Letters rise with soft blur-fade
            tl.to('.intro__char', {
                yPercent: 0,
                opacity: 1,
                filter: 'blur(0px)',
                duration: 0.95,
                stagger: 0.028,
                ease: 'power4.out',
            }, 0.25);

            // 4. Center Hairline & Role Pill
            tl.to('.intro__rule-wrap', {
                opacity: 1,
                scaleX: 1,
                duration: 0.8,
                ease: 'expo.inOut',
            }, 0.65)
                .to('.intro__role-pill', {
                    opacity: 1,
                    y: 0,
                    duration: 0.7,
                    ease: 'power3.out',
                }, 0.75);

            // 5. Exit Transition: Refined hold then dissolve upward
            tl.to('.intro__char', {
                yPercent: -120,
                opacity: 0,
                filter: 'blur(8px)',
                duration: 0.55,
                stagger: 0.015,
                ease: 'power3.in',
            }, 1.95)
                .to(['.intro__role-pill', '.intro__rule-wrap', '.intro__center-glow'], {
                    opacity: 0,
                    duration: 0.35,
                    ease: 'power2.in',
                }, 2.0)
                .to(['.intro__hud-item', '.intro__skip-btn', '.intro__progress'], {
                    opacity: 0,
                    duration: 0.3,
                    ease: 'power2.in',
                }, 2.05);

            // 6. Laser Curtain Lift Unveiling Hero
            tl.addLabel('curtain', 2.2)
                .call(fireReveal, null, 'curtain')
                .to('.intro__panel--dark', {
                    yPercent: -100,
                    duration: 0.95,
                    ease: 'expo.inOut',
                }, 'curtain')
                .call(fireComplete, null, 'curtain+=0.95');
        }, rootRef);

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
            ctx.revert();
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
                <div className="intro__grid" aria-hidden="true" />
                <div className="intro__center-glow" aria-hidden="true" />

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

                {/* Laser Scanline at Curtain Lift Edge */}
                <div className="intro__laser-edge" aria-hidden="true" />
            </div>
        </aside>
    );
}
