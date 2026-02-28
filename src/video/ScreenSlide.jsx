import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, Img, interpolate } from 'remotion';

export const ScreenSlide = ({
    imageSrc,
    title,
    description,
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Entradas suaves
    const entrance = spring({
        frame,
        fps,
        config: { damping: 15 },
    });

    // Movimiento sutil de flotación
    const translateY = Math.sin(frame / 20) * 10;

    // Escala de la imagen (más pequeña como pidió el usuario)
    const imgScale = spring({
        frame,
        fps,
        from: 0.8,
        to: 0.9,
        config: { damping: 20 },
    });

    return (
        <AbsoluteFill style={{
            backgroundColor: '#050505',
            justifyContent: 'center',
            alignItems: 'center',
            fontFamily: "'Space Grotesk', sans-serif"
        }}>
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

            {/* Framework Wrapper - Sharp Brutalist Border */}
            <div style={{
                width: '75%',
                height: '70%',
                border: '1px solid rgba(255,255,255,0.15)',
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                transform: `scale(${interpolate(entrance, [0, 1], [0.95, 1])})`,
                opacity: entrance,
                background: 'rgba(255,255,255,0.02)'
            }}>
                {/* Decorative Corners */}
                <div style={{ position: 'absolute', top: -1, left: -1, width: 20, height: 20, borderTop: '2px solid var(--accent)', borderLeft: '2px solid var(--accent)' }} />
                <div style={{ position: 'absolute', bottom: -1, right: -1, width: 20, height: 20, borderBottom: '2px solid var(--accent)', borderRight: '2px solid var(--accent)' }} />

                {/* The Smaller Image */}
                <div style={{
                    width: '90%',
                    height: '85%',
                    overflow: 'hidden',
                    position: 'relative',
                    transform: `translateY(${translateY}px) scale(${imgScale})`,
                }}>
                    <Img
                        src={imageSrc}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: 'contrast(1.1) brightness(0.9)',
                            border: '1px solid rgba(255,255,255,0.2)'
                        }}
                    />
                </div>

                {/* Overlay UI Info */}
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    fontFamily: 'Space Mono',
                    fontSize: '12px',
                    color: 'var(--accent)',
                    letterSpacing: '2px',
                    opacity: 0.5
                }}>
                    STITCH_RENDER_V2.0
                </div>
            </div>

            {/* Title & Description Overlay */}
            <div style={{
                position: 'absolute',
                bottom: '10%',
                right: '12%',
                textAlign: 'right',
                maxWidth: '500px'
            }}>
                <h2 style={{
                    fontSize: '80px',
                    fontWeight: 700,
                    color: 'white',
                    lineHeight: 0.9,
                    margin: 0,
                    letterSpacing: '-2px',
                    textTransform: 'uppercase',
                    opacity: spring({ frame: frame - 15, fps, from: 0, to: 1 })
                }}>
                    {title}
                </h2>
                <div style={{
                    height: '2px',
                    width: '60px',
                    background: 'var(--accent)',
                    margin: '20px 0 20px auto',
                    opacity: spring({ frame: frame - 20, fps, from: 0, to: 1 })
                }} />
                <p style={{
                    fontFamily: 'Space Mono',
                    fontSize: '18px',
                    color: 'rgba(255,255,255,0.6)',
                    margin: 0,
                    lineHeight: 1.4,
                    opacity: spring({ frame: frame - 25, fps, from: 0, to: 1 })
                }}>
                    {description}
                </p>
            </div>
        </AbsoluteFill>
    );
};
