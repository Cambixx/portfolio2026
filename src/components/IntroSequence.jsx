import { useEffect, useMemo, useRef, useState } from 'react';
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

export default function IntroSequence({ onComplete }) {
    const [frameIndex, setFrameIndex] = useState(0);
    const [fadeOpacity, setFadeOpacity] = useState(0);
    const completedRef = useRef(false);
    const completeTimeoutRef = useRef(null);
    const touchStartYRef = useRef(0);
    const progress = useMotionValue(0);
    const smoothProgress = useSpring(progress, {
        stiffness: 120,
        damping: 28,
        mass: 0.35,
    });

    const frames = useMemo(
        () => Object.entries(FRAME_GLOB).sort(sortFrames).map(([, src]) => src),
        []
    );

    useEffect(() => {
        return () => {
            if (completeTimeoutRef.current) {
                window.clearTimeout(completeTimeoutRef.current);
                completeTimeoutRef.current = null;
            }
        };
    }, []);

    const clamp = (value) => Math.max(0, Math.min(1, value));
    const wheelSensitivity = 0.0006;
    const touchSensitivity = 0.003;

    const applyProgressDelta = (delta) => {
        progress.set(clamp(progress.get() + delta));
    };

    const safePreventDefault = (event) => {
        if (event.cancelable) {
            event.preventDefault();
        }
    };

    const handleWheel = (event) => {
        safePreventDefault(event);
        applyProgressDelta(event.deltaY * wheelSensitivity);
    };

    const handleTouchStart = (event) => {
        touchStartYRef.current = event.touches[0].clientY;
    };

    const handleTouchMove = (event) => {
        safePreventDefault(event);
        const touchY = event.touches[0].clientY;
        const delta = touchStartYRef.current - touchY;
        touchStartYRef.current = touchY;
        applyProgressDelta(delta * touchSensitivity);
    };

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

            if (completeTimeoutRef.current) {
                window.clearTimeout(completeTimeoutRef.current);
                completeTimeoutRef.current = null;
            }

            completedRef.current = false;
            return;
        }

        setFadeOpacity(1);

        if (!completedRef.current && !completeTimeoutRef.current) {
            completeTimeoutRef.current = window.setTimeout(() => {
                completedRef.current = true;
                completeTimeoutRef.current = null;
                onComplete?.();
            }, 420);
        }
    });

    return (
        <div
            className="intro-sequence-overlay"
            aria-label="Portfolio introduction sequence"
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
        >
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
