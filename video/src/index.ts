import { registerComposition } from 'remotion';
import { WalkthroughComposition } from './WalkthroughComposition';
import './style.css';

registerComposition('Walkthrough', {
    component: WalkthroughComposition,
    durationInFrames: 300,
    fps: 30,
    width: 1920,
    height: 1080,
});
