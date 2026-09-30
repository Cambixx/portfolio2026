import { lazy, Suspense, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Lenis from 'lenis';

import Intro from './components/Intro';
import { Nav } from './components/Nav';
import { StatusBar } from './components/StatusBar';
import ScrollCompanion from './components/ScrollCompanion';
import ScrollField from './components/ScrollField';
import { skipIntro } from './components/fieldState';
import { readPalette } from './config/palette';
import { getIntroMode } from './config/introMode';

import { Hero } from './sections/Hero';
import { Projects } from './sections/Projects';
import { Experience } from './sections/Experience';
import { Education } from './sections/Education';
import { Stack } from './sections/Stack';
import { Contact } from './sections/Contact';

// The dot grid is only the alternative background behind the toggle, so it
// is fetched the first time someone switches to it.
const DotGrid = lazy(() => import('./components/DotGrid'));
// The mini-game is only fetched when someone presses play.
const DestroyGame = lazy(() => import('./game/DestroyGame'));

// The game needs a keyboard and a mouse.
const canPlay = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);

    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
        const handle = (e) => setIsMobile(e.matches);
        mq.addEventListener('change', handle);
        return () => mq.removeEventListener('change', handle);
    }, [breakpoint]);

    return isMobile;
}

function App() {
    const isMobile = useIsMobile();
    // Los fondos 3D toman su color de la paleta CSS activa.
    const palette = useMemo(() => readPalette(), []);
    const [bgType, setBgType] = useState('field');
    const [introMode] = useState(() => {
        const mode = getIntroMode();
        // With no intro, the particle field starts straight on the page.
        if (mode === 'none') skipIntro();
        return mode;
    });
    const [showIntro, setShowIntro] = useState(introMode !== 'none');
    // `revealed` flips when the intro curtain starts lifting so the hero can
    // animate in behind it; `showIntro` flips once the curtain has fully left.
    const [revealed, setRevealed] = useState(introMode === 'none');
    const lenisRef = useRef(null);
    // 'off' → 'loading' (chunk + rasterising) → 'on' (page hidden under the level)
    const [game, setGame] = useState('off');

    // Smooth scroll
    useEffect(() => {
        const lenis = new Lenis({
            autoRaf: false,
            smoothWheel: true,
            wheelMultiplier: 1,
            touchMultiplier: 1.1,
            lerp: 0.1,
        });
        lenisRef.current = lenis;

        let rafId = 0;
        const raf = (time) => {
            lenis.raf(time);
            rafId = requestAnimationFrame(raf);
        };
        rafId = requestAnimationFrame(raf);

        return () => {
            cancelAnimationFrame(rafId);
            lenis.destroy();
        };
    }, []);

    // Lock scroll while the intro is on screen
    useEffect(() => {
        const lenis = lenisRef.current;
        if (!lenis) return;
        if (showIntro) {
            window.scrollTo(0, 0);
            lenis.stop();
        } else {
            lenis.start();
        }
    }, [showIntro]);

    // A visit that lands on a section link skips the intro; take it there once
    // the page has laid out (the browser's own jump runs before React renders).
    useEffect(() => {
        if (introMode !== 'none') return;
        const target = document.getElementById(window.location.hash.slice(1));
        if (!target) return;
        const id = requestAnimationFrame(() => lenisRef.current?.scrollTo(target, { immediate: true }));
        return () => cancelAnimationFrame(id);
    }, [introMode]);

    const handleReveal = useCallback(() => setRevealed(true), []);
    const handleIntroComplete = useCallback(() => {
        setRevealed(true);
        setShowIntro(false);
    }, []);

    const startGame = useCallback(() => {
        lenisRef.current?.stop();
        setGame('loading');
    }, []);
    const handleGameReady = useCallback(() => setGame('on'), []);
    const handleGameExit = useCallback((scrollTop) => {
        setGame('off');
        const lenis = lenisRef.current;
        lenis?.start();
        // Come back wherever the camera ended up.
        lenis?.scrollTo(scrollTop, { immediate: true, force: true });
    }, []);

    const toggleBg = useCallback(
        () => setBgType((prev) => (prev === 'dotgrid' ? 'field' : 'dotgrid')),
        []
    );

    return (
        <main className={`app${revealed ? '' : ' app--intro'}${game === 'on' ? ' app--game' : ''}`}>
            {showIntro && (
                <Intro onReveal={handleReveal} onComplete={handleIntroComplete} />
            )}

            {/* Background layer */}
            <div className="app-bg" aria-hidden="true">
                {bgType === 'dotgrid' ? (
                    <Suspense fallback={null}>
                        <DotGrid
                            dotSize={5}
                            gap={15}
                            baseColor={palette.accentDim}
                            activeColor={palette.accent}
                            proximity={120}
                            shockRadius={250}
                            shockStrength={5}
                            resistance={750}
                            returnDuration={1.5}
                        />
                    </Suspense>
                ) : (
                    <ScrollField
                        count={isMobile ? 1800 : 4000}
                        pointSize={isMobile ? 3.2 : 4}
                        color={palette.accent}
                    />
                )}
            </div>
            <div className="vignette" aria-hidden="true" />
            <div className="grain" aria-hidden="true" />

            <Nav isMobile={isMobile} ready={revealed} />
            {!showIntro && <ScrollCompanion />}

            <div className="app-content">
                <Hero ready={revealed} />
                <Projects />
                <Experience />
                <Education />
                <Stack />
                <Contact />
            </div>

            <StatusBar
                bgType={bgType}
                onToggleBg={toggleBg}
                isMobile={isMobile}
                ready={revealed}
                onPlay={!isMobile && canPlay() ? startGame : undefined}
                playing={game !== 'off'}
            />

            {game !== 'off' && (
                <Suspense fallback={null}>
                    <DestroyGame onReady={handleGameReady} onExit={handleGameExit} />
                </Suspense>
            )}
        </main>
    );
}

export default App;
