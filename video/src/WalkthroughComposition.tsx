import { Series } from 'remotion';
import { ScreenSlide } from './ScreenSlide';

export const WalkthroughComposition: React.FC = () => {
    return (
        <Series>
            <Series.Sequence durationInFrames={100}>
                <ScreenSlide
                    imageSrc={require('../public/assets/screens/hero.png')}
                    title="Level Up The Web"
                    description="Ultra-modern 3D Portfolio Landing Page"
                />
            </Series.Sequence>
            <Series.Sequence durationInFrames={100}>
                <ScreenSlide
                    imageSrc={require('../public/assets/screens/code.png')}
                    title="Crafting Technical Excellence"
                    description="Neon-vibrant code interfaces and workflows"
                />
            </Series.Sequence>
            <Series.Sequence durationInFrames={100}>
                <ScreenSlide
                    imageSrc={require('../public/assets/screens/case-study.png')}
                    title="Immersive Case Studies"
                    description="Cinematic project reveals with 3D interactions"
                />
            </Series.Sequence>
        </Series>
    );
};
