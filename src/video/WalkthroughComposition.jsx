import { Series } from 'remotion';
import { ScreenSlide } from './ScreenSlide';

// Los slides llegan por inputProps del Player: así el vídeo sigue al idioma
// activo sin importar el JSON directamente.
export const WalkthroughComposition = ({ slides = [] }) => {
    return (
        <Series>
            {slides.map((slide, index) => (
                <Series.Sequence key={index} durationInFrames={slide.duration}>
                    <ScreenSlide
                        imageSrc={slide.imageSrc}
                        title={slide.title}
                        description={slide.description}
                        url={slide.url}
                    />
                </Series.Sequence>
            ))}
        </Series>
    );
};
