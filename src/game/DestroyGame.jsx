import { useEffect, useRef, useState } from 'react';
import { useContent } from '../i18n/useLanguage';
import { rasterizePage } from './rasterize';
import { createGame, WEAPONS } from './engine';
import { createSfx } from './sfx';
import { paintIcon } from './sprites';
import './DestroyGame.css';

/**
 * "Destroy this site": the page under the overlay is rasterised into a
 * pixel level and handed to the game. The real page is only hidden, never
 * touched, so leaving puts everything back exactly as it was, scrolled to
 * wherever the camera ended up.
 */
export default function DestroyGame({ onReady, onExit }) {
    const t = useContent('ui').game;
    const rootRef = useRef(null);
    const canvasRef = useRef(null);
    const meterRef = useRef(null);
    const pctRef = useRef(null);
    const fuelRef = useRef(null);
    const gameRef = useRef(null);
    const [weapon, setWeapon] = useState(0);
    const [muted, setMuted] = useState(false);
    const [hint, setHint] = useState(true);
    const [paused, setPaused] = useState(false);
    const resumeRef = useRef(null);

    useEffect(() => {
        const level = rasterizePage(document.querySelector('.app-content'));
        const sfx = createSfx();
        const game = createGame({
            level,
            canvas: canvasRef.current,
            scrollY: window.scrollY,
            reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            sfx,
            // The HUD meters change every few frames; write them directly
            // rather than re-rendering the overlay each time.
            onHud: ({ destroyed, fuel }) => {
                const pct = Math.min(100, destroyed * 100);
                if (meterRef.current) meterRef.current.style.transform = `scaleX(${pct / 100})`;
                if (pctRef.current) pctRef.current.textContent = `${pct.toFixed(pct < 10 ? 1 : 0)}%`;
                if (fuelRef.current) fuelRef.current.style.transform = `scaleX(${fuel})`;
            },
            onWeapon: setWeapon,
            onMute: setMuted,
            onPause: setPaused,
            onExit,
        });
        gameRef.current = game;
        rootRef.current?.focus();
        onReady();

        const hintTimer = setTimeout(() => setHint(false), 9000);
        return () => {
            clearTimeout(hintTimer);
            game.destroy();
            sfx.close();
            gameRef.current = null;
        };
    }, [onReady, onExit]);

    // The pause menu takes the keyboard while it is open, and hands it back.
    useEffect(() => {
        if (paused) resumeRef.current?.focus();
        else rootRef.current?.focus();
    }, [paused]);

    // HUD buttons act, then hand the keyboard back to the game.
    const act = (e, fn) => {
        if (gameRef.current) fn(gameRef.current);
        e.currentTarget.blur();
    };

    return (
        <div
            className="game"
            ref={rootRef}
            tabIndex={-1}
            role="application"
            aria-label={t.aria}
            onContextMenu={(e) => e.preventDefault()}
        >
            <div className="game__flash" aria-hidden="true" />
            <canvas ref={canvasRef} className="game__screen" aria-hidden="true" />

            <div className="game__panel game__stats mono">
                <div className="game__row">
                    <span>{t.destroyed}</span>
                    <span ref={pctRef} className="game__value">0.0%</span>
                </div>
                <div className="game__meter"><i ref={meterRef} /></div>
                <div className="game__row game__row--sub">
                    <span>{t.fuel}</span>
                </div>
                <div className="game__meter game__meter--thin"><i ref={fuelRef} /></div>
            </div>

            <div className="game__actions mono">
                <button type="button" className="game__btn" onClick={(e) => act(e, (game) => game.toggleMute())} aria-pressed={muted}>
                    {muted ? t.soundOff : t.soundOn}
                    <kbd>M</kbd>
                </button>
                <button type="button" className="game__btn" onClick={(e) => act(e, (game) => game.pause())}>
                    {t.pause}
                    <kbd>ESC</kbd>
                </button>
                <button type="button" className="game__btn" onClick={(e) => act(e, (game) => game.exit())}>
                    {t.exit}
                </button>
            </div>

            <div className="game__panel game__weapons mono" role="toolbar" aria-label={t.weaponsAria}>
                {WEAPONS.map((w, i) => (
                    <button
                        key={w.id}
                        type="button"
                        className={`game__slot${i === weapon ? ' is-on' : ''}`}
                        aria-pressed={i === weapon}
                        onClick={(e) => act(e, (game) => game.setWeapon(i))}
                    >
                        <span className="game__key">{i + 1}</span>
                        <canvas className="game__icon" aria-hidden="true" ref={(el) => el && paintIcon(el, w.id)} />
                        {t.weapons[i]}
                    </button>
                ))}
            </div>

            {paused && (
                <div className="game__pause" role="dialog" aria-modal="true" aria-labelledby="game-pause-title">
                    <div className="game__panel game__pause-card mono">
                        <p id="game-pause-title" className="game__pause-title">{t.paused}</p>
                        <div className="game__controls">
                            {t.controls.map(([key, label]) => (
                                <span key={key}>
                                    <kbd>{key}</kbd> {label}
                                </span>
                            ))}
                        </div>
                        <div className="game__pause-actions">
                            <button ref={resumeRef} type="button" className="game__btn game__btn--primary" onClick={() => gameRef.current?.resume()}>
                                {t.resume}
                                <kbd>ESC</kbd>
                            </button>
                            <button type="button" className="game__btn" onClick={() => gameRef.current?.exit()}>
                                {t.exit}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className={`game__panel game__hint mono${hint && !paused ? '' : ' is-hidden'}`}>
                {t.controls.map(([key, label]) => (
                    <span key={key}>
                        <kbd>{key}</kbd> {label}
                    </span>
                ))}
            </div>
        </div>
    );
}
