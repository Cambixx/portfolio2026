import { Series } from 'remotion';
import { ScreenSlide } from './ScreenSlide';
import showreelData from '../data/showreel.json';

export const WalkthroughComposition = () => {
    return (
        <Series>
            {showreelData.map((slide, index) => (
                <Series.Sequence key={index} durationInFrames={slide.duration}>
                    <ScreenSlide
                        imageSrc={slide.imageSrc}
                        title={slide.title}
                        description={slide.description}
                    />
                </Series.Sequence>
            ))}
        </Series>
    );
};
