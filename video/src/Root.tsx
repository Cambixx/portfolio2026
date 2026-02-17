import { registerComposition } from 'remotion';
import { WalkthroughComposition } from './WalkthroughComposition';

export const RemotionRoot: React.FC = () => {
    registerComposition('Walkthrough', {
        component: WalkthroughComposition,
        durationInFrames: 300,
        fps: 30,
        width: 1920,
        height: 1080,
    });
};
