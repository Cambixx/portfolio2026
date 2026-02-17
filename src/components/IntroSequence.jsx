import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useMotionValue, useMotionValueEvent, useSpring } from 'motion/react';
import WindowFrame from './WindowFrame';

const FADE_OUT_COLOR = '#ffffff';

const FRAME_GLOB = import.meta.glob('../assets/secuencia/*.{jpg,jpeg,png,webp,avif}', {
    eager: true,
    import: 'default',
});

function getFileName(path) {
    return path.split('/').pop() || path;
}

function getNumericParts(fileName) {
    const matches = fileName.match(/\d+/g);
    return matches ? matches.map(Number) : [];
}

function sortFrames(a, b) {
    const fileA = getFileName(a[0]);
    const fileB = getFileName(b[0]);
    const numsA = getNumericParts(fileA);
    const numsB = getNumericParts(fileB);
    const maxLen = Math.max(numsA.length, numsB.length);

    for (let i = 0; i < maxLen; i += 1) {
        const nA = numsA[i];
        const nB = numsB[i];

        if (nA === undefined) {
            return -1;
        }

        if (nB === undefined) {
            return 1;
        }

        if (nA !== nB) {
            return nA - nB;
        }
    }

    return fileA.localeCompare(fileB, undefined, { numeric: true, sensitivity: 'base' });
}

export default function IntroSequence({ onComplete, startAtEnd = false }) {
    const initialLastFrame = Math.max(0, Object.keys(FRAME_GLOB).length - 1);
    const [frameIndex, setFrameIndex] = useState(() => (startAtEnd ? initialLastFrame : 0));
    const [fadeOpacity, setFadeOpacity] = useState(() => (startAtEnd ? 1 : 0));
    const completedRef = useRef(false);
    const completeTimeoutRef = useRef(null);
    const allowCompleteRef = useRef(true);
    const progress = useMotionValue(startAtEnd ? 1 : 0);
    const smoothProgress = useSpring(progress, {
        stiffness: 120,
        damping: 28,
        mass: 0.35,
    });

    const frames = useMemo(
        () => Object.entries(FRAME_GLOB).sort(sortFrames).map(([, src]) => src),
        []
    );

    useLayoutEffect(() => {
        const lastFrame = Math.max(0, frames.length - 1);
        const initialProgress = startAtEnd ? 1 : 0;

        progress.set(initialProgress);
        setFrameIndex(startAtEnd ? lastFrame : 0);
        setFadeOpacity(startAtEnd ? 1 : 0);
        completedRef.current = false;
        allowCompleteRef.current = !startAtEnd;

        if (completeTimeoutRef.current) {
            window.clearTimeout(completeTimeoutRef.current);
            completeTimeoutRef.current = null;
        }
    }, [frames.length, progress, startAtEnd]);

    useEffect(() => {
        const clamp = (value) => Math.max(0, Math.min(1, value));
        const wheelSensitivity = 0.0006;
        const touchSensitivity = 0.003;
        let touchStartY = 0;

        const onWheel = (event) => {
            event.preventDefault();
            progress.set(clamp(progress.get() + event.deltaY * wheelSensitivity));
        };

        const onTouchStart = (event) => {
            touchStartY = event.touches[0].clientY;
        };

        const onTouchMove = (event) => {
            event.preventDefault();
            const touchY = event.touches[0].clientY;
            const delta = touchStartY - touchY;
            touchStartY = touchY;
            progress.set(clamp(progress.get() + delta * touchSensitivity));
        };

        window.addEventListener('wheel', onWheel, { passive: false });
        window.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: false });

        return () => {
            if (completeTimeoutRef.current) {
                window.clearTimeout(completeTimeoutRef.current);
                completeTimeoutRef.current = null;
            }

            window.removeEventListener('wheel', onWheel);
            window.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchmove', onTouchMove);
        };
    }, [progress]);

    useMotionValueEvent(smoothProgress, 'change', (latest) => {
        if (!frames.length) {
            return;
        }

        const clamped = Math.max(0, Math.min(1, latest));
        const lastFrameIndex = frames.length - 1;
        const fadeLeadFrames = 20;
        const fadeStartFrame = Math.max(0, lastFrameIndex - fadeLeadFrames);
        const currentFrameFloat = clamped * lastFrameIndex;
        const nextFrame = Math.min(
            lastFrameIndex,
            Math.round(currentFrameFloat)
        );
        const nextFadeOpacity =
            currentFrameFloat <= fadeStartFrame
                ? 0
                : Math.min(1, (currentFrameFloat - fadeStartFrame) / (lastFrameIndex - fadeStartFrame || 1));

        setFrameIndex((prev) => (prev === nextFrame ? prev : nextFrame));

        if (nextFadeOpacity < 1) {
            setFadeOpacity(nextFadeOpacity);
            allowCompleteRef.current = true;

            if (completeTimeoutRef.current) {
                window.clearTimeout(completeTimeoutRef.current);
                completeTimeoutRef.current = null;
            }

            completedRef.current = false;
            return;
        }

        setFadeOpacity(1);

        if (!allowCompleteRef.current) {
            return;
        }

        if (!completedRef.current && !completeTimeoutRef.current) {
            completeTimeoutRef.current = window.setTimeout(() => {
                completedRef.current = true;
                completeTimeoutRef.current = null;
                onComplete?.();
            }, 420);
        }
    });

    return (
        <div className="intro-sequence-overlay" aria-label="Portfolio introduction sequence">
            <WindowFrame>
                {frames.length > 0 && (
                    <img
                        className="intro-sequence-image"
                        src={frames[frameIndex]}
                        alt="Portfolio introduction animation"
                        loading="eager"
                        fetchPriority="high"
                    />
                )}
            </WindowFrame>

            <div
                aria-hidden
                className="intro-sequence-fade"
                style={{ opacity: fadeOpacity, backgroundColor: FADE_OUT_COLOR }}
            />
        </div>
    );
}
