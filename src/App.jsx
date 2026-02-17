import Lanyard from './components/Lanyard';
import DotGrid from './components/DotGrid';
import { Projects } from './sections/Projects';
import { Experience } from './sections/Experience';
import { Stack } from './sections/Stack';
import { Contact } from './sections/Contact';
import site from './data/site.json';
import hero from './data/hero.json';
import './App.css';

import Antigravity from './components/Antigravity';
import CircularText from './components/CircularText';
import TextPressure from './components/TextPressure';
import { useState } from 'react';

function App() {
    const [bgType, setBgType] = useState('antigravity'); // 'dotgrid' or 'antigravity'

    return (
        <main style={{ minHeight: '100vh', position: 'relative', background: 'var(--bg)', overflowX: 'hidden' }}>
            {/* Background Layer */}
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 0 }}>
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
                        count={300}
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

            {/* Navigation */}
            <nav style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                padding: '24px 40px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 100,
                pointerEvents: 'none',
                background: 'linear-gradient(to bottom, rgba(5,5,5,0.9) 0%, transparent 100%)'
            }}>
                <div style={{
                    pointerEvents: 'auto',
                    padding: '0 10px',
                    marginTop: '20px'
                }}>
                    <CircularText
                        text="CARLOS*RÁBAGO*"
                        spinDuration={15}
                        onHover="speedUp"
                        radius={28}
                    />
                </div>
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    pointerEvents: 'auto',
                    border: '1px solid var(--border)',
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)'
                }}>
                    {site.nav.map(item => (
                        <a
                            key={item.label}
                            href={item.href}
                            style={{
                                textDecoration: 'none',
                                color: 'var(--muted)',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.75rem',
                                fontWeight: 400,
                                padding: '6px 14px',
                                transition: 'color 0.2s',
                                letterSpacing: '0.02em'
                            }}
                            onMouseEnter={e => e.target.style.color = 'white'}
                            onMouseLeave={e => e.target.style.color = 'var(--muted)'}
                        >
                            <span style={{ color: 'var(--accent)', marginRight: '6px' }}>{item.num}</span>
                            {item.label.toUpperCase()}
                        </a>
                    ))}
                </div>
            </nav>

            {/* All scrollable content */}
            <div style={{ position: 'relative', zIndex: 1 }}>
                {/* ══════ HERO ══════ */}
                <div style={{
                    position: 'relative',
                    maxWidth: '1400px',
                    margin: '0 auto',
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                }}>
                    {/* Lanyard 3D */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        zIndex: 1,
                        pointerEvents: 'none'
                    }}>
                        <div style={{ pointerEvents: 'auto', width: '100%', height: '100%' }}>
                            <Lanyard position={[0, 0, 24]} gravity={[0, -40, 0]} />
                        </div>
                    </div>

                    {/* Hero Text */}
                    <div style={{
                        position: 'relative',
                        zIndex: 2,
                        textAlign: 'left',
                        pointerEvents: 'none',
                        marginTop: '-60px',
                        padding: '0 80px'
                    }}>
                        <span className="mono" style={{
                            display: 'block',
                            fontSize: '0.8rem',
                            color: 'var(--muted)',
                            letterSpacing: '0.15em',
                            marginBottom: '40px'
                        }}>
                            {hero.subtitle}
                        </span>

                        <div style={{ marginBottom: '40px' }}>
                            <div style={{ position: 'relative', height: '140px', width: 'fit-content', marginBottom: '10px' }}>
                                <TextPressure
                                    text="FRONTEND"
                                    flex={false}
                                    textColor="#ffffff"
                                    minFontSize={120}
                                />
                            </div>
                            <div style={{ position: 'relative', height: '140px', width: 'fit-content' }}>
                                <TextPressure
                                    text="DEVELOPER"
                                    flex={false}
                                    textColor="var(--accent)"
                                    minFontSize={120}
                                />
                            </div>
                        </div>

                        <p className="mono" style={{
                            fontSize: '0.9rem',
                            color: 'var(--muted)',
                            maxWidth: '500px',
                            lineHeight: '1.7',
                            whiteSpace: 'pre-line',
                            textAlign: 'left'
                        }}>
                            {hero.description}
                        </p>

                        <div className="mono" style={{
                            marginTop: '60px',
                            fontSize: '0.7rem',
                            color: 'rgba(255,255,255,0.15)',
                            letterSpacing: '0.1em'
                        }}>
                            {hero.coordinates}
                        </div>
                    </div>
                </div>

                <Projects />
                <Experience />
                <Stack />
                <Contact />
            </div>

            {/* Status Bar */}
            <div style={{
                position: 'fixed',
                bottom: '24px',
                left: '24px',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                zIndex: 20,
                border: '1px solid var(--border)',
                background: 'rgba(255, 255, 255, 0.04)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)'
            }}>
                <div style={{
                    width: 6,
                    height: 6,
                    background: site.statusBar.color,
                    boxShadow: `0 0 8px ${site.statusBar.color}`
                }} />
                <span className="mono" style={{
                    fontSize: '0.65rem',
                    fontWeight: 400,
                    letterSpacing: '0.08em',
                    color: 'rgba(255,255,255,0.6)',
                    marginRight: '12px'
                }}>
                    {site.statusBar.text}
                </span>

                <button
                    onClick={() => setBgType(prev => prev === 'dotgrid' ? 'antigravity' : 'dotgrid')}
                    className="mono"
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white',
                        fontSize: '0.6rem',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        letterSpacing: '0.1em',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.target.style.background = 'var(--accent)'}
                    onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
                >
                    SWITCH BG: {bgType === 'dotgrid' ? 'ANTIGRAVITY' : 'DOTGRID'}
                </button>
            </div>
        </main>
    );
}

export default App;
