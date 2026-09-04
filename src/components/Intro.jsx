import { useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import './Intro.css';

const NAME = 'CARLOS RÁBAGO';
const ROLE = 'Creative Frontend & 3D Developer';

/**
 * Cinematic, time-based preloader.
 *
 * Timeline (≈2.9s):
 *   0.0s  counter 000 → 100, progress line grows
 *   0.25s name characters rise out of a mask (staggered)
 *   1.0s  role line + horizontal rule
 *   2.0s  text exits upward
 *   2.2s  two-layer curtain lifts and reveals the hero (onReveal fires here,
 *         onComplete fires once the curtain has fully left the viewport)
 *
 * Any wheel / key / click / tap skips straight to the curtain.
 * prefers-reduced-motion skips the whole sequence.
 */
export default function Intro({ onReveal, onComplete }) {
    const rootRef = useRef(null);
    const tlRef = useRef(null);
    const revealed = useRef(false);
    const completed = useRef(false);

    const words = useMemo(() => NAME.split(' '), []);

    useEffect(() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) {
            onReveal?.();
            onComplete?.();
            return;
        }

        const ctx = gsap.context(() => {
            const counter = { value: 0 };
            const counterEl = rootRef.current.querySelector('.intro__counter-value');

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

            const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
            tlRef.current = tl;
            if (import.meta.env.DEV) window.__introTimeline = tl; // dev-only: scrub from devtools

            tl.set('.intro__char', { yPercent: 115 })
                .set('.intro__role', { opacity: 0, y: 12 })
                .set('.intro__rule', { scaleX: 0 })
                .set(['.intro__corner', '.intro__skip'], { opacity: 0, y: 8 })

                // Chrome (corners, skip) fades in
                .to(['.intro__corner', '.intro__skip'], {
                    opacity: 1, y: 0, duration: 0.8, stagger: 0.06,
                }, 0)

                // Counter + progress line
                .to(counter, {
                    value: 100,
                    duration: 1.7,
                    ease: 'power2.inOut',
                    onUpdate: () => {
                        if (counterEl) {
                            counterEl.textContent = String(Math.round(counter.value)).padStart(3, '0');
                        }
                    },
                }, 0)
                .to('.intro__progress-fill', {
                    scaleX: 1, duration: 1.7, ease: 'power2.inOut',
                }, 0)

                // Name rises out of the mask
                .to('.intro__char', {
                    yPercent: 0, duration: 1.1, stagger: 0.035,
                }, 0.25)

                // Role + rule
                .to('.intro__rule', { scaleX: 1, duration: 1.0, ease: 'expo.inOut' }, 0.95)
                .to('.intro__role', { opacity: 1, y: 0, duration: 0.8 }, 1.05)

                // Hold, then text exits upward
                .to('.intro__char', {
                    yPercent: -115, duration: 0.7, stagger: 0.02, ease: 'expo.in',
                }, 2.0)
                .to(['.intro__role', '.intro__rule', '.intro__corner', '.intro__counter', '.intro__skip'], {
                    opacity: 0, duration: 0.35, ease: 'power1.in',
                }, 2.05)

                // Curtain
                .addLabel('curtain', 2.25)
                .call(fireReveal, null, 'curtain')
                .to('.intro__panel--dark', {
                    yPercent: -100, duration: 1.0, ease: 'expo.inOut',
                }, 'curtain')
                .to('.intro__panel--accent', {
                    yPercent: -100, duration: 1.0, ease: 'expo.inOut',
                }, 'curtain+=0.12')
                .call(fireComplete);
        }, rootRef);

        // ── Skip handling ──
        const skip = () => {
            const tl = tlRef.current;
            if (!tl || revealed.current) return;
            if (tl.labels.curtain !== undefined && tl.time() < tl.labels.curtain) {
                tl.play('curtain');
            }
        };
        const onKey = (e) => {
            if (['Enter', ' ', 'Escape', 'ArrowDown'].includes(e.key)) skip();
        };
        window.addEventListener('wheel', skip, { passive: true });
        window.addEventListener('touchmove', skip, { passive: true });
        window.addEventListener('keydown', onKey);

        return () => {
            window.removeEventListener('wheel', skip);
            window.removeEventListener('touchmove', skip);
            window.removeEventListener('keydown', onKey);
            ctx.revert();
        };
    }, [onReveal, onComplete]);

    const handleSkipClick = () => {
        const tl = tlRef.current;
        if (tl && !revealed.current) tl.play('curtain');
    };

    return (
        <div className="intro" ref={rootRef} aria-hidden="true">
            <div className="intro__panel intro__panel--accent" />
            <div className="intro__panel intro__panel--dark">
                <div className="intro__grid" />
                <div className="intro__glow" />

                <div className="intro__corner intro__corner--tl mono">
                    <span>PORTFOLIO</span>
                    <span className="intro__corner-dim">© 2026</span>
                </div>
                <div className="intro__corner intro__corner--tr">
                    <button
                        type="button"
                        className="intro__skip mono"
                        onClick={handleSkipClick}
                        aria-label="Skip introduction"
                    >
                        SKIP <span aria-hidden="true">→</span>
                    </button>
                </div>

                <div className="intro__center">
                    <h1 className="intro__name" aria-label={NAME}>
                        {words.map((word, wi) => (
                            <span className="intro__word" key={wi}>
                                {Array.from(word).map((ch, ci) => (
                                    <span className="intro__char" key={ci}>{ch}</span>
                                ))}
                            </span>
                        ))}
                    </h1>
                    <div className="intro__rule" />
                    <p className="intro__role mono">
                        <span className="intro__role-bracket">[</span>
                        {ROLE}
                        <span className="intro__role-bracket">]</span>
                    </p>
                </div>

                <div className="intro__counter mono">
                    <span className="intro__counter-value">000</span>
                    <span className="intro__counter-unit">%</span>
                </div>
                <div className="intro__corner intro__corner--br mono">
                    <span className="intro__corner-dim">MADRID</span>
                    <span>40.4168° N</span>
                </div>

                <div className="intro__progress">
                    <div className="intro__progress-fill" />
                </div>
            </div>
        </div>
    );
}
