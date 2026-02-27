import { useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import './SvgIntro.css';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function SvgIntro({ onComplete }) {
    const [progress, setProgress] = useState(0);
    const touchStartY = useRef(0);
    const isCompleted = useRef(false);

    const phase = useMemo(() => {
        if (progress < 0.45) return 'drawing';
        if (progress < 0.8) return 'scaling';
        return 'finishing';
    }, [progress]);

    const advanceProgress = (delta) => {
        if (isCompleted.current) return;

        setProgress((prev) => {
            const next = clamp(prev + delta, 0, 1);

            if (next >= 1 && !isCompleted.current) {
                isCompleted.current = true;
                if (onComplete) onComplete();
            }

            return next;
        });
    };

    const handleWheel = (event) => {
        event.preventDefault();
        advanceProgress(event.deltaY * 0.0018);
    };

    const handleTouchStart = (event) => {
        touchStartY.current = event.touches[0].clientY;
    };

    const handleTouchMove = (event) => {
        const currentY = event.touches[0].clientY;
        const deltaY = touchStartY.current - currentY;
        touchStartY.current = currentY;

        advanceProgress(deltaY * 0.003);
    };

    return (
        <motion.div
            className="svg-intro"
            initial={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{
                opacity: 0,
                scale: 1.4,
                filter: 'blur(25px)',
            }}
            transition={{
                duration: 1.2,
                ease: [0.76, 0, 0.24, 1]
            }}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
        >
            <div className="svg-intro__content">
                <svg
                    viewBox="0 0 1000 400"
                    className="svg-intro__main"
                >
                    <defs>
                        <linearGradient id="intro-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="white" />
                            <stop offset="50%" stopColor="#5227FF" />
                            <stop offset="100%" stopColor="white" />
                        </linearGradient>
                    </defs>

                    <motion.path
                        d="M 100 200 L 900 200"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="1"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: clamp(progress * 1.4, 0, 1) }}
                        transition={{ duration: 0.18, ease: 'linear' }}
                    />

                    <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="svg-intro__text"
                    >
                        <motion.tspan
                            initial={{ opacity: 0, letterSpacing: '0.8em' }}
                            animate={{
                                opacity: clamp(progress * 2, 0, 1),
                                letterSpacing: `${0.8 - clamp(progress, 0, 1) * 0.5}em`,
                            }}
                            transition={{ duration: 0.2, ease: 'linear' }}
                        >
                            CARLOS RÁBAGO
                        </motion.tspan>
                    </text>

                    <motion.rect
                        x="50" y="50" width="900" height="300"
                        fill="none"
                        stroke="url(#intro-grad)"
                        strokeWidth="2"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{
                            pathLength: clamp((progress - 0.15) * 1.4, 0, 1),
                            opacity: clamp(1 - (progress - 0.82) * 6, 0, 1),
                        }}
                        transition={{ duration: 0.2, ease: 'linear' }}
                    />
                </svg>

                <motion.div
                    className="svg-intro__status mono"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <span className="blink">●</span>
                    {phase === 'drawing' && 'SCROLL TO INITIALIZE...'}
                    {phase === 'scaling' && 'REVEALING INTERFACE...'}
                    {phase === 'finishing' && 'ACCESS GRANTED'}
                </motion.div>
            </div>
        </motion.div>
    );
}
