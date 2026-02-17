import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, Img } from 'remotion';

interface ScreenSlideProps {
    imageSrc: string;
    title: string;
    description?: string;
}

export const ScreenSlide: React.FC<ScreenSlideProps> = ({
    imageSrc,
    title,
    description,
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const zoom = spring({
        frame,
        fps,
        from: 1,
        to: 1.05,
        config: { damping: 20 },
    });

    const opacity = spring({
        frame,
        fps,
        from: 0,
        to: 1,
    });

    return (
        <AbsoluteFill style={{ backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ transform: `scale(${zoom})`, opacity, width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Img
                    src={imageSrc}
                    style={{
                        width: '80%',
                        borderRadius: '32px',
                        boxShadow: '0 50px 100px rgba(0,0,0,0.5), 0 0 50px rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}
                />
            </div>

            <div style={{
                position: 'absolute',
                bottom: '10%',
                left: '10%',
                color: 'white',
                textShadow: '0 5px 15px rgba(0,0,0,0.5)',
                opacity: spring({ frame: frame - 10, fps, from: 0, to: 1 })
            }}>
                <h1 style={{ fontSize: '80px', margin: 0, fontWeight: 800, letterSpacing: '-0.02em' }}>{title}</h1>
                <p style={{ fontSize: '32px', margin: '10px 0 0 0', opacity: 0.7, fontWeight: 400 }}>{description}</p>
            </div>
        </AbsoluteFill>
    );
};
