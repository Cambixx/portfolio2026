import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, Img, interpolate } from 'remotion';

export const ScreenSlide = ({
    imageSrc,
    title,
    description,
}) => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    // Entradas suaves principales
    const entrance = spring({
        frame,
        fps,
        config: { damping: 15 },
    });

    // Animación de dibujo de SVG (Líneas que se trazan a lo largo del tiempo)
    const strokeProg = spring({
        frame: frame - 5, // empieza un poco después
        fps,
        config: { damping: 12 },
    });

    const drawGrid = spring({
        frame: frame - 10,
        fps,
        config: { damping: 20 },
    });

    // Movimiento sutil de flotación
    const translateY = Math.sin(frame / 20) * 10;

    // Escala de la imagen
    const imgScale = spring({
        frame,
        fps,
        from: 0.85,
        to: 1,
        config: { damping: 20 },
    });

    const strokeLength = 400;
    const dashOffset = strokeLength * (1 - strokeProg);

    return (
        <AbsoluteFill style={{
            backgroundColor: '#050505',
            justifyContent: 'center',
            alignItems: 'center',
            fontFamily: "'Space Grotesk', sans-serif"
        }}>
            {/* Background Data Grid (Animated opacity) */}
            <svg style={{ position: 'absolute', width: '100%', height: '100%', opacity: drawGrid * 0.15 }}>
                <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--accent)" strokeWidth="0.5" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Background Accent Gradient */}
            <div style={{
                position: 'absolute',
                width: '600px',
                height: '600px',
                background: 'rgba(82, 39, 255, 0.15)',
                filter: 'blur(150px)',
                borderRadius: '50%',
                opacity: entrance
            }} />

            {/* Main Wrapper */}
            <div style={{
                width: '75%',
                height: '70%',
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                transform: `scale(${interpolate(entrance, [0, 1], [0.95, 1])})`,
                opacity: entrance,
            }}>

                {/* SVG Animated Frame */}
                <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        zIndex: 10
                    }}
                >
                    {/* Main Border Path */}
                    <path
                        d="M0,0 L100,0 L100,100 L0,100 Z"
                        fill="none"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth="0.3"
                        strokeDasharray={strokeLength}
                        strokeDashoffset={dashOffset}
                    />

                    {/* Corner Accents */}
                    <path
                        d="M0,5 L0,0 L5,0"
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="1"
                        strokeDasharray={10}
                        strokeDashoffset={10 * (1 - strokeProg)}
                    />
                    <path
                        d="M95,0 L100,0 L100,5"
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="1"
                        strokeDasharray={10}
                        strokeDashoffset={10 * (1 - strokeProg)}
                    />
                    <path
                        d="M100,95 L100,100 L95,100"
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="1"
                        strokeDasharray={10}
                        strokeDashoffset={10 * (1 - strokeProg)}
                    />
                    <path
                        d="M5,100 L0,100 L0,95"
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="1"
                        strokeDasharray={10}
                        strokeDashoffset={10 * (1 - strokeProg)}
                    />

                    {/* Tech Crosshairs */}
                    <g style={{ opacity: strokeProg }}>
                        <line x1="50" y1="-2" x2="50" y2="2" stroke="var(--accent)" strokeWidth="0.5" />
                        <line x1="50" y1="98" x2="50" y2="102" stroke="var(--accent)" strokeWidth="0.5" />
                        <line x1="-2" y1="50" x2="2" y2="50" stroke="var(--accent)" strokeWidth="0.5" />
                        <line x1="98" y1="50" x2="102" y2="50" stroke="var(--accent)" strokeWidth="0.5" />
                    </g>
                </svg>

                {/* The Image Viewer Container */}
                <div style={{
                    width: '94%',
                    height: '90%',
                    overflow: 'hidden',
                    position: 'relative',
                    transform: `translateY(${translateY}px) scale(${imgScale})`,
                    // The background helps prevent a blank flash before the image loads
                    background: 'rgba(255,255,255,0.02)',
                }}>
                    {/* The image component designed to easily just cover the area perfectly 
                        no matter what image URL you feed it via showreel.json */}
                    <Img
                        src={imageSrc}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: 'contrast(1.05) brightness(0.95)',
                        }}
                    />

                    {/* Inner subtle glow / overlay to mesh the image with the tech aesthetic */}
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(135deg, rgba(82,39,255,0.1), transparent)',
                        pointerEvents: 'none'
                    }} />
                </div>

                {/* Overlay UI Info inside the frame */}
                <div style={{
                    position: 'absolute',
                    top: '-25px',
                    left: '5px',
                    fontFamily: 'Space Mono',
                    fontSize: '11px',
                    color: 'var(--accent)',
                    letterSpacing: '2.5px',
                    opacity: drawGrid * 0.7,
                }}>
                    [ TARGET_ACQUIRED ]
                </div>
            </div>

            {/* Title & Description Overlay */}
            <div style={{
                position: 'absolute',
                bottom: '8%',
                right: '12%',
                textAlign: 'right',
                maxWidth: '600px',
                zIndex: 20
            }}>
                <h2 style={{
                    fontSize: '72px',
                    fontWeight: 800,
                    color: '#ffffff',
                    lineHeight: 0.95,
                    margin: 0,
                    letterSpacing: '-2px',
                    textTransform: 'uppercase',
                    opacity: spring({ frame: frame - 15, fps, from: 0, to: 1 })
                }}>
                    {title}
                </h2>

                {/* Animated divider line */}
                <div style={{
                    height: '2px',
                    width: '120px',
                    margin: '24px 0 24px auto',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        height: '100%',
                        width: '100%',
                        background: 'var(--accent)',
                        transformOrigin: 'right',
                        transform: `scaleX(${spring({ frame: frame - 20, fps, from: 0, to: 1 })})`
                    }} />
                </div>

                <p style={{
                    fontFamily: 'Space Mono',
                    fontSize: '16px',
                    color: 'rgba(255,255,255,0.7)',
                    margin: 0,
                    lineHeight: 1.5,
                    opacity: spring({ frame: frame - 25, fps, from: 0, to: 1 })
                }}>
                    {description}
                </p>
            </div>
        </AbsoluteFill>
    );
};
