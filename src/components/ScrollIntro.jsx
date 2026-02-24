import { useEffect, useRef, useState } from 'react';
import './ScrollIntro.css';

const FALLBACK_FRAMES = 192;
const WHEEL_FACTOR = 0.00055;
const TOUCH_FACTOR = 0.0026;
const FADE_DURATION_MS = 480;

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function getFrameSrc(basePath, index) {
    return `${basePath}/frame-${String(index + 1).padStart(3, '0')}.webp`;
}

export default function ScrollIntro({
    src = '/assets/intro.webp',
    frameCount = FALLBACK_FRAMES,
    framesPath = '/assets/intro-frames',
}) {
    const [isVisible, setIsVisible] = useState(true);
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [currentFrame, setCurrentFrame] = useState(0);
    const [isReady, setIsReady] = useState(false);
    const progressRef = useRef(0);
    const touchStartYRef = useRef(0);
    const isCompletingRef = useRef(false);
    const frameRef = useRef(0);

    useEffect(() => {
        const firstFrame = new Image();
        firstFrame.onload = () => setIsReady(true);
        firstFrame.onerror = () => setIsReady(false);
        firstFrame.src = getFrameSrc(framesPath, 0);
    }, [framesPath]);

    useEffect(() => {
        if (!isVisible) return;

        window.dispatchEvent(new CustomEvent('intro-scroll-lock'));

        const htmlOverflow = document.documentElement.style.overflow;
        const bodyOverflow = document.body.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        window.scrollTo(0, 0);

        const completeIntro = () => {
            if (isCompletingRef.current) return;
            isCompletingRef.current = true;
            setIsFadingOut(true);
            window.setTimeout(() => {
                setIsVisible(false);
                document.documentElement.style.overflow = htmlOverflow;
                document.body.style.overflow = bodyOverflow;
                window.dispatchEvent(new CustomEvent('intro-scroll-unlock'));
            }, FADE_DURATION_MS);
        };

        const applyDelta = (delta) => {
            if (isCompletingRef.current) return;
            const nextProgress = clamp(progressRef.current + delta, 0, 1);
            progressRef.current = nextProgress;

            const targetFrame = Math.round(nextProgress * (frameCount - 1));
            if (targetFrame !== frameRef.current) {
                frameRef.current = targetFrame;
                setCurrentFrame(targetFrame);
            }

            if (nextProgress >= 1) {
                completeIntro();
            }
        };

        const onWheel = (event) => {
            event.preventDefault();
            event.stopPropagation();
            applyDelta(event.deltaY * WHEEL_FACTOR);
        };

        const onTouchStart = (event) => {
            touchStartYRef.current = event.touches[0]?.clientY ?? 0;
        };

        const onTouchMove = (event) => {
            event.preventDefault();
            event.stopPropagation();
            const currentY = event.touches[0]?.clientY ?? 0;
            const deltaY = touchStartYRef.current - currentY;
            touchStartYRef.current = currentY;
            applyDelta(deltaY * TOUCH_FACTOR);
        };

        const onKeyDown = (event) => {
            const key = event.key;
            if (key === 'ArrowDown' || key === 'PageDown' || key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                applyDelta(0.04);
            }
            if (key === 'ArrowUp' || key === 'PageUp') {
                event.preventDefault();
                event.stopPropagation();
                applyDelta(-0.04);
            }
        };

        window.addEventListener('wheel', onWheel, { passive: false, capture: true });
        window.addEventListener('touchstart', onTouchStart, { passive: false, capture: true });
        window.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
        window.addEventListener('keydown', onKeyDown, { capture: true });

        return () => {
            window.removeEventListener('wheel', onWheel, { capture: true });
            window.removeEventListener('touchstart', onTouchStart, { capture: true });
            window.removeEventListener('touchmove', onTouchMove, { capture: true });
            window.removeEventListener('keydown', onKeyDown, { capture: true });
            document.documentElement.style.overflow = htmlOverflow;
            document.body.style.overflow = bodyOverflow;
            window.dispatchEvent(new CustomEvent('intro-scroll-unlock'));
        };
    }, [frameCount, isVisible]);

    useEffect(() => {
        if (!isVisible) return;
        const preloadFrames = [currentFrame + 1, currentFrame + 2, currentFrame + 3, currentFrame - 1]
            .filter((value) => value >= 0 && value < frameCount);

        preloadFrames.forEach((index) => {
            const image = new Image();
            image.src = getFrameSrc(framesPath, index);
        });
    }, [currentFrame, frameCount, framesPath, isVisible]);

    if (!isVisible) return null;

    return (
        <div
            className="scroll-intro"
            aria-label="Intro cinematic"
            style={{ opacity: isFadingOut ? 0 : 1 }}
        >
            {isReady ? (
                <img
                    src={getFrameSrc(framesPath, currentFrame)}
                    alt="Intro sequence"
                    className="scroll-intro__frame"
                    fetchPriority="high"
                />
            ) : (
                <img src={src} alt="Intro" className="scroll-intro__fallback" />
            )}
            {!isReady && <div className="scroll-intro__loading mono">LOADING INTRO...</div>}
            <div className="scroll-intro__hint mono">SCROLL TO PLAY</div>
        </div>
    );
}
