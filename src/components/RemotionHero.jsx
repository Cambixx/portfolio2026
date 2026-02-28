import { useRef, useState, useEffect } from 'react';
import { Player } from '@remotion/player';
import { WalkthroughComposition } from '../video/WalkthroughComposition';
import showreelData from '../data/showreel.json';

export function RemotionHero() {
    const playerRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);

    // Calculate frame mapped data for navigation
    const projectsWithFrames = showreelData.reduce((acc, current, i) => {
        const startFrame = i === 0 ? 0 : acc[i - 1].endFrame;
        acc.push({
            ...current,
            startFrame,
            endFrame: startFrame + current.duration
        });
        return acc;
    }, []);

    const totalDuration = projectsWithFrames[projectsWithFrames.length - 1]?.endFrame || 360;

    // Sync active index with player's current frame
    useEffect(() => {
        const player = playerRef.current;
        if (!player) return;

        const handleFrameChange = (e) => {
            const currentFrame = e.detail.frame;
            const index = projectsWithFrames.findIndex(p => currentFrame >= p.startFrame && currentFrame < p.endFrame);
            if (index !== -1 && index !== activeIndex) {
                setActiveIndex(index);
            }
        };

        player.addEventListener('frameupdate', handleFrameChange);
        return () => player.removeEventListener('frameupdate', handleFrameChange);
    }, [activeIndex, projectsWithFrames]);

    const goToProject = (index) => {
        if (playerRef.current) {
            const project = projectsWithFrames[index];
            playerRef.current.seekTo(project.startFrame);
            setActiveIndex(index);
        }
    };

    const handleNext = (e) => {
        e.stopPropagation();
        const nextIndex = (activeIndex + 1) % showreelData.length;
        goToProject(nextIndex);
    };

    const handlePrev = (e) => {
        e.stopPropagation();
        const prevIndex = (activeIndex - 1 + showreelData.length) % showreelData.length;
        goToProject(prevIndex);
    };

    const handleContainerClick = () => {
        const currentProject = showreelData[activeIndex];
        if (currentProject.url) {
            window.open(currentProject.url, '_blank');
        }
    };

    return (
        <div
            className="showcase-container"
            style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer',
                border: '1px solid var(--border)',
                background: '#050505'
            }}
            onClick={handleContainerClick}
        >
            {/* The Video Player */}
            <Player
                ref={playerRef}
                component={WalkthroughComposition}
                durationInFrames={totalDuration}
                compositionWidth={1920}
                compositionHeight={1080}
                fps={30}
                style={{
                    width: '100%',
                    height: '100%',
                }}
                controls={false}
                autoPlay
                loop
                muted
                acknowledgeRemotionLicense={true}
            />

            {/* Top Info Bar */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                padding: '24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 10,
                background: 'linear-gradient(to bottom, rgba(5,5,5,0.8), transparent)'
            }}>
                <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.65rem',
                    color: 'var(--muted)',
                    letterSpacing: '0.15em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 700 }}>[ EXPLORE_MODE ]</span>
                    <span style={{ opacity: 0.2 }}>|</span>
                    <span>PROJECT_ID: {showreelData[activeIndex].id.toUpperCase()}</span>
                </div>

                <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.65rem',
                    color: 'var(--muted)',
                    padding: '4px 12px',
                    border: '1px solid var(--border)',
                    background: 'rgba(255,255,255,0.03)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)'
                }}>
                    {activeIndex + 1} / {showreelData.length}
                </div>
            </div>

            {/* Bottom Controls Bar */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%',
                zIndex: 10,
                display: 'flex',
                alignItems: 'flex-end',
                background: 'linear-gradient(to top, rgba(5,5,5,0.8), transparent)'
            }}>
                {/* Navigation Group */}
                <div style={{
                    display: 'flex',
                    borderTop: '1px solid var(--border)',
                    borderRight: '1px solid var(--border)',
                    background: 'rgba(5,5,5,0.5)',
                    backdropFilter: 'blur(10px)'
                }}>
                    <button
                        onClick={handlePrev}
                        className="brutal-nav-btn"
                        style={{ borderRight: '1px solid var(--border)' }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={handleNext}
                        className="brutal-nav-btn"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                {/* Progress Group */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    height: '60px', // Match button height
                    alignItems: 'center',
                    padding: '0 40px',
                    borderTop: '1px solid var(--border)',
                    background: 'rgba(5,5,5,0.3)',
                    backdropFilter: 'blur(10px)',
                    gap: '10px'
                }}>
                    {showreelData.map((_, i) => (
                        <div
                            key={i}
                            style={{
                                flex: 1,
                                height: '2px',
                                background: 'rgba(255,255,255,0.1)',
                                position: 'relative',
                                overflow: 'hidden',
                                cursor: 'pointer'
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                goToProject(i);
                            }}
                        >
                            <div style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                height: '100%',
                                background: i === activeIndex ? 'var(--accent)' : 'transparent',
                                width: '100%',
                                transition: 'background 0.3s ease'
                            }} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Style fixes for buttons */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .brutal-nav-btn {
                    background: transparent;
                    border: none;
                    color: white;
                    width: 70px;
                    height: 60px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    padding: 0;
                }
                .brutal-nav-btn:hover {
                    background: var(--accent);
                    color: white;
                }
                .brutal-nav-btn svg {
                    opacity: 0.6;
                    transition: opacity 0.2s;
                }
                .brutal-nav-btn:hover svg {
                    opacity: 1;
                }
            `}} />
        </div>
    );
}
