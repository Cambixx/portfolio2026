import { useState, useEffect, useCallback, useRef } from 'react';
import Lenis from 'lenis';

import Intro from './components/Intro';
import { Nav } from './components/Nav';
import { StatusBar } from './components/StatusBar';
import ScrollCompanion from './components/ScrollCompanion';
import DotGrid from './components/DotGrid';
import Antigravity from './components/Antigravity';

import { Hero } from './sections/Hero';
import { Projects } from './sections/Projects';
import { Experience } from './sections/Experience';
import { Stack } from './sections/Stack';
import { Contact } from './sections/Contact';

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
    const [bgType, setBgType] = useState('antigravity');
    const [showIntro, setShowIntro] = useState(true);
    // `revealed` flips when the intro curtain starts lifting so the hero can
    // animate in behind it; `showIntro` flips once the curtain has fully left.
    const [revealed, setRevealed] = useState(false);
    const lenisRef = useRef(null);

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

    const handleReveal = useCallback(() => setRevealed(true), []);
    const handleIntroComplete = useCallback(() => {
        setRevealed(true);
        setShowIntro(false);
    }, []);

    const toggleBg = useCallback(
        () => setBgType((prev) => (prev === 'dotgrid' ? 'antigravity' : 'dotgrid')),
        []
    );

    return (
        <main className="app">
            {showIntro && (
                <Intro onReveal={handleReveal} onComplete={handleIntroComplete} />
            )}

            {/* Background layer */}
            <div className="app-bg" aria-hidden="true">
                {bgType === 'dotgrid' ? (
                    <DotGrid
                        dotSize={5}
                        gap={15}
                        baseColor="#271E37"
                        activeColor="#5227FF"
                        proximity={120}
                        shockRadius={250}
                        shockStrength={5}
                        resistance={750}
                        returnDuration={1.5}
                    />
                ) : (
                    <Antigravity
                        count={isMobile ? 100 : 300}
                        magnetRadius={6}
                        ringRadius={7}
                        waveSpeed={0.4}
                        waveAmplitude={1}
                        particleSize={1.5}
                        lerpSpeed={0.05}
                        color="#5227FF"
                        autoAnimate
                        particleVariance={1}
                        rotationSpeed={0}
                        depthFactor={1}
                        pulseSpeed={3}
                        particleShape="capsule"
                        fieldStrength={10}
                    />
                )}
            </div>
            <div className="vignette" aria-hidden="true" />
            <div className="grain" aria-hidden="true" />

            <Nav isMobile={isMobile} ready={revealed} />
            {!showIntro && <ScrollCompanion />}

            <div className="app-content">
                <Hero ready={revealed} />
                <Projects isMobile={isMobile} />
                <Experience />
                <Stack />
                <Contact />
            </div>

            <StatusBar
                bgType={bgType}
                onToggleBg={toggleBg}
                isMobile={isMobile}
                ready={revealed}
            />
        </main>
    );
}

export default App;
